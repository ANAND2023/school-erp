using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;

namespace SchoolERP.Domain.Entities
{
    public class ItemCategory : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; } = 0;

        public ICollection<InventoryItem> Items { get; set; } = new List<InventoryItem>();
    }

    public class ItemSupplier : BaseEntity
    {
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

        public ICollection<InventoryPurchase> Purchases { get; set; } = new List<InventoryPurchase>();
    }

    public class InventoryItem : BaseEntity
    {
        public long BranchId { get; set; }
        public long CategoryId { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Unit { get; set; } = "Pcs"; // Pcs, Boxes, Sets, Kg, Meters, Packs, etc.
        public decimal UnitPrice { get; set; } = 0;
        public decimal? SellingPrice { get; set; }
        public int ReorderLevel { get; set; } = 5; // Alert when stock <= ReorderLevel
        public int OpeningStock { get; set; } = 0;
        public int CurrentStock { get; set; } = 0;
        public string? RackNumber { get; set; }
        public string? Description { get; set; }
        public string? ManufacturedBy { get; set; }

        public ItemCategory? Category { get; set; }
        public ICollection<InventoryPurchaseItem> PurchaseItems { get; set; } = new List<InventoryPurchaseItem>();
        public ICollection<InventoryIssueItem> IssueItems { get; set; } = new List<InventoryIssueItem>();
        public ICollection<InventoryStockLog> StockLogs { get; set; } = new List<InventoryStockLog>();
    }

    public class InventoryPurchase : BaseEntity
    {
        public long BranchId { get; set; }
        public long? SupplierId { get; set; }
        public string PurchaseNumber { get; set; } = string.Empty; // e.g. PUR-2026-0001
        public string? InvoiceNumber { get; set; }
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
        public decimal TotalAmount { get; set; } = 0;
        public string PaymentMode { get; set; } = "Cash"; // Cash, Bank Transfer, Cheque, Online, Credit
        public string PaymentStatus { get; set; } = "Paid"; // Paid, Pending, Partial
        public string? Remarks { get; set; }

        public ItemSupplier? Supplier { get; set; }
        public ICollection<InventoryPurchaseItem> PurchaseItems { get; set; } = new List<InventoryPurchaseItem>();
    }

    public class InventoryPurchaseItem : BaseEntity
    {
        public long PurchaseId { get; set; }
        public long ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal UnitCost { get; set; } = 0;
        public decimal TotalCost { get; set; } = 0;
        public string? BatchNo { get; set; }
        public string? Remarks { get; set; }

        public InventoryPurchase? Purchase { get; set; }
        public InventoryItem? Item { get; set; }
    }

    public class InventoryIssue : BaseEntity
    {
        public long BranchId { get; set; }
        public string IssueNumber { get; set; } = string.Empty; // e.g. ISS-2026-0001
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;
        public string IssuedToType { get; set; } = "Student"; // Student, Staff, Department, Classroom, Other
        public long? IssuedToId { get; set; } // StudentId or EmployeeId
        public string IssuedToName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public bool IsReturnable { get; set; } = false;
        public DateTime? ReturnDueDate { get; set; }
        public string Status { get; set; } = "Issued"; // Issued, Returned, Partially Returned
        public string? PaymentMode { get; set; }
        public string? Remarks { get; set; }

        public ICollection<InventoryIssueItem> IssueItems { get; set; } = new List<InventoryIssueItem>();
    }

    public class InventoryIssueItem : BaseEntity
    {
        public long IssueId { get; set; }
        public long ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public int ReturnedQuantity { get; set; } = 0;
        public bool IsReturned { get; set; } = false;
        public DateTime? ReturnDate { get; set; }
        public string? Remarks { get; set; }

        public InventoryIssue? Issue { get; set; }
        public InventoryItem? Item { get; set; }
    }

    public class InventoryStockLog : BaseEntity
    {
        public long BranchId { get; set; }
        public long ItemId { get; set; }
        public string TransactionType { get; set; } = "PURCHASE"; // OPENING, PURCHASE, ISSUE, RETURN, ADJUSTMENT
        public string? ReferenceNumber { get; set; } // PurchaseNumber or IssueNumber
        public int Quantity { get; set; } // +ve for additions, -ve for deductions
        public int BalanceAfter { get; set; }
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public string? Remarks { get; set; }

        public InventoryItem? Item { get; set; }
    }
}
