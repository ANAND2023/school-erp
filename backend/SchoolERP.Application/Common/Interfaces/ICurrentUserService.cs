using SchoolERP.Domain.Enums;

namespace SchoolERP.Application.Common.Interfaces
{
    public interface ICurrentUserService
    {
        long? UserId { get; }
        string? Username { get; }
        UserType? UserType { get; }
        long BranchId { get; }
        long AcademicYearId { get; }
        bool IsAuthenticated { get; }
        string? IpAddress { get; }
    }
}
