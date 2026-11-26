using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;

namespace SchoolERP.Domain.Entities
{
    public class Homework : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long ClassId { get; set; }
        public long? SectionId { get; set; } // null = assigned to all sections of the class
        public long? SubjectId { get; set; }
        public long? TeacherId { get; set; } // EmployeeId or UserId

        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime HomeworkDate { get; set; } = DateTime.UtcNow.Date;
        public DateTime DueDate { get; set; }

        // Attachments (PDF / Photo)
        public string? AttachmentUrl { get; set; }
        public string? AttachmentFileName { get; set; }
        public string? AttachmentFileType { get; set; }
        public long? AttachmentFileSize { get; set; }

        public string Status { get; set; } = "Active"; // Active, Evaluated, Archived
        public string? Instructions { get; set; }

        // Navigation
        public virtual Branch? Branch { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual Section? Section { get; set; }
        public virtual Subject? Subject { get; set; }
        public virtual Employee? Teacher { get; set; }

        public virtual ICollection<HomeworkSubmission> Submissions { get; set; } = new List<HomeworkSubmission>();
    }

    public class HomeworkSubmission : BaseEntity
    {
        public long HomeworkId { get; set; }
        public long StudentId { get; set; }
        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
        public string? SubmissionText { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentFileName { get; set; }
        public string? AttachmentFileType { get; set; }
        public long? AttachmentFileSize { get; set; }
        public string Status { get; set; } = "Submitted"; // Submitted, Reviewed, Resubmit
        public string? TeacherFeedback { get; set; }
        public int? MarksObtained { get; set; }

        // Navigation
        public virtual Homework? Homework { get; set; }
        public virtual Student? Student { get; set; }
    }
}
