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
    [Route("api/student-certificates")]
    [Authorize]
    public class StudentCertificateController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public StudentCertificateController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private static string NormalizeType(string? t)
        {
            if (string.IsNullOrWhiteSpace(t)) return "bonafide";
            var s = t.Trim().ToLowerInvariant();
            return s switch
            {
                "dob" or "birth" => "birth",
                "age" => "age",
                "character" or "cc" => "character",
                "ret" => "ret",
                _ => "bonafide"
            };
        }

        private static string GetRefPrefix(string type)
        {
            return NormalizeType(type) switch
            {
                "birth" => "DPS/DOB",
                "age" => "DPS/AGE",
                "character" => "DPS/CC",
                "ret" => "DPS/RET",
                _ => "DPS/BC"
            };
        }

        // =========================================================================
        // 1. GET LIST OF ISSUED CERTIFICATES
        // =========================================================================
        [HttpGet]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<PagedResult<StudentCertificateDto>>>> GetCertificates(
            [FromQuery] string? certificateType,
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

            var query = _context.StudentCertificates
                .Include(c => c.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(c => c.AcademicYear)
                .Where(c => c.BranchId == branchId && c.IsActive);

            if (yearId > 0)
            {
                query = query.Where(c => c.AcademicYearId == yearId);
            }

            if (!string.IsNullOrWhiteSpace(certificateType) && !certificateType.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                var normType = NormalizeType(certificateType);
                query = query.Where(c => c.CertificateType.ToLower() == normType);
            }

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var s = status.Trim().ToLower();
                query = query.Where(c => c.Status.ToLower() == s);
            }

            if (fromDate.HasValue)
            {
                var f = fromDate.Value.Date;
                query = query.Where(c => c.IssueDate >= f);
            }

            if (toDate.HasValue)
            {
                var t = toDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(c => c.IssueDate <= t);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c =>
                    c.CertificateNo.ToLower().Contains(s) ||
                    c.Purpose.ToLower().Contains(s) ||
                    (c.IssuedBy != null && c.IssuedBy.ToLower().Contains(s)) ||
                    (c.Student != null && (
                        c.Student.FirstName.ToLower().Contains(s) ||
                        c.Student.LastName.ToLower().Contains(s) ||
                        (c.Student.FirstName + " " + c.Student.LastName).ToLower().Contains(s) ||
                        c.Student.AdmissionNo.ToLower().Contains(s)
                    )));
            }

            // Enrollments filter for Class and Section
            if (classId.HasValue || sectionId.HasValue)
            {
                var enrolledStudentIds = _context.StudentEnrollments
                    .Where(e => (yearId == 0 || e.AcademicYearId == yearId) && e.Status == StudentStatus.Active);

                if (classId.HasValue)
                    enrolledStudentIds = enrolledStudentIds.Where(e => e.ClassId == classId.Value);
                if (sectionId.HasValue)
                    enrolledStudentIds = enrolledStudentIds.Where(e => e.SectionId == sectionId.Value);

                var sIds = enrolledStudentIds.Select(e => e.StudentId);
                query = query.Where(c => sIds.Contains(c.StudentId));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(c => c.IssueDate)
                .ThenByDescending(c => c.Id)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var studentIds = items.Select(c => c.StudentId).Distinct().ToList();
            var enrollments = await _context.StudentEnrollments
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => studentIds.Contains(e.StudentId) && (yearId == 0 || e.AcademicYearId == yearId) && e.Status == StudentStatus.Active)
                .ToDictionaryAsync(e => e.StudentId);

            var dtoList = items.Select(c =>
            {
                enrollments.TryGetValue(c.StudentId, out var enr);
                var father = c.Student?.Guardians?.FirstOrDefault(g => g.Relation == "Father")
                             ?? c.Student?.Guardians?.FirstOrDefault(g => g.IsPrimary);
                var mother = c.Student?.Guardians?.FirstOrDefault(g => g.Relation == "Mother");

                return new StudentCertificateDto
                {
                    Id = c.Id,
                    BranchId = c.BranchId,
                    AcademicYearId = c.AcademicYearId,
                    AcademicYearName = c.AcademicYear?.Name,
                    StudentId = c.StudentId,
                    StudentName = c.Student?.FullName ?? "Unknown",
                    AdmissionNo = c.Student?.AdmissionNo ?? "",
                    PhotoUrl = c.Student?.PhotoUrl,
                    Gender = c.Student?.Gender.ToString(),
                    Dob = c.Student?.DateOfBirth,
                    ClassId = enr?.ClassId,
                    ClassName = enr?.Class?.Name ?? "",
                    SectionId = enr?.SectionId,
                    SectionName = enr?.Section?.Name ?? "",
                    RollNo = enr?.RollNo,
                    FatherName = father?.Name,
                    MotherName = mother?.Name,
                    FatherMobile = father?.Mobile,
                    EmergencyContact = c.Student?.EmergencyContact,
                    CertificateType = c.CertificateType,
                    CertificateNo = c.CertificateNo,
                    IssueDate = c.IssueDate,
                    Purpose = c.Purpose,
                    IssuedBy = c.IssuedBy,
                    Status = c.Status,
                    Remarks = c.Remarks,
                    OptionsJson = c.OptionsJson,
                    CreatedOn = c.CreatedOn
                };
            }).ToList();

            var paged = new PagedResult<StudentCertificateDto>(dtoList, totalCount, pageNo, pageSize);
            return Ok(ApiResponse<PagedResult<StudentCertificateDto>>.Ok(paged));
        }

        // =========================================================================
        // 2. GET CERTIFICATE STATS
        // =========================================================================
        [HttpGet("stats")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<StudentCertificateStatsDto>>> GetStats(
            [FromQuery] string? certificateType)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var today = DateTime.UtcNow.Date;

            var q = _context.StudentCertificates
                .Where(c => c.BranchId == branchId && c.IsActive);

            if (yearId > 0)
            {
                q = q.Where(c => c.AcademicYearId == yearId);
            }

            var all = await q.Select(c => new { c.CertificateType, c.IssueDate }).ToListAsync();

            var stats = new StudentCertificateStatsDto
            {
                TotalIssued = all.Count,
                IssuedToday = all.Count(c => c.IssueDate.Date == today),
                BonafideCount = all.Count(c => c.CertificateType == "bonafide"),
                DobCount = all.Count(c => c.CertificateType == "birth"),
                AgeCount = all.Count(c => c.CertificateType == "age"),
                CharacterCount = all.Count(c => c.CertificateType == "character"),
                RetCount = all.Count(c => c.CertificateType == "ret")
            };

            return Ok(ApiResponse<StudentCertificateStatsDto>.Ok(stats));
        }

        // =========================================================================
        // 3. GET SINGLE CERTIFICATE BY ID
        // =========================================================================
        [HttpGet("{id}")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<StudentCertificateDto>>> GetCertificateById(long id)
        {
            var branchId = _currentUserService.BranchId;

            var c = await _context.StudentCertificates
                .Include(x => x.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(x => x.AcademicYear)
                .FirstOrDefaultAsync(x => x.Id == id && x.BranchId == branchId && x.IsActive);

            if (c == null)
            {
                return NotFound(ApiResponse<StudentCertificateDto>.Fail("Certificate record not found."));
            }

            var enr = await _context.StudentEnrollments
                .Include(e => e.Class)
                .Include(e => e.Section)
                .FirstOrDefaultAsync(e => e.StudentId == c.StudentId && e.Status == StudentStatus.Active);

            var father = c.Student?.Guardians?.FirstOrDefault(g => g.Relation == "Father")
                         ?? c.Student?.Guardians?.FirstOrDefault(g => g.IsPrimary);
            var mother = c.Student?.Guardians?.FirstOrDefault(g => g.Relation == "Mother");

            var dto = new StudentCertificateDto
            {
                Id = c.Id,
                BranchId = c.BranchId,
                AcademicYearId = c.AcademicYearId,
                AcademicYearName = c.AcademicYear?.Name,
                StudentId = c.StudentId,
                StudentName = c.Student?.FullName ?? "",
                AdmissionNo = c.Student?.AdmissionNo ?? "",
                PhotoUrl = c.Student?.PhotoUrl,
                Gender = c.Student?.Gender.ToString(),
                Dob = c.Student?.DateOfBirth,
                ClassId = enr?.ClassId,
                ClassName = enr?.Class?.Name ?? "",
                SectionId = enr?.SectionId,
                SectionName = enr?.Section?.Name ?? "",
                RollNo = enr?.RollNo,
                FatherName = father?.Name,
                MotherName = mother?.Name,
                FatherMobile = father?.Mobile,
                EmergencyContact = c.Student?.EmergencyContact,
                CertificateType = c.CertificateType,
                CertificateNo = c.CertificateNo,
                IssueDate = c.IssueDate,
                Purpose = c.Purpose,
                IssuedBy = c.IssuedBy,
                Status = c.Status,
                Remarks = c.Remarks,
                OptionsJson = c.OptionsJson,
                CreatedOn = c.CreatedOn
            };

            return Ok(ApiResponse<StudentCertificateDto>.Ok(dto));
        }

        // =========================================================================
        // 4. CREATE / ISSUE NEW CERTIFICATE
        // =========================================================================
        [HttpPost]
        [HasPermission("Students", "Create")]
        public async Task<ActionResult<ApiResponse<StudentCertificateDto>>> CreateCertificate(
            [FromBody] CreateStudentCertificateDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var userId = _currentUserService.UserId;

            if (dto.StudentId <= 0)
            {
                return BadRequest(ApiResponse<StudentCertificateDto>.Fail("StudentId is required."));
            }

            var student = await _context.Students
                .Include(s => s.Guardians)
                .FirstOrDefaultAsync(s => s.Id == dto.StudentId && s.BranchId == branchId && s.IsActive);

            if (student == null)
            {
                return NotFound(ApiResponse<StudentCertificateDto>.Fail("Student not found or inactive."));
            }

            var certType = NormalizeType(dto.CertificateType);
            var prefix = GetRefPrefix(certType);

            // Generate Ref No if not supplied
            var certNo = dto.CertificateNo;
            if (string.IsNullOrWhiteSpace(certNo))
            {
                var currentYear = DateTime.UtcNow.Year;
                var count = await _context.StudentCertificates
                    .CountAsync(c => c.BranchId == branchId && c.CertificateType == certType && c.IssueDate.Year == currentYear);

                var cleanAdm = !string.IsNullOrWhiteSpace(student.AdmissionNo)
                    ? student.AdmissionNo.Replace("/", "").Trim()
                    : (student.Id).ToString("D4");

                certNo = $"{prefix}/{currentYear}/{(count + 1):D4}/{cleanAdm}";
            }

            var entity = new StudentCertificate
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                StudentId = dto.StudentId,
                CertificateType = certType,
                CertificateNo = certNo.Trim(),
                IssueDate = dto.IssueDate ?? DateTime.UtcNow,
                Purpose = string.IsNullOrWhiteSpace(dto.Purpose) ? "Official Records Verification" : dto.Purpose.Trim(),
                IssuedBy = string.IsNullOrWhiteSpace(dto.IssuedBy) ? "Principal / Authorized Signatory" : dto.IssuedBy.Trim(),
                Status = "Issued",
                Remarks = dto.Remarks,
                OptionsJson = dto.OptionsJson,
                CreatedBy = userId ?? 0,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.StudentCertificates.Add(entity);
            await _context.SaveChangesAsync();

            // Fetch enrollment details for response
            var enr = await _context.StudentEnrollments
                .Include(e => e.Class)
                .Include(e => e.Section)
                .FirstOrDefaultAsync(e => e.StudentId == student.Id && (yearId == 0 || e.AcademicYearId == yearId) && e.Status == StudentStatus.Active);

            var father = student.Guardians?.FirstOrDefault(g => g.Relation == "Father")
                         ?? student.Guardians?.FirstOrDefault(g => g.IsPrimary);
            var mother = student.Guardians?.FirstOrDefault(g => g.Relation == "Mother");

            var resultDto = new StudentCertificateDto
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                AcademicYearId = entity.AcademicYearId,
                StudentId = entity.StudentId,
                StudentName = student.FullName,
                AdmissionNo = student.AdmissionNo,
                PhotoUrl = student.PhotoUrl,
                Gender = student.Gender.ToString(),
                Dob = student.DateOfBirth,
                ClassId = enr?.ClassId,
                ClassName = enr?.Class?.Name ?? "",
                SectionId = enr?.SectionId,
                SectionName = enr?.Section?.Name ?? "",
                RollNo = enr?.RollNo,
                FatherName = father?.Name,
                MotherName = mother?.Name,
                FatherMobile = father?.Mobile,
                EmergencyContact = student.EmergencyContact,
                CertificateType = entity.CertificateType,
                CertificateNo = entity.CertificateNo,
                IssueDate = entity.IssueDate,
                Purpose = entity.Purpose,
                IssuedBy = entity.IssuedBy,
                Status = entity.Status,
                Remarks = entity.Remarks,
                OptionsJson = entity.OptionsJson,
                CreatedOn = entity.CreatedOn
            };

            return CreatedAtAction(nameof(GetCertificateById), new { id = entity.Id }, ApiResponse<StudentCertificateDto>.Ok(resultDto, "Certificate issued successfully."));
        }

        // =========================================================================
        // 5. DELETE / REVOKE CERTIFICATE
        // =========================================================================
        [HttpDelete("{id}")]
        [HasPermission("Students", "Delete")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteCertificate(long id)
        {
            var branchId = _currentUserService.BranchId;

            var entity = await _context.StudentCertificates
                .FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId && c.IsActive);

            if (entity == null)
            {
                return NotFound(ApiResponse<bool>.Fail("Certificate not found."));
            }

            entity.IsActive = false;
            entity.Status = "Cancelled";
            entity.ModifiedBy = _currentUserService.UserId;
            entity.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, "Certificate cancelled successfully."));
        }

        // =========================================================================
        // 6. QUICK STUDENT SEARCH FOR ISSUING MODAL
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
                    Id = e.StudentId,
                    StudentId = e.StudentId,
                    FullName = e.Student!.FullName,
                    StudentName = e.Student.FullName,
                    AdmissionNo = e.Student.AdmissionNo,
                    RollNo = e.RollNo,
                    ClassId = e.ClassId,
                    ClassName = e.Class != null ? e.Class.Name : "",
                    SectionId = e.SectionId,
                    SectionName = e.Section != null ? e.Section.Name : "",
                    PhotoUrl = e.Student.PhotoUrl,
                    Dob = e.Student.DateOfBirth,
                    Gender = e.Student.Gender.ToString(),
                    EmergencyContact = e.Student.EmergencyContact,
                    FatherName = e.Student.Guardians.Where(g => g.Relation == "Father").Select(g => g.Name).FirstOrDefault()
                                ?? e.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Name).FirstOrDefault(),
                    MotherName = e.Student.Guardians.Where(g => g.Relation == "Mother").Select(g => g.Name).FirstOrDefault(),
                    FatherMobile = e.Student.Guardians.Where(g => g.Relation == "Father").Select(g => g.Mobile).FirstOrDefault()
                                  ?? e.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Mobile).FirstOrDefault()
                })
                .ToListAsync();

            return Ok(ApiResponse<List<object>>.Ok(results.Cast<object>().ToList()));
        }
    }
}
