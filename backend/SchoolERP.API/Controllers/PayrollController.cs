using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
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
    [Authorize]
    public class PayrollController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PayrollController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResult<PayrollListDto>>>> GetPayrolls(
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] long? departmentId,
            [FromQuery] long? designationId,
            [FromQuery] string? paymentStatus,
            [FromQuery] string? search,
            [FromQuery] int pageNo = 1,
            [FromQuery] int pageSize = 15)
        {
            var branchId = _currentUserService.BranchId;

            var query = _context.StaffPayrolls
                .Include(p => p.Employee)
                    .ThenInclude(e => e!.Department)
                .Include(p => p.Employee)
                    .ThenInclude(e => e!.Designation)
                .Where(p => p.BranchId == branchId && p.IsActive)
                .AsNoTracking();

            if (month.HasValue && month.Value > 0)
                query = query.Where(p => p.PayrollMonth == month.Value);

            if (year.HasValue && year.Value > 0)
                query = query.Where(p => p.PayrollYear == year.Value);

            if (!string.IsNullOrWhiteSpace(paymentStatus) && paymentStatus != "All")
                query = query.Where(p => p.PaymentStatus == paymentStatus);

            if (departmentId.HasValue && departmentId.Value > 0)
                query = query.Where(p => p.Employee != null && p.Employee.DepartmentId == departmentId.Value);

            if (designationId.HasValue && designationId.Value > 0)
                query = query.Where(p => p.Employee != null && p.Employee.DesignationId == designationId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(p =>
                    p.SalarySlipNo.ToLower().Contains(s) ||
                    (p.Employee != null && (
                        p.Employee.EmployeeCode.ToLower().Contains(s) ||
                        p.Employee.FirstName.ToLower().Contains(s) ||
                        p.Employee.LastName.ToLower().Contains(s) ||
                        p.Employee.Mobile.Contains(s)
                    ))
                );
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.PayrollYear)
                .ThenByDescending(p => p.PayrollMonth)
                .ThenBy(p => p.Employee != null ? p.Employee.FirstName : "")
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PayrollListDto
                {
                    Id = p.Id,
                    EmployeeId = p.EmployeeId,
                    EmployeeCode = p.Employee != null ? p.Employee.EmployeeCode : string.Empty,
                    EmployeeName = p.Employee != null ? p.Employee.FullName : string.Empty,
                    Designation = p.Employee != null && p.Employee.Designation != null ? p.Employee.Designation.Name : null,
                    Department = p.Employee != null && p.Employee.Department != null ? p.Employee.Department.Name : null,
                    Mobile = p.Employee != null ? p.Employee.Mobile : string.Empty,
                    SalarySlipNo = p.SalarySlipNo,
                    PayrollMonth = p.PayrollMonth,
                    PayrollYear = p.PayrollYear,
                    MonthName = p.MonthName,
                    TotalWorkingDays = p.TotalWorkingDays,
                    PresentDays = p.PresentDays,
                    PaidLeaves = p.PaidLeaves,
                    UnpaidLeaves = p.UnpaidLeaves,
                    BasicSalary = p.BasicSalary,
                    GrossSalary = p.GrossSalary,
                    TotalDeductions = p.TotalDeductions,
                    NetSalary = p.NetSalary,
                    PaymentStatus = p.PaymentStatus,
                    PaymentDate = p.PaymentDate,
                    PaymentMode = p.PaymentMode,
                    TransactionReference = p.TransactionReference
                })
                .ToListAsync();

            return Ok(ApiResponse<PagedResult<PayrollListDto>>.Ok(
                new PagedResult<PayrollListDto>(items, totalCount, pageNo, pageSize)));
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<PayrollSummaryDto>>> GetSummary(
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            var branchId = _currentUserService.BranchId;
            var targetMonth = month ?? DateTime.UtcNow.Month;
            var targetYear = year ?? DateTime.UtcNow.Year;

            var totalStaff = await _context.Employees
                .Where(e => e.BranchId == branchId && e.Status == EmployeeStatus.Active && e.IsActive)
                .CountAsync();

            var payrolls = await _context.StaffPayrolls
                .Where(p => p.BranchId == branchId && p.PayrollMonth == targetMonth && p.PayrollYear == targetYear && p.IsActive)
                .ToListAsync();

            var summary = new PayrollSummaryDto
            {
                TotalEmployees = totalStaff,
                ProcessedCount = payrolls.Count,
                PaidCount = payrolls.Count(p => p.PaymentStatus == "Paid"),
                PendingCount = payrolls.Count(p => p.PaymentStatus != "Paid"),
                TotalGrossPayable = payrolls.Sum(p => p.GrossSalary),
                TotalDeductions = payrolls.Sum(p => p.TotalDeductions),
                TotalNetPayable = payrolls.Sum(p => p.NetSalary),
                TotalPaidAmount = payrolls.Where(p => p.PaymentStatus == "Paid").Sum(p => p.NetSalary),
                TotalPendingAmount = payrolls.Where(p => p.PaymentStatus != "Paid").Sum(p => p.NetSalary)
            };

            return Ok(ApiResponse<PayrollSummaryDto>.Ok(summary));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<PayrollDetailDto>>> GetPayrollById(long id)
        {
            var branchId = _currentUserService.BranchId;

            var payroll = await _context.StaffPayrolls
                .Include(p => p.Employee)
                    .ThenInclude(e => e!.Department)
                .Include(p => p.Employee)
                    .ThenInclude(e => e!.Designation)
                .Include(p => p.Branch)
                .FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId && p.IsActive);

            if (payroll == null)
                return NotFound(ApiResponse<PayrollDetailDto>.Fail("Salary slip record not found"));

            var emp = payroll.Employee;
            var branch = payroll.Branch;

            var detail = new PayrollDetailDto
            {
                Id = payroll.Id,
                EmployeeId = payroll.EmployeeId,
                EmployeeCode = emp?.EmployeeCode ?? string.Empty,
                EmployeeName = emp?.FullName ?? string.Empty,
                Designation = emp?.Designation?.Name,
                Department = emp?.Department?.Name,
                Mobile = emp?.Mobile ?? string.Empty,
                SalarySlipNo = payroll.SalarySlipNo,
                PayrollMonth = payroll.PayrollMonth,
                PayrollYear = payroll.PayrollYear,
                MonthName = payroll.MonthName,
                TotalWorkingDays = payroll.TotalWorkingDays,
                PresentDays = payroll.PresentDays,
                PaidLeaves = payroll.PaidLeaves,
                UnpaidLeaves = payroll.UnpaidLeaves,

                // Allowances
                BasicSalary = payroll.BasicSalary,
                Da = payroll.Da,
                Hra = payroll.Hra,
                Conveyance = payroll.Conveyance,
                MedicalAllowance = payroll.MedicalAllowance,
                SpecialAllowance = payroll.SpecialAllowance,
                GrossSalary = payroll.GrossSalary,

                // Deductions
                PfDeduction = payroll.PfDeduction,
                EsiDeduction = payroll.EsiDeduction,
                ProfessionalTax = payroll.ProfessionalTax,
                TdsDeduction = payroll.TdsDeduction,
                LoanDeduction = payroll.LoanDeduction,
                LeaveDeduction = payroll.LeaveDeduction,
                TotalDeductions = payroll.TotalDeductions,

                NetSalary = payroll.NetSalary,

                PaymentStatus = payroll.PaymentStatus,
                PaymentDate = payroll.PaymentDate,
                PaymentMode = payroll.PaymentMode,
                TransactionReference = payroll.TransactionReference,
                Remarks = payroll.Remarks,

                // Employee Profile details
                JoiningDate = emp?.JoiningDate ?? DateTime.UtcNow,
                PanNo = emp?.PanNo,
                AadhaarNo = emp?.AadhaarNo,
                BankName = emp?.BankName,
                AccountNo = emp?.AccountNo,
                IfscCode = emp?.IfscCode,
                PhotoUrl = emp?.PhotoUrl,

                // School letterhead
                SchoolName = branch?.Name ?? "DELHI PUBLIC SCHOOL",
                CampusName = "Main Campus",
                SchoolAddress = branch?.Address ?? "Knowledge Park, Sector 4, New Delhi",
                SchoolContact = branch?.Phone ?? "4564564564",
                SchoolEmail = branch?.Email ?? "main@dps.edu.in",
                AffiliationNo = "CBSE/2026/0912"
            };

            return Ok(ApiResponse<PayrollDetailDto>.Ok(detail));
        }

        [HttpGet("attendance-status")]
        public async Task<ActionResult<ApiResponse<MonthlyAttendanceStatusDto>>> GetAttendanceStatus(
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] long? departmentId)
        {
            var branchId = _currentUserService.BranchId;
            var targetMonth = month ?? DateTime.UtcNow.Month;
            var targetYear = year ?? DateTime.UtcNow.Year;

            if (targetMonth < 1 || targetMonth > 12)
                return BadRequest(ApiResponse<MonthlyAttendanceStatusDto>.Fail("Invalid month. Must be between 1 and 12"));

            var daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            var monthStart = new DateTime(targetYear, targetMonth, 1);
            var monthEnd = new DateTime(targetYear, targetMonth, daysInMonth, 23, 59, 59);
            var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(targetMonth) + " " + targetYear;

            // Fetch Holidays
            var holidays = await _context.Holidays
                .Where(h => h.BranchId == branchId &&
                            h.HolidayDate >= monthStart &&
                            h.HolidayDate <= monthEnd &&
                            h.IsActive)
                .ToListAsync();

            var holidayDates = holidays.Select(h => h.HolidayDate.Date).Distinct().ToList();

            int sundaysCount = 0;
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(targetYear, targetMonth, day);
                if (dt.DayOfWeek == DayOfWeek.Sunday)
                    sundaysCount++;
            }

            int nonSundayHolidays = holidayDates.Count(d => d.DayOfWeek != DayOfWeek.Sunday);
            int workingDays = Math.Max(0, daysInMonth - sundaysCount - nonSundayHolidays);

            // Fetch Employees
            var empQuery = _context.Employees
                .Include(e => e.Department)
                .Where(e => e.BranchId == branchId && e.Status == EmployeeStatus.Active && e.IsActive);

            if (departmentId.HasValue && departmentId.Value > 0)
                empQuery = empQuery.Where(e => e.DepartmentId == departmentId.Value);

            var employees = await empQuery.OrderBy(e => e.FirstName).ToListAsync();

            // Fetch Staff Attendance records for month
            var attendances = await _context.StaffAttendances
                .Where(a => a.BranchId == branchId &&
                            a.AttendanceDate >= monthStart &&
                            a.AttendanceDate <= monthEnd &&
                            a.IsActive)
                .ToListAsync();

            var markedDates = attendances.Select(a => a.AttendanceDate.Date).Distinct().ToList();
            int markedDatesCount = markedDates.Count;
            bool hasAttendanceRecords = markedDatesCount > 0;

            var previews = new List<EmployeeAttendancePreviewDto>();

            foreach (var emp in employees)
            {
                decimal basic = emp.SalaryBasic.HasValue && emp.SalaryBasic.Value > 0 ? emp.SalaryBasic.Value : 0m;
                var empAtts = attendances.Where(a => a.EmployeeId == emp.Id).ToList();

                decimal present = empAtts.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late);
                decimal halfDay = empAtts.Count(a => a.Status == AttendanceStatus.HalfDay);
                decimal leave = empAtts.Count(a => a.Status == AttendanceStatus.Leave);
                decimal absent = empAtts.Count(a => a.Status == AttendanceStatus.Absent);

                decimal paidDays;
                decimal lopDays;

                if (hasAttendanceRecords)
                {
                    paidDays = present + (halfDay * 0.5m) + leave + sundaysCount + nonSundayHolidays;
                    paidDays = Math.Min(daysInMonth, paidDays);
                    lopDays = Math.Max(0, daysInMonth - paidDays);
                }
                else
                {
                    paidDays = 0;
                    lopDays = daysInMonth;
                }

                decimal lopDeduction = daysInMonth > 0 ? Math.Round((basic / daysInMonth) * lopDays, 2) : 0;
                decimal netSalary = Math.Max(0, basic - lopDeduction);

                previews.Add(new EmployeeAttendancePreviewDto
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.FullName,
                    EmployeeCode = emp.EmployeeCode,
                    Department = emp.Department?.Name,
                    BasicSalary = basic,
                    PresentDays = present,
                    AbsentDays = absent,
                    LeaveDays = leave,
                    HalfDays = halfDay,
                    PaidDays = paidDays,
                    LOPDays = lopDays,
                    EstimatedLOPDeduction = lopDeduction,
                    EstimatedNetSalary = netSalary
                });
            }

            var result = new MonthlyAttendanceStatusDto
            {
                Month = targetMonth,
                Year = targetYear,
                MonthName = monthName,
                CalendarDays = daysInMonth,
                SundaysCount = sundaysCount,
                HolidaysCount = nonSundayHolidays,
                WorkingDays = workingDays,
                MarkedDatesCount = markedDatesCount,
                TotalEmployees = employees.Count,
                HasAttendanceRecords = hasAttendanceRecords,
                Message = hasAttendanceRecords
                    ? $"{markedDatesCount} working day(s) marked out of {workingDays} working days."
                    : $"No attendance records found for {monthName}. Daily staff attendance has not been marked yet.",
                StaffPreview = previews
            };

            return Ok(ApiResponse<MonthlyAttendanceStatusDto>.Ok(result));
        }

        [HttpPost("generate-monthly")]
        public async Task<ActionResult<ApiResponse<object>>> GenerateMonthlyPayroll([FromBody] GenerateMonthlyPayrollDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            if (dto.Month < 1 || dto.Month > 12)
                return BadRequest(ApiResponse<object>.Fail("Invalid month. Must be between 1 and 12"));

            var year = dto.Year > 2000 ? dto.Year : DateTime.UtcNow.Year;
            var daysInMonth = DateTime.DaysInMonth(year, dto.Month);
            var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(dto.Month) + " " + year;

            // Fetch active academic year
            var currentAcademicYear = await _context.AcademicYears
                .Where(ay => ay.BranchId == branchId && ay.IsActive)
                .OrderByDescending(ay => ay.IsCurrent)
                .FirstOrDefaultAsync();

            var academicYearId = currentAcademicYear?.Id ?? 1;

            // Fetch all active employees
            var empQuery = _context.Employees
                .Where(e => e.BranchId == branchId && e.Status == EmployeeStatus.Active && e.IsActive);

            if (dto.DepartmentId.HasValue && dto.DepartmentId.Value > 0)
                empQuery = empQuery.Where(e => e.DepartmentId == dto.DepartmentId.Value);

            var employees = await empQuery.ToListAsync();

            if (employees.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("No active employees found to generate payroll."));

            var monthStart = new DateTime(year, dto.Month, 1);
            var monthEnd = new DateTime(year, dto.Month, daysInMonth, 23, 59, 59);

            // Fetch Holidays
            var holidays = await _context.Holidays
                .Where(h => h.BranchId == branchId &&
                            h.HolidayDate >= monthStart &&
                            h.HolidayDate <= monthEnd &&
                            h.IsActive)
                .ToListAsync();

            var holidayDates = holidays.Select(h => h.HolidayDate.Date).Distinct().ToList();

            int sundaysCount = 0;
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(year, dto.Month, day);
                if (dt.DayOfWeek == DayOfWeek.Sunday)
                    sundaysCount++;
            }

            int nonSundayHolidays = holidayDates.Count(d => d.DayOfWeek != DayOfWeek.Sunday);

            // Fetch all staff attendance records for the month
            var allAttendances = await _context.StaffAttendances
                .Where(a => a.BranchId == branchId &&
                            a.AttendanceDate >= monthStart &&
                            a.AttendanceDate <= monthEnd &&
                            a.IsActive)
                .ToListAsync();

            var markedDates = allAttendances.Select(a => a.AttendanceDate.Date).Distinct().ToList();
            int markedDatesCount = markedDates.Count;

            // Mode detection
            var mode = !string.IsNullOrWhiteSpace(dto.AttendanceMode)
                ? dto.AttendanceMode
                : (dto.AutoCalculateAttendance ? "StrictAttendance" : "FullFixedSalary");

            // CRITICAL VALIDATION: If Strict Attendance mode was chosen, but NO attendance was marked for this month:
            if (mode == "StrictAttendance" && markedDatesCount == 0)
            {
                return BadRequest(ApiResponse<object>.Fail(
                    $"No attendance records found for {monthName} (0 days marked). " +
                    $"Please mark daily staff attendance first in the Attendance Register, or select 'Full Fixed Monthly Salary' mode to disburse standard salary."));
            }

            int sequence = await _context.StaffPayrolls.CountAsync(p => p.BranchId == branchId && p.PayrollYear == year && p.PayrollMonth == dto.Month) + 1;

            int updatedCount = 0;
            int newCount = 0;

            foreach (var emp in employees)
            {
                // Simple School Fixed Monthly Salary (from Staff Profile)
                decimal basic = emp.SalaryBasic.HasValue && emp.SalaryBasic.Value > 0 ? emp.SalaryBasic.Value : 0m;
                decimal da = 0m;
                decimal hra = 0m;
                decimal conveyance = 0m;
                decimal medical = 0m;
                decimal special = 0m;

                decimal presentDays = daysInMonth;
                decimal unpaidLeaves = 0;
                decimal paidLeaves = 0;

                var empAtts = allAttendances.Where(a => a.EmployeeId == emp.Id).ToList();
                decimal present = empAtts.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late);
                decimal halfDay = empAtts.Count(a => a.Status == AttendanceStatus.HalfDay);
                decimal leave = empAtts.Count(a => a.Status == AttendanceStatus.Leave);
                decimal absent = empAtts.Count(a => a.Status == AttendanceStatus.Absent);

                if (mode == "StrictAttendance")
                {
                    // Paid days = Present days + HalfDay * 0.5 + Approved Leave + Sundays + Holidays
                    decimal paidDays = present + (halfDay * 0.5m) + leave + sundaysCount + nonSundayHolidays;
                    paidDays = Math.Min(daysInMonth, paidDays);
                    unpaidLeaves = Math.Max(0, daysInMonth - paidDays);
                    paidLeaves = leave;
                    presentDays = paidDays;
                }
                else if (mode == "DeductExplicitAbsents")
                {
                    unpaidLeaves = absent + (halfDay * 0.5m);
                    presentDays = Math.Max(0, daysInMonth - unpaidLeaves);
                    paidLeaves = leave;
                }
                else // "FullFixedSalary"
                {
                    presentDays = daysInMonth;
                    unpaidLeaves = 0;
                    paidLeaves = 0;
                }

                // Loss of Pay calculation
                decimal leaveDeduction = 0;
                if (unpaidLeaves > 0 && daysInMonth > 0)
                {
                    leaveDeduction = Math.Round((basic / daysInMonth) * unpaidLeaves, 2);
                }

                // Deductions (0 by default in schools - no auto corporate DA/HRA/PF/PT)
                decimal pf = 0m;
                decimal esi = 0m;
                decimal profTax = 0m;
                decimal tds = 0m;
                decimal loanDeduction = 0m;

                decimal gross = basic;
                decimal totalDeductions = leaveDeduction;
                decimal net = Math.Max(0, gross - totalDeductions);

                var existing = await _context.StaffPayrolls
                    .FirstOrDefaultAsync(p => p.BranchId == branchId && p.EmployeeId == emp.Id && p.PayrollMonth == dto.Month && p.PayrollYear == year && p.IsActive);

                if (existing != null)
                {
                    existing.BasicSalary = basic;
                    existing.Da = da;
                    existing.Hra = hra;
                    existing.Conveyance = conveyance;
                    existing.MedicalAllowance = medical;
                    existing.SpecialAllowance = special;
                    existing.GrossSalary = gross;

                    existing.PfDeduction = pf;
                    existing.EsiDeduction = esi;
                    existing.ProfessionalTax = profTax;
                    existing.TdsDeduction = tds;
                    existing.LoanDeduction = loanDeduction;
                    existing.LeaveDeduction = leaveDeduction;
                    existing.TotalDeductions = totalDeductions;
                    existing.NetSalary = net;

                    existing.TotalWorkingDays = daysInMonth;
                    existing.PresentDays = presentDays;
                    existing.PaidLeaves = paidLeaves;
                    existing.UnpaidLeaves = unpaidLeaves;
                    existing.ModifiedBy = userId;
                    existing.ModifiedOn = DateTime.UtcNow;

                    updatedCount++;
                }
                else
                {
                    var slipNo = $"PAY/{year}/{dto.Month:D2}/{sequence:D4}";
                    sequence++;

                    var record = new StaffPayroll
                    {
                        BranchId = branchId,
                        AcademicYearId = academicYearId,
                        EmployeeId = emp.Id,
                        SalarySlipNo = slipNo,
                        PayrollMonth = dto.Month,
                        PayrollYear = year,
                        MonthName = monthName,
                        TotalWorkingDays = daysInMonth,
                        PresentDays = presentDays,
                        PaidLeaves = paidLeaves,
                        UnpaidLeaves = unpaidLeaves,

                        BasicSalary = basic,
                        Da = da,
                        Hra = hra,
                        Conveyance = conveyance,
                        MedicalAllowance = medical,
                        SpecialAllowance = special,
                        GrossSalary = gross,

                        PfDeduction = pf,
                        EsiDeduction = esi,
                        ProfessionalTax = profTax,
                        TdsDeduction = tds,
                        LoanDeduction = loanDeduction,
                        LeaveDeduction = leaveDeduction,
                        TotalDeductions = totalDeductions,

                        NetSalary = net,
                        PaymentStatus = "Pending",
                        CreatedBy = userId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };

                    await _context.StaffPayrolls.AddAsync(record);
                    newCount++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                generated = newCount + updatedCount,
                month = monthName,
                message = $"Successfully processed {newCount + updatedCount} salary slips for {monthName}."
            }));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<StaffPayroll>>> CreatePayroll([FromBody] CreatePayrollDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == dto.EmployeeId && e.BranchId == branchId && e.IsActive);
            if (emp == null)
                return BadRequest(ApiResponse<StaffPayroll>.Fail("Employee not found"));

            var exists = await _context.StaffPayrolls.AnyAsync(p =>
                p.BranchId == branchId && p.EmployeeId == dto.EmployeeId &&
                p.PayrollMonth == dto.PayrollMonth && p.PayrollYear == dto.PayrollYear && p.IsActive);

            if (exists)
                return BadRequest(ApiResponse<StaffPayroll>.Fail($"Salary slip already exists for {emp.FullName} for this month and year"));

            var currentAcademicYear = await _context.AcademicYears
                .Where(ay => ay.BranchId == branchId && ay.IsActive)
                .OrderByDescending(ay => ay.IsCurrent)
                .FirstOrDefaultAsync();

            var seq = await _context.StaffPayrolls.CountAsync(p => p.BranchId == branchId && p.PayrollYear == dto.PayrollYear && p.PayrollMonth == dto.PayrollMonth) + 1;
            var slipNo = $"PAY/{dto.PayrollYear}/{dto.PayrollMonth:D2}/{seq:D4}";
            var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(dto.PayrollMonth) + " " + dto.PayrollYear;

            var gross = dto.BasicSalary + dto.Da + dto.Hra + dto.Conveyance + dto.MedicalAllowance + dto.SpecialAllowance;
            var totalDeductions = dto.PfDeduction + dto.EsiDeduction + dto.ProfessionalTax + dto.TdsDeduction + dto.LoanDeduction + dto.LeaveDeduction;
            var net = Math.Max(0, gross - totalDeductions);

            var payroll = new StaffPayroll
            {
                BranchId = branchId,
                AcademicYearId = currentAcademicYear?.Id ?? 1,
                EmployeeId = dto.EmployeeId,
                SalarySlipNo = slipNo,
                PayrollMonth = dto.PayrollMonth,
                PayrollYear = dto.PayrollYear,
                MonthName = monthName,
                TotalWorkingDays = dto.TotalWorkingDays,
                PresentDays = dto.PresentDays,
                PaidLeaves = dto.PaidLeaves,
                UnpaidLeaves = dto.UnpaidLeaves,

                BasicSalary = dto.BasicSalary,
                Da = dto.Da,
                Hra = dto.Hra,
                Conveyance = dto.Conveyance,
                MedicalAllowance = dto.MedicalAllowance,
                SpecialAllowance = dto.SpecialAllowance,
                GrossSalary = gross,

                PfDeduction = dto.PfDeduction,
                EsiDeduction = dto.EsiDeduction,
                ProfessionalTax = dto.ProfessionalTax,
                TdsDeduction = dto.TdsDeduction,
                LoanDeduction = dto.LoanDeduction,
                LeaveDeduction = dto.LeaveDeduction,
                TotalDeductions = totalDeductions,

                NetSalary = net,
                PaymentStatus = "Pending",
                Remarks = dto.Remarks,
                CreatedBy = userId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            await _context.StaffPayrolls.AddAsync(payroll);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<StaffPayroll>.Ok(payroll));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<StaffPayroll>>> UpdatePayroll(long id, [FromBody] UpdatePayrollDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            var payroll = await _context.StaffPayrolls.FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId && p.IsActive);
            if (payroll == null)
                return NotFound(ApiResponse<StaffPayroll>.Fail("Salary record not found"));

            payroll.TotalWorkingDays = dto.TotalWorkingDays;
            payroll.PresentDays = dto.PresentDays;
            payroll.PaidLeaves = dto.PaidLeaves;
            payroll.UnpaidLeaves = dto.UnpaidLeaves;

            payroll.BasicSalary = dto.BasicSalary;
            payroll.Da = dto.Da;
            payroll.Hra = dto.Hra;
            payroll.Conveyance = dto.Conveyance;
            payroll.MedicalAllowance = dto.MedicalAllowance;
            payroll.SpecialAllowance = dto.SpecialAllowance;

            var gross = dto.BasicSalary + dto.Da + dto.Hra + dto.Conveyance + dto.MedicalAllowance + dto.SpecialAllowance;
            var totalDeductions = dto.PfDeduction + dto.EsiDeduction + dto.ProfessionalTax + dto.TdsDeduction + dto.LoanDeduction + dto.LeaveDeduction;
            var net = Math.Max(0, gross - totalDeductions);

            payroll.GrossSalary = gross;
            payroll.PfDeduction = dto.PfDeduction;
            payroll.EsiDeduction = dto.EsiDeduction;
            payroll.ProfessionalTax = dto.ProfessionalTax;
            payroll.TdsDeduction = dto.TdsDeduction;
            payroll.LoanDeduction = dto.LoanDeduction;
            payroll.LeaveDeduction = dto.LeaveDeduction;
            payroll.TotalDeductions = totalDeductions;
            payroll.NetSalary = net;
            payroll.Remarks = dto.Remarks;

            payroll.ModifiedBy = userId;
            payroll.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<StaffPayroll>.Ok(payroll));
        }

        [HttpPost("{id}/pay")]
        public async Task<ActionResult<ApiResponse<object>>> RecordPayment(long id, [FromBody] RecordSalaryPaymentDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            var payroll = await _context.StaffPayrolls.FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId && p.IsActive);
            if (payroll == null)
                return NotFound(ApiResponse<object>.Fail("Salary record not found"));

            payroll.PaymentStatus = "Paid";
            payroll.PaymentDate = dto.PaymentDate;
            payroll.PaymentMode = dto.PaymentMode;
            payroll.TransactionReference = dto.TransactionReference;
            if (!string.IsNullOrWhiteSpace(dto.Remarks))
                payroll.Remarks = dto.Remarks;

            payroll.ModifiedBy = userId;
            payroll.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { message = $"Salary payment recorded for slip {payroll.SalarySlipNo}" }));
        }

        [HttpPost("bulk-pay")]
        public async Task<ActionResult<ApiResponse<object>>> BulkPay([FromBody] BulkPayDto dto)
        {
            var branchId = _currentUserService.BranchId;
            var userId = _currentUserService.UserId ?? 1;

            if (dto.PayrollIds == null || dto.PayrollIds.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("No salary slips selected for payment"));

            var payrolls = await _context.StaffPayrolls
                .Where(p => dto.PayrollIds.Contains(p.Id) && p.BranchId == branchId && p.IsActive)
                .ToListAsync();

            foreach (var p in payrolls)
            {
                p.PaymentStatus = "Paid";
                p.PaymentDate = dto.PaymentDate;
                p.PaymentMode = dto.PaymentMode;
                p.TransactionReference = dto.TransactionReference;
                if (!string.IsNullOrWhiteSpace(dto.Remarks))
                    p.Remarks = dto.Remarks;

                p.ModifiedBy = userId;
                p.ModifiedOn = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { paidCount = payrolls.Count, message = $"Successfully marked {payrolls.Count} salary slip(s) as Paid" }));
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<object>>> DeletePayroll(long id)
        {
            var branchId = _currentUserService.BranchId;

            var payroll = await _context.StaffPayrolls.FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId && p.IsActive);
            if (payroll == null)
                return NotFound(ApiResponse<object>.Fail("Salary record not found"));

            if (payroll.PaymentStatus == "Paid")
                return BadRequest(ApiResponse<object>.Fail("Cannot delete a salary slip that has already been paid"));

            payroll.IsActive = false;
            payroll.ModifiedBy = _currentUserService.UserId ?? 1;
            payroll.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { message = "Salary slip deleted successfully" }));
        }
    }
}
