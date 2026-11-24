import React, { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { numberToIndianWords } from '../../fees/utils/numberToWords';

export const SalarySlipModal = ({ visible, onHide, payroll }) => {
  const printRef = useRef(null);

  if (!payroll) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
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
              margin: 12mm 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 11.5px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            .slip-card {
              border: 1.5px solid #0f172a;
              border-radius: 6px;
              padding: 18px 22px;
              position: relative;
            }
            .school-header {
              text-align: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 12px;
            }
            .school-title {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: 0.5px;
              margin: 0 0 3px 0;
              text-transform: uppercase;
            }
            .school-sub {
              font-size: 11px;
              color: #475569;
              margin: 2px 0;
            }
            .slip-title-bar {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 6px 12px;
              border-radius: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 14px;
              font-weight: 700;
            }
            .slip-title-bar .title {
              font-size: 13px;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px 14px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 10px 14px;
              margin-bottom: 14px;
            }
            .detail-item {
              display: flex;
              flex-direction: column;
            }
            .detail-item .lbl {
              font-size: 9.5px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 1px;
            }
            .detail-item .val {
              font-size: 11.5px;
              font-weight: 600;
              color: #0f172a;
            }
            .salary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            .salary-table th {
              background: #e2e8f0;
              color: #0f172a;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 6px 10px;
              border: 1px solid #cbd5e1;
            }
            .salary-table td {
              padding: 5px 10px;
              border: 1px solid #e2e8f0;
              font-size: 11px;
            }
            .salary-table .subtotal-row {
              background: #f1f5f9;
              font-weight: 700;
            }
            .text-right {
              text-align: right;
            }
            .net-box {
              background: #ecfdf5;
              border: 1.5px solid #10b981;
              border-radius: 4px;
              padding: 10px 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 14px;
            }
            .net-left .net-lbl {
              font-size: 10px;
              font-weight: 700;
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
              font-size: 18px;
              font-weight: 800;
              color: #065f46;
            }
            .payment-info-bar {
              display: flex;
              justify-content: space-between;
              background: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 4px;
              padding: 8px 12px;
              margin-bottom: 24px;
              font-size: 10.5px;
            }
            .signatures-box {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 36px;
              text-align: center;
            }
            .sig-line {
              border-top: 1px solid #475569;
              padding-top: 6px;
              font-weight: 600;
              font-size: 10.5px;
              color: #334155;
            }
            .footer-note {
              margin-top: 24px;
              padding-top: 8px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              font-size: 9.5px;
              color: #94a3b8;
            }
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
    }, 300);
  };

  const handleWhatsApp = () => {
    const mobile = payroll.mobile?.replace(/\D/g, '') || '';
    if (!mobile) {
      alert('Employee mobile number not available');
      return;
    }
    const cleanMobile = mobile.startsWith('91') ? mobile : `91${mobile}`;
    const text = encodeURIComponent(
      `*SALARY SLIP - DELHI PUBLIC SCHOOL*\n` +
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
      <div className="bg-white p-4 border-round-lg shadow-2 border-1 surface-border" ref={printRef}>
        {/* Printable Card Container */}
        <div className="slip-card">
          {/* Header */}
          <div className="school-header text-center pb-2 mb-2 border-bottom-2 border-900">
            <h1 className="school-title text-2xl font-extrabold text-900 m-0 uppercase letter-spacing-1">
              {payroll.schoolName || 'DELHI PUBLIC SCHOOL'}
            </h1>
            <div className="school-sub text-xs text-600 mt-1">
              {payroll.schoolAddress || '123 Knowledge Park, Sector 4, New Delhi, Delhi, 110001'}
            </div>
            <div className="school-sub text-xs text-600">
              Affiliation No: <b>{payroll.affiliationNo || 'CBSE/2026/0912'}</b> | Contact:{' '}
              {payroll.schoolContact || '4564564564'} | Email: {payroll.schoolEmail || 'main@dps.edu.in'}
            </div>
          </div>

          {/* Slip Title Bar */}
          <div className="slip-title-bar surface-100 border-1 border-300 p-2 border-round flex justify-content-between align-items-center mb-3">
            <span className="title font-bold text-sm uppercase text-900">
              SALARY SLIP FOR THE MONTH OF {payroll.monthName?.toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-700">
              Slip No: <span className="font-bold text-900">{payroll.salarySlipNo}</span>
            </span>
          </div>

          {/* Employee Particulars Grid */}
          <div className="details-grid surface-50 border-1 surface-border border-round p-3 mb-3 grid m-0">
            <div className="col-12 sm:col-3 p-1 detail-item">
              <span className="lbl text-500 font-bold uppercase text-xs">Employee ID / Code</span>
              <span className="val font-semibold text-900 text-sm">{payroll.employeeCode}</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item">
              <span className="lbl text-500 font-bold uppercase text-xs">Employee Name</span>
              <span className="val font-bold text-primary text-sm">{payroll.employeeName}</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item">
              <span className="lbl text-500 font-bold uppercase text-xs">Designation</span>
              <span className="val font-semibold text-900 text-sm">{payroll.designation || 'Staff Member'}</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item">
              <span className="lbl text-500 font-bold uppercase text-xs">Department</span>
              <span className="val font-semibold text-900 text-sm">{payroll.department || 'Academics'}</span>
            </div>

            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">Bank Name</span>
              <span className="val font-medium text-800 text-xs">{payroll.bankName || 'State Bank of India'}</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">Account No</span>
              <span className="val font-medium text-800 text-xs">{payroll.accountNo ? `••••${payroll.accountNo.slice(-4)}` : 'N/A'}</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">IFSC Code</span>
              <span className="val font-medium text-800 text-xs">{payroll.ifscCode || 'SBIN0001234'}</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">PAN / Aadhaar</span>
              <span className="val font-medium text-800 text-xs">{payroll.panNo || 'ABCDE1234F'}</span>
            </div>

            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">Total Month Days</span>
              <span className="val font-bold text-900 text-xs">{payroll.totalWorkingDays} Days</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">Present / Paid Days</span>
              <span className="val font-bold text-green-700 text-xs">{payroll.presentDays} Days</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">Paid Leaves</span>
              <span className="val font-semibold text-700 text-xs">{payroll.paidLeaves || 0} Days</span>
            </div>
            <div className="col-12 sm:col-3 p-1 detail-item mt-1">
              <span className="lbl text-500 font-bold uppercase text-xs">Loss of Pay (LOP)</span>
              <span className="val font-bold text-red-600 text-xs">{payroll.unpaidLeaves || 0} Days</span>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="grid m-0 mb-3 border-1 border-300 border-round overflow-hidden">
            {/* Earnings Column */}
            <div className="col-12 sm:col-6 p-0 border-right-1 border-300">
              <div className="bg-primary-50 p-2 font-bold text-xs uppercase text-primary border-bottom-1 border-300 flex justify-content-between">
                <span>Earnings Particulars</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-2 flex flex-column gap-1.5 text-xs">
                <div className="flex justify-content-between">
                  <span className="text-700">Basic Salary</span>
                  <span className="font-semibold text-900">₹{payroll.basicSalary?.toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Dearness Allowance (DA)</span>
                  <span className="font-semibold text-900">₹{(payroll.da || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">House Rent Allowance (HRA)</span>
                  <span className="font-semibold text-900">₹{(payroll.hra || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Conveyance Allowance</span>
                  <span className="font-semibold text-900">₹{(payroll.conveyance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Medical Allowance</span>
                  <span className="font-semibold text-900">₹{(payroll.medicalAllowance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Special Allowance</span>
                  <span className="font-semibold text-900">₹{(payroll.specialAllowance || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-blue-50 p-2 font-bold text-xs uppercase border-top-1 border-300 flex justify-content-between text-blue-900">
                <span>Gross Earnings (A)</span>
                <span>₹{payroll.grossSalary?.toFixed(2)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="col-12 sm:col-6 p-0">
              <div className="bg-red-50 p-2 font-bold text-xs uppercase text-red-800 border-bottom-1 border-300 flex justify-content-between">
                <span>Deductions Particulars</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-2 flex flex-column gap-1.5 text-xs">
                <div className="flex justify-content-between">
                  <span className="text-700">Provident Fund (PF)</span>
                  <span className="font-semibold text-900">₹{(payroll.pfDeduction || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Employee State Insurance (ESI)</span>
                  <span className="font-semibold text-900">₹{(payroll.esiDeduction || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Professional Tax (PT)</span>
                  <span className="font-semibold text-900">₹{(payroll.professionalTax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">TDS / Income Tax</span>
                  <span className="font-semibold text-900">₹{(payroll.tdsDeduction || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Advance / Loan Deduction</span>
                  <span className="font-semibold text-900">₹{(payroll.loanDeduction || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-700">Loss of Pay (LOP) Deduction</span>
                  <span className="font-semibold text-red-600">₹{(payroll.leaveDeduction || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-orange-50 p-2 font-bold text-xs uppercase border-top-1 border-300 flex justify-content-between text-orange-900">
                <span>Total Deductions (B)</span>
                <span>₹{payroll.totalDeductions?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div className="net-box bg-green-50 border-1 border-green-500 border-round p-3 flex justify-content-between align-items-center mb-3">
            <div className="net-left">
              <div className="net-lbl font-bold text-xs uppercase text-green-800">
                Net Take-Home Salary (A - B)
              </div>
              <div className="net-words text-xs text-green-900 font-medium italic mt-1">
                Rupees {netWords} Only
              </div>
            </div>
            <div className="net-right text-2xl font-extrabold text-green-800">
              ₹{payroll.netSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Payment & Disbursement Info */}
          <div className="payment-info-bar surface-100 border-1 border-dashed surface-border border-round p-2 flex justify-content-between text-xs text-700 mb-4">
            <div>
              Status:{' '}
              <span className={`font-bold ${payroll.paymentStatus === 'Paid' ? 'text-green-700' : 'text-orange-700'}`}>
                {payroll.paymentStatus?.toUpperCase() || 'PENDING'}
              </span>
            </div>
            <div>
              Mode: <span className="font-bold text-900">{payroll.paymentMode || 'Direct Bank Transfer'}</span>
            </div>
            <div>
              Payment Date:{' '}
              <span className="font-bold text-900">
                {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString('en-IN') : 'Not Yet Paid'}
              </span>
            </div>
            <div>
              Ref / UTR:{' '}
              <span className="font-bold text-900">{payroll.transactionReference || 'N/A'}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="signatures-box grid text-center mt-5 pt-3">
            <div className="col-4">
              <div className="sig-line border-top-1 border-500 pt-2 font-bold text-xs text-700">
                Employee Signature
              </div>
            </div>
            <div className="col-4">
              <div className="sig-line border-top-1 border-500 pt-2 font-bold text-xs text-700">
                Accounts Officer / Cashier
              </div>
            </div>
            <div className="col-4">
              <div className="sig-line border-top-1 border-500 pt-2 font-bold text-xs text-700">
                Principal / Authorized Signatory
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="footer-note text-center text-xs text-400 mt-4 pt-2 border-top-1 surface-border">
            This is a computer-generated salary slip and does not require a physical stamp. • Powered by Digital Vidya Sarthi (DVS ERP)
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SalarySlipModal;
