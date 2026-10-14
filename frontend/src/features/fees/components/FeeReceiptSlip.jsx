import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { numberToIndianWords, formatReceiptMonths } from '../utils/numberToWords';
import apiClient from '../../../api/client';

// Cache for receipt config
let cachedFeeConfig = null;

// Professional, vibrant, high-contrast circular school emblem SVG
export const SchoolEmblem = ({ size = 48, primaryColor = '#166534', secondaryColor = '#f0fdf4' }) => (
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

const DEFAULT_CONFIG = {
  primaryColor: '#1e3a8a',
  secondaryColor: '#eff6ff',
  accentColor: '#172554',
  borderColor: '#1e3a8a',
  fontFamily: 'Inter, Arial, sans-serif',
  baseFontSize: 11,
  headerLayout: 'Classic',
  borderStyle: 'Solid',
  logoSize: 48,
  pagePadding: 8,
  headerSchoolNameCustom: '',
  headerSchoolNameFontSize: 16,
  headerSchoolNameColor: '#1e3a8a',
  headerSchoolNameFontWeight: '900',
  headerSchoolNameTransform: 'uppercase',
  headerSchoolNameLetterSpacing: '0.4px',
  headerSubtitleCustom: '',
  headerSubtitleFontSize: 10.5,
  headerSubtitleColor: '#475569',
  headerAddressCustom: '',
  headerAddressFontSize: 9.5,
  headerAddressColor: '#1e293b',
  headerAlignment: 'center',
  headerBgColor: 'transparent',
  headerPaddingY: 4,
  headerDividerStyle: 'Solid',
  headerDividerColor: '#1e3a8a',
  slipTitle: 'FEE RECEIPT / PAYMENT VOUCHER',
  slipTitleFontSize: 11,
  watermarkText: 'PAID / OFFICIAL RECEIPT',
  showWatermark: false,
  copyLayout: 'DualSideBySide',
  showCuttingLine: true,
  firstCopyTitle: 'Office Copy',
  secondCopyTitle: 'Student Copy',
  currencySymbol: '₹',
  showSchoolLogo: true,
  showAffiliationNo: true,
  showSchoolSealBox: true,
  showQrCode: true,
  showAmountInWords: true,
  showPaymentMode: true,
  showChequeDetails: true,
  showFeeBreakdownTable: true,
  showMonthColumn: true,
  showPreviousDues: true,
  showConcession: true,
  showFine: true,
  showBalanceDue: true,
  showTerms: true,
  showSignatures: true,
  signature1: 'Cashier / Accountant',
  signature2: 'Authorized Signatory',
  signature3: 'Parent / Student',
  termsTitle: 'TERMS & CONDITIONS / FEE RULES:',
  termsText:
    '• Fees once deposited will not be refunded or transferred under any circumstances.\n• Cheque payments are accepted subject to realization.\n• Please retain this receipt safely for future academic clearance & tax records.',
  footerText: 'Computer Generated Fee Receipt • Powered by Digital Vidya Sarthi (DVS ERP)',
  sections: [
    { key: 'header', title: 'School Header & Affiliation', visible: true, order: 1 },
    { key: 'meta_bar', title: 'Receipt Title & Copy Badge', visible: true, order: 2 },
    { key: 'student_details', title: 'Student & Receipt Details Box', visible: true, order: 3 },
    { key: 'fee_breakdown', title: 'Head-wise Fee Breakdown Table', visible: true, order: 4 },
    { key: 'payment_summary', title: 'Amount in Words & Totals Summary', visible: true, order: 5 },
    { key: 'payment_info', title: 'Payment Mode & Bank / Ref Info', visible: true, order: 6 },
    { key: 'terms', title: 'Fee Terms & Guidelines', visible: true, order: 7 },
    { key: 'signatures', title: 'Signatures & School Seal', visible: true, order: 8 },
    { key: 'footer', title: 'Footer System Note', visible: true, order: 9 },
  ],
};

/**
 * Single fee receipt copy component
 */
const SingleSlip = ({ data = {}, copyTitle = '', config = DEFAULT_CONFIG }) => {
  const [imageError, setImageError] = useState(false);

  const schoolName = config.headerSchoolNameCustom || data.schoolName || 'Kush Public School';
  const address = config.headerAddressCustom || data.address || 'Plot No 999, Main road Surya\nVihar, Part 3 Sec 91';
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

  const itemsDuesSum = items.reduce((sum, item) => sum + Number(item.balanceCarried || 0), 0);
  const remainingDues = items.length > 0 ? itemsDuesSum : Number(data.remainingTotalDues || 0);

  const amountInWords = numberToIndianWords(totalPaid);
  const logoSrc = data.logoUrl || data.schoolLogo;
  const cur = config.currencySymbol || '₹';

  const isVisible = (key) => {
    const sec = config.sections?.find((s) => s.key === key);
    return sec ? sec.visible : true;
  };

  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        padding: `${config.pagePadding || 8}px`,
        fontFamily: config.fontFamily || 'Inter, Arial, sans-serif',
        color: '#111827',
        fontSize: `${config.baseFontSize || 11}px`,
        lineHeight: 1.25,
        backgroundColor: '#ffffff',
        border:
          config.borderStyle === 'Solid'
            ? `1.5px solid ${config.borderColor || '#1e3a8a'}`
            : config.borderStyle === 'Double'
            ? `2.5px double ${config.borderColor || '#1e3a8a'}`
            : config.borderStyle === 'Dashed'
            ? `1.5px dashed ${config.borderColor || '#1e3a8a'}`
            : '1px solid #e5e7eb',
        position: 'relative',
      }}
    >
      {/* Watermark if enabled */}
      {config.showWatermark && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            fontSize: '26px',
            fontWeight: 900,
            color: 'rgba(220, 38, 38, 0.08)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            zIndex: 0,
          }}
        >
          {config.watermarkText || 'PAID / OFFICIAL RECEIPT'}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Section: Header */}
        {isVisible('header') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: config.headerAlignment === 'left' ? 'flex-start' : 'center',
              padding: `${config.headerPaddingY || 4}px 0`,
              backgroundColor: config.headerBgColor !== 'transparent' ? config.headerBgColor : 'transparent',
              borderBottom:
                config.headerDividerStyle === 'Solid'
                  ? `1.5px solid ${config.headerDividerColor || config.borderColor || '#1e3a8a'}`
                  : config.headerDividerStyle === 'Double'
                  ? `2.5px double ${config.headerDividerColor || config.borderColor || '#1e3a8a'}`
                  : config.headerDividerStyle === 'Dashed'
                  ? `1.5px dashed ${config.headerDividerColor || config.borderColor || '#1e3a8a'}`
                  : 'none',
              marginBottom: '4px',
            }}
          >
            {config.showSchoolLogo && (
              <div style={{ flexShrink: 0, marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logoSrc && !imageError ? (
                  <img
                    src={logoSrc}
                    alt="School Logo"
                    style={{ width: config.logoSize || 48, height: config.logoSize || 48, objectFit: 'contain' }}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <SchoolEmblem size={config.logoSize || 48} primaryColor={config.primaryColor} secondaryColor={config.secondaryColor} />
                )}
              </div>
            )}

            <div style={{ textAlign: config.headerAlignment === 'left' ? 'left' : 'center', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: `${config.headerSchoolNameFontSize || 15}px`,
                  fontWeight: config.headerSchoolNameFontWeight || 'bold',
                  letterSpacing: config.headerSchoolNameLetterSpacing || '0.3px',
                  textTransform: config.headerSchoolNameTransform || 'uppercase',
                  color: config.headerSchoolNameColor || config.primaryColor || '#1e3a8a',
                  lineHeight: 1.2,
                }}
                title={schoolName}
              >
                {schoolName}
              </div>

              {config.headerSubtitleCustom && (
                <div style={{ fontSize: `${config.headerSubtitleFontSize || 10}px`, color: config.headerSubtitleColor || '#475569', marginTop: '1px' }}>
                  {config.headerSubtitleCustom}
                </div>
              )}

              <div style={{ fontSize: `${config.headerAddressFontSize || 9.5}px`, marginTop: '1px', color: config.headerAddressColor || '#111827', lineHeight: 1.2 }}>
                Address : {address.replace('\n', ', ')}
              </div>
              <div style={{ fontSize: '9.5px', marginTop: '1px', fontWeight: 'bold' }}>
                Contact : {contact}
              </div>
            </div>
          </div>
        )}

        {/* Section: Meta Bar */}
        {isVisible('meta_bar') && (
          <div
            style={{
              backgroundColor: config.secondaryColor || '#eff6ff',
              border: `1px solid ${config.borderColor || '#1e3a8a'}`,
              padding: '2px 6px',
              fontWeight: 'bold',
              fontSize: `${config.slipTitleFontSize || 11}px`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
              letterSpacing: '0.2px',
              color: config.primaryColor || '#1e3a8a',
            }}
          >
            <span>{config.slipTitle || 'Fee Receipt :'}</span>
            {copyTitle && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: config.primaryColor || '#1e3a8a',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                }}
              >
                ({copyTitle})
              </span>
            )}
          </div>
        )}

        {/* Section: Student & Receipt Metadata Box */}
        {isVisible('student_details') && (
          <div
            style={{
              border: `1px solid ${config.borderColor || '#000000'}`,
              borderBottom: 'none',
              fontSize: `${config.baseFontSize || 10.5}px`,
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '4px',
            }}
          >
            <div style={{ display: 'flex', borderBottom: `1px solid ${config.borderColor || '#000000'}`, minHeight: '19px', alignItems: 'center' }}>
              <div style={{ width: '56%', padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}` }}>
                <b>Rec.No.:</b> <span style={{ fontWeight: 600 }}>{receiptNo}</span>
              </div>
              <div style={{ width: '44%', padding: '2px 4px' }}>
                <b>Date:</b> {dateFormatted}
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${config.borderColor || '#000000'}`, minHeight: '19px', alignItems: 'center' }}>
              <div style={{ width: '56%', padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}` }}>
                <b>Name:</b> <span style={{ fontWeight: 600 }}>{studentName}</span>
              </div>
              <div style={{ width: '44%', padding: '2px 4px' }}>
                <b>Adm No:</b> <span style={{ fontWeight: 600 }}>{admNo}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${config.borderColor || '#000000'}`, minHeight: '19px', alignItems: 'center' }}>
              <div style={{ width: '56%', padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}` }}>
                <b>Class:</b> <span style={{ fontWeight: 600 }}>{className}</span>
              </div>
              <div style={{ width: '44%', padding: '2px 4px' }}>
                <b>Mode:</b> {paymentMode}
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${config.borderColor || '#000000'}`, minHeight: '19px', alignItems: 'center' }}>
              <div style={{ width: '56%', padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}` }}>
                <b>S/D. of:</b> {fatherName}
              </div>
              <div style={{ width: '44%', padding: '2px 4px' }}>
                <b>Month:</b> {monthDisplay}
              </div>
            </div>
          </div>
        )}

        {/* Section: Fee Breakdown Table */}
        {isVisible('fee_breakdown') && config.showFeeBreakdownTable && (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: `1px solid ${config.borderColor || '#000000'}`,
              fontSize: '10px',
              boxSizing: 'border-box',
              marginBottom: '4px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: config.secondaryColor || '#ffffff', borderBottom: `1px solid ${config.borderColor || '#000000'}` }}>
                <th style={{ width: config.showMonthColumn !== false ? '35%' : '52%', borderRight: `1px solid ${config.borderColor || '#000000'}`, padding: '2px 4px', textAlign: 'left', fontWeight: 'bold' }}>
                  FEE HEAD
                </th>
                {config.showMonthColumn !== false && (
                  <th style={{ width: '22%', borderRight: `1px solid ${config.borderColor || '#000000'}`, padding: '2px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                    MONTH
                  </th>
                )}
                <th style={{ width: config.showMonthColumn !== false ? '21%' : '24%', borderRight: `1px solid ${config.borderColor || '#000000'}`, padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                  PAID ({cur})
                </th>
                <th style={{ width: config.showMonthColumn !== false ? '22%' : '24%', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                  DUE ({cur})
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const itemMonth = item.installmentName || item.installment || item.month || item.periodName || item.feeMonth || (items.length === 1 ? monthDisplay : '') || monthDisplay || data.month || '—';
                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${config.borderColor || '#000000'}`, minHeight: '17px' }}>
                      <td style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.feeHeadName || item.feeHead || 'Tuition Fee'}
                      </td>
                      {config.showMonthColumn !== false && (
                        <td style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}`, textAlign: 'center', whiteSpace: 'nowrap', fontSize: '9px' }}>
                          {itemMonth}
                        </td>
                      )}
                      <td style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}`, textAlign: 'right', fontWeight: 600 }}>
                        {Number(item.amountPaid || item.paid || 0).toFixed(0)}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                        {Number(item.balanceCarried || item.due || 0).toFixed(0)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr style={{ borderBottom: `1px solid ${config.borderColor || '#000000'}` }}>
                  <td style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}` }}>Fee Installment</td>
                  {config.showMonthColumn !== false && (
                    <td style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}`, textAlign: 'center', fontSize: '9px' }}>{monthDisplay || data.month || '—'}</td>
                  )}
                  <td style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}`, textAlign: 'right', fontWeight: 600 }}>{totalPaid.toFixed(0)}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right' }}>{remainingDues.toFixed(0)}</td>
                </tr>
              )}

              {/* Totals Row */}
              <tr style={{ backgroundColor: config.secondaryColor || '#f9fafb', fontWeight: 'bold' }}>
                <td colSpan={config.showMonthColumn !== false ? 2 : 1} style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}`, textAlign: 'left' }}>
                  TOTAL PAID
                </td>
                <td style={{ padding: '2px 4px', borderRight: `1px solid ${config.borderColor || '#000000'}`, textAlign: 'right', color: config.primaryColor || '#1e3a8a' }}>
                  {cur} {totalPaid.toFixed(0)}
                </td>
                <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                  {cur} {remainingDues.toFixed(0)}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Section: Payment Summary & Words */}
        {isVisible('payment_summary') && (
          <div
            style={{
              border: `1px solid ${config.borderColor || '#000000'}`,
              padding: '3px 6px',
              fontSize: '10px',
              boxSizing: 'border-box',
              marginBottom: '4px',
              backgroundColor: '#ffffff',
            }}
          >
            {config.showAmountInWords && (
              <div style={{ marginBottom: '2px' }}>
                <b>Rupees:</b> <span style={{ textTransform: 'capitalize' }}>{amountInWords}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563', fontSize: '9.5px' }}>
              {config.showConcession && <span>Concession: {cur}{totalConcession}</span>}
              {config.showFine && <span>Fine: {cur}{totalFine}</span>}
              {config.showBalanceDue && (
                <span style={{ fontWeight: 'bold', color: remainingDues > 0 ? '#b91c1c' : '#15803d' }}>
                  Remaining Due: {cur}{remainingDues}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Section: Terms & Conditions */}
        {isVisible('terms') && config.showTerms && (
          <div
            style={{
              fontSize: '8.5px',
              color: '#475569',
              border: '1px solid #e2e8f0',
              padding: '3px 6px',
              marginBottom: '4px',
              backgroundColor: '#f8fafc',
              lineHeight: 1.25,
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{config.termsTitle || 'TERMS & CONDITIONS:'}</div>
            <div style={{ whiteSpace: 'pre-line' }}>{config.termsText}</div>
          </div>
        )}

        {/* Section: Signatures */}
        {isVisible('signatures') && config.showSignatures && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '12px',
              marginBottom: '4px',
              padding: '0 6px',
            }}
          >
            <div style={{ textAlign: 'center', width: '32%' }}>
              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '2px', fontSize: '9px', fontWeight: 'bold' }}>
                {config.signature1 || 'Cashier / Accountant'}
              </div>
            </div>

            {config.showSchoolSealBox && (
              <div
                style={{
                  width: '56px',
                  height: '38px',
                  border: '1px dashed #94a3b8',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '7.5px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                }}
              >
                Seal / Stamp
              </div>
            )}

            <div style={{ textAlign: 'center', width: '32%' }}>
              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '2px', fontSize: '9px', fontWeight: 'bold' }}>
                {config.signature2 || 'Authorized Signatory'}
              </div>
            </div>
          </div>
        )}

        {/* Section: Footer */}
        {isVisible('footer') && (
          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '2px',
              textAlign: 'center',
              fontSize: '8px',
              color: '#64748b',
              marginTop: '3px',
            }}
          >
            {config.footerText}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Dual Fee Receipt Layout: Renders 2 identical slips side-by-side or stacked on 1 page
 */
export const FeeReceiptSlip = React.forwardRef(({ data = {}, showCuttingLine = true, slipConfig = null }, ref) => {
  const [activeConfig, setActiveConfig] = useState(slipConfig || cachedFeeConfig || DEFAULT_CONFIG);

  useEffect(() => {
    if (slipConfig) {
      setActiveConfig(slipConfig);
      return;
    }
    if (cachedFeeConfig) {
      setActiveConfig(cachedFeeConfig);
      return;
    }

    let isMounted = true;
    apiClient
      .get('/fees/receipt-config')
      .then((res) => {
        if (isMounted && res.data?.success && res.data.data) {
          cachedFeeConfig = res.data.data;
          setActiveConfig(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load dynamic fee receipt config:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [slipConfig]);

  if (!data) return null;

  const copyMode = activeConfig.copyLayout || 'DualSideBySide';
  const displayCutting = showCuttingLine && activeConfig.showCuttingLine !== false;

  return (
    <div
      ref={ref}
      id="dual-fee-receipt-print-area"
      style={{
        width: '100%',
        maxWidth: `${activeConfig.pageMaxWidth || 800}px`,
        margin: '0 auto',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @media print {
          @page {
            size: ${activeConfig.pageSize || 'A4'} ${activeConfig.pageOrientation || 'portrait'};
            margin: ${activeConfig.pageMargin || '4mm'};
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
          #root,
          body > *:not(.MuiDialog-root):not(#dual-fee-receipt-print-area) {
            display: none !important;
          }
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

      {copyMode === 'DualSideBySide' ? (
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
            <SingleSlip data={data} copyTitle={activeConfig.firstCopyTitle || 'Office Copy'} config={activeConfig} />
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
              {displayCutting && (
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
            <SingleSlip data={data} copyTitle={activeConfig.secondCopyTitle || 'Student Copy'} config={activeConfig} />
          </div>
        </div>
      ) : copyMode === 'DualStacked' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <SingleSlip data={data} copyTitle={activeConfig.firstCopyTitle || 'Office Copy'} config={activeConfig} />
          </div>
          {displayCutting && (
            <div style={{ borderTop: '1px dashed #9ca3af', textAlign: 'center', margin: '4px 0' }}>
              <span style={{ backgroundColor: '#ffffff', padding: '0 8px', fontSize: '10px', color: '#6b7280' }}>
                ✂ Cut Along Line
              </span>
            </div>
          )}
          <div>
            <SingleSlip data={data} copyTitle={activeConfig.secondCopyTitle || 'Student Copy'} config={activeConfig} />
          </div>
        </div>
      ) : (
        <div>
          <SingleSlip data={data} copyTitle="" config={activeConfig} />
        </div>
      )}
    </div>
  );
});

FeeReceiptSlip.displayName = 'FeeReceiptSlip';

export default FeeReceiptSlip;
