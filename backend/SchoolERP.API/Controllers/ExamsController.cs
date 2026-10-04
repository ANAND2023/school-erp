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
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/exams")]
    [Authorize]
    public class ExamsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ExamsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // =========================================================================
        // 1. EXAM TERMS (FR-7.1)
        // =========================================================================
        [HttpGet("terms")]
        [HasPermission("ExamSchedules", "View")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetTerms([FromQuery] long? academicYearId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = academicYearId ?? _currentUserService.AcademicYearId;

            var terms = await _context.ExamTerms
                .Where(t => t.BranchId == branchId && (yearId == 0 || t.AcademicYearId == yearId))
                .OrderBy(t => t.Name)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.TermCode,
                    t.Weightage,
                    t.Description,
                    t.AcademicYearId,
                    ExamCount = t.Exams.Count
                })
                .ToListAsync();

            return Ok(ApiResponse<List<object>>.Ok(terms.Cast<object>().ToList()));
        }

        [HttpPost("terms")]
        [HasPermission("ExamSchedules", "Add")]
        public async Task<ActionResult<ApiResponse<object>>> CreateTerm([FromBody] CreateTermDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = dto.AcademicYearId > 0 ? dto.AcademicYearId : _currentUserService.AcademicYearId;

            var term = new ExamTerm
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                Name = dto.Name,
                TermCode = dto.TermCode,
                Weightage = dto.Weightage,
                Description = dto.Description,
                CreatedBy = _currentUserService.UserId ?? 1,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.ExamTerms.Add(term);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { term.Id, term.Name }, "Exam Term created successfully."));
        }

        [HttpDelete("terms/{id}")]
        [HasPermission("ExamSchedules", "Delete")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteTerm(long id)
        {
            var term = await _context.ExamTerms.Include(t => t.Exams).FirstOrDefaultAsync(t => t.Id == id);
            if (term == null) return NotFound(ApiResponse<bool>.Fail("Term not found."));

            if (term.Exams.Any())
            {
                return BadRequest(ApiResponse<bool>.Fail("Cannot delete term with existing exams."));
            }

            term.IsActive = false;
            term.ModifiedBy = _currentUserService.UserId ?? 1;
            term.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<bool>.Ok(true, "Term deleted successfully."));
        }

        // =========================================================================
        // 2. EXAM MASTER (FR-7.1)
        // =========================================================================
        [HttpGet]
        [HasPermission("ExamSchedules", "View")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetExams(
            [FromQuery] long? academicYearId,
            [FromQuery] long? classId,
            [FromQuery] long? termId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = academicYearId ?? _currentUserService.AcademicYearId;

            var query = _context.Exams
                .Include(e => e.Term)
                .Include(e => e.Class)
                .Include(e => e.Schedules)
                .Where(e => e.BranchId == branchId);

            if (yearId > 0) query = query.Where(e => e.AcademicYearId == yearId);
            if (classId.HasValue && classId > 0) query = query.Where(e => e.ClassId == classId.Value);
            if (termId.HasValue && termId > 0) query = query.Where(e => e.TermId == termId.Value);

            var exams = await query
                .OrderByDescending(e => e.Id)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Description,
                    e.TermId,
                    TermName = e.Term != null ? e.Term.Name : "",
                    e.ClassId,
                    ClassName = e.Class != null ? e.Class.Name : "",
                    e.IsPublished,
                    e.IsLocked,
                    ScheduleCount = e.Schedules.Count
                })
                .ToListAsync();

            return Ok(ApiResponse<List<object>>.Ok(exams.Cast<object>().ToList()));
        }

        [HttpPost]
        [HasPermission("ExamSchedules", "Add")]
        public async Task<ActionResult<ApiResponse<object>>> CreateExam([FromBody] CreateExamDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = dto.AcademicYearId > 0 ? dto.AcademicYearId : _currentUserService.AcademicYearId;

            var exam = new Exam
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                TermId = dto.TermId,
                ClassId = dto.ClassId,
                Name = dto.Name,
                Description = dto.Description,
                CreatedBy = _currentUserService.UserId ?? 1,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.Exams.Add(exam);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { exam.Id, exam.Name }, "Exam created successfully."));
        }

        [HttpPost("{id}/lock")]
        [HasPermission("MarksEntry", "Edit")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleLockExam(long id)
        {
            var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == id);
            if (exam == null) return NotFound(ApiResponse<bool>.Fail("Exam not found."));

            exam.IsLocked = !exam.IsLocked;
            exam.ModifiedBy = _currentUserService.UserId ?? 1;
            exam.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var status = exam.IsLocked ? "locked" : "unlocked";
            return Ok(ApiResponse<bool>.Ok(exam.IsLocked, $"Exam successfully {status}."));
        }

        [HttpPost("{id}/publish")]
        [HasPermission("ReportCards", "Edit")]
        public async Task<ActionResult<ApiResponse<bool>>> TogglePublishExam(long id)
        {
            var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == id);
            if (exam == null) return NotFound(ApiResponse<bool>.Fail("Exam not found."));

            exam.IsPublished = !exam.IsPublished;
            exam.ModifiedBy = _currentUserService.UserId ?? 1;
            exam.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var status = exam.IsPublished ? "published" : "unpublished";
            return Ok(ApiResponse<bool>.Ok(exam.IsPublished, $"Results successfully {status}."));
        }

        // =========================================================================
        // 3. EXAM SCHEDULES (FR-7.1)
        // =========================================================================
        [HttpGet("{examId}/schedules")]
        [HasPermission("ExamSchedules", "View")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetSchedules(long examId)
        {
            var schedules = await _context.ExamSchedules
                .Include(s => s.Subject)
                .Where(s => s.ExamId == examId)
                .OrderBy(s => s.ExamDate)
                .ThenBy(s => s.StartTime)
                .Select(s => new
                {
                    s.Id,
                    s.ExamId,
                    s.SubjectId,
                    SubjectName = s.Subject != null ? s.Subject.Name : "",
                    SubjectCode = s.Subject != null ? s.Subject.Code : "",
                    ExamDate = s.ExamDate.ToString("yyyy-MM-dd"),
                    StartTime = s.StartTime.HasValue ? s.StartTime.Value.ToString(@"hh\:mm") : "",
                    EndTime = s.EndTime.HasValue ? s.EndTime.Value.ToString(@"hh\:mm") : "",
                    s.MaxMarks,
                    s.PassMarks,
                    s.RoomNo,
                    MarksEnteredCount = s.MarksEntries.Count
                })
                .ToListAsync();

            return Ok(ApiResponse<List<object>>.Ok(schedules.Cast<object>().ToList()));
        }

        [HttpPost("{examId}/schedules")]
        [HasPermission("ExamSchedules", "Add")]
        public async Task<ActionResult<ApiResponse<object>>> AddSchedule(long examId, [FromBody] ScheduleDto dto)
        {
            var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == examId);
            if (exam == null) return NotFound(ApiResponse<object>.Fail("Exam not found."));

            var existing = await _context.ExamSchedules
                .FirstOrDefaultAsync(s => s.ExamId == examId && s.SubjectId == dto.SubjectId);

            if (existing != null)
            {
                existing.ExamDate = DateTime.Parse(dto.ExamDate);
                if (!string.IsNullOrEmpty(dto.StartTime)) existing.StartTime = TimeSpan.Parse(dto.StartTime);
                if (!string.IsNullOrEmpty(dto.EndTime)) existing.EndTime = TimeSpan.Parse(dto.EndTime);
                existing.MaxMarks = dto.MaxMarks;
                existing.PassMarks = dto.PassMarks;
                existing.RoomNo = dto.RoomNo;
                existing.ModifiedBy = _currentUserService.UserId ?? 1;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                var schedule = new ExamSchedule
                {
                    ExamId = examId,
                    SubjectId = dto.SubjectId,
                    ExamDate = DateTime.Parse(dto.ExamDate),
                    StartTime = !string.IsNullOrEmpty(dto.StartTime) ? TimeSpan.Parse(dto.StartTime) : null,
                    EndTime = !string.IsNullOrEmpty(dto.EndTime) ? TimeSpan.Parse(dto.EndTime) : null,
                    MaxMarks = dto.MaxMarks,
                    PassMarks = dto.PassMarks,
                    RoomNo = dto.RoomNo,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                _context.ExamSchedules.Add(schedule);
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { success = true }, "Schedule saved successfully."));
        }

        [HttpDelete("schedules/{id}")]
        [HasPermission("ExamSchedules", "Delete")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteSchedule(long id)
        {
            var schedule = await _context.ExamSchedules.Include(s => s.MarksEntries).FirstOrDefaultAsync(s => s.Id == id);
            if (schedule == null) return NotFound(ApiResponse<bool>.Fail("Schedule not found."));

            if (schedule.MarksEntries.Any())
            {
                return BadRequest(ApiResponse<bool>.Fail("Cannot delete schedule with entered marks."));
            }

            schedule.IsActive = false;
            schedule.ModifiedBy = _currentUserService.UserId ?? 1;
            schedule.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<bool>.Ok(true, "Schedule deleted successfully."));
        }

        // =========================================================================
        // 4. GRADE SCALES (FR-7.4)
        // =========================================================================
        [HttpGet("grade-scales")]
        [HasPermission("ExamSchedules", "View")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetGradeScales()
        {
            var branchId = _currentUserService.BranchId;
            var scales = await _context.GradeScales
                .Where(g => g.BranchId == branchId || g.BranchId == 0)
                .OrderByDescending(g => g.MinPercentage)
                .Select(g => new
                {
                    g.Id,
                    g.Name,
                    g.MinPercentage,
                    g.MaxPercentage,
                    g.Grade,
                    g.GradePoint,
                    g.Remarks
                })
                .ToListAsync();

            if (!scales.Any())
            {
                // Seed CBSE 8-Point Grade Scale
                var defaultScales = new List<GradeScale>
                {
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 91, MaxPercentage = 100, Grade = "A1", GradePoint = 10.0m, Remarks = "Outstanding" },
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 81, MaxPercentage = 90.99m, Grade = "A2", GradePoint = 9.0m, Remarks = "Excellent" },
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 71, MaxPercentage = 80.99m, Grade = "B1", GradePoint = 8.0m, Remarks = "Very Good" },
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 61, MaxPercentage = 70.99m, Grade = "B2", GradePoint = 7.0m, Remarks = "Good" },
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 51, MaxPercentage = 60.99m, Grade = "C1", GradePoint = 6.0m, Remarks = "Fair" },
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 41, MaxPercentage = 50.99m, Grade = "C2", GradePoint = 5.0m, Remarks = "Average" },
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 33, MaxPercentage = 40.99m, Grade = "D", GradePoint = 4.0m, Remarks = "Pass" },
                    new GradeScale { BranchId = branchId, Name = "CBSE 8-Point", MinPercentage = 0, MaxPercentage = 32.99m, Grade = "E", GradePoint = 0.0m, Remarks = "Needs Improvement" },
                };
                _context.GradeScales.AddRange(defaultScales);
                await _context.SaveChangesAsync();

                return await GetGradeScales();
            }

            return Ok(ApiResponse<List<object>>.Ok(scales.Cast<object>().ToList()));
        }

        // =========================================================================
        // 5. MARKS ENTRY (FR-7.2, FR-7.3, BR-7.1)
        // =========================================================================
        [HttpGet("marks")]
        [HasPermission("MarksEntry", "View")]
        public async Task<ActionResult<ApiResponse<object>>> GetMarksForEntry(
            [FromQuery] long scheduleId,
            [FromQuery] long sectionId)
        {
            var schedule = await _context.ExamSchedules
                .Include(s => s.Exam)
                .Include(s => s.Subject)
                .FirstOrDefaultAsync(s => s.Id == scheduleId);

            if (schedule == null) return NotFound(ApiResponse<object>.Fail("Schedule not found."));

            var isLocked = schedule.Exam?.IsLocked ?? false;

            // Fetch enrolled students in section
            var enrollments = await _context.StudentEnrollments
                .Include(e => e.Student)
                .Where(e => e.SectionId == sectionId && e.Status == StudentStatus.Active)
                .OrderBy(e => e.RollNo)
                .ThenBy(e => e.Student!.FirstName)
                .ToListAsync();

            // Fetch existing marks
            var existingMarks = await _context.MarksEntries
                .Where(m => m.ScheduleId == scheduleId)
                .ToDictionaryAsync(m => m.StudentId);

            var studentRows = enrollments.Select(e =>
            {
                var s = e.Student!;
                existingMarks.TryGetValue(s.Id, out var m);

                return new
                {
                    StudentId = s.Id,
                    AdmissionNo = s.AdmissionNo,
                    FullName = $"{s.FirstName} {s.LastName}".Trim(),
                    RollNo = e.RollNo,
                    MarksObtained = m?.MarksObtained,
                    IsAbsent = m?.IsAbsent ?? false,
                    IsMedicalLeave = m?.IsMedicalLeave ?? false,
                    Remarks = m?.Remarks ?? ""
                };
            }).ToList();

            var result = new
            {
                ScheduleId = schedule.Id,
                ExamId = schedule.ExamId,
                ExamName = schedule.Exam?.Name,
                SubjectId = schedule.SubjectId,
                SubjectName = schedule.Subject?.Name,
                schedule.MaxMarks,
                schedule.PassMarks,
                IsLocked = isLocked,
                Students = studentRows
            };

            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost("marks/bulk")]
        [HasPermission("MarksEntry", "Edit")]
        public async Task<ActionResult<ApiResponse<bool>>> SaveMarksBulk([FromBody] SaveMarksBulkDto dto)
        {
            var schedule = await _context.ExamSchedules
                .Include(s => s.Exam)
                .FirstOrDefaultAsync(s => s.Id == dto.ScheduleId);

            if (schedule == null) return NotFound(ApiResponse<bool>.Fail("Schedule not found."));

            if (schedule.Exam?.IsLocked == true && _currentUserService.UserType != UserType.SuperAdmin && _currentUserService.UserType != UserType.SchoolAdmin)
            {
                return BadRequest(ApiResponse<bool>.Fail("Marks entry is locked for this exam. Contact Admin for changes."));
            }

            var existingMarks = await _context.MarksEntries
                .Where(m => m.ScheduleId == dto.ScheduleId)
                .ToDictionaryAsync(m => m.StudentId);

            foreach (var item in dto.Entries)
            {
                // Validation BR-7.1: Marks cannot exceed max marks
                if (item.MarksObtained.HasValue && item.MarksObtained.Value > schedule.MaxMarks)
                {
                    return BadRequest(ApiResponse<bool>.Fail($"Marks for student ID {item.StudentId} cannot exceed maximum marks ({schedule.MaxMarks})."));
                }

                if (existingMarks.TryGetValue(item.StudentId, out var entry))
                {
                    entry.MarksObtained = (item.IsAbsent || item.IsMedicalLeave) ? null : item.MarksObtained;
                    entry.IsAbsent = item.IsAbsent;
                    entry.IsMedicalLeave = item.IsMedicalLeave;
                    entry.Remarks = item.Remarks;
                    entry.ModifiedBy = _currentUserService.UserId ?? 1;
                    entry.ModifiedOn = DateTime.UtcNow;
                }
                else
                {
                    var newEntry = new MarksEntry
                    {
                        ScheduleId = dto.ScheduleId,
                        StudentId = item.StudentId,
                        MarksObtained = (item.IsAbsent || item.IsMedicalLeave) ? null : item.MarksObtained,
                        IsAbsent = item.IsAbsent,
                        IsMedicalLeave = item.IsMedicalLeave,
                        Remarks = item.Remarks,
                        CreatedBy = _currentUserService.UserId ?? 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.MarksEntries.Add(newEntry);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, "Marks saved successfully."));
        }

        // =========================================================================
        // 6. RESULT PROCESSING & REPORT CARDS (FR-7.4, FR-7.7, BR-7.2)
        // =========================================================================
        [HttpGet("{examId}/process-results")]
        [HasPermission("ReportCards", "View")]
        public async Task<ActionResult<ApiResponse<object>>> ProcessExamResults(
            long examId,
            [FromQuery] long? sectionId)
        {
            var exam = await _context.Exams
                .Include(e => e.Class)
                .Include(e => e.Term)
                .Include(e => e.Schedules)
                    .ThenInclude(s => s.Subject)
                .FirstOrDefaultAsync(e => e.Id == examId);

            if (exam == null) return NotFound(ApiResponse<object>.Fail("Exam not found."));

            var schedules = exam.Schedules.Where(s => s.IsActive).ToList();
            if (!schedules.Any())
            {
                return BadRequest(ApiResponse<object>.Fail("No schedules configured for this exam."));
            }

            var scheduleIds = schedules.Select(s => s.Id).ToList();
            var allMarks = await _context.MarksEntries
                .Where(m => scheduleIds.Contains(m.ScheduleId))
                .ToListAsync();

            // Fetch enrolled students
            var enrollQuery = _context.StudentEnrollments
                .Include(e => e.Student)
                .Include(e => e.Section)
                .Where(e => e.ClassId == exam.ClassId && e.Status == StudentStatus.Active);

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                enrollQuery = enrollQuery.Where(e => e.SectionId == sectionId.Value);
            }

            var enrollments = await enrollQuery.ToListAsync();

            // Grade scales
            var scales = await _context.GradeScales
                .Where(g => g.BranchId == exam.BranchId || g.BranchId == 0)
                .OrderByDescending(g => g.MinPercentage)
                .ToListAsync();

            string GetGrade(decimal percentage)
            {
                var match = scales.FirstOrDefault(g => percentage >= g.MinPercentage && percentage <= g.MaxPercentage);
                return match?.Grade ?? (percentage >= 33 ? "D" : "E");
            }

            decimal totalMaxMarks = schedules.Sum(s => s.MaxMarks);

            // Compute student aggregates
            var studentResults = new List<StudentResultItem>();

            foreach (var en in enrollments)
            {
                var student = en.Student!;
                var studentMarks = allMarks.Where(m => m.StudentId == student.Id).ToList();

                decimal totalObtained = 0;
                bool isFailed = false;
                var subjectBreakdown = new List<object>();

                foreach (var sch in schedules)
                {
                    var m = studentMarks.FirstOrDefault(x => x.ScheduleId == sch.Id);
                    decimal markVal = m?.MarksObtained ?? 0;
                    bool absent = m?.IsAbsent ?? false;
                    bool ml = m?.IsMedicalLeave ?? false;

                    if (absent || ml || markVal < sch.PassMarks)
                    {
                        isFailed = true;
                    }

                    if (!absent && !ml)
                    {
                        totalObtained += markVal;
                    }

                    decimal pct = sch.MaxMarks > 0 ? (markVal / sch.MaxMarks) * 100 : 0;

                    subjectBreakdown.Add(new
                    {
                        SubjectId = sch.SubjectId,
                        SubjectName = sch.Subject?.Name ?? "",
                        sch.MaxMarks,
                        sch.PassMarks,
                        MarksObtained = absent ? "AB" : ml ? "ML" : markVal.ToString("0.##"),
                        Grade = (absent || ml) ? "-" : GetGrade(pct)
                    });
                }

                decimal percentage = totalMaxMarks > 0 ? Math.Round((totalObtained / totalMaxMarks) * 100, 2) : 0;
                string overallGrade = isFailed ? "E" : GetGrade(percentage);

                studentResults.Add(new StudentResultItem
                {
                    StudentId = student.Id,
                    AdmissionNo = student.AdmissionNo,
                    FullName = $"{student.FirstName} {student.LastName}".Trim(),
                    RollNo = en.RollNo,
                    SectionId = en.SectionId,
                    SectionName = en.Section?.Name ?? "",
                    TotalObtained = totalObtained,
                    TotalMax = totalMaxMarks,
                    Percentage = percentage,
                    Grade = overallGrade,
                    ResultStatus = isFailed ? "Fail" : "Pass",
                    Subjects = subjectBreakdown
                });
            }

            // Calculate Rank (BR-7.2: Rank calculated within class and within section; ties share same rank)
            // Class rank
            var orderedByClass = studentResults.OrderByDescending(r => r.Percentage).ToList();
            int currentClassRank = 1;
            for (int i = 0; i < orderedByClass.Count; i++)
            {
                if (i > 0 && orderedByClass[i].Percentage < orderedByClass[i - 1].Percentage)
                {
                    currentClassRank = i + 1;
                }
                orderedByClass[i].ClassRank = currentClassRank;
            }

            // Section rank
            foreach (var secGroup in studentResults.GroupBy(r => r.SectionId))
            {
                var orderedBySec = secGroup.OrderByDescending(r => r.Percentage).ToList();
                int currentSecRank = 1;
                for (int i = 0; i < orderedBySec.Count; i++)
                {
                    if (i > 0 && orderedBySec[i].Percentage < orderedBySec[i - 1].Percentage)
                    {
                        currentSecRank = i + 1;
                    }
                    orderedBySec[i].SectionRank = currentSecRank;
                }
            }

            var responseData = new
            {
                ExamId = exam.Id,
                ExamName = exam.Name,
                ClassName = exam.Class?.Name,
                TermName = exam.Term?.Name,
                TotalMaxMarks = totalMaxMarks,
                IsPublished = exam.IsPublished,
                IsLocked = exam.IsLocked,
                Results = studentResults.OrderBy(r => r.SectionName).ThenBy(r => r.RollNo).ToList()
            };

            return Ok(ApiResponse<object>.Ok(responseData));
        }

        [HttpGet("report-card")]
        [HasPermission("ReportCards", "View")]
        public async Task<ActionResult<ApiResponse<object>>> GetReportCardData(
            [FromQuery] long studentId,
            [FromQuery] long examId)
        {
            var student = await _context.Students
                .Include(s => s.Guardians)
                .FirstOrDefaultAsync(s => s.Id == studentId);

            if (student == null) return NotFound(ApiResponse<object>.Fail("Student not found."));

            var branch = await _context.Branches
                .Include(b => b.School)
                .FirstOrDefaultAsync(b => b.Id == student.BranchId);

            var enrollment = await _context.StudentEnrollments
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Include(e => e.AcademicYear)
                .FirstOrDefaultAsync(e => e.StudentId == studentId && e.Status == StudentStatus.Active);

            var exam = await _context.Exams
                .Include(e => e.Term)
                .Include(e => e.Schedules)
                    .ThenInclude(s => s.Subject)
                .FirstOrDefaultAsync(e => e.Id == examId);

            if (exam == null) return NotFound(ApiResponse<object>.Fail("Exam not found."));

            var schedules = exam.Schedules.Where(s => s.IsActive).OrderBy(s => s.Subject?.Name).ToList();
            var scheduleIds = schedules.Select(s => s.Id).ToList();

            var marks = await _context.MarksEntries
                .Where(m => m.StudentId == studentId && scheduleIds.Contains(m.ScheduleId))
                .ToListAsync();

            var scales = await _context.GradeScales
                .Where(g => g.BranchId == student.BranchId || g.BranchId == 0)
                .OrderByDescending(g => g.MinPercentage)
                .ToListAsync();

            string GetGrade(decimal percentage)
            {
                var match = scales.FirstOrDefault(g => percentage >= g.MinPercentage && percentage <= g.MaxPercentage);
                return match?.Grade ?? (percentage >= 33 ? "D" : "E");
            }

            decimal totalObtained = 0;
            decimal totalMax = schedules.Sum(s => s.MaxMarks);
            bool isFailed = false;

            var subjectsList = new List<object>();
            foreach (var sch in schedules)
            {
                var m = marks.FirstOrDefault(x => x.ScheduleId == sch.Id);
                decimal markVal = m?.MarksObtained ?? 0;
                bool absent = m?.IsAbsent ?? false;
                bool ml = m?.IsMedicalLeave ?? false;

                if (absent || ml || markVal < sch.PassMarks) isFailed = true;
                if (!absent && !ml) totalObtained += markVal;

                decimal pct = sch.MaxMarks > 0 ? (markVal / sch.MaxMarks) * 100 : 0;

                subjectsList.Add(new
                {
                    SubjectName = sch.Subject?.Name ?? "",
                    SubjectCode = sch.Subject?.Code ?? "",
                    sch.MaxMarks,
                    sch.PassMarks,
                    MarksObtained = absent ? "AB" : ml ? "ML" : markVal.ToString("0.##"),
                    Grade = (absent || ml) ? "-" : GetGrade(pct)
                });
            }

            decimal totalPct = totalMax > 0 ? Math.Round((totalObtained / totalMax) * 100, 2) : 0;

            // Co-scholastic activities
            var coScholastics = await _context.CoScholasticGrades
                .Where(c => c.ExamId == examId && c.StudentId == studentId)
                .Select(c => new { c.ActivityName, c.Grade, c.Remarks })
                .ToListAsync();

            var coScholasticList = coScholastics.Cast<object>().ToList();
            if (!coScholasticList.Any())
            {
                coScholasticList = new List<object>
                {
                    new { ActivityName = "Work Education", Grade = "A", Remarks = "Good" },
                    new { ActivityName = "Art Education", Grade = "A", Remarks = "Creative" },
                    new { ActivityName = "Health & Physical Education", Grade = "A", Remarks = "Active" },
                    new { ActivityName = "Discipline", Grade = "A", Remarks = "Well-behaved" }
                };
            }

            // Report Remarks
            var remark = await _context.ReportRemarks
                .FirstOrDefaultAsync(r => r.ExamId == examId && r.StudentId == studentId);

            var father = student.Guardians.FirstOrDefault(g => g.Relation == "Father");
            var mother = student.Guardians.FirstOrDefault(g => g.Relation == "Mother");

            var reportCard = new
            {
                SchoolName = branch?.Name ?? "DELHI PUBLIC SCHOOL",
                AffiliationNo = branch?.School?.AffiliationNumber ?? "CBSE/AFF/2026/0912",
                Address = branch?.Address ?? "Knowledge Park, Sector 62, Noida, UP",
                ExamName = exam.Name,
                AcademicYear = enrollment?.AcademicYear?.Name ?? "2026-27",
                Student = new
                {
                    student.AdmissionNo,
                    FullName = $"{student.FirstName} {student.LastName}".Trim(),
                    ClassName = enrollment?.Class?.Name ?? "",
                    SectionName = enrollment?.Section?.Name ?? "",
                    RollNo = enrollment?.RollNo,
                    DOB = student.DateOfBirth.ToString("dd-MMM-yyyy"),
                    FatherName = father?.Name ?? "N/A",
                    MotherName = mother?.Name ?? "N/A",
                },
                ScholasticSubjects = subjectsList,
                TotalMaxMarks = totalMax,
                TotalObtainedMarks = totalObtained,
                Percentage = totalPct,
                OverallGrade = isFailed ? "E" : GetGrade(totalPct),
                Result = isFailed ? "Needs Improvement" : "Passed and Promoted",
                CoScholastic = coScholasticList,
                Attendance = new
                {
                    TotalWorkingDays = remark?.AttendanceTotal ?? 210,
                    DaysPresent = remark?.AttendancePresent ?? 198,
                    Percentage = remark?.AttendanceTotal > 0
                        ? Math.Round(((decimal)(remark.AttendancePresent) / remark.AttendanceTotal) * 100, 1)
                        : 94.3m
                },
                Remarks = new
                {
                    TeacherRemarks = remark?.TeacherRemarks ?? "Consistent performance, enthusiastic participation in classroom activities.",
                    PrincipalRemarks = remark?.PrincipalRemarks ?? "Promoted to next class. Keep up the good work."
                }
            };

            return Ok(ApiResponse<object>.Ok(reportCard));
        }
    }

    public class CreateTermDto
    {
        public long AcademicYearId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string TermCode { get; set; } = string.Empty;
        public decimal Weightage { get; set; } = 100;
        public string? Description { get; set; }
    }

    public class CreateExamDto
    {
        public long AcademicYearId { get; set; }
        public long TermId { get; set; }
        public long ClassId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class ScheduleDto
    {
        public long SubjectId { get; set; }
        public string ExamDate { get; set; } = string.Empty;
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public decimal MaxMarks { get; set; } = 100;
        public decimal PassMarks { get; set; } = 33;
        public string? RoomNo { get; set; }
    }

    public class SaveMarksBulkDto
    {
        public long ScheduleId { get; set; }
        public List<MarksEntryItemDto> Entries { get; set; } = new();
    }

    public class MarksEntryItemDto
    {
        public long StudentId { get; set; }
        public decimal? MarksObtained { get; set; }
        public bool IsAbsent { get; set; }
        public bool IsMedicalLeave { get; set; }
        public string? Remarks { get; set; }
    }

    public class StudentResultItem
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public decimal TotalObtained { get; set; }
        public decimal TotalMax { get; set; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public int ClassRank { get; set; }
        public int SectionRank { get; set; }
        public string ResultStatus { get; set; } = "Pass";
        public List<object> Subjects { get; set; } = new();
    }
}
