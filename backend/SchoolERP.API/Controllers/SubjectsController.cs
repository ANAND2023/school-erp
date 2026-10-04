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
    public class SubjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public SubjectsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("Subjects", "View")]
        public async Task<ActionResult<ApiResponse<List<SubjectDto>>>> GetSubjects()
        {
            var branchId = _currentUserService.BranchId;
            var subjects = await _context.Subjects
                .Where(s => s.BranchId == branchId && s.IsActive)
                .OrderBy(s => s.Type)
                .ThenBy(s => s.Name)
                .Select(s => new SubjectDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Code = s.Code,
                    Type = s.Type
                })
                .ToListAsync();

            return Ok(ApiResponse<List<SubjectDto>>.Ok(subjects));
        }

        public class CreateSubjectRequest
        {
            public string Name { get; set; } = string.Empty;
            public string Code { get; set; } = string.Empty;
            public SubjectType Type { get; set; } = SubjectType.Scholastic;
        }

        [HttpPost]
        [HasPermission("Subjects", "Add")]
        public async Task<ActionResult<ApiResponse<SubjectDto>>> CreateSubject([FromBody] CreateSubjectRequest request)
        {
            var branchId = _currentUserService.BranchId;

            var exists = await _context.Subjects.AnyAsync(s => s.BranchId == branchId && s.IsActive &&
                (s.Name.ToLower() == request.Name.Trim().ToLower() || s.Code.ToLower() == request.Code.Trim().ToLower()));

            if (exists)
            {
                return BadRequest(ApiResponse<SubjectDto>.Fail("Subject name or code already exists in this branch."));
            }

            var subject = new Subject
            {
                BranchId = branchId,
                Name = request.Name.Trim(),
                Code = request.Code.Trim().ToUpper(),
                Type = request.Type,
                IsActive = true
            };

            _context.Subjects.Add(subject);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<SubjectDto>.Ok(new SubjectDto
            {
                Id = subject.Id,
                Name = subject.Name,
                Code = subject.Code,
                Type = subject.Type
            }, "Subject created successfully."));
        }

        [HttpPut("{id}")]
        [HasPermission("Subjects", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateSubject(long id, [FromBody] CreateSubjectRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var subject = await _context.Subjects.FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId && s.IsActive);
            if (subject == null) return NotFound(ApiResponse.Fail("Subject not found."));

            var exists = await _context.Subjects.AnyAsync(s => s.BranchId == branchId && s.Id != id && s.IsActive &&
                (s.Name.ToLower() == request.Name.Trim().ToLower() || s.Code.ToLower() == request.Code.Trim().ToLower()));
            if (exists)
            {
                return BadRequest(ApiResponse.Fail("Another subject with same name or code already exists in this branch."));
            }

            subject.Name = request.Name.Trim();
            subject.Code = request.Code.Trim().ToUpper();
            subject.Type = request.Type;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Subject updated successfully."));
        }

        [HttpDelete("{id}")]
        [HasPermission("Subjects", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteSubject(long id)
        {
            var branchId = _currentUserService.BranchId;
            var subject = await _context.Subjects.FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId && s.IsActive);
            if (subject == null) return NotFound(ApiResponse.Fail("Subject not found."));

            // Remove associated ClassSubjects mappings cleanly
            var classSubjects = await _context.ClassSubjects.Where(cs => cs.SubjectId == id).ToListAsync();
            if (classSubjects.Any())
            {
                _context.ClassSubjects.RemoveRange(classSubjects);
            }

            subject.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Subject deleted successfully."));
        }
    }
}
