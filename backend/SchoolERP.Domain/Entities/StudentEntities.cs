using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class Enquiry : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string? EnquiryNo { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string GuardianName { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Source { get; set; } // Newspaper, Social Media, Referral, Walk-in
        public EnquiryStatus Status { get; set; } = EnquiryStatus.Open;
        public DateTime? NextFollowupDate { get; set; }
        public string? Notes { get; set; }
        public long? ConvertedStudentId { get; set; }

        public virtual ClassMaster? Class { get; set; }
        public virtual ICollection<EnquiryFollowup> Followups { get; set; } = new List<EnquiryFollowup>();
    }

    public class EnquiryFollowup : BaseEntity
    {
        public long EnquiryId { get; set; }
        public DateTime FollowupDate { get; set; } = DateTime.UtcNow;
        public string Response { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime? NextFollowupDate { get; set; }

        public virtual Enquiry? Enquiry { get; set; }
    }

    public class Student : BaseEntity
    {
        public long BranchId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = "Male"; // Male, Female, Other
        public long? CategoryId { get; set; }
        public long? ReligionId { get; set; }
        public string? BloodGroup { get; set; } // A+, B+, O+, AB+, etc.
        public string? AadhaarNo { get; set; }
        public string? PhotoUrl { get; set; }
        public StudentStatus Status { get; set; } = StudentStatus.Active;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? EmergencyContact { get; set; }
        public DateTime AdmissionDate { get; set; } = DateTime.UtcNow;
        public long? FamilyId { get; set; }
        public long? SiblingStudentId { get; set; }

        public virtual ICollection<StudentGuardian> Guardians { get; set; } = new List<StudentGuardian>();
        public virtual ICollection<StudentEnrollment> Enrollments { get; set; } = new List<StudentEnrollment>();
        public virtual ICollection<StudentDocument> Documents { get; set; } = new List<StudentDocument>();
    }

    public class StudentSibling : BaseEntity
    {
        public long StudentId { get; set; }
        public long SiblingStudentId { get; set; }

        public virtual Student? Student { get; set; }
        public virtual Student? SiblingStudent { get; set; }
    }

    public class StudentGuardian : BaseEntity
    {
        public long StudentId { get; set; }
        public string Relation { get; set; } = "Father"; // Father, Mother, Guardian
        public string Name { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Occupation { get; set; }
        public decimal? AnnualIncome { get; set; }
        public bool IsPrimary { get; set; } = false;

        public virtual Student? Student { get; set; }
    }

    public class StudentEnrollment : BaseEntity
    {
        public long StudentId { get; set; }
        public long AcademicYearId { get; set; }
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public int? RollNo { get; set; }
        public long? FeeGroupId { get; set; }
        public StudentStatus Status { get; set; } = StudentStatus.Active;

        public virtual Student? Student { get; set; }
        public virtual ClassMaster? Class { get; set; }
        public virtual Section? Section { get; set; }
        public virtual AcademicYear? AcademicYear { get; set; }
    }

    public class StudentDocument : BaseEntity
    {
        public long StudentId { get; set; }
        public long? DocumentTypeId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;

        public virtual Student? Student { get; set; }
    }

    public class StudentSectionHistory : BaseEntity
    {
        public long StudentId { get; set; }
        public long AcademicYearId { get; set; }
        public long ClassId { get; set; }
        public long FromSectionId { get; set; }
        public long ToSectionId { get; set; }
        public string? Reason { get; set; }
        public DateTime ChangedOn { get; set; } = DateTime.UtcNow;
        public long ChangedBy { get; set; }

        public virtual Student? Student { get; set; }
        public virtual Section? FromSection { get; set; }
        public virtual Section? ToSection { get; set; }
    }
}
