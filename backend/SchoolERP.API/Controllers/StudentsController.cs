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
                    PhotoUrl = e.Student.PhotoUrl
                })
                .ToListAsync();

            return Ok(ApiResponse<PagedResult<StudentListDto>>.Ok(
                new PagedResult<StudentListDto>(items, totalCount, pageNo, pageSize)
            ));
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
                        FirstName = request.FirstName.Trim(),
                        LastName = request.LastName?.Trim() ?? "",
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
                            Name = g.Name.Trim(),
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
            var student = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Enrollments)
                .Include(s => s.Documents)
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (student == null) return NotFound(ApiResponse.Fail("Student not found."));

            student.FirstName = request.FirstName.Trim();
            student.LastName = request.LastName?.Trim() ?? "";
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
                student.AdmissionNo = request.AdmissionNo.Trim();
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
                        existing.Name = g.Name.Trim();
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
                            Name = g.Name.Trim(),
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

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Student profile updated successfully."));
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
    }
}
