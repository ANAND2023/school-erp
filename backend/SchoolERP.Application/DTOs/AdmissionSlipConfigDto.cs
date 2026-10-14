using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class AdmissionSlipConfigDto
    {
        public long? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public bool IsSchoolOverride { get; set; } = false;

        // Styling & Palettes
        public string PrimaryColor { get; set; } = "#065f46";      // Forest Emerald / Prestigious Academic Green
        public string SecondaryColor { get; set; } = "#ecfdf5";    // Soft Emerald Tint
        public string AccentColor { get; set; } = "#064e3b";       // Dark contrast
        public string BorderColor { get; set; } = "#065f46";       // Outer border
        public string FontFamily { get; set; } = "Inter, sans-serif";
        public string FontScale { get; set; } = "Normal";
        public int BaseFontSize { get; set; } = 12;                // Base font size in px
        public int FontScalePercent { get; set; } = 100;
        public string HeaderLayout { get; set; } = "Classic";      // Classic, Modern, Banner, Minimal
        public string BorderStyle { get; set; } = "Solid";         // Solid, Double, Dashed, None

        // Sizing & Page Controls
        public int LogoSize { get; set; } = 56;
        public int PhotoWidth { get; set; } = 76;
        public int PhotoHeight { get; set; } = 92;
        public string PageSize { get; set; } = "A4";               // "A4", "A5", "Letter"
        public string PageOrientation { get; set; } = "portrait";  // "portrait", "landscape"
        public string PageMargin { get; set; } = "6mm";            // "4mm", "6mm", "8mm", "12mm"
        public int PagePadding { get; set; } = 16;
        public int PageMaxWidth { get; set; } = 800;

        // Full Header Customization Controls
        public string? HeaderSchoolNameCustom { get; set; }
        public int HeaderSchoolNameFontSize { get; set; } = 22;
        public string HeaderSchoolNameColor { get; set; } = "#065f46";
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
        public string HeaderDividerColor { get; set; } = "#065f46";

        // Slip Title Badge
        public string SlipTitle { get; set; } = "OFFICIAL STUDENT ADMISSION & REGISTRATION ACKNOWLEDGEMENT";
        public string SlipSubtitle { get; set; } = "Academic Enrollment & Verification Document";
        public string SlipTitleBgColor { get; set; } = "#065f46";
        public string SlipTitleTextColor { get; set; } = "#ffffff";
        public int SlipTitleFontSize { get; set; } = 12;

        // Watermark
        public string WatermarkText { get; set; } = "CONFIRMED ADMISSION";
        public bool ShowWatermark { get; set; } = false;

        // Element Toggles
        public bool ShowSchoolLogo { get; set; } = true;
        public bool ShowAffiliationNo { get; set; } = true;
        public bool ShowStudentPhotoBox { get; set; } = true;
        public bool ShowFatherPhotoBox { get; set; } = true;
        public bool ShowMotherPhotoBox { get; set; } = true;
        public bool ShowGuardianPhotoBox { get; set; } = true;
        public bool ShowSchoolSealBox { get; set; } = true;
        public bool ShowQrCode { get; set; } = true;
        public bool ShowDobInWords { get; set; } = true;
        public bool ShowBloodGroup { get; set; } = true;
        public bool ShowAadhaarNo { get; set; } = true;
        public bool ShowCategory { get; set; } = true;
        public bool ShowEmergencyContact { get; set; } = true;
        public bool ShowPreviousSchool { get; set; } = true;
        public bool ShowTransportDetails { get; set; } = true;
        public bool ShowHostelDetails { get; set; } = false;
        public bool ShowDocumentsChecklist { get; set; } = true;
        public bool ShowDeclaration { get; set; } = true;
        public bool ShowSignatures { get; set; } = true;

        // Signatures
        public string Signature1 { get; set; } = "Parent / Guardian Signature";
        public string Signature2 { get; set; } = "Admission Counselor / Clerk";
        public string Signature3 { get; set; } = "Principal / Head of Institution";

        // Content Texts
        public string DeclarationTitle { get; set; } = "DECLARATION BY PARENT / GUARDIAN:";
        public string DeclarationText { get; set; } = "I hereby declare that all particulars stated in this admission application form are true, correct, and complete to the best of my knowledge and belief. I agree to abide by all the rules, regulations, code of conduct, and fee policies of the school as in force from time to time.";

        public List<string> DocumentsRequired { get; set; } = new()
        {
            "1. Original Birth Certificate (Municipal Corp / Gram Panchayat)",
            "2. Student & Parents' Aadhaar Cards (Photocopies)",
            "3. Transfer Certificate (TC) from Previous School (Countersigned)",
            "4. Previous Class Marksheet / Progress Report Card",
            "5. 4 Passport-size Photographs of Student & 2 of Parents",
            "6. Valid Address Proof (Electricity Bill / Voter ID / Passport / Domicile)"
        };

        public string FooterText { get; set; } = "Generated from DVS ERP (Digital Vidya Sarthi) • Official Student Admission Slip";

        // Drag and Drop Sections Sequence & Visibility
        public List<AdmissionSlipSectionItemDto> Sections { get; set; } = GetDefaultSections();

        public static List<AdmissionSlipSectionItemDto> GetDefaultSections()
        {
            return new List<AdmissionSlipSectionItemDto>
            {
                new AdmissionSlipSectionItemDto { Key = "header", Title = "School Header & Affiliation", Visible = true, Order = 1 },
                new AdmissionSlipSectionItemDto { Key = "meta_bar", Title = "Admission Reference & Status Bar", Visible = true, Order = 2 },
                new AdmissionSlipSectionItemDto { Key = "student_profile", Title = "Student Personal & Contact Details", Visible = true, Order = 3 },
                new AdmissionSlipSectionItemDto { Key = "parents_info", Title = "Parents / Guardian Information", Visible = true, Order = 4 },
                new AdmissionSlipSectionItemDto { Key = "academic_admission", Title = "Class, Section, Roll & Academic Info", Visible = true, Order = 5 },
                new AdmissionSlipSectionItemDto { Key = "additional_details", Title = "Category, Blood Group, Aadhaar & Transport", Visible = true, Order = 6 },
                new AdmissionSlipSectionItemDto { Key = "photos_strip", Title = "Student & Parents Photographs Strip", Visible = true, Order = 7 },
                new AdmissionSlipSectionItemDto { Key = "documents_checklist", Title = "Admission Documents Verification Checklist", Visible = true, Order = 8 },
                new AdmissionSlipSectionItemDto { Key = "declaration", Title = "Parent Undertaking & Declaration", Visible = true, Order = 9 },
                new AdmissionSlipSectionItemDto { Key = "signatures", Title = "Signatures & School Seal", Visible = true, Order = 10 },
                new AdmissionSlipSectionItemDto { Key = "footer", Title = "Footer System Note", Visible = true, Order = 11 }
            };
        }
    }

    public class AdmissionSlipSectionItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public bool Visible { get; set; } = true;
        public int Order { get; set; }
    }
}
