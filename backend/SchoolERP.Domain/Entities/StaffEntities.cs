using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class Employee : BaseEntity
    {
        public long BranchId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();

        public long? DepartmentId { get; set; }
        public long? DesignationId { get; set; }
        public DateTime JoiningDate { get; set; }
        public DateTime? RelievingDate { get; set; }
        public string? ExitReason { get; set; }

        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Gender { get; set; } = "Male";
        public DateTime? DateOfBirth { get; set; }

        public string? Qualification { get; set; }
        public int? ExperienceYears { get; set; }
        public string? PanNo { get; set; }
        public string? AadhaarNo { get; set; }

        // Bank / Payroll
        public string? BankName { get; set; }
        public string? AccountNo { get; set; }
        public string? IfscCode { get; set; }
        public decimal? SalaryBasic { get; set; }

        public string? PhotoUrl { get; set; }
        public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
        public long? UserId { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual SimpleMaster? Department { get; set; }
        public virtual SimpleMaster? Designation { get; set; }
        public virtual User? User { get; set; }
        public virtual ICollection<TeacherAllocation> Allocations { get; set; } = new List<TeacherAllocation>();
    }

    public class TeacherAllocation : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long EmployeeId { get; set; }
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public long? SubjectId { get; set; }
        public bool IsClassTeacher { get; set; }

        // Navigation
        public virtual Employee? Employee { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual Section? Section { get; set; }
        public virtual Subject? Subject { get; set; }
    }
}
