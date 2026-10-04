using System;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class Holiday : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public DateTime HolidayDate { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
    }

    public class StudentAttendance : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public long StudentId { get; set; }
        public long EnrollmentId { get; set; }
        public DateTime AttendanceDate { get; set; }
        public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
        public string? Remarks { get; set; }
        public long? MarkedBy { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual Section? Section { get; set; }
        public virtual Student? Student { get; set; }
        public virtual StudentEnrollment? Enrollment { get; set; }
    }

    public class StaffAttendance : BaseEntity
    {
        public long BranchId { get; set; }
        public long EmployeeId { get; set; }
        public DateTime AttendanceDate { get; set; }
        public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
        public TimeSpan? InTime { get; set; }
        public TimeSpan? OutTime { get; set; }
        public string? Remarks { get; set; }
        public long? MarkedBy { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual Employee? Employee { get; set; }
    }

    public class LeaveRequest : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string ApplicantType { get; set; } = "Employee"; // "Employee" or "Student"
        public long? EmployeeId { get; set; }
        public long? StudentId { get; set; }
        public LeaveType LeaveType { get; set; } = LeaveType.Casual;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalDays { get; set; }
        public string Reason { get; set; } = string.Empty;
        public LeaveStatus Status { get; set; } = LeaveStatus.Pending;
        public long? ActionByUserId { get; set; }
        public DateTime? ActionDate { get; set; }
        public string? ActionRemarks { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual Employee? Employee { get; set; }
        public virtual Student? Student { get; set; }
    }

    public class PeriodMaster : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public int PeriodNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public bool IsBreak { get; set; } = false;
        public int DisplayOrder { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
    }

    public class TimetableEntry : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public TimetableDay DayOfWeek { get; set; }
        public long PeriodId { get; set; }
        public long? SubjectId { get; set; }
        public long? EmployeeId { get; set; }
        public string? RoomNo { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual Section? Section { get; set; }
        public virtual PeriodMaster? Period { get; set; }
        public virtual Subject? Subject { get; set; }
        public virtual Employee? Employee { get; set; }
    }

    public class Substitution : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public DateTime SubstitutionDate { get; set; }
        public long PeriodId { get; set; }
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public long? SubjectId { get; set; }
        public long OriginalEmployeeId { get; set; }
        public long SubstituteEmployeeId { get; set; }
        public string? Remarks { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual PeriodMaster? Period { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual Section? Section { get; set; }
        public virtual Subject? Subject { get; set; }
        public virtual Employee? OriginalEmployee { get; set; }
        public virtual Employee? SubstituteEmployee { get; set; }
    }
}
