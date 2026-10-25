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
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.API.Helpers;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/promotion")]
    [Authorize]
    public class PromotionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PromotionController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // =========================================================================
        // 1. ELIGIBLE STUDENTS FOR PROMOTION (FR-8.1, BR-8.1)
        // =========================================================================
        [HttpGet("eligible-students")]
        [HasPermission("Promotion", "View")]
        public async Task<ActionResult<ApiResponse<object>>> GetEligibleStudents(
            [FromQuery] long classId,
            [FromQuery] long? sectionId,
            [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var targetYearId = (academicYearId.HasValue && academicYearId.Value > 0)
                ? academicYearId.Value
                : _currentUserService.AcademicYearId;

            // Fetch enrollments query
            var query = _context.StudentEnrollments
                .Include(e => e.Student)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.ClassId == classId && e.Status == StudentStatus.Active && e.Student!.BranchId == branchId);

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                query = query.Where(e => e.SectionId == sectionId.Value);
            }

            if (targetYearId > 0)
            {
                var hasInTargetYear = await query.AnyAsync(e => e.AcademicYearId == targetYearId);
                if (hasInTargetYear)
                {
                    query = query.Where(e => e.AcademicYearId == targetYearId);
                }
                else
                {
                    // Fallback to the latest academic year where this class has enrollments
                    var latestYearId = await query.Select(e => e.AcademicYearId).OrderByDescending(y => y).FirstOrDefaultAsync();
                    if (latestYearId > 0)
                    {
                        query = query.Where(e => e.AcademicYearId == latestYearId);
                        targetYearId = latestYearId;
                    }
                }
            }

            var enrollments = await query
                .OrderBy(e => e.RollNo)
                .ThenBy(e => e.Student!.FirstName)
                .ToListAsync();

            var studentIds = enrollments.Select(e => e.StudentId).ToList();

            // Fetch pending fee dues (FR-8.3)
            var dues = await _context.StudentFeeDues
                .Where(d => studentIds.Contains(d.StudentId) && d.AcademicYearId == targetYearId && d.BalanceAmount > 0)
                .GroupBy(d => d.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    PendingAmount = g.Sum(x => x.BalanceAmount),
                    PendingCount = g.Count()
                })
                .ToDictionaryAsync(x => x.StudentId);

            var studentList = enrollments.Select(e =>
            {
                var s = e.Student!;
                dues.TryGetValue(s.Id, out var dueInfo);
                var fullName = $"{s.FirstName} {s.LastName}".Trim();

                return new
                {
                    StudentId = s.Id,
                    Id = s.Id,
                    EnrollmentId = e.Id,
                    AdmissionNo = s.AdmissionNo,
                    FullName = fullName,
                    StudentName = fullName,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    RollNo = e.RollNo,
                    ClassId = e.ClassId,
                    ClassName = e.Class?.Name,
                    SectionId = e.SectionId,
                    SectionName = e.Section?.Name,
                    PendingDues = dueInfo?.PendingAmount ?? 0,
                    PendingDuesCount = dueInfo?.PendingCount ?? 0,
                    RecommendedAction = "Promoted", // Default
                    TargetSectionId = e.SectionId
                };
            }).ToList();

            return Ok(ApiResponse<object>.Ok(new
            {
                ClassId = classId,
                SectionId = sectionId ?? 0,
                AcademicYearId = targetYearId,
                TotalCount = studentList.Count,
                Students = studentList
            }));
        }

        // =========================================================================
        // 2. BULK PROMOTION EXECUTION (FR-8.1, FR-8.2, FR-8.3, BR-8.1)
        // =========================================================================
        [HttpPost("bulk")]
        [HasPermission("Promotion", "Edit")]
        public async Task<ActionResult<ApiResponse<object>>> ExecuteBulkPromotion([FromBody] BulkPromotionRequestDto dto)
        {
            var branchId = _currentUserService.BranchId;

            // BR-8.1: Next academic year and target class structure must exist before promotion
            var nextYear = await _context.AcademicYears
                .FirstOrDefaultAsync(y => y.Id == dto.ToAcademicYearId && y.BranchId == branchId);

            if (nextYear == null)
            {
                return BadRequest(ApiResponse<object>.Fail("Target academic year does not exist. (BR-8.1)"));
            }

            var toClass = await _context.Classes.FirstOrDefaultAsync(c => c.Id == dto.ToClassId && c.BranchId == branchId);
            if (toClass == null)
            {
                return BadRequest(ApiResponse<object>.Fail("Target class does not exist."));
            }

            int promotedCount = 0;
            int detainedCount = 0;
            int leftCount = 0;
            decimal totalDuesCarried = 0;

            foreach (var item in dto.Students)
            {
                var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == item.StudentId);
                if (student == null) continue;

                // Check pending dues to carry forward (FR-8.3)
                var pendingDues = await _context.StudentFeeDues
                    .Where(d => d.StudentId == item.StudentId && d.AcademicYearId == dto.FromAcademicYearId && d.BalanceAmount > 0)
                    .SumAsync(d => d.BalanceAmount);

                long assignedClassId = dto.ToClassId;
                long assignedSectionId = item.TargetSectionId > 0 ? item.TargetSectionId : dto.ToSectionId;

                if (item.Result == PromotionResult.Detained)
                {
                    // FR-8.2: Detained students get enrollment in same class in next year
                    assignedClassId = dto.FromClassId;
                    detainedCount++;
                }
                else if (item.Result == PromotionResult.Left)
                {
                    student.Status = StudentStatus.Left;
                    leftCount++;
                }
                else
                {
                    promotedCount++;
                }

                // If not Left, create enrollment in next year
                if (item.Result != PromotionResult.Left)
                {
                    // Check if already enrolled in target year
                    var existingEnrollment = await _context.StudentEnrollments
                        .FirstOrDefaultAsync(e => e.StudentId == item.StudentId && e.AcademicYearId == dto.ToAcademicYearId);

                    if (existingEnrollment == null)
                    {
                        var newEnrollment = new StudentEnrollment
                        {
                            StudentId = item.StudentId,
                            AcademicYearId = dto.ToAcademicYearId,
                            ClassId = assignedClassId,
                            SectionId = assignedSectionId,
                            RollNo = null, // Will be reassigned in new year (FR-3.7)
                            FeeGroupId = student.CategoryId,
                            Status = StudentStatus.Active,
                            CreatedBy = _currentUserService.UserId ?? 1,
                            CreatedOn = DateTime.UtcNow,
                            IsActive = true
                        };
                        _context.StudentEnrollments.Add(newEnrollment);
                    }
                }

                // Record promotion entry for history and rollback
                var promotionRecord = new StudentPromotion
                {
                    BranchId = branchId,
                    FromAcademicYearId = dto.FromAcademicYearId,
                    ToAcademicYearId = dto.ToAcademicYearId,
                    StudentId = item.StudentId,
                    FromClassId = dto.FromClassId,
                    FromSectionId = dto.FromSectionId,
                    ToClassId = assignedClassId,
                    ToSectionId = assignedSectionId,
                    Result = item.Result,
                    PromotionDate = DateTime.UtcNow,
                    DuesCarriedForward = dto.CarryForwardDues ? pendingDues : 0,
                    IsRolledBack = false,
                    Remarks = item.Remarks,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                _context.StudentPromotions.Add(promotionRecord);

                if (dto.CarryForwardDues && pendingDues > 0)
                {
                    totalDuesCarried += pendingDues;
                }
            }

            await _context.SaveChangesAsync();

            // Automatically assign & sync fee dues for promoted students in the target academic year
            foreach (var item in dto.Students.Where(s => s.Result != PromotionResult.Left))
            {
                var assignedClassId = item.Result == PromotionResult.Detained ? dto.FromClassId : dto.ToClassId;
                await FeeAssignmentHelper.AutoAssignStudentDuesAsync(
                    _context,
                    branchId,
                    dto.ToAcademicYearId,
                    item.StudentId,
                    assignedClassId);
            }

            var summary = new
            {
                Promoted = promotedCount,
                Detained = detainedCount,
                Left = leftCount,
                TotalProcessed = dto.Students.Count,
                TotalDuesCarried = totalDuesCarried
            };

            return Ok(ApiResponse<object>.Ok(summary, "Bulk promotion completed successfully."));
        }

        // =========================================================================
        // 3. PROMOTION HISTORY & ROLLBACK (FR-8.6)
        // =========================================================================
        [HttpGet("history")]
        [HasPermission("Promotion", "View")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetPromotionHistory(
            [FromQuery] long? academicYearId,
            [FromQuery] long? classId)
        {
            var branchId = _currentUserService.BranchId;

            var query = _context.StudentPromotions
                .Include(p => p.Student)
                .Include(p => p.FromClass)
                .Include(p => p.FromSection)
                .Include(p => p.ToClass)
                .Include(p => p.ToSection)
                .Include(p => p.FromAcademicYear)
                .Include(p => p.ToAcademicYear)
                .Where(p => p.BranchId == branchId);

            if (academicYearId.HasValue && academicYearId > 0)
            {
                query = query.Where(p => p.FromAcademicYearId == academicYearId.Value);
            }

            if (classId.HasValue && classId > 0)
            {
                query = query.Where(p => p.FromClassId == classId.Value);
            }

            var list = await query
                .OrderByDescending(p => p.PromotionDate)
                .Take(100)
                .Select(p => new
                {
                    p.Id,
                    p.StudentId,
                    AdmissionNo = p.Student != null ? p.Student.AdmissionNo : "",
                    StudentName = p.Student != null ? $"{p.Student.FirstName} {p.Student.LastName}".Trim() : "",
                    FromAY = p.FromAcademicYear != null ? p.FromAcademicYear.Name : "",
                    ToAY = p.ToAcademicYear != null ? p.ToAcademicYear.Name : "",
                    FromClass = p.FromClass != null ? $"{p.FromClass.Name} - {p.FromSection!.Name}" : "",
                    ToClass = p.ToClass != null ? $"{p.ToClass.Name} - {p.ToSection!.Name}" : "",
                    Result = p.Result.ToString(),
                    PromotionDate = p.PromotionDate.ToString("yyyy-MM-dd HH:mm"),
                    p.DuesCarriedForward,
                    p.IsRolledBack,
                    p.Remarks
                })
                .ToListAsync();

            return Ok(ApiResponse<List<object>>.Ok(list.Cast<object>().ToList()));
        }

        [HttpPost("{id}/rollback")]
        [HasPermission("Promotion", "Delete")]
        public async Task<ActionResult<ApiResponse<bool>>> RollbackPromotion(long id)
        {
            var promo = await _context.StudentPromotions.FirstOrDefaultAsync(p => p.Id == id);
            if (promo == null) return NotFound(ApiResponse<bool>.Fail("Promotion record not found."));

            if (promo.IsRolledBack)
            {
                return BadRequest(ApiResponse<bool>.Fail("This promotion has already been rolled back."));
            }

            // FR-8.6: Promotion can be rolled back for a student before any transaction in the new year
            var hasFeeReceipts = await _context.FeeReceipts
                .AnyAsync(r => r.StudentId == promo.StudentId && r.AcademicYearId == promo.ToAcademicYearId);

            if (hasFeeReceipts)
            {
                return BadRequest(ApiResponse<bool>.Fail("Cannot rollback promotion: student has fee payment transactions recorded in the target academic year. (FR-8.6)"));
            }

            var hasAttendance = await _context.StudentAttendances
                .AnyAsync(a => a.StudentId == promo.StudentId && a.AcademicYearId == promo.ToAcademicYearId);

            if (hasAttendance)
            {
                return BadRequest(ApiResponse<bool>.Fail("Cannot rollback promotion: student has attendance records in the target academic year. (FR-8.6)"));
            }

            // Remove enrollment in target year
            var newEnrollment = await _context.StudentEnrollments
                .FirstOrDefaultAsync(e => e.StudentId == promo.StudentId && e.AcademicYearId == promo.ToAcademicYearId);

            if (newEnrollment != null)
            {
                _context.StudentEnrollments.Remove(newEnrollment);
            }

            // Restore active status
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == promo.StudentId);
            if (student != null)
            {
                student.Status = StudentStatus.Active;
            }

            promo.IsRolledBack = true;
            promo.ModifiedBy = _currentUserService.UserId ?? 1;
            promo.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, "Student promotion rolled back successfully."));
        }
    }

    public class BulkPromotionRequestDto
    {
        public long FromAcademicYearId { get; set; }
        public long ToAcademicYearId { get; set; }
        public long FromClassId { get; set; }
        public long FromSectionId { get; set; }
        public long ToClassId { get; set; }
        public long ToSectionId { get; set; }
        public bool CarryForwardDues { get; set; } = true;
        public List<PromotionStudentItemDto> Students { get; set; } = new();
    }

    public class PromotionStudentItemDto
    {
        public long StudentId { get; set; }
        public PromotionResult Result { get; set; } = PromotionResult.Promoted;
        public long TargetSectionId { get; set; }
        public string? Remarks { get; set; }
    }
}
