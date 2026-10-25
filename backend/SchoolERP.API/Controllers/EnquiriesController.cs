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
using System.Text.Json;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnquiriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly INumberingSeriesService _numberingService;

        public EnquiriesController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            INumberingSeriesService numberingService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _numberingService = numberingService;
        }

        [HttpGet]
        [HasPermission("Enquiries", "View")]
        public async Task<ActionResult<ApiResponse<PagedResult<EnquiryDto>>>> GetEnquiries(
            [FromQuery] string? search,
            [FromQuery] long? classId,
            [FromQuery] EnquiryStatus? status,
            [FromQuery] long? academicYearId,
            [FromQuery] int pageNo = 1,
            [FromQuery] int pageSize = 10)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = academicYearId.HasValue && academicYearId.Value > 0
                ? academicYearId.Value
                : _currentUserService.AcademicYearId;

            var query = _context.Enquiries
                .Include(e => e.Class)
                .Where(e => e.BranchId == branchId && e.AcademicYearId == yearId)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(e => e.StudentName.ToLower().Contains(s) ||
                                         e.GuardianName.ToLower().Contains(s) ||
                                         e.Mobile.Contains(s) ||
                                         (e.Email != null && e.Email.ToLower().Contains(s)));
            }

            if (classId.HasValue)
            {
                query = query.Where(e => e.ClassId == classId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(e => e.Status == status.Value);
            }

            var totalCount = await query.CountAsync();
            var academicYears = await _context.AcademicYears.Where(ay => ay.BranchId == branchId).ToDictionaryAsync(ay => ay.Id, ay => ay.Name);

            var items = await query
                .OrderByDescending(e => e.CreatedOn)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EnquiryDto
                {
                    Id = e.Id,
                    AcademicYearId = e.AcademicYearId,
                    AcademicYearName = academicYears.ContainsKey(e.AcademicYearId) ? academicYears[e.AcademicYearId] : "",
                    EnquiryNo = e.EnquiryNo,
                    StudentName = e.StudentName,
                    ClassId = e.ClassId,
                    ClassName = e.Class != null ? e.Class.Name : "",
                    GuardianName = e.GuardianName,
                    Mobile = e.Mobile,
                    Email = e.Email,
                    Source = e.Source,
                    Status = e.Status,
                    NextFollowupDate = e.NextFollowupDate,
                    Notes = e.Notes,
                    ConvertedStudentId = e.ConvertedStudentId,
                    CreatedOn = e.CreatedOn
                })
                .ToListAsync();

            return Ok(ApiResponse<PagedResult<EnquiryDto>>.Ok(
                new PagedResult<EnquiryDto>(items, totalCount, pageNo, pageSize)
            ));
        }

        [HttpGet("{id}")]
        [HasPermission("Enquiries", "View")]
        public async Task<ActionResult<ApiResponse<EnquiryDto>>> GetEnquiry(long id)
        {
            var branchId = _currentUserService.BranchId;
            var enquiry = await _context.Enquiries
                .Include(e => e.Class)
                .Include(e => e.Followups)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id && e.BranchId == branchId);

            if (enquiry == null) return NotFound(ApiResponse<EnquiryDto>.Fail("Enquiry not found."));

            var ay = await _context.AcademicYears.FirstOrDefaultAsync(a => a.Id == enquiry.AcademicYearId);

            return Ok(ApiResponse<EnquiryDto>.Ok(new EnquiryDto
            {
                Id = enquiry.Id,
                AcademicYearId = enquiry.AcademicYearId,
                AcademicYearName = ay?.Name ?? "",
                EnquiryNo = enquiry.EnquiryNo,
                StudentName = enquiry.StudentName,
                ClassId = enquiry.ClassId,
                ClassName = enquiry.Class?.Name ?? "",
                GuardianName = enquiry.GuardianName,
                Mobile = enquiry.Mobile,
                Email = enquiry.Email,
                Source = enquiry.Source,
                Status = enquiry.Status,
                NextFollowupDate = enquiry.NextFollowupDate,
                Notes = enquiry.Notes,
                ConvertedStudentId = enquiry.ConvertedStudentId,
                CreatedOn = enquiry.CreatedOn,
                Followups = enquiry.Followups.OrderByDescending(f => f.FollowupDate).Select(f => new EnquiryFollowupDto
                {
                    Id = f.Id,
                    EnquiryId = f.EnquiryId,
                    FollowupDate = f.FollowupDate,
                    Response = f.Response,
                    Notes = f.Notes,
                    NextFollowupDate = f.NextFollowupDate
                }).ToList()
            }));
        }

        [HttpPost]
        [HasPermission("Enquiries", "Add")]
        public async Task<ActionResult<ApiResponse<EnquiryDto>>> CreateEnquiry([FromBody] CreateEnquiryDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = request.AcademicYearId.HasValue && request.AcademicYearId.Value > 0
                ? request.AcademicYearId.Value
                : _currentUserService.AcademicYearId;

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var currentAY = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == yearId);

            // Prevent Duplicate Enquiry: Same student name and mobile number in the same academic session
            var cleanStudentName = request.StudentName.Trim().ToLower();
            var cleanMobile = request.Mobile.Trim();

            var existingEnquiry = await _context.Enquiries
                .Where(e => e.BranchId == branchId &&
                            e.AcademicYearId == yearId &&
                            e.Mobile == cleanMobile &&
                            e.StudentName.ToLower() == cleanStudentName &&
                            e.IsActive)
                .FirstOrDefaultAsync();

            if (existingEnquiry != null)
            {
                var statusText = existingEnquiry.Status == EnquiryStatus.Converted ? "already converted to admission" : $"currently in '{existingEnquiry.Status}' status";
                return BadRequest(ApiResponse<EnquiryDto>.Fail(
                    $"Duplicate Enquiry: An enquiry ({existingEnquiry.EnquiryNo}) for '{request.StudentName}' with mobile '{cleanMobile}' already exists ({statusText})."));
            }

            var enquiryNo = await _numberingService.GetNextNumberAsync(branchId, "Enquiry", branch?.Code, currentAY?.Name);

            var enquiry = new Enquiry
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                EnquiryNo = enquiryNo,
                StudentName = request.StudentName.Trim().ToUpper(),
                ClassId = request.ClassId,
                GuardianName = request.GuardianName.Trim().ToUpper(),
                Mobile = request.Mobile.Trim(),
                Email = request.Email?.Trim(),
                Source = request.Source,
                Status = EnquiryStatus.Open,
                NextFollowupDate = request.NextFollowupDate,
                Notes = request.Notes,
                IsActive = true
            };

            _context.Enquiries.Add(enquiry);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<EnquiryDto>.Ok(new EnquiryDto
            {
                Id = enquiry.Id,
                AcademicYearId = enquiry.AcademicYearId,
                AcademicYearName = currentAY?.Name ?? "",
                EnquiryNo = enquiry.EnquiryNo,
                StudentName = enquiry.StudentName,
                ClassId = enquiry.ClassId,
                GuardianName = enquiry.GuardianName,
                Mobile = enquiry.Mobile,
                Status = enquiry.Status
            }, "Enquiry recorded successfully."));
        }

        [HttpPut("{id}")]
        [HasPermission("Enquiries", "Edit")]
        public async Task<ActionResult<ApiResponse<EnquiryDto>>> UpdateEnquiry(long id, [FromBody] UpdateEnquiryDto request)
        {
            var branchId = _currentUserService.BranchId;
            var enquiry = await _context.Enquiries
                .Include(e => e.Class)
                .FirstOrDefaultAsync(e => e.Id == id && e.BranchId == branchId);

            if (enquiry == null) return NotFound(ApiResponse<EnquiryDto>.Fail("Enquiry not found."));

            if (enquiry.Status == EnquiryStatus.Converted)
            {
                return BadRequest(ApiResponse<EnquiryDto>.Fail("This enquiry has already been converted to an admission and cannot be modified."));
            }

            // Check duplicate if name/mobile changed
            var cleanStudentName = request.StudentName?.Trim().ToLower();
            var cleanMobile = request.Mobile?.Trim();

            if (!string.IsNullOrEmpty(cleanStudentName) && !string.IsNullOrEmpty(cleanMobile))
            {
                var duplicate = await _context.Enquiries
                    .AnyAsync(e => e.BranchId == branchId &&
                                   e.AcademicYearId == enquiry.AcademicYearId &&
                                   e.Id != id &&
                                   e.Mobile == cleanMobile &&
                                   e.StudentName.ToLower() == cleanStudentName &&
                                   e.IsActive);

                if (duplicate)
                {
                    return BadRequest(ApiResponse<EnquiryDto>.Fail($"Another active enquiry already exists for '{request.StudentName}' with mobile '{cleanMobile}'."));
                }
            }

            if (!string.IsNullOrWhiteSpace(request.StudentName)) enquiry.StudentName = request.StudentName.Trim().ToUpper();
            if (!string.IsNullOrWhiteSpace(request.GuardianName)) enquiry.GuardianName = request.GuardianName.Trim().ToUpper();
            if (!string.IsNullOrWhiteSpace(request.Mobile)) enquiry.Mobile = request.Mobile.Trim();
            enquiry.Email = request.Email?.Trim();
            if (request.ClassId.HasValue && request.ClassId.Value > 0) enquiry.ClassId = request.ClassId.Value;
            if (!string.IsNullOrWhiteSpace(request.Source)) enquiry.Source = request.Source.Trim();
            if (request.Status.HasValue) enquiry.Status = request.Status.Value;
            if (request.NextFollowupDate.HasValue) enquiry.NextFollowupDate = request.NextFollowupDate.Value;
            enquiry.Notes = request.Notes?.Trim();
            enquiry.ModifiedOn = DateTime.UtcNow;
            enquiry.ModifiedBy = _currentUserService.UserId ?? 1;

            await _context.SaveChangesAsync();

            var className = enquiry.Class?.Name;
            if (string.IsNullOrEmpty(className) && enquiry.ClassId > 0)
            {
                var cls = await _context.Classes.FindAsync(enquiry.ClassId);
                className = cls?.Name;
            }

            var ay = await _context.AcademicYears.FindAsync(enquiry.AcademicYearId);

            return Ok(ApiResponse<EnquiryDto>.Ok(new EnquiryDto
            {
                Id = enquiry.Id,
                AcademicYearId = enquiry.AcademicYearId,
                AcademicYearName = ay?.Name ?? "",
                EnquiryNo = enquiry.EnquiryNo,
                StudentName = enquiry.StudentName,
                ClassId = enquiry.ClassId,
                ClassName = className ?? "General Enquiry",
                GuardianName = enquiry.GuardianName,
                Mobile = enquiry.Mobile,
                Email = enquiry.Email,
                Source = enquiry.Source,
                Status = enquiry.Status,
                Notes = enquiry.Notes,
                CreatedOn = enquiry.CreatedOn
            }, "Enquiry updated successfully."));
        }

        [HttpDelete("{id}")]
        [HasPermission("Enquiries", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteEnquiry(long id)
        {
            var branchId = _currentUserService.BranchId;
            var enquiry = await _context.Enquiries.FirstOrDefaultAsync(e => e.Id == id && e.BranchId == branchId);
            if (enquiry == null) return NotFound(ApiResponse.Fail("Enquiry not found."));

            if (enquiry.Status == EnquiryStatus.Converted)
            {
                return BadRequest(ApiResponse.Fail("Converted enquiry cannot be deleted as it is linked to an admission record."));
            }

            enquiry.IsActive = false;
            enquiry.ModifiedOn = DateTime.UtcNow;
            enquiry.ModifiedBy = _currentUserService.UserId ?? 1;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Enquiry deleted successfully."));
        }

        [HttpPost("{id}/followup")]
        [HasPermission("Enquiries", "Edit")]
        public async Task<ActionResult<ApiResponse>> AddFollowup(long id, [FromBody] AddFollowupDto request)
        {
            var branchId = _currentUserService.BranchId;
            var enquiry = await _context.Enquiries.FirstOrDefaultAsync(e => e.Id == id && e.BranchId == branchId);
            if (enquiry == null) return NotFound(ApiResponse.Fail("Enquiry not found."));

            if (enquiry.Status == EnquiryStatus.Converted)
            {
                return BadRequest(ApiResponse.Fail("This enquiry has already been converted to an admission. Follow-ups are closed."));
            }

            var followup = new EnquiryFollowup
            {
                EnquiryId = id,
                FollowupDate = DateTime.UtcNow,
                Response = request.Response.Trim(),
                Notes = request.Notes,
                NextFollowupDate = request.NextFollowupDate,
                IsActive = true
            };

            _context.EnquiryFollowups.Add(followup);

            // Update parent enquiry status
            if (request.UpdateStatus.HasValue)
            {
                enquiry.Status = request.UpdateStatus.Value;
            }
            else
            {
                enquiry.Status = EnquiryStatus.FollowUp;
            }

            enquiry.NextFollowupDate = request.NextFollowupDate;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Followup logged successfully."));
        }

        [HttpGet("slip-config")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<EnquirySlipConfigDto>>> GetEnquirySlipConfig()
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

            // 1. Try school-specific config
            TenantGatewayConfig? config = null;
            if (schoolId.HasValue)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ENQUIRY_SLIP" && g.IsActive);
            }

            // 2. Fallback to platform-wide default
            if (config == null)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "ENQUIRY_SLIP" && g.IsActive);
            }

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<EnquirySlipConfigDto>(
                        config.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        var defaultSecs = EnquirySlipConfigDto.GetDefaultSections();
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
                        return Ok(ApiResponse<EnquirySlipConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            // Return default config
            return Ok(ApiResponse<EnquirySlipConfigDto>.Ok(new EnquirySlipConfigDto()));
        }
    }
}
