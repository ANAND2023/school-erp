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
    [Route("api/fees/demand-bills")]
    [Authorize]
    public class FeeDemandBillsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public FeeDemandBillsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("FeeCollection", "View")]
        public async Task<ActionResult<ApiResponse<DemandBillResponseDto>>> GetDemandBills(
            [FromQuery] long? classId,
            [FromQuery] long? sectionId,
            [FromQuery] long? installmentId,
            [FromQuery] long? academicYearId,
            [FromQuery] string? searchTerm,
            [FromQuery] DateTime? customDueDate,
            [FromQuery] string? statusFilter = "unpaid")
        {
            var branchId = _currentUserService.BranchId;
            var yearId = academicYearId.HasValue && academicYearId.Value > 0
                ? academicYearId.Value
                : _currentUserService.AcademicYearId;

            var today = DateTime.UtcNow.Date;

            // Fetch Fine Rules
            var fineRules = await _context.FineRules
                .Where(f => f.BranchId == branchId && f.AcademicYearId == yearId)
                .ToListAsync();

            // Fetch Installments for order & name reference
            var allInstallments = await _context.FeeInstallments
                .Where(i => i.BranchId == branchId && i.AcademicYearId == yearId)
                .OrderBy(i => i.DisplayOrder)
                .ThenBy(i => i.DueDate)
                .ToListAsync();

            FeeInstallment? targetInstallment = null;
            if (installmentId.HasValue && installmentId.Value > 0)
            {
                targetInstallment = allInstallments.FirstOrDefault(i => i.Id == installmentId.Value);
            }

            // Query active students enrolled in this academic year
            var studentsQuery = _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .Where(s => s.BranchId == branchId && s.Status == StudentStatus.Active &&
                            s.Enrollments.Any(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active));

            if (classId.HasValue && classId.Value > 0)
            {
                studentsQuery = studentsQuery.Where(s => s.Enrollments.Any(e => e.AcademicYearId == yearId && e.ClassId == classId.Value));
            }

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                studentsQuery = studentsQuery.Where(s => s.Enrollments.Any(e => e.AcademicYearId == yearId && e.SectionId == sectionId.Value));
            }

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLower();
                studentsQuery = studentsQuery.Where(s =>
                    s.AdmissionNo.ToLower().Contains(term) ||
                    (s.FirstName + " " + s.LastName).ToLower().Contains(term) ||
                    s.Guardians.Any(g => g.Name.ToLower().Contains(term) || g.Mobile.Contains(term)));
            }

            var students = await studentsQuery
                .OrderBy(s => s.Enrollments.Where(e => e.AcademicYearId == yearId).Select(e => e.Class!.DisplayOrder).FirstOrDefault())
                .ThenBy(s => s.Enrollments.Where(e => e.AcademicYearId == yearId).Select(e => e.RollNo).FirstOrDefault())
                .ThenBy(s => s.FirstName)
                .ToListAsync();

            var studentIds = students.Select(s => s.Id).ToList();

            // Fetch Dues for all matched students
            var allDues = await _context.StudentFeeDues
                .Include(d => d.FeeHead)
                .Include(d => d.Installment)
                .Where(d => d.BranchId == branchId &&
                            d.AcademicYearId == yearId &&
                            studentIds.Contains(d.StudentId))
                .OrderBy(d => d.Installment!.DisplayOrder)
                .ThenBy(d => d.Installment!.DueDate)
                .ThenBy(d => d.FeeHead!.Name)
                .ToListAsync();

            var duesByStudent = allDues.GroupBy(d => d.StudentId).ToDictionary(g => g.Key, g => g.ToList());

            var studentDtos = new List<DemandBillStudentDto>();

            foreach (var student in students)
            {
                var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active)
                                 ?? student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);

                if (!duesByStudent.TryGetValue(student.Id, out var studentDues) || !studentDues.Any())
                {
                    if (enrollment != null)
                    {
                        await FeeAssignmentHelper.AutoAssignStudentDuesAsync(
                            _context,
                            branchId,
                            yearId,
                            student.Id,
                            enrollment.ClassId,
                            enrollment.FeeGroupId);

                        studentDues = await _context.StudentFeeDues
                            .Include(d => d.FeeHead)
                            .Include(d => d.Installment)
                            .Where(d => d.BranchId == branchId &&
                                        d.AcademicYearId == yearId &&
                                        d.StudentId == student.Id)
                            .OrderBy(d => d.Installment!.DisplayOrder)
                            .ThenBy(d => d.Installment!.DueDate)
                            .ThenBy(d => d.FeeHead!.Name)
                            .ToListAsync();
                    }
                    else
                    {
                        studentDues = new List<StudentFeeDue>();
                    }
                }

                if (studentDues == null || !studentDues.Any()) continue;

                // Determine relevant dues based on targetInstallment
                List<StudentFeeDue> relevantDues;
                decimal prevArrears = 0;
                decimal currentDue = 0;

                if (targetInstallment != null)
                {
                    // Prior unpaid installments
                    var priorDues = studentDues
                        .Where(d => d.Installment != null &&
                                    (d.Installment.DisplayOrder < targetInstallment.DisplayOrder ||
                                     (d.Installment.DisplayOrder == targetInstallment.DisplayOrder && d.Installment.DueDate < targetInstallment.DueDate)) &&
                                    d.BalanceAmount > 0)
                        .ToList();

                    prevArrears = priorDues.Sum(d => d.BalanceAmount);

                    // Target installment dues
                    var currentInstallmentDues = studentDues
                        .Where(d => d.InstallmentId == targetInstallment.Id)
                        .ToList();

                    currentDue = currentInstallmentDues.Sum(d => d.BalanceAmount);

                    // Combine prior + current for total demand
                    relevantDues = priorDues.Concat(currentInstallmentDues).ToList();
                }
                else
                {
                    // All dues (or all unpaid dues)
                    relevantDues = studentDues;
                    prevArrears = 0;
                    currentDue = relevantDues.Sum(d => d.BalanceAmount);
                }

                // Apply statusFilter
                if (statusFilter == "unpaid" && !relevantDues.Any(d => d.BalanceAmount > 0))
                {
                    continue; // Skip if no balance due
                }
                else if (statusFilter == "partial" && !relevantDues.Any(d => d.Status == DueStatus.PartiallyPaid))
                {
                    continue;
                }

                var guardian = student.Guardians.FirstOrDefault(g => g.IsPrimary) ?? student.Guardians.FirstOrDefault();
                var father = student.Guardians.FirstOrDefault(g => g.Relation != null && g.Relation.Equals("Father", StringComparison.OrdinalIgnoreCase)) ?? guardian;
                var mother = student.Guardians.FirstOrDefault(g => g.Relation != null && g.Relation.Equals("Mother", StringComparison.OrdinalIgnoreCase));

                // Calculate fine per overdue installment
                decimal studentTotalFine = 0;
                var installmentGroups = relevantDues.Where(d => d.BalanceAmount > 0).GroupBy(d => d.InstallmentId);
                var itemsDtoList = new List<DemandBillItemDto>();

                foreach (var instG in installmentGroups)
                {
                    var firstInstDue = instG.First();
                    var inst = firstInstDue.Installment;
                    decimal instFine = 0;

                    if (inst != null)
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

                    studentTotalFine += instFine;

                    foreach (var due in instG)
                    {
                        itemsDtoList.Add(new DemandBillItemDto
                        {
                            FeeHeadId = due.FeeHeadId,
                            FeeHeadName = due.FeeHead?.Name ?? "Fee",
                            InstallmentId = due.InstallmentId,
                            InstallmentName = inst?.Name ?? "Term",
                            DueDate = inst?.DueDate ?? today,
                            OriginalAmount = due.OriginalAmount,
                            ConcessionAmount = due.ConcessionAmount,
                            PaidAmount = due.PaidAmount,
                            BalanceAmount = due.BalanceAmount,
                            FineAmount = instFine > 0 ? (instFine / instG.Count()) : 0,
                            NetDemand = due.BalanceAmount
                        });
                    }
                }

                var totalGross = relevantDues.Sum(d => d.OriginalAmount);
                var totalConcession = relevantDues.Sum(d => d.ConcessionAmount);
                var totalPaid = relevantDues.Sum(d => d.PaidAmount);
                var totalBalance = relevantDues.Sum(d => d.BalanceAmount);
                var totalNetDemand = totalBalance + studentTotalFine;

                var overallStatus = totalBalance <= 0
                    ? "Paid"
                    : (totalPaid > 0 ? "Partially Paid" : "Unpaid");

                var distinctInstallmentNames = relevantDues
                    .Where(d => d.Installment != null)
                    .OrderBy(d => d.Installment!.DisplayOrder)
                    .Select(d => d.Installment!.Name)
                    .Distinct()
                    .ToList();

                var finalDueDate = customDueDate ?? (targetInstallment?.DueDate ?? today.AddDays(10));

                studentDtos.Add(new DemandBillStudentDto
                {
                    StudentId = student.Id,
                    AdmissionNo = student.AdmissionNo ?? "",
                    RollNo = enrollment?.RollNo?.ToString() ?? "",
                    StudentName = student.FullName ?? "",
                    FatherName = father?.Name ?? "",
                    MotherName = mother?.Name ?? "",
                    GuardianMobile = guardian?.Mobile ?? father?.Mobile ?? "",
                    ClassId = enrollment?.ClassId ?? 0,
                    ClassName = enrollment?.Class?.Name ?? "",
                    SectionId = enrollment?.SectionId,
                    SectionName = enrollment?.Section?.Name ?? "",
                    Address = student.Address ?? "",
                    DemandBillNo = $"DB/{today.Year}/{(student.AdmissionNo ?? student.Id.ToString()).Replace(" ", "")}",
                    BillDate = today,
                    DueDate = finalDueDate,
                    GrossAmount = totalGross,
                    ConcessionAmount = totalConcession,
                    PaidAmount = totalPaid,
                    BalanceAmount = totalBalance,
                    PreviousArrears = prevArrears,
                    CurrentPeriodDue = currentDue > 0 ? currentDue : totalBalance,
                    FineAmount = studentTotalFine,
                    NetDemandAmount = totalNetDemand,
                    Status = overallStatus,
                    InstallmentNames = distinctInstallmentNames,
                    Items = itemsDtoList
                });
            }

            var response = new DemandBillResponseDto
            {
                TotalStudents = studentDtos.Count,
                TotalGrossAmount = studentDtos.Sum(s => s.GrossAmount),
                TotalConcessionAmount = studentDtos.Sum(s => s.ConcessionAmount),
                TotalPaidAmount = studentDtos.Sum(s => s.PaidAmount),
                TotalBalanceAmount = studentDtos.Sum(s => s.BalanceAmount),
                TotalFineAmount = studentDtos.Sum(s => s.FineAmount),
                TotalNetDemandAmount = studentDtos.Sum(s => s.NetDemandAmount),
                TotalDefaulters = studentDtos.Count(s => s.BalanceAmount > 0),
                Students = studentDtos
            };

            return Ok(ApiResponse<DemandBillResponseDto>.Ok(response));
        }
    }
}
