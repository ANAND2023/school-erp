using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers.Public
{
    [Route("api/public/landing-settings")]
    [ApiController]
    [AllowAnonymous]
    public class PublicLandingSettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PublicLandingSettingsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var setting = await _context.LandingPageSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "landing_page_config");

            if (setting == null || string.IsNullOrWhiteSpace(setting.SettingValue))
            {
                return Ok(new { success = true, data = (object?)null });
            }

            return Ok(new { success = true, data = setting.SettingValue });
        }
    }
}
