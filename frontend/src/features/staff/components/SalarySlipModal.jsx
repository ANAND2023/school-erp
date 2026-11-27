import React, { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { numberToIndianWords } from '../../fees/utils/numberToWords';
import { useAuthStore } from '../../../store/authStore';

// Circular School Emblem Fallback SVG
const SchoolEmblem = ({ size = 56, primaryColor = '#1e3a8a', secondaryColor = '#eff6ff' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="47" stroke={primaryColor} strokeWidth="3.5" fill={secondaryColor} />
    <circle cx="50" cy="50" r="42" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3 2" />
    <circle cx="50" cy="46" r="28" fill={primaryColor} />
    <polygon points="50,26 53,35 63,35 55,41 58,50 50,44 42,50 45,41 37,35 47,35" fill="#fef08a" />
    <path d="M36 52 Q44 48 50 52 Q56 48 64 52 L64 64 Q56 60 50 64 Q44 60 36 64 Z" fill="#ffffff" stroke={primaryColor} strokeWidth="0.8" />
    <line x1="50" y1="52" x2="50" y2="64" stroke={primaryColor} strokeWidth="1.2" />
    <path d="M22 45 Q18 56 26 66 M78 45 Q82 56 74 66" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M22 72 Q50 82 78 72 L74 80 Q50 90 26 80 Z" fill="#b45309" />
    <text x="50" y="79" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="0.8" fontFamily="Arial, sans-serif">
      EDUCATION
    </text>
  </svg>
);

const SLIP_CSS = `
  .slip-card {
    border: 1.5px solid #0f172a;
    border-radius: 6px;
    padding: 16px 20px;
    position: relative;
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.35;
  }
  .school-header-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .school-logo-box {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .school-logo-img {
    width: 62px;
    height: 62px;
    max-width: 62px;
    max-height: 62px;
    object-fit: contain;
    display: block;
  }
  .school-header-content {
    text-align: center;
    flex: 1;
  }
  .school-title {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: 0.5px;
    margin: 0;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .school-campus-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    color: #1e3a8a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 1px;
  }
  .school-sub {
    font-size: 10.5px;
    color: #475569;
    margin: 2px 0 0 0;
  }
  .slip-title-bar {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    padding: 6px 12px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .slip-title-bar .title {
    font-size: 12.5px;
    color: #0f172a;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .slip-title-bar .slip-no {
    font-size: 11.5px;
    color: #334155;
    font-weight: 600;
  }
  .details-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 12px;
  }
  .detail-item {
    display: flex;
    flex-direction: column;
  }
  .detail-item .lbl {
    font-size: 9.5px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 1px;
  }
  .detail-item .val {
    font-size: 11.5px;
    font-weight: 600;
    color: #0f172a;
  }
  .breakdown-container {
    display: flex;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .breakdown-column {
    width: 50%;
    display: flex;
    flex-direction: column;
  }
  .breakdown-column.left {
    border-right: 1px solid #cbd5e1;
  }
  .breakdown-header {
    padding: 6px 10px;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #cbd5e1;
  }
  .breakdown-header.earnings {
    background: #eff6ff;
    color: #1e40af;
  }
  .breakdown-header.deductions {
    background: #fef2f2;
    color: #991b1b;
  }
  .breakdown-rows {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  .breakdown-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }
  .breakdown-row .lbl {
    color: #334155;
  }
  .breakdown-row .amt {
    font-weight: 600;
    color: #0f172a;
  }
  .breakdown-total {
    padding: 6px 10px;
    font-weight: 800;
    font-size: 11.5px;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #cbd5e1;
  }
  .breakdown-total.earnings {
    background: #f0f9ff;
    color: #0c4a6e;
  }
  .breakdown-total.deductions {
    background: #fff7ed;
    color: #9a3412;
  }
  .net-box {
    background: #ecfdf5;
    border: 1.5px solid #10b981;
    border-radius: 4px;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .net-left .net-lbl {
    font-size: 10px;
    font-weight: 800;
    color: #047857;
    text-transform: uppercase;
  }
  .net-left .net-words {
    font-size: 11px;
    font-weight: 600;
    color: #065f46;
    font-style: italic;
    margin-top: 2px;
  }
  .net-right {
    font-size: 19px;
    font-weight: 800;
    color: #065f46;
  }
  .payment-info-bar {
    display: flex;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 4px;
    padding: 6px 10px;
    margin-bottom: 18px;
    font-size: 10.5px;
  }
  .signatures-box {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 28px;
    text-align: center;
  }
  .sig-line {
    border-top: 1px solid #64748b;
    padding-top: 4px;
    font-weight: 600;
    font-size: 10.5px;
    color: #334155;
  }
  .footer-note {
    margin-top: 16px;
    padding-top: 6px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 9.5px;
    color: #94a3b8;
  }
`;

export const SalarySlipModal = ({ visible, onHide, payroll }) => {
  const printRef = useRef(null);
  const user = useAuthStore((state) => state.user);

  if (!payroll) return null;

  // Resolve School & Letterhead Details with robust fallback to logged-in user's school profile
  const resolvedSchoolName = (payroll.schoolName && !payroll.schoolName.toLowerCase().includes('campus'))
    ? payroll.schoolName
    : (user?.schoolName || 'DELHI PUBLIC SCHOOL');

  const resolvedCampusName = payroll.campusName || user?.branchName || 'Main Campus';

  const resolvedSchoolAddress = payroll.schoolAddress || user?.schoolAddress || '123 Knowledge Park, Sector 4, New Delhi, Delhi, 110001';

  const resolvedSchoolContact = [payroll.schoolContact || user?.schoolPhone, user?.schoolAlternatePhone].filter(Boolean).join(', ') || '9876543210';

  const resolvedSchoolEmail = payroll.schoolEmail || user?.schoolEmail || 'info@dps.edu.in';

  const resolvedAffiliationNo = payroll.affiliationNo || 'CBSE/2026/0912';

  const resolvedLogoUrl = payroll.schoolLogoUrl || user?.schoolLogoUrl || null;

  const resolvedWebsite = payroll.website || 'https://dps.edu.in';

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      alert('Please allow popups to print salary slip');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Slip - ${payroll.employeeName || 'Staff'} - ${payroll.monthName || ''}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            body {
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            ${SLIP_CSS}
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleWhatsApp = () => {
    const mobile = payroll.mobile?.replace(/\D/g, '') || '';
    if (!mobile) {
      alert('Employee mobile number not available');
      return;
    }
    const cleanMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;
    const text = encodeURIComponent(
      `*SALARY SLIP - ${resolvedSchoolName.toUpperCase()}*\n` +
      `Campus: ${resolvedCampusName}\n` +
      `--------------------------------\n` +
      `Employee: *${payroll.employeeName}* (${payroll.employeeCode})\n` +
      `Designation: ${payroll.designation || 'Staff'}\n` +
      `Month: *${payroll.monthName}*\n` +
      `Slip No: ${payroll.salarySlipNo}\n` +
      `--------------------------------\n` +
      `Gross Salary: ₹${payroll.grossSalary?.toLocaleString('en-IN')}\n` +
      `Total Deductions: ₹${payroll.totalDeductions?.toLocaleString('en-IN')}\n` +
      `*Net Payable: ₹${payroll.netSalary?.toLocaleString('en-IN')}*\n` +
      `Status: *${payroll.paymentStatus?.toUpperCase()}*\n` +
      (payroll.paymentDate ? `Payment Date: ${new Date(payroll.paymentDate).toLocaleDateString('en-IN')}\n` : '') +
      `--------------------------------\n` +
      `Digital Vidya Sarthi (DVS ERP)`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanMobile}&text=${text}`, '_blank');
  };

  const netWords = payroll.netSalary ? numberToIndianWords(Math.round(payroll.netSalary)) : 'Zero';

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center justify-content-between w-full pr-4">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-receipt text-primary text-xl" />
            <span className="font-bold text-lg text-900">Salary Slip - {payroll.salarySlipNo}</span>
            <Tag
              value={payroll.paymentStatus || 'Pending'}
              severity={payroll.paymentStatus === 'Paid' ? 'success' : 'warning'}
              className="text-xs px-2 py-0.5 ml-2"
            />
          </div>
          <div className="flex align-items-center gap-2">
            <Button
              type="button"
              icon="pi pi-whatsapp"
              label="Share"
              className="p-button-success p-button-sm p-button-outlined"
              onClick={handleWhatsApp}
              tooltip="Send payslip summary to staff WhatsApp"
            />
            <Button
              type="button"
              icon="pi pi-print"
              label="Print Payslip"
              className="p-button-primary p-button-sm"
              onClick={handlePrint}
            />
          </div>
        </div>
      }
      style={{ width: '920px', maxWidth: '96vw' }}
      modal
      contentClassName="p-3 surface-ground"
    >
      <div className="bg-white p-3 border-round-lg shadow-2 border-1 surface-border" ref={printRef}>
        <style>{SLIP_CSS}</style>

        {/* Printable Card Container */}
        <div className="slip-card">
          {/* School Letterhead Header */}
          <div className="school-header-wrap">
            <div className="school-logo-box">
              {resolvedLogoUrl ? (
                <img
                  src={resolvedLogoUrl}
                  alt="School Logo"
                  className="school-logo-img"
                  style={{ width: '62px', height: '62px', maxWidth: '62px', maxHeight: '62px', objectFit: 'contain' }}
                />
              ) : (
                <SchoolEmblem size={56} primaryColor="#1e3a8a" secondaryColor="#eff6ff" />
              )}
            </div>
            <div className="school-header-content">
              <h1 className="school-title">
                {resolvedSchoolName}
              </h1>
              {resolvedCampusName && (
                <div className="school-campus-badge">
                  ({resolvedCampusName})
                </div>
              )}
              <div className="school-sub">
                {resolvedSchoolAddress}
              </div>
              <div className="school-sub">
                {resolvedAffiliationNo && <span>Affiliation No: <b>{resolvedAffiliationNo}</b> | </span>}
                Contact: <b>{resolvedSchoolContact}</b> | Email: <b>{resolvedSchoolEmail}</b>
                {resolvedWebsite && <span> | Web: <b>{resolvedWebsite}</b></span>}
              </div>
            </div>
          </div>

          {/* Slip Title Bar */}
          <div className="slip-title-bar">
            <span className="title">
              SALARY SLIP FOR THE MONTH OF {payroll.monthName?.toUpperCase()}
            </span>
            <span className="slip-no">
              Slip No: <b style={{ color: '#0f172a' }}>{payroll.salarySlipNo}</b>
            </span>
          </div>

          {/* Employee Particulars Grid */}
          <div className="details-grid">
            <div className="detail-item">
              <span className="lbl">Employee ID / Code</span>
              <span className="val" style={{ fontFamily: 'monospace', fontWeight: 800 }}>{payroll.employeeCode}</span>
            </div>
            <div className="detail-item">
              <span className="lbl">Employee Name</span>
              <span className="val" style={{ color: '#1e40af', fontWeight: 700 }}>{payroll.employeeName}</span>
            </div>
            <div className="detail-item">
              <span className="lbl">Designation</span>
              <span className="val">{payroll.designation || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="lbl">Department</span>
              <span className="val">{payroll.department || '-'}</span>
            </div>

            <div className="detail-item">
              <span className="lbl">Bank Name</span>
              <span className="val">{payroll.bankName || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="lbl">Account No</span>
              <span className="val">{payroll.accountNo ? `••••${payroll.accountNo.slice(-4)}` : '-'}</span>
            </div>
            <div className="detail-item">
              <span className="lbl">IFSC Code</span>
              <span className="val">{payroll.ifscCode || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="lbl">PAN / Aadhaar</span>
              <span className="val">{payroll.panNo || payroll.aadhaarNo || '-'}</span>
            </div>

            <div className="detail-item">
              <span className="lbl">Total Month Days</span>
              <span className="val">{payroll.totalWorkingDays} Days</span>
            </div>
            <div className="detail-item">
              <span className="lbl">Present / Paid Days</span>
              <span className="val" style={{ color: '#15803d', fontWeight: 700 }}>{payroll.presentDays} Days</span>
            </div>
            <div className="detail-item">
              <span className="lbl">Paid Leaves</span>
              <span className="val">{payroll.paidLeaves || 0} Days</span>
            </div>
            <div className="detail-item">
              <span className="lbl">Loss of Pay (LOP)</span>
              <span className="val" style={{ color: '#dc2626', fontWeight: 700 }}>{payroll.unpaidLeaves || 0} Days</span>
            </div>
          </div>

          {/* Earnings vs Deductions Breakdown Columns */}
          <div className="breakdown-container">
            {/* Earnings Column */}
            <div className="breakdown-column left">
              <div className="breakdown-header earnings">
                <span>Earnings Particulars</span>
                <span>Amount (₹)</span>
              </div>
              <div className="breakdown-rows">
                <div className="breakdown-row">
                  <span className="lbl">Monthly Salary (Basic)</span>
                  <span className="amt">₹{payroll.basicSalary?.toFixed(2)}</span>
                </div>
                {payroll.specialAllowance > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Additional Allowance / Bonus</span>
                    <span className="amt">₹{payroll.specialAllowance.toFixed(2)}</span>
                  </div>
                )}
                {payroll.da > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Dearness Allowance (DA)</span>
                    <span className="amt">₹{payroll.da.toFixed(2)}</span>
                  </div>
                )}
                {payroll.hra > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">House Rent Allowance (HRA)</span>
                    <span className="amt">₹{payroll.hra.toFixed(2)}</span>
                  </div>
                )}
                {payroll.conveyance > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Conveyance Allowance</span>
                    <span className="amt">₹{payroll.conveyance.toFixed(2)}</span>
                  </div>
                )}
                {payroll.medicalAllowance > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Medical Allowance</span>
                    <span className="amt">₹{payroll.medicalAllowance.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="breakdown-total earnings">
                <span>Gross Earnings (A)</span>
                <span>₹{payroll.grossSalary?.toFixed(2)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="breakdown-column">
              <div className="breakdown-header deductions">
                <span>Deductions Particulars</span>
                <span>Amount (₹)</span>
              </div>
              <div className="breakdown-rows">
                {payroll.leaveDeduction > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Absent / Loss of Pay (LOP)</span>
                    <span className="amt" style={{ color: '#dc2626' }}>₹{payroll.leaveDeduction.toFixed(2)}</span>
                  </div>
                )}
                {payroll.loanDeduction > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Advance / Loan Deduction</span>
                    <span className="amt">₹{payroll.loanDeduction.toFixed(2)}</span>
                  </div>
                )}
                {payroll.pfDeduction > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Provident Fund (PF)</span>
                    <span className="amt">₹{payroll.pfDeduction.toFixed(2)}</span>
                  </div>
                )}
                {payroll.esiDeduction > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Employee State Insurance (ESI)</span>
                    <span className="amt">₹{payroll.esiDeduction.toFixed(2)}</span>
                  </div>
                )}
                {payroll.professionalTax > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">Professional Tax (PT)</span>
                    <span className="amt">₹{payroll.professionalTax.toFixed(2)}</span>
                  </div>
                )}
                {payroll.tdsDeduction > 0 && (
                  <div className="breakdown-row">
                    <span className="lbl">TDS / Income Tax</span>
                    <span className="amt">₹{payroll.tdsDeduction.toFixed(2)}</span>
                  </div>
                )}
                {(!payroll.totalDeductions || payroll.totalDeductions === 0) && (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '4px 0' }}>
                    Nil (No Deductions Applied)
                  </div>
                )}
              </div>
              <div className="breakdown-total deductions">
                <span>Total Deductions (B)</span>
                <span>₹{(payroll.totalDeductions || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div className="net-box">
            <div className="net-left">
              <div className="net-lbl">
                Net Take-Home Salary (A - B)
              </div>
              <div className="net-words">
                Rupees {netWords} Only
              </div>
            </div>
            <div className="net-right">
              ₹{payroll.netSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Payment & Disbursement Info */}
          <div className="payment-info-bar">
            <div>
              Status:{' '}
              <span style={{ fontWeight: 800, color: payroll.paymentStatus === 'Paid' ? '#15803d' : '#d97706' }}>
                {payroll.paymentStatus?.toUpperCase() || 'PENDING'}
              </span>
            </div>
            <div>
              Mode: <b style={{ color: '#0f172a' }}>{payroll.paymentMode || 'Direct Bank Transfer'}</b>
            </div>
            <div>
              Payment Date:{' '}
              <b style={{ color: '#0f172a' }}>
                {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString('en-IN') : 'Not Yet Paid'}
              </b>
            </div>
            <div>
              Ref / UTR: <b style={{ color: '#0f172a' }}>{payroll.transactionReference || 'N/A'}</b>
            </div>
          </div>

          {/* Signatures */}
          <div className="signatures-box">
            <div>
              <div className="sig-line">
                Employee Signature
              </div>
            </div>
            <div>
              <div className="sig-line">
                Accounts Officer / Cashier
              </div>
            </div>
            <div>
              <div className="sig-line">
                Principal / Authorized Signatory
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="footer-note">
            This is a computer-generated salary slip and does not require a physical stamp. • Powered by Digital Vidya Sarthi (DVS ERP)
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SalarySlipModal;
