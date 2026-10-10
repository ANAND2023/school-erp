using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers.Public
{
    [Route("api/public/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class EnquiryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EnquiryController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> SubmitEnquiry([FromBody] LandingEnquiryRequest request)
        {
            var enquiry = new LandingEnquiry
            {
                Name = request.Name,
                SchoolName = request.SchoolName,
                Phone = request.Phone,
                Email = request.Email,
                Message = request.Message,
                IsRead = false,
                SubmittedAt = DateTime.UtcNow
            };

            _context.LandingEnquiries.Add(enquiry);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Enquiry submitted successfully." });
        }
    }

    public class LandingEnquiryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string SchoolName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Message { get; set; }
    }
}
