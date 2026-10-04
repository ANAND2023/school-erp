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
        [HasPermission("StaffAttendance", "View")]
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

            if (!string.IsNullOrWhiteSpace(applicantType))
            {
                query = query.Where(r => r.ApplicantType.ToLower() == applicantType.ToLower());
            }

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            var list = await query
                .OrderByDescending(r => r.CreatedOn)
                .Select(r => new LeaveRequestDto
                {
                    Id = r.Id,
                    ApplicantType = r.ApplicantType,
                    EmployeeId = r.EmployeeId,
                    EmployeeCode = r.Employee != null ? r.Employee.EmployeeCode : null,
                    EmployeeName = r.Employee != null ? r.Employee.FullName : null,
                    DepartmentName = r.Employee != null && r.Employee.Department != null ? r.Employee.Department.Name : null,
                    StudentId = r.StudentId,
                    AdmissionNo = r.Student != null ? r.Student.AdmissionNo : null,
                    StudentName = r.Student != null ? r.Student.FullName : null,
                    ClassSection = r.Student != null && r.Student.Enrollments.Any(en => en.AcademicYearId == yearId)
                        ? $"{r.Student.Enrollments.First(en => en.AcademicYearId == yearId).Class!.Name} - {r.Student.Enrollments.First(en => en.AcademicYearId == yearId).Section!.Name}"
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
                .ToListAsync();

            return Ok(ApiResponse<List<LeaveRequestDto>>.Ok(list));
        }

        [HttpPost]
        [HasPermission("StaffAttendance", "Add")]
        public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> ApplyLeave([FromBody] ApplyLeaveDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (request.FromDate.Date > request.ToDate.Date)
            {
                return BadRequest(ApiResponse<LeaveRequestDto>.Fail("From date cannot be later than To date."));
            }

            decimal totalDays = (request.ToDate.Date - request.FromDate.Date).Days + 1;

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
        [HasPermission("StaffAttendance", "Edit")]
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
                        var staffAtt = await _context.StaffAttendances
                            .FirstOrDefaultAsync(a => a.BranchId == branchId &&
                                                      a.EmployeeId == leave.EmployeeId.Value &&
                                                      a.AttendanceDate.Date == cur);
                        if (staffAtt != null)
                        {
                            staffAtt.Status = AttendanceStatus.Leave;
                            staffAtt.Remarks = $"Leave approved: {leave.Reason}";
                            staffAtt.MarkedBy = currentUserId;
                        }
                        else
                        {
                            _context.StaffAttendances.Add(new StaffAttendance
                            {
                                BranchId = branchId,
                                EmployeeId = leave.EmployeeId.Value,
                                AttendanceDate = cur,
                                Status = AttendanceStatus.Leave,
                                Remarks = $"Leave approved: {leave.Reason}",
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
    }
}
