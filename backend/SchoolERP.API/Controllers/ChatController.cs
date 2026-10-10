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
    public class ChatController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ChatController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsersForChat()
        {
            var branchId = _currentUserService.BranchId;
            var currentUserId = _currentUserService.UserId;

            // Fetch staff and admins for chatting
            var users = await _context.Users
                .Where(u => u.BranchId == branchId && u.IsActive && u.Id != currentUserId)
                .Select(u => new 
                { 
                    u.Id, 
                    u.FullName, 
                    u.UserType,
                    UnreadCount = _context.ChatMessages.Count(m => m.BranchId == branchId && m.SenderId == u.Id && m.ReceiverId == currentUserId && !m.IsRead)
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(users));
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetChatHistory(long userId)
        {
            var branchId = _currentUserService.BranchId;
            var currentUserId = _currentUserService.UserId;

            var unreadMessages = await _context.ChatMessages
                .Where(m => m.BranchId == branchId && m.SenderId == userId && m.ReceiverId == currentUserId && !m.IsRead)
                .ToListAsync();
                
            if (unreadMessages.Any())
            {
                foreach (var msg in unreadMessages)
                {
                    msg.IsRead = true;
                }
                await _context.SaveChangesAsync();
            }

            var messages = await _context.ChatMessages
                .Where(m => m.BranchId == branchId && 
                            ((m.SenderId == currentUserId && m.ReceiverId == userId) || 
                             (m.SenderId == userId && m.ReceiverId == currentUserId)))
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            return Ok(ApiResponse<List<ChatMessage>>.Ok(messages));
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest req)
        {
            var msg = new ChatMessage
            {
                SenderId = _currentUserService.UserId.GetValueOrDefault(),
                ReceiverId = req.ReceiverId,
                Message = req.Message,
                SentAt = System.DateTime.UtcNow,
                IsRead = false,
                BranchId = _currentUserService.BranchId
            };

            _context.ChatMessages.Add(msg);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<ChatMessage>.Ok(msg, "Message sent successfully"));
        }
    }

    public class SendMessageRequest
    {
        public long ReceiverId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
