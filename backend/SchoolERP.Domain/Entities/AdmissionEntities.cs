using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;

namespace SchoolERP.Domain.Entities
{
    public class AdmissionFormConfig : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string FormTitle { get; set; } = "School Admission Form";
        public string? FormDescription { get; set; }
        public string? Instructions { get; set; }
        public decimal ApplicationFee { get; set; } = 0.00m;
        public int Version { get; set; } = 1;

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ICollection<AdmissionFormField> Fields { get; set; } = new List<AdmissionFormField>();
        public virtual ICollection<AdmissionSlip> AdmissionSlips { get; set; } = new List<AdmissionSlip>();
    }

    public class AdmissionFormField : BaseEntity
    {
        public long FormConfigId { get; set; }
        public string FieldKey { get; set; } = string.Empty;
        public string FieldLabel { get; set; } = string.Empty;
        public string FieldType { get; set; } = "text"; // text, number, email, date, select, radio, checkbox, textarea, file
        public string? Placeholder { get; set; }
        public string? HelpText { get; set; }
        public string? DefaultValue { get; set; }
        public string? OptionsJson { get; set; } // JSON array of string options e.g. ["Male", "Female"]
        public string? ValidationRulesJson { get; set; } // JSON object e.g. {"required": true}
        public int DisplayOrder { get; set; } = 0;
        public bool IsSystemField { get; set; } = false;
        public bool IsVisibleOnSlip { get; set; } = true;
        public int GridSpan { get; set; } = 6; // 6 = col-6, 12 = col-12

        public virtual AdmissionFormConfig? FormConfig { get; set; }
    }

    public class AdmissionSlip : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long FormConfigId { get; set; }
        public string SlipNumber { get; set; } = string.Empty;
        public string? BatchId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public long ClassId { get; set; }
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
        public string CustomFieldValuesJson { get; set; } = "{}"; // JSON snapshot of all fields at generation time
        public string AdmissionStatus { get; set; } = "Issued"; // Draft, Issued, Admitted, Cancelled

        // Payment status & summary
        public decimal FeeAmount { get; set; } = 0.00m;
        public decimal PaidAmount { get; set; } = 0.00m;
        public decimal BalanceAmount { get; set; } = 0.00m;
        public string PaymentStatus { get; set; } = "Unpaid"; // Unpaid, Partial, Paid

        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual AdmissionFormConfig? FormConfig { get; set; }
        public virtual ICollection<AdmissionPayment> Payments { get; set; } = new List<AdmissionPayment>();
    }

    public class AdmissionPayment : BaseEntity
    {
        public long BranchId { get; set; }
        public long AdmissionSlipId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = "Cash"; // Cash, Online, UPI, Card, Cheque
        public string? TransactionReference { get; set; }
        public string? PaymentNote { get; set; }
        public long CollectedBy { get; set; }
        public bool IsReconciled { get; set; } = true;

        public virtual Branch? Branch { get; set; }
        public virtual AdmissionSlip? AdmissionSlip { get; set; }
    }
}
