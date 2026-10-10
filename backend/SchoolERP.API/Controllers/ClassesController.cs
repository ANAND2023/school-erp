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
    public class ClassesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ClassesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<ClassDto>>>> GetClasses()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;
            var isStaff = _currentUserService.UserType == SchoolERP.Domain.Enums.UserType.Teacher;
            
            List<long> allowedClassIds = null;
            List<long> allowedSectionIds = null;

            if (isStaff)
            {
                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == _currentUserService.UserId);
                if (employee != null)
                {
                    var allocations = await _context.TeacherAllocations
                        .Where(t => t.BranchId == branchId && t.AcademicYearId == yearId && t.EmployeeId == employee.Id)
                        .ToListAsync();
                    
                    allowedClassIds = allocations.Select(a => a.ClassId).Distinct().ToList();
                    allowedSectionIds = allocations.Select(a => a.SectionId).Distinct().ToList();
                }
                else
                {
                    allowedClassIds = new List<long>();
                    allowedSectionIds = new List<long>();
                }
            }

            var classes = await _context.Classes
                .Where(c => c.BranchId == branchId)
                .Include(c => c.Sections)
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.Name)
                .Select(c => new ClassDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    DisplayOrder = c.DisplayOrder,
                    Sections = c.Sections.Select(s => new SectionDto
                    {
                        Id = s.Id,
                        ClassId = s.ClassId,
                        Name = s.Name,
                        Capacity = s.Capacity
                    }).ToList()
                })
                .ToListAsync();

            if (isStaff && allowedClassIds != null && allowedSectionIds != null)
            {
                // Filter classes and sections in-memory since DTO mapping is done
                classes = classes.Where(c => allowedClassIds.Contains(c.Id)).ToList();
                foreach (var c in classes)
                {
                    c.Sections = c.Sections.Where(s => allowedSectionIds.Contains(s.Id)).ToList();
                }
                // Remove classes that ended up with no sections after filtering
                classes = classes.Where(c => c.Sections.Any()).ToList();
            }

            return Ok(ApiResponse<List<ClassDto>>.Ok(classes));
        }

        public class CreateClassRequest
        {
            public string Name { get; set; } = string.Empty;
            public int DisplayOrder { get; set; }
        }

        [HttpPost]
        [HasPermission("Classes", "Add")]
        public async Task<ActionResult<ApiResponse<ClassDto>>> CreateClass([FromBody] CreateClassRequest request)
        {
            var branchId = _currentUserService.BranchId;

            // BR-2.3: Names are unique within branch
            var exists = await _context.Classes.AnyAsync(c => c.BranchId == branchId && c.Name.ToLower() == request.Name.Trim().ToLower());
            if (exists)
            {
                return BadRequest(ApiResponse<ClassDto>.Fail($"Class '{request.Name}' already exists."));
            }

            var cls = new ClassMaster
            {
                BranchId = branchId,
                Name = request.Name.Trim(),
                DisplayOrder = request.DisplayOrder,
                IsActive = true
            };

            _context.Classes.Add(cls);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<ClassDto>.Ok(new ClassDto
            {
                Id = cls.Id,
                Name = cls.Name,
                DisplayOrder = cls.DisplayOrder
            }, "Class created successfully."));
        }

        [HttpPut("{id}")]
        [HasPermission("Classes", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateClass(long id, [FromBody] CreateClassRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);
            if (cls == null) return NotFound(ApiResponse.Fail("Class not found."));

            cls.Name = request.Name.Trim();
            cls.DisplayOrder = request.DisplayOrder;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Class updated successfully."));
        }

        [HttpDelete("{id}")]
        [HasPermission("Classes", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteClass(long id)
        {
            var branchId = _currentUserService.BranchId;
            var cls = await _context.Classes
                .Include(c => c.Sections)
                .FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);
            if (cls == null) return NotFound(ApiResponse.Fail("Class not found."));

            // BR-2.2: A master in use (e.g. class with sections/students) cannot be deactivated
            if (cls.Sections.Any(s => s.IsActive))
            {
                return BadRequest(ApiResponse.Fail("Cannot delete class with existing active sections. Remove sections first."));
            }

            cls.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Class deleted successfully."));
        }

        public class CreateSectionRequest
        {
            public string Name { get; set; } = string.Empty;
            public int Capacity { get; set; } = 40;
        }

        [HttpPost("{classId}/sections")]
        [HasPermission("Classes", "Add")]
        public async Task<ActionResult<ApiResponse<SectionDto>>> AddSection(long classId, [FromBody] CreateSectionRequest request)
        {
            var branchId = _currentUserService.BranchId;
            var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId && c.BranchId == branchId);
            if (cls == null) return NotFound(ApiResponse<SectionDto>.Fail("Class not found."));

            // BR-2.3: Section name unique within class
            var exists = await _context.Sections.AnyAsync(s => s.ClassId == classId && s.Name.ToLower() == request.Name.Trim().ToLower());
            if (exists)
            {
                return BadRequest(ApiResponse<SectionDto>.Fail($"Section '{request.Name}' already exists in this class."));
            }

            var section = new Section
            {
                ClassId = classId,
                BranchId = branchId,
                Name = request.Name.Trim(),
                Capacity = request.Capacity > 0 ? request.Capacity : 40,
                IsActive = true
            };

            _context.Sections.Add(section);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<SectionDto>.Ok(new SectionDto
            {
                Id = section.Id,
                ClassId = section.ClassId,
                Name = section.Name,
                Capacity = section.Capacity
            }, "Section added successfully."));
        }

        [HttpPut("sections/{sectionId}")]
        [HasPermission("Classes", "Edit")]
        public async Task<ActionResult<ApiResponse>> UpdateSection(long sectionId, [FromBody] CreateSectionRequest request)
        {
            var section = await _context.Sections.FirstOrDefaultAsync(s => s.Id == sectionId);
            if (section == null) return NotFound(ApiResponse.Fail("Section not found."));

            section.Name = request.Name.Trim();
            section.Capacity = request.Capacity;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Section updated successfully."));
        }

        [HttpDelete("sections/{sectionId}")]
        [HasPermission("Classes", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteSection(long sectionId)
        {
            var section = await _context.Sections.FirstOrDefaultAsync(s => s.Id == sectionId);
            if (section == null) return NotFound(ApiResponse.Fail("Section not found."));

            section.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Section deleted successfully."));
        }
    }
}
