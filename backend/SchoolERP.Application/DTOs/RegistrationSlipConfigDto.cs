using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class RegistrationSlipConfigDto
    {
        public long? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public bool IsSchoolOverride { get; set; } = false;

        // Styling & Palettes
        public string PrimaryColor { get; set; } = "#0284c7";      // Sky Blue / Modern Registration Theme
        public string SecondaryColor { get; set; } = "#f0f9ff";    // Soft Blue Tint
        public string AccentColor { get; set; } = "#0369a1";       // Dark contrast
        public string BorderColor { get; set; } = "#0284c7";       // Outer border
        public string FontFamily { get; set; } = "Inter, sans-serif";
        public string FontScale { get; set; } = "Normal";
        public int BaseFontSize { get; set; } = 12;                // Base font size in px
        public int FontScalePercent { get; set; } = 100;
        public string HeaderLayout { get; set; } = "Classic";      // Classic, Modern, Banner, Minimal
        public string BorderStyle { get; set; } = "Solid";         // Solid, Double, Dashed, None

        // Sizing & Page Controls
        public int LogoSize { get; set; } = 54;
        public int PhotoWidth { get; set; } = 76;
        public int PhotoHeight { get; set; } = 92;
        public string PageSize { get; set; } = "A4";               // "A4", "A5", "Letter"
        public string PageOrientation { get; set; } = "portrait";  // "portrait", "landscape"
        public string PageMargin { get; set; } = "6mm";            // "4mm", "6mm", "8mm", "12mm"
        public int PagePadding { get; set; } = 16;
        public int PageMaxWidth { get; set; } = 780;

        // Full Header Customization Controls
        public string? HeaderSchoolNameCustom { get; set; }
        public int HeaderSchoolNameFontSize { get; set; } = 22;
        public string HeaderSchoolNameColor { get; set; } = "#0284c7";
        public string HeaderSchoolNameFontWeight { get; set; } = "900";
        public string HeaderSchoolNameFontFamily { get; set; } = "inherit";
        public string HeaderSchoolNameTransform { get; set; } = "uppercase";
        public string HeaderSchoolNameLetterSpacing { get; set; } = "0.8px";

        public string? HeaderSubtitleCustom { get; set; }
        public int HeaderSubtitleFontSize { get; set; } = 12;
        public string HeaderSubtitleColor { get; set; } = "#334155";
        public string HeaderSubtitleFontWeight { get; set; } = "600";

        public string? HeaderAddressCustom { get; set; }
        public int HeaderAddressFontSize { get; set; } = 11;
        public string HeaderAddressColor { get; set; } = "#475569";

        public string HeaderAlignment { get; set; } = "center";
        public string HeaderBgColor { get; set; } = "transparent";
        public int HeaderPaddingY { get; set; } = 8;
        public string HeaderDividerStyle { get; set; } = "Double";
        public string HeaderDividerColor { get; set; } = "#0284c7";

        // Slip Title Badge
        public string SlipTitle { get; set; } = "OFFICIAL STUDENT REGISTRATION SLIP";
        public string SlipSubtitle { get; set; } = "Academic Registration & Admission Application Slip";
        public string SlipTitleBgColor { get; set; } = "#0284c7";
        public string SlipTitleTextColor { get; set; } = "#ffffff";
        public int SlipTitleFontSize { get; set; } = 12;

        // Copy Layout & Titles
        public string CopyLayout { get; set; } = "DualSideBySide"; // "DualSideBySide", "SingleCopy", "DualStacked"
        public bool ShowCuttingLine { get; set; } = true;
        public string FirstCopyTitle { get; set; } = "Office Copy";
        public string SecondCopyTitle { get; set; } = "Student Copy";
        public string ThirdCopyTitle { get; set; } = "Bank Copy";
        public string CurrencySymbol { get; set; } = "₹";
        public bool ShowAmountInWords { get; set; } = true;
        public bool ShowBalanceDue { get; set; } = true;

        // Watermark
        public string WatermarkText { get; set; } = "REGISTERED";
        public bool ShowWatermark { get; set; } = false;

        // Element Toggles
        public bool ShowSchoolLogo { get; set; } = true;
        public bool ShowAffiliationNo { get; set; } = true;
        public bool ShowStudentPhotoBox { get; set; } = true;
        public bool ShowQrCode { get; set; } = true;
        public bool ShowDobInWords { get; set; } = false;
        public bool ShowPreviousSchool { get; set; } = true;
        public bool ShowFeeBreakdown { get; set; } = true;
        public bool ShowPaymentMode { get; set; } = true;
        public bool ShowSchoolSealBox { get; set; } = true;
        public bool ShowDeclaration { get; set; } = true;
        public bool ShowSignatures { get; set; } = true;

        // Signatures
        public string Signature1 { get; set; } = "Candidate / Parent Signature";
        public string Signature2 { get; set; } = "Verification Officer";
        public string Signature3 { get; set; } = "Authorized Seal & Signature";

        // Content Texts
        public string DeclarationTitle { get; set; } = "DECLARATION / UNDERTAKING:";
        public string DeclarationText { get; set; } = "I hereby certify that all information submitted during registration is genuine and accurate. I understand that registration does not guarantee admission until all eligibility conditions and fee payments are satisfied.";

        public string FooterText { get; set; } = "Official Student Registration Slip • System Generated by School ERP";

        // Drag and Drop Sections Sequence & Visibility
        public List<RegistrationSlipSectionItemDto> Sections { get; set; } = GetDefaultSections();

        public static List<RegistrationSlipSectionItemDto> GetDefaultSections()
        {
            return new List<RegistrationSlipSectionItemDto>
            {
                new RegistrationSlipSectionItemDto { Key = "header", Title = "School Header & Affiliation", Visible = true, Order = 1 },
                new RegistrationSlipSectionItemDto { Key = "meta_bar", Title = "Registration Reference & Status Bar", Visible = true, Order = 2 },
                new RegistrationSlipSectionItemDto { Key = "student_info", Title = "Student Information & Seeking Class", Visible = true, Order = 3 },
                new RegistrationSlipSectionItemDto { Key = "parents_info", Title = "Parent & Contact Details", Visible = true, Order = 4 },
                new RegistrationSlipSectionItemDto { Key = "fee_summary", Title = "Registration Fee & Payment Ledger", Visible = true, Order = 5 },
                new RegistrationSlipSectionItemDto { Key = "address_school", Title = "Residential Address & Previous School", Visible = true, Order = 6 },
                new RegistrationSlipSectionItemDto { Key = "declaration", Title = "Declaration & Undertaking", Visible = true, Order = 7 },
                new RegistrationSlipSectionItemDto { Key = "signatures", Title = "Signatures & School Seal", Visible = true, Order = 8 },
                new RegistrationSlipSectionItemDto { Key = "footer", Title = "Footer System Note", Visible = true, Order = 9 }
            };
        }
    }

    public class RegistrationSlipSectionItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public bool Visible { get; set; } = true;
        public int Order { get; set; }
    }
}
