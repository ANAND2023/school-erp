using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Helpers
{
    public static class FeeAssignmentHelper
    {
        /// <summary>
        /// Automatically assigns and synchronizes monthly fee dues for a student
        /// based on their class's active fee structures and active approved concessions.
        /// Does NOT duplicate already existing dues or overwrite collected payments.
        /// </summary>
        public static async Task<int> AutoAssignStudentDuesAsync(
            ApplicationDbContext context,
            long branchId,
            long yearId,
            long studentId,
            long classId,
            long? feeGroupId = null)
        {
            if (studentId <= 0 || classId <= 0) return 0;

            // 1. Fetch fee structure items for class & optional fee group
            var structuresQuery = context.FeeStructures
                .Include(s => s.FeeHead)
                .Include(s => s.Installment)
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == yearId &&
                            s.ClassId == classId &&
                            s.IsActive);

            if (feeGroupId.HasValue && feeGroupId.Value > 0)
            {
                var hasGroupStructures = await structuresQuery
                    .AnyAsync(s => s.FeeGroupId == feeGroupId.Value);

                if (hasGroupStructures)
                {
                    structuresQuery = structuresQuery.Where(s => s.FeeGroupId == feeGroupId.Value);
                }
            }

            var structures = await structuresQuery.ToListAsync();

            // If still no structures found, try any active fee structure in that class
            if (!structures.Any())
            {
                structures = await context.FeeStructures
                    .Include(s => s.FeeHead)
                    .Include(s => s.Installment)
                    .Where(s => s.BranchId == branchId &&
                                s.AcademicYearId == yearId &&
                                s.ClassId == classId &&
                                s.IsActive)
                    .ToListAsync();
            }

            if (!structures.Any())
            {
                // No fee structure configured for this class yet
                return 0;
            }

            // 2. Ensure student enrollment feeGroupId is populated
            var chosenFeeGroupId = (feeGroupId.HasValue && feeGroupId.Value > 0)
                ? feeGroupId.Value
                : structures.First().FeeGroupId;

            var enrollment = await context.StudentEnrollments
                .FirstOrDefaultAsync(e => e.StudentId == studentId && e.AcademicYearId == yearId && e.ClassId == classId);
            if (enrollment != null && (!enrollment.FeeGroupId.HasValue || enrollment.FeeGroupId.Value <= 0))
            {
                enrollment.FeeGroupId = chosenFeeGroupId;
            }

            // 3. Fetch active approved concessions for this student
            var concessions = await context.FeeConcessions
                .Where(c => c.BranchId == branchId &&
                            c.AcademicYearId == yearId &&
                            c.StudentId == studentId &&
                            c.IsApproved &&
                            c.IsActive)
                .ToListAsync();

            // 4. Fetch existing dues to avoid duplicating
            var existingDues = await context.StudentFeeDues
                .Where(d => d.BranchId == branchId &&
                            d.AcademicYearId == yearId &&
                            d.StudentId == studentId)
                .ToListAsync();

            // Filter out any transport/bus fees from normal class fee structure
            var transportHeadIds = await context.FeeHeads
                .Where(f => f.BranchId == branchId && (f.Name.Contains("Transport") || f.Name.Contains("Bus")))
                .Select(f => f.Id)
                .ToListAsync();

            structures = structures.Where(s => !transportHeadIds.Contains(s.FeeHeadId)).ToList();

            int newDuesCount = 0;

            var transportAllocation = await context.TransportAllocations
                .Include(a => a.RouteStop)
                .FirstOrDefaultAsync(a => a.BranchId == branchId && a.AcademicYearId == yearId && a.StudentId == studentId && a.IsActive && a.Status == "Active");
            
            Console.WriteLine($"Transport allocation for student {studentId}: {(transportAllocation != null ? "FOUND" : "NULL")}");

            FeeHead transportHead = null;
            if (transportAllocation != null && transportAllocation.RouteStop != null)
            {
                transportHead = await context.FeeHeads.FirstOrDefaultAsync(f => f.BranchId == branchId && f.Name.Contains("Transport"));
                if (transportHead == null)
                {
                    transportHead = new FeeHead { BranchId = branchId, Name = "Transport Fee", Description = "Auto-generated transport fee", IsActive = true };
                    context.FeeHeads.Add(transportHead);
                    await context.SaveChangesAsync();
                }
            }

            foreach (var st in structures)
            {
                var existingDue = existingDues.FirstOrDefault(d =>
                    d.FeeHeadId == st.FeeHeadId &&
                    d.InstallmentId == st.InstallmentId);

                // Calculate concession
                decimal concessionAmt = 0;
                var conc = concessions.FirstOrDefault(c => c.FeeHeadId == st.FeeHeadId);
                if (conc != null)
                {
                    if (conc.Type == ConcessionType.Percentage)
                    {
                        concessionAmt = Math.Round((st.Amount * conc.Value) / 100m, 2);
                    }
                    else
                    {
                        concessionAmt = Math.Min(conc.Value, st.Amount);
                    }
                }

                var balance = Math.Max(0, st.Amount - concessionAmt);

                if (existingDue == null)
                {
                    var due = new StudentFeeDue
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        StudentId = studentId,
                        ClassId = classId,
                        FeeHeadId = st.FeeHeadId,
                        InstallmentId = st.InstallmentId,
                        OriginalAmount = st.Amount,
                        ConcessionAmount = concessionAmt,
                        PaidAmount = 0,
                        BalanceAmount = balance,
                        Status = balance <= 0 ? DueStatus.Paid : DueStatus.Unpaid,
                        IsActive = true
                    };
                    context.StudentFeeDues.Add(due);
                    newDuesCount++;
                }
                else
                {
                    // If due exists and has not been paid yet, sync the amount and concession
                    if (existingDue.PaidAmount == 0)
                    {
                        existingDue.OriginalAmount = st.Amount;
                        existingDue.ConcessionAmount = concessionAmt;
                        existingDue.BalanceAmount = balance;
                        existingDue.Status = balance <= 0 ? DueStatus.Paid : DueStatus.Unpaid;
                    }
                }
            }

            if (transportAllocation != null && transportHead != null)
            {
                var installments = await context.FeeInstallments.Where(i => i.BranchId == branchId && i.AcademicYearId == yearId).ToListAsync();
                foreach(var inst in installments)
                {
                    var exTrans = existingDues.FirstOrDefault(d => d.FeeHeadId == transportHead.Id && d.InstallmentId == inst.Id);
                    decimal tAmt = transportAllocation.RouteStop.MonthlyFare;
                    if (exTrans == null)
                    {
                        var due = new StudentFeeDue
                        {
                            BranchId = branchId, AcademicYearId = yearId, StudentId = studentId, ClassId = classId,
                            FeeHeadId = transportHead.Id, InstallmentId = inst.Id,
                            OriginalAmount = tAmt, ConcessionAmount = 0, PaidAmount = 0, BalanceAmount = tAmt,
                            Status = tAmt <= 0 ? DueStatus.Paid : DueStatus.Unpaid, IsActive = true
                        };
                        context.StudentFeeDues.Add(due);
                        newDuesCount++;
                    }
                    else if (exTrans.PaidAmount == 0)
                    {
                        exTrans.OriginalAmount = tAmt;
                        exTrans.BalanceAmount = tAmt;
                        exTrans.Status = tAmt <= 0 ? DueStatus.Paid : DueStatus.Unpaid;
                    }
                }
            }
            else
            {
                // If no transport allocation, zero out any unpaid transport dues
                Console.WriteLine("Transport allocation is NULL. Zeroing out transport dues...");
                foreach (var ex in existingDues.Where(d => transportHeadIds.Contains(d.FeeHeadId) && d.PaidAmount == 0))
                {
                    Console.WriteLine("Removing due ID: " + ex.Id);
                    context.StudentFeeDues.Remove(ex);
                    newDuesCount++; // hack to force SaveChanges
                }
            }

            if (newDuesCount > 0 || context.ChangeTracker.HasChanges())
            {
                await context.SaveChangesAsync();
            }

            return newDuesCount;
        }
    }
}







