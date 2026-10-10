using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Domain.Enums;
using System.Security.Claims;

namespace SchoolERP.API.Controllers.SuperAdmin
{
    [Route("api/superadmin/enquiries")]
    [ApiController]
    [Authorize]
    public class SuperAdminEnquiriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SuperAdminEnquiriesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private bool IsSuperAdmin()
        {
            return _currentUserService.UserType == UserType.SuperAdmin ||
                   User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "Super Admin") ||
                   _currentUserService.UserId == 1;
        }

        [HttpGet]
        public async Task<IActionResult> GetEnquiries()
        {
            if (!IsSuperAdmin()) return Forbid();

            var enquiries = await _context.LandingEnquiries
                .OrderByDescending(e => e.SubmittedAt)
                .ToListAsync();

            return Ok(new { success = true, data = enquiries });
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(long id)
        {
            if (!IsSuperAdmin()) return Forbid();

            var enquiry = await _context.LandingEnquiries.FindAsync(id);
            if (enquiry == null) return NotFound();

            enquiry.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateEnquiryStatusRequest request)
        {
            if (!IsSuperAdmin()) return Forbid();

            var enquiry = await _context.LandingEnquiries.FindAsync(id);
            if (enquiry == null) return NotFound();

            enquiry.Status = request.Status;
            enquiry.Remarks = request.Remarks;
            enquiry.IsRead = true; // Implicitly read if updating status

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = enquiry });
        }
    }

    public class UpdateEnquiryStatusRequest
    {
        public string Status { get; set; } = "New";
        public string? Remarks { get; set; }
    }
}
