using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/accounts")]
    [Authorize]
    public class AccountsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AccountsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        /// <summary>
        /// Comprehensive Financial & Operations Summary (KPIs)
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetAccountsSummary(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = (academicYearId.HasValue && academicYearId.Value > 0)
                ? academicYearId.Value
                : _currentUserService.AcademicYearId;

            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.Id == yearId);

            var start = startDate?.Date ?? (academicYear?.StartDate ?? DateTime.UtcNow.Date);
            var end = (endDate?.Date ?? DateTime.UtcNow.Date).AddDays(1).AddTicks(-1);

            // 1. Fee Collections
            var feeReceiptsQuery = _context.FeeReceipts
                .Include(r => r.Payments)
                .Where(r => r.BranchId == branchId &&
                            r.Status == ReceiptStatus.Paid &&
                            r.ReceiptDate >= start &&
                            r.ReceiptDate <= end);

            if (yearId > 0)
            {
                feeReceiptsQuery = feeReceiptsQuery.Where(r => r.AcademicYearId == yearId);
            }

            var feeReceipts = await feeReceiptsQuery.ToListAsync();

            decimal totalFeeCollected = feeReceipts.Sum(r => r.TotalPaid);
            decimal totalFeeDiscounts = feeReceipts.Sum(r => r.TotalDiscount);
            decimal totalLateFines = feeReceipts.Sum(r => r.TotalFine);

            // Mode breakdown
            var cashCollections = feeReceipts.SelectMany(r => r.Payments)
                .Where(p => p.PaymentMode == FeePaymentMode.Cash).Sum(p => p.Amount);
            var bankOnlineCollections = totalFeeCollected - cashCollections;

            // 2. School Operating Expenses
            var expenseQuery = _context.Expenses
                .Include(e => e.Category)
                .Where(e => e.BranchId == branchId &&
                            e.IsActive &&
                            e.ExpenseDate >= start &&
                            e.ExpenseDate <= end);

            if (yearId > 0)
            {
                if (academicYear != null)
                {
                    expenseQuery = expenseQuery.Where(e => e.AcademicYearId == yearId ||
                                                         (e.AcademicYearId == 0 && e.ExpenseDate >= academicYear.StartDate && e.ExpenseDate <= academicYear.EndDate));
                }
                else
                {
                    expenseQuery = expenseQuery.Where(e => e.AcademicYearId == yearId);
                }
            }

            var expenses = await expenseQuery.ToListAsync();
            decimal totalExpenses = expenses.Sum(e => e.Amount);

            // 3. Staff Salary Disbursements (Paid status)
            var payrollQuery = _context.StaffPayrolls
                .Include(p => p.Employee)
                .Where(p => p.BranchId == branchId &&
                            p.PaymentStatus == "Paid" &&
                            p.PaymentDate.HasValue &&
                            p.PaymentDate.Value >= start &&
                            p.PaymentDate.Value <= end);

            var payrolls = await payrollQuery.ToListAsync();
            decimal totalSalariesPaid = payrolls.Sum(p => p.NetSalary);

            // Net Profit / Loss (Surplus)
            decimal totalOutflow = totalExpenses + totalSalariesPaid;
            decimal netSurplus = totalFeeCollected - totalOutflow;

            // 4. Enquiries Summary
            var enquiryQuery = _context.Enquiries
                .Where(e => e.BranchId == branchId &&
                            e.CreatedOn >= start &&
                            e.CreatedOn <= end);

            if (yearId > 0)
            {
                enquiryQuery = enquiryQuery.Where(e => e.AcademicYearId == yearId);
            }

            var enquiries = await enquiryQuery.ToListAsync();
            int totalEnquiries = enquiries.Count;
            int convertedEnquiries = enquiries.Count(e => e.Status == EnquiryStatus.Converted || e.ConvertedStudentId.HasValue);
            double conversionRate = totalEnquiries > 0 ? Math.Round(((double)convertedEnquiries / totalEnquiries) * 100, 1) : 0;

            // 5. Admissions Summary
            var admissionQuery = _context.Students
                .Where(s => s.BranchId == branchId &&
                            s.AdmissionDate >= start &&
                            s.AdmissionDate <= end);

            var admissions = await admissionQuery.ToListAsync();
            int totalAdmissions = admissions.Count;

            // 6. Outstanding Fee Dues
            var feeDuesQuery = _context.StudentFeeDues
                .Where(d => d.BranchId == branchId && d.Status != DueStatus.Paid);

            if (yearId > 0)
            {
                feeDuesQuery = feeDuesQuery.Where(d => d.AcademicYearId == yearId);
            }

            decimal totalPendingDues = await feeDuesQuery.SumAsync(d => d.BalanceAmount);

            return Ok(new
            {
                success = true,
                data = new
                {
                    totalFeeCollected,
                    totalFeeDiscounts,
                    totalLateFines,
                    cashCollections,
                    bankOnlineCollections,
                    totalExpenses,
                    totalSalariesPaid,
                    totalOutflow,
                    netSurplus,
                    totalEnquiries,
                    convertedEnquiries,
                    conversionRate,
                    totalAdmissions,
                    totalPendingDues,
                    startDate = start.ToString("yyyy-MM-dd"),
                    endDate = end.ToString("yyyy-MM-dd"),
                    academicYear = academicYear?.Name ?? "All"
                }
            });
        }

        /// <summary>
        /// Unified Day Book & Cash Book Register (Chronological Inflows & Outflows)
        /// </summary>
        [HttpGet("daybook")]
        public async Task<IActionResult> GetDayBook(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? transactionType,
            [FromQuery] string? paymentMode,
            [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = (academicYearId.HasValue && academicYearId.Value > 0)
                ? academicYearId.Value
                : _currentUserService.AcademicYearId;

            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.Id == yearId);

            var start = startDate?.Date ?? DateTime.UtcNow.Date;
            var end = (endDate?.Date ?? DateTime.UtcNow.Date).AddDays(1).AddTicks(-1);

            var items = new List<DayBookEntryDto>();

            // 1. Fee Receipts (Inflows)
            var feeQuery = _context.FeeReceipts
                .Include(r => r.Student)
                .Include(r => r.Class)
                .Include(r => r.Section)
                .Include(r => r.Payments)
                .Where(r => r.BranchId == branchId &&
                            r.Status == ReceiptStatus.Paid &&
                            r.ReceiptDate >= start &&
                            r.ReceiptDate <= end);

            if (yearId > 0)
            {
                feeQuery = feeQuery.Where(r => r.AcademicYearId == yearId);
            }

            var receipts = await feeQuery.ToListAsync();

            // Resolve cashier user names
            var userIds = receipts.Select(r => r.CreatedBy).Distinct().ToList();
            var userDict = await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => !string.IsNullOrEmpty(u.FullName) ? u.FullName : u.Username);

            foreach (var r in receipts)
            {
                var mode = r.Payments.Any() ? string.Join(", ", r.Payments.Select(p => p.PaymentMode.ToString())) : "Cash";
                var cashier = (userDict.TryGetValue(r.CreatedBy, out var name) && !string.IsNullOrEmpty(name)) ? name : "Cashier";

                items.Add(new DayBookEntryDto
                {
                    Id = $"FEE-{r.Id}",
                    Date = r.ReceiptDate,
                    RefNo = r.ReceiptNo,
                    Category = "Fee Collection",
                    Particulars = $"Fee: {r.Student?.FullName ?? "Student"} ({r.Class?.Name} {r.Section?.Name})",
                    PartyName = r.Student?.FullName ?? "",
                    Type = "Inflow", // Credit
                    InflowAmount = r.TotalPaid,
                    OutflowAmount = 0,
                    PaymentMode = mode,
                    ProcessedBy = cashier,
                    Details = $"Adm: {r.Student?.AdmissionNo ?? "—"} | Disc: ₹{r.TotalDiscount} | Fine: ₹{r.TotalFine}"
                });
            }

            // 2. Expenses (Outflows)
            var expenseQuery = _context.Expenses
                .Include(e => e.Category)
                .Where(e => e.BranchId == branchId &&
                            e.IsActive &&
                            e.ExpenseDate >= start &&
                            e.ExpenseDate <= end);

            var expenses = await expenseQuery.ToListAsync();
            foreach (var e in expenses)
            {
                items.Add(new DayBookEntryDto
                {
                    Id = $"EXP-{e.Id}",
                    Date = e.ExpenseDate,
                    RefNo = $"EXP/{e.Id:D4}",
                    Category = e.Category?.Name ?? "School Expense",
                    Particulars = $"Expense: {e.Title}",
                    PartyName = e.SpenderName ?? "Vendor/Spender",
                    Type = "Outflow", // Debit
                    InflowAmount = 0,
                    OutflowAmount = e.Amount,
                    PaymentMode = "Cash / Bank",
                    ProcessedBy = e.SpenderName ?? "Staff",
                    Details = e.Description ?? ""
                });
            }

            // 3. Payroll / Salary Payouts (Outflows)
            var payrollQuery = _context.StaffPayrolls
                .Include(p => p.Employee)
                    .ThenInclude(emp => emp!.Designation)
                .Where(p => p.BranchId == branchId &&
                            p.PaymentStatus == "Paid" &&
                            p.PaymentDate.HasValue &&
                            p.PaymentDate.Value >= start &&
                            p.PaymentDate.Value <= end);

            var payrolls = await payrollQuery.ToListAsync();
            foreach (var p in payrolls)
            {
                items.Add(new DayBookEntryDto
                {
                    Id = $"PAY-{p.Id}",
                    Date = p.PaymentDate!.Value,
                    RefNo = !string.IsNullOrEmpty(p.SalarySlipNo) ? p.SalarySlipNo : $"PAY/{p.Id:D4}",
                    Category = "Staff Salary",
                    Particulars = $"Salary: {p.Employee?.FullName ?? "Staff"} ({p.PayrollMonth}/{p.PayrollYear})",
                    PartyName = p.Employee?.FullName ?? "",
                    Type = "Outflow", // Debit
                    InflowAmount = 0,
                    OutflowAmount = p.NetSalary,
                    PaymentMode = p.PaymentMode ?? "Bank Transfer",
                    ProcessedBy = "Accounts Dept",
                    Details = $"Designation: {p.Employee?.Designation?.Name ?? "Staff"} | Ref: {p.TransactionReference ?? "N/A"}"
                });
            }

            // Filter by type if requested
            if (!string.IsNullOrWhiteSpace(transactionType) && transactionType != "All")
            {
                items = items.Where(i => i.Type.Equals(transactionType, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            // Filter by payment mode if requested
            if (!string.IsNullOrWhiteSpace(paymentMode) && paymentMode != "All")
            {
                items = items.Where(i => i.PaymentMode.Contains(paymentMode, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            // Sort chronologically ascending to calculate running balance
            var sorted = items.OrderBy(i => i.Date).ToList();

            decimal runningBalance = 0;
            foreach (var entry in sorted)
            {
                runningBalance += (entry.InflowAmount - entry.OutflowAmount);
                entry.RunningBalance = runningBalance;
            }

            // Return latest first for user view
            var finalResult = sorted.OrderByDescending(i => i.Date).ToList();

            decimal totalInflow = items.Sum(i => i.InflowAmount);
            decimal totalOutflow = items.Sum(i => i.OutflowAmount);
            decimal netBalance = totalInflow - totalOutflow;

            return Ok(new
            {
                success = true,
                data = new
                {
                    totalInflow,
                    totalOutflow,
                    netBalance,
                    entriesCount = finalResult.Count,
                    entries = finalResult
                }
            });
        }

        /// <summary>
        /// Comprehensive Enquiries Report with Source, Status & Conversion details
        /// </summary>
        [HttpGet("enquiry-report")]
        public async Task<IActionResult> GetEnquiryReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] long? classId,
            [FromQuery] EnquiryStatus? status)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var start = startDate?.Date ?? DateTime.UtcNow.AddMonths(-1).Date;
            var end = (endDate?.Date ?? DateTime.UtcNow.Date).AddDays(1).AddTicks(-1);

            var query = _context.Enquiries
                .Include(e => e.Class)
                .Where(e => e.BranchId == branchId &&
                            e.CreatedOn >= start &&
                            e.CreatedOn <= end);

            if (yearId > 0)
            {
                query = query.Where(e => e.AcademicYearId == yearId);
            }

            if (classId.HasValue && classId.Value > 0)
            {
                query = query.Where(e => e.ClassId == classId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(e => e.Status == status.Value);
            }

            var enquiries = await query.OrderByDescending(e => e.CreatedOn).ToListAsync();

            // Status grouping
            var statusCounts = enquiries.GroupBy(e => e.Status)
                .ToDictionary(g => g.Key.ToString(), g => g.Count());

            // Source grouping
            var sourceCounts = enquiries.GroupBy(e => !string.IsNullOrEmpty(e.Source) ? e.Source : "Direct / Walk-in")
                .ToDictionary(g => g.Key, g => g.Count());

            // Class-wise grouping
            var classCounts = enquiries.GroupBy(e => e.Class?.Name ?? "Unassigned")
                .ToDictionary(g => g.Key, g => g.Count());

            var items = enquiries.Select(e => new
            {
                id = e.Id,
                enquiryNo = e.EnquiryNo,
                studentName = e.StudentName,
                guardianName = e.GuardianName,
                mobile = e.Mobile,
                email = e.Email,
                classId = e.ClassId,
                className = e.Class?.Name ?? "—",
                source = !string.IsNullOrEmpty(e.Source) ? e.Source : "Direct / Walk-in",
                status = e.Status.ToString(),
                createdOn = e.CreatedOn,
                nextFollowupDate = e.NextFollowupDate,
                notes = e.Notes,
                isConverted = e.Status == EnquiryStatus.Converted || e.ConvertedStudentId.HasValue,
                convertedStudentId = e.ConvertedStudentId
            }).ToList();

            int total = items.Count;
            int converted = items.Count(i => i.isConverted);
            double convRate = total > 0 ? Math.Round(((double)converted / total) * 100, 1) : 0;

            return Ok(new
            {
                success = true,
                data = new
                {
                    totalEnquiries = total,
                    convertedCount = converted,
                    conversionRate = convRate,
                    statusCounts,
                    sourceCounts,
                    classCounts,
                    items
                }
            });
        }

        /// <summary>
        /// Comprehensive Admissions Report
        /// </summary>
        [HttpGet("admission-report")]
        public async Task<IActionResult> GetAdmissionReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] long? classId,
            [FromQuery] long? sectionId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var start = startDate?.Date ?? DateTime.UtcNow.AddMonths(-3).Date;
            var end = (endDate?.Date ?? DateTime.UtcNow.Date).AddDays(1).AddTicks(-1);

            // Fetch students enrolled in this session
            var enrollQuery = _context.StudentEnrollments
                .Include(se => se.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(se => se.Class)
                .Include(se => se.Section)
                .Where(se => se.Student != null &&
                             se.Student.BranchId == branchId &&
                             se.AcademicYearId == yearId &&
                             se.Student.AdmissionDate >= start &&
                             se.Student.AdmissionDate <= end);

            if (classId.HasValue && classId.Value > 0)
            {
                enrollQuery = enrollQuery.Where(se => se.ClassId == classId.Value);
            }

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                enrollQuery = enrollQuery.Where(se => se.SectionId == sectionId.Value);
            }

            var enrollments = await enrollQuery.OrderByDescending(se => se.Student!.AdmissionDate).ToListAsync();

            var studentsList = enrollments.Select(e =>
            {
                var guardian = e.Student?.Guardians.FirstOrDefault(g => g.IsPrimary) ?? e.Student?.Guardians.FirstOrDefault();
                return new
                {
                    id = e.StudentId,
                    admissionNo = e.Student?.AdmissionNo ?? "—",
                    fullName = e.Student?.FullName ?? "—",
                    gender = e.Student?.Gender ?? "—",
                    className = e.Class?.Name ?? "—",
                    sectionName = e.Section?.Name ?? "—",
                    rollNo = e.RollNo,
                    admissionDate = e.Student?.AdmissionDate ?? e.CreatedOn,
                    guardianName = guardian?.Name ?? "—",
                    guardianMobile = guardian?.Mobile ?? "—",
                    status = e.Status == StudentStatus.Active ? "Active" : "Inactive"
                };
            }).Cast<object>().ToList();

            // If enrollments query is empty, fallback to Students table
            if (!studentsList.Any())
            {
                var fallbackStudents = await _context.Students
                    .Include(s => s.Guardians)
                    .Include(s => s.Enrollments)
                        .ThenInclude(enr => enr.Class)
                    .Include(s => s.Enrollments)
                        .ThenInclude(enr => enr.Section)
                    .Where(s => s.BranchId == branchId && s.AdmissionDate >= start && s.AdmissionDate <= end)
                    .OrderByDescending(s => s.AdmissionDate)
                    .ToListAsync();

                studentsList = fallbackStudents.Select(s =>
                {
                    var guardian = s.Guardians.FirstOrDefault(g => g.IsPrimary) ?? s.Guardians.FirstOrDefault();
                    var enr = s.Enrollments.FirstOrDefault();
                    return new
                    {
                        id = s.Id,
                        admissionNo = s.AdmissionNo,
                        fullName = s.FullName,
                        gender = s.Gender,
                        className = enr?.Class?.Name ?? "—",
                        sectionName = enr?.Section?.Name ?? "—",
                        rollNo = enr?.RollNo,
                        admissionDate = s.AdmissionDate,
                        guardianName = guardian?.Name ?? "—",
                        guardianMobile = guardian?.Mobile ?? "—",
                        status = s.Status == StudentStatus.Active ? "Active" : "Inactive"
                    };
                }).Cast<object>().ToList();
            }

            return Ok(new
            {
                success = true,
                data = new
                {
                    totalAdmissions = studentsList.Count,
                    students = studentsList
                }
            });
        }
    }

    public class DayBookEntryDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string RefNo { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Particulars { get; set; } = string.Empty;
        public string PartyName { get; set; } = string.Empty;
        public string Type { get; set; } = "Inflow"; // "Inflow" or "Outflow"
        public decimal InflowAmount { get; set; }
        public decimal OutflowAmount { get; set; }
        public decimal RunningBalance { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string ProcessedBy { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
    }
}
