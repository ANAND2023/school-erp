using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Domain.Enums;

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
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext != null && httpContext.Request.Headers.TryGetValue("X-Branch-Id", out var headerVal))
                {
                    if (long.TryParse(headerVal, out var branchId)) return branchId;
                }

                var claimVal = User?.FindFirst("branch_id")?.Value;
                return long.TryParse(claimVal, out var id) ? id : 1;
            }
        }

        public long AcademicYearId
        {
            get
            {
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext != null)
                {
                    if (httpContext.Request.Headers.TryGetValue("X-Academic-Year", out var headerVal) ||
                        httpContext.Request.Headers.TryGetValue("X-Academic-Year-Id", out headerVal))
                    {
                        if (long.TryParse(headerVal, out var yearId) && yearId > 0) return yearId;
                    }

                    if (httpContext.Request.Query.TryGetValue("academicYearId", out var queryVal))
                    {
                        if (long.TryParse(queryVal, out var yearId) && yearId > 0) return yearId;
                    }
                }

                var claimVal = User?.FindFirst("academic_year_id")?.Value;
                return long.TryParse(claimVal, out var id) && id > 0 ? id : 1;
            }
        }

        public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

        public string? IpAddress => _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
    }
}
