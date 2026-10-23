using System;
using System.Collections.Generic;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.DTOs
{
    // 1. Fee Head DTOs
    public class FeeHeadDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public FeeHeadType Type { get; set; }
        public bool IsOptional { get; set; }
        public string? Description { get; set; }
    }

    public class CreateFeeHeadDto
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public FeeHeadType Type { get; set; } = FeeHeadType.Recurring;
        public bool IsOptional { get; set; } = false;
        public string? Description { get; set; }
    }

    public class UpdateFeeHeadDto
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public FeeHeadType Type { get; set; } = FeeHeadType.Recurring;
        public bool IsOptional { get; set; } = false;
        public string? Description { get; set; }
    }

    // 2. Fee Group DTOs
    public class FeeGroupDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class CreateFeeGroupDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    // 3. Fee Installment DTOs
    public class FeeInstallmentDto
    {
        public long Id { get; set; }
        public long AcademicYearId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class CreateFeeInstallmentDto
    {
        public string Name { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public int DisplayOrder { get; set; }
    }

    // 4. Fee Structure Matrix DTOs
    public class FeeStructureItemDto
    {
        public long FeeHeadId { get; set; }
        public long InstallmentId { get; set; }
        public decimal Amount { get; set; }
    }

    public class SaveFeeStructureMatrixDto
    {
        public long ClassId { get; set; }
        public long FeeGroupId { get; set; }
        public List<FeeStructureItemDto> Items { get; set; } = new List<FeeStructureItemDto>();
    }

    public class FeeStructureGridRowDto
    {
        public long FeeHeadId { get; set; }
        public string FeeHeadName { get; set; } = string.Empty;
        public string FeeHeadCode { get; set; } = string.Empty;
        public FeeHeadType Type { get; set; }
        // Installment amounts dictionary: installmentId -> amount
        public Dictionary<long, decimal> InstallmentAmounts { get; set; } = new Dictionary<long, decimal>();
        public decimal TotalAmount { get; set; }
    }

    // 5. Fine Rules DTOs
    public class FineRuleDto
    {
        public long Id { get; set; }
        public long InstallmentId { get; set; }
        public string InstallmentName { get; set; } = string.Empty;
        public FineType FineType { get; set; }
        public decimal Amount { get; set; }
        public int GraceDays { get; set; }
    }

    public class SaveFineRuleDto
    {
        public long InstallmentId { get; set; }
        public FineType FineType { get; set; }
        public decimal Amount { get; set; }
        public int GraceDays { get; set; }
    }

    // 6. Bulk Fee Assignment & Dues
    public class BulkFeeAssignmentDto
    {
        public long ClassId { get; set; }
        public long? SectionId { get; set; }
        public long FeeGroupId { get; set; }
    }

    public class StudentDueItemDto
    {
        public long DueId { get; set; }
        public long FeeHeadId { get; set; }
        public string FeeHeadName { get; set; } = string.Empty;
        public bool IsOptional { get; set; } = false;
        public long InstallmentId { get; set; }
        public string InstallmentName { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public DateTime DueDate { get; set; }
        public decimal OriginalAmount { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public decimal FineAmount { get; set; }
        public decimal TotalPayable => BalanceAmount + FineAmount;
        public DueStatus Status { get; set; }
    }

    public class StudentFeeDuesSummaryDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public decimal TotalOutstanding { get; set; }
        public decimal TotalFine { get; set; }
        public decimal TotalPaid { get; set; }
        public List<StudentDueItemDto> Dues { get; set; } = new List<StudentDueItemDto>();
    }

    // 7. Fee Concession DTOs
    public class FeeConcessionDto
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public long FeeHeadId { get; set; }
        public string FeeHeadName { get; set; } = string.Empty;
        public ConcessionType Type { get; set; }
        public decimal Value { get; set; }
        public decimal CalculatedAmount { get; set; }
        public string? Reason { get; set; }
    }

    public class CreateFeeConcessionDto
    {
        public long StudentId { get; set; }
        public long FeeHeadId { get; set; }
        public ConcessionType Type { get; set; } = ConcessionType.Percentage;
        public decimal Value { get; set; }
        public string? Reason { get; set; }
    }

    // 8. Fee Collection & Receipts
    public class CollectDuePaymentItemDto
    {
        public long DueId { get; set; }
        public decimal AmountToPay { get; set; }
        public decimal FineToPay { get; set; }
    }

    public class PaymentSplitDto
    {
        public FeePaymentMode Mode { get; set; } = FeePaymentMode.Cash;
        public decimal Amount { get; set; }
        public string? TransactionRef { get; set; }
        public string? BankName { get; set; }
        public string? ChequeNo { get; set; }
        public DateTime? ChequeDate { get; set; }
    }

    public class CollectFeeRequestDto
    {
        public long StudentId { get; set; }
        public List<CollectDuePaymentItemDto> DuesToPay { get; set; } = new List<CollectDuePaymentItemDto>();
        public List<PaymentSplitDto> Payments { get; set; } = new List<PaymentSplitDto>();
        public decimal OverallDiscount { get; set; } = 0;
        public string? DiscountRemarks { get; set; }
        public string? Remarks { get; set; }
    }

    public class ReceiptPrintItemDto
    {
        public string FeeHeadName { get; set; } = string.Empty;
        public string InstallmentName { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public decimal OriginalAmount { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal FinePaid { get; set; }
        public decimal BalanceCarried { get; set; }
        public decimal Total => AmountPaid + FinePaid;
    }

    public class ReceiptPrintDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptNo { get; set; } = string.Empty;
        public DateTime ReceiptDate { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Contact { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? CashierSignatureUrl { get; set; }
        public string? PrincipalSignatureUrl { get; set; }
        public string AcademicYear { get; set; } = string.Empty;

        // Student Info
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassSection { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string GuardianName { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public string PaymentModeName { get; set; } = "Cash";

        public decimal TotalDue { get; set; }
        public decimal TotalConcession { get; set; }
        public decimal TotalFine { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalDiscount { get; set; } = 0;
        public string? DiscountRemarks { get; set; }
        public decimal RemainingTotalDues { get; set; }
        public ReceiptStatus Status { get; set; }

        public List<ReceiptPrintItemDto> Items { get; set; } = new List<ReceiptPrintItemDto>();
        public List<PaymentSplitDto> Payments { get; set; } = new List<PaymentSplitDto>();
        public string CollectedBy { get; set; } = string.Empty;
        public string? Remarks { get; set; }
    }

    public class CancelReceiptDto
    {
        public string Reason { get; set; } = string.Empty;
    }

    // 9. Fee Reports DTOs
    public class DailyCollectionReportRowDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptNo { get; set; } = string.Empty;
        public DateTime ReceiptDate { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string ClassSection { get; set; } = string.Empty;
        public decimal TotalDue { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal TotalFine { get; set; }
        public decimal GrossAmount => TotalPaid + TotalDiscount;
        public string PaymentModes { get; set; } = string.Empty;
        public List<FeePaymentModeItemDto> Payments { get; set; } = new();
        public ReceiptStatus Status { get; set; }
        public long CreatedBy { get; set; }
        public string CollectedBy { get; set; } = string.Empty;
    }

    public class FeePaymentModeItemDto
    {
        public string Mode { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? TransactionRef { get; set; }
    }

    public class DefaulterReportRowDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public decimal OverdueAmount { get; set; }
        public decimal OverdueFine { get; set; }
        public decimal TotalOverdue => OverdueAmount + OverdueFine;
        public string OverdueInstallments { get; set; } = string.Empty;
    }

    // 8. Monthly Fee Setup DTOs
    public class GenerateMonthlyScheduleRequestDto
    {
        public int DueDay { get; set; } = 10;
        public bool FormatWithYear { get; set; } = true;
    }

    public class MonthlyFeeHeadItemDto
    {
        public long FeeHeadId { get; set; }
        public decimal MonthlyAmount { get; set; }
        public List<int>? ApplicableMonths { get; set; } = new List<int>();
        public Dictionary<string, decimal>? MonthAmounts { get; set; } = new Dictionary<string, decimal>();
    }

    public class SaveMonthlyFeeStructureDto
    {
        public List<long> ClassIds { get; set; } = new List<long>();
        public long FeeGroupId { get; set; }
        public List<MonthlyFeeHeadItemDto> Heads { get; set; } = new List<MonthlyFeeHeadItemDto>();
        public bool AutoAssignToStudents { get; set; } = true;
    }

    public class MonthlySetupStatusDto
    {
        public bool IsScheduleReady { get; set; }
        public int TotalInstallments { get; set; }
        public int DueDay { get; set; }
        public List<FeeInstallmentDto> Installments { get; set; } = new List<FeeInstallmentDto>();
        public List<ClassMonthlySummaryDto> ConfiguredClasses { get; set; } = new List<ClassMonthlySummaryDto>();
    }

    public class ClassMonthlySummaryDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long FeeGroupId { get; set; }
        public string FeeGroupName { get; set; } = string.Empty;
        public decimal MonthlyTotal { get; set; }
        public decimal AnnualTotal { get; set; }
        public int StudentCount { get; set; }
        public int StudentsAssignedCount { get; set; }
    }

    // 10. Class & Month-wise Fee Status Report DTOs
    public class ClassMonthFeeStatusReportDto
    {
        public ClassMonthFeeSummaryDto Summary { get; set; } = new ClassMonthFeeSummaryDto();
        public List<StudentFeeStatusRowDto> Students { get; set; } = new List<StudentFeeStatusRowDto>();
    }

    public class ClassMonthFeeSummaryDto
    {
        public int TotalStudents { get; set; }
        public int PaidCount { get; set; }
        public int PartialCount { get; set; }
        public int UnpaidCount { get; set; }
        public decimal TotalGrossFee { get; set; }
        public decimal TotalConcession { get; set; }
        public decimal TotalNetPayable { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalRemainingDues { get; set; }
        public decimal TotalFine { get; set; }
    }

    public class StudentFeeStatusRowDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string? RollNo { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long? SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;

        public decimal GrossFee { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal NetPayable { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingDue { get; set; }
        public decimal FineAmount { get; set; }
        public string Status { get; set; } = "Unpaid"; // Paid, Partial, Unpaid

        public DateTime? LastPaymentDate { get; set; }
        public string? LastReceiptNo { get; set; }
    }

    // 11. Student Full Complete Fee History DTOs
    public class StudentFullFeeHistoryDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string? RollNo { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public string AcademicSession { get; set; } = string.Empty;

        // Overall Annual Totals
        public decimal TotalAnnualFee { get; set; }
        public decimal TotalAnnualConcession { get; set; }
        public decimal NetAnnualPayable { get; set; }
        public decimal TotalAnnualPaid { get; set; }
        public decimal TotalOutstandingDues { get; set; }
        public decimal TotalFine { get; set; }

        // Month-wise breakdowns (all academic installments)
        public List<StudentInstallmentHistoryDto> Installments { get; set; } = new List<StudentInstallmentHistoryDto>();

        // All receipts issued for this student
        public List<StudentReceiptHistoryDto> Receipts { get; set; } = new List<StudentReceiptHistoryDto>();
    }

    public class StudentInstallmentHistoryDto
    {
        public long InstallmentId { get; set; }
        public string InstallmentName { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public int DisplayOrder { get; set; }
        public decimal TotalOriginal { get; set; }
        public decimal TotalConcession { get; set; }
        public decimal NetPayable { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal BalanceDue { get; set; }
        public decimal FineAmount { get; set; }
        public string Status { get; set; } = "Unpaid"; // Paid, Partial, Unpaid
        public List<StudentFeeHeadDetailDto> FeeHeads { get; set; } = new List<StudentFeeHeadDetailDto>();
    }

    public class StudentFeeHeadDetailDto
    {
        public long DueId { get; set; }
        public long FeeHeadId { get; set; }
        public string FeeHeadName { get; set; } = string.Empty;
        public bool IsOptional { get; set; }
        public decimal OriginalAmount { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public string Status { get; set; } = "Unpaid";
    }

    public class StudentReceiptHistoryDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptNo { get; set; } = string.Empty;
        public DateTime ReceiptDate { get; set; }
        public decimal TotalPaid { get; set; }
        public string PaymentModes { get; set; } = string.Empty;
        public string Status { get; set; } = "Paid";
        public string CollectedBy { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public List<StudentReceiptPaymentItemDto> Payments { get; set; } = new List<StudentReceiptPaymentItemDto>();
        public List<StudentReceiptHeadItemDto> Items { get; set; } = new List<StudentReceiptHeadItemDto>();
    }

    public class StudentReceiptPaymentItemDto
    {
        public string Mode { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? TransactionRef { get; set; }
        public string? BankName { get; set; }
        public string? ChequeNo { get; set; }
    }

    public class StudentReceiptHeadItemDto
    {
        public string FeeHeadName { get; set; } = string.Empty;
        public string InstallmentName { get; set; } = string.Empty;
        public decimal AmountPaid { get; set; }
        public decimal FinePaid { get; set; }
        public decimal BalanceCarried { get; set; }
    }

    // 12. Demand Bill DTOs
    public class DemandBillItemDto
    {
        public long FeeHeadId { get; set; }
        public string FeeHeadName { get; set; } = string.Empty;
        public long InstallmentId { get; set; }
        public string InstallmentName { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public decimal OriginalAmount { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public decimal FineAmount { get; set; }
        public decimal NetDemand { get; set; }
    }

    public class DemandBillStudentDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string MotherName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long? SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string DemandBillNo { get; set; } = string.Empty;
        public DateTime BillDate { get; set; }
        public DateTime DueDate { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public decimal PreviousArrears { get; set; }
        public decimal CurrentPeriodDue { get; set; }
        public decimal FineAmount { get; set; }
        public decimal NetDemandAmount { get; set; }
        public string Status { get; set; } = "Unpaid";
        public string MonthName { get; set; } = string.Empty;
        public string BillingPeriod { get; set; } = string.Empty;
        public List<string> InstallmentNames { get; set; } = new List<string>();
        public List<DemandBillItemDto> Items { get; set; } = new List<DemandBillItemDto>();
    }

    public class DemandBillResponseDto
    {
        public int TotalStudents { get; set; }
        public decimal TotalGrossAmount { get; set; }
        public decimal TotalConcessionAmount { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalBalanceAmount { get; set; }
        public decimal TotalFineAmount { get; set; }
        public decimal TotalNetDemandAmount { get; set; }
        public int TotalDefaulters { get; set; }
        public List<DemandBillStudentDto> Students { get; set; } = new List<DemandBillStudentDto>();
    }

    public class ClassFeeStructureHeadItemDto
    {
        public long FeeHeadId { get; set; }
        public string FeeHeadName { get; set; } = string.Empty;
        public string FeeHeadCode { get; set; } = string.Empty;
        public string FeeHeadType { get; set; } = "Recurring";
        public bool IsOptional { get; set; }
        public decimal TotalAnnualAmount { get; set; }
        public Dictionary<long, decimal> InstallmentAmounts { get; set; } = new Dictionary<long, decimal>();
    }

    public class ClassFeeStructureInstallmentItemDto
    {
        public long InstallmentId { get; set; }
        public string InstallmentName { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public int DisplayOrder { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class ClassFeeStructureSummaryDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long FeeGroupId { get; set; }
        public string FeeGroupName { get; set; } = string.Empty;
        public decimal TotalAnnualFee { get; set; }
        public decimal TotalMandatoryFee { get; set; }
        public decimal TotalOptionalFee { get; set; }
        public decimal TotalOneTimeFee { get; set; }
        public decimal TotalRecurringFee { get; set; }
        public List<ClassFeeStructureHeadItemDto> Heads { get; set; } = new List<ClassFeeStructureHeadItemDto>();
        public List<ClassFeeStructureInstallmentItemDto> Installments { get; set; } = new List<ClassFeeStructureInstallmentItemDto>();
    }
}



