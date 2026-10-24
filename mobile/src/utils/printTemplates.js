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

  return {
    schoolName,
    branchName,
    address,
    phone,
    email,
    affiliationNo,
    logoUrl,
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
          <div class="emblem-circle">
            <span style="font-size: 20px;">🎓</span>
          </div>
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
      </div>

      <!-- Terms -->
      <div class="terms-note">
        • Fees once deposited will not be refunded or transferred under any circumstances.<br>
        • Computer generated fee receipt • Powered by Digital Vidya Sarthi (DVS ERP)
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
          <div class="pass-emblem">🏫</div>
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
 * Replicates AdmissionSlipDesignerPage.jsx
 */
export function generateAdmissionSlipHtml(student = {}, school = {}, config = {}) {
  const brand = getSchoolBranding(school.user, school.branch);
  const primaryColor = config.primaryColor || '#065f46'; // Forest Emerald
  const secondaryColor = config.secondaryColor || '#ecfdf5';
  const borderColor = config.borderColor || '#065f46';

  const admNo = student.admissionNo || student.admissionNumber || 'ADM-NEW';
  const admDate = student.admissionDate
    ? new Date(student.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const studentName = (student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student').toUpperCase();
  const dob = student.dob ? new Date(student.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const className = student.className || student.currentClass || '—';
  const sectionName = student.sectionName || student.currentSection || 'A';
  const rollNo = student.rollNo || '—';
  const guardian = student.guardians?.[0] || {};
  const fatherName = (guardian.name || student.fatherName || '—').toUpperCase();
  const mobile = guardian.mobile || student.mobile || student.emergencyContact || '—';
  const address = student.address || '—';
  const sessionName = student.academicYearName || school?.activeAcademicYearName || '2026-27';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admission_Slip_${studentName}_${admNo}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 8px;
      background: #ffffff;
      font-size: 12px;
    }
    .adm-container {
      border: 2px solid ${borderColor};
      border-radius: 8px;
      padding: 20px;
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header {
      text-align: center;
      border-bottom: 2.5px double ${borderColor};
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .school-name {
      font-size: 22px;
      font-weight: 900;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0 0 3px 0;
      line-height: 1.15;
    }
    .subtitle {
      font-size: 12px;
      color: #334155;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .address-line {
      font-size: 10.5px;
      color: #475569;
      margin-bottom: 6px;
    }
    .slip-badge {
      display: inline-block;
      background: ${primaryColor};
      color: #ffffff;
      padding: 3px 16px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .meta-bar {
      margin-bottom: 12px;
      padding: 6px 12px;
      background: ${secondaryColor};
      border-radius: 6px;
      border: 1.5px solid ${borderColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-item { flex: 1; }
    .meta-label {
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
    }
    .meta-val {
      font-size: 13px;
      font-weight: 800;
      color: ${primaryColor};
    }
    .section-title {
      background: ${secondaryColor};
      border-left: 3.5px solid ${primaryColor};
      padding: 4px 10px;
      border-radius: 0 4px 4px 0;
      font-weight: 800;
      font-size: 11px;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      row-gap: 6px;
      column-gap: 16px;
      margin-bottom: 12px;
    }
    .d-label {
      font-size: 9.5px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 1px;
    }
    .d-val {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .sigs-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      padding-top: 10px;
    }
    .sig-col {
      text-align: center;
      flex: 1;
    }
    .sig-line {
      height: 30px;
      border-bottom: 1px solid #475569;
      margin-bottom: 4px;
    }
    .sig-text {
      font-size: 10px;
      font-weight: 700;
      color: #1e293b;
    }
    .seal-box {
      width: 80px;
      height: 52px;
      border: 1.5px dashed #94a3b8;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
    }
    .footer {
      margin-top: 14px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="adm-container">
    <div class="header">
      <h1 class="school-name">${brand.schoolName}</h1>
      <div class="subtitle">${brand.branchName} • Affiliation No: ${brand.affiliationNo}</div>
      <div class="address-line">Address: ${brand.address} | Contact: ${brand.phone} | Email: ${brand.email}</div>
      <div class="slip-badge">Student Admission & Registration Slip</div>
    </div>

    <div class="meta-bar">
      <div class="meta-item">
        <div class="meta-label">Scholar / Adm No</div>
        <div class="meta-val">${admNo}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Admission Date</div>
        <div class="meta-val" style="color: #0f172a;">${admDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Academic Session</div>
        <div class="meta-val">${sessionName}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Status</div>
        <div class="meta-val" style="color: #16a34a;">CONFIRMED</div>
      </div>
    </div>

    <div class="section-title">1. Student Personal & Demographic Profile</div>
    <div style="display: flex; gap: 14px; margin-bottom: 12px; align-items: flex-start;">
      <div class="detail-grid" style="flex: 1; margin-bottom: 0;">
        <div><div class="d-label">Student Full Name:</div><div class="d-val">${studentName}</div></div>
        <div><div class="d-label">Date of Birth (DOB):</div><div class="d-val">${dob}</div></div>
        <div><div class="d-label">Gender:</div><div class="d-val">${student.gender || '—'}</div></div>
        <div><div class="d-label">Blood Group:</div><div class="d-val">${student.bloodGroup || '—'}</div></div>
        <div><div class="d-label">Aadhaar Card No:</div><div class="d-val">${student.aadhaarNo || '—'}</div></div>
        <div><div class="d-label">Category / Religion:</div><div class="d-val">${student.category || 'General'}</div></div>
      </div>
      <div style="display: flex; gap: 8px;">
        ${(student.photoUrl || student.photoBase64) ? `
          <div style="text-align: center;">
            <img src="${student.photoUrl || student.photoBase64}" style="width: 78px; height: 94px; object-fit: cover; border-radius: 4px; border: 1.5px solid ${primaryColor};" />
            <div style="font-size: 8px; color: ${primaryColor}; font-weight: 700; margin-top: 2px;">Student Photo</div>
          </div>
        ` : `
          <div style="width: 78px; height: 94px; border: 1.5px dashed #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8.5px; color: #64748b; background: #fafafa; flex-shrink: 0; padding: 4px;">
            Affix Student<br>Photo
          </div>
        `}
        <div style="width: 78px; height: 94px; border: 1.5px dashed #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8.5px; color: #64748b; background: #fafafa; flex-shrink: 0; padding: 4px;">
          Affix Father<br>Photo
        </div>
        <div style="width: 78px; height: 94px; border: 1.5px dashed #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8.5px; color: #64748b; background: #fafafa; flex-shrink: 0; padding: 4px;">
          Affix Mother<br>Photo
        </div>
      </div>
    </div>

    <div class="section-title">2. Academic Enrollment & Class Allocation</div>
    <div class="detail-grid">
      <div><div class="d-label">Admitted to Class:</div><div class="d-val" style="color: ${primaryColor}; font-weight: 800;">${className}</div></div>
      <div><div class="d-label">Allocated Section:</div><div class="d-val">${sectionName}</div></div>
      <div><div class="d-label">Assigned Roll No:</div><div class="d-val">${rollNo}</div></div>
      <div><div class="d-label">Enrollment Status:</div><div class="d-val" style="color: #16a34a;">Active Regular Student</div></div>
    </div>

    <div class="section-title">3. Parent & Guardian Contact Information</div>
    <div class="detail-grid">
      <div><div class="d-label">Father / Guardian Name:</div><div class="d-val">${fatherName}</div></div>
      <div><div class="d-label">Primary Mobile:</div><div class="d-val">${mobile}</div></div>
      <div style="grid-column: span 2;"><div class="d-label">Residential Address:</div><div class="d-val">${address}</div></div>
    </div>

    <div class="section-title">4. Documents Verification Checklist</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 10px; font-size: 10px;">
      <div>☑ 1. Date of Birth Certificate (Birth Certificate)</div>
      <div>☑ 2. Student & Parents' Aadhaar Cards (Photocopy)</div>
      <div>☑ 3. Transfer Certificate (TC) from Previous School</div>
      <div>☑ 4. Previous Class Progress Report / Marksheet</div>
      <div>☑ 5. 4 Passport-size Photographs of Student</div>
      <div>☑ 6. Valid Address Proof (Electricity Bill / Voter ID)</div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 10px; font-size: 9.5px; color: #475569; line-height: 1.35;">
      <b>Parent Undertaking & Declaration:</b> I hereby certify that the information supplied above is true and correct. I promise to abide by all the school rules, fee payment schedules, and educational discipline guidelines of the institution.
    </div>

    <div class="sigs-row">
      <div class="sig-col" style="padding-right: 8px;">
        <div class="sig-line"></div>
        <div class="sig-text">Student Signature</div>
      </div>
      <div class="sig-col" style="padding: 0 8px;">
        <div class="sig-line"></div>
        <div class="sig-text">Parent / Guardian Sign</div>
      </div>
      <div class="sig-col" style="padding: 0 8px;">
        <div class="sig-line"></div>
        <div class="sig-text">Admission Incharge</div>
      </div>
      <div style="flex-shrink: 0; padding-left: 8px;">
        <div class="seal-box">OFFICIAL<br>PRINCIPAL / SEAL</div>
      </div>
    </div>

    <div class="footer">
      Computer Generated Student Admission & Registration Form • Digital Vidya Sarthi (DVS ERP)
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Universal Print & PDF Sharing Handlers
 */
export async function executePrint(html) {
  try {
    // Primary: direct Print.printAsync with html
    await Print.printAsync({ html });
    return true;
  } catch (err) {
    console.warn('Direct printAsync failed, trying fallback:', err);
    try {
      // Fallback 1: generate PDF first, then pass local uri to printAsync
      const file = await Print.printToFileAsync({ html });
      if (file?.uri) {
        try {
          await Print.printAsync({ uri: file.uri });
          return true;
        } catch (uriErr) {
          console.warn('URI printAsync failed, opening system Share/Print dialog:', uriErr);
          const isShareAvail = await Sharing.isAvailableAsync().catch(() => false);
          if (isShareAvail) {
            await Sharing.shareAsync(file.uri, {
              UTI: '.pdf',
              mimeType: 'application/pdf',
              dialogTitle: 'Print or Save Document (PDF)',
            });
            return true;
          }
        }
      }
    } catch (fallbackErr) {
      console.warn('Print fallback error:', fallbackErr);
    }

    Alert.alert(
      'Printer Notice',
      'Unable to connect to printer directly. You can use the "Share PDF" button to print or save the document as PDF.'
    );
    return false;
  }
}

export async function executeSharePdf(html, fileName = 'document.pdf') {
  try {
    // 1. Generate PDF with Base64 output
    const result = await Print.printToFileAsync({ html, base64: true });
    let shareUri = result?.uri;

    // 2. Sanitize file name
    const sanitizedBase = String(fileName || 'document')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .trim();
    const cleanFileName = sanitizedBase.toLowerCase().endsWith('.pdf')
      ? sanitizedBase
      : `${sanitizedBase}.pdf`;

    // 3. Save to scoped app directory (Fixes Android Expo Go "Not allowed to read file under given URL")
    try {
      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (targetDir && result?.base64) {
        const destUri = `${targetDir}${cleanFileName}`;
        await FileSystem.writeAsStringAsync(destUri, result.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        shareUri = destUri;
      } else if (targetDir && result?.uri) {
        const destUri = `${targetDir}${cleanFileName}`;
        await FileSystem.copyAsync({
          from: result.uri,
          to: destUri,
        });
        shareUri = destUri;
      }
    } catch (fsErr) {
      console.warn('Scoped file system write notice:', fsErr);
      // Fallback to original URI if copy fails
    }

    // 4. Verify Sharing availability and share
    const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (isAvailable && shareUri) {
      await Sharing.shareAsync(shareUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share ${cleanFileName}`,
      });
      return true;
    } else {
      // Direct fallback to Print dialog where user can tap "Save as PDF"
      Alert.alert(
        'Save as PDF',
        'Direct file sharing is unavailable. Opening print dialog where you can choose "Save as PDF".',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Print / Save PDF', onPress: () => executePrint(html) }
        ]
      );
      return false;
    }
  } catch (err) {
    console.warn('Share PDF error:', err);
    // If sharing dialog fails on this device/ROM, offer fallback to Print / Save as PDF
    Alert.alert(
      'PDF Export',
      'Would you like to open the Print dialog to Save as PDF or Print directly?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save as PDF / Print', onPress: () => executePrint(html) }
      ]
    );
    return false;
  }
}
