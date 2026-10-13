using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WhatsAppController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public WhatsAppController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("config")]
        public async Task<ActionResult<ApiResponse<WhatsAppModuleConfigDto>>> GetConfig()
        {
            var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == _currentUserService.BranchId);
            var schoolId = branch?.SchoolId;

            // 1. Try school-specific configuration
            var config = await _context.TenantGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "WHATSAPP");

            // 2. Fallback to platform-wide default if no school-specific config exists
            if (config == null)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "WHATSAPP");
            }

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<WhatsAppModuleConfigDto>(
                        config.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (parsed != null)
                    {
                        parsed.IsEnabled = config.IsActive;
                        // Mask secret for tenant safety
                        parsed.ApiSecret = null;
                        return Ok(ApiResponse<WhatsAppModuleConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            // Fallback default
            return Ok(ApiResponse<WhatsAppModuleConfigDto>.Ok(new WhatsAppModuleConfigDto()));
        }
    }
}
