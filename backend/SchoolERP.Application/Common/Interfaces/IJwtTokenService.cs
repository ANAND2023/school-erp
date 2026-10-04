using System.Collections.Generic;
using System.Security.Claims;
using SchoolERP.Domain.Entities;

namespace SchoolERP.Application.Common.Interfaces
{
    public interface IJwtTokenService
    {
        string GenerateAccessToken(User user, IEnumerable<Claim>? extraClaims = null);
        string GenerateRefreshToken();
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    }
}
