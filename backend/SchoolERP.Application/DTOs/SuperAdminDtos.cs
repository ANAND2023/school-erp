using System;
using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class SuperAdminDashboardKpiDto
    {
        public int TotalTenants { get; set; }
        public int ActiveTenants { get; set; }
        public int SuspendedTenants { get; set; }
        public int TrialTenants { get; set; }
        public int TotalStudentsAcrossTenants { get; set; }
        public int TotalStaffAcrossTenants { get; set; }
        public int ActiveSubscriptionsCount { get; set; }
        public decimal TotalMonthlyRevenue { get; set; }
        public decimal TotalAnnualRevenue { get; set; }
        public List<ExpiringTenantDto> ExpiringSubscriptions { get; set; } = new();
        public List<TenantListItemDto> RecentTenants { get; set; } = new();
    }

    public class ExpiringTenantDto
    {
        public long SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public DateTime EndDate { get; set; }
        public int DaysRemaining { get; set; }
        public string ContactNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class TenantListItemDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string Status { get; set; } = "Active";
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? CurrentPlanName { get; set; }
        public string? CurrentPlanCode { get; set; }
        public string? SubscriptionStatus { get; set; }
        public DateTime? SubscriptionEndDate { get; set; }
        public int? DaysRemaining { get; set; }
        public int StudentCount { get; set; }
        public int MaxStudents { get; set; }
        public int StaffCount { get; set; }
        public int BranchCount { get; set; }
        public int EnabledModulesCount { get; set; }
        public string? AdminFullName { get; set; }
        public string? AdminUsername { get; set; }
        public string? AdminEmail { get; set; }
        public string? AdminPassword { get; set; }
        public bool AllowStudentLogin { get; set; } = true;
        public bool AllowParentLogin { get; set; } = true;
        public DateTime CreatedOn { get; set; }
    }

    public class TenantDetailDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? CustomDomain { get; set; }
        public string? LogoUrl { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? AffiliationNumber { get; set; }
        public string Status { get; set; } = "Active";
        public bool IsActive { get; set; }
        public string? InitialAdminPassword { get; set; }
        public bool AllowStudentLogin { get; set; } = true;
        public bool AllowParentLogin { get; set; } = true;
        public DateTime CreatedOn { get; set; }

        public TenantSubscriptionDto? CurrentSubscription { get; set; }
        public List<TenantSubscriptionDto> SubscriptionHistory { get; set; } = new();
        public List<TenantModuleStatusDto> Modules { get; set; } = new();
        public List<BranchBriefDto> Branches { get; set; } = new();
        public List<TenantGatewaySummaryDto> Gateways { get; set; } = new();
        public TenantAdminUserDto? AdminUser { get; set; }
        public int TotalStudents { get; set; }
        public int TotalStaff { get; set; }
    }

    public class BranchBriefDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? City { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public bool IsActive { get; set; }
    }

    public class TenantSubscriptionDto
    {
        public long Id { get; set; }
        public long PlanId { get; set; }
        public string PlanCode { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? CustomMaxStudents { get; set; }
        public int? CustomMaxStaff { get; set; }
        public decimal AmountPaid { get; set; }
        public string Status { get; set; } = "Active";
        public string? Notes { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class TenantModuleStatusDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsCore { get; set; }
        public bool IsEnabled { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class TenantGatewaySummaryDto
    {
        public long Id { get; set; }
        public string GatewayType { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsTestMode { get; set; }
    }

    public class TenantAdminUserDto
    {
        public long Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? InitialPassword { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastLoginUtc { get; set; }
    }

    public class CreateTenantRequestDto
    {
        // School Info
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? AffiliationNumber { get; set; }

        // Initial Branch Info
        public string BranchName { get; set; } = "Main Campus";
        public string BranchCode { get; set; } = "MAIN";

        // Initial Academic Year Info
        public string AcademicYearName { get; set; } = "2026-27";
        public DateTime AcademicYearStartDate { get; set; } = new DateTime(2026, 4, 1);
        public DateTime AcademicYearEndDate { get; set; } = new DateTime(2027, 3, 31);

        // Subscription Info
        public long? PlanId { get; set; }
        public string PlanCode { get; set; } = "GROWTH";
        public DateTime SubscriptionStartDate { get; set; } = DateTime.UtcNow;
        public DateTime SubscriptionEndDate { get; set; } = DateTime.UtcNow.AddYears(1);
        public int? CustomMaxStudents { get; set; }
        public int? CustomMaxStaff { get; set; }
        public decimal AmountPaid { get; set; }
        public string SubscriptionStatus { get; set; } = "Active"; // Active, Trial, Suspended

        // Portal Access Permissions
        public bool AllowStudentLogin { get; set; } = true;
        public bool AllowParentLogin { get; set; } = true;

        // Modules Selected
        public List<string> EnabledModuleCodes { get; set; } = new();

        // Initial Admin User Info
        public string AdminFullName { get; set; } = string.Empty;
        public string AdminUsername { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string? AdminMobile { get; set; }
        public string AdminPassword { get; set; } = string.Empty;
    }

    public class UpdateTenantRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? CustomDomain { get; set; }
        public string? LogoUrl { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? AffiliationNumber { get; set; }
        public string Status { get; set; } = "Active";
        public bool IsActive { get; set; } = true;
        public bool? AllowStudentLogin { get; set; }
        public bool? AllowParentLogin { get; set; }
    }

    public class UpdateTenantPortalAccessRequestDto
    {
        public bool AllowStudentLogin { get; set; }
        public bool AllowParentLogin { get; set; }
    }

    public class UpdateTenantModulesRequestDto
    {
        public List<string> EnabledModuleCodes { get; set; } = new();
    }

    public class RenewSubscriptionRequestDto
    {
        public long PlanId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? CustomMaxStudents { get; set; }
        public int? CustomMaxStaff { get; set; }
        public decimal AmountPaid { get; set; }
        public string Status { get; set; } = "Active";
        public string? Notes { get; set; }
    }

    public class SubscriptionPlanDto
    {
        public long Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string BillingPeriod { get; set; } = "Monthly";
        public decimal PricePerPeriod { get; set; }
        public int MaxStudents { get; set; }
        public int MaxStaff { get; set; }
        public string? IncludedModules { get; set; }
        public bool IsActive { get; set; }
    }

    public class ModuleCatalogDto
    {
        public long Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsCore { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsEnabled { get; set; } = true;
    }

    public class SaveSubscriptionPlanRequestDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string BillingPeriod { get; set; } = "Monthly";
        public decimal PricePerPeriod { get; set; }
        public int MaxStudents { get; set; }
        public int MaxStaff { get; set; }
        public string? IncludedModules { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ImpersonateResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public long SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string SchoolSlug { get; set; } = string.Empty;
        public UserProfileDto User { get; set; } = new();
        public List<RolePermissionDto> Permissions { get; set; } = new();
        public bool IsImpersonated { get; set; } = true;
        public string ImpersonatedBy { get; set; } = string.Empty;
        public long ImpersonatorId { get; set; }
    }

    public class GatewayConfigDto
    {
        public long Id { get; set; }
        public long? SchoolId { get; set; }
        public string GatewayType { get; set; } = string.Empty; // SMS, WHATSAPP, PAYMENT
        public string Provider { get; set; } = string.Empty;    // RAZORPAY, STRIPE, TWILIO, FAST2SMS
        public string ConfigJson { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsTestMode { get; set; }
        public DateTime? ModifiedOn { get; set; }
    }

    public class SaveGatewayConfigRequestDto
    {
        public long? SchoolId { get; set; }
        public string GatewayType { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string ConfigJson { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public bool IsTestMode { get; set; } = false;
    }

    public class GlobalAuditLogDto
    {
        public long Id { get; set; }
        public long? SchoolId { get; set; }
        public string? SchoolName { get; set; }
        public long ActorUserId { get; set; }
        public string ActorUsername { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public string? RecordId { get; set; }
        public string? IpAddress { get; set; }
        public bool WasImpersonated { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class ResetTenantAdminPasswordRequestDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    public class WhatsAppModuleConfigDto
    {
        public bool IsEnabled { get; set; } = true;
        public string Provider { get; set; } = "DIRECT_WEB"; // DIRECT_WEB, INTERAKT, GUPSHUP, TWILIO, WATI
        public string? ApiKey { get; set; }
        public string? ApiSecret { get; set; }
        public string? PhoneNumberId { get; set; }
        public bool IsTestMode { get; set; } = false;

        public WhatsAppModuleItemDto Enquiry { get; set; } = new()
        {
            Enabled = true,
            Template = "Dear {ParentName}, thank you for your enquiry for {StudentName} (Class: {ClassName}) at {SchoolName}. Enquiry No: {EnquiryNo}. For any queries, call {SchoolPhone}. Best regards!"
        };

        public WhatsAppModuleItemDto Admission { get; set; } = new()
        {
            Enabled = true,
            Template = "Congratulations {ParentName}! Admission for {StudentName} is confirmed in Class {ClassName} (Section: {Section}) at {SchoolName}. Admission No: {AdmissionNo}. Welcome to our school family!"
        };

        public WhatsAppModuleItemDto FeeReceipt { get; set; } = new()
        {
            Enabled = true,
            Template = "Dear {ParentName}, Fee payment of Rs. {PaidAmount} for {StudentName} (Receipt: #{ReceiptNo}) has been successfully received on {Date}. Remaining balance: Rs. {Balance}. Thank you, {SchoolName}."
        };

        public WhatsAppModuleItemDto FeeDemand { get; set; } = new()
        {
            Enabled = true,
            Template = "Dear Parent, this is a gentle reminder regarding pending school fees of Rs. {PendingAmount} for {StudentName} ({Month}) at {SchoolName}. Due Date: {DueDate}. Please clear the dues at your earliest convenience."
        };

        public WhatsAppModuleItemDto Attendance { get; set; } = new()
        {
            Enabled = true,
            Template = "Dear Parent, please note that your ward {StudentName} (Class: {ClassName}) is marked ABSENT today ({Date}) at {SchoolName}. If on leave, please submit an application."
        };

        public WhatsAppModuleItemDto Birthday { get; set; } = new()
        {
            Enabled = true,
            Template = "🎉 Warmest Birthday Wishes to {StudentName} on turning {Age} today! May your year ahead be filled with success, knowledge, and joy. From all of us at {SchoolName}! 🎂"
        };

        public WhatsAppModuleItemDto General { get; set; } = new()
        {
            Enabled = true,
            Template = "Notice from {SchoolName}: Dear Parent, regarding {StudentName} - {Message}. Thank you."
        };
    }

    public class WhatsAppModuleItemDto
    {
        public bool Enabled { get; set; } = true;
        public string Template { get; set; } = string.Empty;
    }
}
