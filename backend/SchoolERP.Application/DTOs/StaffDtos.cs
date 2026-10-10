using System;
using System.Collections.Generic;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.DTOs
{
    public class EmployeeListDto
    {
        public long Id { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public string? DesignationName { get; set; }
        public DateTime JoiningDate { get; set; }
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Gender { get; set; } = string.Empty;
        public EmployeeStatus Status { get; set; }
        public string? PhotoUrl { get; set; }
        public bool HasUserAccount { get; set; }
        public int AllocationsCount { get; set; }
    }

    public class EmployeeDetailDto
    {
        public long Id { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();

        public long? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public long? DesignationId { get; set; }
        public string? DesignationName { get; set; }
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

        public string? BankName { get; set; }
        public string? AccountNo { get; set; }
        public string? IfscCode { get; set; }
        public decimal? SalaryBasic { get; set; }

        public string? PhotoUrl { get; set; }
        public EmployeeStatus Status { get; set; }
        public long? UserId { get; set; }
        public string? Username { get; set; }

        public List<TeacherAllocationSummaryDto> Allocations { get; set; } = new List<TeacherAllocationSummaryDto>();
    }

    public class CreateEmployeeDto
    {
        public string? EmployeeCode { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;

        public long? DepartmentId { get; set; }
        public long? DesignationId { get; set; }
        public DateTime JoiningDate { get; set; }

        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Gender { get; set; } = "Male";
        public DateTime? DateOfBirth { get; set; }

        public string? Qualification { get; set; }
        public int? ExperienceYears { get; set; }
        public string? PanNo { get; set; }
        public string? AadhaarNo { get; set; }

        public string? BankName { get; set; }
        public string? AccountNo { get; set; }
        public string? IfscCode { get; set; }
        public decimal? SalaryBasic { get; set; }
        public string? PhotoUrl { get; set; }

        // FR-4.2: Option to auto-create user login
        public bool AutoCreateUser { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; }
        public long? RoleId { get; set; }
    }

    public class UpdateEmployeeDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;

        public long? DepartmentId { get; set; }
        public long? DesignationId { get; set; }
        public DateTime JoiningDate { get; set; }

        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Gender { get; set; } = "Male";
        public DateTime? DateOfBirth { get; set; }

        public string? Qualification { get; set; }
        public int? ExperienceYears { get; set; }
        public string? PanNo { get; set; }
        public string? AadhaarNo { get; set; }

        public string? BankName { get; set; }
        public string? AccountNo { get; set; }
        public string? IfscCode { get; set; }
        public decimal? SalaryBasic { get; set; }
        public string? PhotoUrl { get; set; }
        public EmployeeStatus Status { get; set; } = EmployeeStatus.Active; public bool AutoCreateUser { get; set; } = false; public string? Username { get; set; } public string? Password { get; set; } public long? RoleId { get; set; }
    }

    public class EmployeeExitDto
    {
        public DateTime RelievingDate { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class TeacherAllocationSummaryDto
    {
        public long Id { get; set; }
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public long? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public bool IsClassTeacher { get; set; }
    }

    public class ClassTeacherGridRowDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public long? AllocationId { get; set; }
        public long? EmployeeId { get; set; }
        public string? TeacherName { get; set; }
        public string? TeacherCode { get; set; }
    }

    public class SubjectTeacherGridRowDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public long SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public SubjectType SubjectType { get; set; }
        public long? AllocationId { get; set; }
        public long? EmployeeId { get; set; }
        public string? TeacherName { get; set; }
        public string? TeacherCode { get; set; }
    }

    public class SaveClassTeacherDto
    {
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public long? EmployeeId { get; set; } // Nullable to remove allocation
    }

    public class SaveSubjectTeacherDto
    {
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public long SubjectId { get; set; }
        public long? EmployeeId { get; set; } // Nullable to remove allocation
    }
}

