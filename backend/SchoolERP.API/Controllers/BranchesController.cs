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
    public class BranchesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public BranchesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("current")]
        public async Task<ActionResult<ApiResponse<BranchDto>>> GetCurrentBranch()
        {
            var branchId = _currentUserService.BranchId;
            Branch? branch = null;
            if (branchId > 0)
            {
                branch = await _context.Branches.Include(b => b.School).AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId);
            }
            if (branch == null)
            {
                branch = await _context.Branches.Include(b => b.School).AsNoTracking().FirstOrDefaultAsync();
            }
            if (branch == null) return NotFound(ApiResponse<BranchDto>.Fail("Branch not found."));

            return Ok(ApiResponse<BranchDto>.Ok(new BranchDto
            {
                Id = branch.Id,
                SchoolId = branch.SchoolId,
                SchoolName = branch.School != null ? branch.School.Name : null,
                AffiliationNumber = branch.School != null ? branch.School.AffiliationNumber : null,
                Website = branch.School != null ? branch.School.Website : null,
                Name = branch.Name,
                Code = branch.Code,
                LogoUrl = branch.LogoUrl ?? branch.School?.LogoUrl,
                PrincipalSignatureUrl = branch.PrincipalSignatureUrl,
                CashierSignatureUrl = branch.CashierSignatureUrl,
                AuthorizedSignatureUrl = branch.AuthorizedSignatureUrl,
                PrintHeader = branch.PrintHeader ?? branch.School?.Name,
                Address = branch.Address ?? branch.School?.Address,
                City = branch.City ?? branch.School?.City,
                State = branch.State ?? branch.School?.State,
                Pincode = branch.Pincode ?? branch.School?.Pincode,
                Phone = branch.Phone ?? branch.School?.ContactNumber,
                Email = branch.Email ?? branch.School?.Email
            }));
        }

        [HttpGet]
        [HasPermission("Branch", "View")]
        public async Task<ActionResult<ApiResponse<List<BranchDto>>>> GetBranches([FromQuery] long? schoolId = null)
        {
            var isSuperAdmin = _currentUserService.UserType == UserType.SuperAdmin;
            var query = _context.Branches.Include(b => b.School).AsNoTracking();

            if (!isSuperAdmin)
            {
                query = query.Where(b => b.Id == _currentUserService.BranchId);
            }
            else if (schoolId.HasValue && schoolId.Value > 0)
            {
                query = query.Where(b => b.SchoolId == schoolId.Value);
            }

            var branches = await query.Select(b => new BranchDto
            {
                Id = b.Id,
                SchoolId = b.SchoolId,
                SchoolName = b.School != null ? b.School.Name : null,
                AffiliationNumber = b.School != null ? b.School.AffiliationNumber : null,
                Website = b.School != null ? b.School.Website : null,
                Name = b.Name,
                Code = b.Code,
                LogoUrl = b.LogoUrl ?? (b.School != null ? b.School.LogoUrl : null),
                PrincipalSignatureUrl = b.PrincipalSignatureUrl,
                CashierSignatureUrl = b.CashierSignatureUrl,
                AuthorizedSignatureUrl = b.AuthorizedSignatureUrl,
                PrintHeader = b.PrintHeader,
                Address = b.Address,
                City = b.City,
                State = b.State,
                Pincode = b.Pincode,
                Phone = b.Phone,
                Email = b.Email
            }).ToListAsync();

            return Ok(ApiResponse<List<BranchDto>>.Ok(branches));
        }

        [HttpGet("{id}")]
        [HasPermission("Branch", "View")]
        public async Task<ActionResult<ApiResponse<BranchDto>>> GetBranch(long id)
        {
            var branch = await _context.Branches.Include(b => b.School).AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
            if (branch == null) return NotFound(ApiResponse<BranchDto>.Fail("Branch not found."));

            return Ok(ApiResponse<BranchDto>.Ok(new BranchDto
            {
                Id = branch.Id,
                SchoolId = branch.SchoolId,
                SchoolName = branch.School != null ? branch.School.Name : null,
                AffiliationNumber = branch.School != null ? branch.School.AffiliationNumber : null,
                Website = branch.School != null ? branch.School.Website : null,
                Name = branch.Name,
                Code = branch.Code,
                LogoUrl = branch.LogoUrl ?? branch.School?.LogoUrl,
                PrincipalSignatureUrl = branch.PrincipalSignatureUrl,
                CashierSignatureUrl = branch.CashierSignatureUrl,
                AuthorizedSignatureUrl = branch.AuthorizedSignatureUrl,
                PrintHeader = branch.PrintHeader,
                Address = branch.Address,
                City = branch.City,
                State = branch.State,
                Pincode = branch.Pincode,
                Phone = branch.Phone,
                Email = branch.Email
            }));
        }

        public class CreateBranchRequest
        {
            public long SchoolId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Code { get; set; } = string.Empty;
            public string? LogoUrl { get; set; }
            public string? PrincipalSignatureUrl { get; set; }
            public string? CashierSignatureUrl { get; set; }
            public string? AuthorizedSignatureUrl { get; set; }
            public string? PrintHeader { get; set; }
            public string? Address { get; set; }
            public string? City { get; set; }
            public string? State { get; set; }
            public string? Pincode { get; set; }
            public string? Phone { get; set; }
            public string? Email { get; set; }
        }

        [HttpPost]
        [HasPermission("Branch", "Add")]
        public async Task<ActionResult<ApiResponse<BranchDto>>> CreateBranch([FromBody] CreateBranchRequest request)
        {
            // FR-2.1: Super Admin creates schools and branches
            if (_currentUserService.UserType != UserType.SuperAdmin)
            {
                return StatusCode(403, ApiResponse<BranchDto>.Fail("Only Super Admin can create branches."));
            }

            var branch = new Branch
            {
                SchoolId = request.SchoolId > 0 ? request.SchoolId : 1,
                Name = request.Name.Trim(),
                Code = request.Code.Trim(),
                LogoUrl = request.LogoUrl,
                PrincipalSignatureUrl = request.PrincipalSignatureUrl,
                CashierSignatureUrl = request.CashierSignatureUrl,
                AuthorizedSignatureUrl = request.AuthorizedSignatureUrl,
                PrintHeader = request.PrintHeader ?? request.Name,
                Address = request.Address,
                City = request.City,
                State = request.State,
                Pincode = request.Pincode,
                Phone = request.Phone,
                Email = request.Email,
                IsActive = true
            };

            _context.Branches.Add(branch);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<BranchDto>.Ok(new BranchDto
            {
                Id = branch.Id,
                SchoolId = branch.SchoolId,
                Name = branch.Name,
                Code = branch.Code,
                LogoUrl = branch.LogoUrl,
                PrincipalSignatureUrl = branch.PrincipalSignatureUrl,
                CashierSignatureUrl = branch.CashierSignatureUrl,
                AuthorizedSignatureUrl = branch.AuthorizedSignatureUrl,
                PrintHeader = branch.PrintHeader
            }, "Branch created successfully."));
        }

        [HttpPut("{id}")]
        [HasPermission("Branch", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateBranch(long id, [FromBody] CreateBranchRequest request)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == id);
            if (branch == null) return NotFound(ApiResponse.Fail("Branch not found."));

            branch.Name = request.Name.Trim();
            branch.Code = request.Code.Trim();
            branch.LogoUrl = request.LogoUrl;
            branch.PrincipalSignatureUrl = request.PrincipalSignatureUrl;
            branch.CashierSignatureUrl = request.CashierSignatureUrl;
            branch.AuthorizedSignatureUrl = request.AuthorizedSignatureUrl;
            branch.PrintHeader = request.PrintHeader;
            branch.Address = request.Address;
            branch.City = request.City;
            branch.State = request.State;
            branch.Pincode = request.Pincode;
            branch.Phone = request.Phone;
            branch.Email = request.Email;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Branch updated successfully."));
        }
    }
}
