using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class School : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty; // e.g. "dps-rohini"
        public string Code { get; set; } = string.Empty;
        public string? AffiliationNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? CustomDomain { get; set; } // e.g. "portal.dpsrohini.in"
        public string Status { get; set; } = "Active"; // Active, Trial, Suspended, Archived
        public string? InitialAdminPassword { get; set; }
        public bool AllowStudentLogin { get; set; } = true;
        public bool AllowParentLogin { get; set; } = true;

        public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();
        public virtual ICollection<TenantSubscription> Subscriptions { get; set; } = new List<TenantSubscription>();
        public virtual ICollection<TenantModule> Modules { get; set; } = new List<TenantModule>();
    }

    public class Branch : BaseEntity
    {
        public long SchoolId { get; set; }
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
        public string? Email { get; set; }

        public virtual School? School { get; set; }
        public virtual ICollection<AcademicYear> AcademicYears { get; set; } = new List<AcademicYear>();
    }

    public class AcademicYear : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. "2026-27"
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsCurrent { get; set; } = false;

        public virtual Branch? Branch { get; set; }
    }

    public class ClassMaster : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. "Class 1", "Class 2"
        public int DisplayOrder { get; set; } = 0;

        public virtual ICollection<Section> Sections { get; set; } = new List<Section>();
    }

    public class Section : BaseEntity
    {
        public long ClassId { get; set; }
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. "A", "B"
        public int Capacity { get; set; } = 40;

        public virtual ClassMaster? Class { get; set; }
    }

    public class Subject : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public SubjectType Type { get; set; } = SubjectType.Scholastic;
    }

    public class ClassSubject : BaseEntity
    {
        public long ClassId { get; set; }
        public long SubjectId { get; set; }
        public long AcademicYearId { get; set; }
        public long BranchId { get; set; }
        public bool IsOptional { get; set; } = false;

        public virtual ClassMaster? Class { get; set; }
        public virtual Subject? Subject { get; set; }
    }

    public class SimpleMaster : BaseEntity
    {
        public long BranchId { get; set; }
        public MasterType Type { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public int DisplayOrder { get; set; } = 0;
    }

    public class NumberingSeries : BaseEntity
    {
        public long BranchId { get; set; }
        public string ModuleType { get; set; } = string.Empty; // "Admission", "FeeReceipt", "Enquiry", "TransferCertificate", "Staff"
        public string Prefix { get; set; } = string.Empty; // e.g. "ADM", "RCP", "ENQ", "TC", "EMP"
        public bool IncludeBranchCode { get; set; } = true;
        public bool IncludeAcademicYear { get; set; } = true;
        public string YearFormat { get; set; } = "YYYYYY"; // "YYYYYY", "YYYY-YY", "YY", "None"
        public string Separator { get; set; } = "/"; // "/", "-", "_", ""
        public int Digits { get; set; } = 4; // 4, 5, 6
        public long StartNumber { get; set; } = 1;
        public long CurrentSequence { get; set; } = 0;
        public string? Suffix { get; set; }
        public string? CustomFormat { get; set; }

        public virtual Branch? Branch { get; set; }
    }
}
