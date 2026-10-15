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
using SchoolERP.API.Helpers;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SchoolsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SchoolsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("Branch", "View")]
        public async Task<ActionResult<ApiResponse<List<SchoolDto>>>> GetSchools([FromQuery] bool includeInactive = false)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;

            var query = _context.Schools
                .Include(s => s.Branches)
                .AsNoTracking();

            if (!includeInactive)
            {
                query = query.Where(s => s.IsActive);
            }

            // If not super admin, only return the school of current user's branch
            if (!isSuperAdmin)
            {
                var userBranch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == _currentUserService.BranchId);
                if (userBranch != null)
                {
                    query = query.Where(s => s.Id == userBranch.SchoolId);
                }
            }

            var schools = await query
                .OrderBy(s => s.Name)
                .Select(s => new SchoolDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Code = s.Code,
                    AffiliationNumber = s.AffiliationNumber,
                    LogoUrl = s.LogoUrl,
                    Address = s.Address,
                    ContactNumber = s.ContactNumber,
                    Email = s.Email,
                    Website = s.Website,
                    IsActive = s.IsActive,
                    CreatedOn = s.CreatedOn,
                    BranchCount = s.Branches.Count(b => b.IsActive),
                    Branches = s.Branches.Where(b => b.IsActive).Select(b => new BranchDto
                    {
                        Id = b.Id,
                        SchoolId = b.SchoolId,
                        Name = b.Name,
                        Code = b.Code,
                        LogoUrl = b.LogoUrl,
                        PrintHeader = b.PrintHeader,
                        Address = b.Address,
                        City = b.City,
                        State = b.State,
                        Pincode = b.Pincode,
                        Phone = b.Phone,
                        Email = b.Email
                    }).ToList()
                })
                .ToListAsync();

            return Ok(ApiResponse<List<SchoolDto>>.Ok(schools));
        }

        [HttpGet("{id}")]
        [HasPermission("Branch", "View")]
        public async Task<ActionResult<ApiResponse<SchoolDto>>> GetSchoolById(long id)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;

            var school = await _context.Schools
                .Include(s => s.Branches)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (school == null) return NotFound(ApiResponse<SchoolDto>.Fail("School not found."));

            if (!isSuperAdmin)
            {
                var userBranch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == _currentUserService.BranchId);
                if (userBranch == null || userBranch.SchoolId != id)
                {
                    return StatusCode(403, ApiResponse<SchoolDto>.Fail("Access denied to this school."));
                }
            }

            var dto = new SchoolDto
            {
                Id = school.Id,
                Name = school.Name,
                Code = school.Code,
                AffiliationNumber = school.AffiliationNumber,
                LogoUrl = school.LogoUrl,
                Address = school.Address,
                ContactNumber = school.ContactNumber,
                Email = school.Email,
                Website = school.Website,
                IsActive = school.IsActive,
                CreatedOn = school.CreatedOn,
                BranchCount = school.Branches.Count(b => b.IsActive),
                Branches = school.Branches.Where(b => b.IsActive).Select(b => new BranchDto
                {
                    Id = b.Id,
                    SchoolId = b.SchoolId,
                    Name = b.Name,
                    Code = b.Code,
                    LogoUrl = b.LogoUrl,
                    PrintHeader = b.PrintHeader,
                    Address = b.Address,
                    City = b.City,
                    State = b.State,
                    Pincode = b.Pincode,
                    Phone = b.Phone,
                    Email = b.Email
                }).ToList()
            };

            return Ok(ApiResponse<SchoolDto>.Ok(dto));
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ApiResponse<SchoolDto>>> CreateSchool([FromBody] CreateSchoolRequestDto request)
        {
            // Only SuperAdmin can create new schools
            if (_currentUserService.UserType != UserType.SuperAdmin)
            {
                return StatusCode(403, ApiResponse<SchoolDto>.Fail("Only Super Admin can create new schools."));
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<SchoolDto>.Fail("School name is required."));
            }

            var code = (request.Code ?? string.Empty).Trim().ToUpper();
            if (string.IsNullOrWhiteSpace(code))
            {
                return BadRequest(ApiResponse<SchoolDto>.Fail("School code is required."));
            }

            var exists = await _context.Schools.AnyAsync(s => s.Code.ToLower() == code.ToLower());
            if (exists)
            {
                return BadRequest(ApiResponse<SchoolDto>.Fail($"School with code '{code}' already exists."));
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<ActionResult<ApiResponse<SchoolDto>>>(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var school = new School
                    {
                        Name = request.Name.Trim(),
                        Code = code,
                        AffiliationNumber = request.AffiliationNumber?.Trim(),
                        LogoUrl = request.LogoUrl?.Trim(),
                        Address = request.Address?.Trim(),
                        ContactNumber = request.ContactNumber?.Trim(),
                        Email = request.Email?.Trim(),
                        Website = request.Website?.Trim(),
                        CreatedBy = _currentUserService.UserId ?? 0,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };

                    _context.Schools.Add(school);
                    await _context.SaveChangesAsync();

                    var branches = new List<BranchDto>();

                    // Auto create default branch if requested
                    if (request.CreateDefaultBranch)
                    {
                        var branchName = string.IsNullOrWhiteSpace(request.BranchName) ? "Main Campus" : request.BranchName.Trim();
                        var branchCode = string.IsNullOrWhiteSpace(request.BranchCode) ? "MAIN" : request.BranchCode.Trim().ToUpper();
                        var ayName = string.IsNullOrWhiteSpace(request.AcademicYearName) ? "2026-27" : request.AcademicYearName.Trim();

                        var branch = new Branch
                        {
                            SchoolId = school.Id,
                            Name = branchName,
                            Code = branchCode,
                            PrintHeader = $"{school.Name.ToUpper()} - {branchName.ToUpper()}",
                            Address = school.Address,
                            Phone = school.ContactNumber,
                            Email = school.Email,
                            LogoUrl = school.LogoUrl,
                            CreatedBy = _currentUserService.UserId ?? 0,
                            CreatedOn = DateTime.UtcNow,
                            IsActive = true
                        };

                        _context.Branches.Add(branch);
                        await _context.SaveChangesAsync();

                        // Default Academic Year
                        var academicYear = new AcademicYear
                        {
                            BranchId = branch.Id,
                            Name = ayName,
                            StartDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                            EndDate = new DateTime(2027, 3, 31, 0, 0, 0, DateTimeKind.Utc),
                            IsCurrent = true,
                            CreatedBy = _currentUserService.UserId ?? 0,
                            CreatedOn = DateTime.UtcNow,
                            IsActive = true
                        };

                        _context.AcademicYears.Add(academicYear);
                        await _context.SaveChangesAsync();

                        // Auto-seed default classes (NUR to X), sections (A, B) and subjects
                        await SchoolDefaultsHelper.SeedBranchDefaultsAsync(_context, branch.Id, academicYear.Id);

                        branches.Add(new BranchDto
                        {
                            Id = branch.Id,
                            SchoolId = school.Id,
                            Name = branch.Name,
                            Code = branch.Code,
                            LogoUrl = branch.LogoUrl,
                            PrintHeader = branch.PrintHeader,
                            Address = branch.Address,
                            Phone = branch.Phone,
                            Email = branch.Email
                        });
                    }

                    // Audit Log
                    _context.AuditLogs.Add(new AuditLog
                    {
                        UserId = _currentUserService.UserId,
                        Username = _currentUserService.Username,
                        Action = "CreateSchool",
                        Module = "Masters",
                        EntityName = "School",
                        RecordId = school.Id.ToString(),
                        NewValues = $"Created School: {school.Name} ({school.Code})",
                        IpAddress = _currentUserService.IpAddress,
                        BranchId = branches.FirstOrDefault()?.Id ?? _currentUserService.BranchId
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var responseDto = new SchoolDto
                    {
                        Id = school.Id,
                        Name = school.Name,
                        Code = school.Code,
                        AffiliationNumber = school.AffiliationNumber,
                        LogoUrl = school.LogoUrl,
                        Address = school.Address,
                        ContactNumber = school.ContactNumber,
                        Email = school.Email,
                        Website = school.Website,
                        IsActive = school.IsActive,
                        CreatedOn = school.CreatedOn,
                        BranchCount = branches.Count,
                        Branches = branches
                    };

                    return Ok(ApiResponse<SchoolDto>.Ok(responseDto, $"School '{school.Name}' created successfully."));
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, ApiResponse<SchoolDto>.Fail($"Failed to create school: {ex.Message}"));
                }
            });
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<SchoolDto>>> UpdateSchool(long id, [FromBody] UpdateSchoolRequestDto request)
        {
            if (_currentUserService.UserType != UserType.SuperAdmin)
            {
                return StatusCode(403, ApiResponse<SchoolDto>.Fail("Only Super Admin can edit schools."));
            }

            var school = await _context.Schools
                .Include(s => s.Branches)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (school == null) return NotFound(ApiResponse<SchoolDto>.Fail("School not found."));

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<SchoolDto>.Fail("School name cannot be empty."));
            }

            var code = (request.Code ?? string.Empty).Trim().ToUpper();
            if (!string.IsNullOrWhiteSpace(code) && code != school.Code)
            {
                var codeExists = await _context.Schools.AnyAsync(s => s.Id != id && s.Code.ToLower() == code.ToLower());
                if (codeExists)
                {
                    return BadRequest(ApiResponse<SchoolDto>.Fail($"Another school already has code '{code}'."));
                }
                school.Code = code;
            }

            school.Name = request.Name.Trim();
            school.AffiliationNumber = request.AffiliationNumber?.Trim();
            school.LogoUrl = request.LogoUrl?.Trim();
            school.Address = request.Address?.Trim();
            school.ContactNumber = request.ContactNumber?.Trim();
            school.Email = request.Email?.Trim();
            school.Website = request.Website?.Trim();
            school.IsActive = request.IsActive;
            school.ModifiedBy = _currentUserService.UserId;
            school.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var dto = new SchoolDto
            {
                Id = school.Id,
                Name = school.Name,
                Code = school.Code,
                AffiliationNumber = school.AffiliationNumber,
                LogoUrl = school.LogoUrl,
                Address = school.Address,
                ContactNumber = school.ContactNumber,
                Email = school.Email,
                Website = school.Website,
                IsActive = school.IsActive,
                CreatedOn = school.CreatedOn,
                BranchCount = school.Branches.Count(b => b.IsActive)
            };

            return Ok(ApiResponse<SchoolDto>.Ok(dto, "School updated successfully."));
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<ActionResult<ApiResponse>> DeactivateSchool(long id)
        {
            if (_currentUserService.UserType != UserType.SuperAdmin)
            {
                return StatusCode(403, ApiResponse.Fail("Only Super Admin can deactivate schools."));
            }

            var school = await _context.Schools.FirstOrDefaultAsync(s => s.Id == id);
            if (school == null) return NotFound(ApiResponse.Fail("School not found."));

            school.IsActive = false;
            school.ModifiedBy = _currentUserService.UserId;
            school.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok($"School '{school.Name}' deactivated successfully."));
        }
    }
}
