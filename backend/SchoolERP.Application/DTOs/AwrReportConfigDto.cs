using System;
using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class AwrReportConfigDto
    {
        public long? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public bool IsSchoolOverride { get; set; } = false;

        // Styling & Palettes
        public string PrimaryColor { get; set; } = "#065f46";      // Forest Emerald / Academic Register Green
        public string SecondaryColor { get; set; } = "#ecfdf5";    // Soft Mint Tint
        public string AccentColor { get; set; } = "#064e3b";       // Deep Green Accent
        public string BorderColor { get; set; } = "#065f46";       // Outer Register Border
        public string BodyTextColor { get; set; } = "#1e293b";     // Text Color
        public string TableHeaderBgColor { get; set; } = "#065f46"; // Register Column Header BG
        public string TableHeaderTextColor { get; set; } = "#ffffff"; // Register Column Header Text
        public string TableStripeBgColor { get; set; } = "#f8fafc"; // Row alternate stripe
        public string FontFamily { get; set; } = "Inter, sans-serif";
        public string FontScale { get; set; } = "Normal";
        public int BaseFontSize { get; set; } = 11;                // Base font size in px (registers are data-dense)
        public int FontScalePercent { get; set; } = 100;
        public string HeaderLayout { get; set; } = "Classic";      // Classic, Modern, Banner, Minimal
        public string BorderStyle { get; set; } = "Solid";         // Solid, Double, Dashed, None

        // Sizing & Page Controls
        public int LogoSize { get; set; } = 54;
        public int PhotoWidth { get; set; } = 64;
        public int PhotoHeight { get; set; } = 78;
        public string PageSize { get; set; } = "A4";               // "A4", "Legal", "Letter"
        public string PageOrientation { get; set; } = "landscape"; // "landscape" (Ledger Register) or "portrait" (Individual Folio)
        public string PageMargin { get; set; } = "6mm";            // "4mm", "6mm", "8mm"
        public int PagePadding { get; set; } = 16;
        public int PageMaxWidth { get; set; } = 1150;              // Landscape register width

        // Letterhead & Custom Background Image Controls
        public string? LetterheadBgImage { get; set; }             // Base64 Data URL or Image URL
        public bool UseLetterhead { get; set; } = false;           // Toggle letterhead background
        public bool HideHeaderOnLetterhead { get; set; } = false;  // Hide school title/header if pre-printed letterhead has it
        public bool HideBorderOnLetterhead { get; set; } = false;  // Hide border if letterhead already has border
        public int LetterheadTopMargin { get; set; } = 120;        // Spacing from top in px to prevent overlap with letterhead header
        public int LetterheadBottomMargin { get; set; } = 70;      // Spacing from bottom for signatures
        public string LetterheadFit { get; set; } = "contain";     // "contain", "cover", "fill"
        public int LetterheadOpacity { get; set; } = 100;          // Opacity % (0 - 100)

        // Drag and Drop Layout Controls
        public string LayoutMode { get; set; } = "flow";           // "flow" (document flow) or "drag" (free coordinate draggable)
        public List<AwrDraggableElementDto> Elements { get; set; } = GetDefaultDraggableElements();

        // Header Customization Controls
        public string? HeaderSchoolNameCustom { get; set; }
        public int HeaderSchoolNameFontSize { get; set; } = 20;
        public string HeaderSchoolNameColor { get; set; } = "#065f46";
        public string HeaderSchoolNameFontWeight { get; set; } = "900";
        public string HeaderSchoolNameFontFamily { get; set; } = "inherit";
        public string HeaderSchoolNameTransform { get; set; } = "uppercase";
        public string HeaderSchoolNameLetterSpacing { get; set; } = "1px";

        public string? HeaderSubtitleCustom { get; set; }
        public int HeaderSubtitleFontSize { get; set; } = 11;
        public string HeaderSubtitleColor { get; set; } = "#334155";
        public string HeaderSubtitleFontWeight { get; set; } = "600";

        public string? HeaderAddressCustom { get; set; }
        public int HeaderAddressFontSize { get; set; } = 10;
        public string HeaderAddressColor { get; set; } = "#475569";

        public string HeaderAlignment { get; set; } = "center";    // center, left
        public string HeaderBgColor { get; set; } = "transparent";
        public int HeaderPaddingY { get; set; } = 10;
        public string HeaderDividerStyle { get; set; } = "Double"; // Double, Solid, Dashed, None
        public string HeaderDividerColor { get; set; } = "#065f46";

        // Titles & Reference
        public string ReportTitle { get; set; } = "ADMISSION AND WITHDRAWAL REGISTER (A.W.R.)";
        public string ReportSubtitle { get; set; } = "Statutory General Register maintained under Education Act & Board Rules";
        public string FolioTitle { get; set; } = "STUDENT A.W.R. FOLIO EXTRACT";
        public string TitleBgColor { get; set; } = "#065f46";
        public string TitleTextColor { get; set; } = "#ffffff";
        public int TitleFontSize { get; set; } = 14;
        public string RefPrefix { get; set; } = "DPS/AWR";

        // Watermark & Security
        public string WatermarkText { get; set; } = "OFFICIAL AWR";
        public bool ShowWatermark { get; set; } = true;
        public bool ShowQrCode { get; set; } = true;
        public bool ShowSchoolSealBox { get; set; } = true;

        // Visibility Toggles for Ledger & Folio
        public bool ShowSchoolLogo { get; set; } = true;
        public bool ShowAffiliationNo { get; set; } = true;
        public bool ShowDiseCode { get; set; } = true;
        public bool ShowStudentPhoto { get; set; } = true;
        public bool ShowAdmissionDate { get; set; } = true;
        public bool ShowDobWords { get; set; } = true;
        public bool ShowPlaceOfBirth { get; set; } = true;
        public bool ShowFatherDetails { get; set; } = true;
        public bool ShowMotherDetails { get; set; } = true;
        public bool ShowGuardianDetails { get; set; } = true;
        public bool ShowCategoryReligion { get; set; } = true;
        public bool ShowAadhaarNo { get; set; } = true;
        public bool ShowBloodGroup { get; set; } = true;
        public bool ShowAddress { get; set; } = true;
        public bool ShowPreviousSchool { get; set; } = true;
        public bool ShowClassAdmitted { get; set; } = true;
        public bool ShowCurrentClass { get; set; } = true;
        public bool ShowWithdrawalDetails { get; set; } = true;
        public bool ShowTcDetails { get; set; } = true;
        public bool ShowConduct { get; set; } = true;
        public bool ShowSignatures { get; set; } = true;
        public bool ShowIssueDate { get; set; } = true;
        public bool ShowRefNo { get; set; } = true;

        // Signatures
        public string Signature1 { get; set; } = "Prepared By / Record Clerk";
        public string Signature2 { get; set; } = "Checked By / Section In-Charge";
        public string Signature3 { get; set; } = "Principal / Head of Institution";

        // Footer
        public string FooterText { get; set; } =
            "Certified that this document is an authentic extract from the Admission and Withdrawal Register maintained by the institution.";

        // Default Draggable Elements Factory
        public static List<AwrDraggableElementDto> GetDefaultDraggableElements()
        {
            return new List<AwrDraggableElementDto>
            {
                new AwrDraggableElementDto { Id = "header", Label = "School Header & Crest", X = 20, Y = 16, Width = 1110, Height = 95, Visible = true },
                new AwrDraggableElementDto { Id = "ref_date", Label = "Register Ref & Date of Print", X = 20, Y = 118, Width = 1110, Height = 28, Visible = true },
                new AwrDraggableElementDto { Id = "title_badge", Label = "AWR Heading & Legal Subtitle", X = 20, Y = 152, Width = 1110, Height = 42, Visible = true },
                new AwrDraggableElementDto { Id = "filter_summary", Label = "Filter & Academic Session Banner", X = 20, Y = 202, Width = 1110, Height = 36, Visible = true },
                new AwrDraggableElementDto { Id = "register_table", Label = "Admission & Withdrawal Master Ledger", X = 20, Y = 246, Width = 1110, Height = 420, Visible = true },
                new AwrDraggableElementDto { Id = "signatures", Label = "Signatures & Official School Seal", X = 20, Y = 680, Width = 1110, Height = 95, Visible = true },
                new AwrDraggableElementDto { Id = "footer", Label = "Verification & Compliance Footer", X = 20, Y = 785, Width = 1110, Height = 24, Visible = true }
            };
        }

        public static AwrReportConfigDto GetDefaultConfig()
        {
            return new AwrReportConfigDto();
        }
    }

    public class AwrDraggableElementDto
    {
        public string Id { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public bool Visible { get; set; } = true;
    }

    public class AwrStudentItemDto
    {
        public long StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public DateTime AdmissionDate { get; set; }
        public string AdmissionDateFormatted { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }

        public DateTime DateOfBirth { get; set; }
        public string DobFormatted { get; set; } = string.Empty;
        public string DobWords { get; set; } = string.Empty;
        public string PlaceOfBirth { get; set; } = string.Empty;

        // Parent / Guardian
        public string FatherName { get; set; } = string.Empty;
        public string FatherOccupation { get; set; } = string.Empty;
        public string FatherMobile { get; set; } = string.Empty;
        public string MotherName { get; set; } = string.Empty;
        public string MotherOccupation { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianRelation { get; set; } = string.Empty;

        // Demographics & IDs
        public string CategoryName { get; set; } = string.Empty;
        public string ReligionName { get; set; } = string.Empty;
        public string Nationality { get; set; } = "Indian";
        public string BloodGroup { get; set; } = string.Empty;
        public string AadhaarNo { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string Pincode { get; set; } = string.Empty;

        // Academic & Enrollment
        public string PreviousSchool { get; set; } = string.Empty;
        public string PreviousClass { get; set; } = string.Empty;
        public string ClassAdmitted { get; set; } = string.Empty;
        public string CurrentClass { get; set; } = string.Empty;
        public string CurrentSection { get; set; } = string.Empty;
        public int? RollNo { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Status { get; set; } = "Active"; // Active, Withdrawn, Transferred, Alumni

        // Withdrawal & TC
        public DateTime? WithdrawalDate { get; set; }
        public string WithdrawalDateFormatted { get; set; } = string.Empty;
        public string ReasonForLeaving { get; set; } = string.Empty;
        public string LastClassStudied { get; set; } = string.Empty;
        public string Conduct { get; set; } = "Good";
        public string TcNumber { get; set; } = string.Empty;
        public DateTime? TcIssueDate { get; set; }
        public string TcIssueDateFormatted { get; set; } = string.Empty;
        public string Remarks { get; set; } = string.Empty;
    }

    public class AwrReportSummaryDto
    {
        public int TotalRegistered { get; set; }
        public int ActiveOnRoll { get; set; }
        public int TotalWithdrawn { get; set; }
        public int NewAdmissionsThisYear { get; set; }
    }

    public class AwrReportResponseDto
    {
        public AwrReportSummaryDto Summary { get; set; } = new AwrReportSummaryDto();
        public List<AwrStudentItemDto> Students { get; set; } = new List<AwrStudentItemDto>();
        public AwrReportConfigDto Config { get; set; } = new AwrReportConfigDto();
    }
}
