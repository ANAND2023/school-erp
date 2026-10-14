using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class EnquirySlipConfigDto
    {
        public long? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public bool IsSchoolOverride { get; set; } = false;

        // Styling
        public string PrimaryColor { get; set; } = "#0f766e";      // Primary brand color
        public string SecondaryColor { get; set; } = "#f0fdfa";    // Accent / tint background
        public string AccentColor { get; set; } = "#115e59";       // Contrast / dark highlight
        public string BorderColor { get; set; } = "#0f766e";       // Slip outer border
        public string FontFamily { get; set; } = "Inter";          // Inter, Roboto, Poppins, Montserrat, Playfair Display, Segoe UI
        public string FontScale { get; set; } = "Normal";          // Compact, Normal, Large
        public int BaseFontSize { get; set; } = 13;                // Base font size in px (10px - 18px)
        public int FontScalePercent { get; set; } = 100;           // Font scale percent (75% - 135%)
        public string HeaderLayout { get; set; } = "Classic";      // Classic, Modern, Banner, Minimal
        public string BorderStyle { get; set; } = "Solid";         // Solid, Double, Dashed, None

        // Sizing Controls (Logo, Photo, Page)
        public int LogoSize { get; set; } = 52;                    // School logo diameter/size in px (30px - 120px)
        public int PhotoWidth { get; set; } = 86;                  // Student photo box width in px (50px - 140px)
        public int PhotoHeight { get; set; } = 104;                // Student photo box height in px (70px - 180px)
        public string PageSize { get; set; } = "A4";               // "A4", "A5", "Letter"
        public string PageOrientation { get; set; } = "portrait";  // "portrait", "landscape"
        public string PageMargin { get; set; } = "8mm";            // "5mm", "8mm", "12mm", "16mm"
        public int PagePadding { get; set; } = 20;                 // Inner slip padding in px (8px - 36px)
        public int PageMaxWidth { get; set; } = 760;               // Maximum slip container width in px

        // Full Header Customization Controls (School Name, Style, Colors, Fonts)
        public string? HeaderSchoolNameCustom { get; set; }        // Custom School Name override
        public int HeaderSchoolNameFontSize { get; set; } = 24;    // Font size in px (14px - 42px)
        public string HeaderSchoolNameColor { get; set; } = "#0f766e"; // School name text color
        public string HeaderSchoolNameFontWeight { get; set; } = "900"; // 600, 700, 800, 900
        public string HeaderSchoolNameFontFamily { get; set; } = "inherit"; // inherit or specific font
        public string HeaderSchoolNameTransform { get; set; } = "uppercase"; // "uppercase", "capitalize", "none"
        public string HeaderSchoolNameLetterSpacing { get; set; } = "0.8px"; // "0px", "0.8px", "1.5px", "2.5px"

        public string? HeaderSubtitleCustom { get; set; }          // Custom subtitle (affiliation/branch)
        public int HeaderSubtitleFontSize { get; set; } = 13;      // Subtitle font size in px
        public string HeaderSubtitleColor { get; set; } = "#475569"; // Subtitle color
        public string HeaderSubtitleFontWeight { get; set; } = "600";

        public string? HeaderAddressCustom { get; set; }           // Custom address / helpline
        public int HeaderAddressFontSize { get; set; } = 11;       // Address font size in px
        public string HeaderAddressColor { get; set; } = "#64748b"; // Address color

        public string HeaderAlignment { get; set; } = "center";    // "center", "left"
        public string HeaderBgColor { get; set; } = "transparent"; // "transparent" or custom color
        public int HeaderPaddingY { get; set; } = 10;              // Header vertical padding (4px - 28px)
        public string HeaderDividerStyle { get; set; } = "Double"; // "Double", "Solid", "Dashed", "None"
        public string HeaderDividerColor { get; set; } = "#0f766e"; // Divider bottom color

        public string SlipTitleBgColor { get; set; } = "#0f766e";  // Slip badge background
        public string SlipTitleTextColor { get; set; } = "#ffffff";// Slip badge text color
        public int SlipTitleFontSize { get; set; } = 12;           // Slip badge font size (10px - 16px)

        // Titles & Headings
        public string SlipTitle { get; set; } = "Visitor & Admission Enquiry Slip";
        public string SlipSubtitle { get; set; } = "Official Visitor Acknowledgement & Follow-up Lead Slip";
        public string WatermarkText { get; set; } = "OFFICIAL ADMISSION ENQUIRY";
        public bool ShowWatermark { get; set; } = false;

        // Item & Feature Toggles
        public bool ShowSchoolLogo { get; set; } = true;
        public bool ShowAffiliationNo { get; set; } = true;
        public bool ShowStudentPhotoBox { get; set; } = true;
        public bool ShowSchoolSealBox { get; set; } = true;
        public bool ShowQrCode { get; set; } = true;
        public bool ShowNextFollowupDate { get; set; } = true;
        public bool ShowCounselorRemarks { get; set; } = true;

        // Content Texts
        public string InstructionsTitle { get; set; } = "IMPORTANT INSTRUCTIONS FOR PARENTS:";
        public string TermsText { get; set; } = "• Admissions are processed on a first-come, first-served basis subject to seat availability in the sought class.\n• School admission desk is operational from Monday to Saturday, 9:00 AM to 2:00 PM.\n• For any enquiry queries or admission confirmation, please quote the Reference Number.";

        public List<string> DocumentsRequired { get; set; } = new()
        {
            "1. Original Birth Certificate (Municipal Corp / Gram Panchayat)",
            "2. Student & Parents' Aadhaar Cards (Photocopies)",
            "3. Transfer Certificate (TC) from Previous School (Countersigned)",
            "4. 4 Passport-size Photographs of Student & 2 of Parents",
            "5. Valid Address Proof (Electricity Bill / Voter ID / Passport)"
        };

        public string FooterText { get; set; } = "Generated from DVS ERP (Digital Vidya Sarthi) • Official Enquiry Acknowledgement Slip";

        // Drag and Drop Sections Sequence & Visibility
        public List<EnquirySlipSectionItemDto> Sections { get; set; } = GetDefaultSections();

        public static List<EnquirySlipSectionItemDto> GetDefaultSections()
        {
            return new List<EnquirySlipSectionItemDto>
            {
                new EnquirySlipSectionItemDto { Key = "header", Title = "School Header & Affiliation", Visible = true, Order = 1 },
                new EnquirySlipSectionItemDto { Key = "meta_bar", Title = "Enquiry Reference & Status Bar", Visible = true, Order = 2 },
                new EnquirySlipSectionItemDto { Key = "student_guardian", Title = "Student & Guardian Information", Visible = true, Order = 3 },
                new EnquirySlipSectionItemDto { Key = "discussion_notes", Title = "Discussion Notes & Follow-up", Visible = true, Order = 4 },
                new EnquirySlipSectionItemDto { Key = "documents_checklist", Title = "Admission Documents Checklist", Visible = true, Order = 5 },
                new EnquirySlipSectionItemDto { Key = "instructions", Title = "Parent Guidelines & Terms", Visible = true, Order = 6 },
                new EnquirySlipSectionItemDto { Key = "signatures", Title = "Signatures & School Seal", Visible = true, Order = 7 },
                new EnquirySlipSectionItemDto { Key = "footer", Title = "Footer System Note", Visible = true, Order = 8 }
            };
        }
    }

    public class EnquirySlipSectionItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public bool Visible { get; set; } = true;
        public int Order { get; set; }
    }
}
