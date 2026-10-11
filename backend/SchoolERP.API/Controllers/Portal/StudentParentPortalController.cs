using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers.Portal
{
    [ApiController]
    [Route("api/portal")]
    [Authorize]
    public class StudentParentPortalController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public StudentParentPortalController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private async Task<(long studentId, Student? student)> ResolveCurrentStudentAsync(long? requestedStudentId = null)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            long.TryParse(userIdStr, out var userId);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return (0, null);

            // If user is a Student (UserType == 7)
            if (user.UserType == UserType.Student)
            {
                var studentId = user.LinkedEntityId ?? 0;
                if (studentId == 0)
                {
                    // Fallback by admission number matching username or email
                    var match = await _context.Students.FirstOrDefaultAsync(s => s.AdmissionNo == user.Username || (user.Email != null && s.EmergencyContact == user.Email));
                    if (match != null) studentId = match.Id;
                }
                var sObj = await _context.Students
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Class)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Section)
                    .FirstOrDefaultAsync(s => s.Id == studentId);
                return (studentId, sObj);
            }

            // If user is a Parent (UserType == 6)
            if (user.UserType == UserType.Parent)
            {
                // Can have multiple wards/children
                var guardianId = user.LinkedEntityId ?? 0;
                var wardStudentIds = await _context.Set<StudentGuardian>()
                    .Where(g => g.Id == guardianId || g.Mobile == user.Mobile || (user.Email != null && g.Email == user.Email))
                    .Select(g => g.StudentId)
                    .ToListAsync();

                if (wardStudentIds.Count == 0 && user.LinkedEntityId.HasValue)
                {
                    wardStudentIds.Add(user.LinkedEntityId.Value);
                }

                long targetId = requestedStudentId.HasValue && wardStudentIds.Contains(requestedStudentId.Value)
                    ? requestedStudentId.Value
                    : wardStudentIds.FirstOrDefault();

                if (targetId == 0)
                {
                    // If no student mapped yet, fallback to first active student in branch for demo preview
                    var fallback = await _context.Students.FirstOrDefaultAsync(s => s.BranchId == user.BranchId && s.Status == StudentStatus.Active);
                    targetId = fallback?.Id ?? 0;
                }

                var sObj = await _context.Students
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Class)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Section)
                    .FirstOrDefaultAsync(s => s.Id == targetId);

                return (targetId, sObj);
            }

            // Admin / Staff previewing as a student
            if (requestedStudentId.HasValue && requestedStudentId.Value > 0)
            {
                var sObj = await _context.Students
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Class)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Section)
                    .FirstOrDefaultAsync(s => s.Id == requestedStudentId.Value);
                return (requestedStudentId.Value, sObj);
            }

            // Default fallback: first active student
            var demoStudent = await _context.Students
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .FirstOrDefaultAsync(s => s.BranchId == _currentUserService.BranchId && s.Status == StudentStatus.Active);

            return (demoStudent?.Id ?? 0, demoStudent);
        }

        // 1. Get Wards (For Parent View dropdown)
        [HttpGet("wards")]
        public async Task<IActionResult> GetWards()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            long.TryParse(userIdStr, out var userId);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return Unauthorized(ApiResponse.Fail("User not found"));

            List<long> wardIds = new();
            if (user.UserType == UserType.Parent)
            {
                var guardianId = user.LinkedEntityId ?? 0;
                wardIds = await _context.Set<StudentGuardian>()
                    .Where(g => g.Id == guardianId || g.Mobile == user.Mobile || (user.Email != null && g.Email == user.Email))
                    .Select(g => g.StudentId)
                    .ToListAsync();

                if (wardIds.Count == 0 && user.LinkedEntityId.HasValue) wardIds.Add(user.LinkedEntityId.Value);
            }
            else if (user.UserType == UserType.Student)
            {
                if (user.LinkedEntityId.HasValue) wardIds.Add(user.LinkedEntityId.Value);
            }

            if (wardIds.Count == 0)
            {
                var fallbackStudent = await _context.Students.FirstOrDefaultAsync(s => s.BranchId == user.BranchId && s.Status == StudentStatus.Active);
                if (fallbackStudent != null) wardIds.Add(fallbackStudent.Id);
            }

            var wards = await _context.Students
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .Where(s => wardIds.Contains(s.Id))
                .Select(s => new
                {
                    s.Id,
                    s.AdmissionNo,
                    s.FirstName,
                    s.LastName,
                    FullName = (s.FirstName + " " + s.LastName).Trim(),
                    s.PhotoUrl,
                    s.Gender,
                    ClassName = s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.Class != null ? e.Class.Name : "").FirstOrDefault() ?? "Class",
                    SectionName = s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.Section != null ? e.Section.Name : "").FirstOrDefault() ?? "A",
                    RollNo = s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.RollNo).FirstOrDefault() ?? 0
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(wards));
        }

        // 2. Comprehensive Student / Parent Portal Overview & Dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetPortalDashboard([FromQuery] long? studentId = null)
        {
            var (sId, student) = await ResolveCurrentStudentAsync(studentId);
            if (student == null)
            {
                return NotFound(ApiResponse.Fail("Student record not linked or found."));
            }

            var activeEnrollment = student.Enrollments.OrderByDescending(e => e.Id).FirstOrDefault();
            var classId = activeEnrollment?.ClassId ?? 0;
            var sectionId = activeEnrollment?.SectionId ?? 0;

            // Attendance summary
            var allAttendance = await _context.Set<StudentAttendance>()
                .Where(a => a.StudentId == sId)
                .ToListAsync();

            var totalMarked = allAttendance.Count;
            var presentCount = allAttendance.Count(a => a.Status == AttendanceStatus.Present);
            var absentCount = allAttendance.Count(a => a.Status == AttendanceStatus.Absent);
            var leaveCount = allAttendance.Count(a => a.Status == AttendanceStatus.Leave);
            var attendancePercentage = totalMarked > 0 ? Math.Round((double)presentCount / totalMarked * 100, 1) : 100.0;

            // Monthly attendance breakdown (last 6 months)
            var monthlyAttendance = allAttendance
                .GroupBy(a => a.AttendanceDate.ToString("MMM yyyy"))
                .Select(g => new
                {
                    Month = g.Key,
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == AttendanceStatus.Present),
                    Absent = g.Count(x => x.Status == AttendanceStatus.Absent),
                    Percentage = g.Count() > 0 ? Math.Round((double)g.Count(x => x.Status == AttendanceStatus.Present) / g.Count() * 100, 1) : 0
                })
                .Take(6)
                .ToList();

            // Fee Summary
            var feeDues = await _context.Set<StudentFeeDue>()
                .Include(f => f.FeeHead)
                .Include(f => f.Installment)
                .Where(f => f.StudentId == sId)
                .ToListAsync();

            var totalFee = feeDues.Sum(f => f.OriginalAmount);
            var totalPaid = feeDues.Sum(f => f.PaidAmount);
            var totalPending = feeDues.Sum(f => f.BalanceAmount);
            var totalConcession = feeDues.Sum(f => f.ConcessionAmount);

            var recentReceipts = await _context.Set<FeeReceipt>()
                .Where(r => r.StudentId == sId)
                .OrderByDescending(r => r.ReceiptDate)
                .Take(5)
                .Select(r => new
                {
                    r.Id,
                    r.ReceiptNo,
                    r.ReceiptDate,
                    r.TotalPaid,
                    r.Status
                })
                .ToListAsync();

            // Next / Upcoming Exams
            var today = DateTime.UtcNow.Date;
            var upcomingExams = await _context.Set<ExamSchedule>()
                .Include(es => es.Exam)
                .Include(es => es.Subject)
                .Where(es => es.Exam != null && es.Exam.ClassId == classId && es.Exam.IsPublished && es.ExamDate >= today)
                .OrderBy(es => es.ExamDate)
                .Take(4)
                .Select(es => new
                {
                    es.Id,
                    ExamName = es.Exam!.Name,
                    SubjectName = es.Subject != null ? es.Subject.Name : "Subject",
                    SubjectCode = es.Subject != null ? es.Subject.Code : "",
                    es.ExamDate,
                    StartTime = es.StartTime.HasValue ? es.StartTime.ToString() : "",
                    EndTime = es.EndTime.HasValue ? es.EndTime.ToString() : "",
                    es.RoomNo,
                    es.MaxMarks
                })
                .ToListAsync();

            // Recent Exam Marks Card Summary
            var recentMarks = await _context.Set<MarksEntry>()
                .Include(m => m.Schedule)
                    .ThenInclude(s => s!.Exam)
                .Include(m => m.Schedule)
                    .ThenInclude(s => s!.Subject)
                .Where(m => m.StudentId == sId && m.Schedule!.Exam!.IsPublished)
                .OrderByDescending(m => m.Id)
                .Take(6)
                .Select(m => new
                {
                    ExamName = m.Schedule!.Exam!.Name,
                    Subject = m.Schedule!.Subject != null ? m.Schedule.Subject.Name : "Subject",
                    MarksObtained = m.MarksObtained ?? 0,
                    MaxMarks = m.Schedule!.MaxMarks,
                    m.IsAbsent
                })
                .ToListAsync();

            // Notice Board / Notifications
            var notices = await _context.Set<SystemNotification>()
                .Where(n => n.BranchId == student.BranchId && (n.TargetUserId == null || n.TargetUserId == sId))
                .OrderByDescending(n => n.SentAt)
                .Take(5)
                .Select(n => new
                {
                    n.Id,
                    n.Title,
                    n.Message,
                    n.SentAt
                })
                .ToListAsync();

            // Today's Timetable
            var currentDayOfWeek = (int)DateTime.UtcNow.DayOfWeek;
            var dayEnum = (TimetableDay)(currentDayOfWeek == 0 ? 7 : currentDayOfWeek);
            var todayTimetable = await _context.Set<TimetableEntry>()
                .Include(t => t.Period)
                .Include(t => t.Subject)
                .Include(t => t.Employee)
                .Where(t => t.ClassId == classId && t.SectionId == sectionId && t.DayOfWeek == dayEnum)
                .OrderBy(t => t.Period != null ? t.Period.DisplayOrder : 0)
                .Select(t => new
                {
                    PeriodName = t.Period != null ? t.Period.Name : "",
                    PeriodNo = t.Period != null ? t.Period.PeriodNumber : 0,
                    StartTime = t.Period != null ? t.Period.StartTime.ToString(@"hh\:mm") : "",
                    EndTime = t.Period != null ? t.Period.EndTime.ToString(@"hh\:mm") : "",
                    Subject = t.Subject != null ? t.Subject.Name : "Free Period",
                    Teacher = t.Employee != null ? (t.Employee.FirstName + " " + t.Employee.LastName).Trim() : "",
                    t.RoomNo
                })
                .ToListAsync();

            var data = new
            {
                Student = new
                {
                    student.Id,
                    student.AdmissionNo,
                    student.FirstName,
                    student.LastName,
                    FullName = student.FullName,
                    student.DateOfBirth,
                    student.Gender,
                    student.BloodGroup,
                    student.PhotoUrl,
                    student.Address,
                    student.City,
                    student.State,
                    student.Pincode,
                    student.EmergencyContact,
                    ClassName = activeEnrollment?.Class?.Name ?? "Class",
                    SectionName = activeEnrollment?.Section?.Name ?? "Section",
                    RollNo = activeEnrollment?.RollNo ?? 0
                },
                Attendance = new
                {
                    TotalMarked = totalMarked,
                    Present = presentCount,
                    Absent = absentCount,
                    Leave = leaveCount,
                    Percentage = attendancePercentage,
                    MonthlyBreakdown = monthlyAttendance
                },
                Fees = new
                {
                    TotalFee = totalFee,
                    TotalPaid = totalPaid,
                    TotalPending = totalPending,
                    TotalConcession = totalConcession,
                    RecentReceipts = recentReceipts,
                    PendingDues = feeDues.Where(f => f.BalanceAmount > 0).Select(f => new
                    {
                        HeadName = f.FeeHead?.Name ?? "Fee Head",
                        Installment = f.Installment?.Name ?? "Installment",
                        DueDate = f.Installment?.DueDate,
                        Amount = f.OriginalAmount,
                        Balance = f.BalanceAmount
                    }).ToList()
                },
                UpcomingExams = upcomingExams,
                RecentMarks = recentMarks,
                Notices = notices,
                TodayTimetable = todayTimetable
            };

            return Ok(ApiResponse<object>.Ok(data));
        }

        // 3. Detailed Attendance History for Student/Parent
        [HttpGet("attendance")]
        public async Task<IActionResult> GetAttendanceHistory([FromQuery] long? studentId = null, [FromQuery] int? month = null, [FromQuery] int? year = null)
        {
            var (sId, _) = await ResolveCurrentStudentAsync(studentId);
            if (sId == 0) return NotFound(ApiResponse.Fail("Student not found"));

            var query = _context.Set<StudentAttendance>()
                .Where(a => a.StudentId == sId)
                .AsQueryable();

            if (month.HasValue && month.Value > 0)
                query = query.Where(a => a.AttendanceDate.Month == month.Value);

            if (year.HasValue && year.Value > 0)
                query = query.Where(a => a.AttendanceDate.Year == year.Value);

            var logs = await query
                .OrderByDescending(a => a.AttendanceDate)
                .Select(a => new
                {
                    a.Id,
                    a.AttendanceDate,
                    Status = a.Status.ToString(),
                    a.Remarks
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(logs));
        }

        // 4. Timetable Weekly View for Student/Parent
        [HttpGet("timetable")]
        public async Task<IActionResult> GetWeeklyTimetable([FromQuery] long? studentId = null)
        {
            var (sId, student) = await ResolveCurrentStudentAsync(studentId);
            if (student == null) return NotFound(ApiResponse.Fail("Student not found"));

            var activeEnrollment = student.Enrollments.OrderByDescending(e => e.Id).FirstOrDefault();
            var classId = activeEnrollment?.ClassId ?? 0;
            var sectionId = activeEnrollment?.SectionId ?? 0;

            var entries = await _context.Set<TimetableEntry>()
                .Include(t => t.Period)
                .Include(t => t.Subject)
                .Include(t => t.Employee)
                .Where(t => t.ClassId == classId && t.SectionId == sectionId)
                .OrderBy(t => t.DayOfWeek)
                .ThenBy(t => t.Period != null ? t.Period.DisplayOrder : 0)
                .Select(t => new
                {
                    t.Id,
                    DayOfWeek = t.DayOfWeek.ToString(),
                    DayIndex = (int)t.DayOfWeek,
                    PeriodName = t.Period != null ? t.Period.Name : "",
                    PeriodNo = t.Period != null ? t.Period.PeriodNumber : 0,
                    StartTime = t.Period != null ? t.Period.StartTime.ToString(@"hh\:mm") : "",
                    EndTime = t.Period != null ? t.Period.EndTime.ToString(@"hh\:mm") : "",
                    Subject = t.Subject != null ? t.Subject.Name : "Break / Free",
                    Teacher = t.Employee != null ? (t.Employee.FirstName + " " + t.Employee.LastName).Trim() : "",
                    t.RoomNo
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(entries));
        }

        // 5. Examinations and Report Card for Student/Parent
        [HttpGet("exams")]
        public async Task<IActionResult> GetExamsAndReportCards([FromQuery] long? studentId = null)
        {
            var (sId, student) = await ResolveCurrentStudentAsync(studentId);
            if (student == null) return NotFound(ApiResponse.Fail("Student not found"));

            var activeEnrollment = student.Enrollments.OrderByDescending(e => e.Id).FirstOrDefault();
            var classId = activeEnrollment?.ClassId ?? 0;

            // Published Exams for class
            var exams = await _context.Set<Exam>()
                .Include(e => e.Term)
                .Include(e => e.Schedules)
                    .ThenInclude(s => s.Subject)
                .Where(e => e.ClassId == classId && e.IsPublished)
                .OrderByDescending(e => e.Id)
                .ToListAsync();

            var marksList = await _context.Set<MarksEntry>()
                .Where(m => m.StudentId == sId)
                .ToListAsync();

            var result = exams.Select(e => new
            {
                e.Id,
                e.Name,
                TermName = e.Term?.Name ?? "Term",
                Schedules = e.Schedules.Select(s =>
                {
                    var m = marksList.FirstOrDefault(x => x.ScheduleId == s.Id);
                    return new
                    {
                        s.Id,
                        SubjectName = s.Subject?.Name ?? "Subject",
                        SubjectCode = s.Subject?.Code ?? "",
                        s.ExamDate,
                        s.MaxMarks,
                        s.PassMarks,
                        MarksObtained = m?.MarksObtained,
                        IsAbsent = m?.IsAbsent ?? false,
                        Grade = m?.MarksObtained.HasValue == true && s.MaxMarks > 0
                            ? (m.MarksObtained.Value / s.MaxMarks >= 0.9m ? "A1"
                            : m.MarksObtained.Value / s.MaxMarks >= 0.8m ? "A2"
                            : m.MarksObtained.Value / s.MaxMarks >= 0.7m ? "B1"
                            : m.MarksObtained.Value / s.MaxMarks >= 0.6m ? "B2"
                            : m.MarksObtained.Value / s.MaxMarks >= 0.5m ? "C1"
                            : m.MarksObtained.Value / s.MaxMarks >= 0.33m ? "D" : "E")
                            : "—"
                    };
                }).ToList()
            }).ToList();

            return Ok(ApiResponse<object>.Ok(result));
        }

        // 6. Complete Fees Ledger & Receipts
        [HttpGet("fees")]
        public async Task<IActionResult> GetFeesLedger([FromQuery] long? studentId = null)
        {
            var (sId, _) = await ResolveCurrentStudentAsync(studentId);
            if (sId == 0) return NotFound(ApiResponse.Fail("Student not found"));

            var dues = await _context.Set<StudentFeeDue>()
                .Include(f => f.FeeHead)
                .Include(f => f.Installment)
                .Where(f => f.StudentId == sId)
                .OrderBy(f => f.Installment != null ? f.Installment.DueDate : DateTime.MinValue)
                .Select(f => new
                {
                    f.Id,
                    FeeHead = f.FeeHead != null ? f.FeeHead.Name : "Fee Head",
                    Installment = f.Installment != null ? f.Installment.Name : "General",
                    DueDate = f.Installment != null ? f.Installment.DueDate.ToString("yyyy-MM-dd") : "",
                    f.OriginalAmount,
                    f.ConcessionAmount,
                    f.PaidAmount,
                    f.BalanceAmount,
                    Status = f.Status.ToString()
                })
                .ToListAsync();

            var receipts = await _context.Set<FeeReceipt>()
                .Where(r => r.StudentId == sId)
                .OrderByDescending(r => r.ReceiptDate)
                .Select(r => new
                {
                    r.Id,
                    r.ReceiptNo,
                    r.ReceiptDate,
                    r.TotalPaid,
                    r.Status,
                    r.Remarks
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(new { Dues = dues, Receipts = receipts }));
        }
    }
}
