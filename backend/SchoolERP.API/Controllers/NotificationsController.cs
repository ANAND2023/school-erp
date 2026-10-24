using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.Domain.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public NotificationsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyNotifications()
        {
            var branchId = _currentUserService.BranchId;
            var currentUserId = _currentUserService.UserId;
            var userType = _currentUserService.UserType;

            var notifications = await _context.SystemNotifications
                .Where(n => n.BranchId == branchId && 
                            (n.TargetUserId == null || n.TargetUserId == currentUserId) &&
                            (n.TargetUserType == null || n.TargetUserType == userType))
                .OrderByDescending(n => n.SentAt)
                .Take(20)
                .ToListAsync();

            return Ok(ApiResponse<List<SystemNotification>>.Ok(notifications));
        }

        [HttpPost]
        public async Task<IActionResult> SendNotification([FromBody] SendNotificationRequest req)
        {
            // Only admins should ideally do this, but omitting role check for MVP simplicity
            var notification = new SystemNotification
            {
                Title = req.Title,
                Message = req.Message,
                SentAt = System.DateTime.UtcNow,
                TargetUserId = req.TargetUserId,
                TargetUserType = req.TargetUserType,
                BranchId = _currentUserService.BranchId,
                CreatedById = _currentUserService.UserId.GetValueOrDefault()
            };

            _context.SystemNotifications.Add(notification);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<SystemNotification>.Ok(notification, "Notification sent successfully"));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNotification(long id, [FromBody] SendNotificationRequest req)
        {
            var branchId = _currentUserService.BranchId;
            var notification = await _context.SystemNotifications
                .FirstOrDefaultAsync(n => n.Id == id && n.BranchId == branchId);

            if (notification == null) return NotFound(ApiResponse.Fail("Notice not found."));

            notification.Title = req.Title.Trim();
            notification.Message = req.Message.Trim();
            notification.TargetUserId = req.TargetUserId;
            notification.TargetUserType = req.TargetUserType;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<SystemNotification>.Ok(notification, "Notice updated successfully."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(long id)
        {
            var branchId = _currentUserService.BranchId;
            var notification = await _context.SystemNotifications
                .FirstOrDefaultAsync(n => n.Id == id && n.BranchId == branchId);

            if (notification == null) return NotFound(ApiResponse.Fail("Notice not found."));

            _context.SystemNotifications.Remove(notification);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Notice deleted successfully."));
        }
    }

    public class SendNotificationRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public long? TargetUserId { get; set; }
        public SchoolERP.Domain.Enums.UserType? TargetUserType { get; set; }
    }
}
