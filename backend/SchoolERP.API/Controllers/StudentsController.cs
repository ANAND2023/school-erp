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
    [Route("api/[controller]")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly INumberingSeriesService _numberingService;

        public StudentsController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            INumberingSeriesService numberingService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _numberingService = numberingService;
        }

        [HttpGet]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<PagedResult<StudentListDto>>>> GetStudents(
            [FromQuery] string? search,
            [FromQuery] long? classId,
            [FromQuery] long? sectionId,
            [FromQuery] StudentStatus? status,
            [FromQuery] long? categoryId,
            [FromQuery] long? academicYearId,
            [FromQuery] string? admissionType,
            [FromQuery] int pageNo = 1,
            [FromQuery] int pageSize = 10)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // Validate that yearId belongs to current branch; if not, fallback to branch's active year
            if (yearId > 0 && !await _context.AcademicYears.AnyAsync(ay => ay.Id == yearId && ay.BranchId == branchId))
            {
                var fallbackYear = await _context.AcademicYears
                    .Where(ay => ay.BranchId == branchId && ay.IsActive)
                    .OrderByDescending(ay => ay.IsCurrent)
                    .ThenByDescending(ay => ay.Id)
                    .FirstOrDefaultAsync();
                yearId = fallbackYear?.Id ?? 0;
            }

            var effectiveYearId = (academicYearId.HasValue && academicYearId.Value > 0) ? academicYearId.Value : yearId;
            var targetYearObj = effectiveYearId > 0 ? await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == effectiveYearId && ay.BranchId == branchId) : null;
            var targetStartDate = targetYearObj?.StartDate ?? DateTime.MinValue;

            var query = _context.StudentEnrollments
                .Include(e => e.Student)
                .ThenInclude(s => s!.Guardians)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.Student!.BranchId == branchId)
                .AsNoTracking();

            // Academic Year filtering:
            if (academicYearId.HasValue)
            {
                if (academicYearId.Value > 0)
                {
                    var targetYear = academicYearId.Value;
                    if (!await _context.AcademicYears.AnyAsync(ay => ay.Id == targetYear && ay.BranchId == branchId))
                    {
                        targetYear = yearId;
                    }
                    if (targetYear > 0)
                    {
                        query = query.Where(e => e.AcademicYearId == targetYear);
                    }
                }
                // academicYearId == 0 searches across all academic years
            }
            else if (!string.IsNullOrWhiteSpace(search))
            {
                var sTerm = search.Trim().ToLower();
                var hasInCurrentYear = await query.AnyAsync(e => e.AcademicYearId == yearId && (
                    e.Student!.AdmissionNo.ToLower().Contains(sTerm) ||
                    e.Student.FirstName.ToLower().Contains(sTerm) ||
                    e.Student.LastName.ToLower().Contains(sTerm) ||
                    (e.Student.FirstName + " " + e.Student.LastName).ToLower().Contains(sTerm) ||
                    (e.Class != null && e.Class.Name.ToLower().Contains(sTerm)) ||
                    e.Student.Guardians.Any(g => g.Mobile.Contains(sTerm) || g.Name.ToLower().Contains(sTerm))));

                if (hasInCurrentYear)
                {
                    query = query.Where(e => e.AcademicYearId == yearId);
                }
                // If not found in current year, search across all years so the student is found
            }
            else if (yearId > 0)
            {
                query = query.Where(e => e.AcademicYearId == yearId);
            }

            // Admission Type filtering (All, New/Fresh, Promoted/Continuing)
            if (!string.IsNullOrWhiteSpace(admissionType) && effectiveYearId > 0)
            {
                var at = admissionType.Trim().ToLower();
                if (at == "new" || at == "fresh")
                {
                    query = query.Where(e =>
                        !e.Student!.Enrollments.Any(prev => prev.AcademicYearId != e.AcademicYearId && (prev.AcademicYear!.StartDate < targetStartDate || prev.Id < e.AcademicYearId)) &&
                        (targetYearObj == null || e.Student.AdmissionDate >= targetStartDate));
                }
                else if (at == "promoted" || at == "continuing")
                {
                    query = query.Where(e =>
                        e.Student!.Enrollments.Any(prev => prev.AcademicYearId != e.AcademicYearId && (prev.AcademicYear!.StartDate < targetStartDate || prev.Id < e.AcademicYearId)) ||
                        (targetYearObj != null && e.Student.AdmissionDate < targetStartDate));
                }
            }

            // Default to Active students unless specified (FR-3.9)
            if (status.HasValue)
            {
                query = query.Where(e => e.Status == status.Value);
            }
            else
            {
                query = query.Where(e => e.Status == StudentStatus.Active);
            }

            if (classId.HasValue) query = query.Where(e => e.ClassId == classId.Value);
            if (sectionId.HasValue) query = query.Where(e => e.SectionId == sectionId.Value);
            if (categoryId.HasValue) query = query.Where(e => e.Student!.CategoryId == categoryId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(e => e.Student!.AdmissionNo.ToLower().Contains(s) ||
                                         e.Student.FirstName.ToLower().Contains(s) ||
                                         e.Student.LastName.ToLower().Contains(s) ||
                                         (e.Student.FirstName + " " + e.Student.LastName).ToLower().Contains(s) ||
                                         (e.Class != null && e.Class.Name.ToLower().Contains(s)) ||
                                         e.Student.Guardians.Any(g => g.Mobile.Contains(s) || g.Name.ToLower().Contains(s)));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(e => e.Class!.DisplayOrder)
                .ThenBy(e => e.Section!.Name)
                .ThenBy(e => e.RollNo ?? 999)
                .ThenBy(e => e.Student!.FirstName)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new StudentListDto
                {
                    Id = e.StudentId,
                    AdmissionNo = e.Student!.AdmissionNo,
                    FullName = e.Student.FullName,
                    FirstName = e.Student.FirstName,
                    LastName = e.Student.LastName,
                    Gender = e.Student.Gender,
                    DateOfBirth = e.Student.DateOfBirth,
                    AdmissionDate = e.Student.AdmissionDate,
                    ClassId = e.ClassId,
                    ClassName = e.Class != null ? e.Class.Name : "",
                    SectionId = e.SectionId,
                    SectionName = e.Section != null ? e.Section.Name : "",
                    RollNo = e.RollNo,
                    GuardianName = e.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Name).FirstOrDefault() ??
                                   e.Student.Guardians.Select(g => g.Name).FirstOrDefault() ?? "",
                    GuardianMobile = e.Student.Guardians.Where(g => g.IsPrimary).Select(g => g.Mobile).FirstOrDefault() ??
                                     e.Student.Guardians.Select(g => g.Mobile).FirstOrDefault() ?? "",
                    Status = e.Status,
                    PhotoUrl = e.Student.PhotoUrl,
                    BloodGroup = e.Student.BloodGroup,
                    AadhaarNo = e.Student.AadhaarNo,
                    Address = e.Student.Address,
                    City = e.Student.City,
                    EmergencyContact = e.Student.EmergencyContact,
                    FatherName = e.Student.Guardians.Where(g => g.Relation.ToLower() == "father").Select(g => g.Name).FirstOrDefault() ?? "",
                    FatherMobile = e.Student.Guardians.Where(g => g.Relation.ToLower() == "father").Select(g => g.Mobile).FirstOrDefault() ?? "",
                    MotherName = e.Student.Guardians.Where(g => g.Relation.ToLower() == "mother").Select(g => g.Name).FirstOrDefault() ?? "",
                    MotherMobile = e.Student.Guardians.Where(g => g.Relation.ToLower() == "mother").Select(g => g.Mobile).FirstOrDefault() ?? "",
                    AdmissionType = (e.Student!.Enrollments.Any(prev => prev.AcademicYearId != e.AcademicYearId && (prev.AcademicYear!.StartDate < targetStartDate || prev.Id < e.AcademicYearId)) ||
                                    (targetYearObj != null && e.Student.AdmissionDate < targetStartDate))
                                    ? "Promoted" : "New Admission",
                    IsNewAdmission = !(e.Student!.Enrollments.Any(prev => prev.AcademicYearId != e.AcademicYearId && (prev.AcademicYear!.StartDate < targetStartDate || prev.Id < e.AcademicYearId)) ||
                                      (targetYearObj != null && e.Student.AdmissionDate < targetStartDate))
                })
                .ToListAsync();

            return Ok(ApiResponse<PagedResult<StudentListDto>>.Ok(
                new PagedResult<StudentListDto>(items, totalCount, pageNo, pageSize)
            ));
        }

        [HttpGet("admission-summary")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<AdmissionSummaryDto>>> GetAdmissionSummary(
            [FromQuery] long? academicYearId,
            [FromQuery] long? classId,
            [FromQuery] long? sectionId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = academicYearId ?? _currentUserService.AcademicYearId;

            var totalAllTime = await _context.Students.CountAsync(s => s.BranchId == branchId && s.IsActive);

            var query = _context.StudentEnrollments
                .Include(e => e.Student)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.Student!.BranchId == branchId && e.Status == StudentStatus.Active);

            if (yearId > 0)
            {
                query = query.Where(e => e.AcademicYearId == yearId);
            }
            if (classId.HasValue && classId.Value > 0)
            {
                query = query.Where(e => e.ClassId == classId.Value);
            }
            if (sectionId.HasValue && sectionId.Value > 0)
            {
                query = query.Where(e => e.SectionId == sectionId.Value);
            }

            var targetYearObj = yearId > 0 ? await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == yearId && ay.BranchId == branchId) : null;
            var targetStartDate = targetYearObj?.StartDate ?? DateTime.MinValue;

            var totalSession = await query.CountAsync();

            var newAdmissionsCount = await query.CountAsync(e =>
                !e.Student!.Enrollments.Any(prev => prev.AcademicYearId != e.AcademicYearId && (prev.AcademicYear!.StartDate < targetStartDate || prev.Id < e.AcademicYearId)) &&
                (targetYearObj == null || e.Student.AdmissionDate >= targetStartDate));
            var promotedCount = Math.Max(0, totalSession - newAdmissionsCount);

            var boysCount = await query.CountAsync(e => e.Student!.Gender.ToLower() == "male");
            var girlsCount = await query.CountAsync(e => e.Student!.Gender.ToLower() == "female");

            var classWise = await query
                .GroupBy(e => new { e.ClassId, ClassName = e.Class != null ? e.Class.Name : "Unknown" })
                .Select(g => new ClassAdmissionStatDto
                {
                    ClassId = g.Key.ClassId,
                    ClassName = g.Key.ClassName,
                    Count = g.Count()
                })
                .ToListAsync();

            var recentAdmissions = await _context.Students
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .Include(s => s.Guardians)
                .Where(s => s.BranchId == branchId && s.IsActive)
                .OrderByDescending(s => s.Id)
                .Take(10)
                .Select(s => new RecentAdmissionItemDto
                {
                    Id = s.Id,
                    AdmissionNo = s.AdmissionNo,
                    FullName = s.FullName,
                    AdmissionDate = s.AdmissionDate,
                    Gender = s.Gender,
                    ClassName = s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.Class!.Name).FirstOrDefault() ?? "",
                    SectionName = s.Enrollments.OrderByDescending(e => e.Id).Select(e => e.Section!.Name).FirstOrDefault() ?? "",
                    GuardianMobile = s.Guardians.Where(g => g.IsPrimary).Select(g => g.Mobile).FirstOrDefault() ?? s.Guardians.Select(g => g.Mobile).FirstOrDefault() ?? "",
                    PhotoUrl = s.PhotoUrl
                })
                .ToListAsync();

            return Ok(ApiResponse<AdmissionSummaryDto>.Ok(new AdmissionSummaryDto
            {
                TotalAllTime = totalAllTime,
                TotalSession = totalSession,
                NewAdmissionsCount = newAdmissionsCount,
                PromotedCount = promotedCount,
                BoysCount = boysCount,
                GirlsCount = girlsCount,
                ClassWise = classWise,
                RecentAdmissions = recentAdmissions
            }));
        }

        [HttpGet("{id}")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<StudentDetailDto>>> GetStudentDetail(long id)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var student = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.AcademicYear)
                .Include(s => s.Documents)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (student == null) return NotFound(ApiResponse<StudentDetailDto>.Fail("Student not found."));

            var currentEnrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);

            // Detect Siblings by primary guardian mobile (FR-3.4)
            var primaryMobile = student.Guardians.FirstOrDefault(g => g.IsPrimary)?.Mobile ??
                                student.Guardians.FirstOrDefault()?.Mobile;

            var siblingIds = new HashSet<long>();
            if (student.FamilyId.HasValue)
            {
                var famIds = await _context.Students
                    .Where(s => s.FamilyId == student.FamilyId && s.Id != id && s.BranchId == branchId && s.Status == StudentStatus.Active)
                    .Select(s => s.Id)
                    .ToListAsync();
                foreach (var fid in famIds) siblingIds.Add(fid);
            }

            var mappedSibIds = await _context.StudentSiblings
                .Where(ss => ss.StudentId == id && ss.SiblingStudent!.Status == StudentStatus.Active)
                .Select(ss => ss.SiblingStudentId)
                .ToListAsync();
            foreach (var sid in mappedSibIds) siblingIds.Add(sid);

            if (!string.IsNullOrEmpty(primaryMobile))
            {
                var mobileSibIds = await _context.StudentGuardians
                    .Where(g => g.Mobile == primaryMobile && g.StudentId != id && g.Student!.BranchId == branchId && g.Student.Status == StudentStatus.Active)
                    .Select(g => g.StudentId)
                    .ToListAsync();
                foreach (var mid in mobileSibIds) siblingIds.Add(mid);
            }

            var siblings = new List<SiblingDto>();
            if (siblingIds.Any())
            {
                siblings = await _context.Students
                    .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                    .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                    .Include(s => s.Guardians)
                    .Where(s => siblingIds.Contains(s.Id) && s.BranchId == branchId && s.Status == StudentStatus.Active)
                    .Select(s => new SiblingDto
                    {
                        StudentId = s.Id,
                        AdmissionNo = s.AdmissionNo,
                        FullName = s.FullName,
                        ClassName = s.Enrollments.Where(e => e.AcademicYearId == yearId).Select(e => e.Class!.Name).FirstOrDefault() ?? "",
                        SectionName = s.Enrollments.Where(e => e.AcademicYearId == yearId).Select(e => e.Section!.Name).FirstOrDefault() ?? "",
                        GuardianName = s.Guardians.Where(g => g.IsPrimary).Select(g => g.Name).FirstOrDefault() ?? s.Guardians.Select(g => g.Name).FirstOrDefault() ?? "",
                        GuardianMobile = s.Guardians.Where(g => g.IsPrimary).Select(g => g.Mobile).FirstOrDefault() ?? s.Guardians.Select(g => g.Mobile).FirstOrDefault() ?? "",
                        PhotoUrl = s.PhotoUrl
                    })
                    .ToListAsync();
            }

            var category = student.CategoryId.HasValue
                ? await _context.SimpleMasters.Where(m => m.Id == student.CategoryId.Value).Select(m => m.Name).FirstOrDefaultAsync()
                : null;

            var religion = student.ReligionId.HasValue
                ? await _context.SimpleMasters.Where(m => m.Id == student.ReligionId.Value).Select(m => m.Name).FirstOrDefaultAsync()
                : null;

            var detail = new StudentDetailDto
            {
                Id = student.Id,
                AdmissionNo = student.AdmissionNo,
                FirstName = student.FirstName,
                LastName = student.LastName,
                DateOfBirth = student.DateOfBirth,
                Gender = student.Gender,
                CategoryId = student.CategoryId,
                CategoryName = category,
                ReligionId = student.ReligionId,
                ReligionName = religion,
                BloodGroup = student.BloodGroup,
                AadhaarNo = student.AadhaarNo,
                PhotoUrl = student.PhotoUrl,
                Status = student.Status,
                Address = student.Address,
                City = student.City,
                State = student.State,
                Pincode = student.Pincode,
                EmergencyContact = student.EmergencyContact,
                AdmissionDate = student.AdmissionDate,
                CurrentEnrollment = currentEnrollment != null ? new StudentEnrollmentDto
                {
                    Id = currentEnrollment.Id,
                    AcademicYearId = currentEnrollment.AcademicYearId,
                    AcademicYearName = currentEnrollment.AcademicYear?.Name ?? "",
                    ClassId = currentEnrollment.ClassId,
                    ClassName = currentEnrollment.Class?.Name ?? "",
                    SectionId = currentEnrollment.SectionId,
                    SectionName = currentEnrollment.Section?.Name ?? "",
                    RollNo = currentEnrollment.RollNo,
                    Status = currentEnrollment.Status
                } : null,
                Guardians = student.Guardians.Select(g => new StudentGuardianDto
                {
                    Id = g.Id,
                    Relation = g.Relation,
                    Name = g.Name,
                    Mobile = g.Mobile,
                    Email = g.Email,
                    Occupation = g.Occupation,
                    AnnualIncome = g.AnnualIncome,
                    IsPrimary = g.IsPrimary
                }).ToList(),
                EnrollmentHistory = student.Enrollments.OrderByDescending(e => e.AcademicYearId).Select(e => new StudentEnrollmentDto
                {
                    Id = e.Id,
                    AcademicYearId = e.AcademicYearId,
                    AcademicYearName = e.AcademicYear?.Name ?? "",
                    ClassId = e.ClassId,
                    ClassName = e.Class?.Name ?? "",
                    SectionId = e.SectionId,
                    SectionName = e.Section?.Name ?? "",
                    RollNo = e.RollNo,
                    Status = e.Status
                }).ToList(),
                Documents = student.Documents.Select(d => new StudentDocumentDto
                {
                    Id = d.Id,
                    DocumentTypeId = d.DocumentTypeId,
                    Title = d.Title,
                    FilePath = d.FilePath
                }).ToList(),
                Siblings = siblings,
                FamilyId = student.FamilyId,
                SiblingStudentId = student.SiblingStudentId
            };

            var sectionHistories = await _context.StudentSectionHistories
                .Include(h => h.FromSection)
                .Include(h => h.ToSection)
                .Where(h => h.StudentId == id)
                .OrderByDescending(h => h.ChangedOn)
                .Select(h => new StudentSectionHistoryDto
                {
                    Id = h.Id,
                    StudentId = h.StudentId,
                    ClassId = h.ClassId,
                    FromSectionId = h.FromSectionId,
                    FromSectionName = h.FromSection != null ? h.FromSection.Name : "",
                    ToSectionId = h.ToSectionId,
                    ToSectionName = h.ToSection != null ? h.ToSection.Name : "",
                    Reason = h.Reason,
                    ChangedOn = h.ChangedOn,
                    ChangedBy = h.ChangedBy
                })
                .ToListAsync();

            detail.SectionHistories = sectionHistories;

            return Ok(ApiResponse<StudentDetailDto>.Ok(detail));
        }

        [HttpGet("siblings")]
        public async Task<ActionResult<ApiResponse<List<SiblingDto>>>> CheckSiblings([FromQuery] string? mobile, [FromQuery] string? search)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (string.IsNullOrWhiteSpace(mobile) && string.IsNullOrWhiteSpace(search))
            {
                return Ok(ApiResponse<List<SiblingDto>>.Ok(new List<SiblingDto>()));
            }

            var query = _context.Students
                .Include(s => s.Enrollments)
                .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                .ThenInclude(e => e.Section)
                .Include(s => s.Guardians)
                .Where(s => s.BranchId == branchId && s.Status == StudentStatus.Active)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(mobile))
            {
                var mob = mobile.Trim();
                query = query.Where(s => s.Guardians.Any(g => g.Mobile == mob));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var sTerm = search.Trim().ToLower();
                query = query.Where(s =>
                    s.AdmissionNo.ToLower().Contains(sTerm) ||
                    s.FirstName.ToLower().Contains(sTerm) ||
                    s.LastName.ToLower().Contains(sTerm) ||
                    s.Guardians.Any(g => g.Name.ToLower().Contains(sTerm) || g.Mobile.Contains(sTerm)));
            }

            var siblings = await query
                .OrderBy(s => s.FirstName)
                .Take(20)
                .Select(s => new SiblingDto
                {
                    StudentId = s.Id,
                    AdmissionNo = s.AdmissionNo,
                    FullName = s.FullName,
                    ClassName = s.Enrollments.Where(e => e.AcademicYearId == yearId).Select(e => e.Class!.Name).FirstOrDefault() ?? "",
                    SectionName = s.Enrollments.Where(e => e.AcademicYearId == yearId).Select(e => e.Section!.Name).FirstOrDefault() ?? "",
                    GuardianName = s.Guardians.Where(g => g.IsPrimary).Select(g => g.Name).FirstOrDefault() ?? s.Guardians.Select(g => g.Name).FirstOrDefault() ?? "",
                    GuardianMobile = s.Guardians.Where(g => g.IsPrimary).Select(g => g.Mobile).FirstOrDefault() ?? s.Guardians.Select(g => g.Mobile).FirstOrDefault() ?? "",
                    PhotoUrl = s.PhotoUrl
                })
                .Distinct()
                .ToListAsync();

            return Ok(ApiResponse<List<SiblingDto>>.Ok(siblings));
        }

        [HttpPost("admit")]
        [HasPermission("Admissions", "Add")]
        public async Task<ActionResult<ApiResponse<StudentDetailDto>>> AdmitStudent([FromBody] AdmissionRequestDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // Check if Sibling is specified and auto-attach guardians/address if missing
            Student? attachedSibling = null;
            if (request.SiblingStudentId.HasValue && request.SiblingStudentId.Value > 0)
            {
                attachedSibling = await _context.Students
                    .Include(s => s.Guardians)
                    .FirstOrDefaultAsync(s => s.Id == request.SiblingStudentId.Value && s.BranchId == branchId);

                if (attachedSibling != null)
                {
                    // Auto-copy guardians from sibling if not passed or empty
                    if (request.Guardians == null || !request.Guardians.Any(g => !string.IsNullOrWhiteSpace(g.Mobile)))
                    {
                        request.Guardians = attachedSibling.Guardians.Select(g => new StudentGuardianDto
                        {
                            Relation = g.Relation,
                            Name = g.Name,
                            Mobile = g.Mobile,
                            Email = g.Email,
                            Occupation = g.Occupation,
                            AnnualIncome = g.AnnualIncome,
                            IsPrimary = g.IsPrimary
                        }).ToList();
                    }

                    // Auto-copy address from sibling if not passed
                    if (string.IsNullOrWhiteSpace(request.Address))
                    {
                        request.Address = attachedSibling.Address;
                        request.City = attachedSibling.City;
                        request.State = attachedSibling.State;
                        request.Pincode = attachedSibling.Pincode;
                        request.EmergencyContact = attachedSibling.EmergencyContact ?? attachedSibling.Guardians.FirstOrDefault()?.Mobile;
                    }
                    if (!request.ReligionId.HasValue) request.ReligionId = attachedSibling.ReligionId;
                    if (!request.CategoryId.HasValue) request.CategoryId = attachedSibling.CategoryId;
                }
            }

            // BR-3.4 Mandatory checks
            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                return BadRequest(ApiResponse<StudentDetailDto>.Fail("First name is mandatory."));
            }
            if (request.Guardians == null || !request.Guardians.Any(g => !string.IsNullOrWhiteSpace(g.Mobile)))
            {
                return BadRequest(ApiResponse<StudentDetailDto>.Fail("At least one guardian with a valid mobile number is mandatory (BR-3.4)."));
            }

            // 1. Prevent Duplicate Student Admission (Same student name + primary guardian mobile)
            var primaryMobile = request.Guardians.FirstOrDefault(g => g.IsPrimary)?.Mobile?.Trim() 
                             ?? request.Guardians.FirstOrDefault()?.Mobile?.Trim();

            var cleanFirst = request.FirstName.Trim().ToLower();
            var cleanLast = (request.LastName ?? "").Trim().ToLower();

            if (!string.IsNullOrEmpty(primaryMobile))
            {
                var duplicateStudent = await _context.Students
                    .Include(s => s.Guardians)
                    .Where(s => s.BranchId == branchId && s.Status == StudentStatus.Active)
                    .FirstOrDefaultAsync(s =>
                        s.FirstName.ToLower() == cleanFirst &&
                        (s.LastName == null ? "" : s.LastName.ToLower()).Trim() == cleanLast &&
                        s.Guardians.Any(g => g.Mobile == primaryMobile));

                if (duplicateStudent != null)
                {
                    return BadRequest(ApiResponse<StudentDetailDto>.Fail(
                        $"Duplicate Admission Error: A student named '{request.FirstName} {request.LastName}' with guardian contact '{primaryMobile}' is already admitted (Admission No: {duplicateStudent.AdmissionNo}). Duplicate admissions are not allowed."));
                }
            }

            // 2. Prevent Duplicate Roll Number in the same Section & Academic Year
            if (request.RollNo.HasValue && request.RollNo.Value > 0)
            {
                var existingRollStudent = await _context.StudentEnrollments
                    .Include(e => e.Student)
                    .Where(e => e.AcademicYearId == yearId &&
                                e.SectionId == request.SectionId &&
                                e.RollNo == request.RollNo.Value &&
                                e.Status == StudentStatus.Active)
                    .Select(e => e.Student!.FullName)
                    .FirstOrDefaultAsync();

                if (existingRollStudent != null)
                {
                    return BadRequest(ApiResponse<StudentDetailDto>.Fail(
                        $"Roll Number #{request.RollNo.Value} is already assigned to student '{existingRollStudent}' in this section. Each student must have a unique roll number."));
                }
            }

            // Check Section Capacity (BR-3.2)
            var section = await _context.Sections.FirstOrDefaultAsync(s => s.Id == request.SectionId && s.ClassId == request.ClassId);
            if (section == null)
            {
                return BadRequest(ApiResponse<StudentDetailDto>.Fail("Invalid class or section selected."));
            }

            var currentSectionCount = await _context.StudentEnrollments.CountAsync(e =>
                e.AcademicYearId == yearId && e.SectionId == request.SectionId && e.Status == StudentStatus.Active);

            var isPrincipal = _currentUserService.UserType == UserType.Principal || _currentUserService.UserType == UserType.SuperAdmin;
            if (currentSectionCount >= section.Capacity && !isPrincipal)
            {
                return BadRequest(ApiResponse<StudentDetailDto>.Fail($"Section capacity ({section.Capacity}) reached. Principal override required to exceed capacity (BR-3.2)."));
            }

            // BR-3.1: Generate Sequential Admission No {BranchCode}/{AY}/{Serial}
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == yearId && ay.BranchId == branchId);
            if (academicYear == null)
            {
                academicYear = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.BranchId == branchId && ay.IsCurrent)
                    ?? await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.BranchId == branchId)
                    ?? await _context.AcademicYears.FirstOrDefaultAsync();
            }

            if (academicYear == null)
            {
                return BadRequest(ApiResponse<StudentDetailDto>.Fail("No academic year configured for this branch. Please create an Academic Year first."));
            }

            yearId = academicYear.Id;

            var branchCode = branch?.Code ?? "MAIN";
            var admissionNo = await _numberingService.GetNextNumberAsync(branchId, "Admission", branchCode, academicYear.Name);

            // Begin Transaction with Retrying Execution Strategy (FR-3.3)
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<ActionResult<ApiResponse<StudentDetailDto>>>(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    long? famId = null;
                    if (attachedSibling != null)
                    {
                        if (!attachedSibling.FamilyId.HasValue)
                        {
                            attachedSibling.FamilyId = attachedSibling.Id;
                            _context.Students.Update(attachedSibling);
                        }
                        famId = attachedSibling.FamilyId;
                    }

                    var student = new Student
                    {
                        BranchId = branchId,
                        AdmissionNo = admissionNo,
                        FirstName = request.FirstName.Trim().ToUpper(),
                        LastName = request.LastName?.Trim().ToUpper() ?? "",
                        DateOfBirth = request.DateOfBirth,
                        Gender = request.Gender,
                        CategoryId = request.CategoryId,
                        ReligionId = request.ReligionId,
                        BloodGroup = request.BloodGroup,
                        AadhaarNo = request.AadhaarNo,
                        PhotoUrl = request.PhotoUrl,
                        Address = request.Address,
                        City = request.City,
                        State = request.State,
                        Pincode = request.Pincode,
                        EmergencyContact = request.EmergencyContact,
                        Status = StudentStatus.Active,
                        AdmissionDate = DateTime.UtcNow,
                        FamilyId = famId,
                        SiblingStudentId = attachedSibling?.Id,
                        IsActive = true
                    };

                    _context.Students.Add(student);
                    await _context.SaveChangesAsync();

                    // If sibling attached, create StudentSibling mapping records
                    if (attachedSibling != null)
                    {
                        _context.StudentSiblings.Add(new StudentSibling
                        {
                            StudentId = student.Id,
                            SiblingStudentId = attachedSibling.Id,
                            IsActive = true
                        });
                        _context.StudentSiblings.Add(new StudentSibling
                        {
                            StudentId = attachedSibling.Id,
                            SiblingStudentId = student.Id,
                            IsActive = true
                        });

                        if (famId.HasValue)
                        {
                            var otherSiblings = await _context.Students
                                .Where(s => s.FamilyId == famId.Value && s.Id != student.Id && s.Id != attachedSibling.Id)
                                .ToListAsync();
                            foreach (var os in otherSiblings)
                            {
                                _context.StudentSiblings.Add(new StudentSibling { StudentId = student.Id, SiblingStudentId = os.Id, IsActive = true });
                                _context.StudentSiblings.Add(new StudentSibling { StudentId = os.Id, SiblingStudentId = student.Id, IsActive = true });
                            }
                        }
                    }

                    // Guardians
                    foreach (var g in request.Guardians)
                    {
                        _context.StudentGuardians.Add(new StudentGuardian
                        {
                            StudentId = student.Id,
                            Relation = g.Relation,
                            Name = g.Name.Trim().ToUpper(),
                            Mobile = g.Mobile.Trim(),
                            Email = g.Email?.Trim(),
                            Occupation = g.Occupation,
                            AnnualIncome = g.AnnualIncome,
                            IsPrimary = g.IsPrimary,
                            IsActive = true
                        });
                    }

                    // Enrollment (BR-3.3: Student master is permanent; class/section is stored only in student_enrollments per AY)
                    var enrollment = new StudentEnrollment
                    {
                        StudentId = student.Id,
                        AcademicYearId = yearId,
                        ClassId = request.ClassId,
                        SectionId = request.SectionId,
                        RollNo = request.RollNo,
                        FeeGroupId = request.FeeGroupId,
                        Status = StudentStatus.Active,
                        IsActive = true
                    };
                    _context.StudentEnrollments.Add(enrollment);

                    // If converted from enquiry, mark enquiry as Converted (FR-3.2)
                    if (request.EnquiryId.HasValue)
                    {
                        var enquiry = await _context.Enquiries.FirstOrDefaultAsync(e => e.Id == request.EnquiryId.Value);
                        if (enquiry != null)
                        {
                            enquiry.Status = EnquiryStatus.Converted;
                            enquiry.ConvertedStudentId = student.Id;
                        }
                    }

                    // Audit Log
                    _context.AuditLogs.Add(new AuditLog
                    {
                        UserId = _currentUserService.UserId,
                        Username = _currentUserService.Username,
                        Action = "Admission",
                        Module = "Students",
                        EntityName = "Student",
                        RecordId = student.Id.ToString(),
                        NewValues = $"AdmissionNo: {admissionNo}, Student: {student.FullName}, ClassId: {request.ClassId}",
                        IpAddress = _currentUserService.IpAddress,
                        BranchId = branchId
                    });

                    await _context.SaveChangesAsync();

                    // Automatically assign & sync fee dues for newly admitted student
                    await FeeAssignmentHelper.AutoAssignStudentDuesAsync(
                        _context,
                        branchId,
                        yearId,
                        student.Id,
                        request.ClassId,
                        request.FeeGroupId);

                    await transaction.CommitAsync();

                    return Ok(ApiResponse<StudentDetailDto>.Ok(new StudentDetailDto
                    {
                        Id = student.Id,
                        AdmissionNo = student.AdmissionNo,
                        FirstName = student.FirstName,
                        LastName = student.LastName,
                        FamilyId = student.FamilyId,
                        SiblingStudentId = student.SiblingStudentId
                    }, $"Student admitted successfully with Admission No: {admissionNo}"));
                }
                catch (Exception ex)
                {
                    try { await transaction.RollbackAsync(); } catch { }
                    return StatusCode(500, ApiResponse<StudentDetailDto>.Fail($"Admission failed: {ex.Message}"));
                }
            });
        }

        [HttpPost("assign-roll-numbers")]
        [HasPermission("RollNumbers", "Edit")]
        public async Task<ActionResult<ApiResponse>> AssignRollNumbers([FromBody] BulkRollNoAssignmentDto request)
        {
            // FR-3.7: Teacher/Admin can assign roll numbers class-section wise in bulk
            var yearId = _currentUserService.AcademicYearId;

            if (request?.Assignments == null || !request.Assignments.Any())
            {
                return BadRequest(ApiResponse.Fail("No roll number assignments provided."));
            }

            foreach (var item in request.Assignments)
            {
                var enrollment = await _context.StudentEnrollments
                    .Where(e => e.StudentId == item.StudentId)
                    .OrderByDescending(e => yearId > 0 && e.AcademicYearId == yearId ? 1 : 0)
                    .ThenByDescending(e => e.Status == StudentStatus.Active ? 1 : 0)
                    .ThenByDescending(e => e.Id)
                    .FirstOrDefaultAsync();

                if (enrollment != null)
                {
                    enrollment.RollNo = item.RollNo;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Roll numbers assigned successfully."));
        }

        [HttpPost("change-section")]
        [HasPermission("SectionChange", "Edit")]
        public async Task<ActionResult<ApiResponse>> ChangeSection([FromBody] SectionChangeRequestDto request)
        {
            // FR-3.8: Admin can change section of a student within the same class and year; history is kept.
            var yearId = _currentUserService.AcademicYearId;

            var enrollment = await _context.StudentEnrollments
                .Where(e => e.StudentId == request.StudentId)
                .OrderByDescending(e => yearId > 0 && e.AcademicYearId == yearId ? 1 : 0)
                .ThenByDescending(e => e.Status == StudentStatus.Active ? 1 : 0)
                .ThenByDescending(e => e.Id)
                .FirstOrDefaultAsync();

            if (enrollment == null)
            {
                return NotFound(ApiResponse.Fail("Active student enrollment not found for current session."));
            }

            var targetSection = await _context.Sections.FirstOrDefaultAsync(s => s.Id == request.ToSectionId);
            if (targetSection == null) return NotFound(ApiResponse.Fail("Target section not found."));

            var fromSectionId = enrollment.SectionId;
            enrollment.SectionId = request.ToSectionId;

            // Log history
            _context.StudentSectionHistories.Add(new StudentSectionHistory
            {
                StudentId = request.StudentId,
                AcademicYearId = enrollment.AcademicYearId,
                ClassId = enrollment.ClassId,
                FromSectionId = fromSectionId,
                ToSectionId = request.ToSectionId,
                Reason = request.Reason ?? "Section shift requested",
                ChangedOn = DateTime.UtcNow,
                ChangedBy = _currentUserService.UserId ?? 1,
                IsActive = true
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Section changed successfully with audit history recorded."));
        }

        [HttpPut("{id}")]
        [HasPermission("Students", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateStudent(long id, [FromBody] UpdateStudentRequestDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (string.IsNullOrWhiteSpace(request.Remarks))
            {
                return BadRequest(ApiResponse.Fail("Remarks / Reason for change is mandatory. Please provide remarks explaining what changed and why."));
            }

            var student = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                .Include(s => s.Documents)
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (student == null) return NotFound(ApiResponse.Fail("Student not found."));

            // Track changes before mutating entity
            var changes = new List<object>();
            void RecordChange(string field, string label, string? oldVal, string? newVal)
            {
                var o = (oldVal ?? "").Trim();
                var n = (newVal ?? "").Trim();
                if (!string.Equals(o, n, StringComparison.OrdinalIgnoreCase))
                {
                    changes.Add(new { field, label, oldValue = o, newValue = n });
                }
            }

            var currentEnrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);
            long oldClassId = currentEnrollment?.ClassId ?? 0;
            long oldSectionId = currentEnrollment?.SectionId ?? 0;
            int? oldRollNo = currentEnrollment?.RollNo;

            RecordChange("FirstName", "First Name", student.FirstName, request.FirstName);
            RecordChange("LastName", "Last Name", student.LastName, request.LastName);
            RecordChange("DateOfBirth", "Date of Birth", student.DateOfBirth.ToString("yyyy-MM-dd"), request.DateOfBirth.ToString("yyyy-MM-dd"));
            RecordChange("Gender", "Gender", student.Gender, request.Gender);
            RecordChange("CategoryId", "Category ID", student.CategoryId?.ToString(), request.CategoryId?.ToString());
            RecordChange("ReligionId", "Religion ID", student.ReligionId?.ToString(), request.ReligionId?.ToString());
            RecordChange("BloodGroup", "Blood Group", student.BloodGroup, request.BloodGroup);
            RecordChange("AadhaarNo", "Aadhaar No", student.AadhaarNo, request.AadhaarNo);
            RecordChange("Address", "Address", student.Address, request.Address);
            RecordChange("City", "City", student.City, request.City);
            RecordChange("State", "State", student.State, request.State);
            RecordChange("Pincode", "Pincode", student.Pincode, request.Pincode);
            RecordChange("EmergencyContact", "Emergency Contact", student.EmergencyContact, request.EmergencyContact);
            RecordChange("Status", "Status", student.Status.ToString(), request.Status.ToString());

            if (!string.IsNullOrWhiteSpace(request.AdmissionNo))
            {
                RecordChange("AdmissionNo", "Admission Number", student.AdmissionNo, request.AdmissionNo.Trim());
            }
            if (request.AdmissionDate.HasValue)
            {
                RecordChange("AdmissionDate", "Admission Date", student.AdmissionDate.ToString("yyyy-MM-dd"), request.AdmissionDate.Value.ToString("yyyy-MM-dd"));
            }
            if (request.ClassId.HasValue && request.ClassId.Value > 0)
            {
                RecordChange("ClassId", "Class ID", oldClassId > 0 ? oldClassId.ToString() : null, request.ClassId.Value.ToString());
            }
            if (request.SectionId.HasValue && request.SectionId.Value > 0)
            {
                RecordChange("SectionId", "Section ID", oldSectionId > 0 ? oldSectionId.ToString() : null, request.SectionId.Value.ToString());
            }
            if (request.RollNo.HasValue)
            {
                RecordChange("RollNo", "Roll No", oldRollNo?.ToString(), request.RollNo.Value.ToString());
            }

            student.FirstName = request.FirstName.Trim().ToUpper();
            student.LastName = request.LastName?.Trim().ToUpper() ?? "";
            student.DateOfBirth = request.DateOfBirth;
            student.Gender = request.Gender;
            student.CategoryId = request.CategoryId;
            student.ReligionId = request.ReligionId;
            student.BloodGroup = request.BloodGroup;
            student.AadhaarNo = request.AadhaarNo;
            student.PhotoUrl = request.PhotoUrl;
            student.Address = request.Address;
            student.City = request.City;
            student.State = request.State;
            student.Pincode = request.Pincode;
            student.EmergencyContact = request.EmergencyContact;
            student.Status = request.Status;

            if (!string.IsNullOrWhiteSpace(request.AdmissionNo))
            {
                var newAdmissionNo = request.AdmissionNo.Trim();
                if (!string.Equals(student.AdmissionNo?.Trim(), newAdmissionNo, StringComparison.OrdinalIgnoreCase))
                {
                    // Find school ID for this student's branch
                    var studentBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == student.BranchId);
                    var schoolId = studentBranch?.SchoolId ?? 0;

                    // Get all branch IDs under the same school
                    var branchIds = schoolId > 0
                        ? await _context.Branches.Where(b => b.SchoolId == schoolId).Select(b => b.Id).ToListAsync()
                        : new List<long> { student.BranchId };

                    // Check school-wise uniqueness against other students
                    var duplicateStudent = await _context.Students
                        .Where(s => branchIds.Contains(s.BranchId) && s.Id != id && s.AdmissionNo.ToLower() == newAdmissionNo.ToLower())
                        .Select(s => new { s.FullName, s.AdmissionNo })
                        .FirstOrDefaultAsync();

                    if (duplicateStudent != null)
                    {
                        return BadRequest(ApiResponse.Fail($"Admission Number '{newAdmissionNo}' is already assigned to student '{duplicateStudent.FullName}' in this school. Admission Number must be unique across the school."));
                    }

                    student.AdmissionNo = newAdmissionNo;

                    // Keep student portal user account username synchronized if it exists
                    var studentUser = await _context.Users.FirstOrDefaultAsync(u => u.UserType == UserType.Student && u.LinkedEntityId == student.Id);
                    if (studentUser != null)
                    {
                        var school = schoolId > 0 ? await _context.Schools.FirstOrDefaultAsync(s => s.Id == schoolId) : null;
                        var sCode = school?.Code ?? $"SCH{schoolId}";
                        studentUser.Username = $"{sCode}_{newAdmissionNo}";
                    }
                }
            }
            if (request.AdmissionDate.HasValue)
            {
                student.AdmissionDate = request.AdmissionDate.Value;
            }

            // Update or create current enrollment (Class, Section, Roll No)
            if (request.ClassId.HasValue && request.SectionId.HasValue && request.ClassId.Value > 0 && request.SectionId.Value > 0)
            {
                var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);
                if (enrollment != null)
                {
                    enrollment.ClassId = request.ClassId.Value;
                    enrollment.SectionId = request.SectionId.Value;
                    enrollment.RollNo = request.RollNo;
                    enrollment.Status = request.Status;
                }
                else
                {
                    student.Enrollments.Add(new StudentEnrollment
                    {
                        StudentId = student.Id,
                        AcademicYearId = yearId,
                        ClassId = request.ClassId.Value,
                        SectionId = request.SectionId.Value,
                        RollNo = request.RollNo,
                        Status = request.Status,
                        IsActive = true
                    });
                }
            }
            else if (request.RollNo.HasValue)
            {
                var enrollment = student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId);
                if (enrollment != null)
                {
                    enrollment.RollNo = request.RollNo;
                }
            }

            // Update Guardians
            if (request.Guardians != null && request.Guardians.Any())
            {
                foreach (var g in request.Guardians)
                {
                    var existing = student.Guardians.FirstOrDefault(x =>
                        (g.Id > 0 && x.Id == g.Id) ||
                        (!string.IsNullOrWhiteSpace(g.Relation) && x.Relation.Equals(g.Relation, StringComparison.OrdinalIgnoreCase)));

                    if (existing != null)
                    {
                        existing.Relation = g.Relation;
                        existing.Name = g.Name.Trim().ToUpper();
                        existing.Mobile = g.Mobile.Trim();
                        existing.Email = g.Email?.Trim();
                        existing.Occupation = g.Occupation;
                        existing.AnnualIncome = g.AnnualIncome;
                        existing.IsPrimary = g.IsPrimary;
                    }
                    else if (!string.IsNullOrWhiteSpace(g.Name))
                    {
                        student.Guardians.Add(new StudentGuardian
                        {
                            StudentId = student.Id,
                            Relation = g.Relation,
                            Name = g.Name.Trim().ToUpper(),
                            Mobile = g.Mobile.Trim(),
                            Email = g.Email?.Trim(),
                            Occupation = g.Occupation,
                            AnnualIncome = g.AnnualIncome,
                            IsPrimary = g.IsPrimary,
                            IsActive = true
                        });
                    }
                }
            }

            // Update Family Photos (Father, Mother, Guardian) in Student Documents
            void UpsertPhotoDoc(string title, string? filePath)
            {
                if (string.IsNullOrWhiteSpace(filePath)) return;
                var doc = student.Documents.FirstOrDefault(d => d.Title.ToLower().Contains(title.ToLower()));
                if (doc != null)
                {
                    doc.FilePath = filePath;
                }
                else
                {
                    student.Documents.Add(new StudentDocument
                    {
                        StudentId = student.Id,
                        Title = title,
                        FilePath = filePath,
                        IsActive = true
                    });
                }
            }

            UpsertPhotoDoc("Father Photo", request.FatherPhotoUrl);
            UpsertPhotoDoc("Mother Photo", request.MotherPhotoUrl);
            UpsertPhotoDoc("Guardian Photo", request.GuardianPhotoUrl);

            // Record Student Audit Log if any changes occurred
            if (changes.Any())
            {
                var auditLog = new StudentAuditLog
                {
                    StudentId = student.Id,
                    BranchId = student.BranchId,
                    ChangedByUserId = _currentUserService.UserId ?? 0,
                    ChangedByUserName = _currentUserService.Username ?? "Admin",
                    ChangedOn = DateTime.UtcNow,
                    Remarks = request.Remarks.Trim(),
                    ChangesJson = System.Text.Json.JsonSerializer.Serialize(changes),
                    CreatedBy = _currentUserService.UserId ?? 0,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                _context.StudentAuditLogs.Add(auditLog);

                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = _currentUserService.UserId,
                    Username = _currentUserService.Username,
                    Action = "Update",
                    Module = "Students",
                    EntityName = "Student",
                    RecordId = student.Id.ToString(),
                    OldValues = $"Remarks: {request.Remarks.Trim()}",
                    NewValues = System.Text.Json.JsonSerializer.Serialize(changes),
                    BranchId = student.BranchId,
                    CreatedBy = _currentUserService.UserId ?? 0,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Student profile updated successfully."));
        }

        [HttpGet("{id}/audit-logs")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<List<StudentAuditLogDto>>>> GetStudentAuditLogs(long id)
        {
            var branchId = _currentUserService.BranchId;
            var logs = await _context.StudentAuditLogs
                .Where(l => l.StudentId == id)
                .OrderByDescending(l => l.ChangedOn)
                .Select(l => new StudentAuditLogDto
                {
                    Id = l.Id,
                    StudentId = l.StudentId,
                    ChangedByUserId = l.ChangedByUserId,
                    ChangedByUserName = l.ChangedByUserName,
                    ChangedOn = l.ChangedOn,
                    Remarks = l.Remarks,
                    ChangesJson = l.ChangesJson
                })
                .ToListAsync();

            return Ok(ApiResponse<List<StudentAuditLogDto>>.Ok(logs));
        }

        [HttpPost("{id}/documents")]
        [HasPermission("Students", "Edit")]
        public async Task<ActionResult<ApiResponse<StudentDocumentDto>>> AddDocument(long id, [FromBody] CreateStudentDocumentDto request)
        {
            var branchId = _currentUserService.BranchId;
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);
            if (student == null) return NotFound(ApiResponse<StudentDocumentDto>.Fail("Student not found."));

            var doc = new StudentDocument
            {
                StudentId = id,
                DocumentTypeId = request.DocumentTypeId,
                Title = request.Title,
                FilePath = request.FilePath,
                IsActive = true
            };

            _context.StudentDocuments.Add(doc);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<StudentDocumentDto>.Ok(new StudentDocumentDto
            {
                Id = doc.Id,
                DocumentTypeId = doc.DocumentTypeId,
                Title = doc.Title,
                FilePath = doc.FilePath
            }, "Document added successfully."));
        }

        [HttpDelete("{id}/documents/{docId}")]
        [HasPermission("Students", "Edit")]
        public async Task<ActionResult<ApiResponse>> DeleteDocument(long id, long docId)
        {
            var doc = await _context.StudentDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.StudentId == id);
            if (doc == null) return NotFound(ApiResponse.Fail("Document not found."));

            _context.StudentDocuments.Remove(doc);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Document deleted successfully."));
        }

        [HttpGet("{id}/section-history")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<List<StudentSectionHistoryDto>>>> GetSectionHistory(long id)
        {
            var histories = await _context.StudentSectionHistories
                .Include(h => h.FromSection)
                .Include(h => h.ToSection)
                .Where(h => h.StudentId == id)
                .OrderByDescending(h => h.ChangedOn)
                .Select(h => new StudentSectionHistoryDto
                {
                    Id = h.Id,
                    StudentId = h.StudentId,
                    ClassId = h.ClassId,
                    FromSectionId = h.FromSectionId,
                    FromSectionName = h.FromSection != null ? h.FromSection.Name : "",
                    ToSectionId = h.ToSectionId,
                    ToSectionName = h.ToSection != null ? h.ToSection.Name : "",
                    Reason = h.Reason,
                    ChangedOn = h.ChangedOn,
                    ChangedBy = h.ChangedBy
                })
                .ToListAsync();

            return Ok(ApiResponse<List<StudentSectionHistoryDto>>.Ok(histories));
        }

        [HttpGet("admission-slip-config")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<AdmissionSlipConfigDto>>> GetAdmissionSlipConfig()
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
                    .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ADMISSION_SLIP" && g.IsActive);
            }

            if (config == null)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "ADMISSION_SLIP" && g.IsActive);
            }

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<AdmissionSlipConfigDto>(
                        config.CredentialsEncrypted,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        var defaultSecs = AdmissionSlipConfigDto.GetDefaultSections();
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
                        return Ok(ApiResponse<AdmissionSlipConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            return Ok(ApiResponse<AdmissionSlipConfigDto>.Ok(new AdmissionSlipConfigDto()));
        }

        [HttpGet("bonafide-certificate-config")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<BonafideCertificateConfigDto>>> GetBonafideCertificateConfig()
        {
            return await GetCertificateConfig("bonafide");
        }

        [HttpGet("certificate-config/{type}")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<BonafideCertificateConfigDto>>> GetCertificateConfig(string type)
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

            string gwType = (type ?? "bonafide").Trim().ToLowerInvariant() switch
            {
                "birth" => "BIRTH_CERTIFICATE",
                "age" => "AGE_CERTIFICATE",
                "character" => "CHARACTER_CERTIFICATE",
                "ret" => "RET_CERTIFICATE",
                _ => "BONAFIDE_CERTIFICATE"
            };

            TenantGatewayConfig? config = null;
            if (schoolId.HasValue)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == gwType && g.IsActive);
            }

            if (config == null)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == gwType && g.IsActive);
            }

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<BonafideCertificateConfigDto>(
                        config.CredentialsEncrypted,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        parsed.CertificateType = (type ?? "bonafide").Trim().ToLowerInvariant();
                        var defaultSecs = BonafideCertificateConfigDto.GetDefaultSections();
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
                        return Ok(ApiResponse<BonafideCertificateConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            return Ok(ApiResponse<BonafideCertificateConfigDto>.Ok(BonafideCertificateConfigDto.GetDefaultConfigForType(type)));
        }

        // =========================================================================
        // AWR REPORT (ADMISSION & WITHDRAWAL REGISTER)
        // =========================================================================
        [HttpGet("awr-config")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<AwrReportConfigDto>>> GetAwrConfig()
        {
            var branchId = _currentUserService.BranchId;
            var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId);
            var schoolId = branch?.SchoolId;
            var config = await GetAwrConfigInternalAsync(schoolId, branchId);
            return Ok(ApiResponse<AwrReportConfigDto>.Ok(config));
        }

        private async Task<AwrReportConfigDto> GetAwrConfigInternalAsync(long? schoolId, long? branchId = null)
        {
            TenantGatewayConfig? config = null;
            if (schoolId.HasValue)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "AWR_REPORT_CONFIG" && g.IsActive);
            }

            if (config == null)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "AWR_REPORT_CONFIG" && g.IsActive);
            }

            AwrReportConfigDto resultConfig = AwrReportConfigDto.GetDefaultConfig();

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<AwrReportConfigDto>(
                        config.CredentialsEncrypted,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        resultConfig = parsed;
                    }
                }
                catch { }
            }

            if (branchId.HasValue)
            {
                var numSeries = await _context.NumberingSeries
                    .AsNoTracking()
                    .FirstOrDefaultAsync(ns => ns.BranchId == branchId.Value && ns.ModuleType == "AwrRegister");
                if (numSeries != null && !string.IsNullOrWhiteSpace(numSeries.Prefix))
                {
                    resultConfig.RefPrefix = numSeries.Prefix.Trim();
                }
            }

            return resultConfig;
        }

        [HttpGet("awr-next-number")]
        [HasPermission("Students", "View")]
        public async Task<ActionResult<ApiResponse<string>>> GetAwrNextNumber()
        {
            var branchId = _currentUserService.BranchId;
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var branchCode = branch?.Code ?? "MAIN";

            var currentAY = await _context.AcademicYears
                .Where(ay => ay.BranchId == branchId && ay.IsCurrent)
                .FirstOrDefaultAsync();
            var ayName = currentAY?.Name ?? DateTime.UtcNow.Year.ToString();

            var nextNo = await _numberingService.PeekNextNumberAsync(branchId, "AwrRegister", branchCode, ayName);
            return Ok(ApiResponse<string>.Ok(nextNo));
        }

        [HttpGet("awr-report")]
        public async Task<ActionResult<ApiResponse<AwrReportResponseDto>>> GetAwrReport(
            [FromQuery] long? academicYearId,
            [FromQuery] long? classId,
            [FromQuery] long? sectionId,
            [FromQuery] string? status, // "all", "active", "withdrawn"
            [FromQuery] string? search,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var branchId = _currentUserService.BranchId;

            // Load master dictionaries for categories and religions
            var simpleMasters = await _context.SimpleMasters
                .AsNoTracking()
                .Where(m => m.BranchId == branchId && m.IsActive)
                .ToDictionaryAsync(m => m.Id, m => m.Name);

            // Load Transfer Certificates for this branch
            var tcList = await _context.TransferCertificates
                .AsNoTracking()
                .Where(t => t.BranchId == branchId)
                .ToListAsync();

            var tcByStudentId = tcList
                .GroupBy(t => t.StudentId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.IssueDate).First());

            // Query Students
            var studentQuery = _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Section)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.AcademicYear)
                .Where(s => s.BranchId == branchId)
                .AsNoTracking();

            // Search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                studentQuery = studentQuery.Where(st =>
                    st.AdmissionNo.ToLower().Contains(s) ||
                    st.FirstName.ToLower().Contains(s) ||
                    st.LastName.ToLower().Contains(s) ||
                    (st.FirstName + " " + st.LastName).ToLower().Contains(s) ||
                    st.Guardians.Any(g => g.Name.ToLower().Contains(s) || g.Mobile.Contains(s)));
            }

            if (fromDate.HasValue)
            {
                studentQuery = studentQuery.Where(st => st.AdmissionDate >= fromDate.Value.Date);
            }
            if (toDate.HasValue)
            {
                studentQuery = studentQuery.Where(st => st.AdmissionDate <= toDate.Value.Date.AddDays(1).AddTicks(-1));
            }

            var students = await studentQuery
                .OrderBy(s => s.AdmissionDate)
                .ThenBy(s => s.AdmissionNo)
                .ToListAsync();

            // Calculate Summary Metrics
            int totalRegistered = students.Count;
            int activeCount = 0;
            int withdrawnCount = 0;
            int newThisYear = 0;

            var currentYearId = _currentUserService.AcademicYearId;
            var currentYear = await _context.AcademicYears.AsNoTracking().FirstOrDefaultAsync(y => y.Id == currentYearId && y.BranchId == branchId);
            var startOfYear = currentYear?.StartDate ?? new DateTime(DateTime.UtcNow.Year, 4, 1);

            var studentItems = new List<AwrStudentItemDto>();

            foreach (var st in students)
            {
                // TC lookup
                tcByStudentId.TryGetValue(st.Id, out var tc);

                bool isWithdrawn = st.Status == StudentStatus.Left ||
                                   st.Status == StudentStatus.TcIssued ||
                                   st.Status == StudentStatus.PassedOut ||
                                   tc != null;

                if (isWithdrawn)
                    withdrawnCount++;
                else
                    activeCount++;

                if (st.AdmissionDate >= startOfYear)
                    newThisYear++;

                // Status Filter application
                if (!string.IsNullOrWhiteSpace(status))
                {
                    var stFilter = status.Trim().ToLowerInvariant();
                    if (stFilter == "active" && isWithdrawn) continue;
                    if (stFilter == "withdrawn" && !isWithdrawn) continue;
                }

                // Enrollment resolution
                var targetEnrollment = (academicYearId.HasValue && academicYearId.Value > 0)
                    ? st.Enrollments.FirstOrDefault(e => e.AcademicYearId == academicYearId.Value)
                    : st.Enrollments.OrderByDescending(e => e.AcademicYearId).FirstOrDefault();

                // Class & Section filters
                if (classId.HasValue && classId.Value > 0)
                {
                    if (targetEnrollment == null || targetEnrollment.ClassId != classId.Value)
                        continue;
                }
                if (sectionId.HasValue && sectionId.Value > 0)
                {
                    if (targetEnrollment == null || targetEnrollment.SectionId != sectionId.Value)
                        continue;
                }

                // First enrollment (Class to which admitted)
                var firstEnrollment = st.Enrollments.OrderBy(e => e.AcademicYearId).ThenBy(e => e.CreatedOn).FirstOrDefault();
                string classAdmitted = firstEnrollment?.Class?.Name ?? targetEnrollment?.Class?.Name ?? "";

                // Guardians
                var father = st.Guardians.FirstOrDefault(g => g.Relation != null && g.Relation.Equals("Father", StringComparison.OrdinalIgnoreCase));
                var mother = st.Guardians.FirstOrDefault(g => g.Relation != null && g.Relation.Equals("Mother", StringComparison.OrdinalIgnoreCase));
                var primaryGuardian = st.Guardians.FirstOrDefault(g => g.IsPrimary) ?? st.Guardians.FirstOrDefault();

                // Category & Religion
                string catName = (st.CategoryId.HasValue && simpleMasters.TryGetValue(st.CategoryId.Value, out var cName)) ? cName : "General";
                string relName = (st.ReligionId.HasValue && simpleMasters.TryGetValue(st.ReligionId.Value, out var rName)) ? rName : "Hindu";

                studentItems.Add(new AwrStudentItemDto
                {
                    StudentId = st.Id,
                    AdmissionNo = st.AdmissionNo,
                    AdmissionDate = st.AdmissionDate,
                    AdmissionDateFormatted = st.AdmissionDate.ToString("dd-MMM-yyyy"),
                    StudentName = st.FullName,
                    FirstName = st.FirstName,
                    LastName = st.LastName,
                    Gender = st.Gender ?? "Male",
                    PhotoUrl = st.PhotoUrl,
                    DateOfBirth = st.DateOfBirth,
                    DobFormatted = st.DateOfBirth.ToString("dd-MMM-yyyy"),
                    DobWords = ConvertDateToWords(st.DateOfBirth),
                    PlaceOfBirth = st.City ?? "",

                    FatherName = father?.Name ?? primaryGuardian?.Name ?? "",
                    FatherOccupation = father?.Occupation ?? "",
                    FatherMobile = father?.Mobile ?? primaryGuardian?.Mobile ?? "",
                    MotherName = mother?.Name ?? "",
                    MotherOccupation = mother?.Occupation ?? "",
                    GuardianName = primaryGuardian?.Name ?? "",
                    GuardianRelation = primaryGuardian?.Relation ?? "",

                    CategoryName = catName,
                    ReligionName = relName,
                    Nationality = "Indian",
                    BloodGroup = st.BloodGroup ?? "",
                    AadhaarNo = st.AadhaarNo ?? "",
                    Address = st.Address ?? "",
                    City = st.City ?? "",
                    State = st.State ?? "",
                    Pincode = st.Pincode ?? "",

                    PreviousSchool = "",
                    PreviousClass = "",
                    ClassAdmitted = classAdmitted,
                    CurrentClass = targetEnrollment?.Class?.Name ?? "",
                    CurrentSection = targetEnrollment?.Section?.Name ?? "",
                    RollNo = targetEnrollment?.RollNo,
                    AcademicYear = targetEnrollment?.AcademicYear?.Name ?? currentYear?.Name ?? "",
                    Status = isWithdrawn ? "Withdrawn" : "Active",

                    WithdrawalDate = tc?.IssueDate,
                    WithdrawalDateFormatted = tc?.IssueDate.ToString("dd-MMM-yyyy") ?? "",
                    ReasonForLeaving = tc?.ReasonForLeaving ?? (isWithdrawn ? "Struck off / Left" : ""),
                    LastClassStudied = tc?.LastClassStudied ?? targetEnrollment?.Class?.Name ?? "",
                    Conduct = tc?.Conduct ?? "Good",
                    TcNumber = tc?.TcNumber ?? "",
                    TcIssueDate = tc?.IssueDate,
                    TcIssueDateFormatted = tc?.IssueDate.ToString("dd-MMM-yyyy") ?? "",
                    Remarks = tc?.Remarks ?? ""
                });
            }

            // Load active AwrConfig for the school
            var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId);
            var schoolId = branch?.SchoolId;
            var awrConfig = await GetAwrConfigInternalAsync(schoolId);

            var response = new AwrReportResponseDto
            {
                Summary = new AwrReportSummaryDto
                {
                    TotalRegistered = totalRegistered,
                    ActiveOnRoll = activeCount,
                    TotalWithdrawn = withdrawnCount,
                    NewAdmissionsThisYear = newThisYear
                },
                Students = studentItems,
                Config = awrConfig
            };

            return Ok(ApiResponse<AwrReportResponseDto>.Ok(response));
        }

        private static string ConvertDateToWords(DateTime date)
        {
            string[] dayNames = new[]
            {
                "", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
                "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth",
                "Twenty-First", "Twenty-Second", "Twenty-Third", "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth", "Twenty-Ninth", "Thirtieth", "Thirty-First"
            };
            string[] monthNames = new[]
            {
                "", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
            };
            string[] ones = new[] { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
            string[] tens = new[] { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

            string dayWord = (date.Day >= 1 && date.Day <= 31) ? dayNames[date.Day] : date.Day.ToString();
            string monthWord = (date.Month >= 1 && date.Month <= 12) ? monthNames[date.Month] : "";
            int year = date.Year;
            string yearWord = "";
            if (year >= 2000 && year < 2100)
            {
                int rem = year - 2000;
                yearWord = "Two Thousand" + (rem > 0 ? " " + (rem < 20 ? ones[rem] : tens[rem / 10] + (rem % 10 > 0 ? " " + ones[rem % 10] : "")) : "");
            }
            else if (year >= 1900 && year < 2000)
            {
                int rem = year - 1900;
                yearWord = "Nineteen Hundred" + (rem > 0 ? " " + (rem < 20 ? ones[rem] : tens[rem / 10] + (rem % 10 > 0 ? " " + ones[rem % 10] : "")) : "");
            }
            else
            {
                yearWord = year.ToString();
            }

            return $"{dayWord} {monthWord} {yearWord}".Trim();
        }
    }
}
