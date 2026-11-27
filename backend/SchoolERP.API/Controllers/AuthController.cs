using System;
using System.Linq;
using System.Security.Claims;
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

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IJwtTokenService _jwtService;
        private readonly ICurrentUserService _currentUserService;

        public AuthController(
            ApplicationDbContext context,
            IJwtTokenService jwtService,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _jwtService = jwtService;
            _currentUserService = currentUserService;
        }

        [HttpGet("schools")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<List<PublicSchoolItemDto>>>> GetPublicSchools()
        {
            var schools = await _context.Schools
                .Where(s => s.Status == "Active")
                .OrderBy(s => s.Name)
                .Select(s => new PublicSchoolItemDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Code = s.Code,
                    Slug = s.Slug,
                    LogoUrl = s.LogoUrl,
                    City = s.City
                })
                .ToListAsync();

            return Ok(ApiResponse<List<PublicSchoolItemDto>>.Ok(schools));
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(ApiResponse<LoginResponseDto>.Fail("Username and password are required."));
            }

            var usernameInput = request.Username.Trim();

            // Resolve target school if provided
            long? targetSchoolId = request.SchoolId;
            if (!string.IsNullOrWhiteSpace(request.SchoolCode))
            {
                var sCode = request.SchoolCode.Trim().ToLower();
                var matchedSchool = await _context.Schools
                    .FirstOrDefaultAsync(s => s.Code.ToLower() == sCode || s.Slug.ToLower() == sCode);
                if (matchedSchool != null)
                {
                    targetSchoolId = matchedSchool.Id;
                }
                else
                {
                    return BadRequest(ApiResponse<LoginResponseDto>.Fail($"School with code '{request.SchoolCode}' not found. Please verify your school code."));
                }
            }

            User? user = null;

            if (targetSchoolId.HasValue && targetSchoolId.Value > 0)
            {
                var branchIds = await _context.Branches
                    .Where(b => b.SchoolId == targetSchoolId.Value)
                    .Select(b => b.Id)
                    .ToListAsync();

                // 1. School-specific Student check
                var studentMatch = await _context.Students
                    .FirstOrDefaultAsync(s => branchIds.Contains(s.BranchId) &&
                                              (s.AdmissionNo == usernameInput || s.AdmissionNo.Replace("/", "").ToLower() == usernameInput.Replace("/", "").ToLower()));

                if (studentMatch != null)
                {
                    user = await _context.Users
                        .Include(u => u.Role)
                        .ThenInclude(r => r!.Permissions)
                        .FirstOrDefaultAsync(u => u.UserType == UserType.Student && u.LinkedEntityId == studentMatch.Id);

                    if (user == null)
                    {
                        var studentRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Student");
                        if (studentRole == null)
                        {
                            studentRole = new Role { Name = "Student", Description = "Student Portal Role", IsSystemRole = true, CreatedBy = 1, IsActive = true };
                            _context.Roles.Add(studentRole);
                            await _context.SaveChangesAsync();
                        }

                        var schoolInfo = await _context.Schools.FirstOrDefaultAsync(s => s.Id == targetSchoolId.Value);
                        var sCode = schoolInfo?.Code ?? $"SCH{targetSchoolId.Value}";
                        var uniqueUsername = $"{sCode}_{studentMatch.AdmissionNo}";
                        if (await _context.Users.AnyAsync(u => u.Username == uniqueUsername))
                        {
                            uniqueUsername = $"{sCode}_{studentMatch.AdmissionNo}_{studentMatch.Id}";
                        }

                        user = new User
                        {
                            Username = uniqueUsername,
                            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                            FullName = studentMatch.FullName,
                            UserType = UserType.Student,
                            RoleId = studentRole.Id,
                            BranchId = studentMatch.BranchId,
                            LinkedEntityId = studentMatch.Id,
                            MustChangePassword = false,
                            IsActive = true,
                            CreatedBy = 1,
                            CreatedOn = DateTime.UtcNow
                        };
                        _context.Users.Add(user);
                        await _context.SaveChangesAsync();
                    }
                }
                else
                {
                    // 2. School-specific Parent check
                    var guardianMatch = await _context.Set<StudentGuardian>()
                        .Include(g => g.Student)
                        .FirstOrDefaultAsync(g => g.Student != null && branchIds.Contains(g.Student.BranchId) &&
                                                  (g.Mobile == usernameInput || (g.Email != null && g.Email == usernameInput)));

                    if (guardianMatch != null && guardianMatch.Student != null)
                    {
                        user = await _context.Users
                            .Include(u => u.Role)
                            .ThenInclude(r => r!.Permissions)
                            .FirstOrDefaultAsync(u => u.UserType == UserType.Parent && u.LinkedEntityId == guardianMatch.StudentId);

                        if (user == null)
                        {
                            var parentRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Parent");
                            if (parentRole == null)
                            {
                                parentRole = new Role { Name = "Parent", Description = "Parent Portal Role", IsSystemRole = true, CreatedBy = 1, IsActive = true };
                                _context.Roles.Add(parentRole);
                                await _context.SaveChangesAsync();
                            }

                            var schoolInfo = await _context.Schools.FirstOrDefaultAsync(s => s.Id == targetSchoolId.Value);
                            var sCode = schoolInfo?.Code ?? $"SCH{targetSchoolId.Value}";
                            var candidateParentUsername = $"{sCode}_P_{guardianMatch.Mobile ?? guardianMatch.Id.ToString()}";
                            if (await _context.Users.AnyAsync(u => u.Username == candidateParentUsername))
                            {
                                candidateParentUsername = $"{sCode}_P_{guardianMatch.Mobile ?? guardianMatch.Id.ToString()}_{guardianMatch.Id}";
                            }

                            user = new User
                            {
                                Username = candidateParentUsername,
                                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                                FullName = guardianMatch.Name,
                                Mobile = guardianMatch.Mobile,
                                Email = guardianMatch.Email,
                                UserType = UserType.Parent,
                                RoleId = parentRole.Id,
                                BranchId = guardianMatch.Student.BranchId,
                                LinkedEntityId = guardianMatch.StudentId,
                                MustChangePassword = false,
                                IsActive = true,
                                CreatedBy = 1,
                                CreatedOn = DateTime.UtcNow
                            };
                            _context.Users.Add(user);
                            await _context.SaveChangesAsync();
                        }
                    }
                    else
                    {
                        // 3. School-specific Staff check
                        user = await _context.Users
                            .Include(u => u.Role)
                            .ThenInclude(r => r!.Permissions)
                            .FirstOrDefaultAsync(u => (u.Username == usernameInput || u.Email == usernameInput || u.Mobile == usernameInput) &&
                                                      (u.BranchId == 0 || branchIds.Contains(u.BranchId)));
                    }
                }
            }
            else
            {
                // No School specified - standard search
                var existingUsers = await _context.Users
                    .Include(u => u.Role)
                    .ThenInclude(r => r!.Permissions)
                    .Where(u => u.Username == usernameInput || u.Email == usernameInput || u.Mobile == usernameInput)
                    .ToListAsync();

                if (existingUsers.Count == 1)
                {
                    user = existingUsers.First();
                }
                else if (existingUsers.Count > 1)
                {
                    return BadRequest(ApiResponse<LoginResponseDto>.Fail("Multiple school accounts found for this user. Please select your school to log in."));
                }
                else
                {
                    // Check student match across all schools
                    var studentMatches = await _context.Students
                        .Where(s => s.AdmissionNo == usernameInput || s.AdmissionNo.Replace("/", "").ToLower() == usernameInput.Replace("/", "").ToLower())
                        .ToListAsync();

                    if (studentMatches.Count > 1)
                    {
                        return BadRequest(ApiResponse<LoginResponseDto>.Fail("Multiple schools found with this Admission Number. Please select your school to log in."));
                    }
                    else if (studentMatches.Count == 1)
                    {
                        var studentMatch = studentMatches.First();
                        user = await _context.Users
                            .Include(u => u.Role)
                            .ThenInclude(r => r!.Permissions)
                            .FirstOrDefaultAsync(u => u.UserType == UserType.Student && u.LinkedEntityId == studentMatch.Id);

                        if (user == null)
                        {
                            var studentRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Student");
                            if (studentRole == null)
                            {
                                studentRole = new Role { Name = "Student", Description = "Student Portal Role", IsSystemRole = true, CreatedBy = 1, IsActive = true };
                                _context.Roles.Add(studentRole);
                                await _context.SaveChangesAsync();
                            }

                            var stBranch = await _context.Branches.Include(b => b.School).FirstOrDefaultAsync(b => b.Id == studentMatch.BranchId);
                            var sCode = stBranch?.School?.Code ?? $"SCH{studentMatch.BranchId}";
                            var uniqueUsername = $"{sCode}_{studentMatch.AdmissionNo}";
                            if (await _context.Users.AnyAsync(u => u.Username == uniqueUsername))
                            {
                                uniqueUsername = $"{sCode}_{studentMatch.AdmissionNo}_{studentMatch.Id}";
                            }

                            user = new User
                            {
                                Username = uniqueUsername,
                                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                                FullName = studentMatch.FullName,
                                UserType = UserType.Student,
                                RoleId = studentRole.Id,
                                BranchId = studentMatch.BranchId,
                                LinkedEntityId = studentMatch.Id,
                                MustChangePassword = false,
                                IsActive = true,
                                CreatedBy = 1,
                                CreatedOn = DateTime.UtcNow
                            };
                            _context.Users.Add(user);
                            await _context.SaveChangesAsync();
                        }
                    }
                    else
                    {
                        // Check Guardian match across all schools
                        var guardianMatches = await _context.Set<StudentGuardian>()
                            .Include(g => g.Student)
                            .Where(g => g.Student != null && (g.Mobile == usernameInput || (g.Email != null && g.Email == usernameInput)))
                            .ToListAsync();

                        if (guardianMatches.Count > 1)
                        {
                            return BadRequest(ApiResponse<LoginResponseDto>.Fail("Multiple school accounts found for this mobile number. Please select your school to log in."));
                        }
                        else if (guardianMatches.Count == 1)
                        {
                            var guardianMatch = guardianMatches.First();
                            user = await _context.Users
                                .Include(u => u.Role)
                                .ThenInclude(r => r!.Permissions)
                                .FirstOrDefaultAsync(u => u.UserType == UserType.Parent && u.LinkedEntityId == guardianMatch.StudentId);

                            if (user == null)
                            {
                                var parentRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Parent");
                                if (parentRole == null)
                                {
                                    parentRole = new Role { Name = "Parent", Description = "Parent Portal Role", IsSystemRole = true, CreatedBy = 1, IsActive = true };
                                    _context.Roles.Add(parentRole);
                                    await _context.SaveChangesAsync();
                                }

                                var gBranch = await _context.Branches.Include(b => b.School).FirstOrDefaultAsync(b => b.Id == guardianMatch.Student!.BranchId);
                                var sCode = gBranch?.School?.Code ?? "SCH";
                                var candidateParentUsername = $"{sCode}_P_{guardianMatch.Mobile ?? guardianMatch.Id.ToString()}";

                                user = new User
                                {
                                    Username = candidateParentUsername,
                                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                                    FullName = guardianMatch.Name,
                                    Mobile = guardianMatch.Mobile,
                                    Email = guardianMatch.Email,
                                    UserType = UserType.Parent,
                                    RoleId = parentRole.Id,
                                    BranchId = guardianMatch.Student!.BranchId,
                                    LinkedEntityId = guardianMatch.StudentId,
                                    MustChangePassword = false,
                                    IsActive = true,
                                    CreatedBy = 1,
                                    CreatedOn = DateTime.UtcNow
                                };
                                _context.Users.Add(user);
                                await _context.SaveChangesAsync();
                            }
                        }
                    }
                }
            }

            if (user == null)
            {
                return Unauthorized(ApiResponse<LoginResponseDto>.Fail("Invalid username, mobile, or admission number."));
            }

            // BR-1.2: 5 consecutive wrong attempts lock the account for 15 minutes
            if (user.IsLocked && user.LockoutEndUtc.HasValue && user.LockoutEndUtc.Value > DateTime.UtcNow)
            {
                var remainingMinutes = Math.Ceiling((user.LockoutEndUtc.Value - DateTime.UtcNow).TotalMinutes);
                return StatusCode(423, ApiResponse<LoginResponseDto>.Fail($"Account is temporarily locked. Try again in {remainingMinutes} minutes."));
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                {
                    user.IsLocked = true;
                    user.LockoutEndUtc = DateTime.UtcNow.AddMinutes(15);
                }
                await _context.SaveChangesAsync();
                return Unauthorized(ApiResponse<LoginResponseDto>.Fail("Invalid username or password."));
            }

            // Reset failed login attempts on successful authentication
            user.FailedLoginAttempts = 0;
            user.IsLocked = false;
            user.LockoutEndUtc = null;

            // Check School-level Student & Parent Portal Permissions
            if (user.UserType == UserType.Student || user.UserType == UserType.Parent)
            {
                var userBranch = await _context.Branches
                    .Include(b => b.School)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b => b.Id == user.BranchId);

                if (userBranch?.School != null)
                {
                    if (user.UserType == UserType.Student && !userBranch.School.AllowStudentLogin)
                    {
                        return StatusCode(403, ApiResponse<LoginResponseDto>.Fail("Student portal login has been disabled for your school. Please contact your school administration."));
                    }

                    if (user.UserType == UserType.Parent && !userBranch.School.AllowParentLogin)
                    {
                        return StatusCode(403, ApiResponse<LoginResponseDto>.Fail("Parent portal login has been disabled for your school. Please contact your school administration."));
                    }
                }
            }

            // Generate JWT tokens
            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken();

            // Save refresh token
            var tokenEntity = new UserRefreshToken
            {
                UserId = user.Id,
                Token = refreshToken,
                ExpiresUtc = DateTime.UtcNow.AddDays(7),
                IsRevoked = false
            };
            _context.UserRefreshTokens.Add(tokenEntity);

            // Audit log login (FR-1.9)
            _context.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id,
                Username = user.Username,
                Action = "Login",
                Module = "Authentication",
                EntityName = "User",
                RecordId = user.Id.ToString(),
                IpAddress = _currentUserService.IpAddress,
                BranchId = user.BranchId
            });

            await _context.SaveChangesAsync();

            var permissions = user.Role?.Permissions.Select(p => new RolePermissionDto
            {
                Menu = p.Menu,
                CanView = p.CanView,
                CanAdd = p.CanAdd,
                CanEdit = p.CanEdit,
                CanDelete = p.CanDelete,
                CanPrint = p.CanPrint,
                CanExport = p.CanExport
            }).ToList() ?? new List<RolePermissionDto>();

            var branch = await _context.Branches.Include(b => b.School).AsNoTracking().FirstOrDefaultAsync(b => b.Id == user.BranchId);
            var fullAddress = branch != null 
                ? string.Join(", ", new[] { branch.Address ?? branch.School?.Address, branch.City ?? branch.School?.City, branch.State ?? branch.School?.State, branch.Pincode ?? branch.School?.Pincode }.Where(s => !string.IsNullOrWhiteSpace(s)))
                : string.Empty;

            var branchActiveYear = await _context.AcademicYears
                .Where(ay => ay.BranchId == user.BranchId && ay.IsActive)
                .OrderByDescending(ay => ay.IsCurrent)
                .ThenByDescending(ay => ay.Id)
                .FirstOrDefaultAsync();

            var userYearId = branchActiveYear?.Id ?? 1;
            var userYearName = branchActiveYear?.Name ?? "2026-27";

            var response = new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new UserProfileDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    FullName = user.FullName,
                    Email = user.Email,
                    Mobile = user.Mobile,
                    UserType = user.UserType,
                    RoleId = user.RoleId,
                    RoleName = user.Role?.Name ?? "",
                    SchoolId = branch?.SchoolId ?? 0,
                    SchoolName = branch?.School?.Name ?? branch?.Name,
                    SchoolLogoUrl = branch?.LogoUrl ?? branch?.School?.LogoUrl,
                    SchoolAddress = fullAddress,
                    SchoolPhone = branch?.Phone ?? branch?.School?.ContactNumber,
                    SchoolAlternatePhone = branch?.AlternatePhone ?? branch?.School?.AlternateContactNumber,
                    SchoolEmail = branch?.Email ?? branch?.School?.Email,
                    BranchId = user.BranchId,
                    BranchName = branch?.Name,
                    AcademicYearId = userYearId,
                    AcademicYearName = userYearName,
                    LinkedEntityId = user.LinkedEntityId,
                    MustChangePassword = user.MustChangePassword,
                    CanGiveDiscount = user.CanGiveDiscount,
                    MaxDiscountLimit = user.MaxDiscountLimit
                },
                Permissions = permissions
            };

            SchoolERP.API.Helpers.UserActivityTracker.RecordActivity(user.Id);
            return Ok(ApiResponse<LoginResponseDto>.Ok(response, "Login successful."));
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<RefreshTokenRequestDto>>> RefreshToken([FromBody] RefreshTokenRequestDto request)
        {
            var principal = _jwtService.GetPrincipalFromExpiredToken(request.AccessToken);
            if (principal == null)
            {
                return BadRequest(ApiResponse<RefreshTokenRequestDto>.Fail("Invalid access token."));
            }

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!long.TryParse(userIdClaim, out var userId))
            {
                return BadRequest(ApiResponse<RefreshTokenRequestDto>.Fail("Invalid user token."));
            }

            var savedToken = await _context.UserRefreshTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Token == request.RefreshToken && !t.IsRevoked);

            if (savedToken == null || savedToken.ExpiresUtc < DateTime.UtcNow)
            {
                return Unauthorized(ApiResponse<RefreshTokenRequestDto>.Fail("Invalid or expired refresh token."));
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null || !user.IsActive)
            {
                return Unauthorized(ApiResponse<RefreshTokenRequestDto>.Fail("User not found or deactivated."));
            }

            // Revoke current token and generate new ones (token rotation)
            savedToken.IsRevoked = true;
            savedToken.RevokedUtc = DateTime.UtcNow;

            var newAccessToken = _jwtService.GenerateAccessToken(user);
            var newRefreshToken = _jwtService.GenerateRefreshToken();

            savedToken.ReplacedByToken = newRefreshToken;

            _context.UserRefreshTokens.Add(new UserRefreshToken
            {
                UserId = user.Id,
                Token = newRefreshToken,
                ExpiresUtc = DateTime.UtcNow.AddDays(7),
                IsRevoked = false
            });

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<RefreshTokenRequestDto>.Ok(new RefreshTokenRequestDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken
            }, "Token refreshed successfully."));
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<ActionResult<ApiResponse>> ChangePassword([FromBody] ChangePasswordDto request)
        {
            var userId = _currentUserService.UserId;
            if (!userId.HasValue) return Unauthorized(ApiResponse.Fail("User not authenticated."));

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user == null) return NotFound(ApiResponse.Fail("User not found."));

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(ApiResponse.Fail("Current password is incorrect."));
            }

            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.MustChangePassword = false;

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id,
                Username = user.Username,
                Action = "ChangePassword",
                Module = "Authentication",
                EntityName = "User",
                RecordId = user.Id.ToString(),
                IpAddress = _currentUserService.IpAddress,
                BranchId = user.BranchId
            });

            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Password changed successfully."));
        }

        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            var userId = _currentUserService.UserId;
            if (userId.HasValue)
            {
                SchoolERP.API.Helpers.UserActivityTracker.MarkOffline(userId.Value);
            }
            return Ok(ApiResponse.Ok("Logged out successfully."));
        }
    }
}
