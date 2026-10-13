using System;
using System.Collections.Generic;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.DTOs
{
    // --- 1. Holiday DTOs ---
    public class HolidayDto
    {
        public long Id { get; set; }
        public long AcademicYearId { get; set; }
        public DateTime HolidayDate { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class CreateHolidayDto
    {
        public DateTime HolidayDate { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    // --- 2. Student Attendance DTOs ---
    public class StudentAttendanceItemDto
    {
        public long StudentId { get; set; }
        public long EnrollmentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Gender { get; set; } = "Male";
        public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
        public string? Remarks { get; set; }
        public string? Mobile { get; set; }
        public string? GuardianName { get; set; }
    }

    public class StudentAttendanceSheetDto
    {
        public long SectionId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public bool IsHoliday { get; set; }
        public string? HolidayName { get; set; }
        public bool IsSunday { get; set; }
        public bool IsEditable { get; set; } = true;
        public bool AlreadyMarked { get; set; } = false;
        public List<StudentAttendanceItemDto> Students { get; set; } = new List<StudentAttendanceItemDto>();
    }

    public class BulkStudentAttendanceDto
    {
        public long SectionId { get; set; }
        public DateTime Date { get; set; }
        public List<StudentAttendanceEntryDto> Attendances { get; set; } = new List<StudentAttendanceEntryDto>();
    }

    public class StudentAttendanceEntryDto
    {
        public long StudentId { get; set; }
        public long EnrollmentId { get; set; }
        public AttendanceStatus Status { get; set; }
        public string? Remarks { get; set; }
    }

    public class AbsenteeTodayDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public AttendanceStatus Status { get; set; }
        public string? Remarks { get; set; }
    }

    public class StudentMonthlyRegisterRowDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string FullName { get; set; } = string.Empty;
        public Dictionary<int, string> DailyStatus { get; set; } = new Dictionary<int, string>();
        public decimal TotalPresent { get; set; }
        public decimal TotalAbsent { get; set; }
        public decimal TotalLeave { get; set; }
        public decimal TotalHalfDay { get; set; }
        public decimal TotalLate { get; set; }
        public decimal TotalWorkingDays { get; set; }
        public decimal AttendancePercentage { get; set; }
    }

    public class MonthlyAttendanceRegisterDto
    {
        public long SectionId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public int DaysInMonth { get; set; }
        public List<int> HolidayDays { get; set; } = new List<int>();
        public List<int> SundayDays { get; set; } = new List<int>();
        public List<StudentMonthlyRegisterRowDto> Rows { get; set; } = new List<StudentMonthlyRegisterRowDto>();
    }

    // --- 3. Staff Attendance DTOs ---
    public class StaffAttendanceItemDto
    {
        public long EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string DesignationName { get; set; } = string.Empty;
        public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
        public string? InTime { get; set; }
        public string? OutTime { get; set; }
        public string? Remarks { get; set; }
    }

    public class StaffAttendanceSheetDto
    {
        public DateTime Date { get; set; }
        public bool IsHoliday { get; set; }
        public string? HolidayName { get; set; }
        public bool IsSunday { get; set; }
        public bool AlreadyMarked { get; set; } = false;
        public List<StaffAttendanceItemDto> Staff { get; set; } = new List<StaffAttendanceItemDto>();
    }

    public class BulkStaffAttendanceDto
    {
        public DateTime Date { get; set; }
        public List<StaffAttendanceEntryDto> Attendances { get; set; } = new List<StaffAttendanceEntryDto>();
    }

    public class StaffAttendanceEntryDto
    {
        public long EmployeeId { get; set; }
        public AttendanceStatus Status { get; set; }
        public string? InTime { get; set; }
        public string? OutTime { get; set; }
        public string? Remarks { get; set; }
    }

    public class StaffMonthlyRegisterRowDto
    {
        public long EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public Dictionary<int, string> DailyStatus { get; set; } = new Dictionary<int, string>();
        public decimal TotalPresent { get; set; }
        public decimal TotalAbsent { get; set; }
        public decimal TotalLeave { get; set; }
        public decimal TotalHalfDay { get; set; }
        public decimal TotalWorkingDays { get; set; }
        public decimal AttendancePercentage { get; set; }
    }

    public class StaffMonthlyRegisterDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public int DaysInMonth { get; set; }
        public List<int> HolidayDays { get; set; } = new List<int>();
        public List<int> SundayDays { get; set; } = new List<int>();
        public List<StaffMonthlyRegisterRowDto> Rows { get; set; } = new List<StaffMonthlyRegisterRowDto>();
    }

    // --- 4. Leave Request DTOs ---
    public class LeaveRequestDto
    {
        public long Id { get; set; }
        public string ApplicantType { get; set; } = "Employee";
        public long? EmployeeId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? EmployeeName { get; set; }
        public string? DepartmentName { get; set; }
        public long? StudentId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? StudentName { get; set; }
        public string? ClassSection { get; set; }
        public LeaveType LeaveType { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalDays { get; set; }
        public string Reason { get; set; } = string.Empty;
        public LeaveStatus Status { get; set; }
        public string? ActionRemarks { get; set; }
        public DateTime? ActionDate { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class ApplyLeaveDto
    {
        public string ApplicantType { get; set; } = "Employee"; // "Employee" or "Student"
        public long? EmployeeId { get; set; }
        public long? StudentId { get; set; }
        public LeaveType LeaveType { get; set; } = LeaveType.Casual;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class ActionLeaveDto
    {
        public LeaveStatus Status { get; set; } // Approved or Rejected
        public string? ActionRemarks { get; set; }
    }

    // --- 5. Period Master DTOs ---
    public class PeriodDto
    {
        public long Id { get; set; }
        public int PeriodNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty; // "HH:mm"
        public string EndTime { get; set; } = string.Empty;   // "HH:mm"
        public bool IsBreak { get; set; }
        public bool IsBellEnabled { get; set; }
        public bool IsDismissalBell { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class CreatePeriodDto
    {
        public int PeriodNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string StartTime { get; set; } = "08:30";
        public string EndTime { get; set; } = "09:15";
        public bool IsBreak { get; set; } = false;
        public bool IsBellEnabled { get; set; } = false;
        public bool IsDismissalBell { get; set; } = false;
        public int DisplayOrder { get; set; } = 0;
    }

    // --- 6. Timetable DTOs ---
    public class TimetableSlotDto
    {
        public long? Id { get; set; }
        public TimetableDay DayOfWeek { get; set; }
        public long PeriodId { get; set; }
        public int PeriodNumber { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public bool IsBreak { get; set; }
        public long? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public long? EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public string? RoomNo { get; set; }
    }

    public class SectionTimetableDto
    {
        public long SectionId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public List<PeriodDto> Periods { get; set; } = new List<PeriodDto>();
        public List<TimetableSlotDto> Slots { get; set; } = new List<TimetableSlotDto>();
    }

    public class SaveTimetableSlotDto
    {
        public long SectionId { get; set; }
        public TimetableDay DayOfWeek { get; set; }
        public long PeriodId { get; set; }
        public long? SubjectId { get; set; }
        public long? EmployeeId { get; set; }
        public string? RoomNo { get; set; }
    }

    public class TeacherTimetableSlotDto
    {
        public TimetableDay DayOfWeek { get; set; }
        public long PeriodId { get; set; }
        public int PeriodNumber { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public string TimeRange { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? RoomNo { get; set; }
    }

    public class TeacherTimetableDto
    {
        public long EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public List<PeriodDto> Periods { get; set; } = new List<PeriodDto>();
        public List<TeacherTimetableSlotDto> Slots { get; set; } = new List<TeacherTimetableSlotDto>();
    }

    // --- 7. Substitution DTOs ---
    public class SubstitutionDto
    {
        public long Id { get; set; }
        public DateTime SubstitutionDate { get; set; }
        public long PeriodId { get; set; }
        public int PeriodNumber { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public string TimeRange { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public long OriginalEmployeeId { get; set; }
        public string OriginalEmployeeName { get; set; } = string.Empty;
        public long SubstituteEmployeeId { get; set; }
        public string SubstituteEmployeeName { get; set; } = string.Empty;
        public string? Remarks { get; set; }
    }

    public class CreateSubstitutionDto
    {
        public DateTime SubstitutionDate { get; set; }
        public long PeriodId { get; set; }
        public long SectionId { get; set; }
        public long? SubjectId { get; set; }
        public long OriginalEmployeeId { get; set; }
        public long SubstituteEmployeeId { get; set; }
        public string? Remarks { get; set; }
    }

    public class FreeTeacherOptionDto
    {
        public long EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
    }
}
