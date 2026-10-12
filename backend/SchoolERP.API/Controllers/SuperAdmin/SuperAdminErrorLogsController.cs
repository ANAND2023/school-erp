using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers.SuperAdmin
{
    [Route("api/superadmin/error-logs")]
    [ApiController]
    [Authorize]
    public class SuperAdminErrorLogsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SuperAdminErrorLogsController(ApplicationDbContext context, ICurrentUserService currentUserService)
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
        public async Task<IActionResult> GetErrorLogs(
            [FromQuery] string? search,
            [FromQuery] int? statusCode,
            [FromQuery] bool? isResolved,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (!IsSuperAdmin()) return Forbid();

            var query = _context.SystemErrorLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(e =>
                    e.ErrorId.ToLower().Contains(s) ||
                    e.Message.ToLower().Contains(s) ||
                    (e.RootCause != null && e.RootCause.ToLower().Contains(s)) ||
                    e.RequestPath.ToLower().Contains(s) ||
                    (e.Username != null && e.Username.ToLower().Contains(s)) ||
                    e.ExceptionType.ToLower().Contains(s));
            }

            if (statusCode.HasValue)
            {
                query = query.Where(e => e.StatusCode == statusCode.Value);
            }

            if (isResolved.HasValue)
            {
                query = query.Where(e => e.IsResolved == isResolved.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(e => e.Timestamp >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(e => e.Timestamp <= toDate.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new
                {
                    e.Id,
                    e.ErrorId,
                    e.Timestamp,
                    e.StatusCode,
                    e.HttpMethod,
                    e.RequestPath,
                    e.Message,
                    e.ExceptionType,
                    e.RootCause,
                    e.UserId,
                    e.Username,
                    e.UserRole,
                    e.BranchId,
                    e.SchoolId,
                    e.IpAddress,
                    e.IsResolved,
                    e.ResolvedBy,
                    e.ResolvedAt,
                    e.ResolutionNotes
                })
                .ToListAsync();

            // Quick summary statistics
            var today = DateTime.UtcNow.Date;
            var totalErrors = await _context.SystemErrorLogs.CountAsync();
            var todayErrors = await _context.SystemErrorLogs.CountAsync(e => e.Timestamp >= today);
            var unresolvedCount = await _context.SystemErrorLogs.CountAsync(e => !e.IsResolved);
            var count500 = await _context.SystemErrorLogs.CountAsync(e => e.StatusCode == 500);

            return Ok(new
            {
                success = true,
                data = new
                {
                    items,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                    summary = new
                    {
                        totalErrors,
                        todayErrors,
                        unresolvedCount,
                        count500
                    }
                }
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetErrorLogById(long id)
        {
            if (!IsSuperAdmin()) return Forbid();

            var log = await _context.SystemErrorLogs.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
            if (log == null) return NotFound(new { success = false, message = "Error log not found." });

            return Ok(new { success = true, data = log });
        }

        [HttpPost("{id}/resolve")]
        public async Task<IActionResult> ResolveErrorLog(long id, [FromBody] ResolveErrorDto? dto)
        {
            if (!IsSuperAdmin()) return Forbid();

            var log = await _context.SystemErrorLogs.FirstOrDefaultAsync(e => e.Id == id);
            if (log == null) return NotFound(new { success = false, message = "Error log not found." });

            log.IsResolved = true;
            log.ResolvedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "Super Admin";
            log.ResolvedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(dto?.ResolutionNotes))
            {
                log.ResolutionNotes = dto.ResolutionNotes;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Error marked as resolved.", data = log });
        }

        [HttpPost("{id}/unresolve")]
        public async Task<IActionResult> UnresolveErrorLog(long id)
        {
            if (!IsSuperAdmin()) return Forbid();

            var log = await _context.SystemErrorLogs.FirstOrDefaultAsync(e => e.Id == id);
            if (log == null) return NotFound(new { success = false, message = "Error log not found." });

            log.IsResolved = false;
            log.ResolvedBy = null;
            log.ResolvedAt = null;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Error marked as unresolved.", data = log });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteErrorLog(long id)
        {
            if (!IsSuperAdmin()) return Forbid();

            var log = await _context.SystemErrorLogs.FirstOrDefaultAsync(e => e.Id == id);
            if (log == null) return NotFound(new { success = false, message = "Error log not found." });

            _context.SystemErrorLogs.Remove(log);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Error log deleted successfully." });
        }

        [HttpPost("clear-resolved")]
        public async Task<IActionResult> ClearResolvedLogs()
        {
            if (!IsSuperAdmin()) return Forbid();

            var resolvedLogs = await _context.SystemErrorLogs.Where(e => e.IsResolved).ToListAsync();
            _context.SystemErrorLogs.RemoveRange(resolvedLogs);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = $"Cleared {resolvedLogs.Count} resolved error logs." });
        }

        [HttpPost("clear-all")]
        public async Task<IActionResult> ClearAllLogs([FromQuery] int daysOld = 0)
        {
            if (!IsSuperAdmin()) return Forbid();

            var query = _context.SystemErrorLogs.AsQueryable();
            if (daysOld > 0)
            {
                var cutoff = DateTime.UtcNow.AddDays(-daysOld);
                query = query.Where(e => e.Timestamp < cutoff);
            }

            var logs = await query.ToListAsync();
            _context.SystemErrorLogs.RemoveRange(logs);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = $"Cleared {logs.Count} error logs." });
        }
    }

    public class ResolveErrorDto
    {
        public string? ResolutionNotes { get; set; }
    }
}
