using System.Collections.Generic;
using System.Threading.Tasks;
using SchoolERP.Application.DTOs;

namespace SchoolERP.Application.Common.Interfaces
{
    public interface INumberingSeriesService
    {
        Task<List<NumberingSeriesDto>> GetSeriesListAsync(long branchId);
        Task<bool> SaveSeriesListAsync(long branchId, List<SaveNumberingSeriesRequest> requests);
        Task<string> GetNextNumberAsync(long branchId, string moduleType, string? branchCode = null, string? academicYearName = null);
        Task<string> PeekNextNumberAsync(long branchId, string moduleType, string? branchCode = null, string? academicYearName = null);
        string FormatNumber(NumberingSeriesDto series, string branchCode, string academicYearName, long sequenceNumber);
    }
}
