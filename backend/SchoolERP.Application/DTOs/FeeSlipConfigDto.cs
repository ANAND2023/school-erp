using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class FeeSlipConfigDto
    {
        public long? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public bool IsSchoolOverride { get; set; } = false;

        // Styling & Palettes
        public string PrimaryColor { get; set; } = "#1e3a8a";      // Royal Navy / Brand Color
        public string SecondaryColor { get; set; } = "#eff6ff";    // Soft Accent Tint
        public string AccentColor { get; set; } = "#172554";       // Dark contrast
        public string BorderColor { get; set; } = "#1e3a8a";       // Outer border
        public string FontFamily { get; set; } = "Inter, sans-serif";
        public string FontScale { get; set; } = "Normal";
        public int BaseFontSize { get; set; } = 11;                // Base font size in px
        public int FontScalePercent { get; set; } = 100;
        public string HeaderLayout { get; set; } = "Classic";      // Classic, Modern, Banner, Minimal
        public string BorderStyle { get; set; } = "Solid";         // Solid, Double, Dashed, None

        // Sizing & Page Controls
        public int LogoSize { get; set; } = 48;
        public int PhotoWidth { get; set; } = 60;
        public int PhotoHeight { get; set; } = 70;
        public string PageSize { get; set; } = "A4";               // "A4", "A5", "Letter"
        public string PageOrientation { get; set; } = "portrait";  // "portrait", "landscape"
        public string PageMargin { get; set; } = "4mm";            // "4mm", "6mm", "8mm", "12mm"
        public int PagePadding { get; set; } = 12;
        public int PageMaxWidth { get; set; } = 800;

        // Full Header Customization Controls
        public string? HeaderSchoolNameCustom { get; set; }
        public int HeaderSchoolNameFontSize { get; set; } = 17;
        public string HeaderSchoolNameColor { get; set; } = "#1e3a8a";
        public string HeaderSchoolNameFontWeight { get; set; } = "900";
        public string HeaderSchoolNameFontFamily { get; set; } = "inherit";
        public string HeaderSchoolNameTransform { get; set; } = "uppercase";
        public string HeaderSchoolNameLetterSpacing { get; set; } = "0.5px";

        public string? HeaderSubtitleCustom { get; set; }
        public int HeaderSubtitleFontSize { get; set; } = 11;
        public string HeaderSubtitleColor { get; set; } = "#475569";
        public string HeaderSubtitleFontWeight { get; set; } = "600";

        public string? HeaderAddressCustom { get; set; }
        public int HeaderAddressFontSize { get; set; } = 10;
        public string HeaderAddressColor { get; set; } = "#1e293b";

        public string HeaderAlignment { get; set; } = "center";
        public string HeaderBgColor { get; set; } = "transparent";
        public int HeaderPaddingY { get; set; } = 6;
        public string HeaderDividerStyle { get; set; } = "Solid";
        public string HeaderDividerColor { get; set; } = "#1e3a8a";

        // Slip Title Badge
        public string SlipTitle { get; set; } = "FEE RECEIPT / PAYMENT VOUCHER";
        public string SlipSubtitle { get; set; } = "Official Student Fee Acknowledgement Receipt";
        public string SlipTitleBgColor { get; set; } = "#1e3a8a";
        public string SlipTitleTextColor { get; set; } = "#ffffff";
        public int SlipTitleFontSize { get; set; } = 11;

        // Watermark
        public string WatermarkText { get; set; } = "PAID / OFFICIAL RECEIPT";
        public bool ShowWatermark { get; set; } = false;

        // Copy Layout & Titles
        public string CopyLayout { get; set; } = "DualSideBySide"; // "DualSideBySide", "SingleCopy", "DualStacked"
        public bool ShowCuttingLine { get; set; } = true;
        public string FirstCopyTitle { get; set; } = "Office Copy";
        public string SecondCopyTitle { get; set; } = "Student Copy";
        public string ThirdCopyTitle { get; set; } = "Bank Copy";
        public string CurrencySymbol { get; set; } = "₹";

        // Feature & Element Toggles
        public bool ShowSchoolLogo { get; set; } = true;
        public bool ShowAffiliationNo { get; set; } = true;
        public bool ShowStudentPhoto { get; set; } = false;
        public bool ShowSchoolSealBox { get; set; } = true;
        public bool ShowQrCode { get; set; } = true;
        public bool ShowAmountInWords { get; set; } = true;
        public bool ShowPaymentMode { get; set; } = true;
        public bool ShowChequeDetails { get; set; } = true;
        public bool ShowFeeBreakdownTable { get; set; } = true;
        public bool ShowMonthColumn { get; set; } = true;
        public bool ShowPreviousDues { get; set; } = true;
        public bool ShowConcession { get; set; } = true;
        public bool ShowFine { get; set; } = true;
        public bool ShowBalanceDue { get; set; } = true;
        public bool ShowTerms { get; set; } = true;

        // Signatures
        public bool ShowSignatures { get; set; } = true;
        public string Signature1 { get; set; } = "Cashier / Accountant";
        public string Signature2 { get; set; } = "Authorized Signatory";
        public string Signature3 { get; set; } = "Parent / Student";

        // Content Texts
        public string TermsTitle { get; set; } = "TERMS & CONDITIONS / FEE RULES:";
        public string TermsText { get; set; } = "• Fees once deposited will not be refunded or transferred under any circumstances.\n• Cheque payments are accepted subject to realization.\n• Please retain this receipt safely for future academic clearance & tax records.";
        public string FooterText { get; set; } = "Computer Generated Fee Receipt • Powered by Digital Vidya Sarthi (DVS ERP)";

        // Drag and Drop Sections Sequence & Visibility
        public List<FeeSlipSectionItemDto> Sections { get; set; } = GetDefaultSections();

        public static List<FeeSlipSectionItemDto> GetDefaultSections()
        {
            return new List<FeeSlipSectionItemDto>
            {
                new FeeSlipSectionItemDto { Key = "header", Title = "School Header & Affiliation", Visible = true, Order = 1 },
                new FeeSlipSectionItemDto { Key = "meta_bar", Title = "Receipt Title & Copy Badge", Visible = true, Order = 2 },
                new FeeSlipSectionItemDto { Key = "student_details", Title = "Student & Receipt Details Box", Visible = true, Order = 3 },
                new FeeSlipSectionItemDto { Key = "fee_breakdown", Title = "Head-wise Fee Breakdown Table", Visible = true, Order = 4 },
                new FeeSlipSectionItemDto { Key = "payment_summary", Title = "Amount in Words & Totals Summary", Visible = true, Order = 5 },
                new FeeSlipSectionItemDto { Key = "payment_info", Title = "Payment Mode & Bank / Ref Info", Visible = true, Order = 6 },
                new FeeSlipSectionItemDto { Key = "terms", Title = "Fee Terms & Guidelines", Visible = true, Order = 7 },
                new FeeSlipSectionItemDto { Key = "signatures", Title = "Signatures & School Seal", Visible = true, Order = 8 },
                new FeeSlipSectionItemDto { Key = "footer", Title = "Footer System Note", Visible = true, Order = 9 }
            };
        }
    }

    public class FeeSlipSectionItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public bool Visible { get; set; } = true;
        public int Order { get; set; }
    }
}
