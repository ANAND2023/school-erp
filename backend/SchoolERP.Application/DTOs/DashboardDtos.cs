using System;
using System.Collections.Generic;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.DTOs
{
    public class DashboardSummaryDto
    {
        public long AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int ActiveStudents { get; set; }
        public int TotalStaff { get; set; }
        public int ActiveStaff { get; set; }
        public int TotalClasses { get; set; }
        public int TotalSections { get; set; }
        public TodayAttendanceDto TodayAttendance { get; set; } = new TodayAttendanceDto();
        public FeeSummaryDto FeeSummary { get; set; } = new FeeSummaryDto();
        public EnquirySummaryDto Enquiries { get; set; } = new EnquirySummaryDto();
        public List<RecentAdmissionDto> RecentAdmissions { get; set; } = new List<RecentAdmissionDto>();
        public List<RecentFeeReceiptDto> RecentFeeReceipts { get; set; } = new List<RecentFeeReceiptDto>();
        public List<ClassEnrollmentDto> ClassWiseEnrollment { get; set; } = new List<ClassEnrollmentDto>();
        public List<MonthlyTrendDto> MonthlyFeeCollection { get; set; } = new List<MonthlyTrendDto>();
        public GenderRatioDto GenderDistribution { get; set; } = new GenderRatioDto();
    }

    public class MonthlyTrendDto
    {
        public string Month { get; set; } = string.Empty;
        public decimal CollectedAmount { get; set; }
        public int ReceiptCount { get; set; }
    }

    public class GenderRatioDto
    {
        public int Male { get; set; }
        public int Female { get; set; }
        public int Other { get; set; }
    }

    public class TodayAttendanceDto
    {
        public int TotalMarked { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public int HalfDay { get; set; }
        public int Leave { get; set; }
        public double Percentage { get; set; }
    }

    public class FeeSummaryDto
    {
        public decimal TotalCollected { get; set; }
        public decimal TotalPending { get; set; }
        public decimal TotalFeeDue { get; set; }
    }

    public class EnquirySummaryDto
    {
        public int Total { get; set; }
        public int Converted { get; set; }
        public int Open { get; set; }
    }

    public class RecentAdmissionDto
    {
        public long Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public DateTime AdmissionDate { get; set; }
        public StudentStatus Status { get; set; }
        public string? PhotoUrl { get; set; }
    }

    public class RecentFeeReceiptDto
    {
        public long Id { get; set; }
        public string ReceiptNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public DateTime ReceiptDate { get; set; }
    }

    public class ClassEnrollmentDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int StudentCount { get; set; }
        public int Capacity { get; set; }
    }
}
