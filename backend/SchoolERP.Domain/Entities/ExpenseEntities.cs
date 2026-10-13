using System;
using SchoolERP.Domain.Common;
using System.Text.Json.Serialization;

namespace SchoolERP.Domain.Entities
{
    public class ExpenseCategory : BaseEntity
    {
        public long BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        
        [JsonIgnore]
        public virtual Branch? Branch { get; set; }
    }

    public class Expense : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long CategoryId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? SpenderName { get; set; }
        
        [JsonIgnore]
        public virtual Branch? Branch { get; set; }
        [JsonIgnore]
        public virtual AcademicYear? AcademicYear { get; set; }
        public virtual ExpenseCategory? Category { get; set; }
    }
}
