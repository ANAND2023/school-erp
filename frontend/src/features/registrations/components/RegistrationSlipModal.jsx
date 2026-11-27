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
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { printElement } from '../../../utils/printUtils';

const DEFAULT_CONFIG = {
  primaryColor: '#1e3a8a',
  secondaryColor: '#eff6ff',
  accentColor: '#172554',
  borderColor: '#1e3a8a',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  baseFontSize: 11,
  fontScalePercent: 100,
  headerLayout: 'Classic',
  borderStyle: 'Solid',
  logoSize: 52,
  pageSize: 'A4',
  pageOrientation: 'portrait',
  pageMargin: '6mm',
  pagePadding: 18,
  pageMaxWidth: 820,

  headerSchoolNameFontSize: 20,
  headerSchoolNameFontWeight: '900',
  headerSchoolNameTransform: 'uppercase',
  headerSchoolNameLetterSpacing: '0.8px',
  headerSubtitleFontSize: 12,
  headerAddressFontSize: 10,
  headerAlignment: 'center',

  slipTitle: 'New Student Registration Form & Slip',
  slipSubtitle: 'PLEASE PRINT LEGIBLY • OFFICIAL REGISTRATION RECORD',
  slipTitleBgColor: '#1e3a8a',
  slipTitleTextColor: '#ffffff',
  slipTitleFontSize: 12,

  copyLayout: 'SingleCopy', // Default: 1 single copy
  showCuttingLine: false,
  firstCopyTitle: 'Official Record Copy',
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

  signature1: "Parent / Guardian Signature",
  signature2: 'Authorized Signatory',

  termsTitle: 'Declaration & Undertaking:',
  termsText:
    'I hereby certify that all the information provided in this registration form is genuine and accurate. I understand that registration does not guarantee admission until all eligibility conditions, document verification, and fee requirements are fulfilled.',

  footerText: 'Official Student Registration Record • Digital Vidya Sarthi (DVS ERP)',
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

const cleanVal = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str === 'N/A' || str === 'n/a' || str === 'null' || str === 'undefined') return '';
  return str;
};

export const RegistrationSlipModal = ({ open, onClose, slip, branchInfo = {}, onAdmit }) => {
  if (!slip) return null;

  // Fetch Dynamic Registration Slip Layout & Styling configured in Super Admin
  const { data: configRes } = useQuery({
    queryKey: ['registration-slip-config'],
    queryFn: () => dynamicRegistrationApi.getRegistrationSlipConfig(),
    staleTime: 60000,
  });

  const user = useAuthStore((state) => state.user);

  // Fetch current branch details (logo, contact, alternate phone)
  const { data: branchRes } = useQuery({
    queryKey: ['current-branch-details-slip'],
    queryFn: () => branchApi.getCurrentBranch().then((r) => r.data?.data || {}),
    staleTime: 60000,
  });

  const currentBranch = branchRes || {};
  const activeBranch = Object.keys(branchInfo || {}).length > 0 ? branchInfo : currentBranch;

  const cfg = {
    ...DEFAULT_CONFIG,
    ...(configRes?.data?.data || {}),
  };

  const schoolName = cfg.headerSchoolNameCustom?.trim() || activeBranch.schoolName || user?.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = activeBranch.branchName || activeBranch.name || user?.branchName || 'Main Campus';
  const rawPhones = [activeBranch.phone || user?.schoolPhone, activeBranch.alternatePhone || user?.schoolAlternatePhone].filter(Boolean);
  const schoolPhone = rawPhones.length > 0 ? rawPhones.join(', ') : '+91 9873993957';
  const schoolSubtitle = cfg.headerSubtitleCustom?.trim() || `Branch: ${branchName} • Phone: ${schoolPhone} • CBSE Affiliation No: ${activeBranch.affiliationNumber || '2026/0912'}`;
  const schoolAddress = cfg.headerAddressCustom?.trim() || activeBranch.address || user?.schoolAddress || 'Knowledge Park, Educational Zone, Greater Noida, UP - 201306';
  const logoUrl = activeBranch.logoUrl || user?.schoolLogoUrl || '/dvslogo1.jpeg';
  const cur = cfg.currencySymbol || '₹';

  const feeAmount = Number(slip.feeAmount || 0);
  const paidAmount = Number(slip.paidAmount || 0);
  const balanceAmount = Number(slip.balanceAmount || 0);
  const amountWords = numberToWords(paidAmount);

  const handlePrint = () => {
    printElement('printable-registration-slip-container', {
      title: `Registration_Form_${slip.slipNumber}_${slip.studentName}`,
      pageSize: cfg.pageSize || 'A4',
      orientation: 'portrait',
      margin: cfg.pageMargin || '5mm',
    });
  };

  const handleShareWhatsApp = () => {
    const rawNumber = slip.contactNumber ? String(slip.contactNumber).replace(/\D/g, '') : '';
    const phone = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
    const msg = `*STUDENT REGISTRATION FORM & SLIP - ${schoolName}*\n\nDear Parent/Student,\nRegistration has been recorded successfully!\n\n*Registration No:* ${slip.slipNumber}\n*Student Name:* ${slip.studentName}\n*Class:* ${slip.className}\n*Registration Fee:* Rs. ${slip.feeAmount}\n*Paid Amount:* Rs. ${slip.paidAmount}\n*Balance Due:* Rs. ${slip.balanceAmount}\n*Payment Status:* ${slip.paymentStatus}\n\nThank you for choosing ${schoolName}!`;
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const formattedDate = slip.createdOn ? new Date(slip.createdOn).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const formattedDob = slip.dob ? new Date(slip.dob).toLocaleDateString('en-IN') : '';

  const UnderlineVal = ({ value, minWidth = '140px', flex = 'none' }) => {
    const displayVal = cleanVal(value);
    return (
      <span
        style={{
          borderBottom: '1px solid #1e293b',
          minWidth: minWidth,
          flex: flex,
          display: 'inline-block',
          padding: '0 6px 1px 6px',
          fontWeight: 600,
          color: '#0f172a',
          marginLeft: '4px',
          marginRight: '8px',
        }}
      >
        {displayVal || '\u00A0'}
      </span>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
        {/* Printable 1 Single Copy Form Slip */}
        <Box
          id="printable-registration-slip-container"
          className="printable-slip"
          sx={{
            width: '100%',
            maxWidth: `${cfg.pageMaxWidth || 820}px`,
            mx: 'auto',
            bgcolor: '#ffffff',
            p: { xs: 2, sm: 3 },
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
            border: `1.5px solid ${cfg.borderColor || '#1e3a8a'}`,
            boxSizing: 'border-box',
            fontFamily: cfg.fontFamily || 'Georgia, "Times New Roman", Times, serif',
            color: '#0f172a',
            fontSize: '11px',
            lineHeight: 1.45,
            '@media print': {
              width: '100% !important',
              maxWidth: '100% !important',
              p: '5mm 8mm !important',
              m: '0 auto !important',
              boxShadow: 'none !important',
              border: `1.5px solid ${cfg.borderColor || '#1e3a8a'} !important`,
              pageBreakInside: 'avoid !important',
              breakInside: 'avoid !important',
            },
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '4px' }}>
              {cfg.showSchoolLogo && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    width: `${cfg.logoSize || 52}px`,
                    height: `${cfg.logoSize || 52}px`,
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div>
                <div
                  style={{
                    fontSize: `${cfg.headerSchoolNameFontSize || 20}px`,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: cfg.headerSchoolNameColor || '#0f172a',
                    lineHeight: 1.15,
                  }}
                >
                  {schoolName}
                </div>
                {cfg.showAffiliationNo && (
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                    {schoolSubtitle}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  {schoolAddress}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 900,
                marginTop: '6px',
                color: cfg.primaryColor || '#1e3a8a',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {cfg.slipTitle || 'New Student Registration Form & Slip'}
            </div>
            <div style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 700, color: '#475569', marginTop: '1px' }}>
              PLEASE PRINT LEGIBLY • OFFICIAL RECORD COPY
            </div>
          </div>

          {/* Form Meta Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '4px 10px',
              marginBottom: '10px',
              fontSize: '11px',
            }}
          >
            <div>
              <b>Registration No:</b> <span style={{ fontFamily: 'monospace', fontWeight: 800, color: cfg.primaryColor }}>{slip.slipNumber}</span>
            </div>
            <div>
              <b>Seeking Class:</b> <span style={{ fontWeight: 700 }}>{slip.className}</span>
            </div>
            <div>
              <b>Academic Session:</b> <span>{slip.academicYearName || '2026-2027'}</span>
            </div>
            <div>
              <b>Date:</b> <span>{formattedDate}</span>
            </div>
          </div>

          {/* Section 1: Student Information */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '12.5px',
                textDecoration: 'underline',
                color: '#0f172a',
                marginBottom: '6px',
                textTransform: 'capitalize',
              }}
            >
              Student Information:
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: '8px', alignItems: 'center' }}>
              <div style={{ width: '60%', display: 'flex', alignItems: 'center' }}>
                <span>Student's Full Name:</span>
                <UnderlineVal value={slip.studentName} flex="1" />
              </div>
              <div style={{ width: '40%', display: 'flex', alignItems: 'center' }}>
                <span>Seeking Class:</span>
                <UnderlineVal value={slip.className} flex="1" />
              </div>

              <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                <span>*Home Address:</span>
                <UnderlineVal value={slip.address} flex="1" />
              </div>

              <div style={{ width: '40%', display: 'flex', alignItems: 'center' }}>
                <span>City:</span>
                <UnderlineVal value={slip.city} flex="1" />
              </div>
              <div style={{ width: '35%', display: 'flex', alignItems: 'center' }}>
                <span>State:</span>
                <UnderlineVal value={slip.state} flex="1" />
              </div>
              <div style={{ width: '25%', display: 'flex', alignItems: 'center' }}>
                <span>Zip Code:</span>
                <UnderlineVal value={slip.pincode || slip.pinCode || slip.zipCode} flex="1" />
              </div>

              <div style={{ width: '55%', display: 'flex', alignItems: 'center' }}>
                <span>Student Email Address:</span>
                <UnderlineVal value={slip.email} flex="1" />
              </div>
              <div style={{ width: '45%', display: 'flex', alignItems: 'center' }}>
                <span>Primary Contact Phone:</span>
                <UnderlineVal value={slip.contactNumber} flex="1" />
              </div>

              <div style={{ width: '40%', display: 'flex', alignItems: 'center' }}>
                <span>Date of Birth:</span>
                <UnderlineVal value={formattedDob} flex="1" />
              </div>
              <div style={{ width: '25%', display: 'flex', alignItems: 'center' }}>
                <span>Gender:</span>
                <UnderlineVal value={slip.gender} flex="1" />
              </div>
              <div style={{ width: '35%', display: 'flex', alignItems: 'center' }}>
                <span>Place of Birth / City:</span>
                <UnderlineVal value={slip.city} flex="1" />
              </div>

              {cfg.showPreviousSchool && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                  <span>Previous School Attended:</span>
                  <UnderlineVal value={slip.previousSchool} flex="1" />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Parent / Guardian Information */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '12.5px',
                textDecoration: 'underline',
                color: '#0f172a',
                marginBottom: '6px',
                textTransform: 'capitalize',
              }}
            >
              Parent / Guardian Information:
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: '8px', alignItems: 'center' }}>
              <div style={{ width: '55%', display: 'flex', alignItems: 'center' }}>
                <span>Father / Guardian Name:</span>
                <UnderlineVal value={slip.fatherName} flex="1" />
              </div>
              {/* Cell Phone empty as requested */}
              <div style={{ width: '45%', display: 'flex', alignItems: 'center' }}>
                <span>Cell Phone:</span>
                <UnderlineVal value="" flex="1" />
              </div>

              <div style={{ width: '55%', display: 'flex', alignItems: 'center' }}>
                <span>Mother / Guardian Name:</span>
                <UnderlineVal value={slip.motherName} flex="1" />
              </div>
              {/* Cell Phone empty as requested */}
              <div style={{ width: '45%', display: 'flex', alignItems: 'center' }}>
                <span>Cell Phone:</span>
                <UnderlineVal value="" flex="1" />
              </div>
            </div>
          </div>

          {/* Section 3: Registration Fee & Payment Details (niche payment details add kr dena) */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '12.5px',
                textDecoration: 'underline',
                color: '#0f172a',
                marginBottom: '6px',
                textTransform: 'capitalize',
              }}
            >
              Registration Fee & Payment Details:
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #1e293b',
                fontSize: '10.5px',
                marginBottom: '6px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #1e293b' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    FEE PARTICULARS
                  </th>
                  <th style={{ width: '15%', textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    AMOUNT ({cur})
                  </th>
                  <th style={{ width: '15%', textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    PAID ({cur})
                  </th>
                  <th style={{ width: '15%', textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    BALANCE DUE ({cur})
                  </th>
                  <th style={{ width: '16%', textAlign: 'center', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    PAYMENT MODE
                  </th>
                  <th style={{ width: '14%', textAlign: 'center', padding: '4px 8px' }}>
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    Academic Registration & Admission Processing Fee
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    {feeAmount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b', fontWeight: 700, color: '#0f766e' }}>
                    {paidAmount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b', fontWeight: 700, color: balanceAmount > 0 ? '#b91c1c' : '#15803d' }}>
                    {balanceAmount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'center', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    {cleanVal(slip.paymentMode) || 'Cash'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                    <span style={{ fontWeight: 800, color: slip.paymentStatus === 'Paid' ? '#15803d' : '#b45309' }}>
                      {cleanVal(slip.paymentStatus) || 'Paid'}
                    </span>
                  </td>
                </tr>

                {/* Summary / Total Row */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '1.5px solid #1e293b' }}>
                  <td colSpan={2} style={{ padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                    TOTAL AMOUNT PAID: {cur} {paidAmount.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2} style={{ padding: '4px 8px', borderRight: '1px solid #1e293b', textAlign: 'right', color: balanceAmount > 0 ? '#b91c1c' : '#15803d' }}>
                    BALANCE DUE: {cur} {balanceAmount.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2} style={{ padding: '4px 8px', textAlign: 'center', fontSize: '9.5px', color: '#475569' }}>
                    Ref / Txn No: <b>{cleanVal(slip.transactionReference)}</b>
                  </td>
                </tr>
              </tbody>
            </table>

            {cfg.showAmountInWords && (
              <div style={{ fontSize: '10.5px', marginBottom: '8px' }}>
                <b>Amount in Words:</b>{' '}
                <span style={{ textTransform: 'capitalize', borderBottom: '1px dotted #64748b', paddingBottom: '1px' }}>
                  {amountWords}
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Declaration / Undertaking */}
          {cfg.showTerms && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '11.5px',
                  textDecoration: 'underline',
                  color: '#0f172a',
                  marginBottom: '3px',
                }}
              >
                {cfg.termsTitle || 'Declaration & Undertaking:'}
              </div>
              <div
                style={{
                  fontSize: '9.5px',
                  color: '#334155',
                  lineHeight: 1.35,
                  fontStyle: 'italic',
                }}
              >
                {cfg.termsText}
              </div>
            </div>
          )}

          {/* Section 5: Signatures */}
          {cfg.showSignatures && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginTop: '22px',
                paddingTop: '6px',
              }}
            >
              <div style={{ textAlign: 'center', width: '32%' }}>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10.5px', fontWeight: 'bold' }}>
                  {cfg.signature1 || 'Candidate / Parent Signature'}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Date: {formattedDate}</div>
              </div>

              {cfg.showSchoolSealBox && (
                <div
                  style={{
                    width: '68px',
                    height: '46px',
                    border: '1px dashed #94a3b8',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8.5px',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                  }}
                >
                  Seal / Stamp
                </div>
              )}

              <div style={{ textAlign: 'center', width: '32%' }}>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10.5px', fontWeight: 'bold' }}>
                  {cfg.signature2 || 'Authorized Signatory'}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>School Admission Office</div>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '14px',
              paddingTop: '4px',
              borderTop: '1px solid #e2e8f0',
              fontSize: '8.5px',
              color: '#64748b',
            }}
          >
            {cfg.footerText}
          </div>
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
          Print 1 Copy (Official Registration Form)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const AdmissionSlipModal = RegistrationSlipModal;
export default RegistrationSlipModal;
