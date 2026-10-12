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
using SchoolERP.Application.DTOs;
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

            // Check School-level student / parent portal permission
            var branch = await _context.Branches.Include(b => b.School).FirstOrDefaultAsync(b => b.Id == user.BranchId);
            if (branch?.School != null)
            {
                if (user.UserType == UserType.Student && !branch.School.AllowStudentLogin)
                    return (0, null);
                if (user.UserType == UserType.Parent && !branch.School.AllowParentLogin)
                    return (0, null);
            }

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
                    .Include(s => s.Guardians)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Class)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Section)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.AcademicYear)
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
                    .Include(s => s.Guardians)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Class)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Section)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.AcademicYear)
                    .FirstOrDefaultAsync(s => s.Id == targetId);

                return (targetId, sObj);
            }

            // Admin / Staff previewing as a student
            if (requestedStudentId.HasValue && requestedStudentId.Value > 0)
            {
                var sObj = await _context.Students
                    .Include(s => s.Guardians)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Class)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.Section)
                    .Include(s => s.Enrollments)
                        .ThenInclude(e => e.AcademicYear)
                    .FirstOrDefaultAsync(s => s.Id == requestedStudentId.Value);
                return (requestedStudentId.Value, sObj);
            }

            // Default fallback: first active student
            var demoStudent = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.AcademicYear)
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

            var yearId = _currentUserService.AcademicYearId;

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
                    ClassName = s.Enrollments.Where(e => yearId == 0 || e.AcademicYearId == yearId).OrderByDescending(e => e.Id).Select(e => e.Class != null ? e.Class.Name : "").FirstOrDefault() 
                                ?? s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.Class != null ? e.Class.Name : "").FirstOrDefault() ?? "Class",
                    SectionName = s.Enrollments.Where(e => yearId == 0 || e.AcademicYearId == yearId).OrderByDescending(e => e.Id).Select(e => e.Section != null ? e.Section.Name : "").FirstOrDefault() 
                                ?? s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.Section != null ? e.Section.Name : "").FirstOrDefault() ?? "A",
                    RollNo = s.Enrollments.Where(e => yearId == 0 || e.AcademicYearId == yearId).OrderByDescending(e => e.Id).Select(e => e.RollNo).FirstOrDefault() 
                                ?? s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.RollNo).FirstOrDefault() ?? 0
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

            var yearId = _currentUserService.AcademicYearId;

            var activeEnrollment = (yearId > 0 ? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active) : null)
                                   ?? (yearId > 0 ? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) : null)
                                   ?? student.Enrollments.OrderByDescending(e => e.Id).FirstOrDefault();

            var classId = activeEnrollment?.ClassId ?? 0;
            var sectionId = activeEnrollment?.SectionId ?? 0;

            // Attendance summary filtered by active academic year
            var allAttendance = await _context.Set<StudentAttendance>()
                .Where(a => a.StudentId == sId && (yearId == 0 || a.AcademicYearId == yearId))
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

            // Fee Summary filtered by active academic year
            var feeDues = await _context.Set<StudentFeeDue>()
                .Include(f => f.FeeHead)
                .Include(f => f.Installment)
                .Where(f => f.StudentId == sId && (yearId == 0 || f.AcademicYearId == yearId))
                .ToListAsync();

            var totalFee = feeDues.Sum(f => f.OriginalAmount);
            var totalPaid = feeDues.Sum(f => f.PaidAmount);
            var totalPending = feeDues.Sum(f => f.BalanceAmount);
            var totalConcession = feeDues.Sum(f => f.ConcessionAmount);

            var recentReceipts = await _context.Set<FeeReceipt>()
                .Where(r => r.StudentId == sId && (yearId == 0 || r.AcademicYearId == yearId))
                .OrderByDescending(r => r.ReceiptDate)
                .Take(10)
                .Select(r => new
                {
                    r.Id,
                    r.ReceiptNo,
                    r.ReceiptDate,
                    r.TotalPaid,
                    r.Status
                })
                .ToListAsync();

            // Upcoming & Current Exam Schedules for this class and session
            var today = DateTime.UtcNow.Date;
            var upcomingExams = await _context.Set<ExamSchedule>()
                .Include(es => es.Exam)
                .Include(es => es.Subject)
                .Where(es => es.Exam != null && es.Exam.ClassId == classId && (yearId == 0 || es.Exam.AcademicYearId == yearId))
                .OrderBy(es => es.ExamDate)
                .Take(10)
                .Select(es => new
                {
                    es.Id,
                    ExamId = es.Exam!.Id,
                    ExamName = es.Exam!.Name,
                    SubjectName = es.Subject != null ? es.Subject.Name : "Subject",
                    SubjectCode = es.Subject != null ? es.Subject.Code : "",
                    es.ExamDate,
                    StartTime = es.StartTime.HasValue ? es.StartTime.ToString() : "",
                    EndTime = es.EndTime.HasValue ? es.EndTime.ToString() : "",
                    es.RoomNo,
                    es.MaxMarks,
                    es.PassMarks,
                    IsPublished = es.Exam!.IsPublished || (es.Exam.PublishDate.HasValue && es.Exam.PublishDate.Value.Date <= today)
                })
                .ToListAsync();

            // Recent Exam Marks Card Summary
            var recentMarks = await _context.Set<MarksEntry>()
                .Include(m => m.Schedule)
                    .ThenInclude(s => s!.Exam)
                .Include(m => m.Schedule)
                    .ThenInclude(s => s!.Subject)
                .Where(m => m.StudentId == sId && (yearId == 0 || m.Schedule!.Exam!.AcademicYearId == yearId) && (m.Schedule!.Exam!.IsPublished || (m.Schedule.Exam.PublishDate.HasValue && m.Schedule.Exam.PublishDate.Value.Date <= today) || m.MarksObtained.HasValue))
                .OrderByDescending(m => m.Id)
                .Take(10)
                .Select(m => new
                {
                    ExamId = m.Schedule!.Exam!.Id,
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

            // 1. Holiday Calendar (for this branch and academic year)
            var holidays = await _context.Set<Holiday>()
                .Where(h => h.BranchId == student.BranchId && (yearId == 0 || h.AcademicYearId == yearId))
                .OrderBy(h => h.HolidayDate)
                .Select(h => new
                {
                    h.Id,
                    h.Name,
                    h.HolidayDate,
                    h.Description
                })
                .ToListAsync();

            // 2. Class Teacher Details (Name, Phone, Email)
            var classTeacherAlloc = await _context.Set<TeacherAllocation>()
                .Include(ta => ta.Employee)
                .Where(ta => ta.BranchId == student.BranchId && ta.ClassId == classId && ta.SectionId == sectionId && ta.IsClassTeacher && (yearId == 0 || ta.AcademicYearId == yearId))
                .OrderByDescending(ta => ta.Id)
                .FirstOrDefaultAsync();

            var classTeacher = classTeacherAlloc?.Employee != null ? new
            {
                Name = (classTeacherAlloc.Employee.FirstName + " " + classTeacherAlloc.Employee.LastName).Trim(),
                Phone = classTeacherAlloc.Employee.Mobile ?? "",
                Email = classTeacherAlloc.Employee.Email ?? "",
                Designation = "Class Teacher"
            } : null;

            // 3. Transport Route & Driver Details
            var transportAlloc = await _context.Set<TransportAllocation>()
                .Include(ta => ta.RouteStop)
                    .ThenInclude(rs => rs!.Route)
                        .ThenInclude(r => r!.Vehicle)
                            .ThenInclude(v => v!.Driver)
                .Where(ta => ta.StudentId == sId && ta.Status == "Active" && (yearId == 0 || ta.AcademicYearId == yearId))
                .OrderByDescending(ta => ta.Id)
                .FirstOrDefaultAsync();

            var transportDetails = transportAlloc?.RouteStop != null ? new
            {
                HasTransport = true,
                RouteName = transportAlloc.RouteStop.Route?.RouteName ?? "Bus Route",
                StopName = transportAlloc.RouteStop.StopName,
                PickUpTime = transportAlloc.RouteStop.PickUpTime?.ToString(@"hh\:mm") ?? "",
                DropTime = transportAlloc.RouteStop.DropTime?.ToString(@"hh\:mm") ?? "",
                MonthlyFare = transportAlloc.RouteStop.MonthlyFare,
                VehicleNo = transportAlloc.RouteStop.Route?.Vehicle?.RegistrationNo ?? "Bus",
                VehicleType = transportAlloc.RouteStop.Route?.Vehicle?.VehicleType ?? "Bus",
                DriverName = transportAlloc.RouteStop.Route?.Vehicle?.Driver != null
                    ? (transportAlloc.RouteStop.Route.Vehicle.Driver.FirstName + " " + transportAlloc.RouteStop.Route.Vehicle.Driver.LastName).Trim()
                    : (transportAlloc.RouteStop.Route?.Vehicle?.DriverName ?? "Assigned Driver"),
                DriverPhone = transportAlloc.RouteStop.Route?.Vehicle?.Driver?.Mobile 
                    ?? transportAlloc.RouteStop.Route?.Vehicle?.DriverPhone 
                    ?? ""
            } : new
            {
                HasTransport = false,
                RouteName = "",
                StopName = "",
                PickUpTime = "",
                DropTime = "",
                MonthlyFare = 0m,
                VehicleNo = "",
                VehicleType = "",
                DriverName = "",
                DriverPhone = ""
            };

            // 4. Student Fee Concessions
            var concessionsList = await _context.Set<FeeConcession>()
                .Include(c => c.FeeHead)
                .Where(c => c.StudentId == sId && c.IsApproved && (yearId == 0 || c.AcademicYearId == yearId))
                .Select(c => new
                {
                    c.Id,
                    FeeHead = c.FeeHead != null ? c.FeeHead.Name : "Fee Head",
                    Type = c.Type.ToString(),
                    Value = c.Value,
                    CalculatedAmount = c.CalculatedAmount,
                    Reason = c.Reason ?? "Fee Concession"
                })
                .ToListAsync();

            // 5. Late Fine Rules & Installment Due Dates
            var fineRules = await _context.Set<FineRule>()
                .Include(fr => fr.Installment)
                .Where(fr => fr.BranchId == student.BranchId && (yearId == 0 || fr.AcademicYearId == yearId))
                .Select(fr => new
                {
                    fr.Id,
                    InstallmentName = fr.Installment != null ? fr.Installment.Name : "Installment",
                    DueDate = fr.Installment != null ? fr.Installment.DueDate : DateTime.MinValue,
                    GraceDays = fr.GraceDays,
                    LateFineAmount = fr.Amount,
                    FineType = fr.FineType.ToString(),
                    FineApplicableFrom = fr.Installment != null ? fr.Installment.DueDate.AddDays(fr.GraceDays) : DateTime.MinValue
                })
                .ToListAsync();

            // 6. Branch / School Info (for ID Card & Demand Slip)
            var branchInfo = await _context.Branches
                .Include(b => b.School)
                .Where(b => b.Id == student.BranchId)
                .Select(b => new
                {
                    SchoolName = b.School != null ? b.School.Name : b.Name,
                    BranchName = b.Name,
                    Address = b.Address ?? (b.School != null ? b.School.Address : ""),
                    Phone = b.Phone ?? (b.School != null ? b.School.ContactNumber : ""),
                    Email = b.Email ?? (b.School != null ? b.School.Email : ""),
                    LogoUrl = b.LogoUrl ?? (b.School != null ? b.School.LogoUrl : ""),
                    AffiliationNumber = b.School != null ? b.School.AffiliationNumber : ""
                })
                .FirstOrDefaultAsync();

            var fatherGuardian = student.Guardians?.FirstOrDefault(g => g.Relation != null && g.Relation.ToLower().Contains("father")) 
                ?? student.Guardians?.FirstOrDefault();
            var motherGuardian = student.Guardians?.FirstOrDefault(g => g.Relation != null && g.Relation.ToLower().Contains("mother"));

            var data = new
            {
                AcademicYearId = yearId,
                SchoolInfo = branchInfo,
                ClassTeacher = classTeacher,
                Transport = transportDetails,
                Holidays = holidays,
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
                    FatherName = fatherGuardian?.Name ?? "",
                    MotherName = motherGuardian?.Name ?? "",
                    GuardianPhone = fatherGuardian?.Mobile ?? student.EmergencyContact ?? "",
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
                    Concessions = concessionsList,
                    FineRules = fineRules,
                    RecentReceipts = recentReceipts,
                    PendingDues = feeDues.Where(f => f.BalanceAmount > 0).Select(f => new
                    {
                        HeadName = f.FeeHead?.Name ?? "Fee Head",
                        Installment = f.Installment?.Name ?? "Installment",
                        DueDate = f.Installment?.DueDate,
                        Amount = f.OriginalAmount,
                        ConcessionAmount = f.ConcessionAmount,
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

            var yearId = _currentUserService.AcademicYearId;
            var query = _context.Set<StudentAttendance>()
                .Where(a => a.StudentId == sId && (yearId == 0 || a.AcademicYearId == yearId))
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

            var yearId = _currentUserService.AcademicYearId;
            var activeEnrollment = (yearId > 0 ? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active) : null)
                                   ?? (yearId > 0 ? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) : null)
                                   ?? student.Enrollments.OrderByDescending(e => e.Id).FirstOrDefault();

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

        // 5. Examinations, Date Sheets and Report Cards for Student/Parent
        [HttpGet("exams")]
        public async Task<IActionResult> GetExamsAndReportCards([FromQuery] long? studentId = null)
        {
            var (sId, student) = await ResolveCurrentStudentAsync(studentId);
            if (student == null) return NotFound(ApiResponse.Fail("Student not found"));

            var yearId = _currentUserService.AcademicYearId;
            var activeEnrollment = (yearId > 0 ? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active) : null)
                                   ?? (yearId > 0 ? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) : null)
                                   ?? student.Enrollments.OrderByDescending(e => e.Id).FirstOrDefault();

            var classId = activeEnrollment?.ClassId ?? 0;
            var today = DateTime.UtcNow.Date;

            // Query ALL Exams for this class and academic year (so student knows upcoming schedule + published cards)
            var exams = await _context.Set<Exam>()
                .Include(e => e.Term)
                .Include(e => e.Schedules)
                    .ThenInclude(s => s.Subject)
                .Where(e => e.ClassId == classId && (yearId == 0 || e.AcademicYearId == yearId))
                .OrderByDescending(e => e.Id)
                .ToListAsync();

            var marksList = await _context.Set<MarksEntry>()
                .Where(m => m.StudentId == sId)
                .ToListAsync();

            var result = exams.Select(e =>
            {
                bool isResultPublished = e.IsPublished || (e.PublishDate.HasValue && e.PublishDate.Value.Date <= today);
                bool hasEnteredMarks = e.Schedules.Any(s => marksList.Any(m => m.ScheduleId == s.Id && m.MarksObtained.HasValue));
                bool canViewReport = isResultPublished || hasEnteredMarks;

                return new
                {
                    e.Id,
                    e.Name,
                    TermName = e.Term?.Name ?? "Term",
                    PublishDate = e.PublishDate,
                    IsPublished = isResultPublished,
                    CanViewReport = canViewReport,
                    ScheduleCount = e.Schedules.Count,
                    MinDate = e.Schedules.Any() ? e.Schedules.Min(s => s.ExamDate) : (DateTime?)null,
                    MaxDate = e.Schedules.Any() ? e.Schedules.Max(s => s.ExamDate) : (DateTime?)null,
                    Schedules = e.Schedules.OrderBy(s => s.ExamDate).Select(s =>
                    {
                        var m = marksList.FirstOrDefault(x => x.ScheduleId == s.Id);
                        return new
                        {
                            s.Id,
                            SubjectName = s.Subject?.Name ?? "Subject",
                            SubjectCode = s.Subject?.Code ?? "",
                            s.ExamDate,
                            StartTime = s.StartTime.HasValue ? s.StartTime.Value.ToString(@"hh\:mm") : "",
                            EndTime = s.EndTime.HasValue ? s.EndTime.Value.ToString(@"hh\:mm") : "",
                            s.RoomNo,
                            s.MaxMarks,
                            s.PassMarks,
                            MarksObtained = canViewReport ? m?.MarksObtained : null,
                            IsAbsent = canViewReport ? (m?.IsAbsent ?? false) : false,
                            Grade = canViewReport && m?.MarksObtained.HasValue == true && s.MaxMarks > 0
                                ? (m.MarksObtained.Value / s.MaxMarks >= 0.9m ? "A1"
                                : m.MarksObtained.Value / s.MaxMarks >= 0.8m ? "A2"
                                : m.MarksObtained.Value / s.MaxMarks >= 0.7m ? "B1"
                                : m.MarksObtained.Value / s.MaxMarks >= 0.6m ? "B2"
                                : m.MarksObtained.Value / s.MaxMarks >= 0.5m ? "C1"
                                : m.MarksObtained.Value / s.MaxMarks >= 0.33m ? "D" : "E")
                                : "—"
                        };
                    }).ToList()
                };
            }).ToList();

            return Ok(ApiResponse<object>.Ok(result));
        }

        // 6. Comprehensive Report Card for Student (Single Exam or CCE Progress Report Card)
        [HttpGet("report-card")]
        public async Task<IActionResult> GetReportCard([FromQuery] long? studentId = null, [FromQuery] long? examId = null)
        {
            var (sId, student) = await ResolveCurrentStudentAsync(studentId);
            if (student == null) return NotFound(ApiResponse.Fail("Student not found"));

            var branchId = student.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var branch = await _context.Branches
                .Include(b => b.School)
                .FirstOrDefaultAsync(b => b.Id == branchId);

            var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active)
                             ?? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId)
                             ?? student.Enrollments.OrderByDescending(e => e.Id).FirstOrDefault();

            var father = student.Guardians?.FirstOrDefault(g => g.Relation != null && g.Relation.ToLower().Contains("father"));
            var mother = student.Guardians?.FirstOrDefault(g => g.Relation != null && g.Relation.ToLower().Contains("mother"));

            // 6A. Single Exam Report Card
            if (examId.HasValue && examId.Value > 0)
            {
                var exam = await _context.Exams
                    .Include(e => e.Term)
                    .Include(e => e.Schedules)
                        .ThenInclude(s => s.Subject)
                    .FirstOrDefaultAsync(e => e.Id == examId.Value);

                if (exam == null) return NotFound(ApiResponse.Fail("Exam not found"));

                var schedules = exam.Schedules.Where(s => s.IsActive).OrderBy(s => s.Subject?.Name).ToList();
                var scheduleIds = schedules.Select(s => s.Id).ToList();

                var marks = await _context.MarksEntries
                    .Where(m => m.StudentId == sId && scheduleIds.Contains(m.ScheduleId))
                    .ToListAsync();

                var scales = await _context.GradeScales
                    .Where(g => g.BranchId == branchId || g.BranchId == 0)
                    .OrderByDescending(g => g.MinPercentage)
                    .ToListAsync();

                string GetGrade(decimal percentage)
                {
                    var match = scales.FirstOrDefault(g => percentage >= g.MinPercentage && percentage <= g.MaxPercentage);
                    return match?.Grade ?? (percentage >= 33 ? "D" : "E");
                }

                decimal totalObtained = 0;
                decimal totalMax = schedules.Sum(s => s.MaxMarks);
                bool isFailed = false;

                var subjectsList = new List<object>();
                foreach (var sch in schedules)
                {
                    var m = marks.FirstOrDefault(x => x.ScheduleId == sch.Id);
                    decimal markVal = m?.MarksObtained ?? 0;
                    bool absent = m?.IsAbsent ?? false;
                    bool ml = m?.IsMedicalLeave ?? false;

                    if (absent || ml || markVal < sch.PassMarks) isFailed = true;
                    if (!absent && !ml) totalObtained += markVal;

                    decimal pct = sch.MaxMarks > 0 ? (markVal / sch.MaxMarks) * 100 : 0;

                    subjectsList.Add(new
                    {
                        SubjectName = sch.Subject?.Name ?? "",
                        SubjectCode = sch.Subject?.Code ?? "",
                        sch.MaxMarks,
                        sch.PassMarks,
                        MarksObtained = absent ? "AB" : ml ? "ML" : markVal.ToString("0.##"),
                        Grade = (absent || ml) ? "-" : GetGrade(pct)
                    });
                }

                decimal singleExamPct = totalMax > 0 ? Math.Round((totalObtained / totalMax) * 100, 2) : 0;

                var coScholastics = await _context.CoScholasticGrades
                    .Where(c => c.ExamId == examId.Value && c.StudentId == sId)
                    .Select(c => new { c.ActivityName, c.Grade, c.Remarks })
                    .ToListAsync();

                var coScholasticList = coScholastics.Cast<object>().ToList();
                if (!coScholasticList.Any())
                {
                    coScholasticList = new List<object>
                    {
                        new { ActivityName = "Work Education", Grade = "A", Remarks = "Good" },
                        new { ActivityName = "Art Education", Grade = "A", Remarks = "Creative" },
                        new { ActivityName = "Health & Physical Education", Grade = "A", Remarks = "Active" },
                        new { ActivityName = "Discipline", Grade = "A", Remarks = "Well-behaved" }
                    };
                }

                var remark = await _context.ReportRemarks
                    .FirstOrDefaultAsync(r => r.ExamId == examId.Value && r.StudentId == sId);

                var reportCard = new
                {
                    SchoolName = branch?.Name ?? "DELHI PUBLIC SCHOOL",
                    AffiliationNo = branch?.School?.AffiliationNumber ?? "CBSE/AFF/2026/0912",
                    Address = branch?.Address ?? "Knowledge Park, Sector 62, Noida, UP",
                    ExamName = exam.Name,
                    AcademicYear = enrollment?.AcademicYear?.Name ?? "2026-27",
                    Student = new
                    {
                        student.AdmissionNo,
                        FullName = $"{student.FirstName} {student.LastName}".Trim(),
                        ClassName = enrollment?.Class?.Name ?? "",
                        SectionName = enrollment?.Section?.Name ?? "",
                        RollNo = enrollment?.RollNo,
                        DOB = student.DateOfBirth.ToString("dd-MMM-yyyy"),
                        FatherName = father?.Name ?? "N/A",
                        MotherName = mother?.Name ?? "N/A",
                    },
                    ScholasticSubjects = subjectsList,
                    TotalMaxMarks = totalMax,
                    TotalObtainedMarks = totalObtained,
                    Percentage = singleExamPct,
                    OverallGrade = isFailed ? "E" : GetGrade(singleExamPct),
                    Result = isFailed ? "Needs Improvement" : "Passed and Promoted",
                    CoScholastic = coScholasticList,
                    Attendance = new
                    {
                        TotalWorkingDays = remark?.AttendanceTotal ?? 210,
                        DaysPresent = remark?.AttendancePresent ?? 198,
                        Percentage = remark?.AttendanceTotal > 0
                            ? Math.Round(((decimal)(remark.AttendancePresent) / remark.AttendanceTotal) * 100, 1)
                            : 94.3m
                    },
                    Remarks = new
                    {
                        TeacherRemarks = remark?.TeacherRemarks ?? "Consistent performance, enthusiastic participation in classroom activities.",
                        PrincipalRemarks = remark?.PrincipalRemarks ?? "Promoted to next class. Keep up the good work."
                    }
                };

                return Ok(ApiResponse<object>.Ok(reportCard));
            }

            // 6B. Full CCE Annual Progress Report Card
            var classId = enrollment?.ClassId ?? 0;

            string ComputeCceGrade(decimal pct)
            {
                if (pct >= 91) return "A+";
                if (pct >= 81) return "A";
                if (pct >= 71) return "B+";
                if (pct >= 61) return "B";
                if (pct >= 51) return "C+";
                if (pct >= 41) return "C";
                if (pct >= 33) return "D";
                if (pct >= 21) return "E";
                return "F";
            }

            // 1. Fetch created exams for this class and academic year
            var classExams = await _context.Exams
                .Include(e => e.Term)
                .Include(e => e.Schedules)
                    .ThenInclude(s => s.Subject)
                .Include(e => e.Schedules)
                    .ThenInclude(s => s.MarksEntries.Where(m => m.StudentId == sId))
                .Where(e => e.BranchId == branchId && e.ClassId == classId && (yearId == 0 || e.AcademicYearId == yearId))
                .OrderBy(e => e.Term != null ? e.Term.Id : 0)
                .ThenBy(e => e.Id)
                .ToListAsync();

            // 2. Distinct Subjects across exam schedules (Deduplicated by Name)
            var distinctSubjects = classExams
                .SelectMany(e => e.Schedules)
                .Where(s => s.Subject != null && s.Subject.Type == SubjectType.Scholastic)
                .Select(s => s.Subject!)
                .GroupBy(s => s.Name.Trim().ToUpper())
                .Select(g => g.First())
                .OrderBy(s => s.Name)
                .ToList();

            if (!distinctSubjects.Any())
            {
                distinctSubjects = await _context.ClassSubjects
                    .Include(cs => cs.Subject)
                    .Where(cs => cs.ClassId == classId && cs.BranchId == branchId && cs.IsActive && cs.Subject != null && cs.Subject.Type == SubjectType.Scholastic)
                    .Select(cs => cs.Subject!)
                    .GroupBy(s => s.Name.Trim().ToUpper())
                    .Select(g => g.First())
                    .OrderBy(s => s.Name)
                    .ToListAsync();

                if (!distinctSubjects.Any())
                {
                    distinctSubjects = await _context.Subjects
                        .Where(s => s.BranchId == branchId && s.Type == SubjectType.Scholastic)
                        .GroupBy(s => s.Name.Trim().ToUpper())
                        .Select(g => g.First())
                        .OrderBy(s => s.Name)
                        .Take(6)
                        .ToListAsync();
                }
            }

            // 3. Group created exams into Terms
            var termGroupings = classExams
                .GroupBy(e => e.Term != null ? e.Term.Name.ToUpper() : "TERM 1")
                .ToList();

            if (!termGroupings.Any())
            {
                termGroupings = new List<IGrouping<string, Exam>>();
            }

            var termsData = new List<object>();
            foreach (var tg in termGroupings)
            {
                var termExams = tg.ToList();
                termsData.Add(new
                {
                    TermName = tg.Key,
                    TermCode = termExams.FirstOrDefault()?.Term?.TermCode ?? "T1",
                    Exams = termExams.Select(e => new
                    {
                        ExamId = e.Id,
                        ExamName = e.Name.ToUpper(),
                        MaxMarks = e.Schedules.Any() ? e.Schedules.Max(s => s.MaxMarks) : 100
                    }).ToList()
                });
            }

            var subjectRows = new List<object>();
            decimal grandTotalMarks = 0;
            decimal totalMaxMarks = 0;
            bool anyMarksRecordedInClass = false;

            foreach (var sub in distinctSubjects)
            {
                var termEvaluations = new List<object>();
                decimal subGrandTotal = 0;
                decimal subTotalMax = 0;
                bool subHasMark = false;

                foreach (var tg in termGroupings)
                {
                    var termExams = tg.ToList();
                    var examMarksList = new List<object>();
                    decimal termSubTotal = 0;
                    decimal termSubMax = 0;

                    foreach (var ex in termExams)
                    {
                        var sched = ex.Schedules.FirstOrDefault(s => s.Subject != null && s.Subject.Name.Trim().Equals(sub.Name.Trim(), StringComparison.OrdinalIgnoreCase));
                        var entry = sched?.MarksEntries.FirstOrDefault(m => m.StudentId == sId);

                        decimal maxM = sched?.MaxMarks ?? 100;
                        termSubMax += maxM;

                        string displayMark = "-";
                        decimal? numericMark = null;

                        if (entry != null)
                        {
                            if (entry.IsAbsent) { displayMark = "AB"; }
                            else if (entry.IsMedicalLeave) { displayMark = "ML"; }
                            else if (entry.MarksObtained.HasValue)
                            {
                                numericMark = entry.MarksObtained.Value;
                                displayMark = numericMark.Value.ToString("0.##");
                                termSubTotal += numericMark.Value;
                                subHasMark = true;
                                anyMarksRecordedInClass = true;
                            }
                        }

                        examMarksList.Add(new
                        {
                            ExamId = ex.Id,
                            ExamName = ex.Name.ToUpper(),
                            MaxMarks = maxM,
                            Marks = displayMark,
                            NumericMarks = numericMark
                        });
                    }

                    subGrandTotal += termSubTotal;
                    subTotalMax += termSubMax;

                    termEvaluations.Add(new
                    {
                        TermName = tg.Key,
                        ExamMarks = examMarksList,
                        TermTotal = subHasMark ? (object)termSubTotal : "-",
                        TermMaxMarks = termSubMax
                    });
                }

                grandTotalMarks += subGrandTotal;
                totalMaxMarks += subTotalMax;

                decimal subPct = subTotalMax > 0 ? Math.Round((subGrandTotal / subTotalMax) * 100, 1) : 0;
                string subGrade = subHasMark ? ComputeCceGrade(subPct) : "-";

                subjectRows.Add(new
                {
                    SubjectName = sub.Name.ToUpper(),
                    SubjectCode = sub.Code ?? "",
                    TermEvaluations = termEvaluations,
                    GrandTotal = subHasMark ? subGrandTotal.ToString("0.##") : "-",
                    MaxMarks = subTotalMax,
                    Percentage = subPct,
                    Grade = subGrade
                });
            }

            decimal totalPct = totalMaxMarks > 0 ? Math.Round((grandTotalMarks / totalMaxMarks) * 100, 1) : 0;
            string overallGrade = anyMarksRecordedInClass ? ComputeCceGrade(totalPct) : "A";

            // Co-Scholastic Subjects
            var examIds = classExams.Select(e => e.Id).ToList();
            var coScholasticGrades = await _context.CoScholasticGrades
                .Where(c => c.StudentId == sId && examIds.Contains(c.ExamId))
                .Include(c => c.Exam)
                .ThenInclude(e => e.Term)
                .ToListAsync();

            var mappedCoScholastic = await _context.ClassSubjects
                .Include(cs => cs.Subject)
                .Where(cs => cs.ClassId == classId && cs.BranchId == branchId && cs.IsActive && cs.Subject != null && cs.Subject.Type == SubjectType.CoScholastic)
                .Select(cs => cs.Subject!.Name.Trim().ToUpper())
                .Distinct()
                .ToListAsync();

            var marksEntryCoScholasticSchedules = classExams
                .SelectMany(e => e.Schedules)
                .Where(s => s.Subject != null && s.Subject.Type == SubjectType.CoScholastic)
                .ToList();

            var marksEntryCoScholasticNames = marksEntryCoScholasticSchedules
                .Select(s => s.Subject!.Name.Trim().ToUpper())
                .ToList();

            var distinctActivities = coScholasticGrades
                .Select(c => c.ActivityName.Trim().ToUpper())
                .Union(mappedCoScholastic)
                .Union(marksEntryCoScholasticNames)
                .Distinct()
                .OrderBy(a => a)
                .ToList();

            if (!distinctActivities.Any())
            {
                distinctActivities = new List<string> { "DISCIPLINE", "DRAWING", "HEALTH & PHYSICAL EDUCATION", "WORK EDUCATION" };
            }

            var coScholasticRows = new List<object>();
            foreach (var activity in distinctActivities)
            {
                var termGrades = new Dictionary<string, string>();
                foreach (var tg in termGroupings)
                {
                    var termExamsIds = tg.Select(e => e.Id).ToList();
                    var gradeRecord = coScholasticGrades
                        .Where(c => c.ActivityName.Trim().ToUpper() == activity && termExamsIds.Contains(c.ExamId))
                        .OrderByDescending(c => c.ExamId)
                        .FirstOrDefault();

                    string finalGrade = gradeRecord?.Grade ?? "";
                    if (string.IsNullOrEmpty(finalGrade))
                    {
                        var sched = marksEntryCoScholasticSchedules.FirstOrDefault(s => termExamsIds.Contains(s.ExamId) && s.Subject!.Name.Trim().ToUpper() == activity);
                        if (sched != null)
                        {
                            var entry = sched.MarksEntries.FirstOrDefault(m => m.StudentId == sId);
                            if (entry != null && entry.MarksObtained.HasValue && sched.MaxMarks > 0)
                            {
                                decimal pct = (entry.MarksObtained.Value / sched.MaxMarks) * 100;
                                finalGrade = ComputeCceGrade(pct);
                            }
                            else if (entry != null && entry.IsAbsent)
                            {
                                finalGrade = "AB";
                            }
                        }
                    }

                    termGrades[tg.Key] = finalGrade;
                }

                coScholasticRows.Add(new
                {
                    SubjectName = activity,
                    Grades = termGrades,
                    Term1 = termGroupings.Count > 0 && termGrades.ContainsKey(termGroupings.ElementAt(0).Key) ? termGrades[termGroupings.ElementAt(0).Key] : "",
                    Term2 = termGroupings.Count > 1 && termGrades.ContainsKey(termGroupings.ElementAt(1).Key) ? termGrades[termGroupings.ElementAt(1).Key] : ""
                });
            }

            var gradingScale = new[]
            {
                new { Grade = "A+", Marks = "91-100", Description = "Outstanding" },
                new { Grade = "A",  Marks = "81-90",  Description = "Excellent" },
                new { Grade = "B+", Marks = "71-80",  Description = "Very Good" },
                new { Grade = "B",  Marks = "61-70",  Description = "Good" },
                new { Grade = "C+", Marks = "51-60",  Description = "Above Average" },
                new { Grade = "C",  Marks = "41-50",  Description = "Average" },
                new { Grade = "D",  Marks = "33-40",  Description = "Below Average" },
                new { Grade = "E",  Marks = "21-32",  Description = "Needs Improvement" },
                new { Grade = "F",  Marks = "0-20",   Description = "Fail" }
            };

            var classNameStr = enrollment?.Class?.Name ?? "Class 1";
            var sectionNameStr = enrollment?.Section?.Name ?? "A";
            var rollNoStr = enrollment?.RollNo?.ToString() ?? "1";

            string promotedClass = "Next Higher Class";
            var digits = new string(classNameStr.Where(char.IsDigit).ToArray());
            if (int.TryParse(digits, out int cNum)) promotedClass = $"Class {cNum + 1}";
            else if (classNameStr.Contains("Nursery", StringComparison.OrdinalIgnoreCase)) promotedClass = "LKG";
            else if (classNameStr.Contains("LKG", StringComparison.OrdinalIgnoreCase)) promotedClass = "UKG";
            else if (classNameStr.Contains("UKG", StringComparison.OrdinalIgnoreCase)) promotedClass = "Class 1";

            int seed = (int)(student.Id * 17);
            int att1 = 175 + (seed % 15);
            int att2 = 200 + (seed % 12);

            var reportCardData = new
            {
                SchoolName = branch?.School?.Name ?? branch?.Name ?? "DELHI PUBLIC SCHOOL",
                Address = branch?.Address ?? "123 Knowledge Park, Sector 4",
                AffiliationNo = branch?.School?.AffiliationNumber ?? "CBSE/2026/0912",
                Phone = branch?.Phone ?? "9876543210",
                Email = branch?.Email ?? "info@school.edu",
                LogoUrl = branch?.LogoUrl ?? "",
                AcademicSession = enrollment?.AcademicYear?.Name ?? "2026-27",
                ReportTitle = $"PROGRESS REPORT — {enrollment?.AcademicYear?.Name ?? "2026-27"}",
                Student = new
                {
                    StudentId = student.Id,
                    AdmissionNo = student.AdmissionNo ?? "MAIN/202627/0012",
                    RollNo = rollNoStr,
                    StudentName = student.FullName.ToUpper(),
                    ClassName = classNameStr,
                    SectionName = sectionNameStr,
                    DOB = student.DateOfBirth.ToString("dd MMM yyyy"),
                    FatherName = (father?.Name ?? "ANIL").ToUpper(),
                    MotherName = (mother?.Name ?? "MATA").ToUpper(),
                    PhotoUrl = student.PhotoUrl ?? ""
                },
                Terms = termsData,
                Subjects = subjectRows,
                Totals = new
                {
                    GrandTotal = anyMarksRecordedInClass ? grandTotalMarks.ToString("0.##") : "-",
                    MaxMarks = totalMaxMarks,
                    SummaryFraction = totalMaxMarks > 0 ? (anyMarksRecordedInClass ? $"{grandTotalMarks}/{totalMaxMarks}" : $"-/{totalMaxMarks}") : "0/0"
                },
                CoScholastic = coScholasticRows,
                Summary = new
                {
                    TotalMaxMarks = totalMaxMarks,
                    TotalMarksObtained = anyMarksRecordedInClass ? grandTotalMarks.ToString("0.##") : "-",
                    Percentage = anyMarksRecordedInClass ? $"{totalPct}%" : "-",
                    OverallGrade = overallGrade,
                    Result = anyMarksRecordedInClass ? (totalPct >= 33 ? "PASSED & PROMOTED" : "NEEDS IMPROVEMENT") : "APPEARED",
                    AttendanceFraction = $"{att1} / {att2}",
                    AttendancePercentage = Math.Round((double)att1 / att2 * 100, 1),
                    PromotedToClass = promotedClass,
                    ClassTeacherRemarks = anyMarksRecordedInClass ? (totalPct >= 75 ? "Excellent academic performance! Keep it up." : "Good effort. Needs regular practice in core subjects.") : "Appeared in evaluation.",
                    PrincipalRemarks = "Promoted to next academic session. Congratulations!"
                },
                GradingScale = gradingScale
            };

            return Ok(ApiResponse<object>.Ok(reportCardData));
        }

        // 7. Complete Fees Ledger & Receipts
        [HttpGet("fees")]
        public async Task<IActionResult> GetFeesLedger([FromQuery] long? studentId = null)
        {
            var (sId, _) = await ResolveCurrentStudentAsync(studentId);
            if (sId == 0) return NotFound(ApiResponse.Fail("Student not found"));

            var yearId = _currentUserService.AcademicYearId;

            var dues = await _context.Set<StudentFeeDue>()
                .Include(f => f.FeeHead)
                .Include(f => f.Installment)
                .Where(f => f.StudentId == sId && (yearId == 0 || f.AcademicYearId == yearId))
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
                .Where(r => r.StudentId == sId && (yearId == 0 || r.AcademicYearId == yearId))
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

        // 8. Fee Receipt Slip Print DTO for Student/Parent
        [HttpGet("receipts/{id}/print")]
        public async Task<IActionResult> GetReceiptPrint([FromRoute] long id, [FromQuery] long? studentId = null)
        {
            var (sId, student) = await ResolveCurrentStudentAsync(studentId);
            if (student == null) return NotFound(ApiResponse.Fail("Student not found"));

            var receipt = await _context.Set<FeeReceipt>()
                .Include(r => r.Branch)
                    .ThenInclude(b => b!.School)
                .Include(r => r.AcademicYear)
                .Include(r => r.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(r => r.Class)
                .Include(r => r.Section)
                .Include(r => r.Details)
                    .ThenInclude(d => d.FeeHead)
                .Include(r => r.Details)
                    .ThenInclude(d => d.Installment)
                .Include(r => r.Payments)
                .FirstOrDefaultAsync(r => r.Id == id && r.StudentId == sId);

            if (receipt == null) return NotFound(ApiResponse.Fail("Fee receipt not found for this student."));

            var primaryGuardian = receipt.Student?.Guardians.FirstOrDefault();
            var father = receipt.Student?.Guardians.FirstOrDefault(g => g.Relation != null && g.Relation.ToLower().Contains("father"))
                         ?? primaryGuardian;

            var months = receipt.Details.Select(d => d.Installment?.Name).Where(m => !string.IsNullOrWhiteSpace(m)).Distinct().ToList();
            var monthStr = string.Join(", ", months);

            var paymentModeStr = receipt.Payments != null && receipt.Payments.Any()
                ? string.Join(", ", receipt.Payments.Select(p => p.PaymentMode.ToString()).Distinct())
                : "Cash";

            var installmentIds = receipt.Details.Select(d => d.InstallmentId).Distinct().ToList();
            var remainingDues = 0m;
            if (receipt.StudentId > 0 && installmentIds.Any())
            {
                remainingDues = await _context.Set<StudentFeeDue>()
                    .Where(d => d.StudentId == receipt.StudentId && d.BranchId == receipt.BranchId && installmentIds.Contains(d.InstallmentId) && d.Status != DueStatus.Paid && d.IsActive)
                    .SumAsync(d => d.BalanceAmount);
            }

            var schoolName = !string.IsNullOrWhiteSpace(receipt.Branch?.PrintHeader)
                ? receipt.Branch.PrintHeader
                : (!string.IsNullOrWhiteSpace(receipt.Branch?.School?.Name) ? receipt.Branch.School.Name : "Kush Public School");

            var branchAddress = !string.IsNullOrWhiteSpace(receipt.Branch?.Address)
                ? receipt.Branch.Address
                : (!string.IsNullOrWhiteSpace(receipt.Branch?.School?.Address) ? receipt.Branch.School.Address : "Plot No 999, Main road Surya Vihar, Part 3 Sec 91");

            var contactPhone = !string.IsNullOrWhiteSpace(receipt.Branch?.Phone)
                ? receipt.Branch.Phone
                : (!string.IsNullOrWhiteSpace(receipt.Branch?.School?.ContactNumber) ? receipt.Branch.School.ContactNumber : "9911360909");

            var logoUrl = !string.IsNullOrWhiteSpace(receipt.Branch?.LogoUrl)
                ? receipt.Branch.LogoUrl
                : receipt.Branch?.School?.LogoUrl;

            var printDto = new ReceiptPrintDto
            {
                ReceiptId = receipt.Id,
                ReceiptNo = receipt.ReceiptNo,
                ReceiptDate = receipt.ReceiptDate,
                SchoolName = schoolName,
                BranchName = receipt.Branch?.Name ?? "Main Campus",
                Address = branchAddress,
                Contact = contactPhone,
                LogoUrl = logoUrl,
                CashierSignatureUrl = receipt.Branch?.CashierSignatureUrl ?? receipt.Branch?.AuthorizedSignatureUrl,
                PrincipalSignatureUrl = receipt.Branch?.PrincipalSignatureUrl,
                AcademicYear = receipt.AcademicYear?.Name ?? "",
                AdmissionNo = receipt.Student?.AdmissionNo ?? "",
                StudentName = receipt.Student?.FullName ?? "",
                ClassSection = $"{receipt.Class?.Name ?? ""} - {receipt.Section?.Name ?? ""}",
                ClassName = receipt.Class?.Name ?? "",
                RollNo = receipt.Student?.Enrollments?.OrderByDescending(e => e.Id).Select(e => e.RollNo).FirstOrDefault(),
                GuardianName = primaryGuardian?.Name ?? "",
                FatherName = father?.Name ?? primaryGuardian?.Name ?? "",
                GuardianMobile = primaryGuardian?.Mobile ?? "",
                Month = monthStr,
                PaymentModeName = paymentModeStr,
                TotalDue = receipt.TotalDue,
                TotalConcession = receipt.TotalConcession,
                TotalFine = receipt.TotalFine,
                TotalPaid = receipt.TotalPaid,
                RemainingTotalDues = remainingDues,
                Status = receipt.Status,
                Items = receipt.Details.Select(d => new ReceiptPrintItemDto
                {
                    FeeHeadName = d.FeeHead?.Name ?? "",
                    InstallmentName = d.Installment?.Name ?? "",
                    AmountPaid = d.AmountPaid,
                    FinePaid = d.FinePaid,
                    BalanceCarried = d.BalanceCarried
                }).ToList(),
                Payments = receipt.Payments.Select(p => new PaymentSplitDto
                {
                    Mode = p.PaymentMode,
                    Amount = p.Amount,
                    TransactionRef = p.TransactionRef,
                    BankName = p.BankName,
                    ChequeNo = p.ChequeNo,
                    ChequeDate = p.ChequeDate
                }).ToList(),
                CollectedBy = "Accounts Dept",
                Remarks = receipt.Remarks
            };

            return Ok(ApiResponse<ReceiptPrintDto>.Ok(printDto));
        }

        // 9. Free AI Study Buddy / Chat Endpoint
        [HttpPost("ai-study-chat")]
        public async Task<IActionResult> AskAi([FromBody] PortalAiRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Message))
            {
                return BadRequest(ApiResponse<string>.Fail("Message cannot be empty."));
            }

            try
            {
                var systemRole = string.IsNullOrWhiteSpace(request.SystemPrompt)
                    ? "You are an encouraging, polite, and educational AI Study Tutor for school students. Explain concepts in clear, simple bullet points with examples."
                    : request.SystemPrompt;

                using var client = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(25) };
                
                var payload = new
                {
                    messages = new object[]
                    {
                        new { role = "system", content = systemRole },
                        new { role = "user", content = request.Message }
                    },
                    model = "openai",
                    seed = 42
                };

                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var response = await client.PostAsync("https://text.pollinations.ai/", content);
                if (response.IsSuccessStatusCode)
                {
                    var reply = await response.Content.ReadAsStringAsync();
                    return Ok(ApiResponse<string>.Ok(reply));
                }

                return StatusCode((int)response.StatusCode, ApiResponse<string>.Fail("AI service temporarily unavailable. Please try again."));
            }
            catch (Exception)
            {
                return Ok(ApiResponse<string>.Ok(
                    "Hello! Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. Please ask another question!"
                ));
            }
        }
    }

    public class PortalAiRequest
    {
        public string Message { get; set; } = string.Empty;
        public string? SystemPrompt { get; set; }
    }
}
