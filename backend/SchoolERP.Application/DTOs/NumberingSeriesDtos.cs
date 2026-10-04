using System;

namespace SchoolERP.Application.DTOs
{
    public class NumberingSeriesDto
    {
        public long Id { get; set; }
        public long BranchId { get; set; }
        public string ModuleType { get; set; } = string.Empty; // "Admission", "FeeReceipt", "Enquiry", "TransferCertificate", "Staff"
        public string Title { get; set; } = string.Empty; // User-friendly title
        public string Prefix { get; set; } = string.Empty;
        public bool IncludeBranchCode { get; set; } = true;
        public bool IncludeAcademicYear { get; set; } = true;
        public string YearFormat { get; set; } = "YYYYYY"; // "YYYYYY", "YYYY-YY", "YY", "None"
        public string Separator { get; set; } = "/"; // "/", "-", "_", ""
        public int Digits { get; set; } = 4;
        public long StartNumber { get; set; } = 1;
        public long CurrentSequence { get; set; } = 0;
        public string? Suffix { get; set; }
        public string? SamplePreview { get; set; }
    }

    public class SaveNumberingSeriesRequest
    {
        public string ModuleType { get; set; } = string.Empty;
        public string Prefix { get; set; } = string.Empty;
        public bool IncludeBranchCode { get; set; } = true;
        public bool IncludeAcademicYear { get; set; } = true;
        public string YearFormat { get; set; } = "YYYYYY";
        public string Separator { get; set; } = "/";
        public int Digits { get; set; } = 4;
        public long StartNumber { get; set; } = 1;
        public string? Suffix { get; set; }
    }
}
