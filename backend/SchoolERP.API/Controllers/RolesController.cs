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
    public class RolesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public RolesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("Roles", "View")]
        public async Task<ActionResult<ApiResponse<List<RoleDto>>>> GetRoles()
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var query = _context.Roles.AsNoTracking();

            if (!isSuperAdmin)
            {
                // School Admin & staff only see global system roles or their branch's custom roles, excluding Super Admin
                query = query.Where(r => (r.BranchId == branchId || r.BranchId == null) && r.Name != "Super Admin");
            }

            var roles = await query
                .OrderBy(r => r.Id)
                .Select(r => new RoleDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    Description = r.Description,
                    IsSystemRole = r.IsSystemRole,
                    Permissions = new List<RolePermissionDto>()
                })
                .ToListAsync();

            return Ok(ApiResponse<List<RoleDto>>.Ok(roles));
        }

        [HttpGet("{id}")]
        [HasPermission("Roles", "View")]
        public async Task<ActionResult<ApiResponse<RoleDto>>> GetRole(long id)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            var query = _context.Roles
                .Include(r => r.Permissions)
                .AsNoTracking();

            if (!isSuperAdmin)
            {
                query = query.Where(r => (r.BranchId == branchId || r.BranchId == null) && r.Name != "Super Admin");
            }

            var role = await query.FirstOrDefaultAsync(r => r.Id == id);

            if (role == null) return NotFound(ApiResponse<RoleDto>.Fail("Role not found."));

            return Ok(ApiResponse<RoleDto>.Ok(new RoleDto
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description,
                IsSystemRole = role.IsSystemRole,
                Permissions = role.Permissions.Select(p => new RolePermissionDto
                {
                    Menu = p.Menu,
                    CanView = p.CanView,
                    CanAdd = p.CanAdd,
                    CanEdit = p.CanEdit,
                    CanDelete = p.CanDelete,
                    CanPrint = p.CanPrint,
                    CanExport = p.CanExport
                }).ToList()
            }));
        }

        public class SaveRoleRequest
        {
            public string Name { get; set; } = string.Empty;
            public string? Description { get; set; }
            public List<RolePermissionDto> Permissions { get; set; } = new List<RolePermissionDto>();
        }

        [HttpPost]
        [HasPermission("Roles", "Add")]
        public async Task<ActionResult<ApiResponse<RoleDto>>> CreateRole([FromBody] SaveRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<RoleDto>.Fail("Role name is required."));
            }

            var role = new Role
            {
                Name = request.Name.Trim(),
                Description = request.Description,
                IsSystemRole = false,
                BranchId = _currentUserService.BranchId,
                IsActive = true
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            if (request.Permissions != null && request.Permissions.Any())
            {
                foreach (var p in request.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        Menu = p.Menu,
                        CanView = p.CanView,
                        CanAdd = p.CanAdd,
                        CanEdit = p.CanEdit,
                        CanDelete = p.CanDelete,
                        CanPrint = p.CanPrint,
                        CanExport = p.CanExport,
                        IsActive = true
                    });
                }
                await _context.SaveChangesAsync();
            }

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "Create",
                Module = "Roles",
                EntityName = "Role",
                RecordId = role.Id.ToString(),
                NewValues = $"Name: {role.Name}, PermissionsCount: {request.Permissions?.Count ?? 0}",
                IpAddress = _currentUserService.IpAddress,
                BranchId = role.BranchId
            });
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<RoleDto>.Ok(new RoleDto
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description,
                IsSystemRole = role.IsSystemRole
            }, "Role created successfully."));
        }

        [HttpPut("{id}")]
        [HasPermission("Roles", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateRole(long id, [FromBody] SaveRoleRequest request)
        {
            var role = await _context.Roles
                .Include(r => r.Permissions)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (role == null) return NotFound(ApiResponse.Fail("Role not found."));

            role.Name = request.Name.Trim();
            role.Description = request.Description;

            // Remove existing permissions and replace
            _context.RolePermissions.RemoveRange(role.Permissions);

            if (request.Permissions != null)
            {
                foreach (var p in request.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        Menu = p.Menu,
                        CanView = p.CanView,
                        CanAdd = p.CanAdd,
                        CanEdit = p.CanEdit,
                        CanDelete = p.CanDelete,
                        CanPrint = p.CanPrint,
                        CanExport = p.CanExport,
                        IsActive = true
                    });
                }
            }

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "Update",
                Module = "Roles",
                EntityName = "Role",
                RecordId = role.Id.ToString(),
                NewValues = $"Name: {role.Name}, PermissionsUpdated: true",
                IpAddress = _currentUserService.IpAddress,
                BranchId = role.BranchId
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Role and permissions updated successfully."));
        }

        [HttpDelete("{id}")]
        [HasPermission("Roles", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteRole(long id)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id);
            if (role == null) return NotFound(ApiResponse.Fail("Role not found."));

            // BR-1.3: System roles cannot be deleted; a role with active users cannot be deleted
            if (role.IsSystemRole)
            {
                return BadRequest(ApiResponse.Fail("System roles cannot be deleted."));
            }

            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var branchId = _currentUserService.BranchId;

            if (!isSuperAdmin && role.BranchId != branchId)
            {
                return StatusCode(403, ApiResponse.Fail("Cannot delete roles belonging to other schools."));
            }

            var hasActiveUsers = await _context.Users.AnyAsync(u => u.RoleId == id && u.IsActive);
            if (hasActiveUsers)
            {
                return BadRequest(ApiResponse.Fail("Cannot delete role because active users are assigned to it."));
            }

            role.IsActive = false; // Soft delete

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = _currentUserService.Username,
                Action = "Delete",
                Module = "Roles",
                EntityName = "Role",
                RecordId = role.Id.ToString(),
                IpAddress = _currentUserService.IpAddress,
                BranchId = role.BranchId
            });

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Role deleted successfully."));
        }
    }
}
