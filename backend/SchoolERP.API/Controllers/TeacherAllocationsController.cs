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
    [Route("api/teacher-allocations")]
    [Authorize]
    public class TeacherAllocationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public TeacherAllocationsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("class-teachers")]
        [HasPermission("TeacherAllocation", "View")]
        public async Task<ActionResult<ApiResponse<List<ClassTeacherGridRowDto>>>> GetClassTeachers([FromQuery] long? classId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // Get sections
            var sectionsQuery = _context.Sections
                .Include(s => s.Class)
                .Where(s => s.Class!.BranchId == branchId);

            if (classId.HasValue)
            {
                sectionsQuery = sectionsQuery.Where(s => s.ClassId == classId.Value);
            }

            var sections = await sectionsQuery
                .OrderBy(s => s.Class!.DisplayOrder)
                .ThenBy(s => s.Name)
                .ToListAsync();

            // Get existing class teacher allocations
            var allocations = await _context.TeacherAllocations
                .Include(a => a.Employee)
                .Where(a => a.BranchId == branchId && a.AcademicYearId == yearId && a.IsClassTeacher)
                .ToListAsync();

            var rows = sections.Select(s =>
            {
                var alloc = allocations.FirstOrDefault(a => a.ClassId == s.ClassId && a.SectionId == s.Id);
                return new ClassTeacherGridRowDto
                {
                    ClassId = s.ClassId,
                    ClassName = s.Class?.Name ?? "",
                    SectionId = s.Id,
                    SectionName = s.Name,
                    Capacity = s.Capacity,
                    AllocationId = alloc?.Id,
                    EmployeeId = alloc?.EmployeeId,
                    TeacherName = alloc?.Employee != null ? alloc.Employee.FullName : null,
                    TeacherCode = alloc?.Employee != null ? alloc.Employee.EmployeeCode : null
                };
            }).ToList();

            return Ok(ApiResponse<List<ClassTeacherGridRowDto>>.Ok(rows));
        }

        [HttpPost("class-teachers")]
        [HasPermission("TeacherAllocation", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveClassTeacher([FromBody] SaveClassTeacherDto request)
        {
            // BR-4.2: One section has only one class teacher per academic year.
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var existing = await _context.TeacherAllocations.FirstOrDefaultAsync(a =>
                a.BranchId == branchId &&
                a.AcademicYearId == yearId &&
                a.ClassId == request.ClassId &&
                a.SectionId == request.SectionId &&
                a.IsClassTeacher);

            if (!request.EmployeeId.HasValue || request.EmployeeId.Value == 0)
            {
                // Remove existing allocation
                if (existing != null)
                {
                    _context.TeacherAllocations.Remove(existing);
                    await _context.SaveChangesAsync();
                }
                return Ok(ApiResponse.Ok("Class teacher unassigned."));
            }

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == request.EmployeeId.Value && e.BranchId == branchId);
            if (employee == null) return NotFound(ApiResponse.Fail("Teacher not found."));

            if (existing != null)
            {
                existing.EmployeeId = request.EmployeeId.Value;
            }
            else
            {
                _context.TeacherAllocations.Add(new TeacherAllocation
                {
                    BranchId = branchId,
                    AcademicYearId = yearId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId,
                    EmployeeId = request.EmployeeId.Value,
                    IsClassTeacher = true,
                    SubjectId = null,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok($"Class teacher assigned successfully."));
        }

        [HttpGet("subject-teachers")]
        [HasPermission("TeacherAllocation", "View")]
        public async Task<ActionResult<ApiResponse<List<SubjectTeacherGridRowDto>>>> GetSubjectTeachers(
            [FromQuery] long? classId,
            [FromQuery] long? sectionId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // Get Class-Subject mappings for current session
            var classSubjectsQuery = _context.ClassSubjects
                .Include(cs => cs.Class)
                    .ThenInclude(c => c!.Sections)
                .Include(cs => cs.Subject)
                .Where(cs => cs.Class!.BranchId == branchId && cs.AcademicYearId == yearId);

            if (classId.HasValue)
            {
                classSubjectsQuery = classSubjectsQuery.Where(cs => cs.ClassId == classId.Value);
            }

            var classSubjects = await classSubjectsQuery
                .OrderBy(cs => cs.Class!.DisplayOrder)
                .ThenBy(cs => cs.Subject!.Name)
                .ToListAsync();

            // Get existing subject teacher allocations
            var allocations = await _context.TeacherAllocations
                .Include(a => a.Employee)
                .Where(a => a.BranchId == branchId && a.AcademicYearId == yearId && !a.IsClassTeacher)
                .ToListAsync();

            var result = new List<SubjectTeacherGridRowDto>();

            foreach (var cs in classSubjects)
            {
                var sections = cs.Class?.Sections?.OrderBy(s => s.Name).ToList() ?? new List<Section>();
                if (sectionId.HasValue)
                {
                    sections = sections.Where(s => s.Id == sectionId.Value).ToList();
                }

                foreach (var sec in sections)
                {
                    var alloc = allocations.FirstOrDefault(a => a.ClassId == cs.ClassId && a.SectionId == sec.Id && a.SubjectId == cs.SubjectId);
                    result.Add(new SubjectTeacherGridRowDto
                    {
                        ClassId = cs.ClassId,
                        ClassName = cs.Class?.Name ?? "",
                        SectionId = sec.Id,
                        SectionName = sec.Name,
                        SubjectId = cs.SubjectId,
                        SubjectName = cs.Subject?.Name ?? "",
                        SubjectCode = cs.Subject?.Code ?? "",
                        SubjectType = cs.Subject?.Type ?? SubjectType.Scholastic,
                        AllocationId = alloc?.Id,
                        EmployeeId = alloc?.EmployeeId,
                        TeacherName = alloc?.Employee != null ? alloc.Employee.FullName : null,
                        TeacherCode = alloc?.Employee != null ? alloc.Employee.EmployeeCode : null
                    });
                }
            }

            return Ok(ApiResponse<List<SubjectTeacherGridRowDto>>.Ok(result));
        }

        [HttpPost("subject-teachers")]
        [HasPermission("TeacherAllocation", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveSubjectTeacher([FromBody] SaveSubjectTeacherDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var existing = await _context.TeacherAllocations.FirstOrDefaultAsync(a =>
                a.BranchId == branchId &&
                a.AcademicYearId == yearId &&
                a.ClassId == request.ClassId &&
                a.SectionId == request.SectionId &&
                a.SubjectId == request.SubjectId &&
                !a.IsClassTeacher);

            if (!request.EmployeeId.HasValue || request.EmployeeId.Value == 0)
            {
                if (existing != null)
                {
                    _context.TeacherAllocations.Remove(existing);
                    await _context.SaveChangesAsync();
                }
                return Ok(ApiResponse.Ok("Subject teacher unassigned."));
            }

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == request.EmployeeId.Value && e.BranchId == branchId);
            if (employee == null) return NotFound(ApiResponse.Fail("Teacher not found."));

            if (existing != null)
            {
                existing.EmployeeId = request.EmployeeId.Value;
            }
            else
            {
                _context.TeacherAllocations.Add(new TeacherAllocation
                {
                    BranchId = branchId,
                    AcademicYearId = yearId,
                    ClassId = request.ClassId,
                    SectionId = request.SectionId,
                    SubjectId = request.SubjectId,
                    EmployeeId = request.EmployeeId.Value,
                    IsClassTeacher = false,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Subject teacher assigned successfully."));
        }

        [HttpGet("my-allocations")]
        public async Task<ActionResult<ApiResponse<List<TeacherAllocationSummaryDto>>>> GetMyAllocations()
        {
            // FR-4.4: Teacher login shows only allotted classes/subjects in attendance and marks entry
            var userId = _currentUserService.UserId;
            var yearId = _currentUserService.AcademicYearId;

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId);
            if (employee == null)
            {
                return Ok(ApiResponse<List<TeacherAllocationSummaryDto>>.Ok(new List<TeacherAllocationSummaryDto>()));
            }

            var allocations = await _context.TeacherAllocations
                .Include(a => a.Class)
                .Include(a => a.Section)
                .Include(a => a.Subject)
                .Where(a => a.EmployeeId == employee.Id && a.AcademicYearId == yearId)
                .Select(a => new TeacherAllocationSummaryDto
                {
                    Id = a.Id,
                    ClassId = a.ClassId,
                    ClassName = a.Class != null ? a.Class.Name : "",
                    SectionId = a.SectionId,
                    SectionName = a.Section != null ? a.Section.Name : "",
                    SubjectId = a.SubjectId,
                    SubjectName = a.Subject != null ? a.Subject.Name : null,
                    IsClassTeacher = a.IsClassTeacher
                })
                .ToListAsync();

            return Ok(ApiResponse<List<TeacherAllocationSummaryDto>>.Ok(allocations));
        }
    }
}
