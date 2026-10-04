using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class ExamTerm : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string TermCode { get; set; } = string.Empty;
        public decimal Weightage { get; set; } = 100;
        public string? Description { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ICollection<Exam> Exams { get; set; } = new List<Exam>();
    }

    public class Exam : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long TermId { get; set; }
        public long ClassId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPublished { get; set; } = false;
        public bool IsLocked { get; set; } = false;

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ExamTerm? Term { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual ICollection<ExamSchedule> Schedules { get; set; } = new List<ExamSchedule>();
    }

    public class ExamSchedule : BaseEntity
    {
        public long ExamId { get; set; }
        public long SubjectId { get; set; }
        public DateTime ExamDate { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public decimal MaxMarks { get; set; } = 100;
        public decimal PassMarks { get; set; } = 33;
        public string? RoomNo { get; set; }

        // Navigation
        public virtual Exam? Exam { get; set; }
        public virtual Subject? Subject { get; set; }
        public virtual ICollection<MarksEntry> MarksEntries { get; set; } = new List<MarksEntry>();
    }

    public class GradeScale : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = "CBSE 8-Point";
        public decimal MinPercentage { get; set; }
        public decimal MaxPercentage { get; set; }
        public string Grade { get; set; } = string.Empty; // A1, A2, B1, B2, C1, C2, D, E
        public decimal GradePoint { get; set; }
        public string? Remarks { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
    }

    public class MarksEntry : BaseEntity
    {
        public long ScheduleId { get; set; }
        public long StudentId { get; set; }
        public decimal? MarksObtained { get; set; }
        public bool IsAbsent { get; set; } = false; // AB
        public bool IsMedicalLeave { get; set; } = false; // ML
        public string? Remarks { get; set; }
        public bool IsLocked { get; set; } = false;

        // Navigation
        public virtual ExamSchedule? Schedule { get; set; }
        public virtual Student? Student { get; set; }
    }

    public class CoScholasticGrade : BaseEntity
    {
        public long ExamId { get; set; }
        public long StudentId { get; set; }
        public string ActivityName { get; set; } = string.Empty; // e.g. Work Education, Art Education, Health & Physical Education, Discipline
        public string Grade { get; set; } = "A"; // A, B, C
        public string? Remarks { get; set; }

        // Navigation
        public virtual Exam? Exam { get; set; }
        public virtual Student? Student { get; set; }
    }

    public class ReportRemark : BaseEntity
    {
        public long ExamId { get; set; }
        public long StudentId { get; set; }
        public int AttendanceTotal { get; set; } = 0;
        public int AttendancePresent { get; set; } = 0;
        public string? TeacherRemarks { get; set; }
        public string? PrincipalRemarks { get; set; }

        // Navigation
        public virtual Exam? Exam { get; set; }
        public virtual Student? Student { get; set; }
    }
}
