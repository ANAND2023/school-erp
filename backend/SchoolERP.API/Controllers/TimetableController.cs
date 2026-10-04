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
    [Route("api/timetable")]
    [Authorize]
    public class TimetableController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public TimetableController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // =========================================================================
        // 1. PERIOD MASTER (FR-6.6)
        // =========================================================================
        [HttpGet("periods")]
        [HasPermission("Timetable", "View")]
        public async Task<ActionResult<ApiResponse<List<PeriodDto>>>> GetPeriods()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var rawPeriods = await _context.Periods
                .Where(p => p.BranchId == branchId && p.AcademicYearId == yearId)
                .OrderBy(p => p.DisplayOrder)
                .ThenBy(p => p.PeriodNumber)
                .ToListAsync();

            var periods = rawPeriods.Select(p => new PeriodDto
            {
                Id = p.Id,
                PeriodNumber = p.PeriodNumber,
                Name = p.Name,
                StartTime = p.StartTime.ToString(@"hh\:mm"),
                EndTime = p.EndTime.ToString(@"hh\:mm"),
                IsBreak = p.IsBreak,
                DisplayOrder = p.DisplayOrder
            }).ToList();

            return Ok(ApiResponse<List<PeriodDto>>.Ok(periods));
        }

        [HttpPost("periods")]
        [HasPermission("Timetable", "Add")]
        public async Task<ActionResult<ApiResponse<PeriodDto>>> CreatePeriod([FromBody] CreatePeriodDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var exists = await _context.Periods.AnyAsync(p =>
                p.BranchId == branchId &&
                p.AcademicYearId == yearId &&
                p.PeriodNumber == request.PeriodNumber);

            if (exists)
            {
                return BadRequest(ApiResponse<PeriodDto>.Fail($"Period #{request.PeriodNumber} already exists."));
            }

            TimeSpan.TryParse(request.StartTime, out var startTime);
            TimeSpan.TryParse(request.EndTime, out var endTime);

            var period = new PeriodMaster
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                PeriodNumber = request.PeriodNumber,
                Name = request.Name.Trim(),
                StartTime = startTime,
                EndTime = endTime,
                IsBreak = request.IsBreak,
                DisplayOrder = request.DisplayOrder,
                IsActive = true
            };

            _context.Periods.Add(period);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<PeriodDto>.Ok(new PeriodDto
            {
                Id = period.Id,
                PeriodNumber = period.PeriodNumber,
                Name = period.Name,
                StartTime = period.StartTime.ToString(@"hh\:mm"),
                EndTime = period.EndTime.ToString(@"hh\:mm"),
                IsBreak = period.IsBreak,
                DisplayOrder = period.DisplayOrder
            }, "Period created successfully."));
        }

        [HttpDelete("periods/{id}")]
        [HasPermission("Timetable", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeletePeriod(long id)
        {
            var branchId = _currentUserService.BranchId;
            var period = await _context.Periods.FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId);
            if (period == null) return NotFound(ApiResponse.Fail("Period not found."));

            // Check if used in timetable
            var isUsed = await _context.Timetables.AnyAsync(t => t.PeriodId == id);
            if (isUsed) return BadRequest(ApiResponse.Fail("Cannot delete period because it is currently assigned in one or more class timetables."));

            _context.Periods.Remove(period);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Period deleted successfully."));
        }

        // =========================================================================
        // 2. SECTION TIMETABLE BUILDER (FR-6.6, FR-6.7)
        // =========================================================================
        [HttpGet("section/{sectionId}")]
        [HasPermission("Timetable", "View")]
        public async Task<ActionResult<ApiResponse<SectionTimetableDto>>> GetSectionTimetable(long sectionId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var section = await _context.Sections
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == sectionId && s.BranchId == branchId);

            if (section == null) return NotFound(ApiResponse<SectionTimetableDto>.Fail("Section not found."));

            var periods = await _context.Periods
                .Where(p => p.BranchId == branchId && p.AcademicYearId == yearId)
                .OrderBy(p => p.DisplayOrder)
                .ThenBy(p => p.PeriodNumber)
                .Select(p => new PeriodDto
                {
                    Id = p.Id,
                    PeriodNumber = p.PeriodNumber,
                    Name = p.Name,
                    StartTime = p.StartTime.ToString(@"hh\:mm"),
                    EndTime = p.EndTime.ToString(@"hh\:mm"),
                    IsBreak = p.IsBreak,
                    DisplayOrder = p.DisplayOrder
                })
                .ToListAsync();

            var entries = await _context.Timetables
                .Include(t => t.Period)
                .Include(t => t.Subject)
                .Include(t => t.Employee)
                .Where(t => t.BranchId == branchId &&
                            t.AcademicYearId == yearId &&
                            t.SectionId == sectionId)
                .ToListAsync();

            var slots = entries.Select(e => new TimetableSlotDto
            {
                Id = e.Id,
                DayOfWeek = e.DayOfWeek,
                PeriodId = e.PeriodId,
                PeriodNumber = e.Period?.PeriodNumber ?? 0,
                PeriodName = e.Period?.Name ?? "",
                IsBreak = e.Period?.IsBreak ?? false,
                SubjectId = e.SubjectId,
                SubjectName = e.Subject?.Name,
                EmployeeId = e.EmployeeId,
                EmployeeName = e.Employee?.FullName,
                RoomNo = e.RoomNo
            }).ToList();

            var response = new SectionTimetableDto
            {
                SectionId = section.Id,
                ClassName = section.Class?.Name ?? "",
                SectionName = section.Name,
                Periods = periods,
                Slots = slots
            };

            return Ok(ApiResponse<SectionTimetableDto>.Ok(response));
        }

        [HttpPost("slot")]
        [HasPermission("Timetable", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveTimetableSlot([FromBody] SaveTimetableSlotDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var section = await _context.Sections
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == request.SectionId && s.BranchId == branchId);
            if (section == null) return NotFound(ApiResponse.Fail("Section not found."));

            var period = await _context.Periods
                .FirstOrDefaultAsync(p => p.Id == request.PeriodId && p.BranchId == branchId && p.AcademicYearId == yearId);
            if (period == null) return NotFound(ApiResponse.Fail("Period not found."));

            // FR-6.7: Prevent same teacher in two sections at the same period
            if (request.EmployeeId.HasValue)
            {
                var clash = await _context.Timetables
                    .Include(t => t.Class)
                    .Include(t => t.Section)
                    .Include(t => t.Employee)
                    .FirstOrDefaultAsync(t => t.BranchId == branchId &&
                                              t.AcademicYearId == yearId &&
                                              t.DayOfWeek == request.DayOfWeek &&
                                              t.PeriodId == request.PeriodId &&
                                              t.EmployeeId == request.EmployeeId.Value &&
                                              t.SectionId != request.SectionId);

                if (clash != null)
                {
                    var teacherName = clash.Employee?.FullName ?? "Selected teacher";
                    var conflictClass = clash.Class?.Name ?? "another class";
                    var conflictSec = clash.Section?.Name ?? "";
                    return BadRequest(ApiResponse.Fail($"Teacher Clash (FR-6.7): {teacherName} is already assigned to {conflictClass} - {conflictSec} on {request.DayOfWeek} during {period.Name}."));
                }
            }

            // Find existing slot for this section, day, period
            var existing = await _context.Timetables
                .FirstOrDefaultAsync(t => t.BranchId == branchId &&
                                          t.AcademicYearId == yearId &&
                                          t.SectionId == request.SectionId &&
                                          t.DayOfWeek == request.DayOfWeek &&
                                          t.PeriodId == request.PeriodId);

            if (existing != null)
            {
                if (!request.SubjectId.HasValue && !request.EmployeeId.HasValue)
                {
                    // If both empty, remove slot
                    _context.Timetables.Remove(existing);
                }
                else
                {
                    existing.SubjectId = request.SubjectId;
                    existing.EmployeeId = request.EmployeeId;
                    existing.RoomNo = request.RoomNo?.Trim();
                }
            }
            else if (request.SubjectId.HasValue || request.EmployeeId.HasValue)
            {
                _context.Timetables.Add(new TimetableEntry
                {
                    BranchId = branchId,
                    AcademicYearId = yearId,
                    ClassId = section.ClassId,
                    SectionId = section.Id,
                    DayOfWeek = request.DayOfWeek,
                    PeriodId = request.PeriodId,
                    SubjectId = request.SubjectId,
                    EmployeeId = request.EmployeeId,
                    RoomNo = request.RoomNo?.Trim(),
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Timetable slot saved successfully."));
        }

        [HttpDelete("slot/{id}")]
        [HasPermission("Timetable", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteTimetableSlot(long id)
        {
            var branchId = _currentUserService.BranchId;
            var entry = await _context.Timetables.FirstOrDefaultAsync(t => t.Id == id && t.BranchId == branchId);
            if (entry == null) return NotFound(ApiResponse.Fail("Timetable slot not found."));

            _context.Timetables.Remove(entry);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Timetable slot cleared successfully."));
        }

        // =========================================================================
        // 3. TEACHER TIMETABLE VIEW (FR-6.6)
        // =========================================================================
        [HttpGet("teacher/{employeeId}")]
        [HasPermission("Timetable", "View")]
        public async Task<ActionResult<ApiResponse<TeacherTimetableDto>>> GetTeacherTimetable(long employeeId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId && e.BranchId == branchId);
            if (employee == null) return NotFound(ApiResponse<TeacherTimetableDto>.Fail("Teacher not found."));

            var periods = await _context.Periods
                .Where(p => p.BranchId == branchId && p.AcademicYearId == yearId)
                .OrderBy(p => p.DisplayOrder)
                .ThenBy(p => p.PeriodNumber)
                .Select(p => new PeriodDto
                {
                    Id = p.Id,
                    PeriodNumber = p.PeriodNumber,
                    Name = p.Name,
                    StartTime = p.StartTime.ToString(@"hh\:mm"),
                    EndTime = p.EndTime.ToString(@"hh\:mm"),
                    IsBreak = p.IsBreak,
                    DisplayOrder = p.DisplayOrder
                })
                .ToListAsync();

            var entries = await _context.Timetables
                .Include(t => t.Period)
                .Include(t => t.Class)
                .Include(t => t.Section)
                .Include(t => t.Subject)
                .Where(t => t.BranchId == branchId &&
                            t.AcademicYearId == yearId &&
                            t.EmployeeId == employeeId)
                .ToListAsync();

            var slots = entries.Select(e => new TeacherTimetableSlotDto
            {
                DayOfWeek = e.DayOfWeek,
                PeriodId = e.PeriodId,
                PeriodNumber = e.Period?.PeriodNumber ?? 0,
                PeriodName = e.Period?.Name ?? "",
                TimeRange = $"{e.Period?.StartTime.ToString(@"hh\:mm")} - {e.Period?.EndTime.ToString(@"hh\:mm")}",
                ClassId = e.ClassId,
                ClassName = e.Class?.Name ?? "",
                SectionId = e.SectionId,
                SectionName = e.Section?.Name ?? "",
                SubjectName = e.Subject?.Name ?? "",
                RoomNo = e.RoomNo
            }).ToList();

            var result = new TeacherTimetableDto
            {
                EmployeeId = employee.Id,
                EmployeeCode = employee.EmployeeCode,
                EmployeeName = employee.FullName,
                Periods = periods,
                Slots = slots
            };

            return Ok(ApiResponse<TeacherTimetableDto>.Ok(result));
        }

        // =========================================================================
        // 4. SUBSTITUTION & FREE TEACHERS (FR-6.8)
        // =========================================================================
        [HttpGet("free-teachers")]
        [HasPermission("Timetable", "View")]
        public async Task<ActionResult<ApiResponse<List<FreeTeacherOptionDto>>>> GetFreeTeachers(
            [FromQuery] DateTime date,
            [FromQuery] long periodId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var targetDate = date.Date;

            // Day of week
            var dayOfWeekInt = (int)targetDate.DayOfWeek; // 1 = Monday, 6 = Saturday
            if (dayOfWeekInt == 0 || dayOfWeekInt == 7)
            {
                return Ok(ApiResponse<List<FreeTeacherOptionDto>>.Ok(new List<FreeTeacherOptionDto>()));
            }
            var dayEnum = (TimetableDay)dayOfWeekInt;

            // 1. Teachers busy in timetable for this day & period
            var busyTeacherIds = await _context.Timetables
                .Where(t => t.BranchId == branchId &&
                            t.AcademicYearId == yearId &&
                            t.DayOfWeek == dayEnum &&
                            t.PeriodId == periodId &&
                            t.EmployeeId.HasValue)
                .Select(t => t.EmployeeId!.Value)
                .ToListAsync();

            // 2. Teachers already assigned as substitute for this date & period
            var substituteTeacherIds = await _context.Substitutions
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == yearId &&
                            s.SubstitutionDate.Date == targetDate &&
                            s.PeriodId == periodId)
                .Select(s => s.SubstituteEmployeeId)
                .ToListAsync();

            // 3. Teachers on approved leave on this date
            var onLeaveTeacherIds = await _context.LeaveRequests
                .Where(l => l.BranchId == branchId &&
                            l.AcademicYearId == yearId &&
                            l.ApplicantType == "Employee" &&
                            l.EmployeeId.HasValue &&
                            l.Status == LeaveStatus.Approved &&
                            l.FromDate.Date <= targetDate &&
                            l.ToDate.Date >= targetDate)
                .Select(l => l.EmployeeId!.Value)
                .ToListAsync();

            var excludedIds = busyTeacherIds
                .Concat(substituteTeacherIds)
                .Concat(onLeaveTeacherIds)
                .Distinct()
                .ToList();

            var rawFreeTeachers = await _context.Employees
                .Include(e => e.Department)
                .Where(e => e.BranchId == branchId &&
                            e.Status == EmployeeStatus.Active &&
                            !excludedIds.Contains(e.Id))
                .OrderBy(e => e.FirstName)
                .ToListAsync();

            var freeTeachers = rawFreeTeachers.Select(e => new FreeTeacherOptionDto
            {
                EmployeeId = e.Id,
                EmployeeCode = e.EmployeeCode,
                FullName = e.FullName,
                DepartmentName = e.Department?.Name ?? ""
            }).ToList();

            return Ok(ApiResponse<List<FreeTeacherOptionDto>>.Ok(freeTeachers));
        }

        [HttpGet("substitutions")]
        [HasPermission("Timetable", "View")]
        public async Task<ActionResult<ApiResponse<List<SubstitutionDto>>>> GetSubstitutions([FromQuery] DateTime date)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var targetDate = date.Date;

            var rawList = await _context.Substitutions
                .Include(s => s.Period)
                .Include(s => s.Class)
                .Include(s => s.Section)
                .Include(s => s.Subject)
                .Include(s => s.OriginalEmployee)
                .Include(s => s.SubstituteEmployee)
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == yearId &&
                            s.SubstitutionDate.Date == targetDate)
                .OrderBy(s => s.Period!.DisplayOrder)
                .ToListAsync();

            var list = rawList.Select(s => new SubstitutionDto
            {
                Id = s.Id,
                SubstitutionDate = s.SubstitutionDate,
                PeriodId = s.PeriodId,
                PeriodNumber = s.Period?.PeriodNumber ?? 0,
                PeriodName = s.Period?.Name ?? "",
                TimeRange = s.Period != null ? $"{s.Period.StartTime.ToString(@"hh\:mm")} - {s.Period.EndTime.ToString(@"hh\:mm")}" : "",
                ClassId = s.ClassId,
                ClassName = s.Class?.Name ?? "",
                SectionId = s.SectionId,
                SectionName = s.Section?.Name ?? "",
                SubjectName = s.Subject?.Name ?? "",
                OriginalEmployeeId = s.OriginalEmployeeId,
                OriginalEmployeeName = s.OriginalEmployee?.FullName ?? "",
                SubstituteEmployeeId = s.SubstituteEmployeeId,
                SubstituteEmployeeName = s.SubstituteEmployee?.FullName ?? "",
                Remarks = s.Remarks
            }).ToList();

            return Ok(ApiResponse<List<SubstitutionDto>>.Ok(list));
        }

        [HttpPost("substitutions")]
        [HasPermission("Timetable", "Edit")]
        public async Task<ActionResult<ApiResponse<SubstitutionDto>>> CreateSubstitution([FromBody] CreateSubstitutionDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var targetDate = request.SubstitutionDate.Date;

            var section = await _context.Sections.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == request.SectionId && s.BranchId == branchId);
            if (section == null) return NotFound(ApiResponse<SubstitutionDto>.Fail("Section not found."));

            var period = await _context.Periods.FirstOrDefaultAsync(p => p.Id == request.PeriodId && p.BranchId == branchId && p.AcademicYearId == yearId);
            if (period == null) return NotFound(ApiResponse<SubstitutionDto>.Fail("Period not found."));

            var substitution = new Substitution
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                SubstitutionDate = targetDate,
                PeriodId = request.PeriodId,
                ClassId = section.ClassId,
                SectionId = section.Id,
                SubjectId = request.SubjectId,
                OriginalEmployeeId = request.OriginalEmployeeId,
                SubstituteEmployeeId = request.SubstituteEmployeeId,
                Remarks = request.Remarks?.Trim(),
                IsActive = true
            };

            _context.Substitutions.Add(substitution);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<SubstitutionDto>.Ok(new SubstitutionDto
            {
                Id = substitution.Id,
                SubstitutionDate = substitution.SubstitutionDate,
                PeriodId = substitution.PeriodId,
                PeriodNumber = period.PeriodNumber,
                PeriodName = period.Name,
                ClassId = section.ClassId,
                ClassName = section.Class?.Name ?? "",
                SectionId = section.Id,
                SectionName = section.Name,
                OriginalEmployeeId = substitution.OriginalEmployeeId,
                SubstituteEmployeeId = substitution.SubstituteEmployeeId,
                Remarks = substitution.Remarks
            }, "Substitution arranged successfully (FR-6.8)."));
        }

        [HttpDelete("substitutions/{id}")]
        [HasPermission("Timetable", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteSubstitution(long id)
        {
            var branchId = _currentUserService.BranchId;
            var sub = await _context.Substitutions.FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);
            if (sub == null) return NotFound(ApiResponse.Fail("Substitution record not found."));

            _context.Substitutions.Remove(sub);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Substitution removed successfully."));
        }
    }
}
