using System;
using System.Collections.Generic;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.DTOs
{
    public class EnquiryDto
    {
        public long Id { get; set; }
        public long AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public string? EnquiryNo { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Source { get; set; }
        public EnquiryStatus Status { get; set; }
        public DateTime? NextFollowupDate { get; set; }
        public string? Notes { get; set; }
        public long? ConvertedStudentId { get; set; }
        public DateTime CreatedOn { get; set; }
        public List<EnquiryFollowupDto> Followups { get; set; } = new List<EnquiryFollowupDto>();
    }

    public class CreateEnquiryDto
    {
        public long? AcademicYearId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string GuardianName { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Source { get; set; }
        public DateTime? NextFollowupDate { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateEnquiryDto
    {
        public string StudentName { get; set; } = string.Empty;
        public long? ClassId { get; set; }
        public string GuardianName { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Source { get; set; }
        public EnquiryStatus? Status { get; set; }
        public DateTime? NextFollowupDate { get; set; }
        public string? Notes { get; set; }
    }

    public class EnquiryFollowupDto
    {
        public long Id { get; set; }
        public long EnquiryId { get; set; }
        public DateTime FollowupDate { get; set; }
        public string Response { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime? NextFollowupDate { get; set; }
    }

    public class AddFollowupDto
    {
        public string Response { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime? NextFollowupDate { get; set; }
        public EnquiryStatus? UpdateStatus { get; set; }
    }

    public class StudentListDto
    {
        public long Id { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? StudentName => FullName;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public DateTime? AdmissionDate { get; set; }
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public string? CategoryName { get; set; }
        public StudentStatus Status { get; set; }
        public string? PhotoUrl { get; set; }
        public string AdmissionType { get; set; } = "New Admission";
        public bool IsNewAdmission { get; set; } = true;
        public string? InitialSessionName { get; set; }
    }

    public class StudentGuardianDto
    {
        public long Id { get; set; }
        public string Relation { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Occupation { get; set; }
        public decimal? AnnualIncome { get; set; }
        public bool IsPrimary { get; set; }
    }

    public class StudentEnrollmentDto
    {
        public long Id { get; set; }
        public long AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public StudentStatus Status { get; set; }
    }

    public class StudentDocumentDto
    {
        public long Id { get; set; }
        public long? DocumentTypeId { get; set; }
        public string DocumentTypeName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
    }

    public class SiblingDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string? GuardianName { get; set; }
        public string? GuardianMobile { get; set; }
        public string? PhotoUrl { get; set; }
    }

    public class StudentDetailDto
    {
        public long Id { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public long? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public long? ReligionId { get; set; }
        public string? ReligionName { get; set; }
        public string? BloodGroup { get; set; }
        public string? AadhaarNo { get; set; }
        public string? PhotoUrl { get; set; }
        public StudentStatus Status { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? EmergencyContact { get; set; }
        public DateTime AdmissionDate { get; set; }

        public StudentEnrollmentDto? CurrentEnrollment { get; set; }
        public List<StudentGuardianDto> Guardians { get; set; } = new List<StudentGuardianDto>();
        public List<StudentEnrollmentDto> EnrollmentHistory { get; set; } = new List<StudentEnrollmentDto>();
        public List<StudentDocumentDto> Documents { get; set; } = new List<StudentDocumentDto>();
        public long? FamilyId { get; set; }
        public long? SiblingStudentId { get; set; }
        public List<SiblingDto> Siblings { get; set; } = new List<SiblingDto>();
        public List<StudentSectionHistoryDto> SectionHistories { get; set; } = new List<StudentSectionHistoryDto>();
    }

    public class AdmissionRequestDto
    {
        // Student Info
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = "Male";
        public long? CategoryId { get; set; }
        public long? ReligionId { get; set; }
        public string? BloodGroup { get; set; }
        public string? AadhaarNo { get; set; }
        public string? PhotoUrl { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? EmergencyContact { get; set; }

        // Sibling Connection
        public long? SiblingStudentId { get; set; }

        // Class & Section Allotment
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public int? RollNo { get; set; }
        public long? FeeGroupId { get; set; }

        // Guardians (BR-3.4: Mandatory one guardian with mobile number)
        public List<StudentGuardianDto> Guardians { get; set; } = new List<StudentGuardianDto>();

        // Optional conversion link
        public long? EnquiryId { get; set; }
    }

    public class StudentRollNoItem
    {
        public long StudentId { get; set; }
        public int RollNo { get; set; }
    }

    public class BulkRollNoAssignmentDto
    {
        public long ClassId { get; set; }
        public long SectionId { get; set; }
        public List<StudentRollNoItem> Assignments { get; set; } = new List<StudentRollNoItem>();
    }

    public class SectionChangeRequestDto
    {
        public long StudentId { get; set; }
        public long ToSectionId { get; set; }
        public string? Reason { get; set; }
    }

    public class StudentSectionHistoryDto
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long FromSectionId { get; set; }
        public string FromSectionName { get; set; } = string.Empty;
        public long ToSectionId { get; set; }
        public string ToSectionName { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public DateTime ChangedOn { get; set; }
        public long ChangedBy { get; set; }
    }

    public class UpdateStudentRequestDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? AdmissionNo { get; set; }
        public DateTime? AdmissionDate { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = "Male";
        public long? CategoryId { get; set; }
        public long? ReligionId { get; set; }
        public string? BloodGroup { get; set; }
        public string? AadhaarNo { get; set; }
        public string? PhotoUrl { get; set; }
        public string? FatherPhotoUrl { get; set; }
        public string? MotherPhotoUrl { get; set; }
        public string? GuardianPhotoUrl { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? EmergencyContact { get; set; }
        public long? ClassId { get; set; }
        public long? SectionId { get; set; }
        public int? RollNo { get; set; }
        public StudentStatus Status { get; set; } = StudentStatus.Active;
        public string? Remarks { get; set; }
        public List<StudentGuardianDto> Guardians { get; set; } = new List<StudentGuardianDto>();
    }

    public class StudentAuditLogDto
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        public long ChangedByUserId { get; set; }
        public string ChangedByUserName { get; set; } = string.Empty;
        public DateTime ChangedOn { get; set; }
        public string Remarks { get; set; } = string.Empty;
        public string ChangesJson { get; set; } = string.Empty;
    }

    public class CreateStudentDocumentDto
    {
        public long? DocumentTypeId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
    }

    public class StudentGatePassDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public long StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public string? Gender { get; set; }
        public long? ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long? SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string? FatherName { get; set; }
        public string? FatherMobile { get; set; }
        public string? EmergencyContact { get; set; }

        public string GatePassNo { get; set; } = string.Empty;
        public DateTime PassDate { get; set; }
        public string OutTime { get; set; } = string.Empty;
        public string? ExpectedReturnTime { get; set; }
        public string? ActualReturnTime { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? ReasonDetail { get; set; }
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverRelation { get; set; } = "Parent";
        public string? ReceiverContact { get; set; }
        public string? ReceiverPhotoUrl { get; set; }
        public string? ApprovedBy { get; set; }
        public string Status { get; set; } = "Issued";
        public string? Remarks { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class CreateStudentGatePassDto
    {
        public long StudentId { get; set; }
        public string? GatePassNo { get; set; }
        public DateTime? PassDate { get; set; }
        public string OutTime { get; set; } = string.Empty;
        public string? ExpectedReturnTime { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? ReasonDetail { get; set; }
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverRelation { get; set; } = "Parent";
        public string? ReceiverContact { get; set; }
        public string? ReceiverPhotoUrl { get; set; }
        public string? ApprovedBy { get; set; }
        public string? Remarks { get; set; }
        public string Status { get; set; } = "Issued";
    }

    public class UpdateGatePassStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? ActualReturnTime { get; set; }
        public string? Remarks { get; set; }
    }

    public class GatePassStatsDto
    {
        public int TotalToday { get; set; }
        public int CurrentlyOut { get; set; }
        public int ReturnedToday { get; set; }
        public int CancelledToday { get; set; }
        public int TotalAll { get; set; }
    }

    public class AdmissionSummaryDto
    {
        public int TotalAllTime { get; set; }
        public int TotalSession { get; set; }
        public int NewAdmissionsCount { get; set; }
        public int PromotedCount { get; set; }
        public int BoysCount { get; set; }
        public int GirlsCount { get; set; }
        public List<ClassAdmissionStatDto> ClassWise { get; set; } = new List<ClassAdmissionStatDto>();
        public List<RecentAdmissionItemDto> RecentAdmissions { get; set; } = new List<RecentAdmissionItemDto>();
    }

    public class ClassAdmissionStatDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class RecentAdmissionItemDto
    {
        public long Id { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime? AdmissionDate { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string GuardianMobile { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
    }

    public class StudentCertificateDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public long StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public string? Gender { get; set; }
        public DateTime? Dob { get; set; }
        public long? ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public long? SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public string? FatherMobile { get; set; }
        public string? EmergencyContact { get; set; }

        public string CertificateType { get; set; } = "bonafide";
        public string CertificateNo { get; set; } = string.Empty;
        public DateTime IssueDate { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? IssuedBy { get; set; }
        public string Status { get; set; } = "Issued";
        public string? Remarks { get; set; }
        public string? OptionsJson { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class CreateStudentCertificateDto
    {
        public long StudentId { get; set; }
        public string CertificateType { get; set; } = "bonafide";
        public string? CertificateNo { get; set; }
        public DateTime? IssueDate { get; set; }
        public string? Purpose { get; set; }
        public string? IssuedBy { get; set; }
        public string? Remarks { get; set; }
        public string? OptionsJson { get; set; }
    }

    public class StudentCertificateStatsDto
    {
        public int TotalIssued { get; set; }
        public int IssuedToday { get; set; }
        public int BonafideCount { get; set; }
        public int DobCount { get; set; }
        public int AgeCount { get; set; }
        public int CharacterCount { get; set; }
        public int RetCount { get; set; }
    }
}
