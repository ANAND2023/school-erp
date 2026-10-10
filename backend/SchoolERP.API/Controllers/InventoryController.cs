using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.Common.Models;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InventoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public InventoryController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private long CurrentBranchId => _currentUserService.BranchId > 0 ? _currentUserService.BranchId : 1;
        private long CurrentUserId => _currentUserService.UserId ?? 1;

        [HttpPost("seed")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<bool>>> SeedInventory()
        {
            await DbInitializer.SeedInventoryAsync(_context);
            return Ok(ApiResponse<bool>.Ok(true, "Inventory demo data and sample student issue seeded successfully"));
        }

        #region 1. Dashboard Summary & Statistics

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<InventoryDashboardSummaryDto>>> GetSummary()
        {
            var branchId = CurrentBranchId;
            var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

            var items = await _context.InventoryItems
                .Where(i => i.BranchId == branchId && i.IsActive)
                .Include(i => i.Category)
                .ToListAsync();

            var totalItems = items.Count;
            var lowStockItems = items.Count(i => i.CurrentStock > 0 && i.CurrentStock <= i.ReorderLevel);
            var outOfStockItems = items.Count(i => i.CurrentStock <= 0);
            var totalCategories = await _context.ItemCategories.CountAsync(c => c.BranchId == branchId && c.IsActive);
            var totalSuppliers = await _context.ItemSuppliers.CountAsync(s => s.BranchId == branchId && s.IsActive);
            var totalStockValue = items.Sum(i => i.CurrentStock * i.UnitPrice);

            var purchasesThisMonth = await _context.InventoryPurchases
                .CountAsync(p => p.BranchId == branchId && p.PurchaseDate >= startOfMonth && p.IsActive);

            var issuesThisMonthCount = await _context.InventoryIssues
                .CountAsync(i => i.BranchId == branchId && i.IssueDate >= startOfMonth && i.IsActive);

            var today = DateTime.UtcNow.Date;
            var thirtyDaysAgo = today.AddDays(-30);
            
            var recentIssues = await _context.InventoryIssues
                .Where(i => i.BranchId == branchId && i.IsActive && i.IssueDate >= thirtyDaysAgo)
                .Include(i => i.IssueItems)
                .ThenInclude(ii => ii.Item)
                .ToListAsync();

            var issuesToday = recentIssues.Where(i => i.IssueDate.Date == today).ToList();
            var issuesThisMonthList = recentIssues.Where(i => i.IssueDate >= startOfMonth).ToList();

            var todaySalesAmount = issuesToday.SelectMany(i => i.IssueItems).Sum(ii => ii.Quantity * (ii.Item?.SellingPrice ?? ii.Item?.UnitPrice ?? 0));
            var todayProfit = issuesToday.SelectMany(i => i.IssueItems).Sum(ii => ii.Quantity * ((ii.Item?.SellingPrice ?? ii.Item?.UnitPrice ?? 0) - (ii.Item?.UnitPrice ?? 0)));

            var monthlySalesAmount = issuesThisMonthList.SelectMany(i => i.IssueItems).Sum(ii => ii.Quantity * (ii.Item?.SellingPrice ?? ii.Item?.UnitPrice ?? 0));
            var monthlyProfit = issuesThisMonthList.SelectMany(i => i.IssueItems).Sum(ii => ii.Quantity * ((ii.Item?.SellingPrice ?? ii.Item?.UnitPrice ?? 0) - (ii.Item?.UnitPrice ?? 0)));

            var weeklySalesGraph = Enumerable.Range(0, 7)
                .Select(offset => today.AddDays(-offset))
                .Select(date => {
                    var dailyIssues = recentIssues.Where(i => i.IssueDate.Date == date).ToList();
                    var sales = dailyIssues.SelectMany(i => i.IssueItems).Sum(ii => ii.Quantity * (ii.Item?.SellingPrice ?? ii.Item?.UnitPrice ?? 0));
                    var profit = dailyIssues.SelectMany(i => i.IssueItems).Sum(ii => ii.Quantity * ((ii.Item?.SellingPrice ?? ii.Item?.UnitPrice ?? 0) - (ii.Item?.UnitPrice ?? 0)));
                    return new DailySalesDataDto {
                        Date = date.ToString("MMM dd"),
                        SalesAmount = sales,
                        Profit = profit
                    };
                }).OrderBy(x => x.Date).ToList();

            var lowStockAlerts = items
                .Where(i => i.CurrentStock <= i.ReorderLevel)
                .OrderBy(i => i.CurrentStock)
                .Take(10)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    BranchId = i.BranchId,
                    CategoryId = i.CategoryId,
                    CategoryName = i.Category?.Name ?? "Uncategorized",
                    ItemCode = i.ItemCode,
                    ItemName = i.ItemName,
                    Unit = i.Unit,
                    UnitPrice = i.UnitPrice,
                    SellingPrice = i.SellingPrice,
                    ReorderLevel = i.ReorderLevel,
                    OpeningStock = i.OpeningStock,
                    CurrentStock = i.CurrentStock,
                    RackNumber = i.RackNumber,
                    StockStatus = i.CurrentStock <= 0 ? "Out of Stock" : "Low Stock",
                    IsActive = i.IsActive
                })
                .ToList();

            var recentLogs = await _context.InventoryStockLogs
                .Where(l => l.BranchId == branchId && l.IsActive)
                .Include(l => l.Item)
                .ThenInclude(it => it.Category)
                .OrderByDescending(l => l.TransactionDate)
                .Take(10)
                .Select(l => new InventoryStockLogDto
                {
                    Id = l.Id,
                    BranchId = l.BranchId,
                    ItemId = l.ItemId,
                    ItemName = l.Item != null ? l.Item.ItemName : "",
                    ItemCode = l.Item != null ? l.Item.ItemCode : "",
                    CategoryName = l.Item != null && l.Item.Category != null ? l.Item.Category.Name : "",
                    TransactionType = l.TransactionType,
                    ReferenceNumber = l.ReferenceNumber,
                    Quantity = l.Quantity,
                    BalanceAfter = l.BalanceAfter,
                    TransactionDate = l.TransactionDate,
                    Remarks = l.Remarks
                })
                .ToListAsync();

            var summary = new InventoryDashboardSummaryDto
            {
                TotalItems = totalItems,
                LowStockItems = lowStockItems,
                OutOfStockItems = outOfStockItems,
                TotalCategories = totalCategories,
                TotalSuppliers = totalSuppliers,
                TotalStockValue = totalStockValue,
                TotalPurchasesThisMonth = purchasesThisMonth,
                TotalIssuesThisMonth = issuesThisMonthCount,
                TodaySalesAmount = todaySalesAmount,
                TodayProfit = todayProfit,
                MonthlySalesAmount = monthlySalesAmount,
                MonthlyProfit = monthlyProfit,
                WeeklySalesGraph = weeklySalesGraph,
                LowStockAlerts = lowStockAlerts,
                RecentActivities = recentLogs
            };

            return Ok(ApiResponse<InventoryDashboardSummaryDto>.Ok(summary));
        }

        #endregion

        #region 2. Item Categories

        [HttpGet("categories")]
        public async Task<ActionResult<ApiResponse<List<ItemCategoryDto>>>> GetCategories()
        {
            var branchId = CurrentBranchId;
            var categories = await _context.ItemCategories
                .Where(c => c.BranchId == branchId && c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.Name)
                .Select(c => new ItemCategoryDto
                {
                    Id = c.Id,
                    BranchId = c.BranchId,
                    Name = c.Name,
                    Code = c.Code,
                    Description = c.Description,
                    DisplayOrder = c.DisplayOrder,
                    ItemCount = c.Items.Count(i => i.IsActive),
                    IsActive = c.IsActive
                })
                .ToListAsync();

            return Ok(ApiResponse<List<ItemCategoryDto>>.Ok(categories));
        }

        [HttpPost("categories")]
        public async Task<ActionResult<ApiResponse<ItemCategoryDto>>> CreateCategory([FromBody] CreateItemCategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(ApiResponse<ItemCategoryDto>.Fail("Category name is required"));

            var branchId = CurrentBranchId;
            var category = new ItemCategory
            {
                BranchId = branchId,
                Name = dto.Name.Trim(),
                Code = dto.Code?.Trim().ToUpper(),
                Description = dto.Description?.Trim(),
                DisplayOrder = dto.DisplayOrder,
                CreatedBy = CurrentUserId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.ItemCategories.Add(category);
            await _context.SaveChangesAsync();

            var res = new ItemCategoryDto
            {
                Id = category.Id,
                BranchId = category.BranchId,
                Name = category.Name,
                Code = category.Code,
                Description = category.Description,
                DisplayOrder = category.DisplayOrder,
                ItemCount = 0,
                IsActive = category.IsActive
            };

            return Ok(ApiResponse<ItemCategoryDto>.Ok(res, "Item Category created successfully"));
        }

        [HttpPut("categories/{id}")]
        public async Task<ActionResult<ApiResponse<ItemCategoryDto>>> UpdateCategory(long id, [FromBody] UpdateItemCategoryDto dto)
        {
            var branchId = CurrentBranchId;
            var category = await _context.ItemCategories.FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);
            if (category == null)
                return NotFound(ApiResponse<ItemCategoryDto>.Fail("Category not found"));

            category.Name = dto.Name.Trim();
            category.Code = dto.Code?.Trim().ToUpper();
            category.Description = dto.Description?.Trim();
            category.DisplayOrder = dto.DisplayOrder;
            category.IsActive = dto.IsActive;
            category.ModifiedBy = CurrentUserId;
            category.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<ItemCategoryDto>.Ok(new ItemCategoryDto
            {
                Id = category.Id,
                BranchId = category.BranchId,
                Name = category.Name,
                Code = category.Code,
                Description = category.Description,
                DisplayOrder = category.DisplayOrder,
                IsActive = category.IsActive
            }, "Item Category updated successfully"));
        }

        [HttpDelete("categories/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteCategory(long id)
        {
            var branchId = CurrentBranchId;
            var category = await _context.ItemCategories.FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);
            if (category == null)
                return NotFound(ApiResponse<bool>.Fail("Category not found"));

            var hasItems = await _context.InventoryItems.AnyAsync(i => i.CategoryId == id && i.IsActive);
            if (hasItems)
                return BadRequest(ApiResponse<bool>.Fail("Cannot delete category with associated active items"));

            category.IsActive = false;
            category.ModifiedBy = CurrentUserId;
            category.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, "Category deleted successfully"));
        }

        #endregion

        #region 3. Item Suppliers / Vendors

        [HttpGet("suppliers")]
        public async Task<ActionResult<ApiResponse<List<ItemSupplierDto>>>> GetSuppliers()
        {
            var branchId = CurrentBranchId;
            var suppliers = await _context.ItemSuppliers
                .Where(s => s.BranchId == branchId && s.IsActive)
                .OrderBy(s => s.SupplierName)
                .Select(s => new ItemSupplierDto
                {
                    Id = s.Id,
                    BranchId = s.BranchId,
                    SupplierName = s.SupplierName,
                    ContactPerson = s.ContactPerson,
                    Phone = s.Phone,
                    Email = s.Email,
                    Address = s.Address,
                    City = s.City,
                    State = s.State,
                    Gstin = s.Gstin,
                    Remarks = s.Remarks,
                    TotalPurchases = s.Purchases.Count(p => p.IsActive),
                    IsActive = s.IsActive
                })
                .ToListAsync();

            return Ok(ApiResponse<List<ItemSupplierDto>>.Ok(suppliers));
        }

        [HttpPost("suppliers")]
        public async Task<ActionResult<ApiResponse<ItemSupplierDto>>> CreateSupplier([FromBody] CreateItemSupplierDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.SupplierName))
                return BadRequest(ApiResponse<ItemSupplierDto>.Fail("Supplier/Vendor name is required"));

            var branchId = CurrentBranchId;
            var supplier = new ItemSupplier
            {
                BranchId = branchId,
                SupplierName = dto.SupplierName.Trim(),
                ContactPerson = dto.ContactPerson?.Trim(),
                Phone = dto.Phone?.Trim(),
                Email = dto.Email?.Trim(),
                Address = dto.Address?.Trim(),
                City = dto.City?.Trim(),
                State = dto.State?.Trim(),
                Gstin = dto.Gstin?.Trim(),
                Remarks = dto.Remarks?.Trim(),
                CreatedBy = CurrentUserId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.ItemSuppliers.Add(supplier);
            await _context.SaveChangesAsync();

            var res = new ItemSupplierDto
            {
                Id = supplier.Id,
                BranchId = supplier.BranchId,
                SupplierName = supplier.SupplierName,
                ContactPerson = supplier.ContactPerson,
                Phone = supplier.Phone,
                Email = supplier.Email,
                Address = supplier.Address,
                City = supplier.City,
                State = supplier.State,
                Gstin = supplier.Gstin,
                Remarks = supplier.Remarks,
                TotalPurchases = 0,
                IsActive = supplier.IsActive
            };

            return Ok(ApiResponse<ItemSupplierDto>.Ok(res, "Supplier created successfully"));
        }

        [HttpPut("suppliers/{id}")]
        public async Task<ActionResult<ApiResponse<ItemSupplierDto>>> UpdateSupplier(long id, [FromBody] UpdateItemSupplierDto dto)
        {
            var branchId = CurrentBranchId;
            var supplier = await _context.ItemSuppliers.FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);
            if (supplier == null)
                return NotFound(ApiResponse<ItemSupplierDto>.Fail("Supplier not found"));

            supplier.SupplierName = dto.SupplierName.Trim();
            supplier.ContactPerson = dto.ContactPerson?.Trim();
            supplier.Phone = dto.Phone?.Trim();
            supplier.Email = dto.Email?.Trim();
            supplier.Address = dto.Address?.Trim();
            supplier.City = dto.City?.Trim();
            supplier.State = dto.State?.Trim();
            supplier.Gstin = dto.Gstin?.Trim();
            supplier.Remarks = dto.Remarks?.Trim();
            supplier.IsActive = dto.IsActive;
            supplier.ModifiedBy = CurrentUserId;
            supplier.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<ItemSupplierDto>.Ok(new ItemSupplierDto
            {
                Id = supplier.Id,
                BranchId = supplier.BranchId,
                SupplierName = supplier.SupplierName,
                ContactPerson = supplier.ContactPerson,
                Phone = supplier.Phone,
                Email = supplier.Email,
                Address = supplier.Address,
                City = supplier.City,
                State = supplier.State,
                Gstin = supplier.Gstin,
                Remarks = supplier.Remarks,
                IsActive = supplier.IsActive
            }, "Supplier updated successfully"));
        }

        [HttpDelete("suppliers/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteSupplier(long id)
        {
            var branchId = CurrentBranchId;
            var supplier = await _context.ItemSuppliers.FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);
            if (supplier == null)
                return NotFound(ApiResponse<bool>.Fail("Supplier not found"));

            supplier.IsActive = false;
            supplier.ModifiedBy = CurrentUserId;
            supplier.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, "Supplier deleted successfully"));
        }

        #endregion

        #region 4. Inventory Items (Stock Items)

        [HttpGet("items")]
        public async Task<ActionResult<ApiResponse<List<InventoryItemDto>>>> GetItems(
            [FromQuery] long? categoryId,
            [FromQuery] string? search,
            [FromQuery] bool? lowStockOnly)
        {
            var branchId = CurrentBranchId;
            var query = _context.InventoryItems
                .Where(i => i.BranchId == branchId && i.IsActive)
                .Include(i => i.Category)
                .AsQueryable();

            if (categoryId.HasValue && categoryId.Value > 0)
                query = query.Where(i => i.CategoryId == categoryId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(i => i.ItemName.ToLower().Contains(s) || i.ItemCode.ToLower().Contains(s));
            }

            var list = await query
                .OrderBy(i => i.ItemName)
                .ToListAsync();

            if (lowStockOnly == true)
            {
                list = list.Where(i => i.CurrentStock <= i.ReorderLevel).ToList();
            }

            var dtos = list.Select(i => new InventoryItemDto
            {
                Id = i.Id,
                BranchId = i.BranchId,
                CategoryId = i.CategoryId,
                CategoryName = i.Category?.Name ?? "Uncategorized",
                ItemCode = i.ItemCode,
                ItemName = i.ItemName,
                Unit = i.Unit,
                UnitPrice = i.UnitPrice,
                SellingPrice = i.SellingPrice,
                ReorderLevel = i.ReorderLevel,
                OpeningStock = i.OpeningStock,
                CurrentStock = i.CurrentStock,
                RackNumber = i.RackNumber,
                Description = i.Description,
                ManufacturedBy = i.ManufacturedBy,
                StockStatus = i.CurrentStock <= 0 ? "Out of Stock" : (i.CurrentStock <= i.ReorderLevel ? "Low Stock" : "In Stock"),
                IsActive = i.IsActive
            }).ToList();

            return Ok(ApiResponse<List<InventoryItemDto>>.Ok(dtos));
        }

        [HttpGet("items/{id}")]
        public async Task<ActionResult<ApiResponse<InventoryItemDto>>> GetItemById(long id)
        {
            var branchId = CurrentBranchId;
            var i = await _context.InventoryItems
                .Include(it => it.Category)
                .FirstOrDefaultAsync(it => it.Id == id && it.BranchId == branchId);

            if (i == null)
                return NotFound(ApiResponse<InventoryItemDto>.Fail("Item not found"));

            var dto = new InventoryItemDto
            {
                Id = i.Id,
                BranchId = i.BranchId,
                CategoryId = i.CategoryId,
                CategoryName = i.Category?.Name ?? "Uncategorized",
                ItemCode = i.ItemCode,
                ItemName = i.ItemName,
                Unit = i.Unit,
                UnitPrice = i.UnitPrice,
                SellingPrice = i.SellingPrice,
                ReorderLevel = i.ReorderLevel,
                OpeningStock = i.OpeningStock,
                CurrentStock = i.CurrentStock,
                RackNumber = i.RackNumber,
                Description = i.Description,
                ManufacturedBy = i.ManufacturedBy,
                StockStatus = i.CurrentStock <= 0 ? "Out of Stock" : (i.CurrentStock <= i.ReorderLevel ? "Low Stock" : "In Stock"),
                IsActive = i.IsActive
            };

            return Ok(ApiResponse<InventoryItemDto>.Ok(dto));
        }

        [HttpPost("items")]
        public async Task<ActionResult<ApiResponse<InventoryItemDto>>> CreateItem([FromBody] CreateInventoryItemDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ItemName))
                return BadRequest(ApiResponse<InventoryItemDto>.Fail("Item name is required"));

            if (dto.CategoryId <= 0)
                return BadRequest(ApiResponse<InventoryItemDto>.Fail("Valid item category is required"));

            var branchId = CurrentBranchId;

            // Generate code if blank
            var itemCode = dto.ItemCode?.Trim().ToUpper();
            if (string.IsNullOrWhiteSpace(itemCode))
            {
                var count = await _context.InventoryItems.CountAsync(i => i.BranchId == branchId) + 1;
                itemCode = $"ITM-{count:D4}";
            }

            var item = new InventoryItem
            {
                BranchId = branchId,
                CategoryId = dto.CategoryId,
                ItemCode = itemCode,
                ItemName = dto.ItemName.Trim(),
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "Pcs" : dto.Unit.Trim(),
                UnitPrice = dto.UnitPrice,
                SellingPrice = dto.SellingPrice,
                ReorderLevel = dto.ReorderLevel,
                OpeningStock = dto.OpeningStock,
                CurrentStock = dto.OpeningStock,
                RackNumber = dto.RackNumber?.Trim(),
                ManufacturedBy = dto.ManufacturedBy?.Trim(),
                Description = dto.Description?.Trim(),
                CreatedBy = CurrentUserId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.InventoryItems.Add(item);
            await _context.SaveChangesAsync();

            // Record initial stock movement log if opening stock > 0
            if (dto.OpeningStock > 0)
            {
                var stockLog = new InventoryStockLog
                {
                    BranchId = branchId,
                    ItemId = item.Id,
                    TransactionType = "OPENING",
                    ReferenceNumber = "OP-STOCK",
                    Quantity = dto.OpeningStock,
                    BalanceAfter = dto.OpeningStock,
                    TransactionDate = DateTime.UtcNow,
                    Remarks = "Initial Opening Stock",
                    CreatedBy = CurrentUserId,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                _context.InventoryStockLogs.Add(stockLog);
                await _context.SaveChangesAsync();
            }

            var category = await _context.ItemCategories.FindAsync(item.CategoryId);

            var res = new InventoryItemDto
            {
                Id = item.Id,
                BranchId = item.BranchId,
                CategoryId = item.CategoryId,
                CategoryName = category?.Name ?? "",
                ItemCode = item.ItemCode,
                ItemName = item.ItemName,
                Unit = item.Unit,
                UnitPrice = item.UnitPrice,
                SellingPrice = item.SellingPrice,
                ReorderLevel = item.ReorderLevel,
                OpeningStock = item.OpeningStock,
                CurrentStock = item.CurrentStock,
                RackNumber = item.RackNumber,
                Description = item.Description,
                ManufacturedBy = item.ManufacturedBy,
                StockStatus = item.CurrentStock <= 0 ? "Out of Stock" : (item.CurrentStock <= item.ReorderLevel ? "Low Stock" : "In Stock"),
                IsActive = item.IsActive
            };

            return Ok(ApiResponse<InventoryItemDto>.Ok(res, "Inventory item created successfully"));
        }

        [HttpPut("items/{id}")]
        public async Task<ActionResult<ApiResponse<InventoryItemDto>>> UpdateItem(long id, [FromBody] UpdateInventoryItemDto dto)
        {
            var branchId = CurrentBranchId;
            var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == id && i.BranchId == branchId);
            if (item == null)
                return NotFound(ApiResponse<InventoryItemDto>.Fail("Item not found"));

            if (dto.CategoryId > 0)
                item.CategoryId = dto.CategoryId;

            if (!string.IsNullOrWhiteSpace(dto.ItemCode))
                item.ItemCode = dto.ItemCode.Trim().ToUpper();

            item.ItemName = dto.ItemName.Trim();
            item.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "Pcs" : dto.Unit.Trim();
            item.UnitPrice = dto.UnitPrice;
            item.SellingPrice = dto.SellingPrice;
            item.ReorderLevel = dto.ReorderLevel;
            item.RackNumber = dto.RackNumber?.Trim();
            item.Description = dto.Description?.Trim();
            item.ManufacturedBy = dto.ManufacturedBy?.Trim();
            item.IsActive = dto.IsActive;
            item.ModifiedBy = CurrentUserId;
            item.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var category = await _context.ItemCategories.FindAsync(item.CategoryId);

            return Ok(ApiResponse<InventoryItemDto>.Ok(new InventoryItemDto
            {
                Id = item.Id,
                BranchId = item.BranchId,
                CategoryId = item.CategoryId,
                CategoryName = category?.Name ?? "",
                ItemCode = item.ItemCode,
                ItemName = item.ItemName,
                Unit = item.Unit,
                UnitPrice = item.UnitPrice,
                SellingPrice = item.SellingPrice,
                ReorderLevel = item.ReorderLevel,
                OpeningStock = item.OpeningStock,
                CurrentStock = item.CurrentStock,
                RackNumber = item.RackNumber,
                Description = item.Description,
                ManufacturedBy = item.ManufacturedBy,
                StockStatus = item.CurrentStock <= 0 ? "Out of Stock" : (item.CurrentStock <= item.ReorderLevel ? "Low Stock" : "In Stock"),
                IsActive = item.IsActive
            }, "Item updated successfully"));
        }

        [HttpDelete("items/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(long id)
        {
            var branchId = CurrentBranchId;
            var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == id && i.BranchId == branchId);
            if (item == null)
                return NotFound(ApiResponse<bool>.Fail("Item not found"));

            item.IsActive = false;
            item.ModifiedBy = CurrentUserId;
            item.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, "Item deleted successfully"));
        }

        #endregion

        #region 5. Purchases (Stock Inward)

        [HttpGet("purchases")]
        public async Task<ActionResult<ApiResponse<List<InventoryPurchaseDto>>>> GetPurchases()
        {
            var branchId = CurrentBranchId;
            var purchases = await _context.InventoryPurchases
                .Where(p => p.BranchId == branchId && p.IsActive)
                .Include(p => p.Supplier)
                .Include(p => p.PurchaseItems)
                .ThenInclude(pi => pi.Item)
                .OrderByDescending(p => p.PurchaseDate)
                .ThenByDescending(p => p.Id)
                .Select(p => new InventoryPurchaseDto
                {
                    Id = p.Id,
                    BranchId = p.BranchId,
                    SupplierId = p.SupplierId,
                    SupplierName = p.Supplier != null ? p.Supplier.SupplierName : "Direct Purchase",
                    PurchaseNumber = p.PurchaseNumber,
                    InvoiceNumber = p.InvoiceNumber,
                    PurchaseDate = p.PurchaseDate,
                    TotalAmount = p.TotalAmount,
                    PaymentMode = p.PaymentMode,
                    PaymentStatus = p.PaymentStatus,
                    Remarks = p.Remarks,
                    ItemCount = p.PurchaseItems.Count,
                    Items = p.PurchaseItems.Select(pi => new InventoryPurchaseItemDto
                    {
                        Id = pi.Id,
                        PurchaseId = pi.PurchaseId,
                        ItemId = pi.ItemId,
                        ItemName = pi.Item != null ? pi.Item.ItemName : "",
                        ItemCode = pi.Item != null ? pi.Item.ItemCode : "",
                        Unit = pi.Item != null ? pi.Item.Unit : "Pcs",
                        Quantity = pi.Quantity,
                        UnitCost = pi.UnitCost,
                        TotalCost = pi.TotalCost,
                        BatchNo = pi.BatchNo,
                        Remarks = pi.Remarks
                    }).ToList()
                })
                .ToListAsync();

            return Ok(ApiResponse<List<InventoryPurchaseDto>>.Ok(purchases));
        }

        [HttpPost("purchases")]
        public async Task<ActionResult<ApiResponse<InventoryPurchaseDto>>> CreatePurchase([FromBody] CreateInventoryPurchaseDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(ApiResponse<InventoryPurchaseDto>.Fail("At least one purchase item is required"));

            var branchId = CurrentBranchId;
            var purchaseCount = await _context.InventoryPurchases.CountAsync(p => p.BranchId == branchId) + 1;
            var purchaseNo = $"PUR-{DateTime.UtcNow.Year}-{purchaseCount:D4}";

            decimal totalAmount = 0;
            var purchaseItems = new List<InventoryPurchaseItem>();

            foreach (var it in dto.Items)
            {
                if (it.ItemId <= 0 || it.Quantity <= 0) continue;
                var totalCost = it.Quantity * it.UnitCost;
                totalAmount += totalCost;

                purchaseItems.Add(new InventoryPurchaseItem
                {
                    ItemId = it.ItemId,
                    Quantity = it.Quantity,
                    UnitCost = it.UnitCost,
                    TotalCost = totalCost,
                    BatchNo = it.BatchNo?.Trim(),
                    Remarks = it.Remarks?.Trim(),
                    CreatedBy = CurrentUserId,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                });
            }

            if (purchaseItems.Count == 0)
                return BadRequest(ApiResponse<InventoryPurchaseDto>.Fail("Please enter valid item quantities"));

            var purchase = new InventoryPurchase
            {
                BranchId = branchId,
                SupplierId = dto.SupplierId,
                PurchaseNumber = purchaseNo,
                InvoiceNumber = dto.InvoiceNumber?.Trim(),
                PurchaseDate = dto.PurchaseDate,
                TotalAmount = totalAmount,
                PaymentMode = string.IsNullOrWhiteSpace(dto.PaymentMode) ? "Cash" : dto.PaymentMode.Trim(),
                PaymentStatus = string.IsNullOrWhiteSpace(dto.PaymentStatus) ? "Paid" : dto.PaymentStatus.Trim(),
                Remarks = dto.Remarks?.Trim(),
                PurchaseItems = purchaseItems,
                CreatedBy = CurrentUserId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.InventoryPurchases.Add(purchase);
            await _context.SaveChangesAsync();

            // Update item stock and insert stock movement logs
            foreach (var pi in purchaseItems)
            {
                var item = await _context.InventoryItems.FindAsync(pi.ItemId);
                if (item != null)
                {
                    item.CurrentStock += pi.Quantity;
                    if (pi.UnitCost > 0)
                    {
                        item.UnitPrice = pi.UnitCost;
                    }
                    item.ModifiedBy = CurrentUserId;
                    item.ModifiedOn = DateTime.UtcNow;

                    var log = new InventoryStockLog
                    {
                        BranchId = branchId,
                        ItemId = item.Id,
                        TransactionType = "PURCHASE",
                        ReferenceNumber = purchaseNo,
                        Quantity = pi.Quantity,
                        BalanceAfter = item.CurrentStock,
                        TransactionDate = dto.PurchaseDate,
                        Remarks = $"Purchase #{purchaseNo}" + (!string.IsNullOrWhiteSpace(dto.InvoiceNumber) ? $" (Inv: {dto.InvoiceNumber})" : ""),
                        CreatedBy = CurrentUserId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.InventoryStockLogs.Add(log);
                }
            }

            await _context.SaveChangesAsync();

            var supplier = dto.SupplierId.HasValue ? await _context.ItemSuppliers.FindAsync(dto.SupplierId.Value) : null;

            var res = new InventoryPurchaseDto
            {
                Id = purchase.Id,
                BranchId = purchase.BranchId,
                SupplierId = purchase.SupplierId,
                SupplierName = supplier?.SupplierName ?? "Direct Purchase",
                PurchaseNumber = purchase.PurchaseNumber,
                InvoiceNumber = purchase.InvoiceNumber,
                PurchaseDate = purchase.PurchaseDate,
                TotalAmount = purchase.TotalAmount,
                PaymentMode = purchase.PaymentMode,
                PaymentStatus = purchase.PaymentStatus,
                Remarks = purchase.Remarks,
                ItemCount = purchaseItems.Count
            };

            return Ok(ApiResponse<InventoryPurchaseDto>.Ok(res, "Stock purchase recorded successfully"));
        }

        #endregion

        #region 6. Issues (Stock Outward / Distribution)

        [HttpGet("issues")]
        public async Task<ActionResult<ApiResponse<List<InventoryIssueDto>>>> GetIssues()
        {
            var branchId = CurrentBranchId;
            var issues = await _context.InventoryIssues
                .Where(i => i.BranchId == branchId && i.IsActive)
                .Include(i => i.IssueItems)
                .ThenInclude(ii => ii.Item)
                .OrderByDescending(i => i.IssueDate)
                .ThenByDescending(i => i.Id)
                .Select(i => new InventoryIssueDto
                {
                    Id = i.Id,
                    BranchId = i.BranchId,
                    IssueNumber = i.IssueNumber,
                    IssueDate = i.IssueDate,
                    IssuedToType = i.IssuedToType,
                    IssuedToId = i.IssuedToId,
                    IssuedToName = i.IssuedToName,
                    Department = i.Department,
                    IsReturnable = i.IsReturnable,
                    ReturnDueDate = i.ReturnDueDate,
                    Status = i.Status,
                    Remarks = i.Remarks,
                    PaymentMode = i.PaymentMode,
                    TotalItems = i.IssueItems.Count,
                    Items = i.IssueItems.Select(ii => new InventoryIssueItemDto
                    {
                        Id = ii.Id,
                        IssueId = ii.IssueId,
                        ItemId = ii.ItemId,
                        ItemName = ii.Item != null ? ii.Item.ItemName : "",
                        ItemCode = ii.Item != null ? ii.Item.ItemCode : "",
                        Unit = ii.Item != null ? ii.Item.Unit : "Pcs",
                        Quantity = ii.Quantity,
                        ReturnedQuantity = ii.ReturnedQuantity,
                        IsReturned = ii.IsReturned,
                        ReturnDate = ii.ReturnDate,
                        Remarks = ii.Remarks
                    }).ToList()
                })
                .ToListAsync();

            return Ok(ApiResponse<List<InventoryIssueDto>>.Ok(issues));
        }

        [HttpPost("issues")]
        public async Task<ActionResult<ApiResponse<InventoryIssueDto>>> CreateIssue([FromBody] CreateInventoryIssueDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.IssuedToName))
                return BadRequest(ApiResponse<InventoryIssueDto>.Fail("Recipient / Issued To name is required"));

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(ApiResponse<InventoryIssueDto>.Fail("At least one issue item is required"));

            var branchId = CurrentBranchId;

            // Check stock availability
            foreach (var it in dto.Items)
            {
                if (it.ItemId <= 0 || it.Quantity <= 0) continue;
                var stockItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == it.ItemId && i.BranchId == branchId);
                if (stockItem == null)
                    return BadRequest(ApiResponse<InventoryIssueDto>.Fail($"Item #{it.ItemId} not found"));

                if (stockItem.CurrentStock < it.Quantity)
                {
                    return BadRequest(ApiResponse<InventoryIssueDto>.Fail($"Insufficient stock for '{stockItem.ItemName}'. Available: {stockItem.CurrentStock}, Requested: {it.Quantity}"));
                }
            }

            var issueCount = await _context.InventoryIssues.CountAsync(i => i.BranchId == branchId) + 1;
            var issueNo = $"ISS-{DateTime.UtcNow.Year}-{issueCount:D4}";

            var issueItems = new List<InventoryIssueItem>();
            foreach (var it in dto.Items)
            {
                if (it.ItemId <= 0 || it.Quantity <= 0) continue;
                issueItems.Add(new InventoryIssueItem
                {
                    ItemId = it.ItemId,
                    Quantity = it.Quantity,
                    ReturnedQuantity = 0,
                    IsReturned = false,
                    Remarks = it.Remarks?.Trim(),
                    CreatedBy = CurrentUserId,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                });
            }

            var issue = new InventoryIssue
            {
                BranchId = branchId,
                IssueNumber = issueNo,
                IssueDate = dto.IssueDate,
                IssuedToType = string.IsNullOrWhiteSpace(dto.IssuedToType) ? "Student" : dto.IssuedToType.Trim(),
                IssuedToId = dto.IssuedToId,
                IssuedToName = dto.IssuedToName.Trim(),
                Department = dto.Department?.Trim(),
                IsReturnable = dto.IsReturnable,
                ReturnDueDate = dto.ReturnDueDate,
                Status = "Issued",
                Remarks = dto.Remarks,
                PaymentMode = dto.PaymentMode?.Trim(),
                IssueItems = issueItems,
                CreatedBy = CurrentUserId,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _context.InventoryIssues.Add(issue);
            await _context.SaveChangesAsync();

            // Deduct stock and create logs
            foreach (var ii in issueItems)
            {
                var item = await _context.InventoryItems.FindAsync(ii.ItemId);
                if (item != null)
                {
                    item.CurrentStock -= ii.Quantity;
                    item.ModifiedBy = CurrentUserId;
                    item.ModifiedOn = DateTime.UtcNow;

                    var log = new InventoryStockLog
                    {
                        BranchId = branchId,
                        ItemId = item.Id,
                        TransactionType = "ISSUE",
                        ReferenceNumber = issueNo,
                        Quantity = -ii.Quantity,
                        BalanceAfter = item.CurrentStock,
                        TransactionDate = dto.IssueDate,
                        Remarks = $"Issued to {dto.IssuedToName} ({dto.IssuedToType})",
                        CreatedBy = CurrentUserId,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    };
                    _context.InventoryStockLogs.Add(log);
                }
            }

            await _context.SaveChangesAsync();

            var res = new InventoryIssueDto
            {
                Id = issue.Id,
                BranchId = issue.BranchId,
                IssueNumber = issue.IssueNumber,
                IssueDate = issue.IssueDate,
                IssuedToType = issue.IssuedToType,
                IssuedToId = issue.IssuedToId,
                IssuedToName = issue.IssuedToName,
                Department = issue.Department,
                IsReturnable = issue.IsReturnable,
                ReturnDueDate = issue.ReturnDueDate,
                Status = issue.Status,
                  Remarks = issue.Remarks,
                  PaymentMode = issue.PaymentMode,
                TotalItems = issueItems.Count
            };

            return Ok(ApiResponse<InventoryIssueDto>.Ok(res, "Item issued successfully"));
        }

        [HttpPost("issues/return")]
        public async Task<ActionResult<ApiResponse<bool>>> ReturnIssueItem([FromBody] ReturnIssueItemDto dto)
        {
            var branchId = CurrentBranchId;
            var issueItem = await _context.InventoryIssueItems
                .Include(ii => ii.Issue)
                .Include(ii => ii.Item)
                .FirstOrDefaultAsync(ii => ii.Id == dto.IssueItemId && ii.IsActive);

            if (issueItem == null || issueItem.Issue == null || issueItem.Issue.BranchId != branchId)
                return NotFound(ApiResponse<bool>.Fail("Issued item record not found"));

            var remaining = issueItem.Quantity - issueItem.ReturnedQuantity;
            if (remaining <= 0)
                return BadRequest(ApiResponse<bool>.Fail("This item has already been fully returned"));

            var returnQty = Math.Min(dto.ReturnQuantity <= 0 ? 1 : dto.ReturnQuantity, remaining);
            issueItem.ReturnedQuantity += returnQty;
            if (issueItem.ReturnedQuantity >= issueItem.Quantity)
            {
                issueItem.IsReturned = true;
                issueItem.ReturnDate = DateTime.UtcNow;
            }
            issueItem.ModifiedBy = CurrentUserId;
            issueItem.ModifiedOn = DateTime.UtcNow;

            // Restore Item stock
            if (issueItem.Item != null)
            {
                issueItem.Item.CurrentStock += returnQty;
                issueItem.Item.ModifiedBy = CurrentUserId;
                issueItem.Item.ModifiedOn = DateTime.UtcNow;

                var log = new InventoryStockLog
                {
                    BranchId = branchId,
                    ItemId = issueItem.Item.Id,
                    TransactionType = "RETURN",
                    ReferenceNumber = issueItem.Issue.IssueNumber,
                    Quantity = returnQty,
                    BalanceAfter = issueItem.Item.CurrentStock,
                    TransactionDate = DateTime.UtcNow,
                    Remarks = $"Item returned by {issueItem.Issue.IssuedToName} ({dto.Remarks ?? "Returned to stock"})",
                    CreatedBy = CurrentUserId,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                _context.InventoryStockLogs.Add(log);
            }

            // Check overall parent issue status
            var allItems = await _context.InventoryIssueItems
                .Where(ii => ii.IssueId == issueItem.IssueId && ii.IsActive)
                .ToListAsync();

            if (allItems.All(ii => ii.IsReturned))
            {
                issueItem.Issue.Status = "Returned";
            }
            else if (allItems.Any(ii => ii.ReturnedQuantity > 0))
            {
                issueItem.Issue.Status = "Partially Returned";
            }
            issueItem.Issue.ModifiedBy = CurrentUserId;
            issueItem.Issue.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<bool>.Ok(true, $"{returnQty} quantity returned and added back to stock successfully"));
        }

        #endregion

        #region 7. Stock Ledger / Movement Logs

        [HttpGet("stock-logs")]
        public async Task<ActionResult<ApiResponse<List<InventoryStockLogDto>>>> GetStockLogs(
            [FromQuery] long? itemId,
            [FromQuery] string? transactionType)
        {
            var branchId = CurrentBranchId;
            var query = _context.InventoryStockLogs
                .Where(l => l.BranchId == branchId && l.IsActive)
                .Include(l => l.Item)
                .ThenInclude(it => it.Category)
                .AsQueryable();

            if (itemId.HasValue && itemId.Value > 0)
                query = query.Where(l => l.ItemId == itemId.Value);

            if (!string.IsNullOrWhiteSpace(transactionType))
                query = query.Where(l => l.TransactionType == transactionType.Trim().ToUpper());

            var logs = await query
                .OrderByDescending(l => l.TransactionDate)
                .ThenByDescending(l => l.Id)
                .Take(200)
                .Select(l => new InventoryStockLogDto
                {
                    Id = l.Id,
                    BranchId = l.BranchId,
                    ItemId = l.ItemId,
                    ItemName = l.Item != null ? l.Item.ItemName : "",
                    ItemCode = l.Item != null ? l.Item.ItemCode : "",
                    CategoryName = l.Item != null && l.Item.Category != null ? l.Item.Category.Name : "",
                    TransactionType = l.TransactionType,
                    ReferenceNumber = l.ReferenceNumber,
                    Quantity = l.Quantity,
                    BalanceAfter = l.BalanceAfter,
                    TransactionDate = l.TransactionDate,
                    Remarks = l.Remarks
                })
                .ToListAsync();

            return Ok(ApiResponse<List<InventoryStockLogDto>>.Ok(logs));
        }

        #endregion
    }
}

