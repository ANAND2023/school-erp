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

        private async Task<long> ResolveAcademicYearIdAsync(long? requestedYearId = null)
        {
            if (requestedYearId.HasValue && requestedYearId.Value > 0)
            {
                return requestedYearId.Value;
            }

            var currentYearId = _currentUserService.AcademicYearId;
            if (currentYearId > 0)
            {
                return currentYearId;
            }

            var activeYearId = await _context.AcademicYears
                .Where(y => y.IsCurrent)
                .Select(y => y.Id)
                .FirstOrDefaultAsync();

            if (activeYearId > 0)
            {
                return activeYearId;
            }

            return await _context.AcademicYears
                .Select(y => y.Id)
                .FirstOrDefaultAsync();
        }

        // =========================================================================
        // 1. PERIOD MASTER (FR-6.6)
        // =========================================================================
        [HttpGet("periods")]
        [HasPermission("Timetable", "View")]
        public async Task<ActionResult<ApiResponse<List<PeriodDto>>>> GetPeriods([FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync(academicYearId);

            var rawPeriods = await _context.Periods
                .Where(p => p.BranchId == branchId && p.AcademicYearId == targetYearId)
                .OrderBy(p => p.DisplayOrder)
                .ThenBy(p => p.PeriodNumber)
                .ToListAsync();

            if (!rawPeriods.Any())
            {
                rawPeriods = await _context.Periods
                    .Where(p => p.BranchId == branchId)
                    .OrderBy(p => p.DisplayOrder)
                    .ThenBy(p => p.PeriodNumber)
                    .ToListAsync();
            }

            var periods = rawPeriods.Select(p => new PeriodDto
            {
                Id = p.Id,
                PeriodNumber = p.PeriodNumber,
                Name = p.Name,
                StartTime = p.StartTime.ToString(@"hh\:mm"),
                EndTime = p.EndTime.ToString(@"hh\:mm"),
                IsBreak = p.IsBreak,
                IsBellEnabled = p.IsBellEnabled,
                IsDismissalBell = p.IsDismissalBell,
                DisplayOrder = p.DisplayOrder
            }).ToList();

            return Ok(ApiResponse<List<PeriodDto>>.Ok(periods));
        }

        [HttpPost("periods")]
        [HasPermission("Timetable", "Add")]
        public async Task<ActionResult<ApiResponse<PeriodDto>>> CreatePeriod([FromBody] CreatePeriodDto request)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync();

            TimeSpan.TryParse(request.StartTime, out var startTime);
            TimeSpan.TryParse(request.EndTime, out var endTime);

            var existingPeriod = await _context.Periods
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p =>
                    p.BranchId == branchId &&
                    p.AcademicYearId == targetYearId &&
                    p.PeriodNumber == request.PeriodNumber);

            PeriodMaster period;

            if (existingPeriod != null)
            {
                if (existingPeriod.IsActive)
                {
                    return BadRequest(ApiResponse<PeriodDto>.Fail($"Period #{request.PeriodNumber} already exists."));
                }
                
                // Restore and update
                existingPeriod.IsActive = true;
                existingPeriod.Name = request.Name.Trim();
                existingPeriod.StartTime = startTime;
                existingPeriod.EndTime = endTime;
                existingPeriod.IsBreak = request.IsBreak;
                existingPeriod.IsBellEnabled = request.IsBellEnabled;
                existingPeriod.IsDismissalBell = request.IsDismissalBell;
                existingPeriod.DisplayOrder = request.DisplayOrder;
                
                period = existingPeriod;
            }
            else
            {
                period = new PeriodMaster
                {
                    BranchId = branchId,
                    AcademicYearId = targetYearId,
                    PeriodNumber = request.PeriodNumber,
                    Name = request.Name.Trim(),
                    StartTime = startTime,
                    EndTime = endTime,
                    IsBreak = request.IsBreak,
                    IsBellEnabled = request.IsBellEnabled,
                    IsDismissalBell = request.IsDismissalBell,
                    DisplayOrder = request.DisplayOrder,
                    IsActive = true
                };
                _context.Periods.Add(period);
            }
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<PeriodDto>.Ok(new PeriodDto
            {
                Id = period.Id,
                PeriodNumber = period.PeriodNumber,
                Name = period.Name,
                StartTime = period.StartTime.ToString(@"hh\:mm"),
                EndTime = period.EndTime.ToString(@"hh\:mm"),
                IsBreak = period.IsBreak,
                IsBellEnabled = period.IsBellEnabled,
                IsDismissalBell = period.IsDismissalBell,
                DisplayOrder = period.DisplayOrder
            }, "Period created successfully."));
        }

        [HttpPut("periods/{id}")]
        [HasPermission("Timetable", "Edit")]
        public async Task<ActionResult<ApiResponse<PeriodDto>>> UpdatePeriod(long id, [FromBody] CreatePeriodDto request)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync();

            TimeSpan.TryParse(request.StartTime, out var startTime);
            TimeSpan.TryParse(request.EndTime, out var endTime);

            var period = await _context.Periods.FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId);
            if (period == null) return NotFound(ApiResponse.Fail("Period not found."));

            var existingPeriod = await _context.Periods
                .FirstOrDefaultAsync(p =>
                    p.Id != id &&
                    p.BranchId == branchId &&
                    p.AcademicYearId == targetYearId &&
                    p.PeriodNumber == request.PeriodNumber);

            if (existingPeriod != null)
            {
                return BadRequest(ApiResponse<PeriodDto>.Fail($"Another period with #{request.PeriodNumber} already exists."));
            }

            period.PeriodNumber = request.PeriodNumber;
            period.Name = request.Name.Trim();
            period.StartTime = startTime;
            period.EndTime = endTime;
            period.IsBreak = request.IsBreak;
            period.IsBellEnabled = request.IsBellEnabled;
            period.IsDismissalBell = request.IsDismissalBell;
            period.DisplayOrder = request.DisplayOrder;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<PeriodDto>.Ok(new PeriodDto
            {
                Id = period.Id,
                PeriodNumber = period.PeriodNumber,
                Name = period.Name,
                StartTime = period.StartTime.ToString(@"hh\:mm"),
                EndTime = period.EndTime.ToString(@"hh\:mm"),
                IsBreak = period.IsBreak,
                IsBellEnabled = period.IsBellEnabled,
                IsDismissalBell = period.IsDismissalBell,
                DisplayOrder = period.DisplayOrder
            }, "Period updated successfully."));
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
        public async Task<ActionResult<ApiResponse<SectionTimetableDto>>> GetSectionTimetable(
            long sectionId,
            [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync(academicYearId);

            var section = await _context.Sections
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == sectionId && (s.BranchId == branchId || (s.Class != null && s.Class.BranchId == branchId)));

            if (section == null) return NotFound(ApiResponse<SectionTimetableDto>.Fail("Section not found."));

            var periods = await _context.Periods
                .Where(p => p.BranchId == branchId && p.AcademicYearId == targetYearId)
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
                    IsBellEnabled = p.IsBellEnabled,
                    IsDismissalBell = p.IsDismissalBell,
                    DisplayOrder = p.DisplayOrder
                })
                .ToListAsync();

            if (!periods.Any())
            {
                periods = await _context.Periods
                    .Where(p => p.BranchId == branchId)
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
                        IsBellEnabled = p.IsBellEnabled,
                        IsDismissalBell = p.IsDismissalBell,
                        DisplayOrder = p.DisplayOrder
                    })
                    .ToListAsync();
            }

            var entries = await _context.Timetables
                .Include(t => t.Period)
                .Include(t => t.Subject)
                .Include(t => t.Employee)
                .Where(t => (t.BranchId == branchId || (section.Class != null && section.Class.BranchId == branchId)) &&
                            t.AcademicYearId == targetYearId &&
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

            var result = new SectionTimetableDto
            {
                SectionId = section.Id,
                ClassName = section.Class?.Name ?? "",
                SectionName = section.Name,
                Periods = periods,
                Slots = slots
            };

            return Ok(ApiResponse<SectionTimetableDto>.Ok(result));
        }

        [HttpPost("slot")]
        [HasPermission("Timetable", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveTimetableSlot([FromBody] SaveTimetableSlotDto request)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync();

            var section = await _context.Sections
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == request.SectionId && (s.BranchId == branchId || (s.Class != null && s.Class.BranchId == branchId)));
            if (section == null) return NotFound(ApiResponse.Fail("Section not found."));

            var period = await _context.Periods
                .FirstOrDefaultAsync(p => p.Id == request.PeriodId && p.BranchId == branchId);
            if (period == null) return NotFound(ApiResponse.Fail("Period not found."));

            // FR-6.7: Prevent same teacher in two sections at the same period
            if (request.EmployeeId.HasValue && request.EmployeeId.Value > 0)
            {
                var clash = await _context.Timetables
                    .Include(t => t.Class)
                    .Include(t => t.Section)
                    .Include(t => t.Employee)
                    .FirstOrDefaultAsync(t => t.BranchId == branchId &&
                                              t.AcademicYearId == targetYearId &&
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
                                          t.AcademicYearId == targetYearId &&
                                          t.SectionId == request.SectionId &&
                                          t.DayOfWeek == request.DayOfWeek &&
                                          t.PeriodId == request.PeriodId);

            if (existing != null)
            {
                if ((!request.SubjectId.HasValue || request.SubjectId.Value == 0) &&
                    (!request.EmployeeId.HasValue || request.EmployeeId.Value == 0))
                {
                    // If both empty, remove slot
                    _context.Timetables.Remove(existing);
                }
                else
                {
                    existing.SubjectId = request.SubjectId > 0 ? request.SubjectId : null;
                    existing.EmployeeId = request.EmployeeId > 0 ? request.EmployeeId : null;
                    existing.RoomNo = request.RoomNo?.Trim();
                }
            }
            else if ((request.SubjectId.HasValue && request.SubjectId.Value > 0) ||
                     (request.EmployeeId.HasValue && request.EmployeeId.Value > 0))
            {
                _context.Timetables.Add(new TimetableEntry
                {
                    BranchId = branchId,
                    AcademicYearId = targetYearId,
                    ClassId = section.ClassId,
                    SectionId = section.Id,
                    DayOfWeek = request.DayOfWeek,
                    PeriodId = request.PeriodId,
                    SubjectId = request.SubjectId > 0 ? request.SubjectId : null,
                    EmployeeId = request.EmployeeId > 0 ? request.EmployeeId : null,
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
        public async Task<ActionResult<ApiResponse<TeacherTimetableDto>>> GetTeacherTimetable(
            long employeeId,
            [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync(academicYearId);

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId && e.BranchId == branchId);
            if (employee == null) return NotFound(ApiResponse<TeacherTimetableDto>.Fail("Teacher not found."));

            var periods = await _context.Periods
                .Where(p => p.BranchId == branchId && p.AcademicYearId == targetYearId)
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

            if (!periods.Any())
            {
                periods = await _context.Periods
                    .Where(p => p.BranchId == branchId)
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
            }

            var entries = await _context.Timetables
                .Include(t => t.Period)
                .Include(t => t.Class)
                .Include(t => t.Section)
                .Include(t => t.Subject)
                .Where(t => t.BranchId == branchId &&
                            t.AcademicYearId == targetYearId &&
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
            [FromQuery] long periodId,
            [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync(academicYearId);
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
                            t.AcademicYearId == targetYearId &&
                            t.DayOfWeek == dayEnum &&
                            t.PeriodId == periodId &&
                            t.EmployeeId.HasValue)
                .Select(t => t.EmployeeId!.Value)
                .ToListAsync();

            // 2. Teachers already assigned as substitute for this date & period
            var substituteTeacherIds = await _context.Substitutions
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == targetYearId &&
                            s.SubstitutionDate.Date == targetDate &&
                            s.PeriodId == periodId)
                .Select(s => s.SubstituteEmployeeId)
                .ToListAsync();

            // 3. Teachers on approved leave on this date
            var onLeaveTeacherIds = await _context.LeaveRequests
                .Where(l => l.BranchId == branchId &&
                            l.AcademicYearId == targetYearId &&
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
        public async Task<ActionResult<ApiResponse<List<SubstitutionDto>>>> GetSubstitutions(
            [FromQuery] DateTime date,
            [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = await ResolveAcademicYearIdAsync(academicYearId);
            var targetDate = date.Date;

            var rawList = await _context.Substitutions
                .Include(s => s.Period)
                .Include(s => s.Class)
                .Include(s => s.Section)
                .Include(s => s.Subject)
                .Include(s => s.OriginalEmployee)
                .Include(s => s.SubstituteEmployee)
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == targetYearId &&
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
            var targetYearId = await ResolveAcademicYearIdAsync();
            var targetDate = request.SubstitutionDate.Date;

            var section = await _context.Sections.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == request.SectionId && (s.BranchId == branchId || (s.Class != null && s.Class.BranchId == branchId)));
            if (section == null) return NotFound(ApiResponse<SubstitutionDto>.Fail("Section not found."));

            var period = await _context.Periods.FirstOrDefaultAsync(p => p.Id == request.PeriodId && p.BranchId == branchId);
            if (period == null) return NotFound(ApiResponse<SubstitutionDto>.Fail("Period not found."));

            var substitution = new Substitution
            {
                BranchId = branchId,
                AcademicYearId = targetYearId,
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
