using System;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class StudentPromotion : BaseEntity
    {
        public long BranchId { get; set; }
        public long FromAcademicYearId { get; set; }
        public long ToAcademicYearId { get; set; }
        public long StudentId { get; set; }
        public long FromClassId { get; set; }
        public long FromSectionId { get; set; }
        public long ToClassId { get; set; }
        public long ToSectionId { get; set; }
        public PromotionResult Result { get; set; } = PromotionResult.Promoted;
        public DateTime PromotionDate { get; set; } = DateTime.UtcNow;
        public decimal DuesCarriedForward { get; set; } = 0;
        public bool IsRolledBack { get; set; } = false;
        public string? Remarks { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? FromAcademicYear { get; set; }
        public virtual AcademicYear? ToAcademicYear { get; set; }
        public virtual Student? Student { get; set; }
        public virtual ClassMaster? FromClass { get; set; }
        public virtual Section? FromSection { get; set; }
        public virtual ClassMaster? ToClass { get; set; }
        public virtual Section? ToSection { get; set; }
    }

    public class TransferCertificate : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long StudentId { get; set; }
        public string TcNumber { get; set; } = string.Empty;
        public DateTime ApplicationDate { get; set; } = DateTime.UtcNow;
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;
        public string LastClassStudied { get; set; } = string.Empty;
        public bool QualifiedForPromotion { get; set; } = true;
        public string ReasonForLeaving { get; set; } = string.Empty;
        public string Conduct { get; set; } = "Good";
        public bool FeeCleared { get; set; } = true;
        public bool LibraryCleared { get; set; } = true;
        public decimal PendingDuesAmount { get; set; } = 0;
        public string? Remarks { get; set; }
        public TcStatus Status { get; set; } = TcStatus.Issued;

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual Student? Student { get; set; }
    }
}
