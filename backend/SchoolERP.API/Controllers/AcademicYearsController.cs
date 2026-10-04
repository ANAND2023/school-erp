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
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/academic-years")]
    [Authorize]
    public class AcademicYearsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AcademicYearsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<AcademicYearDto>>>> GetAcademicYears()
        {
            var branchId = _currentUserService.BranchId;
            var years = await _context.AcademicYears
                .Where(ay => ay.BranchId == branchId)
                .OrderByDescending(ay => ay.StartDate)
                .Select(ay => new AcademicYearDto
                {
                    Id = ay.Id,
                    BranchId = ay.BranchId,
                    Name = ay.Name,
                    StartDate = ay.StartDate,
                    EndDate = ay.EndDate,
                    IsCurrent = ay.IsCurrent
                })
                .ToListAsync();

            return Ok(ApiResponse<List<AcademicYearDto>>.Ok(years));
        }

        public class CreateAcademicYearRequest
        {
            public string Name { get; set; } = string.Empty;
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public bool IsCurrent { get; set; }
        }

        [HttpPost]
        [HasPermission("AcademicYears", "Add")]
        public async Task<ActionResult<ApiResponse<AcademicYearDto>>> CreateAcademicYear([FromBody] CreateAcademicYearRequest request)
        {
            var branchId = _currentUserService.BranchId;

            if (request.EndDate <= request.StartDate)
            {
                return BadRequest(ApiResponse<AcademicYearDto>.Fail("End date must be greater than start date."));
            }

            // BR-2.1: Dates must not overlap within the same branch
            var overlapping = await _context.AcademicYears.AnyAsync(ay =>
                ay.BranchId == branchId &&
                ((request.StartDate >= ay.StartDate && request.StartDate <= ay.EndDate) ||
                 (request.EndDate >= ay.StartDate && request.EndDate <= ay.EndDate)));

            if (overlapping)
            {
                return BadRequest(ApiResponse<AcademicYearDto>.Fail("Academic year dates cannot overlap with an existing session."));
            }

            // BR-2.1: Only one academic year can be current per branch
            if (request.IsCurrent)
            {
                var currentYears = await _context.AcademicYears
                    .Where(ay => ay.BranchId == branchId && ay.IsCurrent)
                    .ToListAsync();
                foreach (var y in currentYears) y.IsCurrent = false;
            }

            var academicYear = new AcademicYear
            {
                BranchId = branchId,
                Name = request.Name.Trim(),
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                IsCurrent = request.IsCurrent,
                IsActive = true
            };

            _context.AcademicYears.Add(academicYear);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<AcademicYearDto>.Ok(new AcademicYearDto
            {
                Id = academicYear.Id,
                BranchId = academicYear.BranchId,
                Name = academicYear.Name,
                StartDate = academicYear.StartDate,
                EndDate = academicYear.EndDate,
                IsCurrent = academicYear.IsCurrent
            }, "Academic Year created successfully."));
        }

        [HttpPut("{id}/set-current")]
        [HasPermission("AcademicYears", "Edit")]
        public async Task<ActionResult<ApiResponse>> SetCurrent(long id)
        {
            var branchId = _currentUserService.BranchId;
            var target = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.Id == id && ay.BranchId == branchId);
            if (target == null) return NotFound(ApiResponse.Fail("Academic Year not found."));

            var allYears = await _context.AcademicYears.Where(ay => ay.BranchId == branchId).ToListAsync();
            foreach (var y in allYears)
            {
                y.IsCurrent = (y.Id == id);
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok($"Academic Year '{target.Name}' set as current session."));
        }
    }
}
