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
    [Route("api/leave-requests")]
    [Authorize]
    public class LeaveRequestsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public LeaveRequestsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("LeaveManagement", "View")]
        public async Task<ActionResult<ApiResponse<List<LeaveRequestDto>>>> GetLeaveRequests(
            [FromQuery] string? applicantType,
            [FromQuery] LeaveStatus? status)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var query = _context.LeaveRequests
                .Include(r => r.Employee)
                    .ThenInclude(e => e!.Department)
                .Include(r => r.Student)
                    .ThenInclude(s => s!.Enrollments)
                        .ThenInclude(en => en.Class)
                .Include(r => r.Student)
                    .ThenInclude(s => s!.Enrollments)
                        .ThenInclude(en => en.Section)
                .Where(r => r.BranchId == branchId && r.AcademicYearId == yearId);

            var isSuperAdmin = _currentUserService.UserType == SchoolERP.Domain.Enums.UserType.SuperAdmin;

            bool canEditAll = isSuperAdmin;

            if (!isSuperAdmin) { var roleIdClaim = User.FindFirst("role_id")?.Value; if (long.TryParse(roleIdClaim, out var roleId)) { canEditAll = await _context.RolePermissions.AnyAsync(p => p.RoleId == roleId && p.Menu == "LeaveManagement" && p.CanEdit); } }

            if (!canEditAll) { var dbUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId); if (dbUser != null && !dbUser.LinkedEntityId.HasValue) { return BadRequest(ApiResponse<LeaveRequestDto>.Fail("Your user account is not linked to any Staff/Student profile. Cannot apply for leave.")); } if (dbUser != null && dbUser.LinkedEntityId.HasValue) { if (dbUser.UserType != SchoolERP.Domain.Enums.UserType.Student && dbUser.UserType != SchoolERP.Domain.Enums.UserType.Parent) { query = query.Where(r => r.EmployeeId == dbUser.LinkedEntityId.Value && r.ApplicantType == "Employee"); } else if (dbUser.UserType == SchoolERP.Domain.Enums.UserType.Student) { query = query.Where(r => r.StudentId == dbUser.LinkedEntityId.Value && r.ApplicantType == "Student"); } else { query = query.Where(r => r.Id == -1); } } else { query = query.Where(r => r.Id == -1); } }

            if (!string.IsNullOrWhiteSpace(applicantType))
            {
                query = query.Where(r => r.ApplicantType.ToLower() == applicantType.ToLower());
            }

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            var leaveRequests = await query
                .OrderByDescending(r => r.CreatedOn)
                .ToListAsync();

            var list = leaveRequests
                .Select(r => new LeaveRequestDto
                {
                    Id = r.Id,
                    ApplicantType = r.ApplicantType,
                    EmployeeId = r.EmployeeId,
                    EmployeeCode = r.Employee?.EmployeeCode,
                    EmployeeName = r.Employee?.FullName,
                    DepartmentName = r.Employee?.Department?.Name,
                    StudentId = r.StudentId,
                    AdmissionNo = r.Student?.AdmissionNo,
                    StudentName = r.Student?.FullName,
                    ClassSection = r.Student?.Enrollments?.FirstOrDefault(en => en.AcademicYearId == yearId) != null 
                        ? $"{r.Student.Enrollments.FirstOrDefault(en => en.AcademicYearId == yearId)?.Class?.Name} - {r.Student.Enrollments.FirstOrDefault(en => en.AcademicYearId == yearId)?.Section?.Name}"
                        : null,
                    LeaveType = r.LeaveType,
                    FromDate = r.FromDate,
                    ToDate = r.ToDate,
                    TotalDays = r.TotalDays,
                    Reason = r.Reason,
                    Status = r.Status,
                    ActionRemarks = r.ActionRemarks,
                    ActionDate = r.ActionDate,
                    CreatedOn = r.CreatedOn
                })
                .ToList();

            return Ok(ApiResponse<List<LeaveRequestDto>>.Ok(list));
        }

        [HttpPost]
        [HasPermission("LeaveManagement", "Add")]
        public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> ApplyLeave([FromBody] ApplyLeaveDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (request.FromDate.Date > request.ToDate.Date)
            {
                return BadRequest(ApiResponse<LeaveRequestDto>.Fail("From date cannot be later than To date."));
            }

            decimal totalDays = (request.ToDate.Date - request.FromDate.Date).Days + 1; var isSuperAdmin = _currentUserService.UserType == SchoolERP.Domain.Enums.UserType.SuperAdmin; bool canEditAll = isSuperAdmin; if (!isSuperAdmin) { var roleIdClaim = User.FindFirst("role_id")?.Value; if (long.TryParse(roleIdClaim, out var roleId)) { canEditAll = await _context.RolePermissions.AnyAsync(p => p.RoleId == roleId && p.Menu == "LeaveManagement" && p.CanEdit); } } if (!canEditAll) { var dbUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId); if (dbUser != null && !dbUser.LinkedEntityId.HasValue) { return BadRequest(ApiResponse<LeaveRequestDto>.Fail("Your user account is not linked to any Staff/Student profile. Cannot apply for leave.")); } if (dbUser != null && dbUser.LinkedEntityId.HasValue) { if (dbUser.UserType != SchoolERP.Domain.Enums.UserType.Student && dbUser.UserType != SchoolERP.Domain.Enums.UserType.Parent) { request.EmployeeId = dbUser.LinkedEntityId; request.ApplicantType = "Employee"; request.StudentId = null; } else if (dbUser.UserType == SchoolERP.Domain.Enums.UserType.Student) { request.StudentId = dbUser.LinkedEntityId; request.ApplicantType = "Student"; request.EmployeeId = null; } } }

            var entity = new LeaveRequest
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                ApplicantType = request.ApplicantType,
                EmployeeId = request.EmployeeId,
                StudentId = request.StudentId,
                LeaveType = request.LeaveType,
                FromDate = request.FromDate.Date,
                ToDate = request.ToDate.Date,
                TotalDays = totalDays,
                Reason = request.Reason.Trim(),
                Status = LeaveStatus.Pending,
                IsActive = true
            };

            _context.LeaveRequests.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<LeaveRequestDto>.Ok(new LeaveRequestDto
            {
                Id = entity.Id,
                ApplicantType = entity.ApplicantType,
                EmployeeId = entity.EmployeeId,
                StudentId = entity.StudentId,
                LeaveType = entity.LeaveType,
                FromDate = entity.FromDate,
                ToDate = entity.ToDate,
                TotalDays = entity.TotalDays,
                Reason = entity.Reason,
                Status = entity.Status,
                CreatedOn = entity.CreatedOn
            }, "Leave application submitted successfully."));
        }

        [HttpPost("{id}/action")]
        [HasPermission("LeaveManagement", "Edit")]
        public async Task<ActionResult<ApiResponse>> ActionLeave(long id, [FromBody] ActionLeaveDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var currentUserId = _currentUserService.UserId;

            var leave = await _context.LeaveRequests.FirstOrDefaultAsync(l => l.Id == id && l.BranchId == branchId);
            if (leave == null) return NotFound(ApiResponse.Fail("Leave request not found."));

            if (leave.Status != LeaveStatus.Pending)
            {
                return BadRequest(ApiResponse.Fail($"Leave application is already {leave.Status}."));
            }

            leave.Status = request.Status;
            leave.ActionRemarks = request.ActionRemarks;
            leave.ActionByUserId = currentUserId;
            leave.ActionDate = DateTime.UtcNow;

            // FR-6.5: Approved leave auto-marks attendance as Leave
            if (request.Status == LeaveStatus.Approved)
            {
                var startDate = leave.FromDate.Date;
                var endDate = leave.ToDate.Date;

                // Query holidays
                var holidays = await _context.Holidays
                    .Where(h => h.BranchId == branchId &&
                                h.AcademicYearId == yearId &&
                                h.HolidayDate.Date >= startDate &&
                                h.HolidayDate.Date <= endDate)
                    .Select(h => h.HolidayDate.Date)
                    .ToListAsync();

                for (var cur = startDate; cur <= endDate; cur = cur.AddDays(1))
                {
                    // Skip Sundays and holidays
                    if (cur.DayOfWeek == DayOfWeek.Sunday || holidays.Contains(cur)) continue;

                    if (leave.ApplicantType.Equals("Employee", StringComparison.OrdinalIgnoreCase) && leave.EmployeeId.HasValue)
                    {
                        var targetAttStatus = leave.LeaveType == LeaveType.Casual ? AttendanceStatus.CasualLeave
                                            : leave.LeaveType == LeaveType.Medical ? AttendanceStatus.SickLeave
                                            : AttendanceStatus.Leave;

                        var staffAtt = await _context.StaffAttendances
                            .FirstOrDefaultAsync(a => a.BranchId == branchId &&
                                                      a.EmployeeId == leave.EmployeeId.Value &&
                                                      a.AttendanceDate.Date == cur);
                        if (staffAtt != null)
                        {
                            staffAtt.Status = targetAttStatus;
                            staffAtt.Remarks = $"{leave.LeaveType} approved: {leave.Reason}";
                            staffAtt.MarkedBy = currentUserId;
                        }
                        else
                        {
                            _context.StaffAttendances.Add(new StaffAttendance
                            {
                                BranchId = branchId,
                                EmployeeId = leave.EmployeeId.Value,
                                AttendanceDate = cur,
                                Status = targetAttStatus,
                                Remarks = $"{leave.LeaveType} approved: {leave.Reason}",
                                MarkedBy = currentUserId,
                                IsActive = true
                            });
                        }
                    }
                    else if (leave.ApplicantType.Equals("Student", StringComparison.OrdinalIgnoreCase) && leave.StudentId.HasValue)
                    {
                        var enrollment = await _context.StudentEnrollments
                            .Include(e => e.Student)
                            .FirstOrDefaultAsync(e => e.Student!.BranchId == branchId &&
                                                      e.AcademicYearId == yearId &&
                                                      e.StudentId == leave.StudentId.Value &&
                                                      e.Status == StudentStatus.Active);
                        if (enrollment != null)
                        {
                            var studentAtt = await _context.StudentAttendances
                                .FirstOrDefaultAsync(a => a.BranchId == branchId &&
                                                          a.AcademicYearId == yearId &&
                                                          a.StudentId == leave.StudentId.Value &&
                                                          a.AttendanceDate.Date == cur);
                            if (studentAtt != null)
                            {
                                studentAtt.Status = AttendanceStatus.Leave;
                                studentAtt.Remarks = $"Leave approved: {leave.Reason}";
                                studentAtt.MarkedBy = currentUserId;
                            }
                            else
                            {
                                _context.StudentAttendances.Add(new StudentAttendance
                                {
                                    BranchId = branchId,
                                    AcademicYearId = yearId,
                                    ClassId = enrollment.ClassId,
                                    SectionId = enrollment.SectionId,
                                    StudentId = leave.StudentId.Value,
                                    EnrollmentId = enrollment.Id,
                                    AttendanceDate = cur,
                                    Status = AttendanceStatus.Leave,
                                    Remarks = $"Leave approved: {leave.Reason}",
                                    MarkedBy = currentUserId,
                                    IsActive = true
                                });
                            }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok($"Leave application {request.Status.ToString().ToLower()} successfully."));
        }

        // =========================================================================
        // Category-wise Staff Leave Policies (CL / SL Master)
        // =========================================================================

        [HttpGet("policies")]
        [HasPermission("LeaveManagement", "View")]
        public async Task<ActionResult<ApiResponse<List<StaffLeavePolicyDto>>>> GetLeavePolicies()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var policies = await _context.StaffLeavePolicies
                .Include(p => p.Department)
                .Where(p => p.BranchId == branchId && p.AcademicYearId == yearId && p.IsActive)
                .OrderBy(p => p.CategoryName)
                .ToListAsync();

            // Auto seed default policies if none exist
            if (policies.Count == 0)
            {
                var defaults = new List<StaffLeavePolicy>
                {
                    new StaffLeavePolicy
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        CategoryName = "Teaching Staff / Academics",
                        CasualLeaveDays = 12,
                        SickLeaveDays = 10,
                        EarnedLeaveDays = 0,
                        Description = "Standard annual leave policy for Teachers and Academic Faculty",
                        CreatedBy = _currentUserService.UserId ?? 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    },
                    new StaffLeavePolicy
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        CategoryName = "Non-Teaching / Administration",
                        CasualLeaveDays = 15,
                        SickLeaveDays = 12,
                        EarnedLeaveDays = 0,
                        Description = "Annual leave policy for Administrative & Accounts staff",
                        CreatedBy = _currentUserService.UserId ?? 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    },
                    new StaffLeavePolicy
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        CategoryName = "Support / Transport Staff",
                        CasualLeaveDays = 10,
                        SickLeaveDays = 8,
                        EarnedLeaveDays = 0,
                        Description = "Annual leave policy for Drivers, Conductors and Support Staff",
                        CreatedBy = _currentUserService.UserId ?? 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    }
                };

                _context.StaffLeavePolicies.AddRange(defaults);
                await _context.SaveChangesAsync();
                policies = defaults;
            }

            var list = policies.Select(p => new StaffLeavePolicyDto
            {
                Id = p.Id,
                BranchId = p.BranchId,
                AcademicYearId = p.AcademicYearId,
                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department?.Name,
                CategoryName = p.CategoryName,
                CasualLeaveDays = p.CasualLeaveDays,
                SickLeaveDays = p.SickLeaveDays,
                EarnedLeaveDays = p.EarnedLeaveDays,
                Description = p.Description
            }).ToList();

            return Ok(ApiResponse<List<StaffLeavePolicyDto>>.Ok(list));
        }

        [HttpPost("policies")]
        [HasPermission("LeaveManagement", "Add")]
        public async Task<ActionResult<ApiResponse<StaffLeavePolicyDto>>> SaveLeavePolicy([FromBody] CreateStaffLeavePolicyDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var userId = _currentUserService.UserId ?? 1;

            if (string.IsNullOrWhiteSpace(dto.CategoryName))
                return BadRequest(ApiResponse<StaffLeavePolicyDto>.Fail("Category name is required"));

            // Check if policy already exists for this department or name
            var existing = await _context.StaffLeavePolicies
                .FirstOrDefaultAsync(p => p.BranchId == branchId && p.AcademicYearId == yearId && p.IsActive &&
                    ((dto.DepartmentId.HasValue && p.DepartmentId == dto.DepartmentId.Value) ||
                     p.CategoryName.ToLower() == dto.CategoryName.Trim().ToLower()));

            if (existing != null)
            {
                existing.CategoryName = dto.CategoryName.Trim();
                existing.DepartmentId = dto.DepartmentId;
                existing.CasualLeaveDays = dto.CasualLeaveDays;
                existing.SickLeaveDays = dto.SickLeaveDays;
                existing.EarnedLeaveDays = dto.EarnedLeaveDays;
                existing.Description = dto.Description;
                existing.ModifiedBy = userId;
                existing.ModifiedOn = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(ApiResponse<StaffLeavePolicyDto>.Ok(new StaffLeavePolicyDto
                {
                    Id = existing.Id,
                    BranchId = existing.BranchId,
                    AcademicYearId = existing.AcademicYearId,
                    DepartmentId = existing.DepartmentId,
                    CategoryName = existing.CategoryName,
                    CasualLeaveDays = existing.CasualLeaveDays,
                    SickLeaveDays = existing.SickLeaveDays,
                    EarnedLeaveDays = existing.EarnedLeaveDays,
                    Description = existing.Description
                }, "Staff leave policy updated successfully."));
            }

            var entity = new StaffLeavePolicy
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                DepartmentId = dto.DepartmentId,
                CategoryName = dto.CategoryName.Trim(),
                CasualLeaveDays = dto.CasualLeaveDays,
                SickLeaveDays = dto.SickLeaveDays,
                EarnedLeaveDays = dto.EarnedLeaveDays,
                Description = dto.Description,
                CreatedBy = userId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.StaffLeavePolicies.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<StaffLeavePolicyDto>.Ok(new StaffLeavePolicyDto
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                AcademicYearId = entity.AcademicYearId,
                DepartmentId = entity.DepartmentId,
                CategoryName = entity.CategoryName,
                CasualLeaveDays = entity.CasualLeaveDays,
                SickLeaveDays = entity.SickLeaveDays,
                EarnedLeaveDays = entity.EarnedLeaveDays,
                Description = entity.Description
            }, "Staff leave policy created successfully."));
        }

        [HttpDelete("policies/{id}")]
        [HasPermission("LeaveManagement", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteLeavePolicy(long id)
        {
            var branchId = _currentUserService.BranchId;
            var policy = await _context.StaffLeavePolicies.FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId);
            if (policy == null) return NotFound(ApiResponse.Fail("Leave policy not found"));

            policy.IsActive = false;
            policy.ModifiedBy = _currentUserService.UserId;
            policy.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Leave policy removed successfully."));
        }

        // =========================================================================
        // Staff Leave Balances & Quota Ledger
        // =========================================================================

        [HttpGet("staff-balances")]
        [HasPermission("LeaveManagement", "View")]
        public async Task<ActionResult<ApiResponse<List<StaffLeaveBalanceDto>>>> GetStaffLeaveBalances([FromQuery] long? departmentId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // Fetch active academic year dates
            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == yearId && ay.BranchId == branchId);
            var yearStart = academicYear?.StartDate ?? new DateTime(DateTime.UtcNow.Year, 4, 1);
            var yearEnd = academicYear?.EndDate ?? new DateTime(DateTime.UtcNow.Year + 1, 3, 31, 23, 59, 59);

            // Fetch all active employees
            var empQuery = _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Where(e => e.BranchId == branchId && e.Status == EmployeeStatus.Active && e.IsActive);

            if (departmentId.HasValue && departmentId.Value > 0)
                empQuery = empQuery.Where(e => e.DepartmentId == departmentId.Value);

            var employees = await empQuery.OrderBy(e => e.FirstName).ToListAsync();

            // Fetch category policies
            var policies = await _context.StaffLeavePolicies
                .Where(p => p.BranchId == branchId && p.AcademicYearId == yearId && p.IsActive)
                .ToListAsync();

            // Fetch custom staff allocations
            var allocations = await _context.StaffLeaveAllocations
                .Where(a => a.BranchId == branchId && a.AcademicYearId == yearId && a.IsActive)
                .ToListAsync();

            // Fetch approved leave requests in current academic year
            var approvedLeaves = await _context.LeaveRequests
                .Where(r => r.BranchId == branchId && r.ApplicantType == "Employee" &&
                            r.Status == LeaveStatus.Approved &&
                            r.FromDate >= yearStart && r.FromDate <= yearEnd &&
                            r.IsActive)
                .ToListAsync();

            // Fetch daily staff attendance marked directly as CL or SL
            var clSlAttendances = await _context.StaffAttendances
                .Where(a => a.BranchId == branchId &&
                            a.AttendanceDate >= yearStart && a.AttendanceDate <= yearEnd &&
                            (a.Status == AttendanceStatus.CasualLeave || a.Status == AttendanceStatus.SickLeave) &&
                            a.IsActive)
                .ToListAsync();

            var balances = new List<StaffLeaveBalanceDto>();

            foreach (var emp in employees)
            {
                // Check if individual allocation exists
                var customAlloc = allocations.FirstOrDefault(a => a.EmployeeId == emp.Id);

                // Otherwise find policy matching DepartmentId or matching Category
                var matchingPolicy = policies.FirstOrDefault(p => p.DepartmentId.HasValue && p.DepartmentId.Value == emp.DepartmentId)
                                  ?? policies.FirstOrDefault(p => p.DepartmentId == null)
                                  ?? policies.FirstOrDefault();

                decimal allocCL = customAlloc?.CasualLeaveDays ?? matchingPolicy?.CasualLeaveDays ?? 12m;
                decimal allocSL = customAlloc?.SickLeaveDays ?? matchingPolicy?.SickLeaveDays ?? 10m;
                decimal allocEL = customAlloc?.EarnedLeaveDays ?? matchingPolicy?.EarnedLeaveDays ?? 0m;
                string categoryName = customAlloc != null ? "Individual Quota" : (matchingPolicy?.CategoryName ?? "General Staff");

                // Calculate used CL
                var empApprovedCL = approvedLeaves.Where(r => r.EmployeeId == emp.Id && r.LeaveType == LeaveType.Casual).Sum(r => r.TotalDays);
                var directAttCL = clSlAttendances.Count(a => a.EmployeeId == emp.Id && a.Status == AttendanceStatus.CasualLeave);
                decimal usedCL = Math.Max(empApprovedCL, directAttCL); // avoid double counting if leave created attendance

                // Calculate used SL
                var empApprovedSL = approvedLeaves.Where(r => r.EmployeeId == emp.Id && r.LeaveType == LeaveType.Medical).Sum(r => r.TotalDays);
                var directAttSL = clSlAttendances.Count(a => a.EmployeeId == emp.Id && a.Status == AttendanceStatus.SickLeave);
                decimal usedSL = Math.Max(empApprovedSL, directAttSL);

                // Calculate used EL
                var empApprovedEL = approvedLeaves.Where(r => r.EmployeeId == emp.Id && r.LeaveType == LeaveType.Earned).Sum(r => r.TotalDays);
                decimal usedEL = empApprovedEL;

                balances.Add(new StaffLeaveBalanceDto
                {
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.EmployeeCode,
                    EmployeeName = emp.FullName,
                    Department = emp.Department?.Name,
                    Designation = emp.Designation?.Name,
                    CategoryName = categoryName,
                    AllocatedCL = allocCL,
                    UsedCL = usedCL,
                    AvailableCL = Math.Max(0, allocCL - usedCL),
                    AllocatedSL = allocSL,
                    UsedSL = usedSL,
                    AvailableSL = Math.Max(0, allocSL - usedSL),
                    AllocatedEL = allocEL,
                    UsedEL = usedEL,
                    AvailableEL = Math.Max(0, allocEL - usedEL),
                    TotalAllocated = allocCL + allocSL + allocEL,
                    TotalUsed = usedCL + usedSL + usedEL,
                    TotalAvailable = Math.Max(0, allocCL - usedCL) + Math.Max(0, allocSL - usedSL) + Math.Max(0, allocEL - usedEL)
                });
            }

            return Ok(ApiResponse<List<StaffLeaveBalanceDto>>.Ok(balances));
        }

        [HttpPost("allocate-staff")]
        [HasPermission("LeaveManagement", "Add")]
        public async Task<ActionResult<ApiResponse>> SetStaffAllocation([FromBody] SetStaffLeaveAllocationDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var userId = _currentUserService.UserId ?? 1;

            var existing = await _context.StaffLeaveAllocations
                .FirstOrDefaultAsync(a => a.BranchId == branchId && a.AcademicYearId == yearId && a.EmployeeId == dto.EmployeeId && a.IsActive);

            if (existing != null)
            {
                existing.CasualLeaveDays = dto.CasualLeaveDays;
                existing.SickLeaveDays = dto.SickLeaveDays;
                existing.EarnedLeaveDays = dto.EarnedLeaveDays;
                existing.Remarks = dto.Remarks;
                existing.ModifiedBy = userId;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                _context.StaffLeaveAllocations.Add(new StaffLeaveAllocation
                {
                    BranchId = branchId,
                    AcademicYearId = yearId,
                    EmployeeId = dto.EmployeeId,
                    CasualLeaveDays = dto.CasualLeaveDays,
                    SickLeaveDays = dto.SickLeaveDays,
                    EarnedLeaveDays = dto.EarnedLeaveDays,
                    Remarks = dto.Remarks,
                    CreatedBy = userId,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Staff individual leave quota updated successfully."));
        }
    }
}







