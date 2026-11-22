using System;
using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    // Form Builder DTOs
    public class AdmissionFormFieldDto
    {
        public long Id { get; set; }
        public string FieldKey { get; set; } = string.Empty;
        public string FieldLabel { get; set; } = string.Empty;
        public string FieldType { get; set; } = "text";
        public string? Placeholder { get; set; }
        public string? HelpText { get; set; }
        public string? DefaultValue { get; set; }
        public List<string>? Options { get; set; }
        public Dictionary<string, object>? ValidationRules { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsSystemField { get; set; }
        public bool IsVisibleOnSlip { get; set; } = true;
        public int GridSpan { get; set; } = 6;
    }

    public class AdmissionFormConfigDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string FormTitle { get; set; } = "School Admission Form";
        public string? FormDescription { get; set; }
        public string? Instructions { get; set; }
        public decimal ApplicationFee { get; set; }
        public int Version { get; set; }
        public List<AdmissionFormFieldDto> Fields { get; set; } = new();
    }

    public class SaveAdmissionFormConfigRequest
    {
        public long AcademicYearId { get; set; }
        public string FormTitle { get; set; } = "School Admission Form";
        public string? FormDescription { get; set; }
        public string? Instructions { get; set; }
        public decimal ApplicationFee { get; set; }
        public List<AdmissionFormFieldDto> Fields { get; set; } = new();
    }

    // Slip Generation DTOs
    public class CreateIndividualAdmissionSlipRequest
    {
        public long AcademicYearId { get; set; }
        public long ClassId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public DateTime? Dob { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public string ContactNumber { get; set; } = string.Empty;
        public string? AlternateNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? PreviousSchool { get; set; }
        public string? StudentPhotoUrl { get; set; }
        public Dictionary<string, object>? CustomFields { get; set; }

        // Optional payment at time of generation
        public decimal FeeAmount { get; set; }
        public decimal InitialPaymentAmount { get; set; }
        public string? PaymentMode { get; set; } = "Cash";
        public string? TransactionReference { get; set; }
        public string? PaymentNote { get; set; }
    }

    public class BulkAdmissionSlipItem
    {
        public string StudentName { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string? Gender { get; set; }
        public DateTime? Dob { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public string ContactNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Address { get; set; }
        public Dictionary<string, object>? CustomFields { get; set; }
    }

    public class CreateBulkAdmissionSlipsRequest
    {
        public long AcademicYearId { get; set; }
        public decimal FeeAmountPerSlip { get; set; }
        public decimal CollectAmountPerSlip { get; set; }
        public string PaymentMode { get; set; } = "Cash";
        public string? TransactionReference { get; set; }
        public string? PaymentNote { get; set; }
        public List<BulkAdmissionSlipItem> Slips { get; set; } = new();
    }

    public class AdmissionSlipResponseDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public string SlipNumber { get; set; } = string.Empty;
        public string? BatchId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public DateTime? Dob { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public string ContactNumber { get; set; } = string.Empty;
        public string? AlternateNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? PreviousSchool { get; set; }
        public string? StudentPhotoUrl { get; set; }
        public Dictionary<string, object> CustomFieldValues { get; set; } = new();
        public string AdmissionStatus { get; set; } = "Issued";

        public decimal FeeAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public string PaymentStatus { get; set; } = "Unpaid";
        public DateTime CreatedOn { get; set; }
        public List<AdmissionPaymentDto> Payments { get; set; } = new();
    }

    public class AdmissionPaymentDto
    {
        public long Id { get; set; }
        public long AdmissionSlipId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = "Cash";
        public string? TransactionReference { get; set; }
        public string? PaymentNote { get; set; }
    }

    public class CollectAdmissionPaymentRequest
    {
        public long AdmissionSlipId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = "Cash"; // Cash, Online, UPI, Card, Cheque
        public string? TransactionReference { get; set; }
        public string? PaymentNote { get; set; }
    }

    public class AdmissionDashboardStatsDto
    {
        public int TotalSlips { get; set; }
        public int PaidSlips { get; set; }
        public int UnpaidSlips { get; set; }
        public int PartialPaidSlips { get; set; }
        public decimal TotalFeeExpected { get; set; }
        public decimal TotalFeeCollected { get; set; }
        public decimal TotalPendingCollection { get; set; }
        public List<ClassWiseAdmissionStatDto> ClassWiseStats { get; set; } = new();
    }

    public class ClassWiseAdmissionStatDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int TotalSlips { get; set; }
        public decimal TotalCollected { get; set; }
    }
}
