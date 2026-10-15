using System;
using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    // Category DTOs
    public class ItemCategoryDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public int ItemCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateItemCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; } = 0;
    }

    public class UpdateItemCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    // Supplier DTOs
    public class ItemSupplierDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Gstin { get; set; }
        public string? Remarks { get; set; }
        public int TotalPurchases { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateItemSupplierDto
    {
        public string SupplierName { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Gstin { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdateItemSupplierDto
    {
        public string SupplierName { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Gstin { get; set; }
        public string? Remarks { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // Inventory Item DTOs
    public class InventoryItemDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public long CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Unit { get; set; } = "Pcs";
        public decimal UnitPrice { get; set; }
        public decimal? SellingPrice { get; set; }
        public int ReorderLevel { get; set; }
        public int OpeningStock { get; set; }
        public int CurrentStock { get; set; }
        public string? RackNumber { get; set; }
        public string? Description { get; set; }
        public string? ManufacturedBy { get; set; }
        public string StockStatus { get; set; } = "In Stock"; // "In Stock", "Low Stock", "Out of Stock"
        public bool IsActive { get; set; }
    }

    public class CreateInventoryItemDto
    {
        public long CategoryId { get; set; }
        public string? ItemCode { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string Unit { get; set; } = "Pcs";
        public decimal UnitPrice { get; set; } = 0;
        public decimal? SellingPrice { get; set; }
        public int ReorderLevel { get; set; } = 5;
        public int OpeningStock { get; set; } = 0;
        public string? RackNumber { get; set; }
        public string? Description { get; set; }
        public string? ManufacturedBy { get; set; }
    }

    public class UpdateInventoryItemDto
    {
        public long CategoryId { get; set; }
        public string? ItemCode { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string Unit { get; set; } = "Pcs";
        public decimal UnitPrice { get; set; } = 0;
        public decimal? SellingPrice { get; set; }
        public int ReorderLevel { get; set; } = 5;
        public string? RackNumber { get; set; }
        public string? Description { get; set; }
        public string? ManufacturedBy { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // Purchase Inward DTOs
    public class InventoryPurchaseDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public long? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string PurchaseNumber { get; set; } = string.Empty;
        public string? InvoiceNumber { get; set; }
        public DateTime PurchaseDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMode { get; set; } = "Cash";
        public string PaymentStatus { get; set; } = "Paid";
        public string? Remarks { get; set; }
        public int ItemCount { get; set; }
        public List<InventoryPurchaseItemDto> Items { get; set; } = new();
    }

    public class InventoryPurchaseItemDto
    {
        public long Id { get; set; }
        public long PurchaseId { get; set; }
        public long ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string Unit { get; set; } = "Pcs";
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
        public string? BatchNo { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateInventoryPurchaseDto
    {
        public long? SupplierId { get; set; }
        public string? InvoiceNumber { get; set; }
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
        public string PaymentMode { get; set; } = "Cash";
        public string PaymentStatus { get; set; } = "Paid";
        public string? Remarks { get; set; }
        public List<CreateInventoryPurchaseItemDto> Items { get; set; } = new();
    }

    public class CreateInventoryPurchaseItemDto
    {
        public long ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal UnitCost { get; set; } = 0;
        public string? BatchNo { get; set; }
        public string? Remarks { get; set; }
    }

    // Issue Outward DTOs
    public class InventoryIssueDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public string IssueNumber { get; set; } = string.Empty;
        public DateTime IssueDate { get; set; }
        public string IssuedToType { get; set; } = "Student";
        public long? IssuedToId { get; set; }
        public string IssuedToName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public bool IsReturnable { get; set; }
        public DateTime? ReturnDueDate { get; set; }
        public string Status { get; set; } = "Issued";
        public string? Remarks { get; set; }
        public string? PaymentMode { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalReturnedAmount { get; set; }
        public bool CanReturn { get; set; }
        public List<InventoryIssueItemDto> Items { get; set; } = new();
    }

    public class InventoryIssueItemDto
    {
        public long Id { get; set; }
        public long IssueId { get; set; }
        public long ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string Unit { get; set; } = "Pcs";
        public int Quantity { get; set; }
        public int ReturnedQuantity { get; set; }
        public bool IsReturned { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string? Remarks { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public int RemainingQuantity => Math.Max(0, Quantity - ReturnedQuantity);
    }

    public class CreateInventoryIssueDto
    {
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;
        public string IssuedToType { get; set; } = "Student"; // Student, Staff, Department, Classroom, Other
        public long? IssuedToId { get; set; }
        public string IssuedToName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public bool IsReturnable { get; set; } = false;
        public DateTime? ReturnDueDate { get; set; }
        public string? Remarks { get; set; }
        public string? PaymentMode { get; set; }
        public List<CreateInventoryIssueItemDto> Items { get; set; } = new();
    }

    public class CreateInventoryIssueItemDto
    {
        public long ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public string? Remarks { get; set; }
    }

    public class ReturnIssueItemDto
    {
        public long IssueItemId { get; set; }
        public int ReturnQuantity { get; set; } = 1;
        public string? Remarks { get; set; }
    }


    public class BatchReturnIssueDto
    {
        public long IssueId { get; set; }
        public string? RefundMode { get; set; } = "Cash";
        public string? Remarks { get; set; }
        public List<BatchReturnItemLineDto> Items { get; set; } = new();
    }

    public class BatchReturnItemLineDto
    {
        public long IssueItemId { get; set; }
        public int ReturnQuantity { get; set; }
        public string? Reason { get; set; }
    }

    public class ReturnSlipDto
    {
        public string ReturnNumber { get; set; } = string.Empty;
        public DateTime ReturnDate { get; set; } = DateTime.UtcNow;
        public string IssueNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerType { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string RefundMode { get; set; } = "Cash";
        public decimal TotalRefundAmount { get; set; }
        public string? Remarks { get; set; }
        public List<ReturnSlipItemDto> ReturnedItems { get; set; } = new();
    }

    public class ReturnSlipItemDto
    {
        public string ItemName { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public int ReturnedQuantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalRefund { get; set; }
        public string? Reason { get; set; }
    }

    // Stock Movement Log DTO
    public class InventoryStockLogDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public long ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public string TransactionType { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public int Quantity { get; set; }
        public int BalanceAfter { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? Remarks { get; set; }
    }

    // Inventory Dashboard Summary DTO
    public class InventoryDashboardSummaryDto
    {
        public int TotalItems { get; set; }
        public int LowStockItems { get; set; }
        public int OutOfStockItems { get; set; }
        public int TotalCategories { get; set; }
        public int TotalSuppliers { get; set; }
        public decimal TotalStockValue { get; set; }
        public int TotalPurchasesThisMonth { get; set; }
        public int TotalIssuesThisMonth { get; set; }
        public decimal TodaySalesAmount { get; set; }
        public decimal TodayProfit { get; set; }
        public decimal MonthlySalesAmount { get; set; }
        public decimal MonthlyProfit { get; set; }
        public List<DailySalesDataDto> WeeklySalesGraph { get; set; } = new();
        public List<InventoryItemDto> LowStockAlerts { get; set; } = new();
        public List<InventoryStockLogDto> RecentActivities { get; set; } = new();
    }

    public class DailySalesDataDto
    {
        public string Date { get; set; } = string.Empty;
        public decimal SalesAmount { get; set; }
        public decimal Profit { get; set; }
    }
}

