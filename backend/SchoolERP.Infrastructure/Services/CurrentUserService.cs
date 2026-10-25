using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.Infrastructure.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

        public long? UserId
        {
            get
            {
                var val = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                return long.TryParse(val, out var id) ? id : null;
            }
        }

        public string? Username => User?.FindFirst(ClaimTypes.Name)?.Value;

        public UserType? UserType
        {
            get
            {
                var val = User?.FindFirst("user_type")?.Value;
                return Enum.TryParse<UserType>(val, true, out var type) ? type : null;
            }
        }

        public long BranchId
        {
            get
            {
                var claimVal = User?.FindFirst("branch_id")?.Value;
                var userBranchId = long.TryParse(claimVal, out var id) ? id : 1;

                // Only SuperAdmin is allowed to override branch via X-Branch-Id header
                if (UserType == Domain.Enums.UserType.SuperAdmin)
                {
                    var httpContext = _httpContextAccessor.HttpContext;
                    if (httpContext != null && httpContext.Request.Headers.TryGetValue("X-Branch-Id", out var headerVal))
                    {
                        if (long.TryParse(headerVal, out var branchId) && branchId > 0) return branchId;
                    }
                }

                return userBranchId;
            }
        }

        public long AcademicYearId
        {
            get
            {
                var httpContext = _httpContextAccessor.HttpContext;
                long requestedYearId = 0;

                if (httpContext != null)
                {
                    if (httpContext.Request.Headers.TryGetValue("X-Academic-Year", out var headerVal) ||
                        httpContext.Request.Headers.TryGetValue("X-Academic-Year-Id", out headerVal))
                    {
                        long.TryParse(headerVal, out requestedYearId);
                    }

                    if (requestedYearId <= 0 && httpContext.Request.Query.TryGetValue("academicYearId", out var queryVal))
                    {
                        long.TryParse(queryVal, out requestedYearId);
                    }
                }

                if (requestedYearId <= 0)
                {
                    var claimVal = User?.FindFirst("academic_year_id")?.Value;
                    if (long.TryParse(claimVal, out var cId)) requestedYearId = cId;
                }

                var curBranchId = BranchId;
                if (httpContext != null)
                {
                    const string cacheKey = "__ValidatedAcademicYearId";
                    if (httpContext.Items.TryGetValue(cacheKey, out var cached) && cached is long cachedId)
                    {
                        return cachedId;
                    }

                    try
                    {
                        var db = httpContext.RequestServices.GetService(typeof(ApplicationDbContext)) as ApplicationDbContext;
                        if (db != null)
                        {
                            if (requestedYearId > 0 && db.AcademicYears.Any(ay => ay.Id == requestedYearId && ay.BranchId == curBranchId))
                            {
                                httpContext.Items[cacheKey] = requestedYearId;
                                return requestedYearId;
                            }

                            var activeYear = db.AcademicYears
                                .Where(ay => ay.BranchId == curBranchId && ay.IsActive)
                                .OrderByDescending(ay => ay.IsCurrent)
                                .ThenByDescending(ay => ay.Id)
                                .Select(ay => ay.Id)
                                .FirstOrDefault();

                            if (activeYear > 0)
                            {
                                httpContext.Items[cacheKey] = activeYear;
                                return activeYear;
                            }
                        }
                    }
                    catch
                    {
                        // Fallback safely if db context not available during DI container startup/unit tests
                    }
                }

                return requestedYearId > 0 ? requestedYearId : 1;
            }
        }

        public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

        public string? IpAddress => _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
    }
}
