using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DynamicAdmissionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly INumberingSeriesService _numberingService;

        public DynamicAdmissionController(
            ApplicationDbContext context,
            ICurrentUserService currentUser,
            INumberingSeriesService numberingService)
        {
            _context = context;
            _currentUser = currentUser;
            _numberingService = numberingService;
        }

        // ==========================================
        // 1. DYNAMIC FORM BUILDER ENDPOINTS
        // ==========================================

        [HttpGet("form-config")]
        public async Task<IActionResult> GetFormConfig([FromQuery] long? academicYearId)
        {
            var branchId = _currentUser.BranchId;
            var targetAcademicYearId = academicYearId ?? _currentUser.AcademicYearId;

            if (targetAcademicYearId == 0)
            {
                var currentAY = await _context.AcademicYears
                    .Where(a => a.BranchId == branchId && a.IsCurrent && a.IsActive)
                    .FirstOrDefaultAsync() ?? await _context.AcademicYears
                    .Where(a => a.BranchId == branchId && a.IsActive)
                    .OrderByDescending(a => a.StartDate)
                    .FirstOrDefaultAsync();

                if (currentAY != null) targetAcademicYearId = currentAY.Id;
            }

            var config = await _context.AdmissionFormConfigs
                .Include(c => c.Fields.OrderBy(f => f.DisplayOrder))
                .FirstOrDefaultAsync(c => c.BranchId == branchId && c.AcademicYearId == targetAcademicYearId && c.IsActive);

            // First time initialization with default 15 basic fields
            if (config == null)
            {
                config = new AdmissionFormConfig
                {
                    BranchId = branchId,
                    AcademicYearId = targetAcademicYearId,
                    FormTitle = "School Admission Form",
                    FormDescription = "Official online admission registration form for the academic session.",
                    Instructions = "Please fill all required student and parent information accurately before submission.",
                    ApplicationFee = 500.00m,
                    Version = 1,
                    IsActive = true
                };

                _context.AdmissionFormConfigs.Add(config);
                await _context.SaveChangesAsync();

                var defaultFields = GetDefaultInitialFields(config.Id);
                _context.AdmissionFormFields.AddRange(defaultFields);
                await _context.SaveChangesAsync();

                // Reload configured fields
                config = await _context.AdmissionFormConfigs
                    .Include(c => c.Fields.OrderBy(f => f.DisplayOrder))
                    .FirstAsync(c => c.Id == config.Id);
            }

            var dto = MapToFormConfigDto(config);
            return Ok(new { success = true, data = dto });
        }

        [HttpPost("form-config")]
        public async Task<IActionResult> SaveFormConfig([FromBody] SaveAdmissionFormConfigRequest request)
        {
            var branchId = _currentUser.BranchId;
            var targetAcademicYearId = request.AcademicYearId != 0 ? request.AcademicYearId : _currentUser.AcademicYearId;

            var config = await _context.AdmissionFormConfigs
                .Include(c => c.Fields)
                .FirstOrDefaultAsync(c => c.BranchId == branchId && c.AcademicYearId == targetAcademicYearId && c.IsActive);

            if (config == null)
            {
                config = new AdmissionFormConfig
                {
                    BranchId = branchId,
                    AcademicYearId = targetAcademicYearId,
                    FormTitle = request.FormTitle,
                    FormDescription = request.FormDescription,
                    Instructions = request.Instructions,
                    ApplicationFee = request.ApplicationFee,
                    Version = 1,
                    IsActive = true
                };
                _context.AdmissionFormConfigs.Add(config);
                await _context.SaveChangesAsync();
            }
            else
            {
                config.FormTitle = request.FormTitle;
                config.FormDescription = request.FormDescription;
                config.Instructions = request.Instructions;
                config.ApplicationFee = request.ApplicationFee;
                config.Version += 1;
            }

            // Sync fields
            var existingFields = config.Fields.ToList();
            var incomingKeys = request.Fields.Select(f => f.FieldKey).ToHashSet();

            // Deactivate fields deleted by user (system fields preserved)
            foreach (var existing in existingFields)
            {
                if (!incomingKeys.Contains(existing.FieldKey) && !existing.IsSystemField)
                {
                    existing.IsActive = false;
                }
            }

            int order = 1;
            foreach (var reqField in request.Fields)
            {
                var existing = existingFields.FirstOrDefault(f => f.FieldKey == reqField.FieldKey);
                if (existing != null)
                {
                    existing.FieldLabel = reqField.FieldLabel;
                    existing.FieldType = reqField.FieldType;
                    existing.Placeholder = reqField.Placeholder;
                    existing.HelpText = reqField.HelpText;
                    existing.DefaultValue = reqField.DefaultValue;
                    existing.OptionsJson = reqField.Options != null ? JsonSerializer.Serialize(reqField.Options) : null;
                    existing.ValidationRulesJson = reqField.ValidationRules != null ? JsonSerializer.Serialize(reqField.ValidationRules) : null;
                    existing.DisplayOrder = order++;
                    existing.IsVisibleOnSlip = reqField.IsVisibleOnSlip;
                    existing.GridSpan = reqField.GridSpan > 0 ? reqField.GridSpan : 6;
                    existing.IsActive = true;
                }
                else
                {
                    var newField = new AdmissionFormField
                    {
                        FormConfigId = config.Id,
                        FieldKey = string.IsNullOrWhiteSpace(reqField.FieldKey) ? $"field_{Guid.NewGuid():N}" : reqField.FieldKey,
                        FieldLabel = reqField.FieldLabel,
                        FieldType = reqField.FieldType,
                        Placeholder = reqField.Placeholder,
                        HelpText = reqField.HelpText,
                        DefaultValue = reqField.DefaultValue,
                        OptionsJson = reqField.Options != null ? JsonSerializer.Serialize(reqField.Options) : null,
                        ValidationRulesJson = reqField.ValidationRules != null ? JsonSerializer.Serialize(reqField.ValidationRules) : null,
                        DisplayOrder = order++,
                        IsSystemField = false,
                        IsVisibleOnSlip = reqField.IsVisibleOnSlip,
                        GridSpan = reqField.GridSpan > 0 ? reqField.GridSpan : 6,
                        IsActive = true
                    };
                    _context.AdmissionFormFields.Add(newField);
                }
            }

            await _context.SaveChangesAsync();

            var updatedConfig = await _context.AdmissionFormConfigs
                .Include(c => c.Fields.Where(f => f.IsActive).OrderBy(f => f.DisplayOrder))
                .FirstAsync(c => c.Id == config.Id);

            return Ok(new { success = true, message = "Admission form builder configuration saved successfully.", data = MapToFormConfigDto(updatedConfig) });
        }

        // ==========================================
        // 2. ADMISSION SLIP GENERATION
        // ==========================================

        [HttpPost("slips/individual")]
        public async Task<IActionResult> CreateIndividualSlip([FromBody] CreateIndividualAdmissionSlipRequest request)
        {
            var branchId = _currentUser.BranchId;
            var targetAcademicYearId = request.AcademicYearId != 0 ? request.AcademicYearId : _currentUser.AcademicYearId;

            var config = await _context.AdmissionFormConfigs
                .FirstOrDefaultAsync(c => c.BranchId == branchId && c.AcademicYearId == targetAcademicYearId && c.IsActive);

            if (config == null)
            {
                return BadRequest(new { success = false, message = "Admission form is not configured for this academic session yet." });
            }

            var slipNumber = await GenerateUniqueSlipNumberAsync(branchId);
            var feeAmount = request.FeeAmount > 0 ? request.FeeAmount : config.ApplicationFee;
            var paidAmount = Math.Min(request.InitialPaymentAmount, feeAmount);
            var balanceAmount = Math.Max(0, feeAmount - paidAmount);
            var paymentStatus = paidAmount <= 0 ? "Unpaid" : (paidAmount >= feeAmount ? "Paid" : "Partial");

            var slip = new AdmissionSlip
            {
                BranchId = branchId,
                AcademicYearId = targetAcademicYearId,
                FormConfigId = config.Id,
                SlipNumber = slipNumber,
                StudentName = request.StudentName,
                ClassId = request.ClassId,
                Gender = request.Gender,
                Dob = request.Dob,
                FatherName = request.FatherName,
                MotherName = request.MotherName,
                ContactNumber = request.ContactNumber,
                AlternateNumber = request.AlternateNumber,
                Email = request.Email,
                Address = request.Address,
                State = request.State,
                City = request.City,
                PreviousSchool = request.PreviousSchool,
                StudentPhotoUrl = request.StudentPhotoUrl,
                CustomFieldValuesJson = request.CustomFields != null ? JsonSerializer.Serialize(request.CustomFields) : "{}",
                AdmissionStatus = "Issued",
                FeeAmount = feeAmount,
                PaidAmount = paidAmount,
                BalanceAmount = balanceAmount,
                PaymentStatus = paymentStatus,
                IsActive = true
            };

            _context.AdmissionSlips.Add(slip);
            await _context.SaveChangesAsync();

            // Record initial payment if collected
            if (paidAmount > 0)
            {
                var receiptNumber = $"RCP-{DateTime.UtcNow:yyyyMMdd}-{slip.Id:D4}";
                var payment = new AdmissionPayment
                {
                    BranchId = branchId,
                    AdmissionSlipId = slip.Id,
                    ReceiptNumber = receiptNumber,
                    PaymentDate = DateTime.UtcNow,
                    Amount = paidAmount,
                    PaymentMode = request.PaymentMode ?? "Cash",
                    TransactionReference = request.TransactionReference,
                    PaymentNote = request.PaymentNote ?? "Initial admission registration fee",
                    CollectedBy = _currentUser.UserId ?? 0,
                    IsReconciled = true,
                    IsActive = true
                };
                _context.AdmissionPayments.Add(payment);
                await _context.SaveChangesAsync();
            }

            var result = await GetSlipDetailByIdAsync(slip.Id);
            return Ok(new { success = true, message = "Admission slip generated successfully.", data = result });
        }

        [HttpPost("slips/bulk")]
        public async Task<IActionResult> CreateBulkSlips([FromBody] CreateBulkAdmissionSlipsRequest request)
        {
            if (request.Slips == null || !request.Slips.Any())
            {
                return BadRequest(new { success = false, message = "No admission entries provided in bulk request." });
            }

            var branchId = _currentUser.BranchId;
            var targetAcademicYearId = request.AcademicYearId != 0 ? request.AcademicYearId : _currentUser.AcademicYearId;

            var config = await _context.AdmissionFormConfigs
                .FirstOrDefaultAsync(c => c.BranchId == branchId && c.AcademicYearId == targetAcademicYearId && c.IsActive);

            if (config == null)
            {
                return BadRequest(new { success = false, message = "Admission form is not configured for this academic session yet." });
            }

            var batchId = $"BULK-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}".Substring(0, 24);
            var feePerSlip = request.FeeAmountPerSlip > 0 ? request.FeeAmountPerSlip : config.ApplicationFee;
            var collectPerSlip = Math.Min(request.CollectAmountPerSlip, feePerSlip);
            var balancePerSlip = Math.Max(0, feePerSlip - collectPerSlip);
            var statusPerSlip = collectPerSlip <= 0 ? "Unpaid" : (collectPerSlip >= feePerSlip ? "Paid" : "Partial");

            var generatedIds = new List<long>();
            int counter = 1;

            foreach (var item in request.Slips)
            {
                var slipNumber = await GenerateUniqueSlipNumberAsync(branchId);
                var slip = new AdmissionSlip
                {
                    BranchId = branchId,
                    AcademicYearId = targetAcademicYearId,
                    FormConfigId = config.Id,
                    SlipNumber = slipNumber,
                    BatchId = batchId,
                    StudentName = item.StudentName,
                    ClassId = item.ClassId,
                    Gender = item.Gender,
                    Dob = item.Dob,
                    FatherName = item.FatherName,
                    MotherName = item.MotherName,
                    ContactNumber = item.ContactNumber,
                    Email = item.Email,
                    Address = item.Address,
                    CustomFieldValuesJson = item.CustomFields != null ? JsonSerializer.Serialize(item.CustomFields) : "{}",
                    AdmissionStatus = "Issued",
                    FeeAmount = feePerSlip,
                    PaidAmount = collectPerSlip,
                    BalanceAmount = balancePerSlip,
                    PaymentStatus = statusPerSlip,
                    IsActive = true
                };

                _context.AdmissionSlips.Add(slip);
                await _context.SaveChangesAsync();
                generatedIds.Add(slip.Id);

                // Separate payment entry for each student
                if (collectPerSlip > 0)
                {
                    var receiptNumber = $"RCP-{DateTime.UtcNow:yyyyMMdd}-{slip.Id:D4}-{counter++}";
                    var payment = new AdmissionPayment
                    {
                        BranchId = branchId,
                        AdmissionSlipId = slip.Id,
                        ReceiptNumber = receiptNumber,
                        PaymentDate = DateTime.UtcNow,
                        Amount = collectPerSlip,
                        PaymentMode = request.PaymentMode ?? "Cash",
                        TransactionReference = request.TransactionReference,
                        PaymentNote = request.PaymentNote ?? $"Bulk batch {batchId} payment",
                        CollectedBy = _currentUser.UserId ?? 0,
                        IsReconciled = true,
                        IsActive = true
                    };
                    _context.AdmissionPayments.Add(payment);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Successfully generated {generatedIds.Count} admission slips in batch {batchId}.",
                data = new { batchId, count = generatedIds.Count, slipIds = generatedIds }
            });
        }

        // ==========================================
        // 3. SLIPS LISTING & DETAILS
        // ==========================================

        [HttpGet("slips")]
        public async Task<IActionResult> GetSlips(
            [FromQuery] long? academicYearId,
            [FromQuery] long? classId,
            [FromQuery] string? paymentStatus,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var branchId = _currentUser.BranchId;
            var targetAcademicYearId = academicYearId ?? _currentUser.AcademicYearId;

            var query = _context.AdmissionSlips
                .Include(s => s.Class)
                .Include(s => s.AcademicYear)
                .Include(s => s.Payments)
                .Where(s => s.BranchId == branchId && s.IsActive);

            if (targetAcademicYearId > 0)
            {
                query = query.Where(s => s.AcademicYearId == targetAcademicYearId);
            }

            if (classId.HasValue && classId.Value > 0)
            {
                query = query.Where(s => s.ClassId == classId.Value);
            }

            if (!string.IsNullOrWhiteSpace(paymentStatus) && paymentStatus != "All")
            {
                query = query.Where(s => s.PaymentStatus == paymentStatus);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(s =>
                    s.StudentName.ToLower().Contains(term) ||
                    s.SlipNumber.ToLower().Contains(term) ||
                    s.ContactNumber.Contains(term) ||
                    (s.FatherName != null && s.FatherName.ToLower().Contains(term)));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(s => s.CreatedOn)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = items.Select(MapToSlipResponseDto).ToList();

            return Ok(new
            {
                success = true,
                data = new
                {
                    items = dtos,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                }
            });
        }

        [HttpGet("slips/{id}")]
        public async Task<IActionResult> GetSlipById(long id)
        {
            var slip = await GetSlipDetailByIdAsync(id);
            if (slip == null) return NotFound(new { success = false, message = "Admission slip not found." });
            return Ok(new { success = true, data = slip });
        }

        [HttpPost("slips/{id}/admit")]
        public async Task<IActionResult> MarkSlipAdmitted(long id)
        {
            var branchId = _currentUser.BranchId;
            var slip = await _context.AdmissionSlips
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId && s.IsActive);
            if (slip == null) return NotFound(new { success = false, message = "Registration slip not found." });

            slip.AdmissionStatus = "Admitted";
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Registration status marked as Admitted." });
        }

        [HttpGet("registration-slip-config")]
        public async Task<IActionResult> GetRegistrationSlipConfig()
        {
            var branchId = _currentUser.BranchId;
            var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId);
            long? schoolId = branch?.SchoolId;

            TenantGatewayConfig? config = null;
            if (schoolId.HasValue)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.GatewayType == "REGISTRATION_SLIP" && g.IsActive);
            }

            if (config == null)
            {
                config = await _context.TenantGatewayConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.SchoolId == null && g.GatewayType == "REGISTRATION_SLIP" && g.IsActive);
            }

            if (config != null && !string.IsNullOrWhiteSpace(config.CredentialsEncrypted))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<RegistrationSlipConfigDto>(
                        config.CredentialsEncrypted,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        var defaultSecs = RegistrationSlipConfigDto.GetDefaultSections();
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
                        return Ok(new { success = true, data = parsed });
                    }
                }
                catch { }
            }

            return Ok(new { success = true, data = new RegistrationSlipConfigDto() });
        }

        // ==========================================
        // 4. PAYMENT COLLECTION & RECEIPT
        // ==========================================

        [HttpPost("payments/collect")]
        public async Task<IActionResult> CollectPayment([FromBody] CollectAdmissionPaymentRequest request)
        {
            var branchId = _currentUser.BranchId;
            var slip = await _context.AdmissionSlips
                .Include(s => s.Payments)
                .FirstOrDefaultAsync(s => s.Id == request.AdmissionSlipId && s.BranchId == branchId && s.IsActive);

            if (slip == null)
            {
                return NotFound(new { success = false, message = "Admission slip not found." });
            }

            if (slip.BalanceAmount <= 0)
            {
                return BadRequest(new { success = false, message = "This admission slip is already fully paid." });
            }

            var paymentAmount = Math.Min(request.Amount, slip.BalanceAmount);
            var receiptNumber = $"RCP-{DateTime.UtcNow:yyyyMMdd}-{slip.Id:D4}-{slip.Payments.Count + 1}";

            var payment = new AdmissionPayment
            {
                BranchId = branchId,
                AdmissionSlipId = slip.Id,
                ReceiptNumber = receiptNumber,
                PaymentDate = DateTime.UtcNow,
                Amount = paymentAmount,
                PaymentMode = request.PaymentMode ?? "Cash",
                TransactionReference = request.TransactionReference,
                PaymentNote = request.PaymentNote,
                CollectedBy = _currentUser.UserId ?? 0,
                IsReconciled = true,
                IsActive = true
            };

            _context.AdmissionPayments.Add(payment);

            slip.PaidAmount += paymentAmount;
            slip.BalanceAmount = Math.Max(0, slip.FeeAmount - slip.PaidAmount);
            slip.PaymentStatus = slip.BalanceAmount <= 0 ? "Paid" : "Partial";

            await _context.SaveChangesAsync();

            var updatedSlip = await GetSlipDetailByIdAsync(slip.Id);
            return Ok(new { success = true, message = "Payment recorded successfully.", data = updatedSlip });
        }

        // ==========================================
        // 5. DASHBOARD & ANALYTICS
        // ==========================================

        [HttpGet("reports/dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats([FromQuery] long? academicYearId)
        {
            var branchId = _currentUser.BranchId;
            var targetAcademicYearId = academicYearId ?? _currentUser.AcademicYearId;

            var query = _context.AdmissionSlips.Where(s => s.BranchId == branchId && s.IsActive);
            if (targetAcademicYearId > 0)
            {
                query = query.Where(s => s.AcademicYearId == targetAcademicYearId);
            }

            var totalSlips = await query.CountAsync();
            var paidSlips = await query.CountAsync(s => s.PaymentStatus == "Paid");
            var unpaidSlips = await query.CountAsync(s => s.PaymentStatus == "Unpaid");
            var partialPaidSlips = await query.CountAsync(s => s.PaymentStatus == "Partial");

            var totalExpected = await query.SumAsync(s => s.FeeAmount);
            var totalCollected = await query.SumAsync(s => s.PaidAmount);
            var totalPending = await query.SumAsync(s => s.BalanceAmount);

            var classWise = await query
                .GroupBy(s => new { s.ClassId, ClassName = s.Class != null ? s.Class.Name : "Unknown" })
                .Select(g => new ClassWiseAdmissionStatDto
                {
                    ClassId = g.Key.ClassId,
                    ClassName = g.Key.ClassName,
                    TotalSlips = g.Count(),
                    TotalCollected = g.Sum(x => x.PaidAmount)
                })
                .ToListAsync();

            var stats = new AdmissionDashboardStatsDto
            {
                TotalSlips = totalSlips,
                PaidSlips = paidSlips,
                UnpaidSlips = unpaidSlips,
                PartialPaidSlips = partialPaidSlips,
                TotalFeeExpected = totalExpected,
                TotalFeeCollected = totalCollected,
                TotalPendingCollection = totalPending,
                ClassWiseStats = classWise
            };

            return Ok(new { success = true, data = stats });
        }

        // ==========================================
        // HELPER METHODS
        // ==========================================

        private async Task<string> GenerateUniqueSlipNumberAsync(long branchId)
        {
            try
            {
                var nextNo = await _numberingService.GetNextNumberAsync(branchId, "AdmissionSlip");
                if (!string.IsNullOrWhiteSpace(nextNo)) return nextNo;
            }
            catch {}

            // Resilient fallback with timestamp & random token
            var count = await _context.AdmissionSlips.CountAsync(s => s.BranchId == branchId) + 1;
            return $"ADM-{DateTime.UtcNow.Year}-{count:D4}";
        }

        private async Task<AdmissionSlipResponseDto?> GetSlipDetailByIdAsync(long id)
        {
            var branchId = _currentUser.BranchId;
            var slip = await _context.AdmissionSlips
                .Include(s => s.Class)
                .Include(s => s.AcademicYear)
                .Include(s => s.Payments.OrderByDescending(p => p.PaymentDate))
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId && s.IsActive);

            return slip != null ? MapToSlipResponseDto(slip) : null;
        }

        private static AdmissionSlipResponseDto MapToSlipResponseDto(AdmissionSlip s)
        {
            Dictionary<string, object> customDict;
            try
            {
                customDict = !string.IsNullOrWhiteSpace(s.CustomFieldValuesJson)
                    ? JsonSerializer.Deserialize<Dictionary<string, object>>(s.CustomFieldValuesJson) ?? new()
                    : new();
            }
            catch
            {
                customDict = new();
            }

            return new AdmissionSlipResponseDto
            {
                Id = s.Id,
                BranchId = s.BranchId,
                AcademicYearId = s.AcademicYearId,
                AcademicYearName = s.AcademicYear?.Name ?? "",
                SlipNumber = s.SlipNumber,
                BatchId = s.BatchId,
                StudentName = s.StudentName,
                ClassId = s.ClassId,
                ClassName = s.Class?.Name ?? "",
                Gender = s.Gender,
                Dob = s.Dob,
                FatherName = s.FatherName,
                MotherName = s.MotherName,
                ContactNumber = s.ContactNumber,
                AlternateNumber = s.AlternateNumber,
                Email = s.Email,
                Address = s.Address,
                State = s.State,
                City = s.City,
                PreviousSchool = s.PreviousSchool,
                StudentPhotoUrl = s.StudentPhotoUrl,
                CustomFieldValues = customDict,
                AdmissionStatus = s.AdmissionStatus,
                FeeAmount = s.FeeAmount,
                PaidAmount = s.PaidAmount,
                BalanceAmount = s.BalanceAmount,
                PaymentStatus = s.PaymentStatus,
                CreatedOn = s.CreatedOn,
                Payments = s.Payments.Select(p => new AdmissionPaymentDto
                {
                    Id = p.Id,
                    AdmissionSlipId = p.AdmissionSlipId,
                    ReceiptNumber = p.ReceiptNumber,
                    PaymentDate = p.PaymentDate,
                    Amount = p.Amount,
                    PaymentMode = p.PaymentMode,
                    TransactionReference = p.TransactionReference,
                    PaymentNote = p.PaymentNote
                }).ToList()
            };
        }

        private static AdmissionFormConfigDto MapToFormConfigDto(AdmissionFormConfig c)
        {
            return new AdmissionFormConfigDto
            {
                Id = c.Id,
                BranchId = c.BranchId,
                AcademicYearId = c.AcademicYearId,
                FormTitle = c.FormTitle,
                FormDescription = c.FormDescription,
                Instructions = c.Instructions,
                ApplicationFee = c.ApplicationFee,
                Version = c.Version,
                Fields = c.Fields.Where(f => f.IsActive).OrderBy(f => f.DisplayOrder).Select(f =>
                {
                    List<string>? opts = null;
                    if (!string.IsNullOrWhiteSpace(f.OptionsJson))
                    {
                        try { opts = JsonSerializer.Deserialize<List<string>>(f.OptionsJson); } catch {}
                    }
                    Dictionary<string, object>? valRules = null;
                    if (!string.IsNullOrWhiteSpace(f.ValidationRulesJson))
                    {
                        try { valRules = JsonSerializer.Deserialize<Dictionary<string, object>>(f.ValidationRulesJson); } catch {}
                    }

                    return new AdmissionFormFieldDto
                    {
                        Id = f.Id,
                        FieldKey = f.FieldKey,
                        FieldLabel = f.FieldLabel,
                        FieldType = f.FieldType,
                        Placeholder = f.Placeholder,
                        HelpText = f.HelpText,
                        DefaultValue = f.DefaultValue,
                        Options = opts,
                        ValidationRules = valRules,
                        DisplayOrder = f.DisplayOrder,
                        IsSystemField = f.IsSystemField,
                        IsVisibleOnSlip = f.IsVisibleOnSlip,
                        GridSpan = f.GridSpan
                    };
                }).ToList()
            };
        }

        private static List<AdmissionFormField> GetDefaultInitialFields(long configId)
        {
            return new List<AdmissionFormField>
            {
                new() { FormConfigId = configId, FieldKey = "studentName", FieldLabel = "Student Name", FieldType = "text", Placeholder = "Enter student's full name", DisplayOrder = 1, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "dob", FieldLabel = "Date of Birth", FieldType = "date", Placeholder = "Select birth date", DisplayOrder = 2, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":false}" },
                new() { FormConfigId = configId, FieldKey = "gender", FieldLabel = "Gender", FieldType = "select", OptionsJson = "[\"Male\",\"Female\",\"Other\"]", DisplayOrder = 3, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":false}" },
                new() { FormConfigId = configId, FieldKey = "fatherName", FieldLabel = "Father's Name", FieldType = "text", Placeholder = "Enter father's full name", DisplayOrder = 4, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "motherName", FieldLabel = "Mother's Name", FieldType = "text", Placeholder = "Enter mother's full name", DisplayOrder = 5, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "contactNumber", FieldLabel = "Mobile Number", FieldType = "text", Placeholder = "10-digit mobile number", DisplayOrder = 6, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true,\"pattern\":\"^[0-9]{10}$\"}" },
                new() { FormConfigId = configId, FieldKey = "alternateNumber", FieldLabel = "Alternate Mobile Number", FieldType = "text", Placeholder = "Emergency alternate phone", DisplayOrder = 7, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":false}" },
                new() { FormConfigId = configId, FieldKey = "email", FieldLabel = "Email Address", FieldType = "email", Placeholder = "Parent/Student email address", DisplayOrder = 8, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":false}" },
                new() { FormConfigId = configId, FieldKey = "address", FieldLabel = "Residential Address", FieldType = "textarea", Placeholder = "Full postal address with locality", DisplayOrder = 9, IsSystemField = true, GridSpan = 12, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "state", FieldLabel = "State", FieldType = "text", Placeholder = "e.g. Delhi, Uttar Pradesh", DisplayOrder = 10, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "city", FieldLabel = "City", FieldType = "text", Placeholder = "City / Town name", DisplayOrder = 11, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "previousSchool", FieldLabel = "Previous School Name", FieldType = "text", Placeholder = "Name of previous institution (if any)", DisplayOrder = 12, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":false}" },
                new() { FormConfigId = configId, FieldKey = "classId", FieldLabel = "Admission Seeking Class", FieldType = "select", DisplayOrder = 13, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "academicYearId", FieldLabel = "Academic Session", FieldType = "select", DisplayOrder = 14, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":true}" },
                new() { FormConfigId = configId, FieldKey = "studentPhoto", FieldLabel = "Student Photo", FieldType = "file", DisplayOrder = 15, IsSystemField = true, GridSpan = 6, ValidationRulesJson = "{\"required\":false}" }
            };
        }
    }
}
