using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.API.Filters;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/fees")]
    [Authorize]
    public class FeeMastersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public FeeMastersController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // --- 1. Fee Heads ---
        [HttpGet("heads")]
        [HasPermission("FeeStructure", "View")]
        public async Task<ActionResult<ApiResponse<List<FeeHeadDto>>>> GetHeads()
        {
            var branchId = _currentUserService.BranchId;
            var heads = await _context.FeeHeads
                .Where(h => h.BranchId == branchId)
                .OrderBy(h => h.Name)
                .Select(h => new FeeHeadDto
                {
                    Id = h.Id,
                    Name = h.Name,
                    Code = h.Code,
                    Type = h.Type,
                    IsOptional = h.IsOptional,
                    Description = h.Description
                })
                .ToListAsync();

            return Ok(ApiResponse<List<FeeHeadDto>>.Ok(heads));
        }

        [HttpPost("heads")]
        [HasPermission("FeeStructure", "Add")]
        public async Task<ActionResult<ApiResponse<FeeHeadDto>>> CreateHead([FromBody] CreateFeeHeadDto request)
        {
            var branchId = _currentUserService.BranchId;
            var code = request.Code.Trim().ToUpper();

            var exists = await _context.FeeHeads.AnyAsync(h => h.BranchId == branchId && h.Code == code);
            if (exists) return BadRequest(ApiResponse<FeeHeadDto>.Fail($"Fee head code '{code}' already exists."));

            var head = new FeeHead
            {
                BranchId = branchId,
                Name = request.Name.Trim(),
                Code = code,
                Type = request.Type,
                IsOptional = request.IsOptional,
                Description = request.Description?.Trim(),
                IsActive = true
            };

            _context.FeeHeads.Add(head);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<FeeHeadDto>.Ok(new FeeHeadDto
            {
                Id = head.Id,
                Name = head.Name,
                Code = head.Code,
                Type = head.Type,
                IsOptional = head.IsOptional,
                Description = head.Description
            }, "Fee head created successfully."));
        }

        [HttpPut("heads/{id}")]
        [HasPermission("FeeStructure", "Edit")]
        public async Task<ActionResult<ApiResponse<FeeHeadDto>>> UpdateHead(long id, [FromBody] UpdateFeeHeadDto request)
        {
            var branchId = _currentUserService.BranchId;
            var head = await _context.FeeHeads.FirstOrDefaultAsync(h => h.Id == id && h.BranchId == branchId);
            if (head == null) return NotFound(ApiResponse<FeeHeadDto>.Fail("Fee head not found."));

            var code = request.Code.Trim().ToUpper();
            var codeExists = await _context.FeeHeads.AnyAsync(h => h.BranchId == branchId && h.Code == code && h.Id != id);
            if (codeExists) return BadRequest(ApiResponse<FeeHeadDto>.Fail($"Fee head code '{code}' already exists."));

            head.Name = request.Name.Trim();
            head.Code = code;
            head.Type = request.Type;
            head.IsOptional = request.IsOptional;
            head.Description = request.Description?.Trim();

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<FeeHeadDto>.Ok(new FeeHeadDto
            {
                Id = head.Id,
                Name = head.Name,
                Code = head.Code,
                Type = head.Type,
                IsOptional = head.IsOptional,
                Description = head.Description
            }, "Fee head updated successfully."));
        }

        [HttpDelete("heads/{id}")]
        [HasPermission("FeeStructure", "Delete")]
        public async Task<ActionResult<ApiResponse>> DeleteHead(long id)
        {
            var branchId = _currentUserService.BranchId;
            var head = await _context.FeeHeads.FirstOrDefaultAsync(h => h.Id == id && h.BranchId == branchId);
            if (head == null) return NotFound(ApiResponse.Fail("Fee head not found."));

            var inUse = await _context.FeeStructures.AnyAsync(s => s.FeeHeadId == id);
            if (inUse) return BadRequest(ApiResponse.Fail("Fee head is configured in fee structures and cannot be deleted."));

            _context.FeeHeads.Remove(head);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Fee head deleted successfully."));
        }

        // --- 2. Fee Groups ---
        [HttpGet("groups")]
        [HasPermission("FeeStructure", "View")]
        public async Task<ActionResult<ApiResponse<List<FeeGroupDto>>>> GetGroups()
        {
            var branchId = _currentUserService.BranchId;
            var groups = await _context.FeeGroups
                .Where(g => g.BranchId == branchId)
                .OrderBy(g => g.Name)
                .Select(g => new FeeGroupDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description
                })
                .ToListAsync();

            return Ok(ApiResponse<List<FeeGroupDto>>.Ok(groups));
        }

        [HttpPost("groups")]
        [HasPermission("FeeStructure", "Add")]
        public async Task<ActionResult<ApiResponse<FeeGroupDto>>> CreateGroup([FromBody] CreateFeeGroupDto request)
        {
            var branchId = _currentUserService.BranchId;
            var name = request.Name.Trim();

            var exists = await _context.FeeGroups.AnyAsync(g => g.BranchId == branchId && g.Name.ToLower() == name.ToLower());
            if (exists) return BadRequest(ApiResponse<FeeGroupDto>.Fail($"Fee group '{name}' already exists."));

            var group = new FeeGroup
            {
                BranchId = branchId,
                Name = name,
                Description = request.Description?.Trim(),
                IsActive = true
            };

            _context.FeeGroups.Add(group);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<FeeGroupDto>.Ok(new FeeGroupDto
            {
                Id = group.Id,
                Name = group.Name,
                Description = group.Description
            }, "Fee group created successfully."));
        }

        // --- 3. Fee Installments ---
        [HttpGet("installments")]
        [HasPermission("FeeStructure", "View")]
        public async Task<ActionResult<ApiResponse<List<FeeInstallmentDto>>>> GetInstallments()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var installments = await _context.FeeInstallments
                .Where(i => i.BranchId == branchId && i.AcademicYearId == yearId)
                .OrderBy(i => i.DisplayOrder)
                .ThenBy(i => i.DueDate)
                .Select(i => new FeeInstallmentDto
                {
                    Id = i.Id,
                    AcademicYearId = i.AcademicYearId,
                    Name = i.Name,
                    DueDate = i.DueDate,
                    DisplayOrder = i.DisplayOrder
                })
                .ToListAsync();

            return Ok(ApiResponse<List<FeeInstallmentDto>>.Ok(installments));
        }

        [HttpPost("installments")]
        [HasPermission("FeeStructure", "Add")]
        public async Task<ActionResult<ApiResponse<FeeInstallmentDto>>> CreateInstallment([FromBody] CreateFeeInstallmentDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var installment = new FeeInstallment
            {
                BranchId = branchId,
                AcademicYearId = yearId,
                Name = request.Name.Trim(),
                DueDate = request.DueDate,
                DisplayOrder = request.DisplayOrder,
                IsActive = true
            };

            _context.FeeInstallments.Add(installment);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<FeeInstallmentDto>.Ok(new FeeInstallmentDto
            {
                Id = installment.Id,
                AcademicYearId = installment.AcademicYearId,
                Name = installment.Name,
                DueDate = installment.DueDate,
                DisplayOrder = installment.DisplayOrder
            }, "Fee installment created successfully."));
        }

        // --- 4. Fee Structure Matrix ---
        [HttpGet("structures")]
        [HasPermission("FeeStructure", "View")]
        public async Task<ActionResult<ApiResponse<List<FeeStructureGridRowDto>>>> GetFeeStructures(
            [FromQuery] long classId,
            [FromQuery] long feeGroupId)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var heads = await _context.FeeHeads
                .Where(h => h.BranchId == branchId)
                .OrderBy(h => h.Name)
                .ToListAsync();

            var installments = await _context.FeeInstallments
                .Where(i => i.BranchId == branchId && i.AcademicYearId == yearId)
                .OrderBy(i => i.DisplayOrder)
                .ToListAsync();

            var structures = await _context.FeeStructures
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == yearId &&
                            s.ClassId == classId &&
                            s.FeeGroupId == feeGroupId)
                .ToListAsync();

            var rows = heads.Select(h =>
            {
                var dict = new Dictionary<long, decimal>();
                decimal total = 0;
                foreach (var inst in installments)
                {
                    var item = structures.FirstOrDefault(s => s.FeeHeadId == h.Id && s.InstallmentId == inst.Id);
                    var amt = item?.Amount ?? 0;
                    dict[inst.Id] = amt;
                    total += amt;
                }
                return new FeeStructureGridRowDto
                {
                    FeeHeadId = h.Id,
                    FeeHeadName = h.Name,
                    FeeHeadCode = h.Code,
                    Type = h.Type,
                    InstallmentAmounts = dict,
                    TotalAmount = total
                };
            }).ToList();

            return Ok(ApiResponse<List<FeeStructureGridRowDto>>.Ok(rows));
        }

        [HttpPost("structures")]
        [HasPermission("FeeStructure", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveFeeStructureMatrix([FromBody] SaveFeeStructureMatrixDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            // BR-5.3: Check if collections have already occurred for this class in current AY
            var hasCollections = await _context.FeeReceipts.AnyAsync(r =>
                r.BranchId == branchId &&
                r.AcademicYearId == yearId &&
                r.ClassId == request.ClassId &&
                r.Status == ReceiptStatus.Paid);

            if (hasCollections)
            {
                return BadRequest(ApiResponse.Fail("Fee structure cannot be edited once collection has started for this class (BR-5.3)."));
            }

            var existing = await _context.FeeStructures
                .Where(s => s.BranchId == branchId &&
                            s.AcademicYearId == yearId &&
                            s.ClassId == request.ClassId &&
                            s.FeeGroupId == request.FeeGroupId)
                .ToListAsync();

            _context.FeeStructures.RemoveRange(existing);

            foreach (var item in request.Items.Where(i => i.Amount > 0))
            {
                _context.FeeStructures.Add(new FeeStructure
                {
                    BranchId = branchId,
                    AcademicYearId = yearId,
                    ClassId = request.ClassId,
                    FeeGroupId = request.FeeGroupId,
                    FeeHeadId = item.FeeHeadId,
                    InstallmentId = item.InstallmentId,
                    Amount = item.Amount,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Fee structure saved successfully."));
        }

        // --- 5. Fine Rules ---
        [HttpGet("fine-rules")]
        [HasPermission("FeeStructure", "View")]
        public async Task<ActionResult<ApiResponse<List<FineRuleDto>>>> GetFineRules()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var rules = await _context.FineRules
                .Include(r => r.Installment)
                .Where(r => r.BranchId == branchId && r.AcademicYearId == yearId)
                .OrderBy(r => r.Installment!.DisplayOrder)
                .Select(r => new FineRuleDto
                {
                    Id = r.Id,
                    InstallmentId = r.InstallmentId,
                    InstallmentName = r.Installment != null ? r.Installment.Name : "",
                    FineType = r.FineType,
                    Amount = r.Amount,
                    GraceDays = r.GraceDays
                })
                .ToListAsync();

            return Ok(ApiResponse<List<FineRuleDto>>.Ok(rules));
        }

        [HttpPost("fine-rules")]
        [HasPermission("FeeStructure", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveFineRule([FromBody] SaveFineRuleDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var existing = await _context.FineRules.FirstOrDefaultAsync(r =>
                r.BranchId == branchId &&
                r.AcademicYearId == yearId &&
                r.InstallmentId == request.InstallmentId);

            if (existing != null)
            {
                existing.FineType = request.FineType;
                existing.Amount = request.Amount;
                existing.GraceDays = request.GraceDays;
            }
            else
            {
                _context.FineRules.Add(new FineRule
                {
                    BranchId = branchId,
                    AcademicYearId = yearId,
                    InstallmentId = request.InstallmentId,
                    FineType = request.FineType,
                    Amount = request.Amount,
                    GraceDays = request.GraceDays,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Fine rule saved successfully."));
        }

        // --- 6. Monthly Fee Setup ---
        [HttpPost("monthly-setup/generate-schedule")]
        [HasPermission("FeeStructure", "Add")]
        public async Task<ActionResult<ApiResponse<List<FeeInstallmentDto>>>> GenerateMonthlySchedule(
            [FromBody] GenerateMonthlyScheduleRequestDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var academicYear = await _context.AcademicYears
                .FirstOrDefaultAsync(ay => ay.Id == yearId && ay.BranchId == branchId);

            int startYear = academicYear != null && academicYear.StartDate != DateTime.MinValue 
                ? academicYear.StartDate.Year 
                : DateTime.UtcNow.Year;
            int startMonth = academicYear != null && academicYear.StartDate != DateTime.MinValue 
                ? academicYear.StartDate.Month 
                : 4; // Default April in India

            var monthNames = new[] { "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March" };

            var existing = await _context.FeeInstallments
                .Where(i => i.BranchId == branchId && i.AcademicYearId == yearId)
                .OrderBy(i => i.DisplayOrder)
                .ThenBy(i => i.Id)
                .ToListAsync();

            var result = new List<FeeInstallment>();
            var dueDay = Math.Clamp(request.DueDay <= 0 ? 10 : request.DueDay, 1, 28);

            for (int i = 0; i < 12; i++)
            {
                int m = (startMonth - 1 + i) % 12 + 1;
                int y = startYear + ((startMonth - 1 + i) / 12);
                var monthName = monthNames[i];
                var installmentName = request.FormatWithYear ? $"{monthName} {y}" : monthName;
                var dueDate = new DateTime(y, m, dueDay, 0, 0, 0, DateTimeKind.Utc);

                if (i < existing.Count)
                {
                    var currentInst = existing[i];
                    currentInst.Name = installmentName;
                    currentInst.DueDate = dueDate;
                    currentInst.DisplayOrder = i + 1;
                    currentInst.IsActive = true;
                    result.Add(currentInst);
                }
                else
                {
                    var newInst = new FeeInstallment
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        Name = installmentName,
                        DueDate = dueDate,
                        DisplayOrder = i + 1,
                        IsActive = true
                    };
                    _context.FeeInstallments.Add(newInst);
                    result.Add(newInst);
                }
            }

            await _context.SaveChangesAsync();

            var dtoList = result.Select(inst => new FeeInstallmentDto
            {
                Id = inst.Id,
                AcademicYearId = inst.AcademicYearId,
                Name = inst.Name,
                DueDate = inst.DueDate,
                DisplayOrder = inst.DisplayOrder
            }).ToList();

            return Ok(ApiResponse<List<FeeInstallmentDto>>.Ok(dtoList, "12 monthly fee installments generated successfully."));
        }

        [HttpPost("monthly-setup/save-structure")]
        [HasPermission("FeeStructure", "Edit")]
        public async Task<ActionResult<ApiResponse>> SaveMonthlyFeeStructure(
            [FromBody] SaveMonthlyFeeStructureDto request)
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            if (request.ClassIds == null || !request.ClassIds.Any())
            {
                return BadRequest(ApiResponse.Fail("Please select at least one class."));
            }
            if (request.FeeGroupId <= 0)
            {
                return BadRequest(ApiResponse.Fail("Please select a fee group."));
            }
            if (request.Heads == null || !request.Heads.Any(h => h.MonthlyAmount > 0 || (h.MonthAmounts != null && h.MonthAmounts.Values.Any(v => v > 0))))
            {
                return BadRequest(ApiResponse.Fail("Please provide monthly fee amounts for at least one fee head."));
            }

            // 1. Ensure 12 installments exist
            var installments = await _context.FeeInstallments
                .Where(i => i.BranchId == branchId && i.AcademicYearId == yearId)
                .OrderBy(i => i.DisplayOrder)
                .ThenBy(i => i.Id)
                .ToListAsync();

            if (installments.Count < 12)
            {
                // Auto-generate 12 months if not already created
                var academicYear = await _context.AcademicYears
                    .FirstOrDefaultAsync(ay => ay.Id == yearId && ay.BranchId == branchId);

                int startYear = academicYear != null && academicYear.StartDate != DateTime.MinValue 
                    ? academicYear.StartDate.Year 
                    : DateTime.UtcNow.Year;
                int startMonth = academicYear != null && academicYear.StartDate != DateTime.MinValue 
                    ? academicYear.StartDate.Month 
                    : 4;

                var monthNames = new[] { "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March" };

                for (int i = installments.Count; i < 12; i++)
                {
                    int m = (startMonth - 1 + i) % 12 + 1;
                    int y = startYear + ((startMonth - 1 + i) / 12);
                    var newInst = new FeeInstallment
                    {
                        BranchId = branchId,
                        AcademicYearId = yearId,
                        Name = $"{monthNames[i]} {y}",
                        DueDate = new DateTime(y, m, 10, 0, 0, 0, DateTimeKind.Utc),
                        DisplayOrder = i + 1,
                        IsActive = true
                    };
                    _context.FeeInstallments.Add(newInst);
                    installments.Add(newInst);
                }
                await _context.SaveChangesAsync();
            }

            int totalStructuresCreated = 0;
            int totalStudentsAssigned = 0;
            int totalDuesCreated = 0;

            decimal ResolveAmount(MonthlyFeeHeadItemDto h, int mIdx)
            {
                if (h.MonthAmounts != null && h.MonthAmounts.TryGetValue(mIdx.ToString(), out var custom) && custom > 0)
                {
                    return custom;
                }
                return h.MonthlyAmount;
            }

            bool HasValidAmount(MonthlyFeeHeadItemDto h)
            {
                return h.MonthlyAmount > 0 || (h.MonthAmounts != null && h.MonthAmounts.Values.Any(v => v > 0));
            }

            foreach (var classId in request.ClassIds)
            {
                // Remove existing structures for this class & fee group that don't have paid collections
                var existingStructures = await _context.FeeStructures
                    .Where(s => s.BranchId == branchId &&
                                s.AcademicYearId == yearId &&
                                s.ClassId == classId &&
                                s.FeeGroupId == request.FeeGroupId)
                    .ToListAsync();

                _context.FeeStructures.RemoveRange(existingStructures);

                // Add new fee structures for each head across applicable months
                foreach (var head in request.Heads.Where(HasValidAmount))
                {
                    var months = (head.ApplicableMonths != null && head.ApplicableMonths.Any())
                        ? head.ApplicableMonths
                        : Enumerable.Range(1, 12).ToList();

                    foreach (var monthIdx in months)
                    {
                        if (monthIdx >= 1 && monthIdx <= installments.Count)
                        {
                            var inst = installments[monthIdx - 1];
                            decimal amount = ResolveAmount(head, monthIdx);
                            if (amount <= 0) continue;

                            _context.FeeStructures.Add(new FeeStructure
                            {
                                BranchId = branchId,
                                AcademicYearId = yearId,
                                ClassId = classId,
                                FeeGroupId = request.FeeGroupId,
                                FeeHeadId = head.FeeHeadId,
                                InstallmentId = inst.Id,
                                Amount = amount,
                                IsActive = true
                            });
                            totalStructuresCreated++;
                        }
                    }
                }

                // Auto-assign dues to enrolled students if requested
                if (request.AutoAssignToStudents)
                {
                    var enrollments = await _context.StudentEnrollments
                        .Include(e => e.Student)
                        .Where(e => e.AcademicYearId == yearId &&
                                    e.ClassId == classId &&
                                    e.Status == StudentStatus.Active)
                        .ToListAsync();

                    var studentIds = enrollments.Select(e => e.StudentId).ToList();

                    var concessions = await _context.FeeConcessions
                        .Where(c => c.BranchId == branchId &&
                                    c.AcademicYearId == yearId &&
                                    studentIds.Contains(c.StudentId) &&
                                    c.IsApproved)
                        .ToListAsync();

                    var existingDues = await _context.StudentFeeDues
                        .Where(d => d.BranchId == branchId &&
                                    d.AcademicYearId == yearId &&
                                    studentIds.Contains(d.StudentId))
                        .ToListAsync();

                    // Collect active (HeadId, InstallmentId) pairs
                    var activePairs = new HashSet<(long HeadId, long InstallmentId)>();
                    foreach (var head in request.Heads.Where(HasValidAmount))
                    {
                        var months = (head.ApplicableMonths != null && head.ApplicableMonths.Any())
                            ? head.ApplicableMonths
                            : Enumerable.Range(1, 12).ToList();
                        foreach (var monthIdx in months)
                        {
                            if (monthIdx >= 1 && monthIdx <= installments.Count)
                            {
                                decimal amount = ResolveAmount(head, monthIdx);
                                if (amount > 0)
                                {
                                    activePairs.Add((head.FeeHeadId, installments[monthIdx - 1].Id));
                                }
                            }
                        }
                    }

                    // Remove obsolete unpaid dues for these students that were unchecked in new mapping
                    var obsoleteDues = existingDues
                        .Where(d => d.PaidAmount == 0 && !activePairs.Contains((d.FeeHeadId, d.InstallmentId)))
                        .ToList();

                    if (obsoleteDues.Any())
                    {
                        _context.StudentFeeDues.RemoveRange(obsoleteDues);
                    }

                    foreach (var en in enrollments)
                    {
                        en.FeeGroupId = request.FeeGroupId;
                        totalStudentsAssigned++;

                        foreach (var head in request.Heads.Where(HasValidAmount))
                        {
                            var months = (head.ApplicableMonths != null && head.ApplicableMonths.Any())
                                ? head.ApplicableMonths
                                : Enumerable.Range(1, 12).ToList();

                            foreach (var monthIdx in months)
                            {
                                if (monthIdx >= 1 && monthIdx <= installments.Count)
                                {
                                    var inst = installments[monthIdx - 1];
                                    decimal amount = ResolveAmount(head, monthIdx);
                                    if (amount <= 0) continue;

                                    var existingDue = existingDues.FirstOrDefault(d =>
                                        d.StudentId == en.StudentId &&
                                        d.FeeHeadId == head.FeeHeadId &&
                                        d.InstallmentId == inst.Id);

                                    // Calculate concession
                                    decimal concessionAmt = 0;
                                    var conc = concessions.FirstOrDefault(c => c.StudentId == en.StudentId && c.FeeHeadId == head.FeeHeadId);
                                    if (conc != null)
                                    {
                                        if (conc.Type == ConcessionType.Percentage)
                                        {
                                            concessionAmt = Math.Round((amount * conc.Value) / 100m, 2);
                                        }
                                        else
                                        {
                                            concessionAmt = Math.Min(conc.Value, amount);
                                        }
                                    }

                                    var balance = amount - concessionAmt;

                                    if (existingDue != null)
                                    {
                                        // Update unpaid due if not yet paid
                                        if (existingDue.PaidAmount == 0)
                                        {
                                            existingDue.OriginalAmount = amount;
                                            existingDue.ConcessionAmount = concessionAmt;
                                            existingDue.BalanceAmount = balance;
                                            existingDue.Status = balance <= 0 ? DueStatus.Paid : DueStatus.Unpaid;
                                        }
                                    }
                                    else
                                    {
                                        _context.StudentFeeDues.Add(new StudentFeeDue
                                        {
                                            BranchId = branchId,
                                            AcademicYearId = yearId,
                                            StudentId = en.StudentId,
                                            ClassId = en.ClassId,
                                            FeeHeadId = head.FeeHeadId,
                                            InstallmentId = inst.Id,
                                            OriginalAmount = amount,
                                            ConcessionAmount = concessionAmt,
                                            PaidAmount = 0,
                                            BalanceAmount = balance,
                                            Status = balance <= 0 ? DueStatus.Paid : DueStatus.Unpaid,
                                            IsActive = true
                                        });
                                        totalDuesCreated++;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok($"Monthly fee structure saved successfully! ({totalStructuresCreated} fee structure items created, {totalStudentsAssigned} students assigned, {totalDuesCreated} monthly dues generated)."));
        }

        [HttpGet("monthly-setup/status")]
        [HasPermission("FeeStructure", "View")]
        public async Task<ActionResult<ApiResponse<MonthlySetupStatusDto>>> GetMonthlySetupStatus()
        {
            var branchId = _currentUserService.BranchId;
            var yearId = _currentUserService.AcademicYearId;

            var installments = await _context.FeeInstallments
                .Where(i => i.BranchId == branchId && i.AcademicYearId == yearId)
                .OrderBy(i => i.DisplayOrder)
                .ThenBy(i => i.Id)
                .Select(i => new FeeInstallmentDto
                {
                    Id = i.Id,
                    AcademicYearId = i.AcademicYearId,
                    Name = i.Name,
                    DueDate = i.DueDate,
                    DisplayOrder = i.DisplayOrder
                })
                .ToListAsync();

            var classes = await _context.Classes
                .Where(c => c.BranchId == branchId)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            var groups = await _context.FeeGroups
                .Where(g => g.BranchId == branchId)
                .ToListAsync();

            var structures = await _context.FeeStructures
                .Where(s => s.BranchId == branchId && s.AcademicYearId == yearId)
                .ToListAsync();

            var enrollments = await _context.StudentEnrollments
                .Where(e => e.AcademicYearId == yearId && e.Status == StudentStatus.Active)
                .ToListAsync();

            var studentDuesList = await _context.StudentFeeDues
                .Where(d => d.BranchId == branchId && d.AcademicYearId == yearId)
                .Select(d => new { d.ClassId, d.StudentId })
                .Distinct()
                .ToListAsync();

            var classSummaries = new List<ClassMonthlySummaryDto>();

            foreach (var c in classes)
            {
                var classStructures = structures.Where(s => s.ClassId == c.Id).ToList();
                var classEnrollments = enrollments.Where(e => e.ClassId == c.Id).ToList();
                var assignedStudentsCount = studentDuesList.Count(d => d.ClassId == c.Id);

                if (classStructures.Any())
                {
                    var grpIds = classStructures.Select(s => s.FeeGroupId).Distinct();
                    foreach (var gId in grpIds)
                    {
                        var grp = groups.FirstOrDefault(g => g.Id == gId);
                        var grpStructures = classStructures.Where(s => s.FeeGroupId == gId).ToList();
                        var annualTotal = grpStructures.Sum(s => s.Amount);
                        var monthlyAvg = installments.Count > 0 ? annualTotal / installments.Count : 0;

                        classSummaries.Add(new ClassMonthlySummaryDto
                        {
                            ClassId = c.Id,
                            ClassName = c.Name,
                            FeeGroupId = gId,
                            FeeGroupName = grp?.Name ?? "General",
                            MonthlyTotal = Math.Round(monthlyAvg, 2),
                            AnnualTotal = annualTotal,
                            StudentCount = classEnrollments.Count,
                            StudentsAssignedCount = assignedStudentsCount
                        });
                    }
                }
                else
                {
                    classSummaries.Add(new ClassMonthlySummaryDto
                    {
                        ClassId = c.Id,
                        ClassName = c.Name,
                        FeeGroupId = 0,
                        FeeGroupName = "Not Configured",
                        MonthlyTotal = 0,
                        AnnualTotal = 0,
                        StudentCount = classEnrollments.Count,
                        StudentsAssignedCount = assignedStudentsCount
                    });
                }
            }

            var dueDay = installments.Any() ? installments.First().DueDate.Day : 10;

            var response = new MonthlySetupStatusDto
            {
                IsScheduleReady = installments.Count >= 12,
                TotalInstallments = installments.Count,
                DueDay = dueDay,
                Installments = installments,
                ConfiguredClasses = classSummaries
            };

            return Ok(ApiResponse<MonthlySetupStatusDto>.Ok(response));
        }
    }
}

