using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.API.Filters;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.API.Helpers;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/fees/reports")]
    [Authorize]
    public class FeeReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public FeeReportsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("daily-collection")]
        [HasPermission("FeeReports", "View")]
        public async Task<ActionResult<ApiResponse<List<DailyCollectionReportRowDto>>>> GetDailyCollection(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] FeePaymentMode? paymentMode = null)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var start = startDate?.Date ?? DateTime.UtcNow.Date;
            var end = (endDate?.Date ?? DateTime.UtcNow.Date).AddDays(1).AddTicks(-1);

            var query = _context.FeeReceipts
                .Include(r => r.Student)
                .Include(r => r.Class)
                .Include(r => r.Section)
                .Include(r => r.Payments)
                .Where(r => r.BranchId == branchId &&
                            r.AcademicYearId == yearId &&
                            r.ReceiptDate >= start &&
                            r.ReceiptDate <= end);

            if (paymentMode.HasValue)
            {
                query = query.Where(r => r.Payments.Any(p => p.PaymentMode == paymentMode.Value));
            }

            var receipts = await query
                .OrderByDescending(r => r.ReceiptDate)
                .ToListAsync();

            // Resolve cashier / collector user names
            var userIds = receipts.Select(r => r.CreatedBy).Distinct().ToList();
            var userDict = await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => !string.IsNullOrEmpty(u.FullName) ? u.FullName : u.Username);

            var rows = receipts.Select(r => new DailyCollectionReportRowDto
            {
                ReceiptId = r.Id,
                ReceiptNo = r.ReceiptNo,
                ReceiptDate = DateTime.SpecifyKind(r.ReceiptDate, DateTimeKind.Utc),
                AdmissionNo = r.Student?.AdmissionNo ?? "",
                StudentName = r.Student?.FullName ?? "",
                ClassId = r.ClassId,
                ClassName = r.Class?.Name ?? "",
                ClassSection = $"{r.Class?.Name ?? ""} - {r.Section?.Name ?? ""}".Trim(' ', '-'),
                TotalDue = r.TotalDue,
                TotalPaid = r.TotalPaid,
                TotalDiscount = r.TotalDiscount,
                TotalFine = r.TotalFine,
                PaymentModes = string.Join(", ", r.Payments.Select(p => p.PaymentMode.ToString())),
                Payments = r.Payments.Select(p => new FeePaymentModeItemDto
                {
                    Mode = p.PaymentMode.ToString(),
                    Amount = p.Amount,
                    TransactionRef = p.TransactionRef
                }).ToList(),
                Status = r.Status,
                CreatedBy = r.CreatedBy,
                CollectedBy = (userDict.TryGetValue(r.CreatedBy, out var cashierName) && !string.IsNullOrEmpty(cashierName))
                    ? cashierName
                    : "Cashier"
            }).ToList();

            return Ok(ApiResponse<List<DailyCollectionReportRowDto>>.Ok(rows));
        }

        [HttpGet("defaulters")]
        [HasPermission("FeeReports", "View")]
        public async Task<ActionResult<ApiResponse<List<DefaulterReportRowDto>>>> GetDefaulters(
            [FromQuery] long? classId,
            [FromQuery] long? sectionId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var today = DateTime.UtcNow.Date;

            // Fetch fine rules
            var fineRules = await _context.FineRules
                .Where(f => f.BranchId == branchId && f.AcademicYearId == yearId)
                .ToListAsync();

            // Query overdue dues (Installment.DueDate < today and BalanceAmount > 0)
            var duesQuery = _context.StudentFeeDues
                .Include(d => d.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(d => d.Class)
                .Include(d => d.Installment)
                .Where(d => d.BranchId == branchId &&
                            d.AcademicYearId == yearId &&
                            d.BalanceAmount > 0 &&
                            d.Installment!.DueDate < today);

            if (classId.HasValue) duesQuery = duesQuery.Where(d => d.ClassId == classId.Value);

            var overdueDues = await duesQuery.ToListAsync();

            var grouped = overdueDues.GroupBy(d => d.StudentId);
            var result = new List<DefaulterReportRowDto>();

            foreach (var g in grouped)
            {
                var first = g.First();
                var student = first.Student;
                var guardian = student?.Guardians.FirstOrDefault(grd => grd.IsPrimary) ?? student?.Guardians.FirstOrDefault();

                decimal totalOverdue = g.Sum(d => d.BalanceAmount);
                decimal totalFine = 0;
                var installmentsList = new List<string>();

                // Calculate fine once per overdue installment/month
                var studentInstGroups = g.GroupBy(d => d.InstallmentId);
                foreach (var instG in studentInstGroups)
                {
                    var instFirst = instG.First();
                    installmentsList.Add(instFirst.Installment?.Name ?? "");

                    var rule = fineRules.FirstOrDefault(r => r.InstallmentId == instG.Key);
                    if (rule != null && instFirst.Installment != null)
                    {
                        var cutoff = instFirst.Installment.DueDate.AddDays(rule.GraceDays);
                        if (today > cutoff)
                        {
                            if (rule.FineType == FineType.FixedAmount) totalFine += rule.Amount;
                            else totalFine += (today - cutoff).Days * rule.Amount;
                        }
                    }
                }

                result.Add(new DefaulterReportRowDto
                {
                    StudentId = g.Key,
                    AdmissionNo = student?.AdmissionNo ?? "",
                    StudentName = student?.FullName ?? "",
                    ClassName = first.Class?.Name ?? "",
                    SectionName = "",
                    GuardianName = guardian?.Name ?? "",
                    GuardianMobile = guardian?.Mobile ?? "",
                    OverdueAmount = totalOverdue,
                    OverdueFine = totalFine,
                    OverdueInstallments = string.Join(", ", installmentsList.Distinct())
                });
            }

            return Ok(ApiResponse<List<DefaulterReportRowDto>>.Ok(result.OrderByDescending(r => r.TotalOverdue).ToList()));
        }

        [HttpGet("class-month-status")]
        [HasPermission("FeeReports", "View")]
        public async Task<ActionResult<ApiResponse<ClassMonthFeeStatusReportDto>>> GetClassMonthStatus(
            [FromQuery] long? classId,
            [FromQuery] long? sectionId,
            [FromQuery] long? installmentId,
            [FromQuery] long? feeInstallmentId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var today = DateTime.UtcNow.Date;

            var effectiveInstallmentId = installmentId ?? feeInstallmentId;

            // Fetch fine rules for academic year
            var fineRules = await _context.FineRules
                .Where(f => f.BranchId == branchId && f.AcademicYearId == yearId)
                .ToListAsync();

            // Query student fee dues
            var duesQuery = _context.StudentFeeDues
                .Include(d => d.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(d => d.Student)
                    .ThenInclude(s => s!.Enrollments)
                        .ThenInclude(e => e.Section)
                .Include(d => d.Class)
                .Include(d => d.Installment)
                .Where(d => d.BranchId == branchId && d.AcademicYearId == yearId);

            if (classId.HasValue && classId.Value > 0)
            {
                duesQuery = duesQuery.Where(d => d.ClassId == classId.Value);
            }

            if (effectiveInstallmentId.HasValue && effectiveInstallmentId.Value > 0)
            {
                duesQuery = duesQuery.Where(d => d.InstallmentId == effectiveInstallmentId.Value);
            }

            var allDues = await duesQuery.ToListAsync();

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                allDues = allDues.Where(d =>
                {
                    var enrollment = d.Student?.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);
                    return enrollment?.SectionId == sectionId.Value;
                }).ToList();
            }

            // Also fetch recent receipts for last payment date & receipt no lookup
            var studentIds = allDues.Select(d => d.StudentId).Distinct().ToList();
            var latestReceipts = await _context.FeeReceipts
                .Where(r => r.BranchId == branchId && r.AcademicYearId == yearId && studentIds.Contains(r.StudentId) && r.Status != ReceiptStatus.Cancelled)
                .OrderByDescending(r => r.ReceiptDate)
                .Select(r => new { r.StudentId, r.ReceiptNo, r.ReceiptDate })
                .ToListAsync();

            var latestReceiptByStudent = latestReceipts
                .GroupBy(r => r.StudentId)
                .ToDictionary(g => g.Key, g => g.First());

            // Group dues by student
            var studentGroups = allDues.GroupBy(d => d.StudentId);
            var studentRows = new List<StudentFeeStatusRowDto>();

            foreach (var g in studentGroups)
            {
                var first = g.First();
                var student = first.Student;
                if (student == null) continue;

                var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);
                var guardian = student.Guardians.FirstOrDefault(grd => grd.IsPrimary) ?? student.Guardians.FirstOrDefault();

                decimal gross = g.Sum(d => d.OriginalAmount);
                decimal concession = g.Sum(d => d.ConcessionAmount);
                decimal net = Math.Max(0, gross - concession);
                decimal paid = g.Sum(d => d.PaidAmount);
                decimal remainingDue = g.Sum(d => d.BalanceAmount);

                decimal fine = 0;
                var overdueInstGroups = g.Where(x => x.BalanceAmount > 0 && x.Installment != null).GroupBy(x => x.InstallmentId);
                foreach (var instG in overdueInstGroups)
                {
                    var instFirst = instG.First();
                    var rule = fineRules.FirstOrDefault(r => r.InstallmentId == instG.Key);
                    if (rule != null && instFirst.Installment != null)
                    {
                        var cutoff = instFirst.Installment.DueDate.AddDays(rule.GraceDays);
                        if (today > cutoff)
                        {
                            if (rule.FineType == FineType.FixedAmount) fine += rule.Amount;
                            else fine += (today - cutoff).Days * rule.Amount;
                        }
                    }
                }

                string computedStatus = "Unpaid";
                if (remainingDue <= 0 && gross > 0)
                {
                    computedStatus = "Paid";
                }
                else if (paid > 0 && remainingDue > 0)
                {
                    computedStatus = "Partial";
                }

                latestReceiptByStudent.TryGetValue(student.Id, out var lastRcpt);

                studentRows.Add(new StudentFeeStatusRowDto
                {
                    StudentId = student.Id,
                    AdmissionNo = student.AdmissionNo,
                    RollNo = enrollment?.RollNo?.ToString(),
                    StudentName = student.FullName,
                    PhotoUrl = student.PhotoUrl,
                    ClassId = first.ClassId,
                    ClassName = first.Class?.Name ?? "",
                    SectionId = enrollment?.SectionId,
                    SectionName = enrollment?.Section?.Name ?? "",
                    GuardianName = guardian?.Name ?? "",
                    GuardianMobile = guardian?.Mobile ?? "",
                    GrossFee = gross,
                    ConcessionAmount = concession,
                    NetPayable = net,
                    PaidAmount = paid,
                    RemainingDue = remainingDue,
                    FineAmount = fine,
                    Status = computedStatus,
                    LastPaymentDate = lastRcpt?.ReceiptDate,
                    LastReceiptNo = lastRcpt?.ReceiptNo
                });
            }

            // Apply Status Filter
            var filtered = studentRows.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
            {
                var s = status.Trim().ToLower();
                if (s == "dues" || s == "defaulter" || s == "pending")
                {
                    filtered = filtered.Where(r => r.RemainingDue > 0);
                }
                else if (s == "paid")
                {
                    filtered = filtered.Where(r => r.Status == "Paid");
                }
                else if (s == "partial")
                {
                    filtered = filtered.Where(r => r.Status == "Partial");
                }
            }

            // Apply Search Filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                filtered = filtered.Where(r =>
                    r.StudentName.ToLower().Contains(q) ||
                    r.AdmissionNo.ToLower().Contains(q) ||
                    (!string.IsNullOrEmpty(r.RollNo) && r.RollNo.ToLower().Contains(q)) ||
                    r.GuardianMobile.Contains(q) ||
                    r.GuardianName.ToLower().Contains(q)
                );
            }

            var finalList = filtered
                .OrderBy(r => r.ClassName)
                .ThenBy(r => r.SectionName)
                .ThenBy(r => r.RollNo)
                .ThenBy(r => r.StudentName)
                .ToList();

            var summary = new ClassMonthFeeSummaryDto
            {
                TotalStudents = finalList.Count,
                PaidCount = finalList.Count(r => r.Status == "Paid"),
                PartialCount = finalList.Count(r => r.Status == "Partial"),
                UnpaidCount = finalList.Count(r => r.Status == "Unpaid"),
                TotalGrossFee = finalList.Sum(r => r.GrossFee),
                TotalConcession = finalList.Sum(r => r.ConcessionAmount),
                TotalNetPayable = finalList.Sum(r => r.NetPayable),
                TotalPaid = finalList.Sum(r => r.PaidAmount),
                TotalRemainingDues = finalList.Sum(r => r.RemainingDue),
                TotalFine = finalList.Sum(r => r.FineAmount)
            };

            var response = new ClassMonthFeeStatusReportDto
            {
                Summary = summary,
                Students = finalList
            };

            return Ok(ApiResponse<ClassMonthFeeStatusReportDto>.Ok(response));
        }

        [HttpGet("students/{studentId}/history")]
        [HasPermission("FeeReports", "View")]
        public async Task<ActionResult<ApiResponse<StudentFullFeeHistoryDto>>> GetStudentFullHistory(long studentId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var today = DateTime.UtcNow.Date;

            var student = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .FirstOrDefaultAsync(s => s.Id == studentId && s.BranchId == branchId);

            if (student == null)
            {
                return NotFound(ApiResponse<StudentFullFeeHistoryDto>.Fail("Student not found."));
            }

            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.Id == yearId);
            var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);
            var guardian = student.Guardians.FirstOrDefault(g => g.IsPrimary) ?? student.Guardians.FirstOrDefault();

            // Fetch Fine Rules
            var fineRules = await _context.FineRules
                .Where(f => f.BranchId == branchId && f.AcademicYearId == yearId)
                .ToListAsync();

            // Fetch all StudentFeeDues for this academic year
            var dues = await _context.StudentFeeDues
                .Include(d => d.FeeHead)
                .Include(d => d.Installment)
                .Where(d => d.BranchId == branchId &&
                            d.AcademicYearId == yearId &&
                            d.StudentId == studentId)
                .OrderBy(d => d.Installment!.DisplayOrder)
                .ThenBy(d => d.Installment!.DueDate)
                .ToListAsync();

            if (!dues.Any() && enrollment != null)
            {
                await FeeAssignmentHelper.AutoAssignStudentDuesAsync(
                    _context,
                    branchId,
                    yearId,
                    student.Id,
                    enrollment.ClassId,
                    enrollment.FeeGroupId);

                dues = await _context.StudentFeeDues
                    .Include(d => d.FeeHead)
                    .Include(d => d.Installment)
                    .Where(d => d.BranchId == branchId &&
                                d.AcademicYearId == yearId &&
                                d.StudentId == studentId)
                    .OrderBy(d => d.Installment!.DisplayOrder)
                    .ThenBy(d => d.Installment!.DueDate)
                    .ToListAsync();
            }

            // Group dues by Installment
            var installmentGroups = dues.GroupBy(d => d.InstallmentId);
            var installmentDtos = new List<StudentInstallmentHistoryDto>();

            decimal grandGross = 0;
            decimal grandConcession = 0;
            decimal grandPaid = 0;
            decimal grandDue = 0;
            decimal grandFine = 0;

            foreach (var g in installmentGroups)
            {
                var first = g.First();
                var inst = first.Installment;
                decimal instGross = g.Sum(d => d.OriginalAmount);
                decimal instConc = g.Sum(d => d.ConcessionAmount);
                decimal instNet = Math.Max(0, instGross - instConc);
                decimal instPaid = g.Sum(d => d.PaidAmount);
                decimal instDue = g.Sum(d => d.BalanceAmount);

                decimal instFine = 0;
                if (instDue > 0 && inst != null)
                {
                    var rule = fineRules.FirstOrDefault(r => r.InstallmentId == inst.Id);
                    if (rule != null)
                    {
                        var cutoff = inst.DueDate.AddDays(rule.GraceDays);
                        if (today > cutoff)
                        {
                            if (rule.FineType == FineType.FixedAmount) instFine = rule.Amount;
                            else instFine = (today - cutoff).Days * rule.Amount;
                        }
                    }
                }

                string instStatus = "Unpaid";
                if (instDue <= 0 && instGross > 0) instStatus = "Paid";
                else if (instPaid > 0 && instDue > 0) instStatus = "Partial";

                grandGross += instGross;
                grandConcession += instConc;
                grandPaid += instPaid;
                grandDue += instDue;
                grandFine += instFine;

                var headDtos = g.Select(d => new StudentFeeHeadDetailDto
                {
                    DueId = d.Id,
                    FeeHeadId = d.FeeHeadId,
                    FeeHeadName = d.FeeHead?.Name ?? "",
                    IsOptional = d.FeeHead?.IsOptional ?? false,
                    OriginalAmount = d.OriginalAmount,
                    ConcessionAmount = d.ConcessionAmount,
                    PaidAmount = d.PaidAmount,
                    BalanceAmount = d.BalanceAmount,
                    Status = d.Status.ToString()
                }).ToList();

                installmentDtos.Add(new StudentInstallmentHistoryDto
                {
                    InstallmentId = inst?.Id ?? first.InstallmentId,
                    InstallmentName = inst?.Name ?? "",
                    DueDate = inst?.DueDate ?? DateTime.MinValue,
                    DisplayOrder = inst?.DisplayOrder ?? 0,
                    TotalOriginal = instGross,
                    TotalConcession = instConc,
                    NetPayable = instNet,
                    TotalPaid = instPaid,
                    BalanceDue = instDue,
                    FineAmount = instFine,
                    Status = instStatus,
                    FeeHeads = headDtos
                });
            }

            // Fetch all Receipts for this student
            var receipts = await _context.FeeReceipts
                .Include(r => r.Payments)
                .Include(r => r.Details)
                    .ThenInclude(dt => dt.FeeHead)
                .Include(r => r.Details)
                    .ThenInclude(dt => dt.Installment)
                .Where(r => r.BranchId == branchId &&
                            r.AcademicYearId == yearId &&
                            r.StudentId == studentId)
                .OrderByDescending(r => r.ReceiptDate)
                .ToListAsync();

            var userIds = receipts.Select(r => r.CreatedBy).Distinct().ToList();
            var userDict = await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => !string.IsNullOrEmpty(u.FullName) ? u.FullName : u.Username);

            var receiptDtos = receipts.Select(r => new StudentReceiptHistoryDto
            {
                ReceiptId = r.Id,
                ReceiptNo = r.ReceiptNo,
                ReceiptDate = r.ReceiptDate,
                TotalPaid = r.TotalPaid,
                PaymentModes = string.Join(", ", r.Payments.Select(p => p.PaymentMode.ToString())),
                Status = r.Status.ToString(),
                CollectedBy = (userDict.TryGetValue(r.CreatedBy, out var cName) && !string.IsNullOrEmpty(cName)) ? cName : "Cashier",
                Remarks = r.Remarks,
                Payments = r.Payments.Select(p => new StudentReceiptPaymentItemDto
                {
                    Mode = p.PaymentMode.ToString(),
                    Amount = p.Amount,
                    TransactionRef = p.TransactionRef,
                    BankName = p.BankName,
                    ChequeNo = p.ChequeNo
                }).ToList(),
                Items = r.Details.Select(dt => new StudentReceiptHeadItemDto
                {
                    FeeHeadName = dt.FeeHead?.Name ?? "",
                    InstallmentName = dt.Installment?.Name ?? "",
                    AmountPaid = dt.AmountPaid,
                    FinePaid = dt.FinePaid,
                    BalanceCarried = dt.BalanceCarried
                }).ToList()
            }).ToList();

            var result = new StudentFullFeeHistoryDto
            {
                StudentId = student.Id,
                AdmissionNo = student.AdmissionNo,
                RollNo = enrollment?.RollNo?.ToString(),
                StudentName = student.FullName,
                PhotoUrl = student.PhotoUrl,
                ClassName = enrollment?.Class?.Name ?? "",
                SectionName = enrollment?.Section?.Name ?? "",
                GuardianName = guardian?.Name ?? "",
                GuardianMobile = guardian?.Mobile ?? "",
                AcademicSession = academicYear?.Name ?? "2026-27",
                TotalAnnualFee = grandGross,
                TotalAnnualConcession = grandConcession,
                NetAnnualPayable = Math.Max(0, grandGross - grandConcession),
                TotalAnnualPaid = grandPaid,
                TotalOutstandingDues = grandDue,
                TotalFine = grandFine,
                Installments = installmentDtos.OrderBy(i => i.DisplayOrder).ThenBy(i => i.DueDate).ToList(),
                Receipts = receiptDtos
            };

            return Ok(ApiResponse<StudentFullFeeHistoryDto>.Ok(result));
        }
    }
}
