using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class BonafideCertificateConfigDto
    {
        public long? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public bool IsSchoolOverride { get; set; } = false;
        public string CertificateType { get; set; } = "bonafide"; // "bonafide", "birth", "age", "character", "ret"

        // Styling & Palettes
        public string PrimaryColor { get; set; } = "#1e3a8a";      // Royal Navy / Academic Navy
        public string SecondaryColor { get; set; } = "#eff6ff";    // Soft Blue Tint
        public string AccentColor { get; set; } = "#172554";       // Deep Indigo Accent
        public string BorderColor { get; set; } = "#1e3a8a";       // Outer Certificate Border
        public string BodyTextColor { get; set; } = "#1e293b";     // Certificate Body Statement Text Color
        public string FontFamily { get; set; } = "Inter, sans-serif";
        public string FontScale { get; set; } = "Normal";
        public int BaseFontSize { get; set; } = 13;                // Base font size in px
        public int FontScalePercent { get; set; } = 100;
        public string HeaderLayout { get; set; } = "Classic";      // Classic, Modern, Banner, Minimal
        public string BorderStyle { get; set; } = "Double";        // Double, Solid, Dashed, Antique, None

        // Sizing & Page Controls
        public int LogoSize { get; set; } = 64;
        public int PhotoWidth { get; set; } = 80;
        public int PhotoHeight { get; set; } = 96;
        public string PageSize { get; set; } = "A4";               // "A4", "A5", "Letter"
        public string PageOrientation { get; set; } = "portrait";  // "portrait", "landscape"
        public string PageMargin { get; set; } = "8mm";            // "6mm", "8mm", "12mm"
        public int PagePadding { get; set; } = 24;
        public int PageMaxWidth { get; set; } = 800;

        // Letterhead & Custom Background Image Controls
        public string? LetterheadBgImage { get; set; }             // Base64 Data URL or Image URL
        public bool UseLetterhead { get; set; } = false;           // Toggle letterhead background
        public bool HideHeaderOnLetterhead { get; set; } = false;  // Hide school title/header if pre-printed letterhead has it
        public bool HideBorderOnLetterhead { get; set; } = false;  // Hide border if letterhead already has border
        public int LetterheadTopMargin { get; set; } = 140;        // Spacing from top in px to prevent overlap with letterhead header
        public int LetterheadBottomMargin { get; set; } = 80;      // Spacing from bottom for signatures
        public string LetterheadFit { get; set; } = "contain";     // "contain", "cover", "fill"
        public int LetterheadOpacity { get; set; } = 100;          // Opacity % (0 - 100)

        // Drag and Drop Layout Controls
        public string LayoutMode { get; set; } = "flow";           // "flow" (document flow) or "drag" (free coordinate draggable)
        public List<BonafideDraggableElementDto> Elements { get; set; } = GetDefaultDraggableElements();

        // Header Customization Controls
        public string? HeaderSchoolNameCustom { get; set; }
        public int HeaderSchoolNameFontSize { get; set; } = 24;
        public string HeaderSchoolNameColor { get; set; } = "#1e3a8a";
        public string HeaderSchoolNameFontWeight { get; set; } = "900";
        public string HeaderSchoolNameFontFamily { get; set; } = "inherit";
        public string HeaderSchoolNameTransform { get; set; } = "uppercase";
        public string HeaderSchoolNameLetterSpacing { get; set; } = "1px";

        public string? HeaderSubtitleCustom { get; set; }
        public int HeaderSubtitleFontSize { get; set; } = 12;
        public string HeaderSubtitleColor { get; set; } = "#334155";
        public string HeaderSubtitleFontWeight { get; set; } = "600";

        public string? HeaderAddressCustom { get; set; }
        public int HeaderAddressFontSize { get; set; } = 11;
        public string HeaderAddressColor { get; set; } = "#475569";

        public string HeaderAlignment { get; set; } = "center";
        public string HeaderBgColor { get; set; } = "transparent";
        public int HeaderPaddingY { get; set; } = 12;
        public string HeaderDividerStyle { get; set; } = "Double";
        public string HeaderDividerColor { get; set; } = "#1e3a8a";

        // Certificate Titles
        public string CertificateTitle { get; set; } = "BONAFIDE CERTIFICATE";
        public string CertificateSubtitle { get; set; } = "TO WHOMSOEVER IT MAY CONCERN";
        public string TitleBgColor { get; set; } = "#1e3a8a";
        public string TitleTextColor { get; set; } = "#ffffff";
        public int TitleFontSize { get; set; } = 16;
        public string RefPrefix { get; set; } = "DPS/BC";

        // Certificate Statement Template
        public string BodySalutation { get; set; } = "This is to certify that";
        public string BodyTemplateText { get; set; } = 
            "This is to certify that {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, is a bonafide student of this institution studying in Class {Class} (Section {Section}), Roll No {RollNo}, Admission No {AdmissionNo}, for the Academic Session {AcademicYear}.";
        
        public string DobSentenceText { get; set; } = 
            "As per the official school records, his/her Date of Birth is {DOB} (in words: {DOBWords}).";

        public string ConductSentenceText { get; set; } = 
            "To the best of our knowledge, he/she bears a good moral character and conduct during his/her tenure in this institution.";

        public string PurposeSentenceText { get; set; } = 
            "This certificate is issued upon the request of the parent/guardian for {Purpose} purpose only.";

        public string DefaultPurpose { get; set; } = "official verification";

        // Watermark & Security
        public string WatermarkText { get; set; } = "BONAFIDE";
        public bool ShowWatermark { get; set; } = true;
        public bool ShowQrCode { get; set; } = true;
        public bool ShowSchoolSealBox { get; set; } = true;

        // Element Toggles
        public bool ShowSchoolLogo { get; set; } = true;
        public bool ShowAffiliationNo { get; set; } = true;
        public bool ShowStudentPhoto { get; set; } = true;
        public bool ShowDetailsTable { get; set; } = true;
        public bool ShowAddress { get; set; } = false;
        public bool ShowBloodGroup { get; set; } = true;
        public bool ShowAadhaarNo { get; set; } = true;
        public bool ShowSignatures { get; set; } = true;
        public bool ShowIssueDate { get; set; } = true;
        public bool ShowRefNo { get; set; } = true;

        // Signatures
        public string Signature1 { get; set; } = "Class Teacher";
        public string Signature2 { get; set; } = "Checked By / Office Clerk";
        public string Signature3 { get; set; } = "Principal / Head of Institution";

        // Footer
        public string FooterText { get; set; } = "This document is an electronically verified bonafide certificate issued by DVS ERP • Digital Vidya Sarthi";

        // Reorderable Sections
        public List<BonafideCertificateSectionItemDto> Sections { get; set; } = GetDefaultSections();

        public static List<BonafideCertificateSectionItemDto> GetDefaultSections()
        {
            return new List<BonafideCertificateSectionItemDto>
            {
                new BonafideCertificateSectionItemDto { Key = "header", Title = "School Header & Affiliation", Visible = true, Order = 1 },
                new BonafideCertificateSectionItemDto { Key = "meta_bar", Title = "Reference No & Issue Date Bar", Visible = true, Order = 2 },
                new BonafideCertificateSectionItemDto { Key = "title_badge", Title = "Certificate Heading & Subtitle", Visible = true, Order = 3 },
                new BonafideCertificateSectionItemDto { Key = "body_statement", Title = "Main Certification Statement", Visible = true, Order = 4 },
                new BonafideCertificateSectionItemDto { Key = "student_details_grid", Title = "Student Details Table / Grid", Visible = true, Order = 5 },
                new BonafideCertificateSectionItemDto { Key = "conduct_purpose", Title = "Conduct & Purpose Sentences", Visible = true, Order = 6 },
                new BonafideCertificateSectionItemDto { Key = "signatures", Title = "Official Signatures & School Seal", Visible = true, Order = 7 },
                new BonafideCertificateSectionItemDto { Key = "footer", Title = "System Footer Verification Note", Visible = true, Order = 8 }
            };
        }

        public static BonafideCertificateConfigDto GetDefaultConfigForType(string? type)
        {
            var normalized = (type ?? "bonafide").Trim().ToLowerInvariant();
            var config = new BonafideCertificateConfigDto
            {
                CertificateType = normalized
            };

            switch (normalized)
            {
                case "birth":
                    config.CertificateTitle = "DATE OF BIRTH CERTIFICATE";
                    config.CertificateSubtitle = "EXTRACT FROM SCHOOL GENERAL ADMISSION REGISTER";
                    config.PrimaryColor = "#0f766e";
                    config.BorderColor = "#0f766e";
                    config.TitleBgColor = "#0f766e";
                    config.RefPrefix = "DPS/DOB";
                    config.WatermarkText = "DOB CERTIFICATE";
                    config.BodyTemplateText =
                        "This is to certify that according to the official Admission & General Register of this institution, {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, was admitted to this institution in Class {Class} on {AdmissionDate} with Admission No: {AdmissionNo} (Roll No: {RollNo}).";
                    config.DobSentenceText =
                        "As recorded in the official school admission register at the time of admission, his/her official Date of Birth is {DOB} (in words: {DOBWords}).";
                    config.ConductSentenceText =
                        "Certified that the above Date of Birth and particulars have been verified and extracted from the original Admission Register maintained in the school and found true and correct. There is no cutting, overwriting, or alteration in the original entry.";
                    config.PurposeSentenceText =
                        "This Date of Birth Certificate is issued upon the request of the parent/guardian for {Purpose} purpose.";
                    config.DefaultPurpose = "official verification / passport";
                    config.FooterText =
                        "This is an official Date of Birth Certificate issued by the institution • Valid for all statutory verifications.";
                    break;

                case "age":
                    config.CertificateTitle = "CERTIFICATE OF AGE";
                    config.CertificateSubtitle = "AGE PROOF AS PER INSTITUTIONAL ADMISSION RECORDS";
                    config.PrimaryColor = "#b45309";
                    config.BorderColor = "#b45309";
                    config.TitleBgColor = "#b45309";
                    config.RefPrefix = "DPS/AGE";
                    config.WatermarkText = "AGE PROOF";
                    config.BodyTemplateText =
                        "This is to certify that as per the official Admission Register of this institution, {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, studying in Class {Class} (Section {Section}), Roll No: {RollNo}, Admission No: {AdmissionNo}, was born on {DOB} (in words: {DOBWords}).";
                    config.DobSentenceText =
                        "His/Her exact age calculated as on {AsOnDate} is {CalculatedAge} ({AgeYears} Years, {AgeMonths} Months, and {AgeDays} Days).";
                    config.ConductSentenceText =
                        "This age record is certified to be in complete accordance with the school admission records and meets the eligibility requirements for age verification.";
                    config.PurposeSentenceText =
                        "This Certificate of Age is issued upon specific request of the parent/guardian for {Purpose} purpose.";
                    config.DefaultPurpose = "age verification / sports eligibility";
                    config.FooterText =
                        "This is an official Certificate of Age issued by the institution.";
                    break;

                case "character":
                    config.CertificateTitle = "CHARACTER & CONDUCT CERTIFICATE";
                    config.CertificateSubtitle = "TO WHOMSOEVER IT MAY CONCERN";
                    config.PrimaryColor = "#831843";
                    config.BorderColor = "#831843";
                    config.TitleBgColor = "#831843";
                    config.RefPrefix = "DPS/CC";
                    config.WatermarkText = "CHARACTER";
                    config.BodyTemplateText =
                        "This is to certify that {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, is/was a bonafide student of this institution studying in Class {Class} (Section {Section}), Roll No: {RollNo}, Admission No: {AdmissionNo}, for the Academic Session {AcademicYear}.";
                    config.DobSentenceText =
                        "As per the school admission records, his/her recorded Date of Birth is {DOB} ({DOBWords}).";
                    config.ConductSentenceText =
                        "During his/her tenure in this institution, he/she has displayed exemplary moral character, obedience, and disciplined conduct. To the best of our knowledge and belief, he/she bears an unblemished moral character.";
                    config.PurposeSentenceText =
                        "He/She has actively participated in school activities. We wish him/her all success and a bright future in all his/her academic and life endeavors.";
                    config.DefaultPurpose = "higher education / admission";
                    config.FooterText =
                        "This is an official Character & Conduct Certificate issued by the institution.";
                    break;

                case "ret":
                    config.CertificateTitle = "RECORD OF EDUCATION & RETENTION (RET) CERTIFICATE";
                    config.CertificateSubtitle = "VERIFICATION OF CONTINUOUS ENROLLMENT & RETENTION";
                    config.PrimaryColor = "#581c87";
                    config.BorderColor = "#581c87";
                    config.TitleBgColor = "#581c87";
                    config.RefPrefix = "DPS/RET";
                    config.WatermarkText = "RET VERIFIED";
                    config.BodyTemplateText =
                        "This is to certify that {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, Admission No: {AdmissionNo}, Roll No: {RollNo}, is an enrolled student of this institution continuously retained in Class {Class} (Section {Section}) for the Academic Session {AcademicYear}.";
                    config.DobSentenceText =
                        "His/Her Date of Birth recorded in the institutional admission register is {DOB} (in words: {DOBWords}).";
                    config.ConductSentenceText =
                        "Certified that as per the continuous education records, examination results, and attendance registers, the student has maintained regular attendance and has been duly retained without interruption or dropping out.";
                    config.PurposeSentenceText =
                        "This RET Certificate is officially issued upon authorized request for {Purpose} purpose.";
                    config.DefaultPurpose = "educational record verification / scholarship";
                    config.FooterText =
                        "This is an official Record of Education & Retention (RET) Certificate issued by the institution.";
                    break;

                case "bonafide":
                default:
                    config.CertificateType = "bonafide";
                    config.CertificateTitle = "BONAFIDE CERTIFICATE";
                    config.CertificateSubtitle = "TO WHOMSOEVER IT MAY CONCERN";
                    config.PrimaryColor = "#1e3a8a";
                    config.BorderColor = "#1e3a8a";
                    config.TitleBgColor = "#1e3a8a";
                    config.RefPrefix = "DPS/BC";
                    config.WatermarkText = "BONAFIDE";
                    config.BodyTemplateText =
                        "This is to certify that {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, is a bonafide student of this institution studying in Class {Class} (Section {Section}), Roll No {RollNo}, Admission No {AdmissionNo}, for the Academic Session {AcademicYear}.";
                    config.DobSentenceText =
                        "As per the official school records, his/her Date of Birth is {DOB} (in words: {DOBWords}).";
                    config.ConductSentenceText =
                        "To the best of our knowledge, he/she bears a good moral character and conduct during his/her tenure in this institution.";
                    config.PurposeSentenceText =
                        "This certificate is issued upon the request of the parent/guardian for {Purpose} purpose only.";
                    config.DefaultPurpose = "official verification";
                    config.FooterText =
                        "This document is an electronically verified bonafide certificate issued by the institution.";
                    break;
            }

            return config;
        }

        public static List<BonafideDraggableElementDto> GetDefaultDraggableElements()
        {
            return new List<BonafideDraggableElementDto>
            {
                new BonafideDraggableElementDto { Id = "header", Label = "School Header & Crest", X = 24, Y = 24, Width = 752, Height = 110, Visible = true },
                new BonafideDraggableElementDto { Id = "ref_date", Label = "Ref No & Issue Date", X = 24, Y = 150, Width = 752, Height = 32, Visible = true },
                new BonafideDraggableElementDto { Id = "title_badge", Label = "Certificate Title Heading", X = 24, Y = 195, Width = 752, Height = 48, Visible = true },
                new BonafideDraggableElementDto { Id = "body_statement", Label = "Certification Text Area", X = 24, Y = 260, Width = 620, Height = 210, Visible = true },
                new BonafideDraggableElementDto { Id = "photo", Label = "Student Photo Box", X = 665, Y = 260, Width = 96, Height = 120, Visible = true },
                new BonafideDraggableElementDto { Id = "details_table", Label = "Student Details Grid", X = 24, Y = 490, Width = 752, Height = 95, Visible = true },
                new BonafideDraggableElementDto { Id = "conduct_purpose", Label = "Conduct & Purpose Statement", X = 24, Y = 605, Width = 752, Height = 75, Visible = true },
                new BonafideDraggableElementDto { Id = "signatures", Label = "Signatures & Official Seal", X = 24, Y = 710, Width = 752, Height = 110, Visible = true },
                new BonafideDraggableElementDto { Id = "footer", Label = "System Verification Footer", X = 24, Y = 840, Width = 752, Height = 28, Visible = true }
            };
        }
    }

    public class BonafideCertificateSectionItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public bool Visible { get; set; } = true;
        public int Order { get; set; }
    }

    public class BonafideDraggableElementDto
    {
        public string Id { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public bool Visible { get; set; } = true;
        public int ZIndex { get; set; } = 1;
    }
}
