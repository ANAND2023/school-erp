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

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/transfer-certificates")]
    [Authorize]
    public class TransferCertificateController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly INumberingSeriesService _numberingService;

        public TransferCertificateController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            INumberingSeriesService numberingService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _numberingService = numberingService;
        }

        // =========================================================================
        // 1. LIST TRANSFER CERTIFICATES (FR-8.5)
        // =========================================================================
        [HttpGet]
        [HasPermission("TransferCertificates", "View")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetTransferCertificates([FromQuery] string? search)
        {
            var branchId = _currentUserService.BranchId;

            var query = _context.TransferCertificates
                .Include(t => t.Student)
                .Include(t => t.AcademicYear)
                .Where(t => t.BranchId == branchId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(t =>
                    t.TcNumber.ToLower().Contains(s) ||
                    t.Student!.AdmissionNo.ToLower().Contains(s) ||
                    t.Student.FirstName.ToLower().Contains(s) ||
                    t.Student.LastName.ToLower().Contains(s));
            }

            var list = await query
                .OrderByDescending(t => t.IssueDate)
                .Select(t => new
                {
                    t.Id,
                    t.TcNumber,
                    t.StudentId,
                    AdmissionNo = t.Student != null ? t.Student.AdmissionNo : "",
                    StudentName = t.Student != null ? $"{t.Student.FirstName} {t.Student.LastName}".Trim() : "",
                    ApplicationDate = t.ApplicationDate.ToString("yyyy-MM-dd"),
                    IssueDate = t.IssueDate.ToString("yyyy-MM-dd"),
                    t.LastClassStudied,
                    t.QualifiedForPromotion,
                    t.ReasonForLeaving,
                    t.Conduct,
                    t.FeeCleared,
                    t.PendingDuesAmount,
                    Status = t.Status.ToString(),
                    AcademicYear = t.AcademicYear != null ? t.AcademicYear.Name : ""
                })
                .ToListAsync();

            return Ok(ApiResponse<List<object>>.Ok(list.Cast<object>().ToList()));
        }

        // =========================================================================
        // 2. CLEARANCE & DUES CHECK BEFORE TC (FR-8.4)
        // =========================================================================
        [HttpGet("dues-check/{studentId}")]
        [HasPermission("TransferCertificates", "View")]
        public async Task<ActionResult<ApiResponse<object>>> CheckStudentClearance(long studentId)
        {
            var student = await _context.Students
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .FirstOrDefaultAsync(s => s.Id == studentId);

            if (student == null) return NotFound(ApiResponse<object>.Fail("Student not found."));

            var latestEnrollment = student.Enrollments
                .OrderByDescending(e => e.AcademicYearId)
                .FirstOrDefault();

            // Total outstanding dues
            var pendingDues = await _context.StudentFeeDues
                .Where(d => d.StudentId == studentId && d.BalanceAmount > 0)
                .SumAsync(d => d.BalanceAmount);

            bool feeCleared = pendingDues <= 0;
            bool libraryCleared = true; // Phase 5 library clearance default true

            var result = new
            {
                StudentId = student.Id,
                student.AdmissionNo,
                FullName = $"{student.FirstName} {student.LastName}".Trim(),
                LastClassStudied = latestEnrollment?.Class?.Name ?? "",
                FeeCleared = feeCleared,
                PendingDuesAmount = pendingDues,
                LibraryCleared = libraryCleared,
                CanIssueTc = feeCleared && libraryCleared,
                Message = feeCleared
                    ? "All fee dues cleared. Eligible for Transfer Certificate."
                    : $"Pending fee balance: ₹{pendingDues:N2}. Fee clearance required before issuing TC. (FR-8.4)"
            };

            return Ok(ApiResponse<object>.Ok(result));
        }

        // =========================================================================
        // 3. ISSUE TRANSFER CERTIFICATE (FR-8.4, BR-8.2)
        // =========================================================================
        [HttpPost]
        [HasPermission("TransferCertificates", "Add")]
        public async Task<ActionResult<ApiResponse<object>>> IssueTransferCertificate([FromBody] IssueTcRequestDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var student = await _context.Students
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.AcademicYear)
                .FirstOrDefaultAsync(s => s.Id == dto.StudentId);

            if (student == null) return NotFound(ApiResponse<object>.Fail("Student not found."));

            if (student.Status == StudentStatus.TcIssued)
            {
                return BadRequest(ApiResponse<object>.Fail("Transfer certificate has already been issued for this student."));
            }

            // FR-8.4 Check pending dues
            var pendingDues = await _context.StudentFeeDues
                .Where(d => d.StudentId == dto.StudentId && d.BalanceAmount > 0)
                .SumAsync(d => d.BalanceAmount);

            if (pendingDues > 0 && !dto.AdminOverrideDues)
            {
                return BadRequest(ApiResponse<object>.Fail($"Cannot issue TC: Student has pending fee dues of ₹{pendingDues:N2}. Clear dues first or request Admin override. (FR-8.4)"));
            }

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var branchCode = branch?.Code ?? "MAIN";
            var ayName = student.Enrollments.OrderByDescending(e => e.AcademicYearId).FirstOrDefault()?.AcademicYear?.Name ?? "2026-27";

            var tcNumber = await _numberingService.GetNextNumberAsync(branchId, "TransferCertificate", branchCode, ayName);

            var tc = new TransferCertificate
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                StudentId = dto.StudentId,
                TcNumber = tcNumber,
                ApplicationDate = DateTime.Parse(dto.ApplicationDate),
                IssueDate = DateTime.Parse(dto.IssueDate),
                LastClassStudied = dto.LastClassStudied,
                QualifiedForPromotion = dto.QualifiedForPromotion,
                ReasonForLeaving = dto.ReasonForLeaving,
                Conduct = !string.IsNullOrEmpty(dto.Conduct) ? dto.Conduct : "Good",
                FeeCleared = pendingDues <= 0,
                LibraryCleared = true,
                PendingDuesAmount = pendingDues,
                Remarks = dto.Remarks,
                Status = TcStatus.Issued,
                CreatedBy = _currentUserService.UserId ?? 1,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.TransferCertificates.Add(tc);

            // BR-8.2: Student with TC issued becomes inactive and cannot be selected in daily operations
            student.Status = StudentStatus.TcIssued;
            student.ModifiedBy = _currentUserService.UserId ?? 1;
            student.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { tc.Id, tc.TcNumber }, "Transfer Certificate issued successfully."));
        }

        // =========================================================================
        // 4. PRINT TRANSFER CERTIFICATE (FR-8.5)
        // =========================================================================
        [HttpGet("{id}/print")]
        [HasPermission("TransferCertificates", "Print")]
        public async Task<ActionResult<ApiResponse<object>>> GetTcPrintData(long id)
        {
            var tc = await _context.TransferCertificates
                .Include(t => t.Student)
                    .ThenInclude(s => s!.Guardians)
                .Include(t => t.Branch)
                    .ThenInclude(b => b!.School)
                .Include(t => t.AcademicYear)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tc == null) return NotFound(ApiResponse<object>.Fail("Transfer Certificate not found."));

            var student = tc.Student!;
            var father = student.Guardians.FirstOrDefault(g => g.Relation == "Father");
            var mother = student.Guardians.FirstOrDefault(g => g.Relation == "Mother");

            var printData = new
            {
                SchoolName = tc.Branch?.Name ?? "DELHI PUBLIC SCHOOL",
                AffiliationNo = tc.Branch?.School?.AffiliationNumber ?? "CBSE/AFF/2026/0912",
                Address = tc.Branch?.Address ?? "Knowledge Park, Sector 62, Noida, UP",
                TcNumber = tc.TcNumber,
                Student = new
                {
                    AdmissionNo = student.AdmissionNo,
                    FullName = $"{student.FirstName} {student.LastName}".Trim(),
                    FatherName = father?.Name ?? "N/A",
                    MotherName = mother?.Name ?? "N/A",
                    Nationality = "Indian",
                    Category = "General",
                    DOB = student.DateOfBirth.ToString("dd-MM-yyyy"),
                    DOBWords = student.DateOfBirth.ToString("dd MMMM yyyy"),
                    student.Gender
                },
                ApplicationDate = tc.ApplicationDate.ToString("dd-MM-yyyy"),
                IssueDate = tc.IssueDate.ToString("dd-MM-yyyy"),
                LastClassStudied = tc.LastClassStudied,
                QualifiedForPromotion = tc.QualifiedForPromotion ? "Yes, Qualified for promotion" : "No, Detained",
                MonthUptoWhichDuesPaid = tc.FeeCleared ? "All dues cleared up to date" : $"Outstanding balance: ₹{tc.PendingDuesAmount:N2}",
                ReasonForLeaving = tc.ReasonForLeaving,
                Conduct = tc.Conduct,
                Remarks = tc.Remarks ?? "Student bears good moral character.",
                TotalWorkingDays = 210,
                TotalDaysPresent = 195
            };

            return Ok(ApiResponse<object>.Ok(printData));
        }

        // =========================================================================
        // 5. CANCEL TC (Reactivates student)
        // =========================================================================
        [HttpPost("{id}/cancel")]
        [HasPermission("TransferCertificates", "Delete")]
        public async Task<ActionResult<ApiResponse<bool>>> CancelTransferCertificate(long id, [FromBody] CancelTcDto dto)
        {
            var tc = await _context.TransferCertificates.FirstOrDefaultAsync(t => t.Id == id);
            if (tc == null) return NotFound(ApiResponse<bool>.Fail("TC not found."));

            tc.Status = TcStatus.Cancelled;
            tc.Remarks = $"{tc.Remarks} [Cancelled: {dto.Reason}]".Trim();
            tc.ModifiedBy = _currentUserService.UserId ?? 1;
            tc.ModifiedOn = DateTime.UtcNow;

            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == tc.StudentId);
            if (student != null)
            {
                student.Status = StudentStatus.Active;
                student.ModifiedBy = _currentUserService.UserId ?? 1;
                student.ModifiedOn = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, "Transfer Certificate cancelled and student reactivated."));
        }
    }

    public class IssueTcRequestDto
    {
        public long StudentId { get; set; }
        public string ApplicationDate { get; set; } = string.Empty;
        public string IssueDate { get; set; } = string.Empty;
        public string LastClassStudied { get; set; } = string.Empty;
        public bool QualifiedForPromotion { get; set; } = true;
        public string ReasonForLeaving { get; set; } = string.Empty;
        public string? Conduct { get; set; } = "Good";
        public bool AdminOverrideDues { get; set; } = false;
        public string? Remarks { get; set; }
    }

    public class CancelTcDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}
