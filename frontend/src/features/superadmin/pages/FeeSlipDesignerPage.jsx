import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Divider } from 'primereact/divider';
import { Dialog } from 'primereact/dialog';
import { superAdminApi } from '../api/superAdminApi';
import { printElement, sanitizeFileName } from '../../../utils/printUtils';

const PRESET_PALETTES = [
  { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#eff6ff', accent: '#172554', border: '#1e3a8a' },
  { name: 'Teal Elegance', primary: '#0f766e', secondary: '#f0fdfa', accent: '#115e59', border: '#0f766e' },
  { name: 'Forest Emerald', primary: '#065f46', secondary: '#ecfdf5', accent: '#064e3b', border: '#065f46' },
  { name: 'Slate Executive', primary: '#1e293b', secondary: '#f8fafc', accent: '#0f172a', border: '#334155' },
  { name: 'Crimson Heritage', primary: '#991b1b', secondary: '#fef2f2', accent: '#7f1d1d', border: '#991b1b' },
  { name: 'Imperial Violet', primary: '#581c87', secondary: '#faf5ff', accent: '#3b0764', border: '#581c87' },
  { name: 'Amber Gold', primary: '#b45309', secondary: '#fffbeb', accent: '#78350f', border: '#b45309' },
  { name: 'Classic Monochrome', primary: '#000000', secondary: '#f3f4f6', accent: '#111827', border: '#000000' },
];

const FONT_OPTIONS = [
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Arial / System Standard', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Poppins (Geometric & Friendly)', value: 'Poppins, sans-serif' },
  { label: 'Roboto (Balanced Neo-Grotesque)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Premium Bold)', value: 'Montserrat, sans-serif' },
  { label: 'Segoe UI (Clean Windows Default)', value: '"Segoe UI", -apple-system, sans-serif' },
];

const FONT_WEIGHT_OPTIONS = [
  { label: 'Normal (400)', value: '400' },
  { label: 'Medium (500)', value: '500' },
  { label: 'Semi-Bold (600)', value: '600' },
  { label: 'Bold (700)', value: '700' },
  { label: 'Extra Bold (800)', value: '800' },
  { label: 'Heavy Black (900)', value: '900' },
];

const TEXT_TRANSFORM_OPTIONS = [
  { label: 'ALL UPPERCASE (DELHI PUBLIC SCHOOL)', value: 'uppercase' },
  { label: 'Title Case (Delhi Public School)', value: 'capitalize' },
  { label: 'Normal / As Typed', value: 'none' },
];

const LETTER_SPACING_OPTIONS = [
  { label: 'Normal (0px)', value: '0px' },
  { label: 'Slightly Spaced (0.5px)', value: '0.5px' },
  { label: 'Medium Spaced (1px)', value: '1px' },
  { label: 'Wide (2px)', value: '2px' },
];

const HEADER_LAYOUTS = [
  { label: 'Classic Centered', value: 'Classic', desc: 'Centered school logo and details' },
  { label: 'Modern Side-by-Side', value: 'Modern', desc: 'Logo left, school center, details right' },
  { label: 'Solid Color Banner', value: 'Banner', desc: 'Full-bleed primary colored header' },
  { label: 'Clean Minimalist', value: 'Minimal', desc: 'Understated clean header with thin border' },
];

const HEADER_DIVIDER_OPTIONS = [
  { label: 'Solid Line (1.5px)', value: 'Solid' },
  { label: 'Double Line (2.5px)', value: 'Double' },
  { label: 'Dashed Line (1.5px)', value: 'Dashed' },
  { label: 'No Bottom Line', value: 'None' },
];

const BORDER_STYLES = [
  { label: 'Solid Border', value: 'Solid' },
  { label: 'Double Border', value: 'Double' },
  { label: 'Dashed Border', value: 'Dashed' },
  { label: 'Clean / Borderless', value: 'None' },
];

const COPY_LAYOUT_OPTIONS = [
  { label: 'Dual Copies Side-by-Side (A4 Half Sheet with Scissor Line)', value: 'DualSideBySide' },
  { label: 'Single Slip per Page (Standard / A5 friendly)', value: 'SingleCopy' },
  { label: 'Dual Stacked (Top & Bottom on Single Page)', value: 'DualStacked' },
];

const PAGE_SIZE_OPTIONS = [
  { label: 'A4 Paper (Standard Full Page)', value: 'A4' },
  { label: 'A5 Paper (Half Sheet / Voucher)', value: 'A5' },
  { label: 'Letter (8.5 × 11 in)', value: 'Letter' },
];

const ORIENTATION_OPTIONS = [
  { label: 'Portrait (Vertical)', value: 'portrait' },
  { label: 'Landscape (Horizontal)', value: 'landscape' },
];

const PAGE_MARGIN_OPTIONS = [
  { label: 'Compact Margins (4mm)', value: '4mm' },
  { label: 'Standard Margins (6mm)', value: '6mm' },
  { label: 'Comfortable Margins (8mm)', value: '8mm' },
  { label: 'Spacious Margins (12mm)', value: '12mm' },
];

export const FeeSlipDesignerPage = () => {
  const toastRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [activeTab, setActiveTab] = useState('header'); // 'header' | 'layout' | 'copies' | 'elements' | 'content' | 'sections'
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Fee Slip Config State
  const [config, setConfig] = useState({
    schoolId: null,
    schoolName: 'Platform Default (All Schools)',
    isSchoolOverride: false,

    // Colors & Fonts
    primaryColor: '#1e3a8a',
    secondaryColor: '#eff6ff',
    accentColor: '#172554',
    borderColor: '#1e3a8a',
    fontFamily: 'Inter, sans-serif',
    fontScale: 'Normal',
    baseFontSize: 11,
    fontScalePercent: 100,
    headerLayout: 'Classic',
    borderStyle: 'Solid',

    // Sizing Controls
    logoSize: 48,
    photoWidth: 60,
    photoHeight: 70,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargin: '4mm',
    pagePadding: 12,
    pageMaxWidth: 800,

    // Header Customization
    headerSchoolNameCustom: '',
    headerSchoolNameFontSize: 17,
    headerSchoolNameColor: '#1e3a8a',
    headerSchoolNameFontWeight: '900',
    headerSchoolNameFontFamily: 'inherit',
    headerSchoolNameTransform: 'uppercase',
    headerSchoolNameLetterSpacing: '0.5px',

    headerSubtitleCustom: '',
    headerSubtitleFontSize: 11,
    headerSubtitleColor: '#475569',
    headerSubtitleFontWeight: '600',

    headerAddressCustom: '',
    headerAddressFontSize: 10,
    headerAddressColor: '#1e293b',

    headerAlignment: 'center',
    headerBgColor: 'transparent',
    headerPaddingY: 6,
    headerDividerStyle: 'Solid',
    headerDividerColor: '#1e3a8a',

    // Slip Title Badge
    slipTitle: 'FEE RECEIPT / PAYMENT VOUCHER',
    slipSubtitle: 'Official Student Fee Acknowledgement Receipt',
    slipTitleBgColor: '#1e3a8a',
    slipTitleTextColor: '#ffffff',
    slipTitleFontSize: 11,

    // Watermark
    watermarkText: 'PAID / OFFICIAL RECEIPT',
    showWatermark: false,

    // Copy Layout & Titles
    copyLayout: 'DualSideBySide',
    showCuttingLine: true,
    firstCopyTitle: 'Office Copy',
    secondCopyTitle: 'Student Copy',
    thirdCopyTitle: 'Bank Copy',
    currencySymbol: '₹',

    // Feature Toggles
    showSchoolLogo: true,
    showAffiliationNo: true,
    showStudentPhoto: false,
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

    // Signatures
    showSignatures: true,
    signature1: 'Cashier / Accountant',
    signature2: 'Authorized Signatory',
    signature3: 'Parent / Student',

    // Content Texts
    termsTitle: 'TERMS & CONDITIONS / FEE RULES:',
    termsText:
      '• Fees once deposited will not be refunded or transferred under any circumstances.\n• Cheque payments are accepted subject to realization.\n• Please retain this receipt safely for future academic clearance & tax records.',
    footerText: 'Computer Generated Fee Receipt • Powered by Digital Vidya Sarthi (DVS ERP)',

    // Drag and Drop Sections
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
  });

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    loadTemplate(selectedSchoolId);
  }, [selectedSchoolId]);

  const loadSchools = async () => {
    try {
      const res = await superAdminApi.getTenants({ page: 1, limit: 100 });
      if (res?.success && res.data) {
        const tenantItems = Array.isArray(res.data) ? res.data : res.data.items || [];
        setSchools(tenantItems);
      }
    } catch (err) {
      console.error('Failed to load schools list:', err);
    }
  };

  const loadTemplate = async (schoolId) => {
    try {
      setLoading(true);
      const res = await superAdminApi.getFeeSlipConfig(schoolId);
      if (res?.success && res.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data,
          headerSchoolNameCustom: res.data.headerSchoolNameCustom || '',
          headerSchoolNameFontSize: res.data.headerSchoolNameFontSize || 17,
          headerSchoolNameColor: res.data.headerSchoolNameColor || res.data.primaryColor || '#1e3a8a',
          headerSchoolNameFontWeight: res.data.headerSchoolNameFontWeight || '900',
          headerSchoolNameFontFamily: res.data.headerSchoolNameFontFamily || 'inherit',
          headerSchoolNameTransform: res.data.headerSchoolNameTransform || 'uppercase',
          headerSchoolNameLetterSpacing: res.data.headerSchoolNameLetterSpacing || '0.5px',
          headerSubtitleCustom: res.data.headerSubtitleCustom || '',
          headerSubtitleFontSize: res.data.headerSubtitleFontSize || 11,
          headerSubtitleColor: res.data.headerSubtitleColor || '#475569',
          headerAddressCustom: res.data.headerAddressCustom || '',
          headerAddressFontSize: res.data.headerAddressFontSize || 10,
          headerAddressColor: res.data.headerAddressColor || '#1e293b',
          headerAlignment: res.data.headerAlignment || 'center',
          headerBgColor: res.data.headerBgColor || 'transparent',
          headerPaddingY: res.data.headerPaddingY || 6,
          headerDividerStyle: res.data.headerDividerStyle || 'Solid',
          headerDividerColor: res.data.headerDividerColor || res.data.borderColor || '#1e3a8a',
          slipTitleBgColor: res.data.slipTitleBgColor || res.data.primaryColor || '#1e3a8a',
          slipTitleTextColor: res.data.slipTitleTextColor || '#ffffff',
          slipTitleFontSize: res.data.slipTitleFontSize || 11,
          logoSize: res.data.logoSize || 48,
          photoWidth: res.data.photoWidth || 60,
          photoHeight: res.data.photoHeight || 70,
          baseFontSize: res.data.baseFontSize || 11,
          fontScalePercent: res.data.fontScalePercent || 100,
          pageSize: res.data.pageSize || 'A4',
          pageOrientation: res.data.pageOrientation || 'portrait',
          pageMargin: res.data.pageMargin || '4mm',
          pagePadding: res.data.pagePadding || 12,
          pageMaxWidth: res.data.pageMaxWidth || 800,
          copyLayout: res.data.copyLayout || 'DualSideBySide',
          showCuttingLine: res.data.showCuttingLine !== undefined ? res.data.showCuttingLine : true,
          firstCopyTitle: res.data.firstCopyTitle || 'Office Copy',
          secondCopyTitle: res.data.secondCopyTitle || 'Student Copy',
          thirdCopyTitle: res.data.thirdCopyTitle || 'Bank Copy',
          currencySymbol: res.data.currencySymbol || '₹',
          signature1: res.data.signature1 || 'Cashier / Accountant',
          signature2: res.data.signature2 || 'Authorized Signatory',
          signature3: res.data.signature3 || 'Parent / Student',
        }));
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load fee slip configuration',
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await superAdminApi.saveFeeSlipConfig(config, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Saved Successfully',
          detail: selectedSchoolId
            ? `Custom fee receipt slip saved for school #${selectedSchoolId}`
            : 'Platform default fee receipt slip template updated',
          life: 3000,
        });
        loadTemplate(selectedSchoolId);
      } else {
        toastRef.current?.show({
          severity: 'error',
          summary: 'Save Failed',
          detail: res?.message || 'Could not save configuration',
          life: 4000,
        });
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: err?.response?.data?.message || err.message,
        life: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedSchoolId) {
      toastRef.current?.show({
        severity: 'info',
        summary: 'Notice',
        detail: 'You are already editing the Platform Default template.',
        life: 3000,
      });
      return;
    }

    if (!window.confirm('Are you sure you want to remove school custom overrides and inherit platform default?')) {
      return;
    }

    try {
      setSaving(true);
      const res = await superAdminApi.resetFeeSlipConfig(selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Reset Successful',
          detail: 'School fee slip reset to platform default',
          life: 3000,
        });
        loadTemplate(selectedSchoolId);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Reset Failed',
        detail: err.message,
        life: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPalette = (palette) => {
    setConfig((prev) => ({
      ...prev,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      borderColor: palette.border,
      headerSchoolNameColor: palette.primary,
      headerDividerColor: palette.primary,
      slipTitleBgColor: palette.primary,
    }));
  };

  // Section drag and drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedSections = [...config.sections];
    const item = updatedSections.splice(draggedIndex, 1)[0];
    updatedSections.splice(index, 0, item);

    const reordered = updatedSections.map((sec, idx) => ({ ...sec, order: idx + 1 }));
    setDraggedIndex(index);
    setConfig((prev) => ({ ...prev, sections: reordered }));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveSection = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= config.sections.length) return;

    const updated = [...config.sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((sec, idx) => ({ ...sec, order: idx + 1 }));
    setConfig((prev) => ({ ...prev, sections: reordered }));
  };

  const toggleSectionVisibility = (index) => {
    const updated = [...config.sections];
    updated[index] = { ...updated[index], visible: !updated[index].visible };
    setConfig((prev) => ({ ...prev, sections: updated }));
  };

  const handlePrintSlip = () => {
    printElement('printable-fee-slip', {
      title: `Fee_Receipt_${config.schoolName || 'Template'}`,
      pageSize: config.pageSize || 'A4',
      orientation: config.pageOrientation || 'portrait',
      margin: '8mm',
      padding: '8mm',
    });
  };

  // Mock receipt data for live preview
  const defaultSchoolName = selectedSchoolId
    ? schools.find((s) => s.id === selectedSchoolId)?.name || 'KUSH PUBLIC SCHOOL'
    : 'KUSH PUBLIC SCHOOL';

  const mockReceipt = {
    receiptNo: 'KU-2026-7304',
    receiptDate: '14-10-2026',
    studentName: 'AARAV SHARMA',
    admissionNo: 'ADM-2026-089',
    className: 'Class 9 - Section A',
    rollNo: '14',
    fatherName: 'RAJESH SHARMA',
    contact: '9911360909',
    paymentMode: 'UPI / NetBanking',
    transactionRef: 'UPI/294029410294',
    feeMonth: 'October 2026',
    items: [
      { feeHead: 'Tuition Fee (Quarter 3)', amount: 12000, concession: 1000, fine: 0, paid: 11000, due: 0 },
      { feeHead: 'Transport / Bus Fee', amount: 3500, concession: 0, fine: 0, paid: 3500, due: 0 },
      { feeHead: 'Science Lab & ICT Charges', amount: 2000, concession: 0, fine: 0, paid: 2000, due: 0 },
      { feeHead: 'Examination Fee (Mid-Term)', amount: 1500, concession: 0, fine: 0, paid: 1500, due: 0 },
    ],
    totalFee: 19000,
    totalConcession: 1000,
    totalFine: 0,
    totalPaid: 18000,
    remainingDues: 0,
    amountInWords: 'Eighteen Thousand Rupees Only',
  };

  // Render a Single Slip Box
  const renderSingleSlipPreview = (copyTitle) => {
    const cur = config.currencySymbol || '₹';
    const isVisible = (key) => {
      const sec = config.sections.find((s) => s.key === key);
      return sec ? sec.visible : true;
    };

    return (
      <div
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: `${config.pagePadding || 12}px`,
          fontFamily: config.fontFamily || 'Inter, sans-serif',
          color: '#111827',
          fontSize: `${config.baseFontSize || 11}px`,
          lineHeight: 1.3,
          backgroundColor: '#ffffff',
          border:
            config.borderStyle === 'Solid'
              ? `1.5px solid ${config.borderColor}`
              : config.borderStyle === 'Double'
              ? `3px double ${config.borderColor}`
              : config.borderStyle === 'Dashed'
              ? `1.5px dashed ${config.borderColor}`
              : '1px solid #e5e7eb',
          borderRadius: config.borderStyle === 'None' ? '6px' : '2px',
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
                padding: `${config.headerPaddingY || 6}px 0`,
                backgroundColor: config.headerBgColor !== 'transparent' ? config.headerBgColor : 'transparent',
                borderBottom:
                  config.headerDividerStyle === 'Solid'
                    ? `1.5px solid ${config.headerDividerColor || config.borderColor}`
                    : config.headerDividerStyle === 'Double'
                    ? `2.5px double ${config.headerDividerColor || config.borderColor}`
                    : config.headerDividerStyle === 'Dashed'
                    ? `1.5px dashed ${config.headerDividerColor || config.borderColor}`
                    : 'none',
                marginBottom: '6px',
              }}
            >
              {config.showSchoolLogo && (
                <div
                  style={{
                    flexShrink: 0,
                    marginRight: '10px',
                    width: `${config.logoSize || 48}px`,
                    height: `${config.logoSize || 48}px`,
                    borderRadius: '50%',
                    backgroundColor: config.secondaryColor,
                    border: `1.5px solid ${config.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: config.primaryColor,
                    fontSize: '10px',
                  }}
                >
                  <i className="pi pi-book" style={{ fontSize: `${(config.logoSize || 48) * 0.4}px` }}></i>
                </div>
              )}

              <div style={{ textAlign: config.headerAlignment === 'left' ? 'left' : 'center', flex: 1 }}>
                <div
                  style={{
                    fontSize: `${config.headerSchoolNameFontSize || 17}px`,
                    fontWeight: config.headerSchoolNameFontWeight || '900',
                    color: config.headerSchoolNameColor || config.primaryColor,
                    textTransform: config.headerSchoolNameTransform || 'uppercase',
                    letterSpacing: config.headerSchoolNameLetterSpacing || '0.5px',
                    lineHeight: 1.2,
                  }}
                >
                  {config.headerSchoolNameCustom || defaultSchoolName}
                </div>

                <div
                  style={{
                    fontSize: `${config.headerSubtitleFontSize || 11}px`,
                    fontWeight: config.headerSubtitleFontWeight || '600',
                    color: config.headerSubtitleColor || '#475569',
                    marginTop: '2px',
                  }}
                >
                  {config.headerSubtitleCustom || 'Affiliated to CBSE, New Delhi (Affiliation No: 2130892)'}
                </div>

                <div
                  style={{
                    fontSize: `${config.headerAddressFontSize || 10}px`,
                    color: config.headerAddressColor || '#1e293b',
                    marginTop: '1px',
                  }}
                >
                  {config.headerAddressCustom || 'Plot No 999, Main Road Surya Vihar, Sec 91 • Helpline: +91 9911360909'}
                </div>
              </div>
            </div>
          )}

          {/* Section: Meta Bar */}
          {isVisible('meta_bar') && (
            <div
              style={{
                backgroundColor: config.secondaryColor || '#eff6ff',
                border: `1px solid ${config.borderColor}`,
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
                  fontSize: `${config.slipTitleFontSize || 11}px`,
                  color: config.primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {config.slipTitle || 'FEE RECEIPT / PAYMENT VOUCHER'}
              </span>

              {copyTitle && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: config.primaryColor,
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

          {/* Section: Student & Receipt Details Box */}
          {isVisible('student_details') && (
            <div
              style={{
                border: `1px solid ${config.borderColor}`,
                marginBottom: '6px',
                fontSize: `${config.baseFontSize || 11}px`,
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', borderBottom: `1px solid ${config.borderColor}` }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                  <b>Receipt No:</b> <span style={{ fontWeight: 600, color: config.primaryColor }}>{mockReceipt.receiptNo}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Date:</b> <span>{mockReceipt.receiptDate}</span>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: `1px solid ${config.borderColor}` }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                  <b>Student Name:</b> <span>{mockReceipt.studentName}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Admission No:</b> <span style={{ fontWeight: 600 }}>{mockReceipt.admissionNo}</span>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: `1px solid ${config.borderColor}` }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                  <b>Class & Sec:</b> <span>{mockReceipt.className}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Roll No:</b> <span>{mockReceipt.rollNo}</span>
                </div>
              </div>

              <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                  <b>Father's Name:</b> <span>{mockReceipt.fatherName}</span>
                </div>
                <div style={{ width: '50%', padding: '3px 6px' }}>
                  <b>Month:</b> <span style={{ fontWeight: 600 }}>{mockReceipt.feeMonth}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Fee Breakdown Table */}
          {isVisible('fee_breakdown') && config.showFeeBreakdownTable && (
            <div style={{ marginBottom: '6px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `1px solid ${config.borderColor}`,
                  fontSize: `${(config.baseFontSize || 11) - 0.5}px`,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: config.secondaryColor, borderBottom: `1px solid ${config.borderColor}` }}>
                    <th style={{ width: config.showMonthColumn !== false ? '38%' : '56%', textAlign: 'left', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                      FEE PARTICULARS
                    </th>
                    {config.showMonthColumn !== false && (
                      <th style={{ width: '24%', textAlign: 'center', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                        MONTH
                      </th>
                    )}
                    <th style={{ width: config.showMonthColumn !== false ? '20%' : '22%', textAlign: 'right', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                      PAID ({cur})
                    </th>
                    <th style={{ width: config.showMonthColumn !== false ? '18%' : '22%', textAlign: 'right', padding: '3px 6px' }}>
                      DUE ({cur})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockReceipt.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '2px 6px', borderRight: `1px solid ${config.borderColor}` }}>{item.feeHead}</td>
                      {config.showMonthColumn !== false && (
                        <td style={{ padding: '2px 6px', borderRight: `1px solid ${config.borderColor}`, textAlign: 'center', fontSize: '9px' }}>
                          {item.month || mockReceipt.feeMonth}
                        </td>
                      )}
                      <td style={{ textAlign: 'right', padding: '2px 6px', borderRight: `1px solid ${config.borderColor}` }}>{item.paid.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', padding: '2px 6px' }}>{item.due.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr style={{ backgroundColor: config.secondaryColor, fontWeight: 'bold' }}>
                    <td colSpan={config.showMonthColumn !== false ? 2 : 1} style={{ padding: '3px 6px', borderRight: `1px solid ${config.borderColor}` }}>
                      TOTAL AMOUNT PAID
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: `1px solid ${config.borderColor}`, color: config.primaryColor }}>
                      {cur} {mockReceipt.totalPaid.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 6px' }}>
                      {cur} {mockReceipt.remainingDues.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Payment Summary & Words */}
          {isVisible('payment_summary') && (
            <div
              style={{
                border: `1px solid ${config.borderColor}`,
                padding: '4px 6px',
                marginBottom: '6px',
                fontSize: `${config.baseFontSize || 11}px`,
                backgroundColor: '#ffffff',
              }}
            >
              {config.showAmountInWords && (
                <div style={{ marginBottom: '3px' }}>
                  <b>Amount in Words:</b> <span style={{ textTransform: 'capitalize' }}>{mockReceipt.amountInWords}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569' }}>
                {config.showConcession && <span>Concession: {cur} {mockReceipt.totalConcession}</span>}
                {config.showFine && <span>Fine/Late Fee: {cur} {mockReceipt.totalFine}</span>}
                {config.showBalanceDue && (
                  <span style={{ fontWeight: 'bold', color: mockReceipt.remainingDues > 0 ? '#b91c1c' : '#15803d' }}>
                    Balance Dues: {cur} {mockReceipt.remainingDues}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Section: Payment Info */}
          {isVisible('payment_info') && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                border: `1px solid ${config.borderColor}`,
                padding: '3px 6px',
                marginBottom: '6px',
                fontSize: '10px',
                backgroundColor: config.secondaryColor,
              }}
            >
              <div>
                <b>Payment Mode:</b> <span>{mockReceipt.paymentMode}</span>
              </div>
              <div>
                <b>Ref / Cheque No:</b> <span>{mockReceipt.transactionRef}</span>
              </div>
            </div>
          )}

          {/* Section: Terms & Conditions */}
          {isVisible('terms') && config.showTerms && (
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
              <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>{config.termsTitle}</div>
              <div style={{ whiteSpace: 'pre-line' }}>{config.termsText}</div>
            </div>
          )}

          {/* Section: Signatures & Stamp */}
          {isVisible('signatures') && config.showSignatures && (
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
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderTop: '1px dashed #64748b', paddingTop: '3px', fontSize: '9.5px', fontWeight: 'bold' }}>
                  {config.signature1 || 'Cashier / Accountant'}
                </div>
              </div>

              {config.showSchoolSealBox && (
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

              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderTop: '1px dashed #64748b', paddingTop: '3px', fontSize: '9.5px', fontWeight: 'bold' }}>
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
                paddingTop: '3px',
                textAlign: 'center',
                fontSize: '8.5px',
                color: '#64748b',
                marginTop: '4px',
              }}
            >
              {config.footerText}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Toast ref={toastRef} />

      {/* Top Header Bar */}
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
        <div>
          <div className="flex align-items-center gap-2">
            <h1 className="text-2xl font-bold text-900 m-0">Dynamic Fee Receipt Slip Designer</h1>
            <Tag value="School-Wise & Global" severity="info" rounded></Tag>
          </div>
          <p className="text-500 text-sm m-0 mt-1">
            Customize header branding, color themes, dual/single copy layout, tables, watermark, terms, and sections.
          </p>
        </div>

        <div className="flex align-items-center gap-2">
          <Button
            label="Test Print Preview"
            icon="pi pi-print"
            className="p-button-outlined p-button-secondary p-button-sm"
            onClick={handlePrintSlip}
          />
          <Button
            label="Reset to Default"
            icon="pi pi-refresh"
            className="p-button-outlined p-button-danger p-button-sm"
            onClick={handleResetToDefault}
            disabled={!selectedSchoolId || saving}
          />
          <Button
            label={saving ? 'Saving...' : 'Save Configuration'}
            icon="pi pi-check"
            className="p-button-primary p-button-sm"
            onClick={handleSave}
            loading={saving}
          />
        </div>
      </div>

      {/* School Selection Bar */}
      <Card className="mb-4 shadow-1 border-none">
        <div className="flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between gap-3">
          <div className="flex align-items-center gap-3 w-full md:w-auto">
            <span className="font-semibold text-700 whitespace-nowrap">Editing Template For:</span>
            <Dropdown
              value={selectedSchoolId}
              options={[
                { label: '🌐 Platform Global Default (All Schools)', value: null },
                ...schools.map((s) => ({ label: `🏫 ${s.name} (${s.code || s.id})`, value: s.id })),
              ]}
              onChange={(e) => setSelectedSchoolId(e.value)}
              placeholder="Select School Template"
              className="w-full md:w-26rem"
            />
          </div>

          <div className="flex align-items-center gap-2">
            {config.isSchoolOverride ? (
              <Tag value="School Custom Override Active" severity="warning" icon="pi pi-bolt"></Tag>
            ) : selectedSchoolId ? (
              <Tag value="Inheriting Platform Default" severity="success" icon="pi pi-check-circle"></Tag>
            ) : (
              <Tag value="Master Platform Template" severity="info" icon="pi pi-globe"></Tag>
            )}
          </div>
        </div>
      </Card>

      {/* Main Split Grid: Controls (Left) & Live Preview (Right) */}
      <div className="grid">
        {/* Left Column: Configuration Controls */}
        <div className="col-12 xl:col-6">
          <Card className="shadow-2 border-none">
            {/* Nav Tabs */}
            <div className="flex flex-wrap gap-2 border-bottom-1 border-200 pb-3 mb-4">
              {[
                { id: 'header', label: 'Header & School', icon: 'pi pi-id-card' },
                { id: 'layout', label: 'Layout & Sizing', icon: 'pi pi-sliders-h' },
                { id: 'copies', label: 'Copy & Receipt Mode', icon: 'pi pi-copy' },
                { id: 'elements', label: 'Elements & Toggles', icon: 'pi pi-check-square' },
                { id: 'content', label: 'Terms & Signatures', icon: 'pi pi-pencil' },
                { id: 'sections', label: 'Sections Order', icon: 'pi pi-sort-alt' },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  className={`p-button-sm ${
                    activeTab === tab.id ? 'p-button-primary' : 'p-button-text p-button-secondary'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            {/* Tab 1: Header & School */}
            {activeTab === 'header' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Color Theme Palettes</h3>
                <div className="grid">
                  {PRESET_PALETTES.map((pal, idx) => (
                    <div key={idx} className="col-6 md:col-3">
                      <div
                        onClick={() => handleApplyPalette(pal)}
                        className="cursor-pointer p-2 border-round border-1 hover:shadow-2 transition-all transition-duration-150 flex flex-column gap-2"
                        style={{
                          borderColor: config.primaryColor === pal.primary ? pal.primary : '#e2e8f0',
                          borderWidth: config.primaryColor === pal.primary ? '2px' : '1px',
                          backgroundColor: pal.secondary,
                        }}
                      >
                        <div className="flex align-items-center gap-1">
                          <div className="w-1rem h-1rem border-round" style={{ backgroundColor: pal.primary }}></div>
                          <div className="w-1rem h-1rem border-round" style={{ backgroundColor: pal.accent }}></div>
                          <div className="w-1rem h-1rem border-round border-1 border-300" style={{ backgroundColor: pal.border }}></div>
                        </div>
                        <span className="text-xs font-semibold text-800">{pal.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">School Name Typography</h3>
                <div className="field mb-2">
                  <label className="text-sm font-medium text-700">Custom School Name Override (Leave empty to use school name)</label>
                  <InputText
                    value={config.headerSchoolNameCustom || ''}
                    onChange={(e) => setConfig({ ...config, headerSchoolNameCustom: e.target.value })}
                    placeholder="e.g. DELHI PUBLIC SCHOOL"
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Font Size (px): {config.headerSchoolNameFontSize}px</label>
                    <input
                      type="range"
                      min="12"
                      max="32"
                      value={config.headerSchoolNameFontSize || 17}
                      onChange={(e) => setConfig({ ...config, headerSchoolNameFontSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Font Weight</label>
                    <Dropdown
                      value={config.headerSchoolNameFontWeight || '900'}
                      options={FONT_WEIGHT_OPTIONS}
                      onChange={(e) => setConfig({ ...config, headerSchoolNameFontWeight: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">School Name Color</label>
                    <div className="flex gap-2 align-items-center">
                      <input
                        type="color"
                        value={config.headerSchoolNameColor || config.primaryColor}
                        onChange={(e) => setConfig({ ...config, headerSchoolNameColor: e.target.value })}
                        style={{ width: '38px', height: '34px', padding: 0, cursor: 'pointer', border: 'none' }}
                      />
                      <InputText
                        value={config.headerSchoolNameColor || config.primaryColor}
                        onChange={(e) => setConfig({ ...config, headerSchoolNameColor: e.target.value })}
                        className="p-inputtext-sm w-full"
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Text Transform</label>
                    <Dropdown
                      value={config.headerSchoolNameTransform || 'uppercase'}
                      options={TEXT_TRANSFORM_OPTIONS}
                      onChange={(e) => setConfig({ ...config, headerSchoolNameTransform: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Subtitle & Address Details</h3>
                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Subtitle / Affiliation Note</label>
                  <InputText
                    value={config.headerSubtitleCustom || ''}
                    onChange={(e) => setConfig({ ...config, headerSubtitleCustom: e.target.value })}
                    placeholder="e.g. Affiliated to CBSE, New Delhi (Affiliation No: 2130892)"
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Address & Contact Phone Line</label>
                  <InputText
                    value={config.headerAddressCustom || ''}
                    onChange={(e) => setConfig({ ...config, headerAddressCustom: e.target.value })}
                    placeholder="e.g. Plot No 999, Main Road Surya Vihar, Sec 91 • Contact: 9911360909"
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Header Alignment</label>
                    <Dropdown
                      value={config.headerAlignment || 'center'}
                      options={[
                        { label: 'Centered', value: 'center' },
                        { label: 'Left Aligned', value: 'left' },
                      ]}
                      onChange={(e) => setConfig({ ...config, headerAlignment: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Divider Line Style</label>
                    <Dropdown
                      value={config.headerDividerStyle || 'Solid'}
                      options={HEADER_DIVIDER_OPTIONS}
                      onChange={(e) => setConfig({ ...config, headerDividerStyle: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Layout & Sizing */}
            {activeTab === 'layout' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Page & Dimensions</h3>
                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Page Size</label>
                    <Dropdown
                      value={config.pageSize || 'A4'}
                      options={PAGE_SIZE_OPTIONS}
                      onChange={(e) => setConfig({ ...config, pageSize: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Orientation</label>
                    <Dropdown
                      value={config.pageOrientation || 'portrait'}
                      options={ORIENTATION_OPTIONS}
                      onChange={(e) => setConfig({ ...config, pageOrientation: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Print Margins</label>
                    <Dropdown
                      value={config.pageMargin || '4mm'}
                      options={PAGE_MARGIN_OPTIONS}
                      onChange={(e) => setConfig({ ...config, pageMargin: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Outer Border Style</label>
                    <Dropdown
                      value={config.borderStyle || 'Solid'}
                      options={BORDER_STYLES}
                      onChange={(e) => setConfig({ ...config, borderStyle: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Base Font Family</label>
                    <Dropdown
                      value={config.fontFamily || 'Inter, sans-serif'}
                      options={FONT_OPTIONS}
                      onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Base Font Size ({config.baseFontSize || 11}px)</label>
                    <input
                      type="range"
                      min="9"
                      max="14"
                      value={config.baseFontSize || 11}
                      onChange={(e) => setConfig({ ...config, baseFontSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">School Logo Size: {config.logoSize || 48}px</label>
                    <input
                      type="range"
                      min="32"
                      max="80"
                      value={config.logoSize || 48}
                      onChange={(e) => setConfig({ ...config, logoSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Slip Inner Padding: {config.pagePadding || 12}px</label>
                    <input
                      type="range"
                      min="6"
                      max="24"
                      value={config.pagePadding || 12}
                      onChange={(e) => setConfig({ ...config, pagePadding: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Copy & Receipt Mode */}
            {activeTab === 'copies' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Receipt Copy Configuration</h3>
                <div className="field mb-2">
                  <label className="text-sm font-medium text-700">Print Copy Layout</label>
                  <Dropdown
                    value={config.copyLayout || 'DualSideBySide'}
                    options={COPY_LAYOUT_OPTIONS}
                    onChange={(e) => setConfig({ ...config, copyLayout: e.value })}
                    className="w-full p-dropdown-sm"
                  />
                  <small className="text-500">
                    Dual Side-by-Side renders Office Copy and Student Copy side-by-side with a vertical scissor cutting line.
                  </small>
                </div>

                <div className="flex align-items-center justify-content-between p-2 border-1 border-200 border-round">
                  <span className="text-sm font-medium">Show Scissor Cutting Line</span>
                  <InputSwitch
                    checked={config.showCuttingLine}
                    onChange={(e) => setConfig({ ...config, showCuttingLine: e.value })}
                  />
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">First Copy Title</label>
                    <InputText
                      value={config.firstCopyTitle || 'Office Copy'}
                      onChange={(e) => setConfig({ ...config, firstCopyTitle: e.target.value })}
                      placeholder="Office Copy"
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Second Copy Title</label>
                    <InputText
                      value={config.secondCopyTitle || 'Student Copy'}
                      onChange={(e) => setConfig({ ...config, secondCopyTitle: e.target.value })}
                      placeholder="Student Copy"
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Currency Symbol</label>
                    <InputText
                      value={config.currencySymbol || '₹'}
                      onChange={(e) => setConfig({ ...config, currencySymbol: e.target.value })}
                      placeholder="₹"
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Slip Title Heading</label>
                    <InputText
                      value={config.slipTitle || 'FEE RECEIPT / PAYMENT VOUCHER'}
                      onChange={(e) => setConfig({ ...config, slipTitle: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Watermark Settings</h3>
                <div className="flex align-items-center justify-content-between p-2 border-1 border-200 border-round">
                  <span className="text-sm font-medium">Show Background Watermark</span>
                  <InputSwitch
                    checked={config.showWatermark}
                    onChange={(e) => setConfig({ ...config, showWatermark: e.value })}
                  />
                </div>
                {config.showWatermark && (
                  <div className="field">
                    <label className="text-xs font-medium text-700">Watermark Text</label>
                    <InputText
                      value={config.watermarkText || 'PAID / OFFICIAL RECEIPT'}
                      onChange={(e) => setConfig({ ...config, watermarkText: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Elements & Toggles */}
            {activeTab === 'elements' && (
              <div className="flex flex-column gap-2">
                <h3 className="text-base font-semibold text-800 m-0 mb-2">Display Elements & Toggles</h3>
                {[
                  { key: 'showSchoolLogo', label: 'School Logo / Emblem' },
                  { key: 'showAffiliationNo', label: 'Affiliation & Registration Number' },
                  { key: 'showFeeBreakdownTable', label: 'Head-wise Fee Breakdown Table' },
                  { key: 'showAmountInWords', label: 'Amount in Words' },
                  { key: 'showPaymentMode', label: 'Payment Mode (Cash/UPI/Cheque)' },
                  { key: 'showChequeDetails', label: 'Cheque / Transaction Reference Row' },
                  { key: 'showConcession', label: 'Concession / Discount Row' },
                  { key: 'showFine', label: 'Late Fee / Fine Row' },
                  { key: 'showBalanceDue', label: 'Remaining Balance Dues' },
                  { key: 'showSchoolSealBox', label: 'School Seal / Stamp Box' },
                  { key: 'showSignatures', label: 'Signature Lines' },
                  { key: 'showTerms', label: 'Terms & Conditions / Fee Rules' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex align-items-center justify-content-between p-2 border-1 border-100 border-round hover:surface-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-800">{item.label}</span>
                    <InputSwitch
                      checked={Boolean(config[item.key])}
                      onChange={(e) => setConfig({ ...config, [item.key]: e.value })}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Tab 5: Terms & Signatures */}
            {activeTab === 'content' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Signatures Labels</h3>
                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Left Signature Label</label>
                    <InputText
                      value={config.signature1 || 'Cashier / Accountant'}
                      onChange={(e) => setConfig({ ...config, signature1: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Right Signature Label</label>
                    <InputText
                      value={config.signature2 || 'Authorized Signatory'}
                      onChange={(e) => setConfig({ ...config, signature2: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Terms & Conditions</h3>
                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Terms Heading</label>
                  <InputText
                    value={config.termsTitle || 'TERMS & CONDITIONS / FEE RULES:'}
                    onChange={(e) => setConfig({ ...config, termsTitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Terms Text (Line by line)</label>
                  <InputTextarea
                    value={config.termsText || ''}
                    onChange={(e) => setConfig({ ...config, termsText: e.target.value })}
                    rows={4}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Footer System Note</label>
                  <InputText
                    value={config.footerText || ''}
                    onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>
              </div>
            )}

            {/* Tab 6: Sections Order */}
            {activeTab === 'sections' && (
              <div className="flex flex-column gap-2">
                <h3 className="text-base font-semibold text-800 m-0 mb-2">Drag or Reorder Sections</h3>
                <p className="text-xs text-500 m-0 mb-3">
                  Use the up/down arrows or drag rows to change the sequence of slip sections. Toggle the switch to show or hide a section.
                </p>

                {config.sections.map((section, idx) => (
                  <div
                    key={section.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className="flex align-items-center justify-content-between p-2 border-1 border-200 border-round bg-white shadow-1"
                    style={{ cursor: 'grab' }}
                  >
                    <div className="flex align-items-center gap-2">
                      <i className="pi pi-bars text-400"></i>
                      <span className="text-xs text-500 font-bold w-1rem">{idx + 1}.</span>
                      <span className="text-sm font-semibold text-800">{section.title}</span>
                    </div>

                    <div className="flex align-items-center gap-2">
                      <Button
                        icon="pi pi-chevron-up"
                        className="p-button-text p-button-sm p-button-secondary p-1"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, -1)}
                      />
                      <Button
                        icon="pi pi-chevron-down"
                        className="p-button-text p-button-sm p-button-secondary p-1"
                        disabled={idx === config.sections.length - 1}
                        onClick={() => moveSection(idx, 1)}
                      />
                      <InputSwitch
                        checked={section.visible}
                        onChange={() => toggleSectionVisibility(idx)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="col-12 xl:col-6">
          <Card
            className="shadow-2 border-none sticky"
            style={{ top: '1rem', backgroundColor: '#f1f5f9' }}
            title={
              <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 border-300">
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-eye text-primary"></i>
                  <span className="text-base font-bold text-800">Live Slip Preview</span>
                </div>
                <Tag
                  value={config.copyLayout === 'DualSideBySide' ? 'Dual A4 (Side-by-Side)' : config.copyLayout === 'SingleCopy' ? 'Single Slip' : 'Dual Stacked'}
                  severity="primary"
                />
              </div>
            }
          >
            <div
              id="printable-fee-slip"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '8px',
                borderRadius: '4px',
                maxHeight: '78vh',
                overflowY: 'auto',
              }}
            >
              {config.copyLayout === 'DualSideBySide' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <div style={{ flex: 1 }}>{renderSingleSlipPreview(config.firstCopyTitle || 'Office Copy')}</div>
                  {config.showCuttingLine && (
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
                      <i className="pi pi-scissors" style={{ transform: 'rotate(90deg)' }}></i>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>{renderSingleSlipPreview(config.secondCopyTitle || 'Student Copy')}</div>
                </div>
              ) : config.copyLayout === 'DualStacked' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>{renderSingleSlipPreview(config.firstCopyTitle || 'Office Copy')}</div>
                  {config.showCuttingLine && (
                    <div style={{ borderTop: '1px dashed #94a3b8', textAlign: 'center', margin: '4px 0' }}>
                      <span style={{ backgroundColor: '#ffffff', padding: '0 8px', fontSize: '10px', color: '#64748b' }}>
                        ✂ Cut Along Line
                      </span>
                    </div>
                  )}
                  <div>{renderSingleSlipPreview(config.secondCopyTitle || 'Student Copy')}</div>
                </div>
              ) : (
                <div>{renderSingleSlipPreview('')}</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeeSlipDesignerPage;
