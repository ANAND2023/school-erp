import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

/**
 * Universal School ERP Print Templates Engine
 * Generates 100% exact replicas of webapp slips:
 * 1. Enquiry Slip (EnquirySlipModal.jsx)
 * 2. Fee Receipt Slip (FeeReceiptSlip.jsx - Dual Copy)
 * 3. Student Gate Pass Slip (GatePassSlipModal.jsx - Dual Copy)
 * 4. Admission Acknowledgment Slip (AdmissionSlipDesignerPage.jsx)
 */

/**
 * Converts a numeric amount to Indian Currency words
 * e.g. 10700 -> "Rupees Ten Thousand, Seven Hundred Only"
 */
export function numberToIndianWords(num) {
  if (num === null || num === undefined || isNaN(num) || Number(num) === 0) {
    return 'Rupees ZERO ONLY';
  }

  const a = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];
  const b = [
    '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'
  ];

  const convertThreeDigits = (n) => {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  };

  const parsed = Math.abs(Number(num));
  let intPart = Math.floor(parsed);
  const paise = Math.round((parsed - intPart) * 100);

  const crore = Math.floor(intPart / 10000000);
  intPart %= 10000000;
  const lakh = Math.floor(intPart / 100000);
  intPart %= 100000;
  const thousand = Math.floor(intPart / 1000);
  intPart %= 1000;
  const remainder = intPart;

  const parts = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' CRORE');
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' LAKH');
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' THOUSAND');
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  let res = parts.join(', ');
  if (!res) res = 'ZERO';

  let words = `Rupees ${res}`;
  if (paise > 0) {
    words += ` AND ${convertThreeDigits(paise)} PAISE`;
  }
  words += ' ONLY';
  return words;
}

/**
 * Converts a date string (YYYY-MM-DD) to English calendar words
 * e.g. "2016-08-12" -> "Twelfth August Two Thousand Sixteen"
 */
export function dateToWords(dateStr) {
  if (!dateStr) return '—';
  const cleanDateStr = String(dateStr).split('T')[0];
  const parts = cleanDateStr.split('-');
  let d;
  if (parts.length === 3 && parts[0].length === 4) {
    d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return '—';

  const dayNames = [
    '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
    'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
    'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth', 'Thirty-First'
  ];

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n) => {
    if (n < 20) return ones[n];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? ' ' + ones[digit] : '');
  };

  const dayWord = dayNames[d.getDate()] || String(d.getDate());
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthWord = monthNames[d.getMonth()] || '';
  const year = d.getFullYear();

  let yearWord = '';
  if (year >= 2000 && year < 2100) {
    const rem = year - 2000;
    yearWord = 'Two Thousand' + (rem > 0 ? ' ' + numToWords(rem) : '');
  } else if (year >= 1900 && year < 2000) {
    const century = Math.floor(year / 100);
    const rem = year % 100;
    yearWord = numToWords(century) + ' Hundred' + (rem > 0 ? ' ' + numToWords(rem) : '');
  } else {
    yearWord = String(year);
  }

  return `${dayWord} ${monthWord} ${yearWord}`.trim();
}

/**
 * Formats school branding consistently from branch and user context
 */
export function getSchoolBranding(user = {}, branch = {}) {
  const schoolName = branch?.schoolName || branch?.name || user?.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branch?.name ? `${branch.name} Branch` : user?.branchName ? `${user.branchName} Branch` : 'Main Campus';
  const address = branch?.address
    ? `${branch.address}, ${branch?.city || ''} ${branch?.pincode ? `(${branch.pincode})` : ''}`.trim()
    : user?.schoolAddress || 'Sector 12, RK Puram, New Delhi - 110022';
  const phone = branch?.phone || branch?.mobile || user?.schoolPhone || '+91 11 2617 8900';
  const email = branch?.email || user?.schoolEmail || 'admissions@dpsdelhi.edu.in';
  const affiliationNo = branch?.affiliationNumber || branch?.affiliationNo || '2130892';
  const logoUrl = branch?.logoUrl || user?.schoolLogoUrl || '';
  const principalSignatureUrl = branch?.principalSignatureUrl || user?.principalSignatureUrl || '';

  return {
    schoolName,
    branchName,
    address,
    phone,
    email,
    affiliationNo,
    logoUrl,
    principalSignatureUrl,
  };
}

/**
 * 1. ENQUIRY SLIP HTML TEMPLATE
 * Replicates EnquirySlipModal.jsx
 */
export function generateEnquirySlipHtml(enquiry = {}, school = {}, config = {}) {
  const brand = getSchoolBranding(school.user, school.branch);
  const primaryColor = config.primaryColor || '#0f766e';
  const secondaryColor = config.secondaryColor || '#f0fdfa';
  const borderColor = config.borderColor || '#0f766e';

  const yearStr = enquiry?.createdOn ? new Date(enquiry.createdOn).getFullYear() : new Date().getFullYear();
  const enqNum = enquiry?.enquiryNo || (enquiry?.id ? `ENQ-${yearStr}-${String(enquiry.id).padStart(4, '0')}` : 'ENQ-NEW');
  const enquiryDate = enquiry?.createdOn
    ? new Date(enquiry.createdOn).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ', ' + new Date(enquiry.createdOn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const nextFollowup = enquiry?.nextFollowupDate
    ? new Date(enquiry.nextFollowupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not Scheduled';

  const statusLabel = Number(enquiry?.status) === 3
    ? 'Converted to Admission'
    : Number(enquiry?.status) === 2
    ? 'In Follow-up'
    : Number(enquiry?.status) === 4
    ? 'Closed'
    : 'Open / Under Review';

  const statusColor = Number(enquiry?.status) === 3
    ? '#16a34a'
    : Number(enquiry?.status) === 2
    ? '#d97706'
    : primaryColor;

  const sessionName = enquiry?.academicYearName || school?.activeAcademicYearName || '2026-27';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Enquiry_Slip_${enquiry?.studentName || 'Student'}_${enqNum}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 8px;
      background: #ffffff;
      font-size: 13px;
    }
    .slip-container {
      border: 2px solid ${borderColor};
      border-radius: 8px;
      padding: 24px;
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header {
      text-align: center;
      border-bottom: 2.5px double ${borderColor};
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .school-name {
      font-size: 24px;
      font-weight: 900;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0 0 4px 0;
      line-height: 1.15;
    }
    .subtitle {
      font-size: 12.5px;
      color: #475569;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .address-line {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 8px;
      line-height: 1.35;
    }
    .slip-title-badge {
      display: inline-block;
      background: ${primaryColor};
      color: #ffffff;
      padding: 4px 18px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .meta-bar {
      margin-bottom: 14px;
      padding: 8px 14px;
      background: ${secondaryColor};
      border-radius: 6px;
      border: 1.5px solid ${borderColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-item { flex: 1; }
    .meta-label {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .section-header {
      background: ${secondaryColor};
      border-left: 3.5px solid ${primaryColor};
      padding: 4px 10px;
      border-radius: 0 4px 4px 0;
      font-weight: 800;
      font-size: 11px;
      color: ${primaryColor};
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .student-guardian-box {
      display: flex;
      gap: 16px;
      margin-bottom: 14px;
      align-items: flex-start;
    }
    .info-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      row-gap: 8px;
      column-gap: 16px;
    }
    .info-cell-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .info-cell-value {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .photo-box {
      width: 86px;
      height: 104px;
      border: 1.5px dashed #94a3b8;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: #fafafa;
      color: #64748b;
      font-size: 9px;
      font-weight: 600;
      line-height: 1.2;
      flex-shrink: 0;
      padding: 4px;
    }
    .discussion-box {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
    }
    .notes-panel {
      flex: 2;
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 11.5px;
      color: #334155;
      min-height: 48px;
      line-height: 1.4;
    }
    .followup-panel {
      flex: 1;
      background: ${secondaryColor};
      border: 1px solid ${borderColor};
      border-radius: 6px;
      padding: 8px 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .docs-checklist {
      display: grid;
      grid-template-columns: 1fr 1fr;
      row-gap: 6px;
      column-gap: 16px;
      margin-bottom: 14px;
    }
    .doc-item {
      display: flex;
      align-items: center;
      font-size: 11.5px;
      color: #334155;
    }
    .check-mark {
      color: ${primaryColor};
      font-weight: 900;
      font-size: 13px;
      margin-right: 6px;
    }
    .guidelines-box {
      border: 1px dashed ${borderColor};
      background: ${secondaryColor};
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 16px;
    }
    .guidelines-title {
      font-size: 10px;
      font-weight: 800;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .guidelines-text {
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
      white-space: pre-line;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      padding-top: 10px;
    }
    .sig-col {
      text-align: center;
      flex: 1;
    }
    .sig-line {
      height: 32px;
      border-bottom: 1px solid #475569;
      margin-bottom: 6px;
    }
    .sig-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #1e293b;
    }
    .sig-sub {
      font-size: 9.5px;
      color: #64748b;
    }
    .seal-box {
      width: 90px;
      height: 60px;
      border: 1.5px dashed #94a3b8;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
    }
    .footer-bar {
      margin-top: 16px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      ${brand.logoUrl ? `
        <img src="${brand.logoUrl}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 4px; margin-bottom: 4px;" alt="Logo" />
      ` : ''}
      <h1 class="school-name">${brand.schoolName}</h1>
      <div class="subtitle">${brand.branchName} • Affiliated to CBSE, New Delhi (Affiliation No: ${brand.affiliationNo})</div>
      <div class="address-line">Address: ${brand.address} | Helpline: ${brand.phone} | Email: ${brand.email}</div>
      <div class="slip-title-badge">Visitor & Admission Enquiry Slip</div>
    </div>

    <div class="meta-bar">
      <div class="meta-item">
        <div class="meta-label">Enquiry Ref. No</div>
        <div class="meta-value" style="color: ${primaryColor};">${enqNum}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Date & Time</div>
        <div class="meta-value">${enquiryDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Enquiry Source</div>
        <div class="meta-value">${enquiry?.source || 'Walk-in Visit'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Current Status</div>
        <div class="meta-value" style="color: ${statusColor};">${statusLabel}</div>
      </div>
    </div>

    <div class="section-header">1. Prospective Student & Guardian Information</div>
    <div class="student-guardian-box">
      <div class="info-grid">
        <div>
          <div class="info-cell-label">Candidate / Student Name:</div>
          <div class="info-cell-value" style="text-transform: uppercase;">${enquiry?.studentName || '—'}</div>
        </div>
        <div>
          <div class="info-cell-label">Seeking Admission to Class:</div>
          <div class="info-cell-value" style="color: ${primaryColor};">${enquiry?.className || 'General Enquiry'}</div>
        </div>
        <div>
          <div class="info-cell-label">Father / Guardian Name:</div>
          <div class="info-cell-value">${enquiry?.guardianName || '—'}</div>
        </div>
        <div>
          <div class="info-cell-label">Primary Contact Mobile:</div>
          <div class="info-cell-value">${enquiry?.mobile || '—'}</div>
        </div>
        <div>
          <div class="info-cell-label">Email Address:</div>
          <div class="info-cell-value">${enquiry?.email || '—'}</div>
        </div>
        <div>
          <div class="info-cell-label">Academic Session:</div>
          <div class="info-cell-value" style="color: ${primaryColor}; font-weight: 800;">${sessionName}</div>
        </div>
      </div>

      <div class="photo-box">
        <div style="font-size: 24px; color: #94a3b8; margin-bottom: 4px;">👤</div>
        <div>Affix Student<br>Passport Photo</div>
      </div>
    </div>

    <div class="section-header">2. Discussion Notes & Scheduled Follow-up</div>
    <div class="discussion-box">
      <div class="notes-panel">
        <div class="info-cell-label">Counselor Notes / Inquiries Raised:</div>
        <div>${enquiry?.notes || 'Enquired about curriculum syllabus, admission fee schedule, and transport route availability.'}</div>
      </div>
      <div class="followup-panel">
        <div class="info-cell-label">Next Follow-up Visit:</div>
        <div style="font-size: 14px; font-weight: 800; color: ${primaryColor}; margin-top: 4px;">${nextFollowup}</div>
      </div>
    </div>

    <div class="section-header">3. Documents Required at the Time of Admission</div>
    <div class="docs-checklist">
      <div class="doc-item"><span class="check-mark">&#x2714;</span> 1. Original Birth Certificate</div>
      <div class="doc-item"><span class="check-mark">&#x2714;</span> 2. Student & Parents Aadhaar Cards</div>
      <div class="doc-item"><span class="check-mark">&#x2714;</span> 3. Transfer Certificate (TC - Countersigned)</div>
      <div class="doc-item"><span class="check-mark">&#x2714;</span> 4. 4 Passport-size Photos of Student</div>
      <div class="doc-item"><span class="check-mark">&#x2714;</span> 5. Valid Address Proof (Electricity / Voter ID)</div>
      <div class="doc-item"><span class="check-mark">&#x2714;</span> 6. Previous Class Report Card / Marksheet</div>
    </div>

    <div class="guidelines-box">
      <div class="guidelines-title">Important Instructions for Parents:</div>
      <div class="guidelines-text">• Admissions are processed strictly on a first-come, first-served basis subject to seat availability in the sought class.
• School admission desk is operational from Monday to Saturday, 9:00 AM to 2:00 PM.
• Please quote the Reference Number (${enqNum}) for all future correspondences and queries.</div>
    </div>

    <div class="signatures-row">
      <div class="sig-col" style="padding-right: 12px;">
        <div class="sig-line"></div>
        <div class="sig-title">Parent / Visitor Signature</div>
        <div class="sig-sub">Date: ${enquiryDate.split(',')[0]}</div>
      </div>

      <div class="sig-col" style="padding: 0 12px;">
        <div class="sig-line"></div>
        <div class="sig-title">Admission Counselor</div>
        <div class="sig-sub">Front-Desk Verification</div>
      </div>

      <div class="sig-col" style="padding: 0 12px;">
        <div class="sig-line"></div>
        <div class="sig-title">Principal / Auth. Signatory</div>
        <div class="sig-sub">Official School Verification</div>
      </div>

      <div style="flex-shrink: 0; padding-left: 8px;">
        <div class="seal-box">OFFICIAL<br>SCHOOL SEAL</div>
      </div>
    </div>

    <div class="footer-bar">
      Generated from DVS ERP (Digital Vidya Sarthi) • Official Enquiry Acknowledgement Slip
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 2. FEE RECEIPT SLIP HTML TEMPLATE (DUAL COPY: Office Copy + Student Copy)
 * Replicates FeeReceiptSlip.jsx
 */
export function generateFeeReceiptHtml(receipt = {}, school = {}, config = {}) {
  const brand = getSchoolBranding(school.user, school.branch);
  const primaryColor = config.primaryColor || '#1e3a8a';
  const secondaryColor = config.secondaryColor || '#eff6ff';
  const borderColor = config.borderColor || '#1e3a8a';

  const receiptNo = receipt.receiptNo || 'KU7304';
  const dateFormatted = receipt.receiptDate
    ? new Date(receipt.receiptDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const studentName = (receipt.studentName || '').toUpperCase();
  const admNo = receipt.admissionNo || receipt.admissionNumber || '—';
  const className = receipt.className || (receipt.classSection ? receipt.classSection.split('-')[0].trim() : '—');
  const fatherName = (receipt.fatherName || receipt.guardianName || '—').toUpperCase();
  const paymentMode = receipt.paymentModeName || receipt.paymentMode || 'Cash';

  const items = Array.isArray(receipt.items) && receipt.items.length > 0 ? receipt.items : [];
  const totalPaid = Number(receipt.totalPaid || receipt.amount || 0);
  const totalConcession = Number(receipt.totalConcession || 0);
  const totalFine = Number(receipt.totalFine || 0);
  const totalDiscount = Number(receipt.totalDiscount || 0);
  const remainingDues = Number(receipt.remainingTotalDues || receipt.balanceDue || receipt.remainingBalance || 0);
  const totalActualAmount = Number(receipt.totalFeePaid || receipt.subTotal || (totalPaid + remainingDues + totalConcession));
  const totalPayableAmount = Math.max(0, totalActualAmount + totalFine - totalConcession - totalDiscount);

  const amountInWords = receipt.amountInWords || numberToIndianWords(totalPaid);
  const monthDisplay = receipt.month || 'Current Academic Quarter';

  const renderSingleSlip = (copyTitle) => `
    <div class="slip-box">
      <!-- Header -->
      <div class="header-row">
        <div class="emblem-box">
          ${brand.logoUrl ? `
            <img src="${brand.logoUrl}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px;" alt="Logo" />
          ` : `
            <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="47" stroke="${primaryColor}" stroke-width="3.5" fill="${secondaryColor}" />
              <circle cx="50" cy="50" r="42" stroke="#b45309" stroke-width="1.5" stroke-dasharray="3 2" />
              <circle cx="50" cy="46" r="28" fill="${primaryColor}" />
              <polygon points="50,26 53,35 63,35 55,41 58,50 50,44 42,50 45,41 37,35 47,35" fill="#fef08a" />
              <path d="M36 52 Q44 48 50 52 Q56 48 64 52 L64 64 Q56 60 50 64 Q44 60 36 64 Z" fill="#ffffff" stroke="${primaryColor}" stroke-width="0.8" />
              <line x1="50" y1="52" x2="50" y2="64" stroke="${primaryColor}" stroke-width="1.2" />
              <path d="M22 45 Q18 56 26 66 M78 45 Q82 56 74 66" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" fill="none" />
              <path d="M22 72 Q50 82 78 72 L74 80 Q50 90 26 80 Z" fill="#b45309" />
              <text x="50" y="79" fill="#ffffff" font-size="7" font-weight="bold" text-anchor="middle" letter-spacing="0.8" font-family="Arial, sans-serif">EDUCATION</text>
            </svg>
          `}
        </div>
        <div class="school-details">
          <div class="school-title">${brand.schoolName}</div>
          <div class="school-sub">${brand.branchName} • Affiliation No: ${brand.affiliationNo}</div>
          <div class="school-addr">Address: ${brand.address}</div>
          <div class="school-contact">Contact: ${brand.phone} | Email: ${brand.email}</div>
        </div>
      </div>

      <!-- Meta Bar -->
      <div class="meta-row">
        <span class="meta-title">FEE RECEIPT / PAYMENT VOUCHER</span>
        <span class="copy-badge">(${copyTitle})</span>
      </div>

      <!-- Student Details Box -->
      <div class="student-box">
        <div class="s-row">
          <div class="s-cell-left"><b>Rec. No:</b> <span class="bold-val">${receiptNo}</span></div>
          <div class="s-cell-right"><b>Date:</b> ${dateFormatted}</div>
        </div>
        <div class="s-row">
          <div class="s-cell-left"><b>Student:</b> <span class="bold-val">${studentName}</span></div>
          <div class="s-cell-right"><b>Adm No:</b> <span class="bold-val">${admNo}</span></div>
        </div>
        <div class="s-row">
          <div class="s-cell-left"><b>Class:</b> <span class="bold-val">${className}</span></div>
          <div class="s-cell-right"><b>Payment Mode:</b> ${paymentMode}</div>
        </div>
        <div class="s-row" style="border-bottom: none;">
          <div class="s-cell-left"><b>S/D of:</b> ${fatherName}</div>
          <div class="s-cell-right"><b>Month/Period:</b> ${monthDisplay}</div>
        </div>
      </div>

      <!-- Fee Breakdown Table -->
      <table class="fee-table">
        <thead>
          <tr>
            <th style="width: 70%; text-align: left;">FEE HEAD / DESCRIPTION</th>
            <th style="width: 30%; text-align: right;">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${items.length > 0 ? items.map(item => `
            <tr>
              <td>${item.feeHeadName || item.feeHead || 'Tuition Fee'}</td>
              <td style="text-align: right; font-weight: 700;">₹${Number(item.amountPaid || item.paid || item.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('') : `
            <tr>
              <td>School Academic & Tuition Fee</td>
              <td style="text-align: right; font-weight: 700;">₹${totalPaid.toLocaleString('en-IN')}</td>
            </tr>
          `}
          <tr class="table-total-row">
            <td>TOTAL FEE DUE</td>
            <td style="text-align: right; color: ${primaryColor};">₹${totalActualAmount.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>

      <!-- Financial Calculation Summary -->
      <div class="summary-box">
        <div class="sum-split">
          <div class="sum-left">
            <div class="sum-line"><span>Total Amount:</span> <b>₹${totalActualAmount.toLocaleString('en-IN')}</b></div>
            <div class="sum-line"><span>Fine:</span> <b>+ ₹${totalFine}</b></div>
            <div class="sum-line"><span>Concession:</span> <b>- ₹${totalConcession}</b></div>
          </div>
          <div class="sum-right">
            <div class="sum-line"><span style="color: ${primaryColor}; font-weight: 800;">Total Payable:</span> <b style="color: ${primaryColor};">₹${totalPayableAmount.toLocaleString('en-IN')}</b></div>
            <div class="sum-line paid-highlight"><span>Total Paid Amount:</span> <b style="color: #166534;">₹${totalPaid.toLocaleString('en-IN')}</b></div>
            <div class="sum-line"><span>Remaining Due:</span> <b style="color: ${remainingDues > 0 ? '#b91c1c' : '#15803d'};">${remainingDues > 0 ? `₹${remainingDues.toLocaleString('en-IN')}` : 'CLEARED (NIL)'}</b></div>
          </div>
        </div>
        <div class="words-line">
          <b>Rupees in Words:</b> <span style="font-weight: 700; text-transform: capitalize;">${amountInWords}</span>
        </div>
      </div>

      <!-- Signatures Row -->
      <div class="sig-row">
        <div class="sig-item">
          <div class="sig-dash">Cashier / Accountant</div>
        </div>
        <div class="seal-stamp">OFFICIAL SEAL</div>
        <div class="sig-item">
          <div class="sig-dash">Authorized Signatory</div>
        </div>
        <div class="sig-item">
          <div class="sig-dash">Parent / Student</div>
        </div>
      </div>

      <!-- Terms & Rules -->
      <div class="terms-note">
        <b>TERMS & CONDITIONS / FEE RULES:</b><br>
        • Fees once deposited will not be refunded or transferred under any circumstances.<br>
        • Cheque payments are accepted subject to realization.<br>
        • Please retain this receipt safely for future academic clearance & tax records.
      </div>
      <div style="text-align: center; font-size: 8px; color: #64748b; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">
        Computer Generated Fee Receipt • Powered by Digital Vidya Sarthi (DVS ERP)
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fee_Receipt_${studentName}_${receiptNo}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 11px;
    }
    .dual-container {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
    }
    .slip-box {
      border: 1.5px solid ${borderColor};
      padding: 10px 14px;
      background: #ffffff;
      box-sizing: border-box;
      margin-bottom: 4px;
    }
    .header-row {
      display: flex;
      align-items: center;
      border-bottom: 2px solid ${borderColor};
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .emblem-box {
      margin-right: 12px;
    }
    .emblem-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid ${primaryColor};
      background: ${secondaryColor};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .school-details {
      flex: 1;
      text-align: center;
    }
    .school-title {
      font-size: 15px;
      font-weight: 900;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.4px;
      line-height: 1.15;
    }
    .school-sub {
      font-size: 10.5px;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
    }
    .school-addr, .school-contact {
      font-size: 9px;
      color: #334155;
      line-height: 1.25;
    }
    .meta-row {
      background: ${secondaryColor};
      border: 1px solid ${borderColor};
      padding: 3px 8px;
      font-weight: 800;
      font-size: 10.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: ${primaryColor};
      margin-bottom: 6px;
    }
    .copy-badge {
      background: ${primaryColor};
      color: #ffffff;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 9px;
      text-transform: uppercase;
    }
    .student-box {
      border: 1px solid #94a3b8;
      font-size: 10px;
      margin-bottom: 6px;
    }
    .s-row {
      display: flex;
      border-bottom: 1px solid #cbd5e1;
      min-height: 18px;
      align-items: center;
    }
    .s-cell-left {
      width: 58%;
      padding: 2px 6px;
      border-right: 1px solid #cbd5e1;
    }
    .s-cell-right {
      width: 42%;
      padding: 2px 6px;
    }
    .bold-val {
      font-weight: 700;
      color: #0f172a;
    }
    .fee-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #94a3b8;
      font-size: 9.5px;
      margin-bottom: 6px;
    }
    .fee-table th {
      background: ${secondaryColor};
      border-bottom: 1px solid #94a3b8;
      padding: 3px 6px;
      font-weight: 800;
      color: ${primaryColor};
    }
    .fee-table td {
      border-bottom: 1px solid #e2e8f0;
      padding: 2.5px 6px;
    }
    .table-total-row {
      background: ${secondaryColor};
      font-weight: 800;
    }
    .summary-box {
      border: 1px solid #94a3b8;
      padding: 4px 6px;
      font-size: 9.5px;
      margin-bottom: 6px;
    }
    .sum-split {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 3px;
    }
    .sum-left {
      width: 48%;
      padding-right: 8px;
    }
    .sum-right {
      width: 52%;
      border-left: 1px solid #e2e8f0;
      padding-left: 8px;
    }
    .sum-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1.5px;
    }
    .paid-highlight {
      background: #f0fdf4;
      padding: 1px 3px;
      border-radius: 2px;
      font-weight: 800;
    }
    .words-line {
      font-size: 9px;
      color: #1e293b;
      margin-top: 2px;
    }
    .sig-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 10px;
      margin-bottom: 4px;
      padding: 0 8px;
    }
    .sig-item {
      text-align: center;
      width: 35%;
    }
    .sig-dash {
      border-top: 1px dashed #64748b;
      padding-top: 2px;
      font-size: 9px;
      font-weight: 700;
    }
    .seal-stamp {
      width: 60px;
      height: 34px;
      border: 1px dashed #94a3b8;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5px;
      font-weight: 700;
      color: #94a3b8;
      text-align: center;
    }
    .terms-note {
      font-size: 8px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 3px;
      margin-top: 4px;
    }
    .cut-line-row {
      text-align: center;
      border-top: 1.5px dashed #94a3b8;
      margin: 10px 0;
      position: relative;
    }
    .cut-line-badge {
      position: relative;
      top: -9px;
      background: #ffffff;
      padding: 0 10px;
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="dual-container">
    <!-- 1. TOP COPY: OFFICE / SCHOOL COPY -->
    ${renderSingleSlip('OFFICE COPY')}

    <!-- DASHED SCISSORS CUTTING LINE -->
    <div class="cut-line-row">
      <span class="cut-line-badge">✂ CUT ALONG LINE (OFFICE COPY / STUDENT COPY) ✂</span>
    </div>

    <!-- 2. BOTTOM COPY: STUDENT / PARENT COPY -->
    ${renderSingleSlip('STUDENT COPY')}
  </div>
</body>
</html>
  `;
}

/**
 * 3. STUDENT GATE PASS HTML TEMPLATE (DUAL COPY: Gate Copy + Parent Copy)
 * Replicates GatePassSlipModal.jsx
 */
export function generateGatePassSlipHtml(pass = {}, school = {}) {
  const brand = getSchoolBranding(school.user, school.branch);
  const primaryColor = '#0284c7';

  const passNo = pass.gatePassNo || 'GP-NEW';
  const passDate = pass.passDate
    ? new Date(pass.passDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderSinglePass = (copyTitle) => `
    <div class="pass-box">
      <!-- Header Row -->
      <div class="pass-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${brand.logoUrl ? `
            <img src="${brand.logoUrl}" style="width: 38px; height: 38px; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0; padding: 2px; background: #ffffff;" alt="Logo" />
          ` : `
            <div class="pass-emblem">🏫</div>
          `}
          <div>
            <div class="pass-school">${brand.schoolName}</div>
            <div class="pass-branch">Branch: ${brand.branchName} • Ph: ${brand.phone}</div>
            <div class="pass-addr">${brand.address}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="pass-badge">${copyTitle ? `GATE PASS (${copyTitle})` : 'STUDENT GATE PASS'}</div>
          <div class="pass-no-label">Pass No: <span style="font-family: monospace; color: ${primaryColor};">${passNo}</span></div>
          <div class="pass-date-label">Date: <b>${passDate}</b></div>
        </div>
      </div>

      <!-- Timing Bar -->
      <div class="timing-bar">
        <span>🕒 Out / Exit Time: <b>${pass.outTime || 'N/A'}</b></span>
        <span>🚶 Expected Return: <b>${pass.expectedReturnTime || 'Will Not Return Today'}</b></span>
        ${pass.actualReturnTime ? `<span style="color: #16a34a; font-weight: 800;">✓ Returned: ${pass.actualReturnTime}</span>` : ''}
      </div>

      <!-- Student & Escort Details Grid -->
      <div class="pass-grid">
        <div class="pass-col">
          <div class="col-title">STUDENT INFORMATION</div>
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            ${(pass.studentPhotoUrl || pass.photoUrl) ? `
              <img src="${pass.studentPhotoUrl || pass.photoUrl}" style="width: 58px; height: 68px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; flex-shrink: 0;" />
            ` : ''}
            <div style="flex: 1;">
              <div class="item-line"><b>Name:</b> <span class="bold-text">${pass.studentName || '—'}</span></div>
              <div class="item-line"><b>Adm No:</b> ${pass.admissionNo || '—'} | <b>Class:</b> ${pass.className || '—'} ${pass.sectionName ? `(${pass.sectionName})` : ''}</div>
              <div class="item-line"><b>Father:</b> ${pass.fatherName || '—'}</div>
              <div class="item-line"><b>Emergency Contact:</b> ${pass.fatherMobile || pass.emergencyContact || '—'}</div>
            </div>
          </div>
        </div>

        <div class="pass-col">
          <div class="col-title">ACCOMPANYING / PICKED UP BY</div>
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            ${(pass.receiverPhotoUrl || pass.receiverPhotoBase64 || pass.receiverPhoto) ? `
              <img src="${pass.receiverPhotoUrl || pass.receiverPhotoBase64 || pass.receiverPhoto}" style="width: 58px; height: 68px; object-fit: cover; border-radius: 4px; border: 1.5px solid ${primaryColor}; flex-shrink: 0;" />
            ` : `
              <div style="width: 58px; height: 68px; border: 1px dashed #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #94a3b8; text-align: center; background: #f8fafc; flex-shrink: 0; padding: 2px;">Escort<br>Photo</div>
            `}
            <div style="flex: 1;">
              <div class="item-line"><b>Receiver:</b> <span class="bold-text">${pass.receiverName || 'Self'}</span></div>
              <div class="item-line"><b>Relation:</b> <span style="color: ${primaryColor}; font-weight: 700;">${pass.receiverRelation || 'Parent'}</span></div>
              <div class="item-line"><b>Phone:</b> ${pass.receiverContact || 'Not Specified'}</div>
              <div class="item-line"><b>Approved By:</b> ${pass.approvedBy || 'School Office'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reason Box -->
      <div class="reason-bar">
        <b>Reason for Early Exit:</b> ${pass.reason || 'Medical / Personal Emergency'}
        ${pass.reasonDetail ? ` (${pass.reasonDetail})` : ''}
        ${pass.remarks ? ` • Note: ${pass.remarks}` : ''}
      </div>

      <!-- Signatures Row -->
      <div class="pass-sigs">
        <div class="p-sig">
          <div class="p-line"></div>
          <div>Student Sign</div>
        </div>
        <div class="p-sig">
          <div class="p-line"></div>
          <div>Parent / Escort Sign</div>
        </div>
        <div class="p-sig">
          <div class="p-line"></div>
          <div>Security Guard Sign</div>
        </div>
        <div class="p-sig">
          <div class="p-line"></div>
          <div>Principal / Seal</div>
        </div>
      </div>

      <div class="sec-note">
        * Security Note: Security guards must verify identity of the escort person before permitting the student to exit the campus gate.
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GatePass_${passNo}_${pass.studentName || 'Student'}</title>
  <style>
    @page { size: A4 portrait; margin: 6mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 11px;
    }
    .dual-pass-container {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
    }
    .pass-box {
      border: 1.5px solid ${primaryColor};
      border-radius: 6px;
      padding: 8px 12px;
      background: #ffffff;
      box-sizing: border-box;
      margin-bottom: 4px;
    }
    .pass-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid ${primaryColor};
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .pass-emblem {
      font-size: 26px;
    }
    .pass-school {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      line-height: 1.15;
    }
    .pass-branch {
      font-size: 9.5px;
      color: ${primaryColor};
      font-weight: 700;
    }
    .pass-addr {
      font-size: 8.5px;
      color: #64748b;
    }
    .pass-badge {
      background: ${primaryColor};
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      display: inline-block;
      margin-bottom: 2px;
    }
    .pass-no-label {
      font-size: 10.5px;
      font-weight: 800;
    }
    .pass-date-label {
      font-size: 9px;
      color: #64748b;
    }
    .timing-bar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #475569;
      margin-bottom: 6px;
    }
    .pass-grid {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .pass-col {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 8px;
      background: #ffffff;
    }
    .col-title {
      font-size: 8.5px;
      font-weight: 900;
      color: ${primaryColor};
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .item-line {
      font-size: 9.5px;
      color: #334155;
      margin-bottom: 2px;
    }
    .bold-text {
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }
    .reason-bar {
      border: 1px solid #e2e8f0;
      background: #fafafa;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 9.5px;
      color: #334155;
      margin-bottom: 6px;
    }
    .pass-sigs {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
    }
    .p-sig {
      text-align: center;
      flex: 1;
      font-size: 8.5px;
      font-weight: 700;
      color: #475569;
    }
    .p-line {
      border-bottom: 1px solid #94a3b8;
      height: 18px;
      margin-bottom: 2px;
    }
    .sec-note {
      font-size: 8px;
      color: #94a3b8;
      text-align: center;
      margin-top: 4px;
    }
    .gate-cut-line {
      text-align: center;
      border-top: 1.5px dashed #94a3b8;
      margin: 8px 0;
      position: relative;
    }
    .gate-cut-badge {
      position: relative;
      top: -8px;
      background: #ffffff;
      padding: 0 8px;
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
    }
  </style>
</head>
<body>
  <div class="dual-pass-container">
    <!-- TOP: GATE SECURITY COPY -->
    ${renderSinglePass('GATE SECURITY COPY')}

    <!-- CUTTING LINE -->
    <div class="gate-cut-line">
      <span class="gate-cut-badge">✂ CUT ALONG THIS LINE (HALF A4 - SECURITY COPY / PARENT COPY) ✂</span>
    </div>

    <!-- BOTTOM: PARENT / ESCORT COPY -->
    ${renderSinglePass('PARENT / ESCORT COPY')}
  </div>
</body>
</html>
  `;
}

/**
 * 4. ADMISSION ACKNOWLEDGMENT SLIP HTML TEMPLATE
 * Replicates AdmissionReportModal.jsx & AdmissionSlipDesignerPage.jsx 100%
 */
export function generateAdmissionSlipHtml(student = {}, school = {}, config = {}) {
  const brand = getSchoolBranding(school.user, school.branch);
  const primaryColor = config.primaryColor || '#065f46'; // Forest Emerald
  const secondaryColor = config.secondaryColor || '#ecfdf5';
  const borderColor = config.borderColor || '#065f46';

  const admNo = student.admissionNo || student.admissionNumber || 'Pending Confirmation';
  const admDate = student.admissionDate
    ? new Date(student.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const studentFullName = (student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student').toUpperCase();

  const rawDob = student.dateOfBirth || student.dob;
  const dobFigures = rawDob
    ? new Date(rawDob).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : '—';
  const dobWords = rawDob ? dateToWords(rawDob) : '—';

  const className = student.currentEnrollment?.className || student.className || student.currentClass || '—';
  const sectionName = student.currentEnrollment?.sectionName || student.sectionName || student.currentSection || '—';
  const rollNo = student.currentEnrollment?.rollNo || student.rollNo || null;
  const academicYear = student.currentEnrollment?.academicYearName || student.academicYearName || school?.activeAcademicYearName || '2026-2027';

  const guardians = Array.isArray(student.guardians) ? student.guardians : [];
  const fatherObj = guardians.find((g) => g.relation?.toLowerCase() === 'father') || {};
  const motherObj = guardians.find((g) => g.relation?.toLowerCase() === 'mother') || {};
  const primaryGuardian = guardians.find((g) => g.isPrimary) || guardians[0] || fatherObj || {};

  const fatherName = fatherObj.name || student.fatherName || primaryGuardian.name || '—';
  const fatherMobile = fatherObj.mobile || student.fatherMobile || primaryGuardian.mobile || '—';
  const fatherOccupation = fatherObj.occupation || student.fatherOccupation || '—';

  const motherName = motherObj.name || student.motherName || '—';
  const motherMobile = motherObj.mobile || student.motherMobile || '—';
  const motherOccupation = motherObj.occupation || student.motherOccupation || '—';

  const gender = student.gender || '—';
  const bloodGroup = student.bloodGroup || '—';
  const aadhaarNo = student.aadhaarNo || '—';
  const categoryName = student.categoryName || student.category || 'General';
  const religionName = student.religionName || student.religion || 'Hindu';
  const emergencyContact = student.emergencyContact || student.fatherMobile || primaryGuardian.mobile || '—';

  const fullAddress = student.address
    ? `${student.address}${student.city ? `, ${student.city}` : ''}${student.state ? `, ${student.state}` : ''}${student.pincode ? ` - ${student.pincode}` : ''}`
    : '—';

  const studentPhoto = student.photoUrl || student.photoBase64 || null;
  const fatherPhoto =
    student.fatherPhotoUrl ||
    student.documents?.find((d) => (d.title || d.documentTypeName || '').toLowerCase().includes('father'))?.filePath ||
    null;
  const motherPhoto =
    student.motherPhotoUrl ||
    student.documents?.find((d) => (d.title || d.documentTypeName || '').toLowerCase().includes('mother'))?.filePath ||
    null;
  const guardianPhoto =
    student.guardianPhotoUrl ||
    student.documents?.find((d) => (d.title || d.documentTypeName || '').toLowerCase().includes('guardian'))?.filePath ||
    null;

  const photoList = [
    { label: "Student's Photo", url: studentPhoto },
    { label: "Father's Photo", url: fatherPhoto },
    { label: "Mother's Photo", url: motherPhoto },
    { label: "Guardian's Photo", url: guardianPhoto },
  ];

  // Document checklist matching web app
  const docs = student.documents || [];
  const docTitles = docs.map((d) => (d.title || d.documentTypeName || '').toLowerCase());
  const configuredDocs = [
    '1. Original Birth Certificate (Municipal Corp / Gram Panchayat)',
    '2. Student & Parents\' Aadhaar Cards (Photocopies)',
    '3. Transfer Certificate (TC) from Previous School (Countersigned)',
    '4. Previous Class Marksheet / Progress Report Card',
    '5. 4 Passport-size Photographs of Student & 2 of Parents',
    '6. Valid Address Proof (Electricity Bill / Voter ID / Passport / Domicile)',
  ];

  const checklistItems = configuredDocs.map((docText, idx) => {
    const lower = docText.toLowerCase();
    const isSubmitted =
      ((lower.includes('birth') || lower.includes('dob')) && docTitles.some((t) => t.includes('birth') || t.includes('dob'))) ||
      ((lower.includes('aadhaar') || lower.includes('aadhar')) && docTitles.some((t) => t.includes('aadhaar') || t.includes('aadhar'))) ||
      ((lower.includes('transfer') || lower.includes('tc')) && docTitles.some((t) => t.includes('transfer') || t.includes('tc'))) ||
      ((lower.includes('marksheet') || lower.includes('report') || lower.includes('result')) && docTitles.some((t) => t.includes('marksheet') || t.includes('report') || t.includes('result'))) ||
      (lower.includes('photo') && Boolean(studentPhoto)) ||
      ((lower.includes('address') || lower.includes('domicile')) && docTitles.some((t) => t.includes('address') || t.includes('domicile') || t.includes('voter') || t.includes('electricity'))) ||
      docTitles.some((t) => lower.split(' ').some((word) => word.length > 3 && t.includes(word)));

    return {
      id: idx + 1,
      name: docText,
      isSubmitted: Boolean(isSubmitted),
    };
  });

  const todayFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const todayDateTime = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admission_Report_${studentFullName}_${admNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.25;
    }
    .slip-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid ${primaryColor};
      border-radius: 4px;
      padding: 10px 14px;
      background: #ffffff;
      box-sizing: border-box;
    }
    .header-box {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 2.5px double ${primaryColor};
    }
    .header-flex {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 3px;
    }
    .school-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .school-name {
      font-size: 20px;
      font-weight: 900;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0;
      line-height: 1.15;
    }
    .school-sub {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 1px;
    }
    .school-contact {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .slip-badge-pill {
      display: inline-block;
      margin-top: 5px;
      padding: 3px 18px;
      background: ${primaryColor};
      color: #ffffff;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.8px;
      font-size: 10.5px;
      text-transform: uppercase;
    }
    .meta-bar {
      margin: 6px 0;
      padding: 6px 10px;
      background: ${secondaryColor};
      border-radius: 4px;
      border: 1.5px solid ${primaryColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-col {
      flex: 1;
      text-align: left;
    }
    .meta-col-label {
      font-size: 8.5px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .meta-col-val {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .meta-col-val.adm-highlight {
      font-size: 12.5px;
      font-weight: 800;
      color: ${primaryColor};
    }
    .section-banner {
      background: ${secondaryColor};
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
      color: ${primaryColor};
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 5px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    .grid-table td {
      padding: 2px 4px;
      vertical-align: top;
    }
    .field-lbl {
      font-size: 8.5px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .field-val {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .parents-grid {
      display: flex;
      gap: 10px;
      margin-bottom: 5px;
    }
    .parent-card {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #fafafa;
    }
    .parent-card-title {
      font-size: 9px;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .parent-card-row {
      font-size: 10px;
      line-height: 1.35;
      color: #334155;
    }
    .photos-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 5px;
    }
    .photo-slot {
      flex: 1;
      text-align: center;
    }
    .photo-box-frame {
      width: 74px;
      height: 90px;
      margin: 0 auto;
      border-radius: 4px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      overflow: hidden;
    }
    .photo-box-frame.has-img {
      border: 1.5px solid ${primaryColor};
    }
    .photo-box-frame.no-img {
      border: 1.5px dashed #94a3b8;
    }
    .photo-slot-label {
      font-size: 9px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 3px;
    }
    .checklist-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 12px;
      margin-bottom: 5px;
    }
    .checklist-item {
      font-size: 9.5px;
      display: flex;
      align-items: center;
      line-height: 1.25;
    }
    .undertaking-box {
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      padding: 5px 8px;
      background: #fafafa;
      margin-bottom: 6px;
    }
    .undertaking-title {
      font-size: 8.5px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .undertaking-text {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.25;
    }
    .signatures-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 8px;
      padding-top: 4px;
    }
    .sig-col {
      flex: 1;
      text-align: center;
      padding: 0 4px;
    }
    .sig-line-bar {
      border-bottom: 1px solid #475569;
      height: 24px;
      margin-bottom: 3px;
    }
    .sig-col-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-col-sub {
      font-size: 8.5px;
      color: #64748b;
    }
    .seal-box-stamp {
      width: 58px;
      height: 36px;
      margin: 0 auto;
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      margin-top: 6px;
      text-align: center;
      font-size: 8.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <!-- Header -->
    <div class="header-box">
      <div class="header-flex">
        ${brand.logoUrl ? `
          <img src="${brand.logoUrl}" class="school-logo" alt="School Logo" />
        ` : `
          <div style="font-size: 28px; line-height: 1;">🏛️</div>
        `}
        <div>
          <h1 class="school-name">${brand.schoolName}</h1>
          <div class="school-sub">${brand.branchName} • Affiliated to CBSE, New Delhi (Affiliation No: ${brand.affiliationNo})</div>
        </div>
      </div>
      <div class="school-contact">Address: ${brand.address} | Phone: ${brand.phone} | Email: ${brand.email}</div>
      <div class="slip-badge-pill">OFFICIAL STUDENT ADMISSION & REGISTRATION ACKNOWLEDGEMENT</div>
    </div>

    <!-- Meta Reference Bar -->
    <div class="meta-bar">
      <div class="meta-col">
        <div class="meta-col-label">ADMISSION NUMBER</div>
        <div class="meta-col-val adm-highlight">${admNo}</div>
      </div>
      <div class="meta-col">
        <div class="meta-col-label">DATE OF ADMISSION</div>
        <div class="meta-col-val">${admDate}</div>
      </div>
      <div class="meta-col">
        <div class="meta-col-label">CLASS & SECTION</div>
        <div class="meta-col-val">${className} - ${sectionName}</div>
      </div>
      <div class="meta-col">
        <div class="meta-col-label">SESSION / ROLL NO</div>
        <div class="meta-col-val">${academicYear} ${rollNo ? `(Roll #${rollNo})` : '(Roll: Pending)'}</div>
      </div>
    </div>

    <!-- 1. Pupil Personal Information -->
    <div class="section-banner">
      <span>1. Pupil Personal Information</span>
    </div>
    <table class="grid-table">
      <tr>
        <td style="width: 32%;">
          <div class="field-lbl">Full Name of Student:</div>
          <div class="field-val" style="font-size: 11.5px; text-transform: uppercase;">${studentFullName}</div>
        </td>
        <td style="width: 18%;">
          <div class="field-lbl">Gender:</div>
          <div class="field-val">${gender}</div>
        </td>
        <td style="width: 22%;">
          <div class="field-lbl">Blood Group:</div>
          <div class="field-val" style="color: #dc2626; font-weight: 800;">${bloodGroup}</div>
        </td>
        <td style="width: 28%;">
          <div class="field-lbl">Aadhaar No:</div>
          <div class="field-val">${aadhaarNo}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="field-lbl">Date of Birth (in figures):</div>
          <div class="field-val">${dobFigures}</div>
        </td>
        <td colspan="3">
          <div class="field-lbl">Date of Birth (in words):</div>
          <div class="field-val" style="font-style: italic; font-weight: 500; color: #334155;">${dobWords}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="field-lbl">Category:</div>
          <div class="field-val" style="font-weight: 600;">${categoryName}</div>
        </td>
        <td>
          <div class="field-lbl">Religion:</div>
          <div class="field-val" style="font-weight: 600;">${religionName}</div>
        </td>
        <td>
          <div class="field-lbl">Nationality:</div>
          <div class="field-val" style="font-weight: 600;">Indian</div>
        </td>
        <td>
          <div class="field-lbl">Emergency Contact:</div>
          <div class="field-val" style="color: ${primaryColor}; font-weight: 800;">${emergencyContact}</div>
        </td>
      </tr>
      <tr>
        <td colspan="4">
          <div class="field-lbl">Residential Address:</div>
          <div class="field-val" style="font-weight: 500;">${fullAddress}</div>
        </td>
      </tr>
    </table>

    <!-- 2. Parents & Guardians Information -->
    <div class="section-banner">
      <span>2. Parents & Guardians Information</span>
    </div>
    <div class="parents-grid">
      <div class="parent-card">
        <div class="parent-card-title">FATHER'S DETAILS</div>
        <div class="parent-card-row">Name: <b>${fatherName}</b></div>
        <div class="parent-card-row">Mobile: <b>${fatherMobile}</b></div>
        <div class="parent-card-row">Occupation: ${fatherOccupation}</div>
      </div>
      <div class="parent-card">
        <div class="parent-card-title">MOTHER'S DETAILS</div>
        <div class="parent-card-row">Name: <b>${motherName}</b></div>
        <div class="parent-card-row">Mobile: <b>${motherMobile}</b></div>
        <div class="parent-card-row">Occupation: ${motherOccupation}</div>
      </div>
    </div>

    <!-- 3. Official Identification Photographs -->
    <div class="section-banner">
      <span>3. Official Identification Photographs</span>
      <span style="font-size: 8.5px; font-weight: 600; color: #64748b;">Standard Passport Size</span>
    </div>
    <div class="photos-row">
      ${photoList.map((item) => `
        <div class="photo-slot">
          <div class="photo-box-frame ${item.url ? 'has-img' : 'no-img'}">
            ${item.url ? `
              <img src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.label}" />
            ` : `
              <div style="font-size: 20px; color: #94a3b8; line-height: 1;">👤</div>
              <div style="font-size: 7.5px; color: #94a3b8; margin-top: 2px;">Affix Photo</div>
            `}
          </div>
          <div class="photo-slot-label">${item.label}</div>
        </div>
      `).join('')}
    </div>

    <!-- 4. Document Submission & Verification Checklist -->
    <div class="section-banner">
      <span>4. Document Submission & Verification Checklist</span>
    </div>
    <div class="checklist-grid">
      ${checklistItems.map((doc) => `
        <div class="checklist-item">
          ${doc.isSubmitted ? `
            <span style="color: #16a34a; font-weight: 900; font-size: 11px; margin-right: 4px;">✔</span>
            <span style="font-weight: 600; color: #0f172a;">${doc.name}</span>
          ` : `
            <span style="color: #94a3b8; font-size: 10px; margin-right: 4px;">▢</span>
            <span style="color: #64748b;">${doc.name} <i style="font-size: 8px; color: #94a3b8;">(Pending)</i></span>
          `}
        </div>
      `).join('')}
    </div>

    <!-- 5. Parent Undertaking & Declaration -->
    <div class="undertaking-box">
      <div class="undertaking-title">DECLARATION BY PARENT / GUARDIAN:</div>
      <div class="undertaking-text">
        I hereby declare that all particulars stated in this admission application form are true, correct, and complete to the best of my knowledge and belief. I agree to abide by all the rules, regulations, code of conduct, and fee policies of the school as in force from time to time.
      </div>
    </div>

    <!-- 6. Signatures -->
    <div class="signatures-grid">
      <div class="sig-col">
        <div class="sig-line-bar"></div>
        <div class="sig-col-title">Parent / Guardian Signature</div>
        <div class="sig-col-sub">Date: ${todayFormatted}</div>
      </div>
      <div class="sig-col" style="flex: 0.8;">
        <div class="seal-box-stamp">School Seal</div>
      </div>
      <div class="sig-col">
        <div class="sig-line-bar"></div>
        <div class="sig-col-title">Admission Counselor / Clerk</div>
        <div class="sig-col-sub">Verified & Entered</div>
      </div>
      <div class="sig-col">
        <div class="sig-line-bar" style="display: flex; align-items: flex-end; justify-content: center;">
          ${brand.principalSignatureUrl ? `
            <img src="${brand.principalSignatureUrl}" style="max-height: 22px; max-width: 100px; object-fit: contain;" alt="Signature" />
          ` : ''}
        </div>
        <div class="sig-col-title">Principal / Head of Institution</div>
        <div class="sig-col-sub">Authorized Stamp</div>
      </div>
    </div>

    <!-- 7. Footer -->
    <div class="footer-note">
      Generated from DVS ERP (Digital Vidya Sarthi) • Official Student Admission Slip • Generated on ${todayDateTime}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Universal Print & PDF Sharing Handlers
 */
export async function executePrint(html, fileName = 'document.pdf', options = {}) {
  try {
    // Primary: direct Print.printAsync with html and explicit A4 page dimensions
    await Print.printAsync({
      html,
      width: options.width || 595,
      height: options.height || 842,
      ...options,
    });
    return true;
  } catch (err) {
    console.warn('Direct printAsync failed, falling back to PDF Share/Save:', err);
    // Smooth fallback directly to executeSharePdf so user never gets blocked by printer notices!
    return await executeSharePdf(html, fileName, options);
  }
}

export async function executeSharePdf(html, fileName = 'document.pdf', options = {}) {
  try {
    // 1. Generate PDF file with base64 and explicit A4 page dimensions (595 x 842 pt = 210mm x 297mm)
    const result = await Print.printToFileAsync({
      html,
      base64: true,
      width: options.width || 595,
      height: options.height || 842,
      ...options,
    });
    let shareUri = result?.uri;

    // 2. Sanitize file name
    const sanitizedBase = String(fileName || 'document')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .trim();
    const cleanFileName = sanitizedBase.toLowerCase().endsWith('.pdf')
      ? sanitizedBase
      : `${sanitizedBase}.pdf`;

    // 3. Save to scoped app directory via writeAsStringAsync (Bypasses Android Expo Go "Location isn't readable" on cache/Print/)
    try {
      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (targetDir) {
        const dir = targetDir.endsWith('/') ? targetDir : `${targetDir}/`;
        const destUri = `${dir}${cleanFileName}`;

        if (result?.base64) {
          await FileSystem.writeAsStringAsync(destUri, result.base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          shareUri = destUri;
        } else if (result?.uri) {
          try {
            const info = await FileSystem.getInfoAsync(destUri);
            if (info?.exists) {
              await FileSystem.deleteAsync(destUri, { idempotent: true });
            }
          } catch (_) {}
          await FileSystem.copyAsync({
            from: result.uri,
            to: destUri,
          });
          shareUri = destUri;
        }
      }
    } catch (fsErr) {
      console.warn('Scoped file system write notice:', fsErr);
      // Fallback to original URI if write/copy fails
    }

    // 4. Verify Sharing availability and share
    const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (isAvailable && shareUri) {
      await Sharing.shareAsync(shareUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share ${cleanFileName.replace(/_/g, ' ')}`,
      });
      return true;
    } else if (shareUri) {
      // If sharing is not available, try opening via system printer
      try {
        await Print.printAsync({ uri: shareUri });
        return true;
      } catch (printErr) {
        console.warn('URI print fallback failed:', printErr);
      }
    }

    return false;
  } catch (err) {
    console.warn('Share PDF error:', err);
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismiss')) {
      return false;
    }
    Alert.alert(
      'Export PDF Notice',
      'Could not open document share sheet. Please make sure storage permissions are enabled.'
    );
    return false;
  }
}

/**
 * ============================================================================
 * 5. STUDENT ID CARD TEMPLATE ENGINE (100% Matching Web App IdCardPrintPage)
 * ============================================================================
 */

export const createDefaultTemplate = (branch) => {
  const schoolTitle = branch?.schoolName || branch?.name || 'School Name';
  const address = branch?.address ? `${branch.address}${branch.city ? ', ' + branch.city : ''}` : '';
  const phone = branch?.phone ? `Ph: ${branch.phone}` : '';

  return {
    bgImage: '',
    orientation: 'vertical',
    elements: [
      {
        id: 'school_title',
        field: 'staticText',
        label: 'School Name',
        x: 10, y: 15,
        fontSize: 12, color: '1e3a8a', fontWeight: 'bold',
        text: schoolTitle.toUpperCase(),
        width: 190, height: 20, isPhoto: false, prefix: ''
      },
      ...(address ? [{
        id: 'school_address',
        field: 'staticText',
        label: 'Address',
        x: 10, y: 35,
        fontSize: 7, color: '475569', fontWeight: 'normal',
        text: address,
        width: 190, height: 16, isPhoto: false, prefix: ''
      }] : []),
      ...(phone ? [{
        id: 'school_phone',
        field: 'staticText',
        label: 'Contact',
        x: 10, y: 50,
        fontSize: 7, color: '64748b', fontWeight: 'normal',
        text: phone,
        width: 190, height: 14, isPhoto: false, prefix: ''
      }] : []),
      {
        id: 'std_photo',
        field: 'photo',
        label: 'Student Photo',
        x: 135, y: 75,
        fontSize: 10, color: '000000', fontWeight: 'normal',
        text: 'PHOTO',
        width: 60, height: 75, isPhoto: true, prefix: ''
      },
      {
        id: 'std_name',
        field: 'studentName',
        label: 'Student Name',
        x: 15, y: 80,
        fontSize: 10, color: '0f172a', fontWeight: 'bold',
        text: '[Student Name]',
        width: 110, height: 18, isPhoto: false, prefix: 'Name:'
      },
      {
        id: 'std_class',
        field: 'classSection',
        label: 'Class & Section',
        x: 15, y: 105,
        fontSize: 9, color: '334155', fontWeight: 'normal',
        text: '[Class & Sec]',
        width: 110, height: 18, isPhoto: false, prefix: 'Class:'
      },
      {
        id: 'std_adm',
        field: 'admissionNo',
        label: 'Admission No',
        x: 15, y: 130,
        fontSize: 9, color: '334155', fontWeight: 'normal',
        text: '[Admission No]',
        width: 110, height: 18, isPhoto: false, prefix: 'Adm No:'
      },
      {
        id: 'std_father',
        field: 'fatherName',
        label: 'Father Name',
        x: 15, y: 155,
        fontSize: 9, color: '334155', fontWeight: 'normal',
        text: '[Father Name]',
        width: 110, height: 18, isPhoto: false, prefix: 'Father:'
      },
      {
        id: 'std_dob',
        field: 'dob',
        label: 'DOB',
        x: 15, y: 180,
        fontSize: 9, color: '334155', fontWeight: 'normal',
        text: '[Date of Birth]',
        width: 110, height: 18, isPhoto: false, prefix: 'DOB:'
      },
      {
        id: 'std_phone',
        field: 'phone',
        label: 'Phone',
        x: 15, y: 205,
        fontSize: 9, color: '334155', fontWeight: 'normal',
        text: '[Phone]',
        width: 110, height: 18, isPhoto: false, prefix: 'Phone:'
      },
      {
        id: 'std_principal',
        field: 'staticText',
        label: 'Principal Signature',
        x: 130, y: 285,
        fontSize: 8, color: '475569', fontWeight: 'bold',
        text: 'Principal Sign',
        width: 70, height: 16, isPhoto: false, prefix: ''
      }
    ]
  };
};

export const createDefaultBackTemplate = (branch) => {
  return {
    bgImage: '',
    orientation: 'vertical',
    elements: [
      {
        id: 'back_inst_title',
        field: 'staticText',
        label: 'Instructions',
        x: 15, y: 20,
        fontSize: 10, color: '1e3a8a', fontWeight: 'bold',
        text: 'INSTRUCTIONS',
        width: 180, height: 18, isPhoto: false, prefix: ''
      },
      {
        id: 'back_inst_1',
        field: 'staticText',
        label: 'Instruction 1',
        x: 15, y: 45,
        fontSize: 8, color: '334155', fontWeight: 'normal',
        text: '1. This card must be carried daily.',
        width: 180, height: 16, isPhoto: false, prefix: ''
      },
      {
        id: 'back_inst_2',
        field: 'staticText',
        label: 'Instruction 2',
        x: 15, y: 65,
        fontSize: 8, color: '334155', fontWeight: 'normal',
        text: '2. In case of loss, inform school immediately.',
        width: 180, height: 16, isPhoto: false, prefix: ''
      },
      {
        id: 'std_address',
        field: 'address',
        label: 'Address',
        x: 15, y: 95,
        fontSize: 8, color: '334155', fontWeight: 'normal',
        text: '[Residential Address]',
        width: 180, height: 30, isPhoto: false, prefix: 'Address:'
      }
    ]
  };
};

/**
 * Renders a single ID Card HTML matching Web App IdCardPrintPage.jsx
 */
function renderSingleIdCardHtml(student, rawConfig) {
  if (!rawConfig) return '';
  const config = typeof rawConfig === 'string'
    ? (() => { try { return JSON.parse(rawConfig); } catch (_) { return null; } })()
    : rawConfig;
  if (!config) return '';

  const isHorizontal = config.orientation === 'horizontal';
  const cardWidth = isHorizontal ? '85.5mm' : '53.5mm';
  const cardHeight = isHorizontal ? '53.5mm' : '85.5mm';
  const baseW = isHorizontal ? 330 : 210;
  const baseH = isHorizontal ? 210 : 330;

  const elementsHtml = (config.elements || []).map((el) => {
    let val = el.text || '';
    if (el.field === 'studentName') {
      val = student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student Name';
    }
    if (el.field === 'classSection') {
      val = `${student.className || ''}${student.sectionName ? ` - ${student.sectionName}` : ''}`;
    }
    if (el.field === 'fatherName') {
      val = student.fatherName || student.guardianName || '';
    }
    if (el.field === 'motherName') {
      val = student.motherName || '';
    }
    if (el.field === 'phone') {
      val = student.phone || student.guardianMobile || student.emergencyContact || '';
    }
    if (el.field === 'dob') {
      try {
        val = student.dateOfBirth
          ? typeof student.dateOfBirth === 'string' && student.dateOfBirth.includes('/')
            ? student.dateOfBirth
            : new Date(student.dateOfBirth).toLocaleDateString('en-IN')
          : '';
        if (val === 'Invalid Date') val = student.dateOfBirth || '';
      } catch (_) {
        val = student.dateOfBirth || '';
      }
    }
    if (el.field === 'address') {
      val = student.address || '';
    }
    if (el.field === 'admissionNo') {
      val = student.admissionNo || '';
    }
    if (el.field === 'rollNo') {
      val = student.rollNo !== undefined && student.rollNo !== null ? String(student.rollNo) : '';
    }

    const leftMm = ((el.x || 0) / baseW) * (isHorizontal ? 85.5 : 53.5);
    const topMm = ((el.y || 0) / baseH) * (isHorizontal ? 53.5 : 85.5);
    const fontSizeMm = ((el.fontSize || 10) / baseW) * (isHorizontal ? 85.5 : 53.5);
    const colorHex = String(el.color || '000000').startsWith('#') ? el.color : `#${el.color}`;
    const widthMm = el.isPhoto ? `${(((el.width || 60) / baseW) * (isHorizontal ? 85.5 : 53.5)).toFixed(2)}mm` : 'auto';
    const heightMm = el.isPhoto ? `${(((el.height || 75) / baseH) * (isHorizontal ? 53.5 : 85.5)).toFixed(2)}mm` : 'auto';

    return `
      <div style="
        position: absolute;
        left: ${leftMm.toFixed(2)}mm;
        top: ${topMm.toFixed(2)}mm;
        font-size: ${fontSizeMm.toFixed(2)}mm;
        color: ${colorHex};
        font-weight: ${el.fontWeight || 'normal'};
        width: ${widthMm};
        height: ${heightMm};
        display: flex;
        align-items: center;
        justify-content: ${el.isPhoto ? 'center' : 'flex-start'};
        white-space: nowrap;
        line-height: 1;
      ">
        ${
          el.isPhoto
            ? student.photoUrl
              ? `<img src="${student.photoUrl}" alt="student" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />`
              : `<div style="width: 100%; height: 100%; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 3mm; border: 1px dashed #cbd5e1; border-radius: 4px; color: #94a3b8;">PHOTO</div>`
            : `${el.prefix ? `<span style="margin-right: 2px;">${el.prefix}</span>` : ''}<span>${val}</span>`
        }
      </div>
    `;
  }).join('');

  return `
    <div class="id-card-render" style="
      width: ${cardWidth};
      height: ${cardHeight};
      position: relative;
      background-image: ${config.bgImage ? `url('${config.bgImage}')` : 'none'};
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      box-sizing: border-box;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      margin: 0;
      border-radius: 4px;
    ">
      ${elementsHtml}
    </div>
  `;
}

/**
 * Generates Full A4 Print HTML for single or bulk ID Cards
 * Guarantees exactly 10 cards per A4 page (2 columns x 5 rows), identical to Web App output!
 */
export function generateIdCardPrintHtml({
  students = [],
  frontConfig,
  backConfig,
  printSide = 'front', // 'front' | 'back' | 'both'
  schoolInfo = {},
}) {
  const safeFront = typeof frontConfig === 'string'
    ? (() => { try { return JSON.parse(frontConfig); } catch (_) { return null; } })()
    : frontConfig;
  const safeBack = typeof backConfig === 'string'
    ? (() => { try { return JSON.parse(backConfig); } catch (_) { return null; } })()
    : backConfig;

  const isHorizontalMode =
    (printSide === 'front' && safeFront?.orientation === 'horizontal') ||
    (printSide === 'back' && safeBack?.orientation === 'horizontal') ||
    (printSide === 'both' && (safeFront?.orientation === 'horizontal' || safeBack?.orientation === 'horizontal'));

  const allCardElements = [];
  (students || []).forEach((student) => {
    if (printSide === 'front' || printSide === 'both') {
      const cardHtml = renderSingleIdCardHtml(student, safeFront);
      if (cardHtml) allCardElements.push(cardHtml);
    }
    if (printSide === 'back' || printSide === 'both') {
      const cardHtml = renderSingleIdCardHtml(student, safeBack);
      if (cardHtml) allCardElements.push(cardHtml);
    }
  });

  // Strict 10 Cards Per A4 Page (2 x 5 grid = exactly 10 cards per A4 sheet)
  const CARDS_PER_PAGE = 10;
  const pages = [];
  for (let i = 0; i < allCardElements.length; i += CARDS_PER_PAGE) {
    pages.push(allCardElements.slice(i, i + CARDS_PER_PAGE));
  }

  const pagesHtml = pages
    .map((pageCards) => `
      <div class="a4-sheet">
        <div class="id-cards-grid">
          ${pageCards.join('')}
        </div>
      </div>
    `)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student ID Cards - ${schoolInfo.schoolName || 'School ERP'}</title>
  <style>
    @page {
      size: ${isHorizontalMode ? 'A4 portrait' : 'A4 landscape'};
      margin: 0;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .a4-sheet {
      box-sizing: border-box;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4mm 0;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
    }
    .a4-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .id-cards-grid {
      display: grid !important;
      grid-template-columns: ${isHorizontalMode ? 'repeat(2, 85.5mm)' : 'repeat(5, 53.5mm)'} !important;
      grid-template-rows: ${isHorizontalMode ? 'repeat(5, 53.5mm)' : 'repeat(2, 85.5mm)'} !important;
      gap: 1.2mm !important;
      justify-content: center !important;
      align-content: center !important;
      margin: 0 auto !important;
    }
    .id-card-render {
      margin: 0 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .a4-sheet {
        page-break-after: always !important;
        break-after: page !important;
      }
      .a4-sheet:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
  `;
}

