using System;
using System.Collections.Generic;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.DTOs
{
    public class SchoolDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? AffiliationNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? Address { get; set; }
        public string? ContactNumber { get; set; }
        public string? AlternateContactNumber { get; set; }
        public string? Email { get; set; }
        public string? IdCardFront { get; set; }
        public string? IdCardBack { get; set; }
        public string? Website { get; set; }
        public bool IsActive { get; set; } = true;
        public int BranchCount { get; set; }
        public DateTime CreatedOn { get; set; }
        public List<BranchDto> Branches { get; set; } = new List<BranchDto>();
    }

    public class CreateSchoolRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? AffiliationNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? Address { get; set; }
        public string? ContactNumber { get; set; }
        public string? AlternateContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public bool CreateDefaultBranch { get; set; } = true;
        public string? BranchName { get; set; } = "Main Campus";
        public string? BranchCode { get; set; } = "MAIN";
        public string? AcademicYearName { get; set; } = "2026-27";
    }

    public class UpdateSchoolRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? AffiliationNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? Address { get; set; }
        public string? ContactNumber { get; set; }
        public string? AlternateContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class BranchDto
    {
        public long Id { get; set; }
        public long SchoolId { get; set; }
        public string? SchoolName { get; set; }
        public string? AffiliationNumber { get; set; }
        public string? Website { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? PrincipalSignatureUrl { get; set; }
        public string? CashierSignatureUrl { get; set; }
        public string? AuthorizedSignatureUrl { get; set; }
        public string? PrintHeader { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Phone { get; set; }
        public string? AlternatePhone { get; set; }
        public string? Email { get; set; }
        public string? IdCardFront { get; set; }
        public string? IdCardBack { get; set; }
    }

    public class AcademicYearDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsCurrent { get; set; }
    }

    public class SectionDto
    {
        public long Id { get; set; }
        public long ClassId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Capacity { get; set; }
    }

    public class ClassDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public List<SectionDto> Sections { get; set; } = new List<SectionDto>();
    }

    public class SubjectDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public SubjectType Type { get; set; }
    }

    public class ClassSubjectDto
    {
        public long Id { get; set; }
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public SubjectType SubjectType { get; set; }
        public bool IsOptional { get; set; }
    }

    public class SimpleMasterDto
    {
        public long Id { get; set; }
        public MasterType Type { get; set; }
        public string TypeName => Type.ToString();
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public int DisplayOrder { get; set; }
    }
}


    public class SaveIdCardTemplateRequestDto
    {
        public string? FrontConfig { get; set; }
        public string? BackConfig { get; set; }
    }
