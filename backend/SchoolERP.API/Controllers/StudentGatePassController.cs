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
    [Route("api/student-gate-pass")]
    [Authorize]
    public class StudentGatePassController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public StudentGatePassController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // =========================================================================
        // 1. GET LIST OF GATE PASSES
        // =========================================================================
        [HttpGet]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<PagedResult<StudentGatePassDto>>>> GetGatePasses(
            [FromQuery] string? search,
            [FromQuery] long? classId,
            [FromQuery] long? sectionId,
            [FromQuery] string? status,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int pageNo = 1,
            [FromQuery] int pageSize = 15)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var query = _context.StudentGatePasses
                .Include(g => g.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(g => g.AcademicYear)
                .Where(g => g.BranchId == branchId && g.IsActive);

            if (yearId > 0)
            {
                query = query.Where(g => g.AcademicYearId == yearId);
            }

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var s = status.Trim().ToLower();
                query = query.Where(g => g.Status.ToLower() == s);
            }

            if (fromDate.HasValue)
            {
                var f = fromDate.Value.Date;
                query = query.Where(g => g.PassDate >= f);
            }

            if (toDate.HasValue)
            {
                var t = toDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(g => g.PassDate <= t);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(g =>
                    g.GatePassNo.ToLower().Contains(s) ||
                    g.ReceiverName.ToLower().Contains(s) ||
                    g.Student!.FirstName.ToLower().Contains(s) ||
                    g.Student.LastName.ToLower().Contains(s) ||
                    (g.Student.FirstName + " " + g.Student.LastName).ToLower().Contains(s) ||
                    g.Student.AdmissionNo.ToLower().Contains(s));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(g => g.PassDate)
                .ThenByDescending(g => g.Id)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var studentIds = items.Select(i => i.StudentId).Distinct().ToList();

            // Fetch enrollments for class/section info
            var enrollments = await _context.StudentEnrollments
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => studentIds.Contains(e.StudentId) && (yearId == 0 || e.AcademicYearId == yearId) && e.Status == StudentStatus.Active)
                .AsNoTracking()
                .ToListAsync();

            var dtoList = items.Select(g =>
            {
                var enrollment = enrollments.FirstOrDefault(e => e.StudentId == g.StudentId);
                var father = g.Student?.Guardians?.FirstOrDefault(gd => gd.Relation.Equals("Father", StringComparison.OrdinalIgnoreCase))
                             ?? g.Student?.Guardians?.FirstOrDefault(gd => gd.IsPrimary);

                return new StudentGatePassDto
                {
                    Id = g.Id,
                    BranchId = g.BranchId,
                    AcademicYearId = g.AcademicYearId,
                    AcademicYearName = g.AcademicYear?.Name,
                    StudentId = g.StudentId,
                    StudentName = g.Student?.FullName ?? "Unknown",
                    AdmissionNo = g.Student?.AdmissionNo ?? "",
                    PhotoUrl = g.Student?.PhotoUrl,
                    Gender = g.Student?.Gender,
                    ClassId = enrollment?.ClassId,
                    ClassName = enrollment?.Class?.Name ?? "",
                    SectionId = enrollment?.SectionId,
                    SectionName = enrollment?.Section?.Name ?? "",
                    RollNo = enrollment?.RollNo,
                    FatherName = father?.Name,
                    FatherMobile = father?.Mobile,
                    EmergencyContact = g.Student?.EmergencyContact,
                    GatePassNo = g.GatePassNo,
                    PassDate = g.PassDate,
                    OutTime = g.OutTime,
                    ExpectedReturnTime = g.ExpectedReturnTime,
                    ActualReturnTime = g.ActualReturnTime,
                    Reason = g.Reason,
                    ReasonDetail = g.ReasonDetail,
                    ReceiverName = g.ReceiverName,
                    ReceiverRelation = g.ReceiverRelation,
                    ReceiverContact = g.ReceiverContact,
                    ReceiverPhotoUrl = g.ReceiverPhotoUrl,
                    ApprovedBy = g.ApprovedBy,
                    Status = g.Status,
                    Remarks = g.Remarks,
                    CreatedOn = g.CreatedOn
                };
            }).ToList();

            // Filter by class/section if requested
            if (classId.HasValue)
            {
                dtoList = dtoList.Where(d => d.ClassId == classId.Value).ToList();
            }
            if (sectionId.HasValue)
            {
                dtoList = dtoList.Where(d => d.SectionId == sectionId.Value).ToList();
            }

            var result = new PagedResult<StudentGatePassDto>
            {
                Items = dtoList,
                TotalCount = totalCount,
                PageNo = pageNo,
                PageSize = pageSize
            };

            return Ok(ApiResponse<PagedResult<StudentGatePassDto>>.Ok(result));
        }

        // =========================================================================
        // 2. GET SINGLE GATE PASS BY ID
        // =========================================================================
        [HttpGet("{id}")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<StudentGatePassDto>>> GetGatePassById(long id)
        {
            var branchId = _currentUserService.BranchId;

            var g = await _context.StudentGatePasses
                .Include(x => x.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(x => x.AcademicYear)
                .FirstOrDefaultAsync(x => x.Id == id && x.BranchId == branchId && x.IsActive);

            if (g == null)
            {
                return NotFound(ApiResponse<StudentGatePassDto>.Fail("Student gate pass not found."));
            }

            var enrollment = await _context.StudentEnrollments
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.StudentId == g.StudentId && e.AcademicYearId == g.AcademicYearId && e.Status == StudentStatus.Active)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            var father = g.Student?.Guardians?.FirstOrDefault(gd => gd.Relation.Equals("Father", StringComparison.OrdinalIgnoreCase))
                         ?? g.Student?.Guardians?.FirstOrDefault(gd => gd.IsPrimary);

            var dto = new StudentGatePassDto
            {
                Id = g.Id,
                BranchId = g.BranchId,
                AcademicYearId = g.AcademicYearId,
                AcademicYearName = g.AcademicYear?.Name,
                StudentId = g.StudentId,
                StudentName = g.Student?.FullName ?? "Unknown",
                AdmissionNo = g.Student?.AdmissionNo ?? "",
                PhotoUrl = g.Student?.PhotoUrl,
                Gender = g.Student?.Gender,
                ClassId = enrollment?.ClassId,
                ClassName = enrollment?.Class?.Name ?? "",
                SectionId = enrollment?.SectionId,
                SectionName = enrollment?.Section?.Name ?? "",
                RollNo = enrollment?.RollNo,
                FatherName = father?.Name,
                FatherMobile = father?.Mobile,
                EmergencyContact = g.Student?.EmergencyContact,
                GatePassNo = g.GatePassNo,
                PassDate = g.PassDate,
                OutTime = g.OutTime,
                ExpectedReturnTime = g.ExpectedReturnTime,
                ActualReturnTime = g.ActualReturnTime,
                Reason = g.Reason,
                ReasonDetail = g.ReasonDetail,
                ReceiverName = g.ReceiverName,
                ReceiverRelation = g.ReceiverRelation,
                ReceiverContact = g.ReceiverContact,
                ReceiverPhotoUrl = g.ReceiverPhotoUrl,
                ApprovedBy = g.ApprovedBy,
                Status = g.Status,
                Remarks = g.Remarks,
                CreatedOn = g.CreatedOn
            };

            return Ok(ApiResponse<StudentGatePassDto>.Ok(dto));
        }

        // =========================================================================
        // 3. CREATE / ISSUE NEW GATE PASS
        // =========================================================================
        [HttpPost]
        [HasPermission("Students", "Add")]
        public async Task<ActionResult<ApiResponse<StudentGatePassDto>>> CreateGatePass([FromBody] CreateStudentGatePassDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var userId = _currentUserService.UserId ?? 1;

            if (dto.StudentId <= 0)
            {
                return BadRequest(ApiResponse<StudentGatePassDto>.Fail("Student is required."));
            }

            var student = await _context.Students
                .Include(s => s.Guardians)
                .FirstOrDefaultAsync(s => s.Id == dto.StudentId && s.BranchId == branchId && s.IsActive);

            if (student == null)
            {
                return NotFound(ApiResponse<StudentGatePassDto>.Fail("Student not found."));
            }

            // Auto-generate Gate Pass Number if not given
            string gatePassNo = dto.GatePassNo?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(gatePassNo))
            {
                var today = DateTime.UtcNow.Date;
                var todayCount = await _context.StudentGatePasses
                    .CountAsync(g => g.BranchId == branchId && g.PassDate >= today);
                gatePassNo = $"GP-{DateTime.UtcNow:yyyyMMdd}-{(todayCount + 1):D4}";
            }

            var entity = new StudentGatePass
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                StudentId = dto.StudentId,
                GatePassNo = gatePassNo,
                PassDate = dto.PassDate ?? DateTime.UtcNow,
                OutTime = string.IsNullOrWhiteSpace(dto.OutTime) ? DateTime.Now.ToString("hh:mm tt") : dto.OutTime.Trim(),
                ExpectedReturnTime = dto.ExpectedReturnTime?.Trim(),
                ActualReturnTime = null,
                Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Other" : dto.Reason.Trim(),
                ReasonDetail = dto.ReasonDetail?.Trim(),
                ReceiverName = string.IsNullOrWhiteSpace(dto.ReceiverName) ? "Parent" : dto.ReceiverName.Trim(),
                ReceiverRelation = string.IsNullOrWhiteSpace(dto.ReceiverRelation) ? "Parent" : dto.ReceiverRelation.Trim(),
                ReceiverContact = dto.ReceiverContact?.Trim(),
                ReceiverPhotoUrl = dto.ReceiverPhotoUrl?.Trim(),
                ApprovedBy = string.IsNullOrWhiteSpace(dto.ApprovedBy) ? "Authorized Staff" : dto.ApprovedBy.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Issued" : dto.Status.Trim(),
                Remarks = dto.Remarks?.Trim(),
                CreatedBy = userId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.StudentGatePasses.Add(entity);
            await _context.SaveChangesAsync();

            return await GetGatePassById(entity.Id);
        }

        // =========================================================================
        // 4. UPDATE GATE PASS STATUS (Mark Departed, Returned, Cancelled)
        // =========================================================================
        [HttpPut("{id}/status")]
        [HasPermission("Students", "Edit")]
        public async Task<ActionResult<ApiResponse<StudentGatePassDto>>> UpdateStatus(long id, [FromBody] UpdateGatePassStatusDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            var entity = await _context.StudentGatePasses
                .FirstOrDefaultAsync(g => g.Id == id && g.BranchId == branchId && g.IsActive);

            if (entity == null)
            {
                return NotFound(ApiResponse<StudentGatePassDto>.Fail("Student gate pass not found."));
            }

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                entity.Status = dto.Status.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.ActualReturnTime))
            {
                entity.ActualReturnTime = dto.ActualReturnTime.Trim();
            }
            else if (entity.Status.Equals("Returned", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(entity.ActualReturnTime))
            {
                entity.ActualReturnTime = DateTime.Now.ToString("hh:mm tt");
            }

            if (!string.IsNullOrWhiteSpace(dto.Remarks))
            {
                entity.Remarks = (string.IsNullOrWhiteSpace(entity.Remarks) ? "" : entity.Remarks + " | ") + dto.Remarks.Trim();
            }

            entity.ModifiedBy = userId;
            entity.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetGatePassById(entity.Id);
        }

        // =========================================================================
        // 5. UPDATE GATE PASS
        // =========================================================================
        [HttpPut("{id}")]
        [HasPermission("Students", "Edit")]
        public async Task<ActionResult<ApiResponse<StudentGatePassDto>>> UpdateGatePass(long id, [FromBody] CreateStudentGatePassDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            var entity = await _context.StudentGatePasses
                .FirstOrDefaultAsync(g => g.Id == id && g.BranchId == branchId && g.IsActive);

            if (entity == null)
            {
                return NotFound(ApiResponse<StudentGatePassDto>.Fail("Student gate pass not found."));
            }

            if (!string.IsNullOrWhiteSpace(dto.OutTime)) entity.OutTime = dto.OutTime.Trim();
            if (dto.ExpectedReturnTime != null) entity.ExpectedReturnTime = dto.ExpectedReturnTime.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Reason)) entity.Reason = dto.Reason.Trim();
            if (dto.ReasonDetail != null) entity.ReasonDetail = dto.ReasonDetail.Trim();
            if (!string.IsNullOrWhiteSpace(dto.ReceiverName)) entity.ReceiverName = dto.ReceiverName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.ReceiverRelation)) entity.ReceiverRelation = dto.ReceiverRelation.Trim();
            if (dto.ReceiverContact != null) entity.ReceiverContact = dto.ReceiverContact.Trim();
            if (dto.ReceiverPhotoUrl != null) entity.ReceiverPhotoUrl = dto.ReceiverPhotoUrl.Trim();
            if (!string.IsNullOrWhiteSpace(dto.ApprovedBy)) entity.ApprovedBy = dto.ApprovedBy.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Status)) entity.Status = dto.Status.Trim();
            if (dto.Remarks != null) entity.Remarks = dto.Remarks.Trim();

            entity.ModifiedBy = userId;
            entity.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetGatePassById(entity.Id);
        }

        // =========================================================================
        // 6. DELETE / CANCEL GATE PASS
        // =========================================================================
        [HttpDelete("{id}")]
        [HasPermission("Students", "Delete")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteGatePass(long id)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            var entity = await _context.StudentGatePasses
                .FirstOrDefaultAsync(g => g.Id == id && g.BranchId == branchId && g.IsActive);

            if (entity == null)
            {
                return NotFound(ApiResponse<bool>.Fail("Student gate pass not found."));
            }

            entity.IsActive = false;
            entity.Status = "Cancelled";
            entity.ModifiedBy = userId;
            entity.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<bool>.Ok(true, "Gate pass cancelled successfully."));
        }

        // =========================================================================
        // 7. GET TODAY STATS
        // =========================================================================
        [HttpGet("stats")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<GatePassStatsDto>>> GetStats()
        {
            var branchId = _currentUserService.BranchId;
            var today = DateTime.UtcNow.Date;

            var allActive = await _context.StudentGatePasses
                .Where(g => g.BranchId == branchId && g.IsActive)
                .AsNoTracking()
                .ToListAsync();

            var todayList = allActive.Where(g => g.PassDate >= today).ToList();

            var stats = new GatePassStatsDto
            {
                TotalToday = todayList.Count,
                CurrentlyOut = allActive.Count(g => g.Status.Equals("Departed", StringComparison.OrdinalIgnoreCase) || g.Status.Equals("Issued", StringComparison.OrdinalIgnoreCase)),
                ReturnedToday = todayList.Count(g => g.Status.Equals("Returned", StringComparison.OrdinalIgnoreCase)),
                CancelledToday = todayList.Count(g => g.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)),
                TotalAll = allActive.Count
            };

            return Ok(ApiResponse<GatePassStatsDto>.Ok(stats));
        }

        // =========================================================================
        // 8. QUICK STUDENT SEARCH FOR GATE PASS ISSUANCE
        // =========================================================================
        [HttpGet("search-students")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<List<object>>>> SearchStudents(
            [FromQuery] string? query,
            [FromQuery] long? classId,
            [FromQuery] long? sectionId,
            [FromQuery] int limit = 20)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var q = _context.StudentEnrollments
                .Include(e => e.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.Student!.BranchId == branchId && (yearId == 0 || e.AcademicYearId == yearId) && e.Status == StudentStatus.Active && e.Student.IsActive)
                .AsNoTracking();

            if (classId.HasValue) q = q.Where(e => e.ClassId == classId.Value);
            if (sectionId.HasValue) q = q.Where(e => e.SectionId == sectionId.Value);

            if (!string.IsNullOrWhiteSpace(query))
            {
                var s = query.Trim().ToLower();
                q = q.Where(e =>
                    e.Student!.AdmissionNo.ToLower().Contains(s) ||
                    e.Student.FirstName.ToLower().Contains(s) ||
                    e.Student.LastName.ToLower().Contains(s) ||
                    (e.Student.FirstName + " " + e.Student.LastName).ToLower().Contains(s) ||
                    e.Student.Guardians.Any(g => g.Mobile.Contains(s) || g.Name.ToLower().Contains(s)));
            }

            var results = await q
                .Take(limit)
                .Select(e => new
                {
                    StudentId = e.StudentId,
                    FullName = e.Student!.FullName,
                    AdmissionNo = e.Student.AdmissionNo,
                    RollNo = e.RollNo,
                    ClassId = e.ClassId,
                    ClassName = e.Class != null ? e.Class.Name : "",
                    SectionId = e.SectionId,
                    SectionName = e.Section != null ? e.Section.Name : "",
                    PhotoUrl = e.Student.PhotoUrl,
                    EmergencyContact = e.Student.EmergencyContact,
                    FatherName = e.Student.Guardians.Where(g => g.Relation == "Father").Select(g => g.Name).FirstOrDefault()
                                ?? e.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Name).FirstOrDefault(),
                    FatherMobile = e.Student.Guardians.Where(g => g.Relation == "Father").Select(g => g.Mobile).FirstOrDefault()
                                  ?? e.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Mobile).FirstOrDefault()
                })
                .ToListAsync();

            return Ok(ApiResponse<List<object>>.Ok(results.Cast<object>().ToList()));
        }
    }
}
