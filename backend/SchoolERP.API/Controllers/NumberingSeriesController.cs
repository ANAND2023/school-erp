using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolERP.API.Filters;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NumberingSeriesController : ControllerBase
    {
        private readonly INumberingSeriesService _numberingService;
        private readonly ICurrentUserService _currentUserService;

        public NumberingSeriesController(
            INumberingSeriesService numberingService,
            ICurrentUserService currentUserService)
        {
            _numberingService = numberingService;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission("Branch", "View")]
        public async Task<ActionResult<ApiResponse<List<NumberingSeriesDto>>>> GetSeries()
        {
            var branchId = _currentUserService.BranchId;
            var list = await _numberingService.GetSeriesListAsync(branchId);
            return Ok(ApiResponse<List<NumberingSeriesDto>>.Ok(list));
        }

        [HttpPut]
        [HasPermission("Branch", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveSeries([FromBody] List<SaveNumberingSeriesRequest> requests)
        {
            var branchId = _currentUserService.BranchId;
            await _numberingService.SaveSeriesListAsync(branchId, requests);
            return Ok(ApiResponse.Ok("Numbering series configurations saved successfully."));
        }
    }
}
