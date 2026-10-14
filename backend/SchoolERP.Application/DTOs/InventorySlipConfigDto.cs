using System.Collections.Generic;

namespace SchoolERP.Application.DTOs
{
    public class InventorySlipConfigDto
    {
        public long? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public bool IsSchoolOverride { get; set; } = false;

        // 1. SELLER / STORE ENTITY DETAILS (When selling under bookstore / vendor / trader name)
        public bool UseCustomStoreEntity { get; set; } = true;
        public string StoreName { get; set; } = "Vidyarthi Pustak Bhandar & Uniform Counter";
        public string? StoreTagline { get; set; } = "Authorized School Books, Uniforms & Stationery Supplier";
        public string? StoreAddress { get; set; } = "Shop No. 2, Campus Gate No. 1, Institutional Area, Main Road";
        public string? StorePhone { get; set; } = "+91 98765 43210 / 011-23456789";
        public string? StoreEmail { get; set; } = "store@vidyarthibooks.com";
        public string? GstinNumber { get; set; } = "07AAAAA0000A1Z5";
        public string? TradeLicenseOrPan { get; set; } = "PAN: ABCDE1234F";
        public string? LogoUrl { get; set; } = string.Empty;

        // 2. RECEIPT TITLES & HEADERS
        public string ReceiptTitle { get; set; } = "RETAIL CASH MEMO / INVOICE";
        public string ReceiptSubtitle { get; set; } = "Inventory Stock Issue & Sale Acknowledgement";
        public string CurrencySymbol { get; set; } = "₹";

        // 3. PRINT FORMAT & STYLING
        public string PrintFormat { get; set; } = "80mm"; // "80mm", "58mm", "A4", "A5"
        public string HeaderAlignment { get; set; } = "center"; // "center", "left"
        public string PrimaryColor { get; set; } = "#0f172a";
        public int BaseFontSize { get; set; } = 10;
        public int StoreNameFontSize { get; set; } = 13;

        // 4. DISPLAY TOGGLES
        public bool ShowLogo { get; set; } = false;
        public bool ShowGstin { get; set; } = true;
        public bool ShowPhone { get; set; } = true;
        public bool ShowEmail { get; set; } = false;
        public bool ShowAddress { get; set; } = true;
        public bool ShowTradeLicense { get; set; } = false;
        public bool ShowPaymentMode { get; set; } = true;
        public bool ShowIssuedToType { get; set; } = true;
        public bool ShowItemRate { get; set; } = true;
        public bool ShowTotalAmount { get; set; } = true;
        public bool ShowAmountInWords { get; set; } = true;
        public bool ShowTerms { get; set; } = true;
        public bool ShowSignatures { get; set; } = true;
        public bool ShowBarcodeOrQr { get; set; } = true;

        // 5. SIGNATURE LABELS
        public string IssuerSignatureLabel { get; set; } = "Store Keeper / Authorized Sign";
        public string ReceiverSignatureLabel { get; set; } = "Receiver / Student Sign";

        // 6. TERMS & FOOTER
        public string TermsTitle { get; set; } = "TERMS & CONDITIONS:";
        public string TermsText { get; set; } = "1. Goods once sold will be exchanged within 7 days with original cash memo.\n2. Altered or washed uniforms will not be exchanged.\n3. Books with marks or damage cannot be returned.";
        public string FooterNote { get; set; } = "Thank you for your purchase! Have a great academic session.";
    }
}
