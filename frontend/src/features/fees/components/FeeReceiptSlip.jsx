import React from 'react';
import dayjs from 'dayjs';
import { numberToIndianWords, formatReceiptMonths } from '../utils/numberToWords';

// Professional, vibrant, high-contrast circular school emblem SVG
export const SchoolEmblem = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Forest Green Border */}
    <circle cx="50" cy="50" r="47" stroke="#166534" strokeWidth="3.5" fill="#f0fdf4" />
    {/* Inner Gold Dotted Ring */}
    <circle cx="50" cy="50" r="42" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3 2" />
    {/* Center Green Shield */}
    <circle cx="50" cy="46" r="28" fill="#166534" />
    {/* Gold Center Star */}
    <polygon points="50,26 53,35 63,35 55,41 58,50 50,44 42,50 45,41 37,35 47,35" fill="#fef08a" />
    {/* Open Book in White */}
    <path d="M36 52 Q44 48 50 52 Q56 48 64 52 L64 64 Q56 60 50 64 Q44 60 36 64 Z" fill="#ffffff" stroke="#166534" strokeWidth="0.8" />
    <line x1="50" y1="52" x2="50" y2="64" stroke="#166534" strokeWidth="1.2" />
    {/* Laurel Leaves left & right */}
    <path d="M22 45 Q18 56 26 66 M78 45 Q82 56 74 66" stroke="#166534" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Bottom Burnished Gold Ribbon */}
    <path d="M22 72 Q50 82 78 72 L74 80 Q50 90 26 80 Z" fill="#b45309" />
    <text x="50" y="79" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="0.8" fontFamily="Arial, sans-serif">
      EDUCATION
    </text>
  </svg>
);

/**
 * Single fee receipt copy component
 */
const SingleSlip = ({ data = {}, copyTitle = '' }) => {
  const [imageError, setImageError] = React.useState(false);

  const schoolName = data.schoolName || 'Kush Public School';
  const address = data.address || 'Plot No 999, Main road Surya\nVihar, Part 3 Sec 91';
  const contact = data.contact || data.guardianMobile || '9911360909';
  const receiptNo = data.receiptNo || 'KU7304';
  const dateFormatted = data.receiptDate ? dayjs(data.receiptDate).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');
  const studentName = (data.studentName || '').toUpperCase();
  const admNo = data.admissionNo || '';
  const className = data.className || (data.classSection ? data.classSection.split('-')[0].trim() : '');
  const fatherName = (data.fatherName || data.guardianName || '').toUpperCase();
  const paymentMode = data.paymentModeName || 'Cash';

  const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
  const monthDisplay = formatReceiptMonths(data.month, items);

  const totalPaid = Number(data.totalPaid || 0);
  const totalConcession = Number(data.totalConcession || 0);
  const totalFine = Number(data.totalFine || 0) || items.reduce((sum, item) => sum + Number(item.finePaid || 0), 0);

  // Month-scoped dues: only for the month(s) on this receipt (not the entire year)
  const itemsDuesSum = items.reduce((sum, item) => sum + Number(item.balanceCarried || 0), 0);
  const remainingDues = items.length > 0 ? itemsDuesSum : Number(data.remainingTotalDues || 0);

  // Month-scoped total fee: only for the month(s) on this receipt
  const itemsTotalFee = items.reduce(
    (sum, item) => sum + Number(item.amountPaid || 0) + Number(item.balanceCarried || 0),
    0
  );
  const totalFeeAmount = itemsTotalFee > 0 ? (itemsTotalFee + totalConcession) : (totalPaid - totalFine + remainingDues + totalConcession);

  const amountInWords = numberToIndianWords(totalPaid);
  const logoSrc = data.logoUrl || data.schoolLogo;

  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        padding: '6px 8px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#000000',
        fontSize: '11px',
        lineHeight: 1.25,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header with Emblem & School Details */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
        <div style={{ flexShrink: 0, marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logoSrc && !imageError ? (
            <img
              src={logoSrc}
              alt="School Logo"
              style={{ width: 48, height: 48, objectFit: 'contain' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <SchoolEmblem size={48} />
          )}
        </div>
        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 'bold',
              letterSpacing: '0.2px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={schoolName}
          >
            {schoolName}
          </div>
          <div style={{ fontSize: '9.5px', marginTop: '1px', whiteSpace: 'pre-line', color: '#111827', lineHeight: 1.2 }}>
            Address : {address.replace('\n', ', ')}
          </div>
          <div style={{ fontSize: '9.5px', marginTop: '1px', fontWeight: 'bold' }}>
            Contact : {contact}
          </div>
        </div>
      </div>

      {/* Shaded Banner Bar */}
      <div
        style={{
          backgroundColor: '#e5e7eb',
          border: '1px solid #000000',
          padding: '2px 6px',
          fontWeight: 'bold',
          fontSize: '11.5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3px',
          letterSpacing: '0.2px',
        }}
      >
        <span>Fee receipt :</span>
        {copyTitle && (
          <span style={{ fontSize: '10px', fontWeight: 'normal', fontStyle: 'italic', textTransform: 'uppercase' }}>
            ({copyTitle})
          </span>
        )}
      </div>

      {/* 4-Row 2-Col Student / Receipt Metadata Box */}
      <div
        style={{
          border: '1px solid #000000',
          borderBottom: 'none',
          fontSize: '10.5px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Row 1: Rec.No & Date */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000000', minHeight: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '56%',
              padding: '2px 4px',
              borderRight: '1px solid #000000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
            }}
            title={receiptNo}
          >
            <b>Rec.No.:</b> <span style={{ fontWeight: 600 }}>{receiptNo}</span>
          </div>
          <div style={{ width: '44%', padding: '2px 4px', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
            <b>Date:</b> {dateFormatted}
          </div>
        </div>

        {/* Row 2: Name & Adm No */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000000', minHeight: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '56%',
              padding: '2px 4px',
              borderRight: '1px solid #000000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
            }}
            title={studentName}
          >
            <b>Name:</b> <span style={{ fontWeight: 600 }}>{studentName}</span>
          </div>
          <div
            style={{
              width: '44%',
              padding: '2px 4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
            }}
            title={admNo}
          >
            <b>Adm No:</b> <span style={{ fontWeight: 600 }}>{admNo}</span>
          </div>
        </div>

        {/* Row 3: Class & Mode */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000000', minHeight: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '56%',
              padding: '2px 4px',
              borderRight: '1px solid #000000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
            }}
            title={className}
          >
            <b>Class:</b> <span style={{ fontWeight: 600 }}>{className}</span>
          </div>
          <div style={{ width: '44%', padding: '2px 4px', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
            <b>Mode:</b> {paymentMode}
          </div>
        </div>

        {/* Row 4: S/D. of & Month */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000000', minHeight: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '56%',
              padding: '2px 4px',
              borderRight: '1px solid #000000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
            }}
            title={fatherName}
          >
            <b>S/D. of:</b> {fatherName}
          </div>
          <div
            style={{
              width: '44%',
              padding: '2px 4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
            }}
            title={monthDisplay}
          >
            <b>Month:</b> {monthDisplay}
          </div>
        </div>
      </div>

      {/* Fee Breakdown Table with Totals */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          fontSize: '10px',
          boxSizing: 'border-box',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#ffffff' }}>
            <th
              style={{
                width: '35%',
                border: '1px solid #000000',
                padding: '2px 4px',
                textAlign: 'left',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '9.5px',
              }}
            >
              FEE HEAD
            </th>
            <th
              style={{
                width: '23%',
                border: '1px solid #000000',
                padding: '2px 4px',
                textAlign: 'left',
                fontWeight: 'bold',
                fontSize: '9.5px',
                whiteSpace: 'nowrap',
              }}
            >
              Month
            </th>
            <th
              style={{
                width: '22%',
                border: '1px solid #000000',
                padding: '2px 4px',
                textAlign: 'right',
                fontWeight: 'bold',
                fontSize: '9.5px',
              }}
            >
              AMOUNT (Rs.)
            </th>
            <th
              style={{
                width: '20%',
                border: '1px solid #000000',
                padding: '2px 4px',
                textAlign: 'right',
                fontWeight: 'bold',
                fontSize: '9.5px',
              }}
            >
              DUES
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const rowMonth = item.installmentName || (items.length === 1 ? monthDisplay : '');
            const amountVal = Number(item.amountPaid || 0);
            const dueVal = Number(item.balanceCarried || 0);

            return (
              <tr key={idx}>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '2px 4px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '9.5px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px',
                  }}
                  title={item.feeHeadName}
                >
                  {item.feeHeadName || 'FEE'}
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '2px 4px',
                    fontSize: '9.5px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '90px',
                  }}
                  title={rowMonth}
                >
                  {rowMonth}
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '2px 4px',
                    textAlign: 'right',
                    fontSize: '9.5px',
                  }}
                >
                  {amountVal.toFixed(2)}
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '2px 4px',
                    textAlign: 'right',
                    fontSize: '9.5px',
                    color: dueVal > 0 ? '#b91c1c' : '#000000',
                  }}
                >
                  {dueVal.toFixed(2)}
                </td>
              </tr>
            );
          })}

          {/* Late Fine Item Row (if fine was charged) */}
          {totalFine > 0 && (
            <tr style={{ backgroundColor: '#fff5f5' }}>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '9.5px',
                  color: '#b91c1c',
                }}
              >
                LATE FINE PENALTY
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  fontSize: '9.5px',
                  fontWeight: 600,
                }}
              >
                {monthDisplay}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  textAlign: 'right',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: '#b91c1c',
                }}
              >
                {totalFine.toFixed(2)}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  textAlign: 'right',
                  fontSize: '9.5px',
                }}
              >
                0.00
              </td>
            </tr>
          )}

          {/* Totals Section */}
          <tr>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000000',
                padding: '2px 4px',
                fontWeight: 500,
                fontSize: '10px',
              }}
            >
              Total Fee Amount.
            </td>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000000',
                padding: '2px 4px',
                textAlign: 'right',
                fontWeight: 600,
                fontSize: '10px',
              }}
            >
              ₹ {totalFeeAmount.toFixed(2)}
            </td>
          </tr>

          {totalConcession > 0 && (
            <tr>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  fontWeight: 500,
                  fontSize: '10px',
                }}
              >
                Concession Amount
              </td>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: '10px',
                }}
              >
                ₹ {totalConcession.toFixed(2)}
              </td>
            </tr>
          )}

          {totalFine > 0 && (
            <tr>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  fontWeight: 600,
                  fontSize: '10px',
                  color: '#b91c1c',
                }}
              >
                Late Fine
              </td>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '2px 4px',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '10px',
                  color: '#b91c1c',
                }}
              >
                + ₹ {totalFine.toFixed(2)}
              </td>
            </tr>
          )}

          <tr>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000000',
                padding: '2px 4px',
                fontWeight: 500,
                fontSize: '10px',
              }}
            >
              Paid Amount
            </td>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000000',
                padding: '2px 4px',
                textAlign: 'right',
                fontWeight: 700,
                fontSize: '10px',
              }}
            >
              ₹ {totalPaid.toFixed(2)}
            </td>
          </tr>

          <tr>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000000',
                padding: '2px 4px',
                fontWeight: 500,
                fontSize: '10px',
              }}
            >
              Total Dues
            </td>
            <td
              colSpan={2}
              style={{
                border: '1px solid #000000',
                padding: '2px 4px',
                textAlign: 'right',
                fontWeight: 600,
                fontSize: '10px',
                color: remainingDues > 0 ? '#b91c1c' : '#000000',
              }}
            >
              ₹ {remainingDues.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount In Words */}
      <div
        style={{
          marginTop: '4px',
          fontWeight: 'bold',
          fontSize: '10px',
          letterSpacing: '0.1px',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}
      >
        {amountInWords}
      </div>

      {/* Remarks */}
      <div style={{ marginTop: '2px', fontSize: '10px' }}>
        <b>Remarks:</b> {data.remarks || ''}
      </div>

      {/* Signatures */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: '6px',
          marginBottom: '4px',
          fontSize: '10px',
        }}
      >
        <div style={{ paddingBottom: '2px' }}>
          Fee Collected: {data.collectedBy ? <b>{data.collectedBy}</b> : '................'}
        </div>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {(data.cashierSignatureUrl || data.cashierSignature || data.authorizedSignatureUrl) ? (
            <img
              src={data.cashierSignatureUrl || data.cashierSignature || data.authorizedSignatureUrl}
              alt="Cashier Sign"
              style={{ maxHeight: '26px', maxWidth: '95px', objectFit: 'contain', marginBottom: '1px' }}
            />
          ) : (
            <div style={{ height: '20px' }} />
          )}
          <div style={{ borderTop: '1px solid #374151', paddingTop: '1px', minWidth: '90px', fontSize: '9.5px', fontWeight: 'bold' }}>
            Cashier / Auth Sign
          </div>
        </div>
      </div>

      {/* Footer Notes matching sample exactly */}
      <div style={{ fontSize: '8px', color: '#1f2937', lineHeight: 1.25, marginTop: '2px' }}>
        <div style={{ fontWeight: 'bold' }}>Note:</div>
        <div style={{ paddingLeft: '4px' }}>
          <div>1. Cheque is subject to the realization. Rs.500/- Extra will be charged in case of cheque dishonour.</div>
          <div>2. Fee receipt and Fee card both should be kept in safe place for future.</div>
          <div>3. Please check the entry made by fee clerk in fee Card and fee Receipt</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dual Fee Receipt Layout: Renders 2 identical slips side-by-side on 1 single A4 portrait page
 */
export const FeeReceiptSlip = React.forwardRef(({ data = {}, showCuttingLine = true }, ref) => {
  if (!data) return null;

  return (
    <div
      ref={ref}
      id="dual-fee-receipt-print-area"
      style={{
        width: '100%',
        maxWidth: '200mm', // standard A4 printable width
        margin: '0 auto',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      {/* Inline styles specifically targeting window.print */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 4mm 4mm 4mm;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything in root and background */
          #root,
          body > *:not(.MuiDialog-root):not(#dual-fee-receipt-print-area) {
            display: none !important;
          }
          /* Reset Dialog wrapper so it renders as a pure full-width block */
          .MuiDialog-root {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            z-index: auto !important;
          }
          .MuiBackdrop-root {
            display: none !important;
          }
          .MuiDialog-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .MuiPaper-root.MuiDialog-paper,
          .MuiPaper-root,
          .MuiDialogContent-root {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          .MuiDialogTitle-root,
          .MuiDialogActions-root,
          .no-print {
            display: none !important;
          }
          #dual-fee-receipt-print-area {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 200mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          #dual-fee-receipt-print-area * {
            visibility: visible !important;
          }
        }
      `}</style>

      {/* Dual Side-by-Side Slips Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Slip (Office / School Copy) */}
        <div style={{ width: '48.5%', boxSizing: 'border-box' }}>
          <SingleSlip data={data} copyTitle="Office Copy" />
        </div>

        {/* Center Vertical Cut Line */}
        <div
          style={{
            width: '3%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            alignSelf: 'stretch',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              height: '100%',
              minHeight: '340px',
              borderRight: '1px dashed #9ca3af',
              position: 'relative',
              width: '1px',
            }}
          >
            {showCuttingLine && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '-7px',
                  backgroundColor: '#ffffff',
                  padding: '2px 0',
                  fontSize: '11px',
                  color: '#6b7280',
                  userSelect: 'none',
                }}
                title="Cut along this line"
              >
                ✂
              </span>
            )}
          </div>
        </div>

        {/* Right Slip (Student / Parent Copy) */}
        <div style={{ width: '48.5%', boxSizing: 'border-box' }}>
          <SingleSlip data={data} copyTitle="Student Copy" />
        </div>
      </div>
    </div>
  );
});

FeeReceiptSlip.displayName = 'FeeReceiptSlip';

export default FeeReceiptSlip;
