using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;

namespace SchoolERP.Domain.Entities
{
    public class SubscriptionPlan : BaseEntity
    {
        public string Code { get; set; } = string.Empty; // BASIC, PRO, ENTERPRISE
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string BillingPeriod { get; set; } = "Annual"; // Monthly, Annual
        public decimal PricePerPeriod { get; set; } = 0.00m;
        public int MaxStudents { get; set; } = 500;
        public int MaxStaff { get; set; } = 50;
        public string? IncludedModules { get; set; } // JSON array of module codes
    }

    public class TenantSubscription : BaseEntity
    {
        public long SchoolId { get; set; }
        public long PlanId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? CustomMaxStudents { get; set; }
        public int? CustomMaxStaff { get; set; }
        public decimal AmountPaid { get; set; } = 0.00m;
        public string Status { get; set; } = "Active"; // Trial, Active, GracePeriod, Suspended, Expired
        public string? Notes { get; set; }

        public virtual School? School { get; set; }
        public virtual SubscriptionPlan? Plan { get; set; }
    }

    public class ModuleCatalog : BaseEntity
    {
        public string Code { get; set; } = string.Empty; // FEES, ATTENDANCE, EXAMINATIONS, TRANSPORT, HOSTEL, INVENTORY, STAFF_PAYROLL
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = "General"; // Academics, Finance, Logistics, Administration
        public string? Description { get; set; }
        public bool IsCore { get; set; } = false; // Core modules cannot be disabled
        public int DisplayOrder { get; set; } = 0;
    }

    public class TenantModule : BaseEntity
    {
        public long SchoolId { get; set; }
        public string ModuleCode { get; set; } = string.Empty;
        public bool IsEnabled { get; set; } = true;
        public DateTime EnabledAt { get; set; } = DateTime.UtcNow;
        public DateTime? DisabledAt { get; set; }
        public string? CustomConfig { get; set; } // JSON configuration / feature flags

        public virtual School? School { get; set; }
    }

    public class TenantGatewayConfig : BaseEntity
    {
        public long? SchoolId { get; set; } // NULL = Global default platform gateway
        public string GatewayType { get; set; } = string.Empty; // SMS, WhatsApp, PaymentGateway
        public string Provider { get; set; } = string.Empty; // Razorpay, Stripe, Twilio, Msg91, Cashfree
        public string CredentialsEncrypted { get; set; } = string.Empty; // Encrypted JSON credentials
        public bool IsTenantOverride { get; set; } = false;

        public virtual School? School { get; set; }
    }

    public class GlobalAuditLog : BaseEntity
    {
        public long? SchoolId { get; set; }
        public long ActorUserId { get; set; }
        public string ActorUsername { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty; // TenantCreated, ModuleToggled, PlanExtended, Impersonated
        public string Module { get; set; } = "SuperAdmin";
        public string EntityName { get; set; } = string.Empty;
        public string? RecordId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public bool WasImpersonated { get; set; } = false;
        public long? ImpersonatedByUserId { get; set; }

        public virtual School? School { get; set; }
    }

    public class LandingEnquiry : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string SchoolName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Message { get; set; }
        public bool IsRead { get; set; } = false;
        public string Status { get; set; } = "New"; // New, FollowUp, Converted, Rejected
        public string? Remarks { get; set; }
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    }

    public class LandingPageSetting
    {
        public long Id { get; set; }
        public string SettingKey { get; set; } = string.Empty;
        public string? SettingValue { get; set; }
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class SystemErrorLog
    {
        public long Id { get; set; }
        public string ErrorId { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public int StatusCode { get; set; } = 500;
        public string HttpMethod { get; set; } = "GET";
        public string RequestPath { get; set; } = string.Empty;
        public string? QueryString { get; set; }
        public string Message { get; set; } = string.Empty;
        public string ExceptionType { get; set; } = string.Empty;
        public string? RootCause { get; set; }
        public string? StackTrace { get; set; }
        public long? UserId { get; set; }
        public string? Username { get; set; }
        public string? UserRole { get; set; }
        public long? BranchId { get; set; }
        public long? SchoolId { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public bool IsResolved { get; set; } = false;
        public string? ResolvedBy { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? ResolutionNotes { get; set; }
    }
}
