using System;
using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class PayrollListDto
    {
        public long Id { get; set; }
        public long EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string? Department { get; set; }
        public string Mobile { get; set; } = string.Empty;
        public string SalarySlipNo { get; set; } = string.Empty;
        public int PayrollMonth { get; set; }
        public int PayrollYear { get; set; }
        public string MonthName { get; set; } = string.Empty;

        public int TotalWorkingDays { get; set; }
        public decimal PresentDays { get; set; }
        public decimal PaidLeaves { get; set; }
        public decimal UnpaidLeaves { get; set; }

        public decimal BasicSalary { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }

        public string PaymentStatus { get; set; } = "Pending";
        public DateTime? PaymentDate { get; set; }
        public string? PaymentMode { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class PayrollDetailDto : PayrollListDto
    {
        // Allowances breakdown
        public decimal Da { get; set; }
        public decimal Hra { get; set; }
        public decimal Conveyance { get; set; }
        public decimal MedicalAllowance { get; set; }
        public decimal SpecialAllowance { get; set; }

        // Deductions breakdown
        public decimal PfDeduction { get; set; }
        public decimal EsiDeduction { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TdsDeduction { get; set; }
        public decimal LoanDeduction { get; set; }
        public decimal LeaveDeduction { get; set; }

        public string? Remarks { get; set; }

        // Employee profile details for slip
        public DateTime JoiningDate { get; set; }
        public string? PanNo { get; set; }
        public string? AadhaarNo { get; set; }
        public string? BankName { get; set; }
        public string? AccountNo { get; set; }
        public string? IfscCode { get; set; }
        public string? PhotoUrl { get; set; }

        // School info for slip letterhead
        public string SchoolName { get; set; } = "DELHI PUBLIC SCHOOL";
        public string CampusName { get; set; } = "Main Campus";
        public string SchoolAddress { get; set; } = "Knowledge Park, Sector 4, New Delhi";
        public string SchoolContact { get; set; } = "9876543210";
        public string SchoolEmail { get; set; } = "info@dps.edu.in";
        public string AffiliationNo { get; set; } = "CBSE/2026/0912";
    }

    public class GenerateMonthlyPayrollDto
    {
        public int Month { get; set; } // 1-12
        public int Year { get; set; } // e.g. 2026
        public long? DepartmentId { get; set; }
        public decimal DefaultWorkingDays { get; set; } = 30;
        public bool AutoCalculateAttendance { get; set; } = true;
    }

    public class CreatePayrollDto
    {
        public long EmployeeId { get; set; }
        public int PayrollMonth { get; set; }
        public int PayrollYear { get; set; }
        public int TotalWorkingDays { get; set; } = 30;
        public decimal PresentDays { get; set; } = 30;
        public decimal PaidLeaves { get; set; } = 0;
        public decimal UnpaidLeaves { get; set; } = 0;

        public decimal BasicSalary { get; set; }
        public decimal Da { get; set; }
        public decimal Hra { get; set; }
        public decimal Conveyance { get; set; }
        public decimal MedicalAllowance { get; set; }
        public decimal SpecialAllowance { get; set; }

        public decimal PfDeduction { get; set; }
        public decimal EsiDeduction { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TdsDeduction { get; set; }
        public decimal LoanDeduction { get; set; }
        public decimal LeaveDeduction { get; set; }

        public string? Remarks { get; set; }
    }

    public class UpdatePayrollDto
    {
        public int TotalWorkingDays { get; set; }
        public decimal PresentDays { get; set; }
        public decimal PaidLeaves { get; set; }
        public decimal UnpaidLeaves { get; set; }

        public decimal BasicSalary { get; set; }
        public decimal Da { get; set; }
        public decimal Hra { get; set; }
        public decimal Conveyance { get; set; }
        public decimal MedicalAllowance { get; set; }
        public decimal SpecialAllowance { get; set; }

        public decimal PfDeduction { get; set; }
        public decimal EsiDeduction { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TdsDeduction { get; set; }
        public decimal LoanDeduction { get; set; }
        public decimal LeaveDeduction { get; set; }

        public string? Remarks { get; set; }
    }

    public class RecordSalaryPaymentDto
    {
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string PaymentMode { get; set; } = "Bank Transfer";
        public string? TransactionReference { get; set; }
        public string? Remarks { get; set; }
    }

    public class BulkPayDto
    {
        public List<long> PayrollIds { get; set; } = new();
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string PaymentMode { get; set; } = "Bank Transfer";
        public string? TransactionReference { get; set; }
        public string? Remarks { get; set; }
    }

    public class PayrollSummaryDto
    {
        public int TotalEmployees { get; set; }
        public int ProcessedCount { get; set; }
        public int PaidCount { get; set; }
        public int PendingCount { get; set; }
        public decimal TotalGrossPayable { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal TotalNetPayable { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalPendingAmount { get; set; }
    }
}
