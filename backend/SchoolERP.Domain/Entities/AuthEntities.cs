using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class User : BaseEntity
    {
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public UserType UserType { get; set; }
        public long RoleId { get; set; }
        public long BranchId { get; set; }
        public long? LinkedEntityId { get; set; } // EmployeeId, StudentId, or ParentId
        public bool MustChangePassword { get; set; } = false;
        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? LockoutEndUtc { get; set; }
        public bool IsLocked { get; set; } = false;
        public bool CanGiveDiscount { get; set; } = false;
        public decimal MaxDiscountLimit { get; set; } = 0;

        public virtual Role? Role { get; set; }
        public virtual ICollection<UserRefreshToken> RefreshTokens { get; set; } = new List<UserRefreshToken>();
    }

    public class Role : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsSystemRole { get; set; } = false;
        public long? BranchId { get; set; }

        public virtual ICollection<User> Users { get; set; } = new List<User>();
        public virtual ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
    }

    public class RolePermission : BaseEntity
    {
        public long RoleId { get; set; }
        public string Menu { get; set; } = string.Empty;
        public bool CanView { get; set; } = false;
        public bool CanAdd { get; set; } = false;
        public bool CanEdit { get; set; } = false;
        public bool CanDelete { get; set; } = false;
        public bool CanPrint { get; set; } = false;
        public bool CanExport { get; set; } = false;

        public virtual Role? Role { get; set; }
    }

    public class UserRefreshToken : BaseEntity
    {
        public long UserId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresUtc { get; set; }
        public bool IsRevoked { get; set; } = false;
        public DateTime? RevokedUtc { get; set; }
        public string? ReplacedByToken { get; set; }

        public virtual User? User { get; set; }
    }

    public class AuditLog : BaseEntity
    {
        public long? UserId { get; set; }
        public string? Username { get; set; }
        public string Action { get; set; } = string.Empty; // Login, Logout, Create, Update, Delete
        public string Module { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public string? RecordId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public long? BranchId { get; set; }
    }
}
