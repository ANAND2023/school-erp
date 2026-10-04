using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DashboardController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("stats")]
        public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> GetDashboardStats([FromQuery] long? academicYearId = null)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = academicYearId.HasValue && academicYearId.Value > 0
                ? academicYearId.Value
                : _currentUserService.AcademicYearId;

            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == yearId);
            var academicYearName = academicYear?.Name ?? "2026-27";

            // 1. Students Count for this Academic Year
            var enrolledStudentIds = await _context.StudentEnrollments
                .Where(e => e.AcademicYearId == yearId)
                .Select(e => e.StudentId)
                .ToListAsync();

            var totalStudents = enrolledStudentIds.Count > 0
                ? enrolledStudentIds.Distinct().Count()
                : await _context.Students.CountAsync(s => s.BranchId == branchId);

            var activeStudents = enrolledStudentIds.Count > 0
                ? await _context.Students.CountAsync(s => s.BranchId == branchId && enrolledStudentIds.Contains(s.Id) && s.Status == StudentStatus.Active)
                : await _context.Students.CountAsync(s => s.BranchId == branchId && s.Status == StudentStatus.Active);

            // 2. Staff Count
            var totalStaff = await _context.Employees
                .CountAsync(e => e.BranchId == branchId);

            var activeStaff = await _context.Employees
                .CountAsync(e => e.BranchId == branchId && e.Status == EmployeeStatus.Active);

            // 3. Classes and Sections
            var totalClasses = await _context.Classes
                .CountAsync(c => c.BranchId == branchId);

            var totalSections = await _context.Sections
                .CountAsync(s => s.Class != null && s.Class.BranchId == branchId);

            // 4. Today's Student Attendance
            var today = DateTime.UtcNow.Date;
            var todayAttendances = await _context.StudentAttendances
                .Where(a => a.BranchId == branchId && a.AttendanceDate.Date == today)
                .ToListAsync();

            var totalMarked = todayAttendances.Count;
            var presentCount = todayAttendances.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late);
            var absentCount = todayAttendances.Count(a => a.Status == AttendanceStatus.Absent);
            var halfDayCount = todayAttendances.Count(a => a.Status == AttendanceStatus.HalfDay);
            var leaveCount = todayAttendances.Count(a => a.Status == AttendanceStatus.Leave);
            var attendancePercentage = totalMarked > 0 ? Math.Round((double)presentCount / totalMarked * 100, 1) : 0.0;

            // 5. Fee Summary for Academic Year
            var totalCollected = await _context.FeeReceipts
                .Where(r => r.BranchId == branchId && r.AcademicYearId == yearId && r.Status != ReceiptStatus.Cancelled)
                .SumAsync(r => (decimal?)r.TotalPaid) ?? 0m;

            var totalPending = await _context.StudentFeeDues
                .Where(d => d.BranchId == branchId && d.AcademicYearId == yearId && d.Status != DueStatus.Paid)
                .SumAsync(d => (decimal?)d.BalanceAmount) ?? 0m;

            // 6. Enquiries Summary for this Academic Year
            var totalEnquiries = await _context.Enquiries
                .CountAsync(e => e.BranchId == branchId && e.AcademicYearId == yearId);

            var convertedEnquiries = await _context.Enquiries
                .CountAsync(e => e.BranchId == branchId && e.AcademicYearId == yearId && e.Status == EnquiryStatus.Converted);

            var openEnquiries = await _context.Enquiries
                .CountAsync(e => e.BranchId == branchId && e.AcademicYearId == yearId && e.Status != EnquiryStatus.Converted && e.Status != EnquiryStatus.Closed);

            // 7. Recent Admissions (Top 5)
            var recentStudentsQuery = _context.Students
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .Where(s => s.BranchId == branchId);

            if (enrolledStudentIds.Count > 0)
            {
                recentStudentsQuery = recentStudentsQuery.Where(s => enrolledStudentIds.Contains(s.Id));
            }

            var recentStudents = await recentStudentsQuery
                .OrderByDescending(s => s.Id)
                .Take(5)
                .ToListAsync();

            var recentAdmissions = recentStudents.Select(s =>
            {
                var enr = s.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) ?? s.Enrollments.LastOrDefault();
                return new RecentAdmissionDto
                {
                    Id = s.Id,
                    FullName = s.FullName,
                    AdmissionNo = s.AdmissionNo,
                    ClassName = enr?.Class?.Name ?? "—",
                    SectionName = enr?.Section?.Name ?? "—",
                    AdmissionDate = s.AdmissionDate,
                    Status = s.Status,
                    PhotoUrl = s.PhotoUrl
                };
            }).ToList();

            // 8. Recent Fee Receipts (Top 5)
            var recentReceiptsList = await _context.FeeReceipts
                .Include(r => r.Student)
                .Include(r => r.Payments)
                .Where(r => r.BranchId == branchId && r.AcademicYearId == yearId)
                .OrderByDescending(r => r.Id)
                .Take(5)
                .ToListAsync();

            var classIds = recentReceiptsList.Select(r => r.ClassId).Distinct().ToList();
            var classNames = await _context.Classes
                .Where(c => classIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name);

            var recentFeeReceipts = recentReceiptsList.Select(r => new RecentFeeReceiptDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                StudentName = r.Student?.FullName ?? "—",
                ClassName = classNames.ContainsKey(r.ClassId) ? classNames[r.ClassId] : "—",
                Amount = r.TotalPaid,
                PaymentMode = r.Payments.FirstOrDefault()?.PaymentMode.ToString() ?? "Cash",
                ReceiptDate = r.ReceiptDate
            }).ToList();

            // 9. Class-wise Enrollment
            var classesList = await _context.Classes
                .Include(c => c.Sections)
                .Where(c => c.BranchId == branchId)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            var enrollmentCounts = await _context.StudentEnrollments
                .Where(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active)
                .GroupBy(e => e.ClassId)
                .Select(g => new { ClassId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.ClassId, g => g.Count);

            var classWiseEnrollment = classesList.Select(c => new ClassEnrollmentDto
            {
                ClassId = c.Id,
                ClassName = c.Name,
                StudentCount = enrollmentCounts.ContainsKey(c.Id) ? enrollmentCounts[c.Id] : 0,
                Capacity = c.Sections.Sum(s => s.Capacity)
            }).ToList();

            // 10. Monthly Fee Collection Trends (Past 6 Months)
            var allReceipts = await _context.FeeReceipts
                .Where(r => r.BranchId == branchId && r.AcademicYearId == yearId && r.Status != ReceiptStatus.Cancelled)
                .ToListAsync();

            var monthlyTrends = new List<MonthlyTrendDto>();
            for (int i = 5; i >= 0; i--)
            {
                var dt = DateTime.UtcNow.AddMonths(-i);
                var monthName = dt.ToString("MMM yyyy");
                var receiptsInMonth = allReceipts.Where(r => r.ReceiptDate.Year == dt.Year && r.ReceiptDate.Month == dt.Month).ToList();
                monthlyTrends.Add(new MonthlyTrendDto
                {
                    Month = monthName,
                    CollectedAmount = receiptsInMonth.Sum(r => r.TotalPaid),
                    ReceiptCount = receiptsInMonth.Count
                });
            }

            // 11. Student Gender Distribution
            var allActiveStudents = await _context.Students
                .Where(s => s.BranchId == branchId && (enrolledStudentIds.Contains(s.Id) || enrolledStudentIds.Count == 0) && s.Status == StudentStatus.Active)
                .ToListAsync();

            var maleCount = allActiveStudents.Count(s => s.Gender != null && (s.Gender.ToLower().StartsWith("m")));
            var femaleCount = allActiveStudents.Count(s => s.Gender != null && (s.Gender.ToLower().StartsWith("f")));
            var otherCount = Math.Max(0, allActiveStudents.Count - maleCount - femaleCount);

            var result = new DashboardSummaryDto
            {
                AcademicYearId = yearId,
                AcademicYearName = academicYearName,
                TotalStudents = totalStudents,
                ActiveStudents = activeStudents,
                TotalStaff = totalStaff,
                ActiveStaff = activeStaff,
                TotalClasses = totalClasses,
                TotalSections = totalSections,
                TodayAttendance = new TodayAttendanceDto
                {
                    TotalMarked = totalMarked,
                    Present = presentCount,
                    Absent = absentCount,
                    HalfDay = halfDayCount,
                    Leave = leaveCount,
                    Percentage = attendancePercentage
                },
                FeeSummary = new FeeSummaryDto
                {
                    TotalCollected = totalCollected,
                    TotalPending = totalPending,
                    TotalFeeDue = totalCollected + totalPending
                },
                Enquiries = new EnquirySummaryDto
                {
                    Total = totalEnquiries,
                    Converted = convertedEnquiries,
                    Open = openEnquiries
                },
                RecentAdmissions = recentAdmissions,
                RecentFeeReceipts = recentFeeReceipts,
                ClassWiseEnrollment = classWiseEnrollment,
                MonthlyFeeCollection = monthlyTrends,
                GenderDistribution = new GenderRatioDto
                {
                    Male = maleCount,
                    Female = femaleCount,
                    Other = otherCount
                }
            };

            return Ok(ApiResponse<DashboardSummaryDto>.Ok(result));
        }
    }
}
