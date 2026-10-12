using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AuditLogsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AuditLogsController(ApplicationDbContext context, ICurrentUserService currentUserService)
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
        public async Task<ActionResult<ApiResponse<PagedResult<AuditLog>>>> GetLogs(
            [FromQuery] string? search,
            [FromQuery] string? module,
            [FromQuery] string? action,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int pageNo = 1,
            [FromQuery] int pageSize = 20)
        {
            if (!IsSuperAdmin())
            {
                return StatusCode(403, ApiResponse.Fail("Access denied: Only SuperAdmin can access Audit Logs."));
            }

            var query = _context.AuditLogs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(l => (l.Username != null && l.Username.ToLower().Contains(s)) ||
                                         l.Action.ToLower().Contains(s) ||
                                         l.Module.ToLower().Contains(s) ||
                                         (l.NewValues != null && l.NewValues.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(module))
            {
                query = query.Where(l => l.Module == module);
            }

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(l => l.Action == action);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(l => l.CreatedOn >= fromDate.Value.ToUniversalTime());
            }

            if (toDate.HasValue)
            {
                query = query.Where(l => l.CreatedOn <= toDate.Value.ToUniversalTime());
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(l => l.CreatedOn)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(ApiResponse<PagedResult<AuditLog>>.Ok(
                new PagedResult<AuditLog>(items, totalCount, pageNo, pageSize)
            ));
        }
    }
}
