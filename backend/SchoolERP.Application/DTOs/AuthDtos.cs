using System;
using System.Collections.Generic;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.DTOs
{
    public class LoginRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public long? SchoolId { get; set; }
        public string? SchoolCode { get; set; }
    }

    public class PublicSchoolItemDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? City { get; set; }
    }

    public class LoginResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public UserProfileDto User { get; set; } = new UserProfileDto();
        public List<RolePermissionDto> Permissions { get; set; } = new List<RolePermissionDto>();
    }

    public class UserProfileDto
    {
        public long Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public UserType UserType { get; set; }
        public long RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public long SchoolId { get; set; }
        public string? SchoolName { get; set; }
        public string? SchoolLogoUrl { get; set; }
        public string? SchoolAddress { get; set; }
        public string? SchoolPhone { get; set; }
        public string? SchoolEmail { get; set; }
        public long BranchId { get; set; }
        public string? BranchName { get; set; }
        public long AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public long? LinkedEntityId { get; set; }
        public bool MustChangePassword { get; set; }
        public bool CanGiveDiscount { get; set; } = false;
        public decimal MaxDiscountLimit { get; set; } = 0;
    }

    public class RefreshTokenRequestDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ResetPasswordDto
    {
        public string MobileOrEmail { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class RolePermissionDto
    {
        public string Menu { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanPrint { get; set; }
        public bool CanExport { get; set; }
    }

    public class RoleDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsSystemRole { get; set; }
        public List<RolePermissionDto> Permissions { get; set; } = new List<RolePermissionDto>();
    }

    public class UserDto
    {
        public long Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public UserType UserType { get; set; }
        public long RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public long BranchId { get; set; }
        public bool IsActive { get; set; }
        public bool IsLocked { get; set; }
        public bool CanGiveDiscount { get; set; } = false;
        public decimal MaxDiscountLimit { get; set; } = 0;
    }
}
