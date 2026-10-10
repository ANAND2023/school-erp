using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.API.Filters;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmployeesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public EmployeesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("Staff", "View")]
        public async Task<ActionResult<ApiResponse<PagedResult<EmployeeListDto>>>> GetEmployees(
            [FromQuery] string? search,
            [FromQuery] long? departmentId,
            [FromQuery] long? designationId,
            [FromQuery] EmployeeStatus? status,
            [FromQuery] int pageNo = 1,
            [FromQuery] int pageSize = 10)
        {
            var branchId = _currentUserService.BranchId;

            var query = _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Include(e => e.Allocations)
                .Where(e => e.BranchId == branchId)
                .AsNoTracking();

            if (status.HasValue)
            {
                query = query.Where(e => e.Status == status.Value);
            }
            else
            {
                // Default to active employees
                query = query.Where(e => e.Status == EmployeeStatus.Active);
            }

            if (departmentId.HasValue) query = query.Where(e => e.DepartmentId == departmentId.Value);
            if (designationId.HasValue) query = query.Where(e => e.DesignationId == designationId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(e => e.EmployeeCode.ToLower().Contains(s) ||
                                         e.FirstName.ToLower().Contains(s) ||
                                         e.LastName.ToLower().Contains(s) ||
                                         e.Mobile.Contains(s) ||
                                         (e.Email != null && e.Email.ToLower().Contains(s)));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(e => e.FirstName)
                .ThenBy(e => e.LastName)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EmployeeListDto
                {
                    Id = e.Id,
                    EmployeeCode = e.EmployeeCode,
                    FullName = e.FullName,
                    DepartmentName = e.Department != null ? e.Department.Name : null,
                    DesignationName = e.Designation != null ? e.Designation.Name : null,
                    JoiningDate = e.JoiningDate,
                    Mobile = e.Mobile,
                    Email = e.Email,
                    Gender = e.Gender,
                    Status = e.Status,
                    PhotoUrl = e.PhotoUrl,
                    HasUserAccount = e.UserId.HasValue,
                    AllocationsCount = e.Allocations.Count
                })
                .ToListAsync();

            return Ok(ApiResponse<PagedResult<EmployeeListDto>>.Ok(
                new PagedResult<EmployeeListDto>(items, totalCount, pageNo, pageSize)
            ));
        }

        [HttpGet("{id}")]
        [HasPermission("Staff", "View")]
        public async Task<ActionResult<ApiResponse<EmployeeDetailDto>>> GetEmployeeDetail(long id)
        {
            var branchId = _currentUserService.BranchId;

            var employee = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Include(e => e.User)
                .Include(e => e.Allocations)
                    .ThenInclude(a => a.Class)
                .Include(e => e.Allocations)
                    .ThenInclude(a => a.Section)
                .Include(e => e.Allocations)
                    .ThenInclude(a => a.Subject)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id && e.BranchId == branchId);

            if (employee == null) return NotFound(ApiResponse<EmployeeDetailDto>.Fail("Employee not found."));

            var detail = new EmployeeDetailDto
            {
                Id = employee.Id,
                EmployeeCode = employee.EmployeeCode,
                FirstName = employee.FirstName,
                LastName = employee.LastName,
                DepartmentId = employee.DepartmentId,
                DepartmentName = employee.Department?.Name,
                DesignationId = employee.DesignationId,
                DesignationName = employee.Designation?.Name,
                JoiningDate = employee.JoiningDate,
                RelievingDate = employee.RelievingDate,
                ExitReason = employee.ExitReason,
                Mobile = employee.Mobile,
                Email = employee.Email,
                Gender = employee.Gender,
                DateOfBirth = employee.DateOfBirth,
                Qualification = employee.Qualification,
                ExperienceYears = employee.ExperienceYears,
                PanNo = employee.PanNo,
                AadhaarNo = employee.AadhaarNo,
                BankName = employee.BankName,
                AccountNo = employee.AccountNo,
                IfscCode = employee.IfscCode,
                SalaryBasic = employee.SalaryBasic,
                PhotoUrl = employee.PhotoUrl,
                Status = employee.Status,
                UserId = employee.UserId,
                Username = employee.User?.Username,
                Allocations = employee.Allocations.Select(a => new TeacherAllocationSummaryDto
                {
                    Id = a.Id,
                    ClassId = a.ClassId,
                    ClassName = a.Class?.Name ?? "",
                    SectionId = a.SectionId,
                    SectionName = a.Section?.Name ?? "",
                    SubjectId = a.SubjectId,
                    SubjectName = a.Subject?.Name,
                    IsClassTeacher = a.IsClassTeacher
                }).ToList()
            };

            return Ok(ApiResponse<EmployeeDetailDto>.Ok(detail));
        }

        [HttpGet("next-code")]
        [HasPermission("Staff", "View")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextEmployeeCode()
        {
            var branchId = _currentUserService.BranchId;
            var count = await _context.Employees.CountAsync(e => e.BranchId == branchId);
            var nextCode = $"EMP-{(count + 1):D4}";
            return Ok(ApiResponse<string>.Ok(nextCode));
        }

        [HttpPost]
        [HasPermission("Staff", "Add")]
        public async Task<ActionResult<ApiResponse<EmployeeDetailDto>>> CreateEmployee([FromBody] CreateEmployeeDto request)
        {
            var branchId = _currentUserService.BranchId;

            // Determine code
            var code = request.EmployeeCode?.Trim();
            if (string.IsNullOrWhiteSpace(code))
            {
                var count = await _context.Employees.CountAsync(e => e.BranchId == branchId);
                code = $"EMP-{(count + 1):D4}";
            }

            // BR-4.1: Employee code unique per school
            var exists = await _context.Employees.AnyAsync(e => e.BranchId == branchId && e.EmployeeCode.ToLower() == code.ToLower());
            if (exists)
            {
                return BadRequest(ApiResponse<EmployeeDetailDto>.Fail($"Employee code '{code}' already exists."));
            }

            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                return BadRequest(ApiResponse<EmployeeDetailDto>.Fail("First name is mandatory."));
            }
            if (string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(ApiResponse<EmployeeDetailDto>.Fail("Mobile number is mandatory."));
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<ActionResult<ApiResponse<EmployeeDetailDto>>>(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var employee = new Employee
                    {
                        BranchId = branchId,
                        EmployeeCode = code,
                        FirstName = request.FirstName.Trim(),
                        LastName = request.LastName?.Trim() ?? "",
                        DepartmentId = request.DepartmentId,
                        DesignationId = request.DesignationId,
                        JoiningDate = request.JoiningDate,
                        Mobile = request.Mobile.Trim(),
                        Email = request.Email?.Trim(),
                        Gender = request.Gender,
                        DateOfBirth = request.DateOfBirth,
                        Qualification = request.Qualification,
                        ExperienceYears = request.ExperienceYears,
                        PanNo = request.PanNo?.Trim(),
                        AadhaarNo = request.AadhaarNo?.Trim(),
                        BankName = request.BankName?.Trim(),
                        AccountNo = request.AccountNo?.Trim(),
                        IfscCode = request.IfscCode?.Trim(),
                        SalaryBasic = request.SalaryBasic,
                        PhotoUrl = request.PhotoUrl,
                        Status = EmployeeStatus.Active,
                        IsActive = true
                    };

                    _context.Employees.Add(employee);
                    await _context.SaveChangesAsync();

                    // FR-4.2: Option to auto-create user login
                    if (request.AutoCreateUser && !string.IsNullOrWhiteSpace(request.Username))
                    {
                        var username = request.Username.Trim();
                        var userExists = await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower());
                        if (userExists)
                        {
                            await transaction.RollbackAsync();
                            return BadRequest(ApiResponse<EmployeeDetailDto>.Fail($"Username '{username}' already exists."));
                        }

                        var roleId = request.RoleId ?? (await _context.Roles.Where(r => r.Name == "Teacher").Select(r => r.Id).FirstOrDefaultAsync());
                        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == roleId);

                        var password = !string.IsNullOrWhiteSpace(request.Password) ? request.Password : "Staff@123";
                        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);

                        var user = new User
                        {
                            Username = username,
                            PasswordHash = passwordHash,
                            FullName = employee.FullName,
                            Email = employee.Email ?? $"{username.ToLower()}@school.local",
                            Mobile = employee.Mobile,
                            UserType = role?.Name == "Teacher" ? UserType.Teacher : UserType.SchoolAdmin,
                            RoleId = roleId,
                            BranchId = branchId,
                            MustChangePassword = true,
                            IsActive = true
                        };

                        _context.Users.Add(user);
                        await _context.SaveChangesAsync();

                        employee.UserId = user.Id;
                        await _context.SaveChangesAsync();
                    }

                    // Audit Log
                    _context.AuditLogs.Add(new AuditLog
                    {
                        UserId = _currentUserService.UserId,
                        Username = _currentUserService.Username,
                        Action = "Create",
                        Module = "Staff",
                        EntityName = "Employee",
                        RecordId = employee.Id.ToString(),
                        NewValues = $"Code: {employee.EmployeeCode}, Name: {employee.FullName}",
                        IpAddress = _currentUserService.IpAddress,
                        BranchId = branchId
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(ApiResponse<EmployeeDetailDto>.Ok(new EmployeeDetailDto
                    {
                        Id = employee.Id,
                        EmployeeCode = employee.EmployeeCode,
                        FirstName = employee.FirstName,
                        LastName = employee.LastName
                    }, $"Employee '{employee.FullName}' created successfully."));
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, ApiResponse<EmployeeDetailDto>.Fail($"Failed to create employee: {ex.Message}"));
                }
            });
        }

        [HttpPut("{id}")]
        [HasPermission("Staff", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateEmployee(long id, [FromBody] UpdateEmployeeDto request)
        {
            var branchId = _currentUserService.BranchId;
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id && e.BranchId == branchId);
            if (employee == null) return NotFound(ApiResponse.Fail("Employee not found."));

            employee.FirstName = request.FirstName.Trim();
            employee.LastName = request.LastName?.Trim() ?? "";
            employee.DepartmentId = request.DepartmentId;
            employee.DesignationId = request.DesignationId;
            employee.JoiningDate = request.JoiningDate;
            employee.Mobile = request.Mobile.Trim();
            employee.Email = request.Email?.Trim();
            employee.Gender = request.Gender;
            employee.DateOfBirth = request.DateOfBirth;
            employee.Qualification = request.Qualification;
            employee.ExperienceYears = request.ExperienceYears;
            employee.PanNo = request.PanNo?.Trim();
            employee.AadhaarNo = request.AadhaarNo?.Trim();
            employee.BankName = request.BankName?.Trim();
            employee.AccountNo = request.AccountNo?.Trim();
            employee.IfscCode = request.IfscCode?.Trim();
            employee.SalaryBasic = request.SalaryBasic;
            employee.PhotoUrl = request.PhotoUrl;
            employee.Status = request.Status;

            await _context.SaveChangesAsync(); if (request.AutoCreateUser && !string.IsNullOrWhiteSpace(request.Username)) { var username = request.Username.Trim(); var userExists = await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower()); if (!userExists) { _context.Users.Add(new User { Username = username, PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password), FullName = $"{request.FirstName} {request.LastName}".Trim(), UserType = UserType.Teacher, RoleId = request.RoleId ?? 2, BranchId = branchId, LinkedEntityId = employee.Id, MustChangePassword = true, IsActive = true }); await _context.SaveChangesAsync(); } } return Ok(ApiResponse.Ok("Employee updated successfully."));
        }

        [HttpPost("{id}/exit")]
        [HasPermission("Staff", "Edit")]
        public async Task<ActionResult<ApiResponse>> ProcessEmployeeExit(long id, [FromBody] EmployeeExitDto request)
        {
            // FR-4.5: Employee exit (relieving date, reason) deactivates login
            var branchId = _currentUserService.BranchId;
            var employee = await _context.Employees
                .Include(e => e.User)
                .FirstOrDefaultAsync(e => e.Id == id && e.BranchId == branchId);

            if (employee == null) return NotFound(ApiResponse.Fail("Employee not found."));

            employee.RelievingDate = request.RelievingDate;
            employee.ExitReason = request.Reason.Trim();
            employee.Status = EmployeeStatus.Resigned;

            // Deactivate linked user login (FR-4.5)
            if (employee.UserId.HasValue && employee.User != null)
            {
                employee.User.IsActive = false;
            }

            // Remove teacher allocations
            var allocations = await _context.TeacherAllocations.Where(a => a.EmployeeId == id).ToListAsync();
            foreach (var a in allocations)
            {
                a.IsActive = false;
            }

            // Audit
            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "EmployeeExit",
                Module = "Staff",
                EntityName = "Employee",
                RecordId = employee.Id.ToString(),
                NewValues = $"RelievedOn: {request.RelievingDate}, Reason: {request.Reason}",
                IpAddress = _currentUserService.IpAddress,
                BranchId = branchId
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok($"Employee marked as exited. Linked user login and active teacher allocations deactivated."));
        }
    }
}

