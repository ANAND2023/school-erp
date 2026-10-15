using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.API.Helpers;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/superadmin")]
    [Authorize]
    public class SuperAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly IJwtTokenService _jwtService;

        public SuperAdminController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            IJwtTokenService jwtService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _jwtService = jwtService;
        }

        private bool IsSuperAdmin()
        {
            return _currentUserService.UserType == UserType.SuperAdmin ||
                   User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "Super Admin") ||
                   _currentUserService.UserId == 1;
        }

        private async Task LogAuditAsync(
            long? schoolId,
            string action,
            string entityName,
            string? recordId,
            object? oldVal = null,
            object? newVal = null,
            bool wasImpersonated = false,
            long? impersonatedBy = null)
        {
            try
            {
                var log = new GlobalAuditLog
                {
                    SchoolId = schoolId,
                    ActorUserId = _currentUserService.UserId ?? 1,
                    ActorUsername = _currentUserService.Username ?? "SuperAdmin",
                    Action = action,
                    Module = "SuperAdmin",
                    EntityName = entityName,
                    RecordId = recordId,
                    OldValues = oldVal != null ? JsonSerializer.Serialize(oldVal) : null,
                    NewValues = newVal != null ? JsonSerializer.Serialize(newVal) : null,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString(),
                    WasImpersonated = wasImpersonated,
                    ImpersonatedByUserId = impersonatedBy,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };

                _context.GlobalAuditLogs.Add(log);
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Non-blocking audit log failure
            }
        }

        // ==========================================
        // 1. DASHBOARD & KPIS
        // ==========================================
        [HttpGet("dashboard/kpis")]
        public async Task<ActionResult<ApiResponse<SuperAdminDashboardKpiDto>>> GetDashboardKpis()
        {
            if (!IsSuperAdmin())
                return Forbid();

            var now = DateTime.UtcNow;
            var in30Days = now.AddDays(30);

            var totalTenants = await _context.Schools.CountAsync();
            var activeTenants = await _context.Schools.CountAsync(s => s.Status == "Active");
            var suspendedTenants = await _context.Schools.CountAsync(s => s.Status == "Suspended");
            var trialTenants = await _context.Schools.CountAsync(s => s.Status == "Trial");

            var totalStudents = await _context.Students.CountAsync(s => s.IsActive);
            var totalStaff = await _context.Employees.CountAsync(e => e.IsActive);

            var activeSubscriptions = await _context.TenantSubscriptions
                .Include(s => s.Plan)
                .Where(s => s.Status == "Active" && s.EndDate >= now)
                .ToListAsync();

            decimal totalMonthlyRevenue = 0m;
            foreach (var sub in activeSubscriptions)
            {
                if (sub.Plan != null)
                {
                    if (sub.Plan.BillingPeriod.Equals("Annual", StringComparison.OrdinalIgnoreCase))
                    {
                        totalMonthlyRevenue += (sub.AmountPaid > 0 ? sub.AmountPaid : sub.Plan.PricePerPeriod) / 12m;
                    }
                    else
                    {
                        totalMonthlyRevenue += (sub.AmountPaid > 0 ? sub.AmountPaid : sub.Plan.PricePerPeriod);
                    }
                }
            }

            var expiringSubsEntities = await _context.TenantSubscriptions
                .Include(s => s.School)
                .Include(s => s.Plan)
                .Where(s => s.Status == "Active" && s.EndDate >= now && s.EndDate <= in30Days)
                .OrderBy(s => s.EndDate)
                .Take(10)
                .ToListAsync();

            var expiringSubs = expiringSubsEntities.Select(s => new ExpiringTenantDto
            {
                SchoolId = s.SchoolId,
                SchoolName = s.School != null ? s.School.Name : "Unknown",
                PlanName = s.Plan != null ? s.Plan.Name : "Standard",
                EndDate = s.EndDate,
                DaysRemaining = (int)Math.Ceiling((s.EndDate - now).TotalDays),
                ContactNumber = s.School != null ? (s.School.ContactNumber ?? "") : "",
                Email = s.School != null ? (s.School.Email ?? "") : ""
            }).ToList();

            var recentSchoolsEntities = await _context.Schools
                .Include(s => s.Branches)
                .Include(s => s.Subscriptions)
                    .ThenInclude(sub => sub.Plan)
                .OrderByDescending(s => s.CreatedOn)
                .Take(5)
                .ToListAsync();

            var recentSchools = new List<TenantListItemDto>();
            foreach (var s in recentSchoolsEntities)
            {
                var activeSub = s.Subscriptions.Where(sub => sub.Status == "Active").OrderByDescending(sub => sub.EndDate).FirstOrDefault();
                var branchIds = s.Branches.Where(b => b.IsActive).Select(b => b.Id).ToList();
                var studentCount = await _context.Students.CountAsync(st => branchIds.Contains(st.BranchId) && st.IsActive);
                var staffCount = await _context.Employees.CountAsync(emp => branchIds.Contains(emp.BranchId) && emp.IsActive);
                var enabledModulesCount = await _context.TenantModules.CountAsync(m => m.SchoolId == s.Id && m.IsEnabled);

                recentSchools.Add(new TenantListItemDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Code = s.Code,
                    Slug = s.Slug,
                    LogoUrl = s.LogoUrl,
                    City = s.City,
                    State = s.State,
                    Status = s.Status ?? (s.IsActive ? "Active" : "Suspended"),
                    ContactNumber = s.ContactNumber,
                    Email = s.Email,
                    CurrentPlanName = activeSub?.Plan?.Name,
                    CurrentPlanCode = activeSub?.Plan?.Code,
                    SubscriptionStatus = activeSub?.Status ?? "None",
                    SubscriptionEndDate = activeSub?.EndDate,
                    DaysRemaining = activeSub != null ? (int?)Math.Ceiling((activeSub.EndDate - now).TotalDays) : null,
                    BranchCount = branchIds.Count,
                    StudentCount = studentCount,
                    StaffCount = staffCount,
                    EnabledModulesCount = enabledModulesCount,
                    CreatedOn = s.CreatedOn
                });
            }

            var kpis = new SuperAdminDashboardKpiDto
            {
                TotalTenants = totalTenants,
                ActiveTenants = activeTenants,
                SuspendedTenants = suspendedTenants,
                TrialTenants = trialTenants,
                TotalStudentsAcrossTenants = totalStudents,
                TotalStaffAcrossTenants = totalStaff,
                ActiveSubscriptionsCount = activeSubscriptions.Count,
                TotalMonthlyRevenue = Math.Round(totalMonthlyRevenue, 2),
                TotalAnnualRevenue = Math.Round(totalMonthlyRevenue * 12m, 2),
                ExpiringSubscriptions = expiringSubs,
                RecentTenants = recentSchools
            };

            return Ok(ApiResponse<SuperAdminDashboardKpiDto>.Ok(kpis));
        }

        // ==========================================
        // 2. TENANTS LIST & DETAILS
        // ==========================================
        [HttpGet("tenants")]
        public async Task<ActionResult<ApiResponse<List<TenantListItemDto>>>> GetTenants(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string? planCode)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var now = DateTime.UtcNow;
            var query = _context.Schools
                .Include(s => s.Branches)
                .Include(s => s.Subscriptions)
                    .ThenInclude(sub => sub.Plan)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(s =>
                    s.Name.ToLower().Contains(term) ||
                    s.Code.ToLower().Contains(term) ||
                    s.Slug.ToLower().Contains(term) ||
                    (s.City != null && s.City.ToLower().Contains(term)) ||
                    (s.Email != null && s.Email.ToLower().Contains(term)) ||
                    (s.ContactNumber != null && s.ContactNumber.Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.Status == status);
            }

            var schools = await query.OrderBy(s => s.Name).ToListAsync();

            var list = new List<TenantListItemDto>();
            foreach (var s in schools)
            {
                var activeSub = s.Subscriptions
                    .Where(sub => sub.IsActive)
                    .OrderByDescending(sub => sub.EndDate)
                    .FirstOrDefault();

                if (!string.IsNullOrWhiteSpace(planCode) && !planCode.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (activeSub?.Plan?.Code != planCode)
                        continue;
                }

                var branchIds = s.Branches.Where(b => b.IsActive).Select(b => b.Id).ToList();

                var studentCount = await _context.Students.CountAsync(st => branchIds.Contains(st.BranchId) && st.IsActive);
                var staffCount = await _context.Employees.CountAsync(emp => branchIds.Contains(emp.BranchId) && emp.IsActive);
                var enabledModulesCount = await _context.TenantModules.CountAsync(m => m.SchoolId == s.Id && m.IsEnabled);

                // Find admin user
                var adminUser = await _context.Users
                    .Where(u => branchIds.Contains(u.BranchId) && (u.UserType == UserType.SchoolAdmin || u.RoleId == 2))
                    .OrderBy(u => u.Id)
                    .FirstOrDefaultAsync();

                list.Add(new TenantListItemDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Code = s.Code,
                    Slug = s.Slug,
                    LogoUrl = s.LogoUrl,
                    City = s.City,
                    State = s.State,
                    Status = s.Status ?? (s.IsActive ? "Active" : "Suspended"),
                    ContactNumber = s.ContactNumber,
                    Email = s.Email,
                    CurrentPlanName = activeSub?.Plan?.Name,
                    CurrentPlanCode = activeSub?.Plan?.Code,
                    SubscriptionStatus = activeSub?.Status ?? "None",
                    SubscriptionEndDate = activeSub?.EndDate,
                    DaysRemaining = activeSub != null ? (int)Math.Ceiling((activeSub.EndDate - now).TotalDays) : null,
                    StudentCount = studentCount,
                    MaxStudents = activeSub?.CustomMaxStudents ?? activeSub?.Plan?.MaxStudents ?? 1000,
                    StaffCount = staffCount,
                    BranchCount = branchIds.Count,
                    EnabledModulesCount = enabledModulesCount,
                    AdminFullName = adminUser?.FullName,
                    AdminUsername = adminUser?.Username,
                    AdminEmail = adminUser?.Email,
                    AdminPassword = s.InitialAdminPassword ?? "Admin@123",
                    AllowStudentLogin = s.AllowStudentLogin,
                    AllowParentLogin = s.AllowParentLogin,
                    CreatedOn = s.CreatedOn
                });
            }

            return Ok(ApiResponse<List<TenantListItemDto>>.Ok(list));
        }

        [HttpGet("tenants/{id}")]
        public async Task<ActionResult<ApiResponse<TenantDetailDto>>> GetTenantById(long id)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var school = await _context.Schools
                .Include(s => s.Branches)
                .Include(s => s.Subscriptions)
                    .ThenInclude(sub => sub.Plan)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (school == null)
                return NotFound(ApiResponse<TenantDetailDto>.Fail("School tenant not found."));

            var branchIds = school.Branches.Select(b => b.Id).ToList();
            var totalStudents = await _context.Students.CountAsync(st => branchIds.Contains(st.BranchId) && st.IsActive);
            var totalStaff = await _context.Employees.CountAsync(emp => branchIds.Contains(emp.BranchId) && emp.IsActive);

            // Active & historical subscriptions
            var currentSub = school.Subscriptions
                .Where(s => s.IsActive)
                .OrderByDescending(s => s.EndDate)
                .Select(s => new TenantSubscriptionDto
                {
                    Id = s.Id,
                    PlanId = s.PlanId,
                    PlanCode = s.Plan?.Code ?? "",
                    PlanName = s.Plan?.Name ?? "",
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    CustomMaxStudents = s.CustomMaxStudents,
                    CustomMaxStaff = s.CustomMaxStaff,
                    AmountPaid = s.AmountPaid,
                    Status = s.Status,
                    Notes = s.Notes,
                    CreatedOn = s.CreatedOn
                })
                .FirstOrDefault();

            var subHistory = school.Subscriptions
                .OrderByDescending(s => s.CreatedOn)
                .Select(s => new TenantSubscriptionDto
                {
                    Id = s.Id,
                    PlanId = s.PlanId,
                    PlanCode = s.Plan?.Code ?? "",
                    PlanName = s.Plan?.Name ?? "",
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    CustomMaxStudents = s.CustomMaxStudents,
                    CustomMaxStaff = s.CustomMaxStaff,
                    AmountPaid = s.AmountPaid,
                    Status = s.Status,
                    Notes = s.Notes,
                    CreatedOn = s.CreatedOn
                })
                .ToList();

            // All module catalog with tenant enable flags
            var allCatalogs = await _context.ModuleCatalogs
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            var tenantModules = await _context.TenantModules
                .Where(tm => tm.SchoolId == school.Id)
                .ToDictionaryAsync(tm => tm.ModuleCode, tm => tm.IsEnabled);

            var modulesList = allCatalogs.Select(c => new TenantModuleStatusDto
            {
                Code = c.Code,
                Name = c.Name,
                Category = c.Category,
                Description = c.Description,
                IsCore = c.IsCore,
                IsEnabled = c.IsCore || (tenantModules.ContainsKey(c.Code) && tenantModules[c.Code]),
                DisplayOrder = c.DisplayOrder
            }).ToList();

            // Gateways
            var gateways = await _context.TenantGatewayConfigs
                .Where(g => g.SchoolId == school.Id && g.IsActive)
                .Select(g => new TenantGatewaySummaryDto
                {
                    Id = g.Id,
                    GatewayType = g.GatewayType,
                    Provider = g.Provider,
                    IsActive = g.IsActive,
                    IsTestMode = !string.IsNullOrEmpty(g.CredentialsEncrypted) && g.CredentialsEncrypted.Contains("\"Test\":true")
                })
                .ToListAsync();

            // Admin User
            var adminUser = await _context.Users
                .Where(u => branchIds.Contains(u.BranchId) && (u.UserType == UserType.SchoolAdmin || u.RoleId == 2))
                .OrderBy(u => u.Id)
                .Select(u => new TenantAdminUserDto
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Username = u.Username,
                    Email = u.Email,
                    Mobile = u.Mobile,
                    InitialPassword = school.InitialAdminPassword ?? "Admin@123",
                    IsActive = u.IsActive
                })
                .FirstOrDefaultAsync();

            var detail = new TenantDetailDto
            {
                Id = school.Id,
                Name = school.Name,
                Code = school.Code,
                Slug = school.Slug,
                CustomDomain = school.CustomDomain,
                LogoUrl = school.LogoUrl,
                Address = school.Address,
                City = school.City,
                State = school.State,
                Pincode = school.Pincode,
                ContactNumber = school.ContactNumber,
                Email = school.Email,
                Website = school.Website,
                AffiliationNumber = school.AffiliationNumber,
                Status = school.Status ?? (school.IsActive ? "Active" : "Suspended"),
                IsActive = school.IsActive,
                InitialAdminPassword = school.InitialAdminPassword ?? "Admin@123",
                AllowStudentLogin = school.AllowStudentLogin,
                AllowParentLogin = school.AllowParentLogin,
                CreatedOn = school.CreatedOn,
                CurrentSubscription = currentSub,
                SubscriptionHistory = subHistory,
                Modules = modulesList,
                Branches = school.Branches.Select(b => new BranchBriefDto
                {
                    Id = b.Id,
                    Name = b.Name,
                    Code = b.Code,
                    City = b.City,
                    Phone = b.Phone,
                    Email = b.Email,
                    IsActive = b.IsActive
                }).ToList(),
                Gateways = gateways,
                AdminUser = adminUser,
                TotalStudents = totalStudents,
                TotalStaff = totalStaff
            };

            return Ok(ApiResponse<TenantDetailDto>.Ok(detail));
        }

        // ==========================================
        // 3. ATOMIC SCHOOL ONBOARDING WIZARD
        // ==========================================
        [HttpPost("tenants")]
        public async Task<ActionResult<ApiResponse<TenantDetailDto>>> CreateTenant([FromBody] CreateTenantRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            // Validations
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(ApiResponse<TenantDetailDto>.Fail("School name is required."));

            if (string.IsNullOrWhiteSpace(request.Code))
                return BadRequest(ApiResponse<TenantDetailDto>.Fail("School code is required."));

            if (string.IsNullOrWhiteSpace(request.Slug))
                return BadRequest(ApiResponse<TenantDetailDto>.Fail("Subdomain/Slug is required."));

            if (string.IsNullOrWhiteSpace(request.AdminUsername))
                return BadRequest(ApiResponse<TenantDetailDto>.Fail("Initial Admin username is required."));

            if (string.IsNullOrWhiteSpace(request.AdminPassword) || request.AdminPassword.Length < 6)
                return BadRequest(ApiResponse<TenantDetailDto>.Fail("Initial Admin password must be at least 6 characters."));

            var cleanSlug = request.Slug.Trim().ToLower().Replace(" ", "-");
            var cleanCode = request.Code.Trim().ToUpper();

            if (await _context.Schools.AnyAsync(s => s.Slug.ToLower() == cleanSlug))
                return BadRequest(ApiResponse<TenantDetailDto>.Fail($"Subdomain/Slug '{cleanSlug}' is already taken."));

            if (await _context.Schools.AnyAsync(s => s.Code.ToUpper() == cleanCode))
                return BadRequest(ApiResponse<TenantDetailDto>.Fail($"School code '{cleanCode}' already exists."));

            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == request.AdminUsername.Trim().ToLower()))
                return BadRequest(ApiResponse<TenantDetailDto>.Fail($"Username '{request.AdminUsername}' is already taken."));

            var strategy = _context.Database.CreateExecutionStrategy();
            long newSchoolId = 0;

            try
            {
                await strategy.ExecuteAsync(async () =>
                {
                    using var transaction = await _context.Database.BeginTransactionAsync();
                    var actorId = _currentUserService.UserId ?? 1;

                    // 1. Create School
                    var school = new School
                    {
                        Name = request.Name.Trim(),
                        Code = cleanCode,
                        Slug = cleanSlug,
                        LogoUrl = request.LogoUrl,
                        Address = request.Address,
                        City = request.City,
                        State = request.State,
                        Pincode = request.Pincode,
                        ContactNumber = request.ContactNumber,
                        Email = request.Email,
                        Website = request.Website,
                        AffiliationNumber = request.AffiliationNumber,
                        InitialAdminPassword = request.AdminPassword,
                        Status = string.IsNullOrWhiteSpace(request.SubscriptionStatus) ? "Active" : request.SubscriptionStatus,
                        AllowStudentLogin = request.AllowStudentLogin,
                        AllowParentLogin = request.AllowParentLogin,
                        CreatedBy = actorId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.Schools.Add(school);
                    await _context.SaveChangesAsync();

                    // 2. Create Default Branch
                    var branch = new Branch
                    {
                        SchoolId = school.Id,
                        Name = string.IsNullOrWhiteSpace(request.BranchName) ? "Main Campus" : request.BranchName.Trim(),
                        Code = string.IsNullOrWhiteSpace(request.BranchCode) ? "MAIN" : request.BranchCode.Trim().ToUpper(),
                        PrintHeader = school.Name,
                        Address = request.Address,
                        City = request.City,
                        State = request.State,
                        Pincode = request.Pincode,
                        Phone = request.ContactNumber,
                        Email = request.Email,
                        CreatedBy = actorId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.Branches.Add(branch);
                    await _context.SaveChangesAsync();

                    // 3. Create Default Academic Year
                    var academicYear = new AcademicYear
                    {
                        BranchId = branch.Id,
                        Name = string.IsNullOrWhiteSpace(request.AcademicYearName) ? "2026-27" : request.AcademicYearName.Trim(),
                        StartDate = request.AcademicYearStartDate != default ? request.AcademicYearStartDate : new DateTime(2026, 4, 1),
                        EndDate = request.AcademicYearEndDate != default ? request.AcademicYearEndDate : new DateTime(2027, 3, 31),
                        CreatedBy = actorId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.AcademicYears.Add(academicYear);
                    await _context.SaveChangesAsync();

                    // Auto-seed default classes (NUR, LKG, UKG, I to X), sections (A, B), and subjects
                    await SchoolDefaultsHelper.SeedBranchDefaultsAsync(_context, branch.Id, academicYear.Id);

                    // 4. Resolve Subscription Plan
                    SubscriptionPlan? plan = null;
                    if (request.PlanId.HasValue && request.PlanId.Value > 0)
                    {
                        plan = await _context.SubscriptionPlans.FindAsync(request.PlanId.Value);
                    }

                    if (plan == null && !string.IsNullOrWhiteSpace(request.PlanCode))
                    {
                        plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code.ToUpper() == request.PlanCode.Trim().ToUpper());
                    }

                    if (plan == null)
                    {
                        plan = await _context.SubscriptionPlans.FirstOrDefaultAsync() ?? new SubscriptionPlan
                        {
                            Code = "GROWTH",
                            Name = "Growth Plan",
                            PricePerPeriod = 4999m,
                            MaxStudents = 1000,
                            MaxStaff = 75,
                            CreatedBy = actorId,
                            CreatedOn = DateTime.UtcNow,
                            IsActive = true
                        };
                    }

                    // 5. Create Tenant Subscription
                    var subscription = new TenantSubscription
                    {
                        SchoolId = school.Id,
                        PlanId = plan.Id,
                        StartDate = request.SubscriptionStartDate != default ? request.SubscriptionStartDate : DateTime.UtcNow,
                        EndDate = request.SubscriptionEndDate != default ? request.SubscriptionEndDate : DateTime.UtcNow.AddYears(1),
                        CustomMaxStudents = request.CustomMaxStudents ?? plan.MaxStudents,
                        CustomMaxStaff = request.CustomMaxStaff ?? plan.MaxStaff,
                        AmountPaid = request.AmountPaid > 0 ? request.AmountPaid : plan.PricePerPeriod,
                        Status = school.Status,
                        Notes = $"Onboarded via Super Admin Wizard with plan {plan.Name}",
                        CreatedBy = actorId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.TenantSubscriptions.Add(subscription);
                    await _context.SaveChangesAsync();

                    // 6. Setup Tenant Modules
                    var allCatalogs = await _context.ModuleCatalogs.Where(c => c.IsActive).ToListAsync();
                    var enabledCodes = new HashSet<string>(request.EnabledModuleCodes ?? new List<string>(), StringComparer.OrdinalIgnoreCase);

                    // If user didn't select specific modules, use modules included in Plan
                    if (enabledCodes.Count == 0 && !string.IsNullOrWhiteSpace(plan.IncludedModules))
                    {
                        var planMods = plan.IncludedModules.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                        foreach (var pm in planMods) enabledCodes.Add(pm.Trim());
                    }

                    foreach (var cat in allCatalogs)
                    {
                        var isEnabled = cat.IsCore || enabledCodes.Contains(cat.Code);
                        _context.TenantModules.Add(new TenantModule
                        {
                            SchoolId = school.Id,
                            ModuleCode = cat.Code,
                            IsEnabled = isEnabled,
                            CreatedBy = actorId,
                            CreatedOn = DateTime.UtcNow,
                            IsActive = true
                        });
                    }
                    await _context.SaveChangesAsync();

                    // 7. Create School Admin User Account
                    var schoolAdminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "School Admin") ??
                                          await _context.Roles.FirstOrDefaultAsync(r => r.Id == 2);

                    var adminUser = new User
                    {
                        Username = request.AdminUsername.Trim(),
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                        FullName = string.IsNullOrWhiteSpace(request.AdminFullName) ? $"{school.Name} Administrator" : request.AdminFullName.Trim(),
                        Email = request.AdminEmail?.Trim(),
                        Mobile = request.AdminMobile?.Trim(),
                        UserType = UserType.SchoolAdmin,
                        RoleId = schoolAdminRole != null ? schoolAdminRole.Id : 2,
                        BranchId = branch.Id,
                        MustChangePassword = false,
                        CreatedBy = actorId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.Users.Add(adminUser);
                    await _context.SaveChangesAsync();

                    // Commit transaction
                    await transaction.CommitAsync();

                    newSchoolId = school.Id;

                    // Global Audit Log
                    await LogAuditAsync(
                        school.Id,
                        "TENANT_CREATED",
                        "School",
                        school.Id.ToString(),
                        null,
                        new { SchoolName = school.Name, school.Code, school.Slug, Plan = plan.Name, AdminUser = adminUser.Username });
                });

                var createdDetail = await GetTenantById(newSchoolId);
                return CreatedAtAction(nameof(GetTenantById), new { id = newSchoolId }, createdDetail.Value);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<TenantDetailDto>.Fail($"School onboarding failed: {ex.Message}"));
            }

        }

        // ==========================================
        // 4. UPDATE TENANT PROFILE
        // ==========================================
        [HttpPut("tenants/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateTenant(long id, [FromBody] UpdateTenantRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var school = await _context.Schools.FindAsync(id);
            if (school == null)
                return NotFound(ApiResponse<bool>.Fail("School tenant not found."));

            var cleanSlug = request.Slug.Trim().ToLower().Replace(" ", "-");
            if (cleanSlug != school.Slug && await _context.Schools.AnyAsync(s => s.Slug.ToLower() == cleanSlug && s.Id != id))
            {
                return BadRequest(ApiResponse<bool>.Fail($"Slug '{cleanSlug}' is already in use by another school."));
            }

            var oldStatus = school.Status;
            school.Name = request.Name;
            school.Code = request.Code.ToUpper();
            school.Slug = cleanSlug;
            school.CustomDomain = request.CustomDomain;
            school.LogoUrl = request.LogoUrl;
            school.Address = request.Address;
            school.City = request.City;
            school.State = request.State;
            school.Pincode = request.Pincode;
            school.ContactNumber = request.ContactNumber;
            school.Email = request.Email;
            school.Website = request.Website;
            school.AffiliationNumber = request.AffiliationNumber;
            school.Status = request.Status;
            school.IsActive = request.IsActive && request.Status != "Suspended";
            if (request.AllowStudentLogin.HasValue)
            {
                school.AllowStudentLogin = request.AllowStudentLogin.Value;
            }
            if (request.AllowParentLogin.HasValue)
            {
                school.AllowParentLogin = request.AllowParentLogin.Value;
            }
            school.ModifiedBy = _currentUserService.UserId;
            school.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                id,
                "TENANT_UPDATED",
                "School",
                id.ToString(),
                new { OldStatus = oldStatus },
                new { NewStatus = school.Status, school.Name });

            return Ok(ApiResponse<bool>.Ok(true, "Tenant details updated successfully."));
        }

        [HttpPost("tenants/{id}/reset-admin-password")]
        public async Task<ActionResult<ApiResponse<bool>>> ResetTenantAdminPassword(long id, [FromBody] ResetTenantAdminPasswordRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                return BadRequest(ApiResponse<bool>.Fail("Password must be at least 6 characters."));

            var school = await _context.Schools.Include(s => s.Branches).FirstOrDefaultAsync(s => s.Id == id);
            if (school == null)
                return NotFound(ApiResponse<bool>.Fail("School tenant not found."));

            var branchIds = school.Branches.Select(b => b.Id).ToList();
            var adminUser = await _context.Users
                .FirstOrDefaultAsync(u => branchIds.Contains(u.BranchId) && (u.UserType == UserType.SchoolAdmin || u.RoleId == 2));

            if (adminUser == null)
                return NotFound(ApiResponse<bool>.Fail("School admin user not found."));

            adminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            adminUser.ModifiedBy = _currentUserService.UserId;
            adminUser.ModifiedOn = DateTime.UtcNow;

            school.InitialAdminPassword = request.NewPassword;
            school.ModifiedBy = _currentUserService.UserId;
            school.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                id,
                "ADMIN_PASSWORD_RESET",
                "User",
                adminUser.Id.ToString(),
                null,
                new { AdminUser = adminUser.Username, SchoolName = school.Name });

            return Ok(ApiResponse<bool>.Ok(true, "School admin password updated successfully."));
        }

        // ==========================================
        // 5. MODULE MANAGEMENT (TOGGLE PER TENANT)
        // ==========================================
        [HttpPut("tenants/{id}/modules")]
        public async Task<ActionResult<ApiResponse<List<TenantModuleStatusDto>>>> UpdateTenantModules(
            long id,
            [FromBody] UpdateTenantModulesRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var school = await _context.Schools.FindAsync(id);
            if (school == null)
                return NotFound(ApiResponse<List<TenantModuleStatusDto>>.Fail("School tenant not found."));

            var allCatalogs = await _context.ModuleCatalogs.Where(c => c.IsActive).ToListAsync();
            var existingModules = await _context.TenantModules.Where(tm => tm.SchoolId == id).ToListAsync();
            var enabledSet = new HashSet<string>(request.EnabledModuleCodes ?? new List<string>(), StringComparer.OrdinalIgnoreCase);

            foreach (var cat in allCatalogs)
            {
                var isEnabled = cat.IsCore || enabledSet.Contains(cat.Code);
                var existing = existingModules.FirstOrDefault(m => m.ModuleCode.Equals(cat.Code, StringComparison.OrdinalIgnoreCase));

                if (existing != null)
                {
                    existing.IsEnabled = isEnabled;
                    if (isEnabled && existing.DisabledAt.HasValue) existing.DisabledAt = null;
                    if (!isEnabled && !existing.DisabledAt.HasValue) existing.DisabledAt = DateTime.UtcNow;
                    existing.ModifiedBy = _currentUserService.UserId;
                    existing.ModifiedOn = DateTime.UtcNow;
                }
                else
                {
                    _context.TenantModules.Add(new TenantModule
                    {
                        SchoolId = id,
                        ModuleCode = cat.Code,
                        IsEnabled = isEnabled,
                        CreatedBy = _currentUserService.UserId ?? 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                id,
                "MODULES_UPDATED",
                "TenantModule",
                id.ToString(),
                null,
                new { EnabledModules = enabledSet.ToList() });

            // Return updated list
            var updatedList = allCatalogs.Select(c => new TenantModuleStatusDto
            {
                Code = c.Code,
                Name = c.Name,
                Category = c.Category,
                Description = c.Description,
                IsCore = c.IsCore,
                IsEnabled = c.IsCore || enabledSet.Contains(c.Code),
                DisplayOrder = c.DisplayOrder
            }).ToList();

            return Ok(ApiResponse<List<TenantModuleStatusDto>>.Ok(updatedList, "Tenant modules configured successfully."));
        }

        // ==========================================
        // 5B. STUDENT & PARENT PORTAL ACCESS CONTROL
        // ==========================================
        [HttpPut("tenants/{id}/portal-access")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateTenantPortalAccess(
            long id,
            [FromBody] UpdateTenantPortalAccessRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var school = await _context.Schools.FindAsync(id);
            if (school == null)
                return NotFound(ApiResponse<bool>.Fail("School tenant not found."));

            var oldStudentAccess = school.AllowStudentLogin;
            var oldParentAccess = school.AllowParentLogin;

            school.AllowStudentLogin = request.AllowStudentLogin;
            school.AllowParentLogin = request.AllowParentLogin;
            school.ModifiedBy = _currentUserService.UserId;
            school.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                id,
                "PORTAL_ACCESS_UPDATED",
                "School",
                id.ToString(),
                new { AllowStudentLogin = oldStudentAccess, AllowParentLogin = oldParentAccess },
                new { school.AllowStudentLogin, school.AllowParentLogin, school.Name });

            return Ok(ApiResponse<bool>.Ok(true, "Student & Parent login permissions updated successfully."));
        }

        // ==========================================
        // 6. SUBSCRIPTION CONTROL & RENEWAL
        // ==========================================
        [HttpPost("tenants/{id}/subscriptions")]
        public async Task<ActionResult<ApiResponse<TenantSubscriptionDto>>> RenewOrExtendSubscription(
            long id,
            [FromBody] RenewSubscriptionRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var school = await _context.Schools.FindAsync(id);
            if (school == null)
                return NotFound(ApiResponse<TenantSubscriptionDto>.Fail("School tenant not found."));

            var plan = await _context.SubscriptionPlans.FindAsync(request.PlanId);
            if (plan == null)
                return BadRequest(ApiResponse<TenantSubscriptionDto>.Fail("Invalid subscription plan ID."));

            // Deactivate previous active subscriptions
            var existingSubs = await _context.TenantSubscriptions
                .Where(s => s.SchoolId == id && s.IsActive)
                .ToListAsync();

            foreach (var sub in existingSubs)
            {
                sub.IsActive = false;
                sub.ModifiedBy = _currentUserService.UserId;
                sub.ModifiedOn = DateTime.UtcNow;
            }

            var newSub = new TenantSubscription
            {
                SchoolId = id,
                PlanId = plan.Id,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                CustomMaxStudents = request.CustomMaxStudents ?? plan.MaxStudents,
                CustomMaxStaff = request.CustomMaxStaff ?? plan.MaxStaff,
                AmountPaid = request.AmountPaid > 0 ? request.AmountPaid : plan.PricePerPeriod,
                Status = request.Status ?? "Active",
                Notes = request.Notes,
                CreatedBy = _currentUserService.UserId ?? 1,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.TenantSubscriptions.Add(newSub);

            // Update school status if specified
            if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != school.Status)
            {
                school.Status = request.Status;
                school.IsActive = request.Status != "Suspended";
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                id,
                "SUBSCRIPTION_RENEWED",
                "TenantSubscription",
                newSub.Id.ToString(),
                null,
                new { Plan = plan.Name, newSub.StartDate, newSub.EndDate, newSub.AmountPaid, newSub.Status });

            var result = new TenantSubscriptionDto
            {
                Id = newSub.Id,
                PlanId = newSub.PlanId,
                PlanCode = plan.Code,
                PlanName = plan.Name,
                StartDate = newSub.StartDate,
                EndDate = newSub.EndDate,
                CustomMaxStudents = newSub.CustomMaxStudents,
                CustomMaxStaff = newSub.CustomMaxStaff,
                AmountPaid = newSub.AmountPaid,
                Status = newSub.Status,
                Notes = newSub.Notes,
                CreatedOn = newSub.CreatedOn
            };

            return Ok(ApiResponse<TenantSubscriptionDto>.Ok(result, "Subscription renewed and updated successfully."));
        }

        // ==========================================
        // 7. SECURE TENANT IMPERSONATION / SWITCH
        // ==========================================
        [HttpPost("tenants/{id}/impersonate")]
        public async Task<ActionResult<ApiResponse<ImpersonateResponseDto>>> ImpersonateTenant(long id)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var school = await _context.Schools
                .Include(s => s.Branches)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (school == null)
                return NotFound(ApiResponse<ImpersonateResponseDto>.Fail("School tenant not found."));

            var branchIds = school.Branches.Select(b => b.Id).ToList();

            // Find school admin or principal
            var targetUser = await _context.Users
                .Include(u => u.Role)
                    .ThenInclude(r => r!.Permissions)
                .FirstOrDefaultAsync(u => branchIds.Contains(u.BranchId) && (u.UserType == UserType.SchoolAdmin || u.RoleId == 2));

            if (targetUser == null)
            {
                targetUser = await _context.Users
                    .Include(u => u.Role)
                        .ThenInclude(r => r!.Permissions)
                    .FirstOrDefaultAsync(u => branchIds.Contains(u.BranchId) && u.IsActive);
            }

            if (targetUser == null)
            {
                return BadRequest(ApiResponse<ImpersonateResponseDto>.Fail("No active user account found for this school to impersonate."));
            }

            var targetBranch = await _context.Branches.FindAsync(targetUser.BranchId);

            var currentAdminId = _currentUserService.UserId ?? 1;
            var currentAdminName = _currentUserService.Username ?? "SuperAdmin";

            // Generate impersonation token with audit claims
            var extraClaims = new List<Claim>
            {
                new Claim("is_impersonated", "true"),
                new Claim("impersonator_id", currentAdminId.ToString()),
                new Claim("impersonator_name", currentAdminName),
                new Claim("school_id", school.Id.ToString()),
                new Claim("school_name", school.Name),
                new Claim("school_slug", school.Slug)
            };

            var accessToken = _jwtService.GenerateAccessToken(targetUser, extraClaims);
            var refreshToken = _jwtService.GenerateRefreshToken();

            // Save refresh token
            _context.UserRefreshTokens.Add(new UserRefreshToken
            {
                UserId = targetUser.Id,
                Token = refreshToken,
                ExpiresUtc = DateTime.UtcNow.AddHours(4),
                CreatedBy = currentAdminId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            });
            await _context.SaveChangesAsync();

            // Global Audit Log
            await LogAuditAsync(
                school.Id,
                "IMPERSONATION_STARTED",
                "School",
                school.Id.ToString(),
                null,
                new { ImpersonatedUser = targetUser.Username, SchoolName = school.Name },
                wasImpersonated: true,
                impersonatedBy: currentAdminId);

            var activeAcademicYear = await _context.AcademicYears
                .Where(ay => ay.BranchId == targetUser.BranchId && ay.IsActive)
                .OrderByDescending(ay => ay.StartDate)
                .FirstOrDefaultAsync();

            var permissions = targetUser.Role?.Permissions?
                .Where(p => p.IsActive)
                .Select(p => new RolePermissionDto
                {
                    Menu = p.Menu,
                    CanView = p.CanView,
                    CanAdd = p.CanAdd,
                    CanEdit = p.CanEdit,
                    CanDelete = p.CanDelete,
                    CanPrint = p.CanPrint,
                    CanExport = p.CanExport
                }).ToList() ?? new List<RolePermissionDto>();

            var userProfile = new UserProfileDto
            {
                Id = targetUser.Id,
                Username = targetUser.Username,
                FullName = targetUser.FullName,
                Email = targetUser.Email,
                Mobile = targetUser.Mobile,
                UserType = targetUser.UserType,
                RoleId = targetUser.RoleId,
                RoleName = targetUser.Role?.Name ?? "School Admin",
                BranchId = targetUser.BranchId,
                BranchName = targetBranch?.Name,
                AcademicYearId = activeAcademicYear?.Id ?? 0,
                AcademicYearName = activeAcademicYear?.Name,
                MustChangePassword = false
            };

            var response = new ImpersonateResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                SchoolId = school.Id,
                SchoolName = school.Name,
                SchoolSlug = school.Slug,
                User = userProfile,
                Permissions = permissions,
                IsImpersonated = true,
                ImpersonatedBy = currentAdminName,
                ImpersonatorId = currentAdminId
            };

            return Ok(ApiResponse<ImpersonateResponseDto>.Ok(response, $"Impersonating {school.Name} as {targetUser.FullName}."));
        }

        // ==========================================
        // 8. SUBSCRIPTION PLANS CATALOG
        // ==========================================
        [HttpGet("plans")]
        public async Task<ActionResult<ApiResponse<List<SubscriptionPlanDto>>>> GetPlans()
        {
            var plans = await _context.SubscriptionPlans
                .OrderBy(p => p.PricePerPeriod)
                .Select(p => new SubscriptionPlanDto
                {
                    Id = p.Id,
                    Code = p.Code,
                    Name = p.Name,
                    Description = p.Description,
                    BillingPeriod = p.BillingPeriod,
                    PricePerPeriod = p.PricePerPeriod,
                    MaxStudents = p.MaxStudents,
                    MaxStaff = p.MaxStaff,
                    IncludedModules = p.IncludedModules,
                    IsActive = p.IsActive
                })
                .ToListAsync();

            return Ok(ApiResponse<List<SubscriptionPlanDto>>.Ok(plans));
        }

        [HttpPost("plans")]
        public async Task<ActionResult<ApiResponse<SubscriptionPlanDto>>> CreatePlan([FromBody] SaveSubscriptionPlanRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var cleanCode = request.Code.Trim().ToUpper();
            if (await _context.SubscriptionPlans.AnyAsync(p => p.Code.ToUpper() == cleanCode))
                return BadRequest(ApiResponse<SubscriptionPlanDto>.Fail($"Plan with code '{cleanCode}' already exists."));

            var plan = new SubscriptionPlan
            {
                Code = cleanCode,
                Name = request.Name.Trim(),
                Description = request.Description,
                BillingPeriod = request.BillingPeriod,
                PricePerPeriod = request.PricePerPeriod,
                MaxStudents = request.MaxStudents,
                MaxStaff = request.MaxStaff,
                IncludedModules = request.IncludedModules,
                CreatedBy = _currentUserService.UserId ?? 1,
                CreatedOn = DateTime.UtcNow,
                IsActive = request.IsActive
            };

            _context.SubscriptionPlans.Add(plan);
            await _context.SaveChangesAsync();

            await LogAuditAsync(null, "PLAN_CREATED", "SubscriptionPlan", plan.Id.ToString(), null, new { plan.Code, plan.Name });

            return Ok(ApiResponse<SubscriptionPlanDto>.Ok(new SubscriptionPlanDto
            {
                Id = plan.Id,
                Code = plan.Code,
                Name = plan.Name,
                Description = plan.Description,
                BillingPeriod = plan.BillingPeriod,
                PricePerPeriod = plan.PricePerPeriod,
                MaxStudents = plan.MaxStudents,
                MaxStaff = plan.MaxStaff,
                IncludedModules = plan.IncludedModules,
                IsActive = plan.IsActive
            }));
        }

        // ==========================================
        // 9. MODULE CATALOG
        // ==========================================
        [HttpGet("modules/catalog")]
        public async Task<ActionResult<ApiResponse<List<ModuleCatalogDto>>>> GetModuleCatalog()
        {
            var modules = await _context.ModuleCatalogs
                .Where(m => m.IsActive)
                .OrderBy(m => m.DisplayOrder)
                .Select(m => new ModuleCatalogDto
                {
                    Id = m.Id,
                    Code = m.Code,
                    Name = m.Name,
                    Category = m.Category,
                    Description = m.Description,
                    IsCore = m.IsCore,
                    DisplayOrder = m.DisplayOrder,
                    IsEnabled = true
                })
                .ToListAsync();

            return Ok(ApiResponse<List<ModuleCatalogDto>>.Ok(modules));
        }

        // ==========================================
        // 10. GATEWAY CONFIGURATIONS (SMS / WHATSAPP / PAYMENT)
        // ==========================================
        [HttpGet("gateways")]
        public async Task<ActionResult<ApiResponse<List<GatewayConfigDto>>>> GetGateways([FromQuery] long? schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var query = _context.TenantGatewayConfigs.AsNoTracking();
            if (schoolId.HasValue)
            {
                query = query.Where(g => g.SchoolId == schoolId.Value || g.SchoolId == null);
            }

            var configs = await query.Select(g => new GatewayConfigDto
            {
                Id = g.Id,
                SchoolId = g.SchoolId,
                GatewayType = g.GatewayType,
                Provider = g.Provider,
                ConfigJson = g.CredentialsEncrypted,
                IsActive = g.IsActive,
                IsTestMode = !string.IsNullOrEmpty(g.CredentialsEncrypted) && g.CredentialsEncrypted.Contains("\"Test\":true"),
                ModifiedOn = g.ModifiedOn ?? g.CreatedOn
            }).ToListAsync();

            return Ok(ApiResponse<List<GatewayConfigDto>>.Ok(configs));
        }

        [HttpPost("gateways")]
        public async Task<ActionResult<ApiResponse<bool>>> SaveGatewayConfig([FromBody] SaveGatewayConfigRequestDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == request.SchoolId &&
                                         g.GatewayType.ToUpper() == request.GatewayType.ToUpper() &&
                                         g.Provider.ToUpper() == request.Provider.ToUpper());

            if (existing != null)
            {
                existing.CredentialsEncrypted = request.ConfigJson;
                existing.IsActive = request.IsActive;
                existing.IsTenantOverride = request.SchoolId.HasValue;
                existing.ModifiedBy = _currentUserService.UserId;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                _context.TenantGatewayConfigs.Add(new TenantGatewayConfig
                {
                    SchoolId = request.SchoolId,
                    GatewayType = request.GatewayType.ToUpper(),
                    Provider = request.Provider.ToUpper(),
                    CredentialsEncrypted = request.ConfigJson,
                    IsTenantOverride = request.SchoolId.HasValue,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = request.IsActive
                });
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                request.SchoolId,
                "GATEWAY_CONFIGURED",
                "TenantGatewayConfig",
                request.Provider,
                null,
                new { request.GatewayType, request.Provider, request.IsActive, request.IsTestMode });

            return Ok(ApiResponse<bool>.Ok(true, "Gateway configuration saved successfully."));
        }

        // ==========================================
        // 10.1 WHATSAPP MODULE CONFIGURATIONS
        // ==========================================
        [HttpGet("whatsapp-config")]
        public async Task<ActionResult<ApiResponse<WhatsAppModuleConfigDto>>> GetWhatsAppConfig([FromQuery] long? schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var config = await _context.TenantGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "WHATSAPP");

            if (config == null && schoolId.HasValue)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "WHATSAPP");
            }

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<WhatsAppModuleConfigDto>(
                        config.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        parsed.IsEnabled = config.IsActive;
                        return Ok(ApiResponse<WhatsAppModuleConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            return Ok(ApiResponse<WhatsAppModuleConfigDto>.Ok(new WhatsAppModuleConfigDto()));
        }

        [HttpPost("whatsapp-config")]
        public async Task<ActionResult<ApiResponse<bool>>> SaveWhatsAppConfig(
            [FromQuery] long? schoolId,
            [FromBody] WhatsAppModuleConfigDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "WHATSAPP");

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { WriteIndented = false });

            if (existing != null)
            {
                existing.Provider = request.Provider?.ToUpper() ?? "DIRECT_WEB";
                existing.CredentialsEncrypted = json;
                existing.IsActive = request.IsEnabled;
                existing.IsTenantOverride = schoolId.HasValue;
                existing.ModifiedBy = _currentUserService.UserId;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                _context.TenantGatewayConfigs.Add(new TenantGatewayConfig
                {
                    SchoolId = schoolId,
                    GatewayType = "WHATSAPP",
                    Provider = request.Provider?.ToUpper() ?? "DIRECT_WEB",
                    CredentialsEncrypted = json,
                    IsTenantOverride = schoolId.HasValue,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = request.IsEnabled
                });
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                schoolId,
                "WHATSAPP_MODULES_CONFIGURED",
                "TenantGatewayConfig",
                request.Provider ?? "DIRECT_WEB",
                null,
                new { request.IsEnabled, request.Provider });

            return Ok(ApiResponse<bool>.Ok(true, "WhatsApp module configurations saved successfully."));
        }

        // ==========================================
        // 10.2 DYNAMIC ENQUIRY SLIP BUILDER (SCHOOL-WISE)
        // ==========================================
        [HttpGet("enquiry-slip-config")]
        public async Task<ActionResult<ApiResponse<EnquirySlipConfigDto>>> GetEnquirySlipConfig([FromQuery] long? schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            string schoolName = "Platform Default (All Schools)";
            if (schoolId.HasValue)
            {
                var s = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(x => x.Id == schoolId.Value);
                if (s != null) schoolName = s.Name;
            }

            var schoolConfig = await _context.TenantGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ENQUIRY_SLIP");

            bool isOverride = schoolConfig != null && schoolId.HasValue;

            if (schoolConfig == null && schoolId.HasValue)
            {
                // Fallback to Global default template
                schoolConfig = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "ENQUIRY_SLIP");
            }

            if (schoolConfig != null && !string.IsNullOrWhiteSpace(schoolConfig.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<EnquirySlipConfigDto>(
                        schoolConfig.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        parsed.SchoolId = schoolId;
                        parsed.SchoolName = schoolName;
                        parsed.IsSchoolOverride = isOverride;
                        var defaultSecs = EnquirySlipConfigDto.GetDefaultSections();
                        if (parsed.Sections == null || parsed.Sections.Count == 0)
                        {
                            parsed.Sections = defaultSecs;
                        }
                        else
                        {
                            foreach (var ds in defaultSecs)
                            {
                                if (!parsed.Sections.Any(s => s.Key == ds.Key))
                                {
                                    parsed.Sections.Add(ds);
                                }
                            }
                        }
                        return Ok(ApiResponse<EnquirySlipConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            var defaultConfig = new EnquirySlipConfigDto
            {
                SchoolId = schoolId,
                SchoolName = schoolName,
                IsSchoolOverride = false
            };

            return Ok(ApiResponse<EnquirySlipConfigDto>.Ok(defaultConfig));
        }

        [HttpPost("enquiry-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> SaveEnquirySlipConfig(
            [FromQuery] long? schoolId,
            [FromBody] EnquirySlipConfigDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ENQUIRY_SLIP");

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { WriteIndented = false });

            if (existing != null)
            {
                existing.Provider = "SLIP_BUILDER";
                existing.CredentialsEncrypted = json;
                existing.IsActive = true;
                existing.IsTenantOverride = schoolId.HasValue;
                existing.ModifiedBy = _currentUserService.UserId;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                _context.TenantGatewayConfigs.Add(new TenantGatewayConfig
                {
                    SchoolId = schoolId,
                    GatewayType = "ENQUIRY_SLIP",
                    Provider = "SLIP_BUILDER",
                    CredentialsEncrypted = json,
                    IsTenantOverride = schoolId.HasValue,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                schoolId,
                "ENQUIRY_SLIP_CONFIGURED",
                "TenantGatewayConfig",
                schoolId.HasValue ? $"School #{schoolId}" : "Platform Default",
                null,
                new { schoolId, request.PrimaryColor, request.FontFamily });

            return Ok(ApiResponse<bool>.Ok(true, "Enquiry slip layout & styling saved successfully."));
        }

        [HttpDelete("enquiry-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> ResetEnquirySlipConfig([FromQuery] long schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ENQUIRY_SLIP");

            if (existing != null)
            {
                _context.TenantGatewayConfigs.Remove(existing);
                await _context.SaveChangesAsync();

                await LogAuditAsync(
                    schoolId,
                    "ENQUIRY_SLIP_RESET",
                    "TenantGatewayConfig",
                    $"School #{schoolId}",
                    null,
                    new { schoolId, Action = "Reset to Default" });
            }

            return Ok(ApiResponse<bool>.Ok(true, "School enquiry slip reset to platform default successfully."));
        }

        // ==========================================
        // 10.3 DYNAMIC FEE RECEIPT SLIP BUILDER (SCHOOL-WISE)
        // ==========================================
        [HttpGet("fee-slip-config")]
        public async Task<ActionResult<ApiResponse<FeeSlipConfigDto>>> GetFeeSlipConfig([FromQuery] long? schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            string schoolName = "Platform Default (All Schools)";
            if (schoolId.HasValue)
            {
                var s = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(x => x.Id == schoolId.Value);
                if (s != null) schoolName = s.Name;
            }

            var schoolConfig = await _context.TenantGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "FEE_RECEIPT_SLIP");

            bool isOverride = schoolConfig != null && schoolId.HasValue;

            if (schoolConfig == null && schoolId.HasValue)
            {
                schoolConfig = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "FEE_RECEIPT_SLIP");
            }

            if (schoolConfig != null && !string.IsNullOrWhiteSpace(schoolConfig.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<FeeSlipConfigDto>(
                        schoolConfig.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        parsed.SchoolId = schoolId;
                        parsed.SchoolName = schoolName;
                        parsed.IsSchoolOverride = isOverride;
                        var defaultSecs = FeeSlipConfigDto.GetDefaultSections();
                        if (parsed.Sections == null || parsed.Sections.Count == 0)
                        {
                            parsed.Sections = defaultSecs;
                        }
                        else
                        {
                            foreach (var ds in defaultSecs)
                            {
                                if (!parsed.Sections.Any(s => s.Key == ds.Key))
                                {
                                    parsed.Sections.Add(ds);
                                }
                            }
                        }
                        return Ok(ApiResponse<FeeSlipConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            var defaultConfig = new FeeSlipConfigDto
            {
                SchoolId = schoolId,
                SchoolName = schoolName,
                IsSchoolOverride = false
            };

            return Ok(ApiResponse<FeeSlipConfigDto>.Ok(defaultConfig));
        }

        [HttpPost("fee-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> SaveFeeSlipConfig(
            [FromQuery] long? schoolId,
            [FromBody] FeeSlipConfigDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "FEE_RECEIPT_SLIP");

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { WriteIndented = false });

            if (existing != null)
            {
                existing.Provider = "FEE_SLIP_BUILDER";
                existing.CredentialsEncrypted = json;
                existing.IsActive = true;
                existing.IsTenantOverride = schoolId.HasValue;
                existing.ModifiedBy = _currentUserService.UserId;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                _context.TenantGatewayConfigs.Add(new TenantGatewayConfig
                {
                    SchoolId = schoolId,
                    GatewayType = "FEE_RECEIPT_SLIP",
                    Provider = "FEE_SLIP_BUILDER",
                    CredentialsEncrypted = json,
                    IsTenantOverride = schoolId.HasValue,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                schoolId,
                "FEE_SLIP_CONFIGURED",
                "TenantGatewayConfig",
                schoolId.HasValue ? $"School #{schoolId}" : "Platform Default",
                null,
                new { schoolId, request.PrimaryColor, request.FontFamily });

            return Ok(ApiResponse<bool>.Ok(true, "Fee receipt slip layout & styling saved successfully."));
        }

        [HttpDelete("fee-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> ResetFeeSlipConfig([FromQuery] long schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "FEE_RECEIPT_SLIP");

            if (existing != null)
            {
                _context.TenantGatewayConfigs.Remove(existing);
                await _context.SaveChangesAsync();

                await LogAuditAsync(
                    schoolId,
                    "FEE_SLIP_RESET",
                    "TenantGatewayConfig",
                    $"School #{schoolId}",
                    null,
                    new { schoolId, Action = "Reset to Default" });
            }

            return Ok(ApiResponse<bool>.Ok(true, "School fee receipt slip reset to platform default successfully."));
        }

        // ==========================================
        // 10.4 DYNAMIC ADMISSION SLIP BUILDER (SCHOOL-WISE)
        // ==========================================
        [HttpGet("admission-slip-config")]
        public async Task<ActionResult<ApiResponse<AdmissionSlipConfigDto>>> GetAdmissionSlipConfig([FromQuery] long? schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            string schoolName = "Platform Default (All Schools)";
            if (schoolId.HasValue)
            {
                var s = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(x => x.Id == schoolId.Value);
                if (s != null) schoolName = s.Name;
            }

            var schoolConfig = await _context.TenantGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ADMISSION_SLIP");

            bool isOverride = schoolConfig != null && schoolId.HasValue;

            if (schoolConfig == null && schoolId.HasValue)
            {
                schoolConfig = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "ADMISSION_SLIP");
            }

            if (schoolConfig != null && !string.IsNullOrWhiteSpace(schoolConfig.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<AdmissionSlipConfigDto>(
                        schoolConfig.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        parsed.SchoolId = schoolId;
                        parsed.SchoolName = schoolName;
                        parsed.IsSchoolOverride = isOverride;
                        var defaultSecs = AdmissionSlipConfigDto.GetDefaultSections();
                        if (parsed.Sections == null || parsed.Sections.Count == 0)
                        {
                            parsed.Sections = defaultSecs;
                        }
                        else
                        {
                            foreach (var ds in defaultSecs)
                            {
                                if (!parsed.Sections.Any(s => s.Key == ds.Key))
                                {
                                    parsed.Sections.Add(ds);
                                }
                            }
                        }
                        return Ok(ApiResponse<AdmissionSlipConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            var defaultConfig = new AdmissionSlipConfigDto
            {
                SchoolId = schoolId,
                SchoolName = schoolName,
                IsSchoolOverride = false
            };

            return Ok(ApiResponse<AdmissionSlipConfigDto>.Ok(defaultConfig));
        }

        [HttpPost("admission-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> SaveAdmissionSlipConfig(
            [FromQuery] long? schoolId,
            [FromBody] AdmissionSlipConfigDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ADMISSION_SLIP");

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { WriteIndented = false });

            if (existing != null)
            {
                existing.Provider = "ADMISSION_SLIP_BUILDER";
                existing.CredentialsEncrypted = json;
                existing.IsActive = true;
                existing.IsTenantOverride = schoolId.HasValue;
                existing.ModifiedBy = _currentUserService.UserId;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                _context.TenantGatewayConfigs.Add(new TenantGatewayConfig
                {
                    SchoolId = schoolId,
                    GatewayType = "ADMISSION_SLIP",
                    Provider = "ADMISSION_SLIP_BUILDER",
                    CredentialsEncrypted = json,
                    IsTenantOverride = schoolId.HasValue,
                    CreatedBy = _currentUserService.UserId ?? 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                schoolId,
                "ADMISSION_SLIP_CONFIGURED",
                "TenantGatewayConfig",
                schoolId.HasValue ? $"School #{schoolId}" : "Platform Default",
                null,
                new { schoolId, request.PrimaryColor, request.FontFamily });

            return Ok(ApiResponse<bool>.Ok(true, "Admission slip layout & styling saved successfully."));
        }

        [HttpDelete("admission-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> ResetAdmissionSlipConfig([FromQuery] long schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "ADMISSION_SLIP");

            if (existing != null)
            {
                _context.TenantGatewayConfigs.Remove(existing);
                await _context.SaveChangesAsync();

                await LogAuditAsync(
                    schoolId,
                    "ADMISSION_SLIP_RESET",
                    "TenantGatewayConfig",
                    $"School #{schoolId}",
                    null,
                    new { schoolId, Action = "Reset to Default" });
            }

            return Ok(ApiResponse<bool>.Ok(true, "School admission slip reset to platform default successfully."));
        }

        // ==========================================
        // 10.5 DYNAMIC INVENTORY STORE & SLIP BUILDER
        // ==========================================
        [HttpGet("inventory-slip-config")]
        public async Task<ActionResult<ApiResponse<InventorySlipConfigDto>>> GetInventorySlipConfig([FromQuery] long? schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            string schoolName = "Global Platform Default";
            if (schoolId.HasValue)
            {
                var school = await _context.Schools.FindAsync(schoolId.Value);
                if (school != null)
                    schoolName = school.Name;
            }

            var schoolConfig = await _context.TenantGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "INVENTORY_SLIP");

            bool isOverride = schoolConfig != null && schoolId.HasValue;

            if (schoolConfig == null && schoolId.HasValue)
            {
                schoolConfig = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "INVENTORY_SLIP");
            }

            if (schoolConfig != null && !string.IsNullOrWhiteSpace(schoolConfig.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<InventorySlipConfigDto>(
                        schoolConfig.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        parsed.SchoolId = schoolId;
                        parsed.SchoolName = schoolName;
                        parsed.IsSchoolOverride = isOverride;
                        return Ok(ApiResponse<InventorySlipConfigDto>.Ok(parsed));
                    }
                }
                catch { }
            }

            var defaultConfig = new InventorySlipConfigDto
            {
                SchoolId = schoolId,
                SchoolName = schoolName,
                IsSchoolOverride = false
            };

            return Ok(ApiResponse<InventorySlipConfigDto>.Ok(defaultConfig));
        }

        [HttpPost("inventory-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> SaveInventorySlipConfig(
            [FromQuery] long? schoolId,
            [FromBody] InventorySlipConfigDto request)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "INVENTORY_SLIP");

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { WriteIndented = false });

            if (existing != null)
            {
                existing.Provider = "INVENTORY_SLIP_BUILDER";
                existing.CredentialsEncrypted = json;
                existing.IsActive = true;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            else
            {
                _context.TenantGatewayConfigs.Add(new TenantGatewayConfig
                {
                    SchoolId = schoolId,
                    GatewayType = "INVENTORY_SLIP",
                    Provider = "INVENTORY_SLIP_BUILDER",
                    CredentialsEncrypted = json,
                    IsTenantOverride = schoolId.HasValue,
                    IsActive = true,
                    CreatedOn = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            await LogAuditAsync(
                schoolId,
                "INVENTORY_SLIP_CONFIGURED",
                "TenantGatewayConfig",
                schoolId.HasValue ? $"School #{schoolId}" : "Platform Default",
                null,
                new { schoolId, request.StoreName, request.GstinNumber, request.PrintFormat });

            return Ok(ApiResponse<bool>.Ok(true, "Inventory store profile & slip setup saved successfully."));
        }

        [HttpDelete("inventory-slip-config")]
        public async Task<ActionResult<ApiResponse<bool>>> ResetInventorySlipConfig([FromQuery] long schoolId)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var existing = await _context.TenantGatewayConfigs
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "INVENTORY_SLIP");

            if (existing != null)
            {
                _context.TenantGatewayConfigs.Remove(existing);
                await _context.SaveChangesAsync();

                await LogAuditAsync(
                    schoolId,
                    "INVENTORY_SLIP_RESET",
                    "TenantGatewayConfig",
                    $"School #{schoolId}",
                    null,
                    new { schoolId, Action = "Reset to Default" });
            }

            return Ok(ApiResponse<bool>.Ok(true, "School inventory store profile reset to platform default successfully."));
        }

        // ==========================================
        // 11. GLOBAL AUDIT TRAIL
        // ==========================================
        [HttpGet("audit-logs")]
        public async Task<ActionResult<ApiResponse<List<GlobalAuditLogDto>>>> GetAuditLogs(
            [FromQuery] long? schoolId,
            [FromQuery] int limit = 50)
        {
            if (!IsSuperAdmin())
                return Forbid();

            var query = _context.GlobalAuditLogs
                .Include(a => a.School)
                .AsNoTracking();

            if (schoolId.HasValue)
            {
                query = query.Where(a => a.SchoolId == schoolId.Value);
            }

            var logs = await query
                .OrderByDescending(a => a.CreatedOn)
                .Take(Math.Min(limit, 100))
                .Select(a => new GlobalAuditLogDto
                {
                    Id = a.Id,
                    SchoolId = a.SchoolId,
                    SchoolName = a.School != null ? a.School.Name : "Platform Wide",
                    ActorUserId = a.ActorUserId,
                    ActorUsername = a.ActorUsername,
                    Action = a.Action,
                    Module = a.Module,
                    EntityName = a.EntityName,
                    RecordId = a.RecordId,
                    IpAddress = a.IpAddress,
                    WasImpersonated = a.WasImpersonated,
                    CreatedOn = a.CreatedOn
                })
                .ToListAsync();

            return Ok(ApiResponse<List<GlobalAuditLogDto>>.Ok(logs));
        }
    }
}
