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
    [Route("api/fees")]
    [Authorize]
    public class FeeCollectionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly INumberingSeriesService _numberingService;

        public FeeCollectionController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            INumberingSeriesService numberingService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _numberingService = numberingService;
        }

        [HttpGet("students/{studentId}/dues")]
        [HasPermission("FeeCollection", "View")]
        public async Task<ActionResult<ApiResponse<StudentFeeDuesSummaryDto>>> GetStudentDues(long studentId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // Student with current enrollment
            var student = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .FirstOrDefaultAsync(s => s.Id == studentId && s.BranchId == branchId);

            if (student == null) return NotFound(ApiResponse<StudentFeeDuesSummaryDto>.Fail("Student not found."));

            var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);

            // Fetch Dues
            var dues = await _context.StudentFeeDues
                .Include(d => d.FeeHead)
                .Include(d => d.Installment)
                .Where(d => d.BranchId == branchId &&
                            d.AcademicYearId == yearId &&
                            d.StudentId == studentId)
                .OrderBy(d => d.Installment!.DisplayOrder)
                .ThenBy(d => d.Installment!.DueDate)
                .ToListAsync();

            // Always synchronize/assign fees to catch new transport allocations or fee changes
            if (enrollment != null)
            {
                try
                {
                    await FeeAssignmentHelper.AutoAssignStudentDuesAsync(
                        _context,
                        branchId,
                        yearId,
                        student.Id,
                        enrollment.ClassId,
                        enrollment.FeeGroupId);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[FeeCollectionController] AutoAssign error for student {studentId}: {ex.Message}");
                }

                dues = await _context.StudentFeeDues
                    .Include(d => d.FeeHead)
                    .Include(d => d.Installment)
                    .Where(d => d.BranchId == branchId &&
                                d.AcademicYearId == yearId &&
                                d.StudentId == studentId)
                    .OrderBy(d => d.Installment!.DisplayOrder)
                    .ThenBy(d => d.Installment!.DueDate)
                    .ThenBy(d => d.FeeHead!.Name)
                    .ToListAsync();
            }

            // Synchronize active approved concessions with StudentFeeDues
            var activeConcessions = await _context.FeeConcessions
                .Where(c => c.StudentId == student.Id && c.BranchId == branchId && c.AcademicYearId == yearId && c.IsApproved && c.IsActive)
                .ToListAsync();

            bool duesUpdated = false;
            var activeConcHeadIds = activeConcessions.Select(c => c.FeeHeadId).ToHashSet();

            // Revert any dues whose concessions were deleted or revoked
            foreach (var due in dues.Where(d => !activeConcHeadIds.Contains(d.FeeHeadId) && d.ConcessionAmount > 0))
            {
                due.ConcessionAmount = 0;
                due.BalanceAmount = Math.Max(0, due.OriginalAmount - due.PaidAmount);
                due.Status = due.BalanceAmount <= 0 ? DueStatus.Paid : (due.PaidAmount > 0 ? DueStatus.PartiallyPaid : DueStatus.Unpaid);
                duesUpdated = true;
            }

            foreach (var conc in activeConcessions)
            {
                var matchingDues = dues.Where(d => d.FeeHeadId == conc.FeeHeadId).ToList();

                foreach (var due in matchingDues)
                {
                    decimal expectedConc = 0;
                    if (conc.Type == ConcessionType.Percentage)
                    {
                        expectedConc = Math.Round((due.OriginalAmount * conc.Value) / 100m, 2);
                    }
                    else
                    {
                        expectedConc = Math.Min(conc.Value, due.OriginalAmount);
                    }

                    if (due.ConcessionAmount != expectedConc)
                    {
                        due.ConcessionAmount = expectedConc;
                        due.BalanceAmount = Math.Max(0, due.OriginalAmount - due.ConcessionAmount - due.PaidAmount);
                        due.Status = due.BalanceAmount <= 0 ? DueStatus.Paid : (due.PaidAmount > 0 ? DueStatus.PartiallyPaid : DueStatus.Unpaid);
                        duesUpdated = true;
                    }
                }
            }

            if (duesUpdated)
            {
                await _context.SaveChangesAsync();
            }

            // Fetch Fine Rules
            var fineRules = await _context.FineRules
                .Where(f => f.BranchId == branchId && f.AcademicYearId == yearId)
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            decimal totalOutstanding = 0;
            decimal totalFine = 0;
            decimal totalPaid = 0;

            var dueItems = new List<StudentDueItemDto>();

            // Calculate Late Fine ONCE per installment/month (not per individual fee head item)
            var duesByInstallment = dues.GroupBy(d => d.InstallmentId);

            foreach (var instGroup in duesByInstallment)
            {
                var first = instGroup.First();
                var installment = first.Installment;
                var instBalance = instGroup.Sum(d => d.BalanceAmount);
                decimal instFine = 0;

                // Calculate fine once for this installment if total balance > 0 and due date + grace days passed
                if (instBalance > 0 && installment != null)
                {
                    var rule = fineRules.FirstOrDefault(r => r.InstallmentId == instGroup.Key);
                    var graceDays = rule?.GraceDays ?? 0;
                    var cutoffDate = installment.DueDate.Date.AddDays(graceDays);

                    if (today > cutoffDate && rule != null)
                    {
                        if (rule.FineType == FineType.FixedAmount)
                        {
                            instFine = rule.Amount;
                        }
                        else if (rule.FineType == FineType.PerDay)
                        {
                            var daysLate = (today - cutoffDate).Days;
                            instFine = daysLate * rule.Amount;
                        }
                    }
                }

                totalFine += instFine;
                bool fineAssigned = false;

                foreach (var d in instGroup)
                {
                    decimal itemFine = 0;
                    // Assign the single monthly fine to the first unpaid item of this installment
                    if (!fineAssigned && d.BalanceAmount > 0 && instFine > 0)
                    {
                        itemFine = instFine;
                        fineAssigned = true;
                    }

                    totalOutstanding += d.BalanceAmount;
                    totalPaid += d.PaidAmount;

                    dueItems.Add(new StudentDueItemDto
                    {
                        DueId = d.Id,
                        FeeHeadId = d.FeeHeadId,
                        FeeHeadName = d.FeeHead?.Name ?? "",
                        IsOptional = d.FeeHead?.IsOptional ?? false,
                        InstallmentId = d.InstallmentId,
                        InstallmentName = d.Installment?.Name ?? "",
                        DisplayOrder = d.Installment?.DisplayOrder ?? 0,
                        DueDate = d.Installment?.DueDate ?? DateTime.MinValue,
                        OriginalAmount = d.OriginalAmount,
                        ConcessionAmount = d.ConcessionAmount,
                        PaidAmount = d.PaidAmount,
                        BalanceAmount = d.BalanceAmount,
                        FineAmount = itemFine,
                        Status = d.Status
                    });
                }
            }

            var primaryGuardian = student.Guardians.FirstOrDefault(g => g.IsPrimary) ?? student.Guardians.FirstOrDefault();

            var summary = new StudentFeeDuesSummaryDto
            {
                StudentId = student.Id,
                AdmissionNo = student.AdmissionNo,
                StudentName = student.FullName,
                ClassName = enrollment?.Class?.Name ?? "",
                SectionName = enrollment?.Section?.Name ?? "",
                RollNo = enrollment?.RollNo,
                GuardianName = primaryGuardian?.Name ?? "",
                GuardianMobile = primaryGuardian?.Mobile ?? "",
                TotalOutstanding = totalOutstanding,
                TotalFine = totalFine,
                TotalPaid = totalPaid,
                Dues = dueItems
            };

            return Ok(ApiResponse<StudentFeeDuesSummaryDto>.Ok(summary));
        }

        [HttpPost("collect")]
        [HasPermission("FeeCollection", "Add")]
        public async Task<ActionResult<ApiResponse<ReceiptPrintDto>>> CollectFee([FromBody] CollectFeeRequestDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (request.DuesToPay == null || !request.DuesToPay.Any())
            {
                return BadRequest(ApiResponse<ReceiptPrintDto>.Fail("No dues selected for payment."));
            }
            if (request.Payments == null || !request.Payments.Any())
            {
                return BadRequest(ApiResponse<ReceiptPrintDto>.Fail("At least one payment method is required."));
            }

            var totalDuesPaid = request.DuesToPay.Sum(d => d.AmountToPay);
            var totalFinePaid = request.DuesToPay.Sum(d => d.FineToPay);
            var totalPayable = totalDuesPaid + totalFinePaid;
            var totalPaidByModes = request.Payments.Sum(p => p.Amount);

            if (totalPaidByModes != totalPayable)
            {
                return BadRequest(ApiResponse<ReceiptPrintDto>.Fail($"Total payment modes (₹{totalPaidByModes}) must match total payable dues + fine (₹{totalPayable})."));
            }

            // Strict Sequential Dues (FIFO) validation:
            // Ensure no earlier unpaid mandatory installment is skipped when paying later installments
            var paidDueIds = request.DuesToPay.Select(d => d.DueId).ToList();
            var targetDues = await _context.StudentFeeDues
                .Include(d => d.Installment)
                .Where(d => paidDueIds.Contains(d.Id))
                .ToListAsync();

            if (targetDues.Any())
            {
                // Prevent duplicate DueId in the request
                if (request.DuesToPay.GroupBy(d => d.DueId).Any(g => g.Count() > 1))
                {
                    return BadRequest(ApiResponse<ReceiptPrintDto>.Fail("Duplicate fee due entries detected in payment request. Each due can only be paid once per receipt."));
                }

                // Validate that all dues exist, belong to this student and branch, and are not already fully paid
                foreach (var item in request.DuesToPay)
                {
                    var due = targetDues.FirstOrDefault(d => d.Id == item.DueId);
                    if (due == null)
                    {
                        return BadRequest(ApiResponse<ReceiptPrintDto>.Fail($"Fee due ID #{item.DueId} not found or does not exist."));
                    }
                    if (due.StudentId != request.StudentId || due.BranchId != branchId)
                    {
                        return BadRequest(ApiResponse<ReceiptPrintDto>.Fail($"Fee due #{item.DueId} does not belong to the selected student."));
                    }
                    if (due.BalanceAmount <= 0 || due.Status == DueStatus.Paid)
                    {
                        return BadRequest(ApiResponse<ReceiptPrintDto>.Fail($"Fee due for '{due.FeeHead?.Name ?? "Item"}' ({due.Installment?.Name ?? "Installment"}) is already fully paid. Duplicate payment is not allowed."));
                    }
                    if (item.AmountToPay <= 0 && item.FineToPay <= 0)
                    {
                        return BadRequest(ApiResponse<ReceiptPrintDto>.Fail($"Payment amount for '{due.FeeHead?.Name ?? "Item"}' must be greater than zero."));
                    }
                    if (item.AmountToPay > due.BalanceAmount)
                    {
                        return BadRequest(ApiResponse<ReceiptPrintDto>.Fail($"Payment amount (₹{item.AmountToPay}) cannot exceed outstanding balance (₹{due.BalanceAmount}) for '{due.FeeHead?.Name ?? "Item"}'."));
                    }
                }

                var minTargetOrder = targetDues.Min(d => d.Installment?.DisplayOrder ?? 0);
                var minTargetDueDate = targetDues.Min(d => d.Installment?.DueDate ?? DateTime.MaxValue);

                var skippedOlderDue = await _context.StudentFeeDues
                    .Include(d => d.Installment)
                    .Include(d => d.FeeHead)
                    .Where(d => d.BranchId == branchId &&
                                d.AcademicYearId == yearId &&
                                d.StudentId == request.StudentId &&
                                d.BalanceAmount > 0 &&
                                (d.FeeHead == null || !d.FeeHead.IsOptional) &&
                                !paidDueIds.Contains(d.Id) &&
                                ((d.Installment != null && d.Installment.DisplayOrder < minTargetOrder) ||
                                 (d.Installment != null && d.Installment.DueDate < minTargetDueDate)))
                    .FirstOrDefaultAsync();

                if (skippedOlderDue != null)
                {
                    return BadRequest(ApiResponse<ReceiptPrintDto>.Fail(
                        $"Strict Sequential Dues Rule: Earlier unpaid month '{skippedOlderDue.Installment?.Name}' must be cleared before paying later months."));
                }
            }

            var branch = await _context.Branches.Include(b => b.School).FirstOrDefaultAsync(b => b.Id == branchId);
            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == yearId);
            var student = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .FirstOrDefaultAsync(s => s.Id == request.StudentId && s.BranchId == branchId);

            if (student == null) return NotFound(ApiResponse<ReceiptPrintDto>.Fail("Student not found."));

            var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);

            var branchCode = branch?.Code ?? "MAIN";
            var ayName = academicYear?.Name?.Replace("-", "") ?? DateTime.UtcNow.Year.ToString();

            // Execute in transactional strategy
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<ActionResult<ApiResponse<ReceiptPrintDto>>>(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var receiptNo = await _numberingService.GetNextNumberAsync(branchId, "FeeReceipt", branchCode, academicYear?.Name);

                    // Fetch dues being paid
                    var dueIds = request.DuesToPay.Select(d => d.DueId).ToList();
                    var dbDues = await _context.StudentFeeDues
                        .Include(d => d.FeeHead)
                        .Include(d => d.Installment)
                        .Where(d => dueIds.Contains(d.Id))
                        .ToListAsync();

                    var totalConcessionPaid = dbDues.Sum(d => d.ConcessionAmount);

                    var receipt = new FeeReceipt
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        ReceiptNo = receiptNo,
                        ReceiptDate = DateTime.UtcNow,
                        StudentId = student.Id,
                        ClassId = enrollment?.ClassId ?? 0,
                        SectionId = enrollment?.SectionId ?? 0,
                        TotalDue = totalDuesPaid,
                        TotalConcession = totalConcessionPaid,
                        TotalFine = totalFinePaid,
                        TotalPaid = totalPayable,
                        Status = ReceiptStatus.Paid,
                        Remarks = request.Remarks?.Trim(),
                        IsActive = true
                    };

                    _context.FeeReceipts.Add(receipt);
                    await _context.SaveChangesAsync();

                    var printItems = new List<ReceiptPrintItemDto>();

                    foreach (var item in request.DuesToPay)
                    {
                        var due = dbDues.FirstOrDefault(d => d.Id == item.DueId);
                        if (due != null)
                        {
                            due.PaidAmount += item.AmountToPay;
                            due.BalanceAmount -= item.AmountToPay;
                            due.Status = due.BalanceAmount <= 0 ? DueStatus.Paid : (due.PaidAmount > 0 ? DueStatus.PartiallyPaid : DueStatus.Unpaid);

                            var detail = new FeeReceiptDetail
                            {
                                FeeReceiptId = receipt.Id,
                                StudentFeeDueId = due.Id,
                                FeeHeadId = due.FeeHeadId,
                                InstallmentId = due.InstallmentId,
                                AmountPaid = item.AmountToPay,
                                FinePaid = item.FineToPay,
                                BalanceCarried = due.BalanceAmount,
                                IsActive = true
                            };

                            _context.FeeReceiptDetails.Add(detail);

                            printItems.Add(new ReceiptPrintItemDto
                            {
                                FeeHeadName = due.FeeHead?.Name ?? "Fee",
                                InstallmentName = due.Installment?.Name ?? "",
                                Month = due.Installment?.Name ?? "",
                                AmountPaid = item.AmountToPay,
                                FinePaid = item.FineToPay,
                                BalanceCarried = due.BalanceAmount
                            });
                        }
                    }

                    // Process Payment Modes (FR-5.4)
                    foreach (var pay in request.Payments)
                    {
                        var payment = new FeePayment
                        {
                            FeeReceiptId = receipt.Id,
                            PaymentMode = pay.Mode,
                            Amount = pay.Amount,
                            TransactionRef = pay.TransactionRef?.Trim(),
                            BankName = pay.BankName?.Trim(),
                            ChequeNo = pay.ChequeNo?.Trim(),
                            ChequeDate = pay.ChequeDate,
                            ChequeStatus = pay.Mode == FeePaymentMode.Cheque ? ChequeStatus.Pending : ChequeStatus.Cleared,
                            ClearedOn = pay.Mode != FeePaymentMode.Cheque ? DateTime.UtcNow : null,
                            IsActive = true
                        };
                        _context.FeePayments.Add(payment);
                    }

                    // Audit
                    _context.AuditLogs.Add(new AuditLog
                    {
                        UserId = _currentUserService.UserId,
                        Username = _currentUserService.Username,
                        Action = "FeeCollection",
                        Module = "Fees",
                        EntityName = "FeeReceipt",
                        RecordId = receipt.Id.ToString(),
                        NewValues = $"Receipt: {receiptNo}, Student: {student.FullName}, Paid: {totalPayable}",
                        IpAddress = _currentUserService.IpAddress,
                        BranchId = branchId
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var primaryGuardian = student.Guardians.FirstOrDefault(g => g.IsPrimary) ?? student.Guardians.FirstOrDefault();
                    var father = student.Guardians.FirstOrDefault(g => g.Relation != null && g.Relation.ToLower().Contains("father"))
                                 ?? primaryGuardian;

                    var months = printItems.Select(i => i.InstallmentName).Where(m => !string.IsNullOrWhiteSpace(m)).Distinct().ToList();
                    var monthStr = string.Join(", ", months);

                    var paymentModeStr = request.Payments != null && request.Payments.Any()
                        ? string.Join(", ", request.Payments.Select(p => p.Mode.ToString()).Distinct())
                        : "Cash";

                    var targetInstallmentIds = dbDues.Select(d => d.InstallmentId).Distinct().ToList();

                    var remainingDues = await _context.StudentFeeDues
                        .Where(d => d.StudentId == student.Id && d.BranchId == branchId && targetInstallmentIds.Contains(d.InstallmentId) && d.Status != DueStatus.Paid && d.IsActive)
                        .SumAsync(d => d.BalanceAmount);

                    var schoolName = !string.IsNullOrWhiteSpace(branch?.PrintHeader)
                        ? branch.PrintHeader
                        : (!string.IsNullOrWhiteSpace(branch?.School?.Name) ? branch.School.Name : "Kush Public School");

                    var branchAddress = !string.IsNullOrWhiteSpace(branch?.Address)
                        ? branch.Address
                        : (!string.IsNullOrWhiteSpace(branch?.School?.Address) ? branch.School.Address : "Plot No 999, Main road Surya Vihar, Part 3 Sec 91");

                    var contactPhone = !string.IsNullOrWhiteSpace(branch?.Phone)
                        ? branch.Phone
                        : (!string.IsNullOrWhiteSpace(branch?.School?.ContactNumber) ? branch.School.ContactNumber : "9911360909");

                    var logoUrl = !string.IsNullOrWhiteSpace(branch?.LogoUrl)
                        ? branch.LogoUrl
                        : branch?.School?.LogoUrl;

                    var printDto = new ReceiptPrintDto
                    {
                        ReceiptId = receipt.Id,
                        ReceiptNo = receipt.ReceiptNo,
                        ReceiptDate = receipt.ReceiptDate,
                        SchoolName = schoolName,
                        BranchName = branch?.Name ?? "Main Campus",
                        Address = branchAddress,
                        Contact = contactPhone,
                        LogoUrl = logoUrl,
                        CashierSignatureUrl = branch?.CashierSignatureUrl ?? branch?.AuthorizedSignatureUrl,
                        PrincipalSignatureUrl = branch?.PrincipalSignatureUrl,
                        AcademicYear = academicYear?.Name ?? "2026-27",
                        AdmissionNo = student.AdmissionNo,
                        StudentName = student.FullName,
                        ClassSection = $"{enrollment?.Class?.Name ?? ""} - {enrollment?.Section?.Name ?? ""}",
                        ClassName = enrollment?.Class?.Name ?? "",
                        RollNo = enrollment?.RollNo,
                        GuardianName = primaryGuardian?.Name ?? "",
                        FatherName = father?.Name ?? primaryGuardian?.Name ?? "",
                        GuardianMobile = primaryGuardian?.Mobile ?? "",
                        Month = monthStr,
                        PaymentModeName = paymentModeStr,
                        TotalDue = totalDuesPaid,
                        TotalConcession = totalConcessionPaid,
                        TotalFine = totalFinePaid,
                        TotalPaid = totalPayable,
                        RemainingTotalDues = remainingDues,
                        Status = receipt.Status,
                        Items = printItems,
                        Payments = request.Payments,
                        CollectedBy = _currentUserService.Username ?? "Cashier",
                        Remarks = receipt.Remarks
                    };

                    return Ok(ApiResponse<ReceiptPrintDto>.Ok(printDto, $"Fee collected successfully. Receipt No: {receiptNo}"));
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, ApiResponse<ReceiptPrintDto>.Fail($"Fee collection failed: {ex.Message}"));
                }
            });
        }

        [HttpGet("receipts/{id}/print")]
        [HasPermission("FeeCollection", "View")]
        public async Task<ActionResult<ApiResponse<ReceiptPrintDto>>> GetReceiptForPrint(long id)
        {
            var branchId = _currentUserService.BranchId;

            var receipt = await _context.FeeReceipts
                .Include(r => r.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(r => r.Class)
                .Include(r => r.Section)
                .Include(r => r.AcademicYear)
                .Include(r => r.Branch)
                    .ThenInclude(b => b!.School)
                .Include(r => r.Details)
                    .ThenInclude(d => d.FeeHead)
                .Include(r => r.Details)
                    .ThenInclude(d => d.Installment)
                .Include(r => r.Payments)
                .FirstOrDefaultAsync(r => r.Id == id && r.BranchId == branchId);

            if (receipt == null) return NotFound(ApiResponse<ReceiptPrintDto>.Fail("Receipt not found."));

            var primaryGuardian = receipt.Student?.Guardians.FirstOrDefault(g => g.IsPrimary) ?? receipt.Student?.Guardians.FirstOrDefault();
            var father = receipt.Student?.Guardians.FirstOrDefault(g => g.Relation != null && g.Relation.ToLower().Contains("father"))
                         ?? primaryGuardian;

            var months = receipt.Details.Select(d => d.Installment?.Name).Where(m => !string.IsNullOrWhiteSpace(m)).Distinct().ToList();
            var monthStr = string.Join(", ", months);

            var paymentModeStr = receipt.Payments != null && receipt.Payments.Any()
                ? string.Join(", ", receipt.Payments.Select(p => p.PaymentMode.ToString()).Distinct())
                : "Cash";

            var installmentIds = receipt.Details.Select(d => d.InstallmentId).Distinct().ToList();
            var remainingDues = 0m;
            if (receipt.StudentId > 0 && installmentIds.Any())
            {
                remainingDues = await _context.StudentFeeDues
                    .Where(d => d.StudentId == receipt.StudentId && d.BranchId == branchId && installmentIds.Contains(d.InstallmentId) && d.Status != DueStatus.Paid && d.IsActive)
                    .SumAsync(d => d.BalanceAmount);
            }

            var schoolName = !string.IsNullOrWhiteSpace(receipt.Branch?.PrintHeader)
                ? receipt.Branch.PrintHeader
                : (!string.IsNullOrWhiteSpace(receipt.Branch?.School?.Name) ? receipt.Branch.School.Name : "Kush Public School");

            var branchAddress = !string.IsNullOrWhiteSpace(receipt.Branch?.Address)
                ? receipt.Branch.Address
                : (!string.IsNullOrWhiteSpace(receipt.Branch?.School?.Address) ? receipt.Branch.School.Address : "Plot No 999, Main road Surya Vihar, Part 3 Sec 91");

            var contactPhone = !string.IsNullOrWhiteSpace(receipt.Branch?.Phone)
                ? receipt.Branch.Phone
                : (!string.IsNullOrWhiteSpace(receipt.Branch?.School?.ContactNumber) ? receipt.Branch.School.ContactNumber : "9911360909");

            var logoUrl = !string.IsNullOrWhiteSpace(receipt.Branch?.LogoUrl)
                ? receipt.Branch.LogoUrl
                : receipt.Branch?.School?.LogoUrl;

            var printDto = new ReceiptPrintDto
            {
                ReceiptId = receipt.Id,
                ReceiptNo = receipt.ReceiptNo,
                ReceiptDate = receipt.ReceiptDate,
                SchoolName = schoolName,
                BranchName = receipt.Branch?.Name ?? "Main Campus",
                Address = branchAddress,
                Contact = contactPhone,
                LogoUrl = logoUrl,
                CashierSignatureUrl = receipt.Branch?.CashierSignatureUrl ?? receipt.Branch?.AuthorizedSignatureUrl,
                PrincipalSignatureUrl = receipt.Branch?.PrincipalSignatureUrl,
                AcademicYear = receipt.AcademicYear?.Name ?? "",
                AdmissionNo = receipt.Student?.AdmissionNo ?? "",
                StudentName = receipt.Student?.FullName ?? "",
                ClassSection = $"{receipt.Class?.Name ?? ""} - {receipt.Section?.Name ?? ""}",
                ClassName = receipt.Class?.Name ?? "",
                RollNo = null,
                GuardianName = primaryGuardian?.Name ?? "",
                FatherName = father?.Name ?? primaryGuardian?.Name ?? "",
                GuardianMobile = primaryGuardian?.Mobile ?? "",
                Month = monthStr,
                PaymentModeName = paymentModeStr,
                TotalDue = receipt.TotalDue,
                TotalConcession = receipt.TotalConcession,
                TotalFine = receipt.TotalFine,
                TotalPaid = receipt.TotalPaid,
                RemainingTotalDues = remainingDues,
                Status = receipt.Status,
                Items = receipt.Details.Select(d => new ReceiptPrintItemDto
                {
                    FeeHeadName = d.FeeHead?.Name ?? "",
                    InstallmentName = d.Installment?.Name ?? "",
                    Month = d.Installment?.Name ?? monthStr ?? "",
                    AmountPaid = d.AmountPaid,
                    FinePaid = d.FinePaid,
                    BalanceCarried = d.BalanceCarried
                }).ToList(),
                Payments = receipt.Payments.Select(p => new PaymentSplitDto
                {
                    Mode = p.PaymentMode,
                    Amount = p.Amount,
                    TransactionRef = p.TransactionRef,
                    BankName = p.BankName,
                    ChequeNo = p.ChequeNo,
                    ChequeDate = p.ChequeDate
                }).ToList(),
                CollectedBy = "Cashier",
                Remarks = receipt.Remarks
            };

            return Ok(ApiResponse<ReceiptPrintDto>.Ok(printDto));
        }

        [HttpPost("receipts/{id}/cancel")]
        [HasPermission("FeeCollection", "Delete")]
        public async Task<ActionResult<ApiResponse>> CancelReceipt(long id, [FromBody] CancelReceiptDto request)
        {
            // FR-5.7: Receipt cancellation needs reason and Principal approval; cancelled receipts stay in reports marked Cancelled.
            var branchId = _currentUserService.BranchId;

            var receipt = await _context.FeeReceipts
                .Include(r => r.Details)
                .FirstOrDefaultAsync(r => r.Id == id && r.BranchId == branchId);

            if (receipt == null) return NotFound(ApiResponse.Fail("Receipt not found."));
            if (receipt.Status == ReceiptStatus.Cancelled) return BadRequest(ApiResponse.Fail("Receipt is already cancelled."));

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<ActionResult<ApiResponse>>(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Rollback paid amounts on dues
                    foreach (var d in receipt.Details)
                    {
                        if (d.StudentFeeDueId.HasValue)
                        {
                            var due = await _context.StudentFeeDues.FirstOrDefaultAsync(due => due.Id == d.StudentFeeDueId.Value);
                            if (due != null)
                            {
                                due.PaidAmount -= d.AmountPaid;
                                due.BalanceAmount += d.AmountPaid;
                                due.Status = due.PaidAmount > 0 ? DueStatus.PartiallyPaid : DueStatus.Unpaid;
                            }
                        }
                    }

                    receipt.Status = ReceiptStatus.Cancelled;
                    receipt.CancelReason = request.Reason.Trim();
                    receipt.CancelledBy = _currentUserService.UserId;
                    receipt.CancelledOn = DateTime.UtcNow;

                    // Audit
                    _context.AuditLogs.Add(new AuditLog
                    {
                        UserId = _currentUserService.UserId,
                        Username = _currentUserService.Username,
                        Action = "CancelReceipt",
                        Module = "Fees",
                        EntityName = "FeeReceipt",
                        RecordId = receipt.Id.ToString(),
                        NewValues = $"Cancelled Receipt: {receipt.ReceiptNo}, Reason: {request.Reason}",
                        IpAddress = _currentUserService.IpAddress,
                        BranchId = branchId
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(ApiResponse.Ok($"Receipt {receipt.ReceiptNo} cancelled successfully and student balances reversed."));
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, ApiResponse.Fail($"Failed to cancel receipt: {ex.Message}"));
                }
            });
        }

        [HttpGet("receipt-config")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<FeeSlipConfigDto>>> GetFeeReceiptConfig()
        {
            var branchId = _currentUserService.BranchId;
            long? schoolId = null;

            if (branchId > 0)
            {
                schoolId = await _context.Branches
                    .Where(b => b.Id == branchId)
                    .Select(b => (long?)b.SchoolId)
                    .FirstOrDefaultAsync();
            }

            TenantGatewayConfig? config = null;
            if (schoolId.HasValue)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "FEE_RECEIPT_SLIP" && g.IsActive);
            }

            if (config == null)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "FEE_RECEIPT_SLIP" && g.IsActive);
            }

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<FeeSlipConfigDto>(
                        config.CredentialsEncrypted,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        var defaultSecs = FeeSlipConfigDto.GetDefaultSections();
                        if (parsed.Sections == null || parsed.Sections.Count == 0)
                        {
                            parsed.Sections = defaultSecs;
                        }
                        else
                        {
                            foreach (var ds in defaultSecs)
                            {
                                if (!parsed.Sections.Any(s => s.Key == ds.Key))
                                {
                                    parsed.Sections.Add(ds);
                                }
                            }
                        }
                        return Ok(ApiResponse<FeeSlipConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            return Ok(ApiResponse<FeeSlipConfigDto>.Ok(new FeeSlipConfigDto()));
        }
    }
}

