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
    [Authorize]
    public class ClassSubjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ClassSubjectsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("ClassSubjects", "View")]
        public async Task<ActionResult<ApiResponse<List<ClassSubjectDto>>>> GetClassSubjects([FromQuery] long? classId, [FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = academicYearId ?? _currentUserService.AcademicYearId;

            var query = _context.ClassSubjects
                .Include(cs => cs.Class)
                .Include(cs => cs.Subject)
                .Where(cs => cs.BranchId == branchId && cs.AcademicYearId == yearId);

            if (classId.HasValue)
            {
                query = query.Where(cs => cs.ClassId == classId.Value);
            }

            var mappings = await query.Select(cs => new ClassSubjectDto
            {
                Id = cs.Id,
                ClassId = cs.ClassId,
                ClassName = cs.Class != null ? cs.Class.Name : "",
                SubjectId = cs.SubjectId,
                SubjectName = cs.Subject != null ? cs.Subject.Name : "",
                SubjectCode = cs.Subject != null ? cs.Subject.Code : "",
                SubjectType = cs.Subject != null ? cs.Subject.Type : Domain.Enums.SubjectType.Scholastic,
                IsOptional = cs.IsOptional
            }).ToListAsync();

            return Ok(ApiResponse<List<ClassSubjectDto>>.Ok(mappings));
        }

        public class SubjectMappingItem
        {
            public long SubjectId { get; set; }
            public bool IsOptional { get; set; }
        }

        public class SaveClassSubjectMappingRequest
        {
            public long ClassId { get; set; }
            public long? AcademicYearId { get; set; }
            public List<SubjectMappingItem> Subjects { get; set; } = new List<SubjectMappingItem>();
        }

        [HttpPost("save-mapping")]
        [HasPermission("ClassSubjects", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveMapping([FromBody] SaveClassSubjectMappingRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = request.AcademicYearId ?? _currentUserService.AcademicYearId;

            var existing = await _context.ClassSubjects
                .Where(cs => cs.BranchId == branchId && cs.AcademicYearId == yearId && cs.ClassId == request.ClassId)
                .ToListAsync();

            _context.ClassSubjects.RemoveRange(existing);

            foreach (var item in request.Subjects)
            {
                _context.ClassSubjects.Add(new ClassSubject
                {
                    BranchId = branchId,
                    AcademicYearId = yearId,
                    ClassId = request.ClassId,
                    SubjectId = item.SubjectId,
                    IsOptional = item.IsOptional,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Class-Subject mapping saved successfully."));
        }

        public class CopyMappingRequest
        {
            public long FromAcademicYearId { get; set; }
            public long ToAcademicYearId { get; set; }
        }

        [HttpPost("copy-from-previous-year")]
        [HasPermission("ClassSubjects", "Add")]
        public async Task<ActionResult<ApiResponse>> CopyFromPreviousYear([FromBody] CopyMappingRequest request)
        {
            // FR-2.7: Masters can be copied from previous academic year (class-subject mapping)
            var branchId = _currentUserService.BranchId;

            var sourceMappings = await _context.ClassSubjects
                .Where(cs => cs.BranchId == branchId && cs.AcademicYearId == request.FromAcademicYearId)
                .AsNoTracking()
                .ToListAsync();

            if (!sourceMappings.Any())
            {
                return BadRequest(ApiResponse.Fail("No mappings found in the source academic year."));
            }

            var targetExisting = await _context.ClassSubjects
                .Where(cs => cs.BranchId == branchId && cs.AcademicYearId == request.ToAcademicYearId)
                .ToListAsync();

            _context.ClassSubjects.RemoveRange(targetExisting);

            foreach (var m in sourceMappings)
            {
                _context.ClassSubjects.Add(new ClassSubject
                {
                    BranchId = branchId,
                    AcademicYearId = request.ToAcademicYearId,
                    ClassId = m.ClassId,
                    SubjectId = m.SubjectId,
                    IsOptional = m.IsOptional,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok($"Copied {sourceMappings.Count} subject mappings to the target session."));
        }
    }
}
