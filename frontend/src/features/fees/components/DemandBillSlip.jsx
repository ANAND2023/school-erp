import React from 'react';
import dayjs from 'dayjs';
import { numberToIndianWords } from '../utils/numberToWords';

// Professional Circular School Emblem SVG
export const DemandSchoolEmblem = ({ size = 46 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="47" stroke="#1e3a8a" strokeWidth="3.5" fill="#eff6ff" />
    <circle cx="50" cy="50" r="42" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3 2" />
    <circle cx="50" cy="46" r="28" fill="#1e3a8a" />
    <polygon points="50,26 53,35 63,35 55,41 58,50 50,44 42,50 45,41 37,35 47,35" fill="#fef08a" />
    <path d="M36 52 Q44 48 50 52 Q56 48 64 52 L64 64 Q56 60 50 64 Q44 60 36 64 Z" fill="#ffffff" stroke="#1e3a8a" strokeWidth="0.8" />
    <line x1="50" y1="52" x2="50" y2="64" stroke="#1e3a8a" strokeWidth="1.2" />
    <path d="M22 45 Q18 56 26 66 M78 45 Q82 56 74 66" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M22 72 Q50 82 78 72 L74 80 Q50 90 26 80 Z" fill="#b45309" />
    <text x="50" y="79" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="0.8" fontFamily="Arial, sans-serif">
      EDUCATION
    </text>
  </svg>
);

/**
 * Single Demand Bill Copy
 */
export const SingleDemandSlip = ({ data = {}, copyTitle = 'STUDENT / PARENT COPY', schoolInfo = {} }) => {
  const [imgErr, setImgErr] = React.useState(false);

  const schoolName = schoolInfo?.schoolName || data.schoolName || 'DIGITAL VIDYA SARTHI PUBLIC SCHOOL';
  const address = schoolInfo?.address || data.address || 'Main Campus Road, City Center';
  const phone = schoolInfo?.phone || data.schoolPhone || '9876543210';
  const email = schoolInfo?.email || data.schoolEmail || 'info@school.edu';
  const affiliation = schoolInfo?.affiliationNumber ? `Affiliation No: ${schoolInfo.affiliationNumber}` : 'Affiliated to CBSE / State Board';
  const logoUrl = schoolInfo?.logoUrl || data.logoUrl;

  const billNo = data.demandBillNo || `DB-${dayjs().format('YYYY')}-${data.admissionNo || data.studentId || '101'}`;
  const billDate = data.billDate ? dayjs(data.billDate).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');
  const dueDate = data.dueDate ? dayjs(data.dueDate).format('DD-MM-YYYY') : dayjs().add(10, 'day').format('DD-MM-YYYY');
  
  const studentName = (data.studentName || '').toUpperCase();
  const admNo = data.admissionNo || '';
  const rollNo = data.rollNo || '-';
  const className = data.className || '';
  const sectionName = data.sectionName ? ` - ${data.sectionName}` : '';
  const classSec = `${className}${sectionName}`;
  const fatherName = (data.fatherName || data.guardianName || '').toUpperCase();
  const mobile = data.guardianMobile || '-';
  const installmentsList = data.installmentNames && data.installmentNames.length > 0
    ? data.installmentNames.join(', ')
    : 'Current Academic Due';

  const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
  const netPayable = Number(data.netDemandAmount || data.balanceAmount || 0);
  const prevArrears = Number(data.previousArrears || 0);
  const fineAmount = Number(data.fineAmount || 0);
  const grossAmount = Number(data.grossAmount || 0);
  const concession = Number(data.concessionAmount || 0);

  const amountInWords = numberToIndianWords(Math.round(netPayable));

  return (
    <div
      className="demand-bill-copy"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        padding: '10px 14px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#111827',
        fontSize: '11px',
        lineHeight: 1.3,
        backgroundColor: '#ffffff',
        border: '1.5px solid #1e3a8a',
        borderRadius: '6px',
        position: 'relative',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1e3a8a', paddingBottom: '6px', marginBottom: '8px' }}>
        <div style={{ flexShrink: 0, marginRight: '10px' }}>
          {logoUrl && !imgErr ? (
            <img src={logoUrl} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} onError={() => setImgErr(true)} />
          ) : (
            <DemandSchoolEmblem size={48} />
          )}
        </div>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {schoolName}
          </div>
          <div style={{ fontSize: '10px', color: '#4b5563', fontWeight: 500 }}>
            {address} {phone ? `| Ph: ${phone}` : ''} {email ? `| Email: ${email}` : ''}
          </div>
          <div style={{ fontSize: '9.5px', color: '#6b7280', fontStyle: 'italic' }}>
            {affiliation}
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: '110px' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#1e3a8a',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '3px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            letterSpacing: '0.3px',
          }}>
            {copyTitle}
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '3px' }}>
            FEE DEMAND BILL
          </div>
        </div>
      </div>

      {/* Bill Meta Details & Student Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', marginBottom: '2px' }}>
            <span style={{ width: '85px', color: '#64748b', fontWeight: 600 }}>Bill No:</span>
            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{billNo}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px' }}>
            <span style={{ width: '85px', color: '#64748b', fontWeight: 600 }}>Adm No:</span>
            <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{admNo}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px' }}>
            <span style={{ width: '85px', color: '#64748b', fontWeight: 600 }}>Student Name:</span>
            <span style={{ fontWeight: 'bold', color: '#111827' }}>{studentName}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '85px', color: '#64748b', fontWeight: 600 }}>Father Name:</span>
            <span style={{ fontWeight: 600 }}>{fatherName || '-'}</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', marginBottom: '2px' }}>
            <span style={{ width: '85px', color: '#64748b', fontWeight: 600 }}>Bill Date:</span>
            <span>{billDate}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px' }}>
            <span style={{ width: '85px', color: '#dc2626', fontWeight: 'bold' }}>Due Date:</span>
            <span style={{ color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fee2e2', padding: '0 4px', borderRadius: '2px' }}>{dueDate}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px' }}>
            <span style={{ width: '85px', color: '#64748b', fontWeight: 600 }}>Class & Sec:</span>
            <span style={{ fontWeight: 'bold' }}>{classSec} (Roll: {rollNo})</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '85px', color: '#64748b', fontWeight: 600 }}>Contact:</span>
            <span>{mobile}</span>
          </div>
        </div>
      </div>

      {/* Installment & Month Coverage Notice */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '3px', marginBottom: '6px', fontSize: '10.5px', color: '#1e40af', border: '1px solid #bfdbfe' }}>
        <span><strong>Billing Month / Period:</strong> <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{data.billingPeriod || data.monthName || installmentsList}</span></span>
        <span><strong>Payment Status:</strong> <span style={{ color: netPayable > 0 ? '#b91c1c' : '#15803d', fontWeight: 'bold' }}>{data.status || (netPayable > 0 ? 'DUE / UNPAID' : 'PAID')}</span></span>
      </div>

      {/* Itemized Fee Breakdown Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10.5px' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
            <th style={{ padding: '4px 6px', textAlign: 'center', width: '30px', border: '1px solid #1e3a8a' }}>#</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #1e3a8a' }}>Fee Head Particulars</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', width: '90px', border: '1px solid #1e3a8a' }}>Installment</th>
            <th style={{ padding: '4px 6px', textAlign: 'right', width: '70px', border: '1px solid #1e3a8a' }}>Gross (₹)</th>
            <th style={{ padding: '4px 6px', textAlign: 'right', width: '65px', border: '1px solid #1e3a8a' }}>Disc (₹)</th>
            <th style={{ padding: '4px 6px', textAlign: 'right', width: '65px', border: '1px solid #1e3a8a' }}>Paid (₹)</th>
            <th style={{ padding: '4px 6px', textAlign: 'right', width: '75px', border: '1px solid #1e3a8a' }}>Due (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td style={{ padding: '3px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                <td style={{ padding: '3px 6px', fontWeight: 600, border: '1px solid #cbd5e1' }}>{item.feeHeadName}</td>
                <td style={{ padding: '3px 6px', color: '#4b5563', border: '1px solid #cbd5e1' }}>{item.installmentName}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{Number(item.originalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', color: '#047857', border: '1px solid #cbd5e1' }}>{Number(item.concessionAmount || 0) > 0 ? `-${Number(item.concessionAmount).toFixed(2)}` : '0.00'}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', color: '#2563eb', border: '1px solid #cbd5e1' }}>{Number(item.paidAmount || 0).toFixed(2)}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #cbd5e1' }}>{Number(item.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={{ padding: '3px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
              <td style={{ padding: '3px 6px', fontWeight: 600, border: '1px solid #cbd5e1' }}>Tuition & Academic Term Fee</td>
              <td style={{ padding: '3px 6px', color: '#4b5563', border: '1px solid #cbd5e1' }}>{installmentsList}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right', color: '#047857', border: '1px solid #cbd5e1' }}>{concession > 0 ? `-${concession.toFixed(2)}` : '0.00'}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right', color: '#2563eb', border: '1px solid #cbd5e1' }}>{Number(data.paidAmount || 0).toFixed(2)}</td>
              <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #cbd5e1' }}>{Number(data.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          )}

          {/* Arrears and Fine rows if present */}
          {prevArrears > 0 && (
            <tr style={{ backgroundColor: '#fffbeb' }}>
              <td style={{ padding: '3px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>*</td>
              <td colSpan={5} style={{ padding: '3px 6px', fontWeight: 'bold', color: '#b45309', border: '1px solid #cbd5e1' }}>
                Previous Unpaid Arrears / Prior Balance
              </td>
              <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 'bold', color: '#b45309', border: '1px solid #cbd5e1' }}>
                {prevArrears.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          )}

          {fineAmount > 0 && (
            <tr style={{ backgroundColor: '#fef2f2' }}>
              <td style={{ padding: '3px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>*</td>
              <td colSpan={5} style={{ padding: '3px 6px', fontWeight: 'bold', color: '#dc2626', border: '1px solid #cbd5e1' }}>
                Overdue Late Fine Charge
              </td>
              <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626', border: '1px solid #cbd5e1' }}>
                {fineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          )}

          {/* Grand Total Row */}
          <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold' }}>
            <td colSpan={6} style={{ padding: '5px 8px', textAlign: 'right', fontSize: '11px', border: '1px solid #1e3a8a' }}>
              TOTAL NET PAYABLE DEMAND:
            </td>
            <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: '12px', border: '1px solid #1e3a8a' }}>
              ₹ {netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {/* In Words & Payment Bank Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', fontSize: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: '2px' }}>
            Amount in Words: <span style={{ color: '#1e3a8a', fontStyle: 'italic', fontWeight: 'bold' }}>INR {amountInWords}</span>
          </div>
          <div style={{ color: '#6b7280', fontSize: '9px', lineHeight: 1.25, marginTop: '4px' }}>
            • Please pay on or before <strong>{dueDate}</strong> to avoid late fine.<br />
            • Payments can be made via Cash / UPI / NetBanking / Cheque payable to school account.<br />
            • Cheques are subject to realization.
          </div>
        </div>

        {/* Bank / QR Box Placeholder */}
        <div style={{ border: '1px dashed #94a3b8', borderRadius: '4px', padding: '4px 8px', backgroundColor: '#f8fafc', textAlign: 'center', minWidth: '120px' }}>
          <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '9px' }}>BANK PAYMENT</div>
          <div style={{ fontSize: '8.5px', color: '#475569' }}>
            A/c: 98765432100<br />
            IFSC: SBIN0001234<br />
            UPI: school@upi
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #cbd5e1' }}>
        <div style={{ textAlign: 'center', width: '130px' }}>
          <div style={{ height: '22px' }}></div>
          <div style={{ borderTop: '1px dotted #94a3b8', fontSize: '9.5px', color: '#475569', fontWeight: 600, paddingTop: '2px' }}>
            Parent / Depositor Sign
          </div>
        </div>

        <div style={{ textAlign: 'center', width: '130px' }}>
          <div style={{ height: '22px' }}></div>
          <div style={{ borderTop: '1px dotted #94a3b8', fontSize: '9.5px', color: '#475569', fontWeight: 600, paddingTop: '2px' }}>
            Cashier / Accountant
          </div>
        </div>

        <div style={{ textAlign: 'center', width: '130px' }}>
          <div style={{ height: '22px' }}></div>
          <div style={{ borderTop: '1px dotted #94a3b8', fontSize: '9.5px', color: '#1e3a8a', fontWeight: 'bold', paddingTop: '2px' }}>
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 2-Copy Demand Bill (Student Copy + Office Copy)
 */
export const TwoCopyDemandSlip = ({ data = {}, schoolInfo = {} }) => {
  return (
    <div className="demand-bill-print-sheet" style={{ width: '100%', boxSizing: 'border-box' }}>
      <SingleDemandSlip data={data} copyTitle="PARENT COPY" schoolInfo={schoolInfo} />
      
      {/* Cut line divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '10px 0',
        position: 'relative',
        color: '#94a3b8',
        fontSize: '9px',
        fontWeight: 'bold',
        letterSpacing: '1px',
      }}>
        <div style={{ flex: 1, borderTop: '1px dashed #94a3b8' }}></div>
        <span style={{ padding: '0 8px', backgroundColor: '#ffffff', color: '#64748b' }}>
          ✂ CUT HERE FOR SCHOOL OFFICE COPY
        </span>
        <div style={{ flex: 1, borderTop: '1px dashed #94a3b8' }}></div>
      </div>

      <SingleDemandSlip data={data} copyTitle="SCHOOL OFFICE COPY" schoolInfo={schoolInfo} />
    </div>
  );
};

/**
 * 3-Copy Bank Challan Demand Bill
 */
export const ThreeCopyDemandSlip = ({ data = {}, schoolInfo = {} }) => {
  return (
    <div className="demand-bill-print-sheet" style={{ width: '100%', boxSizing: 'border-box' }}>
      <SingleDemandSlip data={data} copyTitle="STUDENT COPY" schoolInfo={schoolInfo} />
      <div style={{ margin: '8px 0', borderTop: '1px dashed #94a3b8', textAlign: 'center', fontSize: '8.5px', color: '#94a3b8' }}>✂ CUT HERE</div>
      <SingleDemandSlip data={data} copyTitle="SCHOOL COPY" schoolInfo={schoolInfo} />
      <div style={{ margin: '8px 0', borderTop: '1px dashed #94a3b8', textAlign: 'center', fontSize: '8.5px', color: '#94a3b8' }}>✂ CUT HERE</div>
      <SingleDemandSlip data={data} copyTitle="BANK COPY" schoolInfo={schoolInfo} />
    </div>
  );
};

/**
 * Bulk Print Wrapper Component for Multiple Students
 */
export const BulkDemandBillsPrint = ({ students = [], copyFormat = '2-copy', schoolInfo = {} }) => {
  return (
    <div id="bulk-demand-bills-container" className="bulk-demand-print-area">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #bulk-demand-bills-container, #bulk-demand-bills-container * {
            visibility: visible;
          }
          #bulk-demand-bills-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .demand-bill-page-break {
            page-break-after: always;
            break-after: page;
            padding-bottom: 20px;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
        }
      `}</style>

      {students.map((student, index) => (
        <div key={student.studentId || index} className="demand-bill-page-break" style={{ marginBottom: '16px' }}>
          {copyFormat === '1-copy' && (
            <SingleDemandSlip data={student} copyTitle="STUDENT / PARENT COPY" schoolInfo={schoolInfo} />
          )}
          {copyFormat === '2-copy' && (
            <TwoCopyDemandSlip data={student} schoolInfo={schoolInfo} />
          )}
          {copyFormat === '3-copy' && (
            <ThreeCopyDemandSlip data={student} schoolInfo={schoolInfo} />
          )}
        </div>
      ))}
    </div>
  );
};

export default BulkDemandBillsPrint;
