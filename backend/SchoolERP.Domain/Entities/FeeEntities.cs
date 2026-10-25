using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class FeeHead : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public FeeHeadType Type { get; set; } = FeeHeadType.Recurring;
        public bool IsOptional { get; set; } = false;
        public string? Description { get; set; }

        public virtual Branch? Branch { get; set; }
    }

    public class FeeGroup : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public virtual Branch? Branch { get; set; }
    }

    public class FeeInstallment : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public int DisplayOrder { get; set; }

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
    }

    public class FeeStructure : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long ClassId { get; set; }
        public long FeeGroupId { get; set; }
        public long FeeHeadId { get; set; }
        public long InstallmentId { get; set; }
        public decimal Amount { get; set; }

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual FeeGroup? FeeGroup { get; set; }
        public virtual FeeHead? FeeHead { get; set; }
        public virtual FeeInstallment? Installment { get; set; }
    }

    public class FineRule : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long InstallmentId { get; set; }
        public FineType FineType { get; set; } = FineType.FixedAmount;
        public decimal Amount { get; set; }
        public int GraceDays { get; set; }

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual FeeInstallment? Installment { get; set; }
    }

    public class StudentFeeDue : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long StudentId { get; set; }
        public long ClassId { get; set; }
        public long FeeHeadId { get; set; }
        public long InstallmentId { get; set; }

        public decimal OriginalAmount { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public DueStatus Status { get; set; } = DueStatus.Unpaid;

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual Student? Student { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual FeeHead? FeeHead { get; set; }
        public virtual FeeInstallment? Installment { get; set; }
    }

    public class FeeConcession : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long StudentId { get; set; }
        public long FeeHeadId { get; set; }
        public ConcessionType Type { get; set; } = ConcessionType.Percentage;
        public decimal Value { get; set; }
        public decimal CalculatedAmount { get; set; }
        public string? Reason { get; set; }
        public long? ApprovedBy { get; set; }
        public bool IsApproved { get; set; } = true;

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual Student? Student { get; set; }
        public virtual FeeHead? FeeHead { get; set; }
    }

    public class FeeReceipt : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string ReceiptNo { get; set; } = string.Empty;
        public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;
        public long StudentId { get; set; }
        public long ClassId { get; set; }
        public long SectionId { get; set; }

        public decimal TotalDue { get; set; }
        public decimal TotalConcession { get; set; }
        public decimal TotalFine { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalDiscount { get; set; } = 0;
        public string? DiscountRemarks { get; set; }

        public ReceiptStatus Status { get; set; } = ReceiptStatus.Paid;
        public string? CancelReason { get; set; }
        public long? CancelledBy { get; set; }
        public DateTime? CancelledOn { get; set; }
        public string? Remarks { get; set; }

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual Student? Student { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual Section? Section { get; set; }

        public virtual ICollection<FeeReceiptDetail> Details { get; set; } = new List<FeeReceiptDetail>();
        public virtual ICollection<FeePayment> Payments { get; set; } = new List<FeePayment>();
    }

    public class FeeReceiptDetail : BaseEntity
    {
        public long FeeReceiptId { get; set; }
        public long? StudentFeeDueId { get; set; }
        public long FeeHeadId { get; set; }
        public long InstallmentId { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal FinePaid { get; set; }
        public decimal BalanceCarried { get; set; }

        public virtual FeeReceipt? FeeReceipt { get; set; }
        public virtual StudentFeeDue? StudentFeeDue { get; set; }
        public virtual FeeHead? FeeHead { get; set; }
        public virtual FeeInstallment? Installment { get; set; }
    }

    public class FeePayment : BaseEntity
    {
        public long FeeReceiptId { get; set; }
        public FeePaymentMode PaymentMode { get; set; } = FeePaymentMode.Cash;
        public decimal Amount { get; set; }
        public string? TransactionRef { get; set; }
        public string? BankName { get; set; }
        public string? ChequeNo { get; set; }
        public DateTime? ChequeDate { get; set; }
        public ChequeStatus ChequeStatus { get; set; } = ChequeStatus.Cleared;
        public DateTime? ClearedOn { get; set; }

        public virtual FeeReceipt? FeeReceipt { get; set; }
    }

    public class FeeDiscountScheme : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Type { get; set; } = "Percentage"; // "Percentage", "Fixed Amount", "Full Waiver"
        public decimal Value { get; set; }
        public string? Description { get; set; }

        public virtual Branch? Branch { get; set; }
    }
}
