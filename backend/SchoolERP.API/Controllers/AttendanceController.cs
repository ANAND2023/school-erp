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
    [Route("api/attendance")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AttendanceController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // =========================================================================
        // 1. HOLIDAY CALENDAR (FR-6.2)
        // =========================================================================
        [HttpGet("holidays")]
        [HasPermission("StudentAttendance", "View")]
        public async Task<ActionResult<ApiResponse<List<HolidayDto>>>> GetHolidays()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var holidays = await _context.Holidays
                .Where(h => h.BranchId == branchId && h.AcademicYearId == yearId)
                .OrderBy(h => h.HolidayDate)
                .Select(h => new HolidayDto
                {
                    Id = h.Id,
                    AcademicYearId = h.AcademicYearId,
                    HolidayDate = h.HolidayDate,
                    Name = h.Name,
                    Description = h.Description
                })
                .ToListAsync();

            return Ok(ApiResponse<List<HolidayDto>>.Ok(holidays));
        }

        [HttpPost("holidays")]
        [HasPermission("StudentAttendance", "Add")]
        public async Task<ActionResult<ApiResponse<HolidayDto>>> CreateHoliday([FromBody] CreateHolidayDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var holidayDate = request.HolidayDate.Date;

            var exists = await _context.Holidays.AnyAsync(h =>
                h.BranchId == branchId &&
                h.AcademicYearId == yearId &&
                h.HolidayDate.Date == holidayDate);

            if (exists)
            {
                return BadRequest(ApiResponse<HolidayDto>.Fail("A holiday is already configured for this date."));
            }

            var holiday = new Holiday
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                HolidayDate = holidayDate,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                IsActive = true
            };

            _context.Holidays.Add(holiday);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<HolidayDto>.Ok(new HolidayDto
            {
                Id = holiday.Id,
                AcademicYearId = holiday.AcademicYearId,
                HolidayDate = holiday.HolidayDate,
                Name = holiday.Name,
                Description = holiday.Description
            }, "Holiday added successfully."));
        }
        [HttpPut("holidays/{id}")]
        [HasPermission("StudentAttendance", "Edit")]
        public async Task<ActionResult<ApiResponse<HolidayDto>>> UpdateHoliday(long id, [FromBody] CreateHolidayDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var holidayDate = request.HolidayDate.Date;

            var holiday = await _context.Holidays.FirstOrDefaultAsync(h => h.Id == id && h.BranchId == branchId);
            if (holiday == null) return NotFound(ApiResponse.Fail("Holiday not found."));

            var exists = await _context.Holidays.AnyAsync(h =>
                h.Id != id &&
                h.BranchId == branchId &&
                h.AcademicYearId == yearId &&
                h.HolidayDate.Date == holidayDate);

            if (exists)
            {
                return BadRequest(ApiResponse<HolidayDto>.Fail("Another holiday is already configured for this date."));
            }

            holiday.HolidayDate = holidayDate;
            holiday.Name = request.Name;
            holiday.Description = request.Description;

            _context.Holidays.Update(holiday);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<HolidayDto>.Ok(new HolidayDto
            {
                Id = holiday.Id,
                AcademicYearId = holiday.AcademicYearId,
                HolidayDate = holiday.HolidayDate,
                Name = holiday.Name,
                Description = holiday.Description
            }, "Holiday updated successfully."));
        }
        [HttpDelete("holidays/{id}")]
        [HasPermission("StudentAttendance", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteHoliday(long id)
        {
            var branchId = _currentUserService.BranchId;
            var holiday = await _context.Holidays.FirstOrDefaultAsync(h => h.Id == id && h.BranchId == branchId);
            if (holiday == null) return NotFound(ApiResponse.Fail("Holiday not found."));

            _context.Holidays.Remove(holiday);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Holiday deleted successfully."));
        }

        // =========================================================================
        // 2. STUDENT ATTENDANCE (FR-6.1, FR-6.2, BR-6.1)
        // =========================================================================
        [HttpGet("students")]
        [HasPermission("StudentAttendance", "View")]
        public async Task<ActionResult<ApiResponse<StudentAttendanceSheetDto>>> GetStudentAttendanceSheet(
            [FromQuery] long sectionId,
            [FromQuery] DateTime date)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var targetDate = date.Date;

            var section = await _context.Sections
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == sectionId && s.BranchId == branchId);

            if (section == null)
            {
                return NotFound(ApiResponse<StudentAttendanceSheetDto>.Fail("Section not found."));
            }

            // Check Sunday & Holiday (FR-6.2)
            bool isSunday = targetDate.DayOfWeek == DayOfWeek.Sunday;
            var holiday = await _context.Holidays
                .FirstOrDefaultAsync(h => h.BranchId == branchId &&
                                         h.AcademicYearId == yearId &&
                                         h.HolidayDate.Date == targetDate);

            // BR-6.1: Teachers can edit attendance only for today; later edits need Admin permission
            var today = DateTime.UtcNow.Date;
            bool isAdmin = _currentUserService.UserType == UserType.SuperAdmin || _currentUserService.UserType == UserType.SchoolAdmin;
            bool isEditable = isAdmin || (targetDate == today);

            // Active students enrolled in this section
            var enrollments = await _context.StudentEnrollments
                .Include(e => e.Student)
                .Where(e => e.Student!.BranchId == branchId &&
                            e.AcademicYearId == yearId &&
                            e.SectionId == sectionId &&
                            e.Status == StudentStatus.Active)
                .OrderBy(e => e.RollNo ?? int.MaxValue)
                .ThenBy(e => e.Student!.FirstName)
                .ToListAsync();

            // Existing attendances for this section and date
            var existingAttendances = await _context.StudentAttendances
                .Where(a => a.BranchId == branchId &&
                            a.AcademicYearId == yearId &&
                            a.SectionId == sectionId &&
                            a.AttendanceDate.Date == targetDate)
                .ToListAsync();

            bool alreadyMarked = existingAttendances.Any();

            var studentItems = enrollments.Select(e =>
            {
                var att = existingAttendances.FirstOrDefault(a => a.StudentId == e.StudentId);
                return new StudentAttendanceItemDto
                {
                    StudentId = e.StudentId,
                    EnrollmentId = e.Id,
                    AdmissionNo = e.Student?.AdmissionNo ?? "",
                    RollNo = e.RollNo,
                    FullName = e.Student?.FullName ?? "",
                    Gender = e.Student?.Gender ?? "Male",
                    Status = att?.Status ?? AttendanceStatus.Present, // FR-6.1: all Present by default
                    Remarks = att?.Remarks
                };
            }).ToList();

            var sheet = new StudentAttendanceSheetDto
            {
                SectionId = sectionId,
                ClassName = section.Class?.Name ?? "",
                SectionName = section.Name,
                Date = targetDate,
                IsHoliday = holiday != null,
                HolidayName = holiday?.Name,
                IsSunday = isSunday,
                IsEditable = isEditable,
                AlreadyMarked = alreadyMarked,
                Students = studentItems
            };

            return Ok(ApiResponse<StudentAttendanceSheetDto>.Ok(sheet));
        }

        [HttpPost("students/bulk")]
        [HasPermission("StudentAttendance", "Add")]
        public async Task<ActionResult<ApiResponse>> SaveStudentAttendanceBulk([FromBody] BulkStudentAttendanceDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var currentUserId = _currentUserService.UserId;
            var targetDate = request.Date.Date;

            // FR-6.2: Attendance for holidays and Sundays is blocked
            if (targetDate.DayOfWeek == DayOfWeek.Sunday)
            {
                return BadRequest(ApiResponse.Fail("Attendance marking is blocked on Sundays (FR-6.2)."));
            }

            var holiday = await _context.Holidays
                .FirstOrDefaultAsync(h => h.BranchId == branchId &&
                                         h.AcademicYearId == yearId &&
                                         h.HolidayDate.Date == targetDate);
            if (holiday != null)
            {
                return BadRequest(ApiResponse.Fail($"Attendance marking is blocked on holidays: {holiday.Name} (FR-6.2)."));
            }

            // BR-6.1: Teacher can edit attendance only for the same day; later edits need Admin permission
            var today = DateTime.UtcNow.Date;
            bool isAdmin = _currentUserService.UserType == UserType.SuperAdmin || _currentUserService.UserType == UserType.SchoolAdmin;
            if (targetDate != today && !isAdmin)
            {
                return BadRequest(ApiResponse.Fail("Teachers can only mark or edit attendance for the current day. Past attendance edits require Admin authorization (BR-6.1)."));
            }

            var section = await _context.Sections.FirstOrDefaultAsync(s => s.Id == request.SectionId && s.BranchId == branchId);
            if (section == null) return NotFound(ApiResponse.Fail("Section not found."));

            var existing = await _context.StudentAttendances
                .Where(a => a.BranchId == branchId &&
                            a.AcademicYearId == yearId &&
                            a.SectionId == request.SectionId &&
                            a.AttendanceDate.Date == targetDate)
                .ToListAsync();

            foreach (var item in request.Attendances)
            {
                var att = existing.FirstOrDefault(a => a.StudentId == item.StudentId);
                if (att != null)
                {
                    att.Status = item.Status;
                    att.Remarks = item.Remarks;
                    att.MarkedBy = currentUserId;
                }
                else
                {
                    _context.StudentAttendances.Add(new StudentAttendance
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        ClassId = section.ClassId,
                        SectionId = section.Id,
                        StudentId = item.StudentId,
                        EnrollmentId = item.EnrollmentId,
                        AttendanceDate = targetDate,
                        Status = item.Status,
                        Remarks = item.Remarks,
                        MarkedBy = currentUserId,
                        IsActive = true
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Attendance saved successfully."));
        }

        // Absentees Today (FR-6.3)
        [HttpGet("students/absentees-today")]
        [HasPermission("StudentAttendance", "View")]
        public async Task<ActionResult<ApiResponse<List<AbsenteeTodayDto>>>> GetAbsenteesToday(
            [FromQuery] DateTime? date,
            [FromQuery] long? classId,
            [FromQuery] long? sectionId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var targetDate = (date ?? DateTime.UtcNow).Date;

            var query = _context.StudentAttendances
                .Include(a => a.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(a => a.Class)
                .Include(a => a.Section)
                .Include(a => a.Enrollment)
                .Where(a => a.BranchId == branchId &&
                            a.AcademicYearId == yearId &&
                            a.AttendanceDate.Date == targetDate &&
                            (a.Status == AttendanceStatus.Absent || a.Status == AttendanceStatus.Leave));

            if (classId.HasValue) query = query.Where(a => a.ClassId == classId.Value);
            if (sectionId.HasValue) query = query.Where(a => a.SectionId == sectionId.Value);

            var absentees = await query
                .OrderBy(a => a.Class!.DisplayOrder)
                .ThenBy(a => a.Section!.Name)
                .ThenBy(a => a.Enrollment!.RollNo)
                .Select(a => new AbsenteeTodayDto
                {
                    StudentId = a.StudentId,
                    AdmissionNo = a.Student!.AdmissionNo,
                    StudentName = a.Student.FullName,
                    ClassName = a.Class!.Name,
                    SectionName = a.Section!.Name,
                    RollNo = a.Enrollment!.RollNo,
                    GuardianName = a.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Name).FirstOrDefault() ?? a.Student.Guardians.Select(g => g.Name).FirstOrDefault() ?? "",
                    GuardianMobile = a.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Mobile).FirstOrDefault() ?? a.Student.Guardians.Select(g => g.Mobile).FirstOrDefault() ?? "",
                    Status = a.Status,
                    Remarks = a.Remarks
                })
                .ToListAsync();

            return Ok(ApiResponse<List<AbsenteeTodayDto>>.Ok(absentees));
        }

        // Monthly Attendance Register (BR-6.2)
        [HttpGet("students/monthly-register")]
        [HasPermission("StudentAttendance", "View")]
        public async Task<ActionResult<ApiResponse<MonthlyAttendanceRegisterDto>>> GetMonthlyRegister(
            [FromQuery] long sectionId,
            [FromQuery] int month,
            [FromQuery] int year)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (month < 1 || month > 12) return BadRequest(ApiResponse<MonthlyAttendanceRegisterDto>.Fail("Invalid month."));
            if (year < 2000 || year > 2100) return BadRequest(ApiResponse<MonthlyAttendanceRegisterDto>.Fail("Invalid year."));

            var section = await _context.Sections
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == sectionId && s.BranchId == branchId);
            if (section == null) return NotFound(ApiResponse<MonthlyAttendanceRegisterDto>.Fail("Section not found."));

            var daysInMonth = DateTime.DaysInMonth(year, month);
            var startDate = new DateTime(year, month, 1);
            var endDate = new DateTime(year, month, daysInMonth);

            // Fetch Holidays
            var holidays = await _context.Holidays
                .Where(h => h.BranchId == branchId &&
                            h.AcademicYearId == yearId &&
                            h.HolidayDate.Date >= startDate &&
                            h.HolidayDate.Date <= endDate)
                .ToListAsync();
            var holidayDays = holidays.Select(h => h.HolidayDate.Day).Distinct().ToList();

            // Find Sundays
            var sundayDays = new List<int>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(year, month, day);
                if (dt.DayOfWeek == DayOfWeek.Sunday) sundayDays.Add(day);
            }

            var enrollments = await _context.StudentEnrollments
                .Include(e => e.Student)
                .Where(e => e.Student!.BranchId == branchId &&
                            e.AcademicYearId == yearId &&
                            e.SectionId == sectionId &&
                            e.Status == StudentStatus.Active)
                .OrderBy(e => e.RollNo ?? int.MaxValue)
                .ThenBy(e => e.Student!.FirstName)
                .ToListAsync();

            var attendances = await _context.StudentAttendances
                .Where(a => a.BranchId == branchId &&
                            a.AcademicYearId == yearId &&
                            a.SectionId == sectionId &&
                            a.AttendanceDate.Date >= startDate &&
                            a.AttendanceDate.Date <= endDate)
                .ToListAsync();

            var rows = new List<StudentMonthlyRegisterRowDto>();

            foreach (var en in enrollments)
            {
                var dailyStatus = new Dictionary<int, string>();
                decimal present = 0;
                decimal absent = 0;
                decimal leave = 0;
                decimal halfDay = 0;
                decimal late = 0;
                decimal workingDays = 0;

                for (int d = 1; d <= daysInMonth; d++)
                {
                    bool isSun = sundayDays.Contains(d);
                    bool isHol = holidayDays.Contains(d);

                    if (isSun)
                    {
                        dailyStatus[d] = "SUN";
                        continue;
                    }
                    if (isHol)
                    {
                        dailyStatus[d] = "HOL";
                        continue;
                    }

                    workingDays++;

                    var att = attendances.FirstOrDefault(a => a.StudentId == en.StudentId && a.AttendanceDate.Day == d);
                    if (att != null)
                    {
                        switch (att.Status)
                        {
                            case AttendanceStatus.Present:
                                dailyStatus[d] = "P";
                                present++;
                                break;
                            case AttendanceStatus.Absent:
                                dailyStatus[d] = "A";
                                absent++;
                                break;
                            case AttendanceStatus.Leave:
                                dailyStatus[d] = "L";
                                leave++;
                                break;
                            case AttendanceStatus.HalfDay:
                                dailyStatus[d] = "HD";
                                halfDay++;
                                break;
                            case AttendanceStatus.Late:
                                dailyStatus[d] = "LT";
                                late++;
                                present++; // late still counts as present
                                break;
                        }
                    }
                    else
                    {
                        dailyStatus[d] = "-";
                    }
                }

                // BR-6.2: Attendance percentage = present days / working days (half day = 0.5)
                decimal effectivePresent = present + (halfDay * 0.5m);
                decimal percentage = workingDays > 0 ? Math.Round((effectivePresent / workingDays) * 100, 2) : 0;

                rows.Add(new StudentMonthlyRegisterRowDto
                {
                    StudentId = en.StudentId,
                    AdmissionNo = en.Student?.AdmissionNo ?? "",
                    RollNo = en.RollNo,
                    FullName = en.Student?.FullName ?? "",
                    DailyStatus = dailyStatus,
                    TotalPresent = present,
                    TotalAbsent = absent,
                    TotalLeave = leave,
                    TotalHalfDay = halfDay,
                    TotalLate = late,
                    TotalWorkingDays = workingDays,
                    AttendancePercentage = percentage
                });
            }

            var register = new MonthlyAttendanceRegisterDto
            {
                SectionId = sectionId,
                ClassName = section.Class?.Name ?? "",
                SectionName = section.Name,
                Month = month,
                Year = year,
                DaysInMonth = daysInMonth,
                HolidayDays = holidayDays,
                SundayDays = sundayDays,
                Rows = rows
            };

            return Ok(ApiResponse<MonthlyAttendanceRegisterDto>.Ok(register));
        }

        // =========================================================================
        // 3. STAFF ATTENDANCE (FR-6.4)
        // =========================================================================
        [HttpGet("staff")]
        [HasPermission("StaffAttendance", "View")]
        public async Task<ActionResult<ApiResponse<StaffAttendanceSheetDto>>> GetStaffAttendanceSheet(
            [FromQuery] DateTime date,
            [FromQuery] long? departmentId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var targetDate = date.Date;

            bool isSunday = targetDate.DayOfWeek == DayOfWeek.Sunday;
            var holiday = await _context.Holidays
                .FirstOrDefaultAsync(h => h.BranchId == branchId &&
                                         h.AcademicYearId == yearId &&
                                         h.HolidayDate.Date == targetDate);

            var empQuery = _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Where(e => e.BranchId == branchId && e.Status == EmployeeStatus.Active);

            if (departmentId.HasValue)
            {
                empQuery = empQuery.Where(e => e.DepartmentId == departmentId.Value);
            }

            var employees = await empQuery
                .OrderBy(e => e.FirstName)
                .ThenBy(e => e.LastName)
                .ToListAsync();

            var existing = await _context.StaffAttendances
                .Where(a => a.BranchId == branchId && a.AttendanceDate.Date == targetDate)
                .ToListAsync();

            bool alreadyMarked = existing.Any();

            var staffItems = employees.Select(e =>
            {
                var att = existing.FirstOrDefault(a => a.EmployeeId == e.Id);
                return new StaffAttendanceItemDto
                {
                    EmployeeId = e.Id,
                    EmployeeCode = e.EmployeeCode,
                    FullName = e.FullName,
                    DepartmentName = e.Department?.Name ?? "",
                    DesignationName = e.Designation?.Name ?? "",
                    Status = att?.Status ?? AttendanceStatus.Present,
                    InTime = att?.InTime?.ToString(@"hh\:mm"),
                    OutTime = att?.OutTime?.ToString(@"hh\:mm"),
                    Remarks = att?.Remarks
                };
            }).ToList();

            var sheet = new StaffAttendanceSheetDto
            {
                Date = targetDate,
                IsHoliday = holiday != null,
                HolidayName = holiday?.Name,
                IsSunday = isSunday,
                AlreadyMarked = alreadyMarked,
                Staff = staffItems
            };

            return Ok(ApiResponse<StaffAttendanceSheetDto>.Ok(sheet));
        }

        [HttpPost("staff/bulk")]
        [HasPermission("StaffAttendance", "Add")]
        public async Task<ActionResult<ApiResponse>> SaveStaffAttendanceBulk([FromBody] BulkStaffAttendanceDto request)
        {
            var branchId = _currentUserService.BranchId;
            var currentUserId = _currentUserService.UserId;
            var targetDate = request.Date.Date;

            var existing = await _context.StaffAttendances
                .Where(a => a.BranchId == branchId && a.AttendanceDate.Date == targetDate)
                .ToListAsync();

            foreach (var item in request.Attendances)
            {
                TimeSpan? inTime = null;
                TimeSpan? outTime = null;

                if (!string.IsNullOrWhiteSpace(item.InTime) && TimeSpan.TryParse(item.InTime, out var it)) inTime = it;
                if (!string.IsNullOrWhiteSpace(item.OutTime) && TimeSpan.TryParse(item.OutTime, out var ot)) outTime = ot;

                var att = existing.FirstOrDefault(a => a.EmployeeId == item.EmployeeId);
                if (att != null)
                {
                    att.Status = item.Status;
                    att.InTime = inTime;
                    att.OutTime = outTime;
                    att.Remarks = item.Remarks;
                    att.MarkedBy = currentUserId;
                }
                else
                {
                    _context.StaffAttendances.Add(new StaffAttendance
                    {
                        BranchId = branchId,
                        EmployeeId = item.EmployeeId,
                        AttendanceDate = targetDate,
                        Status = item.Status,
                        InTime = inTime,
                        OutTime = outTime,
                        Remarks = item.Remarks,
                        MarkedBy = currentUserId,
                        IsActive = true
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Staff attendance saved successfully."));
        }

        // Staff Monthly Register
        [HttpGet("staff/monthly-register")]
        [HasPermission("StaffAttendance", "View")]
        public async Task<ActionResult<ApiResponse<StaffMonthlyRegisterDto>>> GetStaffMonthlyRegister(
            [FromQuery] int month,
            [FromQuery] int year,
            [FromQuery] long? departmentId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (month < 1 || month > 12) return BadRequest(ApiResponse<StaffMonthlyRegisterDto>.Fail("Invalid month."));
            if (year < 2000 || year > 2100) return BadRequest(ApiResponse<StaffMonthlyRegisterDto>.Fail("Invalid year."));

            var daysInMonth = DateTime.DaysInMonth(year, month);
            var startDate = new DateTime(year, month, 1);
            var endDate = new DateTime(year, month, daysInMonth);

            // Fetch Holidays
            var holidays = await _context.Holidays
                .Where(h => h.BranchId == branchId &&
                            h.AcademicYearId == yearId &&
                            h.HolidayDate.Date >= startDate &&
                            h.HolidayDate.Date <= endDate)
                .ToListAsync();
            var holidayDays = holidays.Select(h => h.HolidayDate.Day).Distinct().ToList();

            var sundayDays = new List<int>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(year, month, day);
                if (dt.DayOfWeek == DayOfWeek.Sunday) sundayDays.Add(day);
            }

            var empQuery = _context.Employees
                .Include(e => e.Department)
                .Where(e => e.BranchId == branchId && e.Status == EmployeeStatus.Active);

            if (departmentId.HasValue) empQuery = empQuery.Where(e => e.DepartmentId == departmentId.Value);

            var employees = await empQuery.OrderBy(e => e.FirstName).ToListAsync();

            var attendances = await _context.StaffAttendances
                .Where(a => a.BranchId == branchId &&
                            a.AttendanceDate.Date >= startDate &&
                            a.AttendanceDate.Date <= endDate)
                .ToListAsync();

            var rows = new List<StaffMonthlyRegisterRowDto>();

            foreach (var emp in employees)
            {
                var dailyStatus = new Dictionary<int, string>();
                decimal present = 0;
                decimal absent = 0;
                decimal leave = 0;
                decimal halfDay = 0;
                decimal workingDays = 0;

                for (int d = 1; d <= daysInMonth; d++)
                {
                    bool isSun = sundayDays.Contains(d);
                    bool isHol = holidayDays.Contains(d);

                    if (isSun)
                    {
                        dailyStatus[d] = "SUN";
                        continue;
                    }
                    if (isHol)
                    {
                        dailyStatus[d] = "HOL";
                        continue;
                    }

                    workingDays++;

                    var att = attendances.FirstOrDefault(a => a.EmployeeId == emp.Id && a.AttendanceDate.Day == d);
                    if (att != null)
                    {
                        switch (att.Status)
                        {
                            case AttendanceStatus.Present:
                                dailyStatus[d] = "P";
                                present++;
                                break;
                            case AttendanceStatus.Absent:
                                dailyStatus[d] = "A";
                                absent++;
                                break;
                            case AttendanceStatus.Leave:
                                dailyStatus[d] = "L";
                                leave++;
                                break;
                            case AttendanceStatus.HalfDay:
                                dailyStatus[d] = "HD";
                                halfDay++;
                                break;
                            default:
                                dailyStatus[d] = "P";
                                present++;
                                break;
                        }
                    }
                    else
                    {
                        dailyStatus[d] = "-";
                    }
                }

                decimal effectivePresent = present + (halfDay * 0.5m);
                decimal percentage = workingDays > 0 ? Math.Round((effectivePresent / workingDays) * 100, 2) : 0;

                rows.Add(new StaffMonthlyRegisterRowDto
                {
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.EmployeeCode,
                    FullName = emp.FullName,
                    DepartmentName = emp.Department?.Name ?? "",
                    DailyStatus = dailyStatus,
                    TotalPresent = present,
                    TotalAbsent = absent,
                    TotalLeave = leave,
                    TotalHalfDay = halfDay,
                    TotalWorkingDays = workingDays,
                    AttendancePercentage = percentage
                });
            }

            var register = new StaffMonthlyRegisterDto
            {
                Month = month,
                Year = year,
                DaysInMonth = daysInMonth,
                HolidayDays = holidayDays,
                SundayDays = sundayDays,
                Rows = rows
            };

            return Ok(ApiResponse<StaffMonthlyRegisterDto>.Ok(register));
        }
    }
}
