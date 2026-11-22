import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
  HowToReg as ConvertIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dynamicRegistrationApi } from '../api/dynamicRegistrationApi';
import { printElement } from '../../../utils/printUtils';

const DEFAULT_CONFIG = {
  primaryColor: '#1e3a8a',
  secondaryColor: '#eff6ff',
  accentColor: '#172554',
  borderColor: '#1e3a8a',
  fontFamily: 'Inter, sans-serif',
  baseFontSize: 11,
  fontScalePercent: 100,
  headerLayout: 'Classic',
  borderStyle: 'Solid',
  logoSize: 48,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  pageMargin: '4mm',
  pagePadding: 12,
  pageMaxWidth: 920,

  headerSchoolNameFontSize: 17,
  headerSchoolNameFontWeight: '900',
  headerSchoolNameTransform: 'uppercase',
  headerSchoolNameLetterSpacing: '0.5px',
  headerSubtitleFontSize: 11,
  headerAddressFontSize: 10,
  headerAlignment: 'center',
  headerDividerStyle: 'Solid',

  slipTitle: 'OFFICIAL REGISTRATION SLIP / ACKNOWLEDGEMENT',
  slipTitleBgColor: '#1e3a8a',
  slipTitleTextColor: '#ffffff',
  slipTitleFontSize: 11,

  copyLayout: 'DualSideBySide', // 'DualSideBySide' | 'SingleCopy' | 'DualStacked'
  showCuttingLine: true,
  firstCopyTitle: 'Office Copy',
  secondCopyTitle: 'Student Copy',
  currencySymbol: '₹',

  showSchoolLogo: true,
  showAffiliationNo: true,
  showPreviousSchool: true,
  showFeeBreakdownTable: true,
  showAmountInWords: true,
  showBalanceDue: true,
  showPaymentMode: true,
  showSchoolSealBox: true,
  showTerms: true,
  showSignatures: true,

  signature1: 'Candidate / Parent Signature',
  signature2: 'Authorized Signatory',

  termsTitle: 'TERMS & CONDITIONS / UNDERTAKING:',
  termsText:
    '• Registration fee once deposited will not be refunded or transferred under any circumstances.\n• Registration does not guarantee admission. Final admission is subject to merit, seat availability & document verification.\n• Retain this slip safely for entrance test, interview, and counseling verification.',

  footerText: 'Computer Generated Registration Slip • Powered by Digital Vidya Sarthi (DVS ERP)',

  sections: [
    { key: 'header', title: 'School Header & Affiliation', visible: true, order: 1 },
    { key: 'meta_bar', title: 'Registration Title & Copy Badge', visible: true, order: 2 },
    { key: 'student_details', title: 'Student & Registration Details Box', visible: true, order: 3 },
    { key: 'fee_breakdown', title: 'Registration Fee Particulars Table', visible: true, order: 4 },
    { key: 'payment_summary', title: 'Amount in Words & Totals Summary', visible: true, order: 5 },
    { key: 'payment_info', title: 'Payment Mode & Bank / Ref Info', visible: true, order: 6 },
    { key: 'terms', title: 'Registration Terms & Guidelines', visible: true, order: 7 },
    { key: 'signatures', title: 'Signatures & School Seal', visible: true, order: 8 },
    { key: 'footer', title: 'Footer System Note', visible: true, order: 9 },
  ],
};

function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  return inWords(num).trim() + ' Rupees Only';
}

export const RegistrationSlipModal = ({ open, onClose, slip, branchInfo = {}, onAdmit }) => {
  if (!slip) return null;

  // Fetch Dynamic Registration Slip Layout & Styling configured in Super Admin
  const { data: configRes } = useQuery({
    queryKey: ['registration-slip-config'],
    queryFn: () => dynamicRegistrationApi.getRegistrationSlipConfig(),
    staleTime: 60000,
  });

  const cfg = {
    ...DEFAULT_CONFIG,
    ...(configRes?.data?.data || {}),
  };

  const schoolName = cfg.headerSchoolNameCustom?.trim() || branchInfo.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branchInfo.branchName || 'Main Campus';
  const schoolPhone = branchInfo.phone || '+91 9873993957';
  const schoolSubtitle = cfg.headerSubtitleCustom?.trim() || `Branch: ${branchName} • Ph: ${schoolPhone} • CBSE Affiliation No: 2026/0912`;
  const schoolAddress = cfg.headerAddressCustom?.trim() || branchInfo.address || 'Knowledge Park, Educational Zone, Greater Noida, UP - 201306';
  const logoUrl = '/dvslogo1.jpeg';
  const cur = cfg.currencySymbol || '₹';

  const feeAmount = Number(slip.feeAmount || 0);
  const paidAmount = Number(slip.paidAmount || 0);
  const balanceAmount = Number(slip.balanceAmount || 0);
  const amountWords = numberToWords(paidAmount);

  const handlePrint = () => {
    printElement('printable-registration-slip-container', {
      title: `Registration_Slip_${slip.slipNumber}_${slip.studentName}`,
      pageSize: cfg.pageSize || 'A4',
      orientation: cfg.copyLayout === 'DualSideBySide' ? 'landscape' : (cfg.pageOrientation || 'portrait'),
      margin: cfg.pageMargin || '4mm',
    });
  };

  const handleShareWhatsApp = () => {
    const rawNumber = slip.contactNumber ? String(slip.contactNumber).replace(/\D/g, '') : '';
    const phone = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
    const msg = `*STUDENT REGISTRATION SLIP - ${schoolName}*\n\nDear Parent/Student,\nRegistration has been successfully recorded!\n\n*Slip No:* ${slip.slipNumber}\n*Student Name:* ${slip.studentName}\n*Class:* ${slip.className}\n*Registration Fee:* Rs. ${slip.feeAmount}\n*Paid Amount:* Rs. ${slip.paidAmount}\n*Balance Due:* Rs. ${slip.balanceAmount}\n*Payment Status:* ${slip.paymentStatus}\n\nThank you for choosing ${schoolName}!`;
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const isVisible = (key) => {
    if (!cfg.sections) return true;
    const sec = cfg.sections.find((s) => s.key === key);
    return sec ? sec.visible !== false : true;
  };

  // Render a Single Copy of the Receipt (Fee-slip tabular style)
  const renderSingleSlip = (copyTitle) => {
    return (
      <div
        className="registration-slip-box"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: `${cfg.pagePadding || 12}px`,
          fontFamily: cfg.fontFamily || 'Inter, sans-serif',
          color: '#111827',
          fontSize: `${cfg.baseFontSize || 11}px`,
          lineHeight: 1.3,
          backgroundColor: '#ffffff',
          border:
            cfg.borderStyle === 'Solid'
              ? `1.5px solid ${cfg.borderColor}`
              : cfg.borderStyle === 'Double'
              ? `3px double ${cfg.borderColor}`
              : cfg.borderStyle === 'Dashed'
              ? `1.5px dashed ${cfg.borderColor}`
              : '1px solid #e5e7eb',
          borderRadius: cfg.borderStyle === 'None' ? '6px' : '2px',
          position: 'relative',
        }}
      >
        {/* Watermark if enabled */}
        {cfg.showWatermark && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              fontSize: '28px',
              fontWeight: 900,
              color: 'rgba(220, 38, 38, 0.08)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              zIndex: 0,
            }}
          >
            {cfg.watermarkText || 'REGISTERED / OFFICIAL'}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          {isVisible('header') && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: cfg.headerAlignment === 'left' ? 'flex-start' : 'center',
                padding: `${cfg.headerPaddingY || 6}px 0`,
                backgroundColor: cfg.headerBgColor !== 'transparent' ? cfg.headerBgColor : 'transparent',
                borderBottom:
                  cfg.headerDividerStyle === 'Solid'
                    ? `1.5px solid ${cfg.headerDividerColor || cfg.borderColor}`
                    : cfg.headerDividerStyle === 'Double'
                    ? `2.5px double ${cfg.headerDividerColor || cfg.borderColor}`
                    : cfg.headerDividerStyle === 'Dashed'
                    ? `1.5px dashed ${cfg.headerDividerColor || cfg.borderColor}`
                    : 'none',
                marginBottom: '6px',
              }}
            >
              {cfg.showSchoolLogo && (
                <div style={{ flexShrink: 0, marginRight: '10px' }}>
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{
                      width: `${cfg.logoSize || 48}px`,
                      height: `${cfg.logoSize || 48}px`,
                      objectFit: 'contain',
                      borderRadius: '4px',
                      border: `1px solid ${cfg.borderColor}`,
                      padding: '2px',
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div style={{ textAlign: cfg.headerAlignment === 'left' ? 'left' : 'center', flex: 1 }}>
                <div
                  style={{
                    fontSize: `${cfg.headerSchoolNameFontSize || 17}px`,
                    fontWeight: cfg.headerSchoolNameFontWeight || '900',
                    color: cfg.headerSchoolNameColor || cfg.primaryColor,
                    textTransform: cfg.headerSchoolNameTransform || 'uppercase',
                    letterSpacing: cfg.headerSchoolNameLetterSpacing || '0.5px',
                    lineHeight: 1.2,
                  }}
                >
                  {schoolName}
                </div>

                {cfg.showAffiliationNo && (
                  <div
                    style={{
                      fontSize: `${cfg.headerSubtitleFontSize || 11}px`,
                      fontWeight: 600,
                      color: cfg.headerSubtitleColor || '#475569',
                      marginTop: '2px',
                    }}
                  >
                    {schoolSubtitle}
                  </div>
                )}

                <div
                  style={{
                    fontSize: `${cfg.headerAddressFontSize || 10}px`,
                    color: cfg.headerAddressColor || '#1e293b',
                    marginTop: '1px',
                  }}
                >
                  {schoolAddress}
                </div>
              </div>
            </div>
          )}

          {/* Meta Bar */}
          {isVisible('meta_bar') && (
            <div
              style={{
                backgroundColor: cfg.secondaryColor || '#eff6ff',
                border: `1px solid ${cfg.borderColor}`,
                padding: '3px 8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                borderRadius: '2px',
              }}
            >
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: `${cfg.slipTitleFontSize || 11}px`,
                  color: cfg.primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {cfg.slipTitle || 'OFFICIAL REGISTRATION SLIP / ACKNOWLEDGEMENT'}
              </span>

              {copyTitle && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: cfg.primaryColor,
                    color: '#ffffff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {copyTitle}
                </span>
              )}
            </div>
          )}

          {/* Student & Registration Details Box */}
          {isVisible('student_details') && (
            <div
              style={{
                border: `1px solid ${cfg.borderColor}`,
                marginBottom: '6px',
                fontSize: `${cfg.baseFontSize || 11}px`,
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', borderBottom: `1px solid ${cfg.borderColor}` }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                  <b>Registration No:</b> <span style={{ fontWeight: 700, color: cfg.primaryColor }}>{slip.slipNumber}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Date:</b> <span>{new Date(slip.createdOn || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: `1px solid ${cfg.borderColor}` }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                  <b>Student Name:</b> <span style={{ fontWeight: 600 }}>{slip.studentName}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Seeking Class:</b> <span style={{ fontWeight: 600 }}>{slip.className}</span>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: `1px solid ${cfg.borderColor}` }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                  <b>Father's Name:</b> <span>{slip.fatherName || 'N/A'}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Mother's Name:</b> <span>{slip.motherName || 'N/A'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: (cfg.showPreviousSchool && (slip.previousSchool || slip.address)) ? `1px solid ${cfg.borderColor}` : 'none' }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                  <b>Mobile Number:</b> <span>{slip.contactNumber || 'N/A'}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Gender / DOB:</b> <span>{slip.gender || 'N/A'} {slip.dob ? `(${new Date(slip.dob).toLocaleDateString('en-IN')})` : ''}</span>
                </div>
              </div>

              {cfg.showPreviousSchool && (slip.previousSchool || slip.address) && (
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                    <b>Previous School:</b> <span>{slip.previousSchool || 'N/A'}</span>
                  </div>
                  <div style={{ width: '50%', padding: '3px 6px' }}>
                    <b>Address:</b> <span>{slip.address || 'N/A'}{slip.city ? `, ${slip.city}` : ''}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registration Fee Breakdown Table */}
          {isVisible('fee_breakdown') && cfg.showFeeBreakdownTable !== false && (
            <div style={{ marginBottom: '6px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `1px solid ${cfg.borderColor}`,
                  fontSize: `${(cfg.baseFontSize || 11) - 0.5}px`,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: cfg.secondaryColor, borderBottom: `1px solid ${cfg.borderColor}` }}>
                    <th style={{ width: '52%', textAlign: 'left', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                      REGISTRATION PARTICULARS
                    </th>
                    <th style={{ width: '16%', textAlign: 'right', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                      FEE ({cur})
                    </th>
                    <th style={{ width: '16%', textAlign: 'right', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                      PAID ({cur})
                    </th>
                    <th style={{ width: '16%', textAlign: 'right', padding: '3px 6px' }}>
                      DUE ({cur})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                      Academic Registration & Application Processing Fee
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                      {feeAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}`, color: cfg.primaryColor, fontWeight: 600 }}>
                      {paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px' }}>
                      {balanceAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>

                  {/* Totals Row */}
                  <tr style={{ backgroundColor: cfg.secondaryColor, fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}` }}>
                      TOTAL AMOUNT PAID
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: `1px solid ${cfg.borderColor}`, color: cfg.primaryColor }}>
                      {cur} {paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', color: balanceAmount > 0 ? '#b91c1c' : '#15803d' }}>
                      {cur} {balanceAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Summary & Words */}
          {isVisible('payment_summary') && (
            <div
              style={{
                border: `1px solid ${cfg.borderColor}`,
                padding: '4px 6px',
                marginBottom: '6px',
                fontSize: `${cfg.baseFontSize || 11}px`,
                backgroundColor: '#ffffff',
              }}
            >
              {cfg.showAmountInWords && (
                <div style={{ marginBottom: '3px' }}>
                  <b>Amount in Words:</b> <span style={{ textTransform: 'capitalize' }}>{amountWords}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569' }}>
                <span>
                  Payment Status:{' '}
                  <b style={{ color: slip.paymentStatus === 'Paid' ? '#15803d' : slip.paymentStatus === 'Partial' ? '#b45309' : '#b91c1c' }}>
                    {slip.paymentStatus || 'Paid'}
                  </b>
                </span>
                {cfg.showBalanceDue && (
                  <span style={{ fontWeight: 'bold', color: balanceAmount > 0 ? '#b91c1c' : '#15803d' }}>
                    Balance Dues: {cur} {balanceAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Payment Info */}
          {isVisible('payment_info') && cfg.showPaymentMode && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                border: `1px solid ${cfg.borderColor}`,
                padding: '3px 6px',
                marginBottom: '6px',
                fontSize: '10px',
                backgroundColor: cfg.secondaryColor,
              }}
            >
              <div>
                <b>Payment Mode:</b> <span>{slip.paymentMode || 'Cash'}</span>
              </div>
              <div>
                <b>Ref / Txn No:</b> <span>{slip.transactionReference || 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {isVisible('terms') && cfg.showTerms && (
            <div
              style={{
                fontSize: '9px',
                color: '#475569',
                border: '1px solid #e2e8f0',
                padding: '4px 6px',
                marginBottom: '6px',
                backgroundColor: '#f8fafc',
                lineHeight: 1.25,
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>{cfg.termsTitle}</div>
              <div style={{ whiteSpace: 'pre-line' }}>{cfg.termsText}</div>
            </div>
          )}

          {/* Signatures & Stamp */}
          {isVisible('signatures') && cfg.showSignatures && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginTop: '16px',
                marginBottom: '6px',
                padding: '0 8px',
              }}
            >
              <div style={{ textAlign: 'center', width: '32%' }}>
                <div style={{ borderTop: '1px dashed #64748b', paddingTop: '3px', fontSize: '9.5px', fontWeight: 'bold' }}>
                  {cfg.signature1 || 'Candidate / Parent Signature'}
                </div>
              </div>

              {cfg.showSchoolSealBox && (
                <div
                  style={{
                    width: '60px',
                    height: '42px',
                    border: '1px dashed #94a3b8',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                  }}
                >
                  Seal / Stamp
                </div>
              )}

              <div style={{ textAlign: 'center', width: '32%' }}>
                <div style={{ borderTop: '1px dashed #64748b', paddingTop: '3px', fontSize: '9.5px', fontWeight: 'bold' }}>
                  {cfg.signature2 || 'Authorized Signatory'}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {isVisible('footer') && (
            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '3px',
                textAlign: 'center',
                fontSize: '8.5px',
                color: '#64748b',
                marginTop: '4px',
              }}
            >
              {cfg.footerText}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 900,
          bgcolor: cfg.primaryColor,
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.2,
          px: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span>Official Registration Slip</span>
          <Chip
            label={slip.slipNumber}
            size="small"
            sx={{ bgcolor: '#ffffff', color: cfg.primaryColor, fontWeight: 800 }}
          />
        </Box>
        <Chip
          label={slip.paymentStatus || 'Paid'}
          size="small"
          color={slip.paymentStatus === 'Paid' ? 'success' : slip.paymentStatus === 'Partial' ? 'warning' : 'error'}
          sx={{ fontWeight: 800 }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#f8fafc' }}>
        {/* Printable Container */}
        <Box
          id="printable-registration-slip-container"
          className="printable-slip"
          sx={{
            width: '100%',
            maxWidth: `${cfg.pageMaxWidth || 920}px`,
            mx: 'auto',
            bgcolor: '#ffffff',
            p: 1.5,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
            '@media print': {
              width: '100% !important',
              maxWidth: '100% !important',
              p: '0 !important',
              m: '0 !important',
              boxShadow: 'none !important',
              border: 'none !important',
            },
          }}
        >
          {cfg.copyLayout === 'DualSideBySide' ? (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'stretch',
                width: '100%',
              }}
            >
              <div style={{ flex: 1 }}>{renderSingleSlip(cfg.firstCopyTitle || 'Office Copy')}</div>
              {cfg.showCuttingLine !== false && (
                <div
                  style={{
                    width: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeft: '1px dashed #94a3b8',
                    color: '#64748b',
                    fontSize: '11px',
                  }}
                >
                  <span style={{ transform: 'rotate(90deg)', fontSize: '14px', margin: '4px 0' }}>✂</span>
                </div>
              )}
              <div style={{ flex: 1 }}>{renderSingleSlip(cfg.secondCopyTitle || 'Student Copy')}</div>
            </div>
          ) : cfg.copyLayout === 'DualStacked' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>{renderSingleSlip(cfg.firstCopyTitle || 'Office Copy')}</div>
              {cfg.showCuttingLine !== false && (
                <div style={{ borderTop: '1px dashed #94a3b8', textAlign: 'center', margin: '4px 0' }}>
                  <span style={{ backgroundColor: '#ffffff', padding: '0 8px', fontSize: '10px', color: '#64748b' }}>
                    ✂ Cut Along Line
                  </span>
                </div>
              )}
              <div>{renderSingleSlip(cfg.secondCopyTitle || 'Student Copy')}</div>
            </div>
          ) : (
            <div>{renderSingleSlip('')}</div>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" size="small">
          Close
        </Button>
        {onAdmit && (
          <Button
            onClick={() => {
              onClose();
              onAdmit(slip);
            }}
            variant="contained"
            color="success"
            size="small"
            startIcon={<ConvertIcon />}
            sx={{ fontWeight: 800, textTransform: 'none' }}
          >
            Admit Student
          </Button>
        )}
        <Button
          onClick={handleShareWhatsApp}
          variant="contained"
          sx={{ bgcolor: '#25D366', color: '#ffffff', '&:hover': { bgcolor: '#128C7E' }, fontWeight: 700, textTransform: 'none' }}
          size="small"
          startIcon={<WhatsAppIcon />}
        >
          Share on WhatsApp
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          size="small"
          startIcon={<PrintIcon />}
          sx={{ bgcolor: cfg.primaryColor, '&:hover': { bgcolor: cfg.accentColor || cfg.primaryColor }, fontWeight: 800, textTransform: 'none' }}
        >
          Print Slip
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const AdmissionSlipModal = RegistrationSlipModal;
export default RegistrationSlipModal;
