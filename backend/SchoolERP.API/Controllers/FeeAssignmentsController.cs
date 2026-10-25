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

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/fees")]
    [Route("api/feeassignments")]
    [Authorize]
    public class FeeAssignmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public FeeAssignmentsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpPost("assignments/bulk")]
        [HasPermission("FeeStructure", "Add")]
        public async Task<ActionResult<ApiResponse>> BulkAssignFees([FromBody] BulkFeeAssignmentDto request)
        {
            // FR-5.2: Bulk fee assignment by class and fee group; auto-generates student fee dues
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // 1. Fetch fee structure items for class & fee group
            var structures = await _context.FeeStructures
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == yearId &&
                            s.ClassId == request.ClassId &&
                            s.FeeGroupId == request.FeeGroupId)
                .ToListAsync();

            if (!structures.Any())
            {
                return BadRequest(ApiResponse.Fail("No fee structure defined for the selected class and fee group. Please configure the fee structure first."));
            }

            // 2. Query active enrolled students
            var enrollmentsQuery = _context.StudentEnrollments
                .Include(e => e.Student)
                .Where(e => e.AcademicYearId == yearId &&
                            e.ClassId == request.ClassId &&
                            e.Status == StudentStatus.Active);

            if (request.SectionId.HasValue)
            {
                enrollmentsQuery = enrollmentsQuery.Where(e => e.SectionId == request.SectionId.Value);
            }

            var enrollments = await enrollmentsQuery.ToListAsync();
            if (!enrollments.Any())
            {
                return BadRequest(ApiResponse.Fail("No active students found in the selected class/section."));
            }

            // 3. Fetch active concessions for students
            var studentIds = enrollments.Select(e => e.StudentId).ToList();
            var concessions = await _context.FeeConcessions
                .Where(c => c.BranchId == branchId &&
                            c.AcademicYearId == yearId &&
                            studentIds.Contains(c.StudentId) &&
                            c.IsApproved)
                .ToListAsync();

            // 4. Fetch existing dues to avoid duplicating
            var existingDues = await _context.StudentFeeDues
                .Where(d => d.BranchId == branchId &&
                            d.AcademicYearId == yearId &&
                            studentIds.Contains(d.StudentId))
                .ToListAsync();

            var newDuesCount = 0;

            foreach (var en in enrollments)
            {
                en.FeeGroupId = request.FeeGroupId;

                foreach (var st in structures)
                {
                    var exists = existingDues.Any(d =>
                        d.StudentId == en.StudentId &&
                        d.FeeHeadId == st.FeeHeadId &&
                        d.InstallmentId == st.InstallmentId);

                    if (exists) continue;

                    // Calculate concession
                    decimal concessionAmt = 0;
                    var conc = concessions.FirstOrDefault(c => c.StudentId == en.StudentId && c.FeeHeadId == st.FeeHeadId);
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

                    var balance = st.Amount - concessionAmt;

                    var due = new StudentFeeDue
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        StudentId = en.StudentId,
                        ClassId = en.ClassId,
                        FeeHeadId = st.FeeHeadId,
                        InstallmentId = st.InstallmentId,
                        OriginalAmount = st.Amount,
                        ConcessionAmount = concessionAmt,
                        PaidAmount = 0,
                        BalanceAmount = balance,
                        Status = balance <= 0 ? DueStatus.Paid : DueStatus.Unpaid,
                        IsActive = true
                    };

                    _context.StudentFeeDues.Add(due);
                    newDuesCount++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok($"Fee structure applied successfully to {enrollments.Count} students ({newDuesCount} fee dues generated)."));
        }

        // --- Concessions ---
        [HttpGet("concessions")]
        [HasPermission("FeeConcessions", "View")]
        public async Task<ActionResult<ApiResponse<List<FeeConcessionDto>>>> GetConcessions([FromQuery] long? studentId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var query = _context.FeeConcessions
                .Include(c => c.Student)
                .Include(c => c.FeeHead)
                .Where(c => c.BranchId == branchId && c.AcademicYearId == yearId);

            if (studentId.HasValue)
            {
                query = query.Where(c => c.StudentId == studentId.Value);
            }

            var items = await query
                .OrderBy(c => c.Student!.FirstName)
                .Select(c => new FeeConcessionDto
                {
                    Id = c.Id,
                    StudentId = c.StudentId,
                    StudentName = c.Student != null ? c.Student.FullName : "",
                    AdmissionNo = c.Student != null ? c.Student.AdmissionNo : "",
                    FeeHeadId = c.FeeHeadId,
                    FeeHeadName = c.FeeHead != null ? c.FeeHead.Name : "",
                    Type = c.Type,
                    Value = c.Value,
                    CalculatedAmount = c.CalculatedAmount,
                    Reason = c.Reason
                })
                .ToListAsync();

            return Ok(ApiResponse<List<FeeConcessionDto>>.Ok(items));
        }

        [HttpPost("concessions")]
        [HasPermission("FeeConcessions", "Add")]
        public async Task<ActionResult<ApiResponse<FeeConcessionDto>>> CreateConcession([FromBody] CreateFeeConcessionDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == request.StudentId && s.BranchId == branchId);
            if (student == null) return NotFound(ApiResponse<FeeConcessionDto>.Fail("Student not found."));

            var head = await _context.FeeHeads.FirstOrDefaultAsync(h => h.Id == request.FeeHeadId && h.BranchId == branchId);
            if (head == null) return NotFound(ApiResponse<FeeConcessionDto>.Fail("Fee head not found."));

            var existingConcession = await _context.FeeConcessions
                .FirstOrDefaultAsync(c => c.BranchId == branchId &&
                                          c.AcademicYearId == yearId &&
                                          c.StudentId == request.StudentId &&
                                          c.FeeHeadId == request.FeeHeadId &&
                                          c.IsActive &&
                                          c.IsApproved);

            if (existingConcession != null)
            {
                var existingDesc = existingConcession.Type == ConcessionType.Percentage
                    ? $"{existingConcession.Value}% Off"
                    : $"₹{existingConcession.Value} Off";
                return BadRequest(ApiResponse<FeeConcessionDto>.Fail(
                    $"An active concession ({existingDesc}) already exists for {student.FullName} on '{head.Name}'. A fee head cannot have multiple concessions for the same student. Please delete the existing concession before adding a new one."));
            }

            var concession = new FeeConcession
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                StudentId = request.StudentId,
                FeeHeadId = request.FeeHeadId,
                Type = request.Type,
                Value = request.Value,
                CalculatedAmount = 0,
                Reason = request.Reason?.Trim(),
                ApprovedBy = _currentUserService.UserId,
                IsApproved = true,
                IsActive = true
            };

            _context.FeeConcessions.Add(concession);

            // Automatically apply concession to existing StudentFeeDues for this student and fee head
            var studentDues = await _context.StudentFeeDues
                .Include(d => d.Installment)
                .Where(d => d.StudentId == request.StudentId &&
                            d.FeeHeadId == request.FeeHeadId &&
                            d.AcademicYearId == yearId &&
                            d.BranchId == branchId &&
                            d.IsActive)
                .OrderBy(d => d.Installment != null ? d.Installment.DisplayOrder : 0)
                .ThenBy(d => d.Installment != null ? d.Installment.DueDate : DateTime.MinValue)
                .ToListAsync();

            foreach (var due in studentDues)
            {
                decimal concessionAmt = 0;
                if (request.Type == ConcessionType.Percentage)
                {
                    concessionAmt = Math.Round((due.OriginalAmount * request.Value) / 100m, 2);
                }
                else
                {
                    concessionAmt = Math.Min(request.Value, due.OriginalAmount);
                }

                due.ConcessionAmount = concessionAmt;
                due.BalanceAmount = Math.Max(0, due.OriginalAmount - due.ConcessionAmount - due.PaidAmount);
                due.Status = due.BalanceAmount <= 0 ? DueStatus.Paid : (due.PaidAmount > 0 ? DueStatus.PartiallyPaid : DueStatus.Unpaid);
            }

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<FeeConcessionDto>.Ok(new FeeConcessionDto
            {
                Id = concession.Id,
                StudentId = concession.StudentId,
                FeeHeadId = concession.FeeHeadId,
                Type = concession.Type,
                Value = concession.Value,
                Reason = concession.Reason
            }, "Fee concession created and applied to student dues successfully."));
        }

        [HttpPut("concessions/{id}")]
        [HasPermission("FeeConcessions", "Edit")]
        public async Task<ActionResult<ApiResponse<FeeConcessionDto>>> UpdateConcession(long id, [FromBody] UpdateFeeConcessionDto request)
        {
            var branchId = _currentUserService.BranchId;
            var conc = await _context.FeeConcessions
                .Include(c => c.Student)
                .Include(c => c.FeeHead)
                .FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);
            if (conc == null) return NotFound(ApiResponse<FeeConcessionDto>.Fail("Concession not found."));

            conc.Type = request.Type;
            conc.Value = request.Value;
            conc.Reason = request.Reason?.Trim();

            // Re-apply concession to StudentFeeDues
            var studentDues = await _context.StudentFeeDues
                .Where(d => d.StudentId == conc.StudentId &&
                            d.FeeHeadId == conc.FeeHeadId &&
                            d.AcademicYearId == conc.AcademicYearId &&
                            d.BranchId == branchId &&
                            d.IsActive)
                .ToListAsync();

            foreach (var due in studentDues)
            {
                decimal concessionAmt = 0;
                if (request.Type == ConcessionType.Percentage)
                {
                    concessionAmt = Math.Round((due.OriginalAmount * request.Value) / 100m, 2);
                }
                else
                {
                    concessionAmt = Math.Min(request.Value, due.OriginalAmount);
                }

                due.ConcessionAmount = concessionAmt;
                due.BalanceAmount = Math.Max(0, due.OriginalAmount - due.ConcessionAmount - due.PaidAmount);
                due.Status = due.BalanceAmount <= 0 ? DueStatus.Paid : (due.PaidAmount > 0 ? DueStatus.PartiallyPaid : DueStatus.Unpaid);
            }

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<FeeConcessionDto>.Ok(new FeeConcessionDto
            {
                Id = conc.Id,
                StudentId = conc.StudentId,
                StudentName = conc.Student?.FullName ?? "",
                AdmissionNo = conc.Student?.AdmissionNo ?? "",
                FeeHeadId = conc.FeeHeadId,
                FeeHeadName = conc.FeeHead?.Name ?? "",
                Type = conc.Type,
                Value = conc.Value,
                Reason = conc.Reason
            }, "Fee concession updated successfully."));
        }

        [HttpDelete("concessions/{id}")]
        [HasPermission("FeeConcessions", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteConcession(long id)
        {
            var branchId = _currentUserService.BranchId;
            var conc = await _context.FeeConcessions.FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);
            if (conc == null) return NotFound(ApiResponse.Fail("Concession not found."));

            // Revert concession on StudentFeeDues
            var studentDues = await _context.StudentFeeDues
                .Where(d => d.StudentId == conc.StudentId &&
                            d.FeeHeadId == conc.FeeHeadId &&
                            d.AcademicYearId == conc.AcademicYearId &&
                            d.BranchId == branchId &&
                            d.IsActive)
                .ToListAsync();

            foreach (var due in studentDues)
            {
                due.ConcessionAmount = 0;
                due.BalanceAmount = Math.Max(0, due.OriginalAmount - due.PaidAmount);
                due.Status = due.BalanceAmount <= 0 ? DueStatus.Paid : (due.PaidAmount > 0 ? DueStatus.PartiallyPaid : DueStatus.Unpaid);
            }

            _context.FeeConcessions.Remove(conc);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Concession removed and dues reverted successfully."));
        }
    }
}
