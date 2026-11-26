using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class HomeworkController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public HomeworkController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private string GetUploadsFolderPath()
        {
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "homework");
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }
            return folder;
        }

        /// <summary>
        /// Get list of assigned homeworks with filters
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHomeworkList(
            [FromQuery] long? classId,
            [FromQuery] long? sectionId,
            [FromQuery] long? subjectId,
            [FromQuery] long? academicYearId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? status)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = (academicYearId.HasValue && academicYearId.Value > 0)
                ? academicYearId.Value
                : _currentUserService.AcademicYearId;

            var query = _context.Homeworks
                .Include(h => h.Class)
                .Include(h => h.Section)
                .Include(h => h.Subject)
                .Include(h => h.Teacher)
                .Include(h => h.Submissions)
                .Where(h => h.BranchId == branchId && h.AcademicYearId == yearId);

            if (classId.HasValue && classId.Value > 0)
            {
                query = query.Where(h => h.ClassId == classId.Value);
            }

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                query = query.Where(h => h.SectionId == sectionId.Value || h.SectionId == null);
            }

            if (subjectId.HasValue && subjectId.Value > 0)
            {
                query = query.Where(h => h.SubjectId == subjectId.Value);
            }

            if (!string.IsNullOrEmpty(status) && status != "All")
            {
                query = query.Where(h => h.Status == status);
            }

            if (startDate.HasValue)
            {
                var sDate = startDate.Value.Date;
                query = query.Where(h => h.HomeworkDate >= sDate || h.DueDate >= sDate);
            }

            if (endDate.HasValue)
            {
                var eDate = endDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(h => h.HomeworkDate <= eDate || h.DueDate <= eDate);
            }

            var list = await query
                .OrderByDescending(h => h.HomeworkDate)
                .ThenByDescending(h => h.Id)
                .Select(h => new
                {
                    h.Id,
                    h.BranchId,
                    h.AcademicYearId,
                    h.ClassId,
                    ClassName = h.Class != null ? h.Class.Name : "—",
                    h.SectionId,
                    SectionName = h.Section != null ? h.Section.Name : "All Sections",
                    h.SubjectId,
                    SubjectName = h.Subject != null ? h.Subject.Name : "General",
                    h.TeacherId,
                    TeacherName = h.Teacher != null
                        ? $"{h.Teacher.FirstName} {h.Teacher.LastName}".Trim()
                        : "Teacher",
                    h.Title,
                    h.Description,
                    h.Instructions,
                    HomeworkDate = h.HomeworkDate.ToString("yyyy-MM-dd"),
                    DueDate = h.DueDate.ToString("yyyy-MM-dd"),
                    h.AttachmentUrl,
                    h.AttachmentFileName,
                    h.AttachmentFileType,
                    h.AttachmentFileSize,
                    IsPdf = h.AttachmentFileType != null && h.AttachmentFileType.ToLower().Contains("pdf"),
                    IsImage = h.AttachmentFileType != null && (h.AttachmentFileType.ToLower().Contains("image") || h.AttachmentFileType.ToLower().Contains("jpg") || h.AttachmentFileType.ToLower().Contains("jpeg") || h.AttachmentFileType.ToLower().Contains("png")),
                    h.Status,
                    h.CreatedOn,
                    SubmissionsCount = h.Submissions.Count(s => s.IsActive)
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = list,
                total = list.Count
            });
        }

        /// <summary>
        /// Get single homework detail
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetHomeworkById(long id)
        {
            var branchId = _currentUserService.BranchId;
            var h = await _context.Homeworks
                .Include(x => x.Class)
                .Include(x => x.Section)
                .Include(x => x.Subject)
                .Include(x => x.Teacher)
                .Include(x => x.Submissions)
                    .ThenInclude(s => s.Student)
                .FirstOrDefaultAsync(x => x.Id == id && x.BranchId == branchId);

            if (h == null)
            {
                return NotFound(new { success = false, message = "Homework assignment not found." });
            }

            var result = new
            {
                h.Id,
                h.BranchId,
                h.AcademicYearId,
                h.ClassId,
                ClassName = h.Class != null ? h.Class.Name : "—",
                h.SectionId,
                SectionName = h.Section != null ? h.Section.Name : "All Sections",
                h.SubjectId,
                SubjectName = h.Subject != null ? h.Subject.Name : "General",
                h.TeacherId,
                TeacherName = h.Teacher != null
                    ? $"{h.Teacher.FirstName} {h.Teacher.LastName}".Trim()
                    : "Teacher",
                h.Title,
                h.Description,
                h.Instructions,
                HomeworkDate = h.HomeworkDate.ToString("yyyy-MM-dd"),
                DueDate = h.DueDate.ToString("yyyy-MM-dd"),
                h.AttachmentUrl,
                h.AttachmentFileName,
                h.AttachmentFileType,
                h.AttachmentFileSize,
                IsPdf = h.AttachmentFileType != null && h.AttachmentFileType.ToLower().Contains("pdf"),
                IsImage = h.AttachmentFileType != null && (h.AttachmentFileType.ToLower().Contains("image") || h.AttachmentFileType.ToLower().Contains("jpg") || h.AttachmentFileType.ToLower().Contains("jpeg") || h.AttachmentFileType.ToLower().Contains("png")),
                h.Status,
                h.CreatedOn,
                Submissions = h.Submissions.Where(s => s.IsActive).Select(s => new
                {
                    s.Id,
                    s.StudentId,
                    StudentName = s.Student != null ? s.Student.FullName : "—",
                    AdmissionNo = s.Student != null ? s.Student.AdmissionNo : "—",
                    SubmissionDate = s.SubmissionDate.ToString("yyyy-MM-dd HH:mm"),
                    s.SubmissionText,
                    s.AttachmentUrl,
                    s.AttachmentFileName,
                    s.Status,
                    s.MarksObtained,
                    s.TeacherFeedback
                }).ToList()
            };

            return Ok(new { success = true, data = result });
        }

        public class CreateHomeworkDto
        {
            public long ClassId { get; set; }
            public long? SectionId { get; set; }
            public long? SubjectId { get; set; }
            public long? TeacherId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public DateTime? HomeworkDate { get; set; }
            public DateTime DueDate { get; set; }
            public string? Instructions { get; set; }
            public string? AttachmentBase64 { get; set; }
            public string? AttachmentFileName { get; set; }
            public string? AttachmentFileType { get; set; }
            public IFormFile? File { get; set; }
        }

        /// <summary>
        /// Create new homework assignment (supports Form-Data with file or JSON)
        /// </summary>
        [HttpPost]
        [Consumes("multipart/form-data", "application/json")]
        public async Task<IActionResult> CreateHomework([FromForm] CreateHomeworkDto dto)
        {
            if (dto.ClassId <= 0)
            {
                return BadRequest(new { success = false, message = "Please select a valid Class." });
            }

            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(new { success = false, message = "Homework title is required." });
            }

            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // Resolve Teacher
            long? teacherId = dto.TeacherId;
            if (!teacherId.HasValue || teacherId.Value <= 0)
            {
                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == _currentUserService.UserId && e.BranchId == branchId);
                if (employee != null)
                {
                    teacherId = employee.Id;
                }
            }

            string? attachmentUrl = null;
            string? attachmentFileName = null;
            string? attachmentFileType = null;
            long? attachmentFileSize = null;

            // 1. Process uploaded file via IFormFile if present
            if (dto.File != null && dto.File.Length > 0)
            {
                var originalName = Path.GetFileName(dto.File.FileName);
                var extension = Path.GetExtension(originalName).ToLowerInvariant();
                var safeName = $"hw_{Guid.NewGuid():N}{extension}";
                var uploadsFolder = GetUploadsFolderPath();
                var filePath = Path.Combine(uploadsFolder, safeName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.File.CopyToAsync(stream);
                }

                attachmentUrl = $"/api/homework/file/{safeName}";
                attachmentFileName = originalName;
                attachmentFileType = dto.File.ContentType ?? (extension == ".pdf" ? "application/pdf" : "image/jpeg");
                attachmentFileSize = dto.File.Length;
            }
            // 2. Process base64 file if uploaded as base64 string
            else if (!string.IsNullOrEmpty(dto.AttachmentBase64))
            {
                try
                {
                    var base64Data = dto.AttachmentBase64;
                    string extension = ".jpg";
                    string contentType = dto.AttachmentFileType ?? "image/jpeg";

                    if (base64Data.Contains(","))
                    {
                        var parts = base64Data.Split(',');
                        var header = parts[0];
                        base64Data = parts[1];

                        if (header.Contains("pdf"))
                        {
                            extension = ".pdf";
                            contentType = "application/pdf";
                        }
                        else if (header.Contains("png"))
                        {
                            extension = ".png";
                            contentType = "image/png";
                        }
                    }

                    var bytes = Convert.FromBase64String(base64Data);
                    var safeName = $"hw_{Guid.NewGuid():N}{extension}";
                    var uploadsFolder = GetUploadsFolderPath();
                    var filePath = Path.Combine(uploadsFolder, safeName);

                    await System.IO.File.WriteAllBytesAsync(filePath, bytes);

                    attachmentUrl = $"/api/homework/file/{safeName}";
                    attachmentFileName = !string.IsNullOrEmpty(dto.AttachmentFileName) ? dto.AttachmentFileName : $"attachment{extension}";
                    attachmentFileType = contentType;
                    attachmentFileSize = bytes.Length;
                }
                catch (Exception ex)
                {
                    // Ignore base64 error or log
                    Console.WriteLine($"Base64 conversion error: {ex.Message}");
                }
            }

            var homework = new Homework
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                ClassId = dto.ClassId,
                SectionId = (dto.SectionId.HasValue && dto.SectionId.Value > 0) ? dto.SectionId.Value : null,
                SubjectId = (dto.SubjectId.HasValue && dto.SubjectId.Value > 0) ? dto.SubjectId.Value : null,
                TeacherId = teacherId,
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim(),
                HomeworkDate = dto.HomeworkDate?.Date ?? DateTime.UtcNow.Date,
                DueDate = dto.DueDate > DateTime.MinValue ? dto.DueDate.Date : DateTime.UtcNow.Date.AddDays(1),
                Instructions = dto.Instructions?.Trim(),
                AttachmentUrl = attachmentUrl,
                AttachmentFileName = attachmentFileName,
                AttachmentFileType = attachmentFileType,
                AttachmentFileSize = attachmentFileSize,
                Status = "Active",
                CreatedBy = _currentUserService.UserId ?? 0,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.Homeworks.Add(homework);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Homework assigned successfully!",
                data = new { homework.Id, homework.Title }
            });
        }

        public class UpdateHomeworkDto
        {
            public long ClassId { get; set; }
            public long? SectionId { get; set; }
            public long? SubjectId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public DateTime DueDate { get; set; }
            public string? Instructions { get; set; }
            public string? Status { get; set; }
            public bool RemoveAttachment { get; set; }
            public IFormFile? File { get; set; }
            public string? AttachmentBase64 { get; set; }
            public string? AttachmentFileName { get; set; }
            public string? AttachmentFileType { get; set; }
        }

        /// <summary>
        /// Update an existing homework assignment
        /// </summary>
        [HttpPut("{id}")]
        [Consumes("multipart/form-data", "application/json")]
        public async Task<IActionResult> UpdateHomework(long id, [FromForm] UpdateHomeworkDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var homework = await _context.Homeworks.FirstOrDefaultAsync(h => h.Id == id && h.BranchId == branchId);

            if (homework == null)
            {
                return NotFound(new { success = false, message = "Homework assignment not found." });
            }

            homework.ClassId = dto.ClassId > 0 ? dto.ClassId : homework.ClassId;
            homework.SectionId = (dto.SectionId.HasValue && dto.SectionId.Value > 0) ? dto.SectionId.Value : null;
            homework.SubjectId = (dto.SubjectId.HasValue && dto.SubjectId.Value > 0) ? dto.SubjectId.Value : null;

            if (!string.IsNullOrWhiteSpace(dto.Title))
            {
                homework.Title = dto.Title.Trim();
            }

            homework.Description = dto.Description?.Trim();
            if (dto.DueDate > DateTime.MinValue)
            {
                homework.DueDate = dto.DueDate.Date;
            }
            homework.Instructions = dto.Instructions?.Trim();

            if (!string.IsNullOrEmpty(dto.Status))
            {
                homework.Status = dto.Status;
            }

            // Attachment removal / replacement
            if (dto.RemoveAttachment)
            {
                homework.AttachmentUrl = null;
                homework.AttachmentFileName = null;
                homework.AttachmentFileType = null;
                homework.AttachmentFileSize = null;
            }

            if (dto.File != null && dto.File.Length > 0)
            {
                var originalName = Path.GetFileName(dto.File.FileName);
                var extension = Path.GetExtension(originalName).ToLowerInvariant();
                var safeName = $"hw_{Guid.NewGuid():N}{extension}";
                var uploadsFolder = GetUploadsFolderPath();
                var filePath = Path.Combine(uploadsFolder, safeName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.File.CopyToAsync(stream);
                }

                homework.AttachmentUrl = $"/api/homework/file/{safeName}";
                homework.AttachmentFileName = originalName;
                homework.AttachmentFileType = dto.File.ContentType ?? (extension == ".pdf" ? "application/pdf" : "image/jpeg");
                homework.AttachmentFileSize = dto.File.Length;
            }
            else if (!string.IsNullOrEmpty(dto.AttachmentBase64))
            {
                try
                {
                    var base64Data = dto.AttachmentBase64;
                    string extension = ".jpg";
                    string contentType = dto.AttachmentFileType ?? "image/jpeg";

                    if (base64Data.Contains(","))
                    {
                        var parts = base64Data.Split(',');
                        var header = parts[0];
                        base64Data = parts[1];

                        if (header.Contains("pdf"))
                        {
                            extension = ".pdf";
                            contentType = "application/pdf";
                        }
                        else if (header.Contains("png"))
                        {
                            extension = ".png";
                            contentType = "image/png";
                        }
                    }

                    var bytes = Convert.FromBase64String(base64Data);
                    var safeName = $"hw_{Guid.NewGuid():N}{extension}";
                    var uploadsFolder = GetUploadsFolderPath();
                    var filePath = Path.Combine(uploadsFolder, safeName);

                    await System.IO.File.WriteAllBytesAsync(filePath, bytes);

                    homework.AttachmentUrl = $"/api/homework/file/{safeName}";
                    homework.AttachmentFileName = !string.IsNullOrEmpty(dto.AttachmentFileName) ? dto.AttachmentFileName : $"attachment{extension}";
                    homework.AttachmentFileType = contentType;
                    homework.AttachmentFileSize = bytes.Length;
                }
                catch {}
            }

            homework.ModifiedBy = _currentUserService.UserId;
            homework.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Homework updated successfully!" });
        }

        /// <summary>
        /// Delete homework assignment
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteHomework(long id)
        {
            var branchId = _currentUserService.BranchId;
            var homework = await _context.Homeworks.FirstOrDefaultAsync(h => h.Id == id && h.BranchId == branchId);

            if (homework == null)
            {
                return NotFound(new { success = false, message = "Homework assignment not found." });
            }

            homework.IsActive = false;
            homework.ModifiedBy = _currentUserService.UserId;
            homework.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Homework assignment deleted." });
        }

        /// <summary>
        /// Direct stream / download endpoint for uploaded homework attachments (PDF or Images)
        /// </summary>
        [HttpGet("file/{fileName}")]
        [AllowAnonymous]
        public IActionResult GetAttachmentFile(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..") || Path.GetInvalidFileNameChars().Any(fileName.Contains))
            {
                return BadRequest("Invalid file name.");
            }

            var uploadsFolder = GetUploadsFolderPath();
            var filePath = Path.Combine(uploadsFolder, fileName);

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound("File not found on server.");
            }

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            string mimeType = ext switch
            {
                ".pdf" => "application/pdf",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };

            // Stream file with inline disposition so browser and preview modals can render it directly
            Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
            return PhysicalFile(filePath, mimeType, enableRangeProcessing: true);
        }

        /// <summary>
        /// Helper endpoint to fetch Classes, Sections and Subjects for homework assignment filters/forms
        /// </summary>
        [HttpGet("meta")]
        public async Task<IActionResult> GetHomeworkMeta()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var classes = await _context.Classes
                .Where(c => c.BranchId == branchId && c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    Sections = c.Sections.Where(s => s.IsActive).OrderBy(s => s.Name).Select(s => new
                    {
                        s.Id,
                        s.Name
                    }).ToList()
                })
                .ToListAsync();

            var subjects = await _context.Subjects
                .Where(s => s.BranchId == branchId && s.IsActive)
                .OrderBy(s => s.Name)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Code
                })
                .ToListAsync();

            var teachers = await _context.Employees
                .Where(e => e.BranchId == branchId && e.IsActive && e.Status == EmployeeStatus.Active)
                .OrderBy(e => e.FirstName)
                .Select(e => new
                {
                    e.Id,
                    Name = $"{e.FirstName} {e.LastName}".Trim(),
                    e.EmployeeCode
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    classes,
                    subjects,
                    teachers
                }
            });
        }
    }
}
