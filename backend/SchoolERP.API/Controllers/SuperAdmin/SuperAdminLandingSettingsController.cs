using System;
using System.Security.Claims;
using System.Text.Json;
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
    [ApiController]
    [Route("api/superadmin/landing-settings")]
    [Authorize]
    public class SuperAdminLandingSettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SuperAdminLandingSettingsController(ApplicationDbContext context, ICurrentUserService currentUserService)
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
        public async Task<IActionResult> GetSettings()
        {
            if (!IsSuperAdmin())
                return Forbid();

            var setting = await _context.LandingPageSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "landing_page_config");

            return Ok(new { success = true, data = setting?.SettingValue });
        }

        [HttpPost]
        public async Task<IActionResult> SaveSettings([FromBody] JsonElement payload)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var rawJson = payload.ToString();
            var setting = await _context.LandingPageSettings
                .FirstOrDefaultAsync(s => s.SettingKey == "landing_page_config");

            if (setting == null)
            {
                setting = new LandingPageSetting
                {
                    SettingKey = "landing_page_config",
                    SettingValue = rawJson
                };
                _context.LandingPageSettings.Add(setting);
            }
            else
            {
                setting.SettingValue = rawJson;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Landing page settings saved successfully.", data = setting.SettingValue });
        }
    }
}
