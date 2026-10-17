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
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public UsersController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("Users", "View")]
        public async Task<ActionResult<ApiResponse<PagedResult<UserDto>>>> GetUsers(
            [FromQuery] string? search,
            [FromQuery] long? roleId,
            [FromQuery] bool? isActive,
            [FromQuery] int pageNo = 1,
            [FromQuery] int pageSize = 10)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var query = _context.Users
                .Include(u => u.Role)
                .AsNoTracking();

            if (!isSuperAdmin)
            {
                // School Admin & staff can only view users belonging to their own branch, excluding Super Admin
                query = query.Where(u => u.BranchId == branchId && u.UserType != UserType.SuperAdmin);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(u => u.Username.ToLower().Contains(s) ||
                                         u.FullName.ToLower().Contains(s) ||
                                         (u.Email != null && u.Email.ToLower().Contains(s)) ||
                                         (u.Mobile != null && u.Mobile.Contains(s)));
            }

            if (roleId.HasValue)
            {
                query = query.Where(u => u.RoleId == roleId.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            var totalCount = await query.CountAsync();
            var users = await query
                .OrderByDescending(u => u.Id)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    FullName = u.FullName,
                    Email = u.Email,
                    Mobile = u.Mobile,
                    UserType = u.UserType,
                    RoleId = u.RoleId,
                    RoleName = u.Role != null ? u.Role.Name : "",
                    BranchId = u.BranchId,
                    IsActive = u.IsActive,
                    IsLocked = u.IsLocked,
                    CanGiveDiscount = u.CanGiveDiscount,
                    MaxDiscountLimit = u.MaxDiscountLimit
                })
                .ToListAsync();

            return Ok(ApiResponse<PagedResult<UserDto>>.Ok(
                new PagedResult<UserDto>(users, totalCount, pageNo, pageSize)
            ));
        }

        [HttpGet("{id}")]
        [HasPermission("Users", "View")]
        public async Task<ActionResult<ApiResponse<UserDto>>> GetUser(long id)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var user = await _context.Users
                .Include(u => u.Role)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                return NotFound(ApiResponse<UserDto>.Fail("User not found."));
            }

            if (!isSuperAdmin && user.BranchId != branchId)
            {
                return StatusCode(403, ApiResponse<UserDto>.Fail("Access denied to user belonging to other school."));
            }

            return Ok(ApiResponse<UserDto>.Ok(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Mobile = user.Mobile,
                UserType = user.UserType,
                RoleId = user.RoleId,
                RoleName = user.Role?.Name ?? "",
                BranchId = user.BranchId,
                IsActive = user.IsActive,
                IsLocked = user.IsLocked,
                CanGiveDiscount = user.CanGiveDiscount,
                MaxDiscountLimit = user.MaxDiscountLimit
            }));
        }

        public class CreateUserRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
            public string? Email { get; set; }
            public string? Mobile { get; set; }
            public UserType UserType { get; set; }
            public long RoleId { get; set; }
            public long? BranchId { get; set; }
            public long? LinkedEntityId { get; set; }
            public bool CanGiveDiscount { get; set; } = false;
            public decimal MaxDiscountLimit { get; set; } = 0;
        }

        [HttpPost]
        [HasPermission("Users", "Add")]
        public async Task<ActionResult<ApiResponse<UserDto>>> CreateUser([FromBody] CreateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(ApiResponse<UserDto>.Fail("Username and Full Name are required."));
            }

            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            // Non-superadmin cannot create Super Admin users
            if (!isSuperAdmin && request.UserType == UserType.SuperAdmin)
            {
                return StatusCode(403, ApiResponse<UserDto>.Fail("Only Super Admin can create Super Admin accounts."));
            }

            var usernameExists = await _context.Users.AnyAsync(u => u.Username.ToLower() == request.Username.Trim().ToLower());
            if (usernameExists)
            {
                return BadRequest(ApiResponse<UserDto>.Fail("Username already exists."));
            }

            var initialPassword = string.IsNullOrWhiteSpace(request.Password) ? "Admin@123" : request.Password;
            var targetBranchId = (isSuperAdmin && request.BranchId.HasValue && request.BranchId.Value > 0)
                ? request.BranchId.Value
                : branchId;

            var user = new User
            {
                Username = request.Username.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(initialPassword),
                FullName = request.FullName.Trim(),
                Email = request.Email,
                Mobile = request.Mobile,
                UserType = request.UserType,
                RoleId = request.RoleId,
                BranchId = targetBranchId,
                LinkedEntityId = request.LinkedEntityId,
                MustChangePassword = true, // FR-1.4: User must change password on first login
                IsActive = true,
                CanGiveDiscount = request.CanGiveDiscount,
                MaxDiscountLimit = request.MaxDiscountLimit
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "Create",
                Module = "Users",
                EntityName = "User",
                RecordId = user.Id.ToString(),
                NewValues = $"Username: {user.Username}, RoleId: {user.RoleId}, CanDiscount: {user.CanGiveDiscount}, MaxDiscount: {user.MaxDiscountLimit}",
                IpAddress = _currentUserService.IpAddress,
                BranchId = user.BranchId
            });
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<UserDto>.Ok(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Mobile = user.Mobile,
                UserType = user.UserType,
                RoleId = user.RoleId,
                BranchId = user.BranchId,
                IsActive = user.IsActive,
                CanGiveDiscount = user.CanGiveDiscount,
                MaxDiscountLimit = user.MaxDiscountLimit
            }, "User created successfully."));
        }

        public class UpdateUserRequest
        {
            public string FullName { get; set; } = string.Empty;
            public string? Email { get; set; }
            public string? Mobile { get; set; }
            public UserType UserType { get; set; }
            public long RoleId { get; set; }
            public long? BranchId { get; set; }
            public bool CanGiveDiscount { get; set; } = false;
            public decimal MaxDiscountLimit { get; set; } = 0;
        }

        [HttpPut("{id}")]
        [HasPermission("Users", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateUser(long id, [FromBody] UpdateUserRequest request)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse.Fail("User not found."));

            if (!isSuperAdmin && user.BranchId != branchId)
            {
                return StatusCode(403, ApiResponse.Fail("Access denied to user from other school."));
            }

            var oldValues = $"FullName: {user.FullName}, RoleId: {user.RoleId}, UserType: {user.UserType}, CanDiscount: {user.CanGiveDiscount}, MaxDiscount: {user.MaxDiscountLimit}";

            user.FullName = request.FullName.Trim();
            user.Email = request.Email;
            user.Mobile = request.Mobile;
            user.UserType = request.UserType;
            user.RoleId = request.RoleId;
            user.CanGiveDiscount = request.CanGiveDiscount;
            user.MaxDiscountLimit = request.MaxDiscountLimit;
            if (isSuperAdmin && request.BranchId.HasValue) user.BranchId = request.BranchId.Value;

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "Update",
                Module = "Users",
                EntityName = "User",
                RecordId = user.Id.ToString(),
                OldValues = oldValues,
                NewValues = $"FullName: {user.FullName}, RoleId: {user.RoleId}, UserType: {user.UserType}, CanDiscount: {user.CanGiveDiscount}, MaxDiscount: {user.MaxDiscountLimit}",
                IpAddress = _currentUserService.IpAddress,
                BranchId = user.BranchId
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("User updated successfully."));
        }

        [HttpPut("{id}/status")]
        [HasPermission("Users", "Edit")]
        public async Task<ActionResult<ApiResponse>> ToggleStatus(long id, [FromBody] bool isActive)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var user = await _context.Users
                .Include(u => u.RefreshTokens)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null) return NotFound(ApiResponse.Fail("User not found."));

            if (!isSuperAdmin && user.BranchId != branchId)
            {
                return StatusCode(403, ApiResponse.Fail("Access denied to user from other school."));
            }

            user.IsActive = isActive;

            // BR-1.4: Deactivating a user revokes all refresh tokens immediately
            if (!isActive)
            {
                foreach (var token in user.RefreshTokens.Where(t => !t.IsRevoked))
                {
                    token.IsRevoked = true;
                    token.RevokedUtc = DateTime.UtcNow;
                }
            }

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = isActive ? "Activate" : "Deactivate",
                Module = "Users",
                EntityName = "User",
                RecordId = user.Id.ToString(),
                IpAddress = _currentUserService.IpAddress,
                BranchId = user.BranchId
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok($"User {(isActive ? "activated" : "deactivated")} successfully."));
        }

        [HttpPut("{id}/unlock")]
        [HasPermission("Users", "Edit")]
        public async Task<ActionResult<ApiResponse>> UnlockUser(long id)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse.Fail("User not found."));

            if (!isSuperAdmin && user.BranchId != branchId)
            {
                return StatusCode(403, ApiResponse.Fail("Access denied to user from other school."));
            }

            // BR-1.2: Admin can unlock
            user.IsLocked = false;
            user.FailedLoginAttempts = 0;
            user.LockoutEndUtc = null;

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "Unlock",
                Module = "Users",
                EntityName = "User",
                RecordId = user.Id.ToString(),
                IpAddress = _currentUserService.IpAddress,
                BranchId = user.BranchId
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("User unlocked successfully."));
        }

        [HttpPost("{id}/reset-password")]
        [HasPermission("Users", "Edit")]
        public async Task<ActionResult<ApiResponse>> ResetPassword(long id, [FromBody] string newPassword)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse.Fail("User not found."));

            if (!isSuperAdmin && user.BranchId != branchId)
            {
                return StatusCode(403, ApiResponse.Fail("Access denied to user from other school."));
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.MustChangePassword = true; // FR-1.4: User must change password after admin reset

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "ResetPassword",
                Module = "Users",
                EntityName = "User",
                RecordId = user.Id.ToString(),
                IpAddress = _currentUserService.IpAddress,
                BranchId = user.BranchId
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Password reset successfully. User will be prompted to change password on next login."));
        }
    }
}
