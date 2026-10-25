using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.API.Filters;
using SchoolERP.API.Helpers;
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
    public class SimpleMastersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SimpleMastersController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<SimpleMasterDto>>>> GetMasters([FromQuery] MasterType? type)
        {
            var branchId = _currentUserService.BranchId;

            if (branchId > 0)
            {
                var needSeed = type.HasValue
                    ? !await _context.SimpleMasters.AnyAsync(m => m.BranchId == branchId && m.Type == type.Value && m.IsActive)
                    : !await _context.SimpleMasters.AnyAsync(m => m.BranchId == branchId && m.IsActive);

                if (needSeed)
                {
                    await SchoolDefaultsHelper.SeedBranchSimpleMastersAsync(_context, branchId);
                }
            }

            var query = _context.SimpleMasters.Where(m => m.BranchId == branchId && m.IsActive);

            if (type.HasValue)
            {
                query = query.Where(m => m.Type == type.Value);
            }

            var items = await query
                .OrderBy(m => m.Type)
                .ThenBy(m => m.DisplayOrder)
                .ThenBy(m => m.Name)
                .Select(m => new SimpleMasterDto
                {
                    Id = m.Id,
                    Type = m.Type,
                    Name = m.Name,
                    Code = m.Code,
                    DisplayOrder = m.DisplayOrder
                })
                .ToListAsync();

            return Ok(ApiResponse<List<SimpleMasterDto>>.Ok(items));
        }

        public class CreateSimpleMasterRequest
        {
            public MasterType Type { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? Code { get; set; }
            public int DisplayOrder { get; set; }
        }

        [HttpPost]
        [HasPermission("SimpleMasters", "Add")]
        public async Task<ActionResult<ApiResponse<SimpleMasterDto>>> CreateMaster([FromBody] CreateSimpleMasterRequest request)
        {
            var branchId = _currentUserService.BranchId;

            var exists = await _context.SimpleMasters.AnyAsync(m =>
                m.BranchId == branchId &&
                m.Type == request.Type &&
                m.Name.ToLower() == request.Name.Trim().ToLower());

            if (exists)
            {
                return BadRequest(ApiResponse<SimpleMasterDto>.Fail($"Entry '{request.Name}' already exists under {request.Type}."));
            }

            var item = new SimpleMaster
            {
                BranchId = branchId,
                Type = request.Type,
                Name = request.Name.Trim(),
                Code = request.Code?.Trim(),
                DisplayOrder = request.DisplayOrder,
                IsActive = true
            };

            _context.SimpleMasters.Add(item);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<SimpleMasterDto>.Ok(new SimpleMasterDto
            {
                Id = item.Id,
                Type = item.Type,
                Name = item.Name,
                Code = item.Code,
                DisplayOrder = item.DisplayOrder
            }, "Master record created successfully."));
        }

        [HttpPut("{id}")]
        [HasPermission("SimpleMasters", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateMaster(long id, [FromBody] CreateSimpleMasterRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var item = await _context.SimpleMasters.FirstOrDefaultAsync(m => m.Id == id && m.BranchId == branchId);
            if (item == null) return NotFound(ApiResponse.Fail("Master item not found."));

            item.Name = request.Name.Trim();
            item.Code = request.Code?.Trim();
            item.DisplayOrder = request.DisplayOrder;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Master item updated successfully."));
        }

        [HttpDelete("{id}")]
        [HasPermission("SimpleMasters", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteMaster(long id)
        {
            var branchId = _currentUserService.BranchId;
            var item = await _context.SimpleMasters.FirstOrDefaultAsync(m => m.Id == id && m.BranchId == branchId);
            if (item == null) return NotFound(ApiResponse.Fail("Master item not found."));

            item.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Master item deleted successfully."));
        }
    }
}
