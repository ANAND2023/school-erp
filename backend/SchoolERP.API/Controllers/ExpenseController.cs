using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.Application.Common.Interfaces;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace SchoolERP.API.Controllers
{
    [Route("api/expense")]
    [ApiController]
    [Authorize]
    public class ExpenseController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ExpenseController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _context.ExpenseCategories
                .Where(c => c.BranchId == _currentUserService.BranchId && c.IsActive)
                .ToListAsync();
            return Ok(new { success = true, data = categories });
        }

        [HttpPost("categories")]
        public async Task<IActionResult> SaveCategory([FromBody] ExpenseCategory category)
        {
            if (category.Id == 0)
            {
                category.BranchId = _currentUserService.BranchId;
                category.IsActive = true;
                category.CreatedBy = _currentUserService.UserId ?? 0;
                category.CreatedOn = DateTime.UtcNow;
                _context.ExpenseCategories.Add(category);
            }
            else
            {
                var existing = await _context.ExpenseCategories.FindAsync(category.Id);
                if (existing == null) return NotFound();
                existing.Name = category.Name;
                existing.Description = category.Description;
                existing.ModifiedBy = _currentUserService.UserId ?? 0;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(long id)
        {
            var category = await _context.ExpenseCategories.FindAsync(id);
            if (category != null)
            {
                category.IsActive = false;
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true });
        }

        [HttpGet]
        public async Task<IActionResult> GetExpenses([FromQuery] int? month, [FromQuery] int? year)
        {
            var query = _context.Expenses
                .Include(e => e.Category)
                .Where(e => e.BranchId == _currentUserService.BranchId && e.IsActive);
                
            if (month.HasValue && year.HasValue)
            {
                query = query.Where(e => e.ExpenseDate.Month == month.Value && e.ExpenseDate.Year == year.Value);
            }

            var expenses = await query.OrderByDescending(e => e.ExpenseDate).ToListAsync();
            return Ok(new { success = true, data = expenses });
        }

        [HttpPost]
        public async Task<IActionResult> SaveExpense([FromBody] Expense expense)
        {
            if (expense.Id == 0)
            {
                expense.BranchId = _currentUserService.BranchId;
                expense.IsActive = true;
                expense.CreatedBy = _currentUserService.UserId ?? 0;
                expense.CreatedOn = DateTime.UtcNow;
                _context.Expenses.Add(expense);
            }
            else
            {
                var existing = await _context.Expenses.FindAsync(expense.Id);
                if (existing == null) return NotFound();

                if ((DateTime.UtcNow - existing.CreatedOn).TotalHours > 10)
                {
                    return BadRequest(new { success = false, message = "Expenses cannot be updated after 10 hours of creation." });
                }

                existing.CategoryId = expense.CategoryId;
                existing.Title = expense.Title;
                existing.Description = expense.Description;
                existing.Amount = expense.Amount;
                existing.ExpenseDate = expense.ExpenseDate;
                existing.SpenderName = expense.SpenderName;
                existing.ModifiedBy = _currentUserService.UserId ?? 0;
                existing.ModifiedOn = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(long id)
        {
            var expense = await _context.Expenses.FindAsync(id);
            if (expense != null)
            {
                if ((DateTime.UtcNow - expense.CreatedOn).TotalHours > 10)
                {
                    return BadRequest(new { success = false, message = "Expenses cannot be deleted after 10 hours of creation." });
                }

                expense.IsActive = false;
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true });
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardData()
        {
            var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
            
            var expenses = await _context.Expenses
                .Include(e => e.Category)
                .Where(e => e.BranchId == _currentUserService.BranchId && e.IsActive && e.ExpenseDate >= sixMonthsAgo)
                .ToListAsync();

            // Monthly Trend
            var monthlyTrend = expenses
                .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
                .Select(g => new {
                    month = $"{g.Key.Year}-{g.Key.Month.ToString("D2")}",
                    amount = g.Sum(e => e.Amount)
                })
                .OrderBy(x => x.month)
                .ToList();

            // Category Breakdown for the current month
            var currentMonth = DateTime.UtcNow.Month;
            var currentYear = DateTime.UtcNow.Year;
            
            var categoryBreakdown = expenses
                .Where(e => e.ExpenseDate.Month == currentMonth && e.ExpenseDate.Year == currentYear)
                .GroupBy(e => e.Category?.Name ?? "Uncategorized")
                .Select(g => new {
                    category = g.Key,
                    amount = g.Sum(e => e.Amount)
                })
                .ToList();

            return Ok(new { 
                success = true, 
                data = new {
                    monthlyTrend,
                    categoryBreakdown,
                    totalCurrentMonth = categoryBreakdown.Sum(c => c.amount)
                }
            });
        }
    }
}
