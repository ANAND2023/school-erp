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
import { superAdminApi } from '../api/superAdminApi';
import { printElement } from '../../../utils/printUtils';

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
  { label: 'Georgia / Times (Classic Formal Form)', value: 'Georgia, "Times New Roman", Times, serif' },
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Arial / System Standard', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Poppins (Geometric & Friendly)', value: 'Poppins, sans-serif' },
  { label: 'Roboto (Balanced Neo-Grotesque)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Premium Bold)', value: 'Montserrat, sans-serif' },
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

const COPY_LAYOUT_OPTIONS = [
  { label: 'Single Form / Slip (Standard 1 Copy per Page)', value: 'SingleCopy' },
  { label: 'Dual Copies Side-by-Side (A4 Half Sheet with Scissor Line)', value: 'DualSideBySide' },
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

export const RegistrationSlipDesignerPage = () => {
  const toastRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [activeTab, setActiveTab] = useState('header');
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Registration Slip Config State
  const [config, setConfig] = useState({
    schoolId: null,
    schoolName: 'Platform Default (All Schools)',
    isSchoolOverride: false,

    // Colors & Fonts
    primaryColor: '#1e3a8a',
    secondaryColor: '#eff6ff',
    accentColor: '#172554',
    borderColor: '#1e3a8a',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    fontScale: 'Normal',
    baseFontSize: 11,
    fontScalePercent: 100,
    headerLayout: 'Classic',
    borderStyle: 'Solid',

    // Sizing Controls
    logoSize: 52,
    photoWidth: 60,
    photoHeight: 70,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargin: '6mm',
    pagePadding: 16,
    pageMaxWidth: 820,

    // Header Customization
    headerSchoolNameCustom: '',
    headerSchoolNameFontSize: 20,
    headerSchoolNameColor: '#0f172a',
    headerSchoolNameFontWeight: '900',
    headerSchoolNameFontFamily: 'inherit',
    headerSchoolNameTransform: 'uppercase',
    headerSchoolNameLetterSpacing: '0.8px',

    headerSubtitleCustom: '',
    headerSubtitleFontSize: 12,
    headerSubtitleColor: '#475569',
    headerSubtitleFontWeight: '600',

    headerAddressCustom: '',
    headerAddressFontSize: 10,
    headerAddressColor: '#64748b',

    headerAlignment: 'center',
    headerBgColor: 'transparent',
    headerPaddingY: 6,
    headerDividerStyle: 'Solid',
    headerDividerColor: '#0f172a',

    // Slip Title Badge
    slipTitle: 'New Student Registration Form & Slip',
    slipSubtitle: 'PLEASE PRINT LEGIBLY • OFFICIAL RECORD COPY',
    slipTitleBgColor: '#1e3a8a',
    slipTitleTextColor: '#ffffff',
    slipTitleFontSize: 13,

    // Watermark
    watermarkText: 'REGISTERED / OFFICIAL',
    showWatermark: false,

    // Copy Layout & Titles (Default: SingleCopy = 1 Copy)
    copyLayout: 'SingleCopy',
    showCuttingLine: false,
    firstCopyTitle: 'Official Record Copy',
    secondCopyTitle: 'Student Copy',
    thirdCopyTitle: 'Bank Copy',
    currencySymbol: '₹',

    // Feature Toggles
    showSchoolLogo: true,
    showAffiliationNo: true,
    showStudentPhoto: false,
    showSchoolSealBox: true,
    showQrCode: false,
    showAmountInWords: true,
    showPaymentMode: true,
    showPreviousSchool: true,
    showFeeBreakdownTable: true,
    showBalanceDue: true,
    showTerms: true,

    // Signatures
    showSignatures: true,
    signature1: 'Candidate / Parent Signature',
    signature2: 'Authorized Signatory',
    signature3: 'Verification Officer',

    // Content Texts
    termsTitle: 'Declaration & Undertaking:',
    termsText:
      'I hereby certify that all the information provided in this registration form is genuine and accurate. I understand that registration does not guarantee admission until all eligibility conditions, document verification, and fee requirements are fulfilled.',
    footerText: 'Official Student Registration Record • Digital Vidya Sarthi (DVS ERP)',

    // Sections
    sections: [
      { key: 'header', title: 'School Header & Affiliation', visible: true, order: 1 },
      { key: 'meta_bar', title: 'Registration Reference & Status Bar', visible: true, order: 2 },
      { key: 'student_details', title: 'Student Information (Fillable Form Lines)', visible: true, order: 3 },
      { key: 'parents_details', title: 'Parent & Guardian Information', visible: true, order: 4 },
      { key: 'fee_breakdown', title: 'Registration Fee & Payment Details Table', visible: true, order: 5 },
      { key: 'payment_summary', title: 'Amount in Words & Totals Summary', visible: true, order: 6 },
      { key: 'terms', title: 'Declaration & Undertaking', visible: true, order: 7 },
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
      const res = await superAdminApi.getRegistrationSlipConfig(schoolId);
      if (res?.success && res.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data,
          copyLayout: res.data.copyLayout || 'SingleCopy',
          headerSchoolNameCustom: res.data.headerSchoolNameCustom || '',
          headerSchoolNameFontSize: res.data.headerSchoolNameFontSize || 20,
          headerSchoolNameColor: res.data.headerSchoolNameColor || '#0f172a',
          headerSchoolNameFontWeight: res.data.headerSchoolNameFontWeight || '900',
          headerSchoolNameFontFamily: res.data.headerSchoolNameFontFamily || 'inherit',
          headerSchoolNameTransform: res.data.headerSchoolNameTransform || 'uppercase',
          headerSchoolNameLetterSpacing: res.data.headerSchoolNameLetterSpacing || '0.8px',
          headerSubtitleCustom: res.data.headerSubtitleCustom || '',
          headerSubtitleFontSize: res.data.headerSubtitleFontSize || 12,
          headerSubtitleColor: res.data.headerSubtitleColor || '#475569',
          headerAddressCustom: res.data.headerAddressCustom || '',
          headerAddressFontSize: res.data.headerAddressFontSize || 10,
          headerAddressColor: res.data.headerAddressColor || '#64748b',
          headerAlignment: res.data.headerAlignment || 'center',
          headerBgColor: res.data.headerBgColor || 'transparent',
          headerPaddingY: res.data.headerPaddingY || 6,
          headerDividerStyle: res.data.headerDividerStyle || 'Solid',
          headerDividerColor: res.data.headerDividerColor || '#0f172a',
          slipTitle: res.data.slipTitle || 'New Student Registration Form & Slip',
          slipTitleBgColor: res.data.slipTitleBgColor || res.data.primaryColor || '#1e3a8a',
          slipTitleTextColor: res.data.slipTitleTextColor || '#ffffff',
          slipTitleFontSize: res.data.slipTitleFontSize || 13,
          logoSize: res.data.logoSize || 52,
          photoWidth: res.data.photoWidth || 60,
          photoHeight: res.data.photoHeight || 70,
          baseFontSize: res.data.baseFontSize || 11,
          fontScalePercent: res.data.fontScalePercent || 100,
          pageSize: res.data.pageSize || 'A4',
          pageOrientation: res.data.pageOrientation || 'portrait',
          pageMargin: res.data.pageMargin || '6mm',
          pagePadding: res.data.pagePadding || 16,
          pageMaxWidth: res.data.pageMaxWidth || 820,
          showCuttingLine: res.data.showCuttingLine !== undefined ? res.data.showCuttingLine : false,
          firstCopyTitle: res.data.firstCopyTitle || 'Official Record Copy',
          secondCopyTitle: res.data.secondCopyTitle || 'Student Copy',
          thirdCopyTitle: res.data.thirdCopyTitle || 'Bank Copy',
          currencySymbol: res.data.currencySymbol || '₹',
          signature1: res.data.signature1 || 'Candidate / Parent Signature',
          signature2: res.data.signature2 || 'Authorized Signatory',
          signature3: res.data.signature3 || 'Verification Officer',
          showFeeBreakdownTable: res.data.showFeeBreakdownTable !== undefined ? res.data.showFeeBreakdownTable : true,
          termsTitle: res.data.termsTitle || res.data.declarationTitle || 'Declaration & Undertaking:',
          termsText:
            res.data.termsText ||
            res.data.declarationText ||
            'I hereby certify that all the information provided in this registration form is genuine and accurate. I understand that registration does not guarantee admission until all eligibility conditions, document verification, and fee requirements are fulfilled.',
        }));
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load registration slip configuration',
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await superAdminApi.saveRegistrationSlipConfig(config, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Saved Successfully',
          detail: selectedSchoolId
            ? `Custom registration slip saved for school #${selectedSchoolId}`
            : 'Platform default registration slip template updated',
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
      const res = await superAdminApi.resetRegistrationSlipConfig(selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Reset Successful',
          detail: 'School registration slip reset to platform default',
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
    printElement('printable-registration-form-preview', {
      title: `Registration_Form_${config.schoolName || 'Template'}`,
      pageSize: config.pageSize || 'A4',
      orientation: 'portrait',
      margin: '8mm',
      padding: '8mm',
    });
  };

  // Mock registration data for live preview
  const selectedSchool = selectedSchoolId ? schools.find((s) => s.id === selectedSchoolId) : null;
  const defaultSchoolName = selectedSchool?.name || 'KUSH PUBLIC SCHOOL';

  const mockReg = {
    slipNo: 'REG-2026-0042',
    slipDate: '14-10-2026',
    studentName: 'AARAV SHARMA',
    className: 'Class 9 - Section A',
    session: '2026-2027',
    fatherName: 'RAJESH SHARMA',
    motherName: 'POOJA SHARMA',
    contact: '9911360909',
    gender: 'Male',
    dob: '14-10-2012',
    address: 'Plot No 999, Main Road Surya Vihar, Sec 91',
    city: 'Greater Noida',
    state: 'UP',
    pincode: '201306',
    email: 'aarav.sharma@example.com',
    previousSchool: 'St. Xavier Senior Secondary School',
    paymentMode: 'Cash / UPI',
    transactionRef: 'UPI/294029410294',
    feeAmount: 500,
    paidAmount: 500,
    balanceAmount: 0,
    amountInWords: 'Five Hundred Rupees Only',
  };

  const cleanVal = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (str === 'N/A' || str === 'n/a' || str === 'null' || str === 'undefined') return '';
    return str;
  };

  const UnderlineVal = ({ value, minWidth = '30px' }) => {
    const displayVal = cleanVal(value);
    return (
      <span
        style={{
          borderBottom: '1px solid #1e293b',
          flex: 1,
          minWidth: minWidth,
          display: 'inline-block',
          padding: '0 4px 1px 4px',
          fontWeight: 600,
          color: '#0f172a',
          marginLeft: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
        }}
        title={displayVal}
      >
        {displayVal || '\u00A0'}
      </span>
    );
  };

  // Render a Single Copy Form Slip (matching the uploaded image with payment details at the bottom)
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
          padding: `${config.pagePadding || 16}px`,
          fontFamily: config.fontFamily || 'Georgia, "Times New Roman", Times, serif',
          color: '#0f172a',
          fontSize: `${config.baseFontSize || 11}px`,
          lineHeight: 1.45,
          backgroundColor: '#ffffff',
          border: `1.5px solid ${config.borderColor || '#1e3a8a'}`,
          borderRadius: '4px',
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
            {config.watermarkText || 'REGISTERED / OFFICIAL'}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          {isVisible('header') && (
            <div
              onClick={() => setActiveTab('header')}
              title="Click to edit school header & typography"
              style={{
                textAlign: 'center',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '8px',
                marginBottom: '10px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '4px' }}>
                {config.showSchoolLogo && (
                  <div
                    style={{
                      width: `${config.logoSize || 52}px`,
                      height: `${config.logoSize || 52}px`,
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
                    <i className="pi pi-book" style={{ fontSize: `${(config.logoSize || 52) * 0.4}px` }}></i>
                  </div>
                )}

                <div>
                  <div
                    style={{
                      fontSize: `${config.headerSchoolNameFontSize || 20}px`,
                      fontWeight: config.headerSchoolNameFontWeight || '900',
                      textTransform: config.headerSchoolNameTransform || 'uppercase',
                      letterSpacing: config.headerSchoolNameLetterSpacing || '0.8px',
                      color: config.headerSchoolNameColor || '#0f172a',
                      lineHeight: 1.15,
                    }}
                  >
                    {config.headerSchoolNameCustom || defaultSchoolName}
                  </div>

                  {config.showAffiliationNo && (
                    <div style={{ fontSize: `${config.headerSubtitleFontSize || 12}px`, color: config.headerSubtitleColor || '#475569', fontWeight: 600, marginTop: '2px' }}>
                      {config.headerSubtitleCustom || 'Affiliated to CBSE, New Delhi (Affiliation No: 2130892)'}
                    </div>
                  )}

                  <div style={{ fontSize: `${config.headerAddressFontSize || 10}px`, color: config.headerAddressColor || '#64748b' }}>
                    {config.headerAddressCustom || 'Plot No 999, Main Road Surya Vihar, Sec 91 • Helpline: +91 9911360909'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 900,
                  marginTop: '6px',
                  color: config.primaryColor || '#1e3a8a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {config.slipTitle || 'New Student Registration Form & Slip'}
              </div>
              <div style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 700, color: '#475569', marginTop: '1px' }}>
                {config.slipSubtitle || 'PLEASE PRINT LEGIBLY • OFFICIAL RECORD COPY'}
              </div>
            </div>
          )}

          {/* Form Meta Bar */}
          {isVisible('meta_bar') && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '4px 8px',
                marginBottom: '10px',
                fontSize: '10.5px',
              }}
            >
              <div>
                <b>Registration No:</b> <span style={{ fontFamily: 'monospace', fontWeight: 800, color: config.primaryColor }}>{mockReg.slipNo}</span>
              </div>
              <div>
                <b>Seeking Class:</b> <span style={{ fontWeight: 700 }}>{mockReg.className}</span>
              </div>
              <div>
                <b>Academic Session:</b> <span>{mockReg.session}</span>
              </div>
              <div>
                <b>Date:</b> <span>{mockReg.slipDate}</span>
              </div>
            </div>
          )}

          {/* Section: Student Information (Image-like fillable format) */}
          {isVisible('student_details') && (
            <div style={{ marginBottom: '10px' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  textDecoration: 'underline',
                  color: '#0f172a',
                  marginBottom: '8px',
                  textTransform: 'capitalize',
                }}
              >
                Student Information:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', columnGap: '12px', rowGap: '8px', alignItems: 'center' }}>
                <div style={{ gridColumn: 'span 7', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Student's Full Name:</span>
                  <UnderlineVal value={mockReg.studentName} />
                </div>
                <div style={{ gridColumn: 'span 5', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Seeking Class:</span>
                  <UnderlineVal value={mockReg.className} />
                </div>

                <div style={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>*Home Address:</span>
                  <UnderlineVal value={mockReg.address} />
                </div>

                <div style={{ gridColumn: 'span 5', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>City:</span>
                  <UnderlineVal value={mockReg.city} />
                </div>
                <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>State:</span>
                  <UnderlineVal value={mockReg.state} />
                </div>
                <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Zip Code:</span>
                  <UnderlineVal value={mockReg.pincode} />
                </div>

                <div style={{ gridColumn: 'span 6', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Student Email Address:</span>
                  <UnderlineVal value={mockReg.email} />
                </div>
                <div style={{ gridColumn: 'span 6', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Primary Contact Phone:</span>
                  <UnderlineVal value={mockReg.contact} />
                </div>

                <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Date of Birth:</span>
                  <UnderlineVal value={mockReg.dob} />
                </div>
                <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Gender:</span>
                  <UnderlineVal value={mockReg.gender} />
                </div>
                <div style={{ gridColumn: 'span 5', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Place of Birth:</span>
                  <UnderlineVal value={mockReg.city} />
                </div>

                {config.showPreviousSchool && (
                  <div style={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Previous School Attended:</span>
                    <UnderlineVal value={mockReg.previousSchool} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Parent / Guardian Information */}
          {isVisible('parents_details') && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  textDecoration: 'underline',
                  color: '#0f172a',
                  marginBottom: '8px',
                  textTransform: 'capitalize',
                }}
              >
                Parent / Guardian Information:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', columnGap: '12px', rowGap: '8px', alignItems: 'center' }}>
                <div style={{ gridColumn: 'span 7', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Father / Guardian Name:</span>
                  <UnderlineVal value={mockReg.fatherName} />
                </div>
                <div style={{ gridColumn: 'span 5', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Cell Phone:</span>
                  <UnderlineVal value="" />
                </div>

                <div style={{ gridColumn: 'span 7', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Mother / Guardian Name:</span>
                  <UnderlineVal value={mockReg.motherName} />
                </div>
                <div style={{ gridColumn: 'span 5', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Cell Phone:</span>
                  <UnderlineVal value="" />
                </div>
              </div>
            </div>
          )}

          {/* Section: Registration Fee & Payment Details (niche payment details add kr dena) */}
          {isVisible('fee_breakdown') && config.showFeeBreakdownTable && (
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
                      {mockReg.feeAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b', fontWeight: 700, color: '#0f766e' }}>
                      {mockReg.paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', borderRight: '1px solid #1e293b', fontWeight: 700, color: '#15803d' }}>
                      {mockReg.balanceAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                      {mockReg.paymentMode}
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                      <span style={{ fontWeight: 800, color: '#15803d' }}>Paid</span>
                    </td>
                  </tr>

                  {/* Summary / Total Row */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '1.5px solid #1e293b' }}>
                    <td colSpan={2} style={{ padding: '4px 8px', borderRight: '1px solid #1e293b' }}>
                      TOTAL AMOUNT PAID: {cur} {mockReg.paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} style={{ padding: '4px 8px', borderRight: '1px solid #1e293b', textAlign: 'right', color: '#15803d' }}>
                      BALANCE DUE: {cur} {mockReg.balanceAmount.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} style={{ padding: '4px 8px', textAlign: 'center', fontSize: '9.5px', color: '#475569' }}>
                      Ref / Txn No: <b>{mockReg.transactionRef}</b>
                    </td>
                  </tr>
                </tbody>
              </table>

              {config.showAmountInWords && (
                <div style={{ fontSize: '10.5px', marginBottom: '8px' }}>
                  <b>Amount in Words:</b>{' '}
                  <span style={{ textTransform: 'capitalize', borderBottom: '1px dotted #64748b', paddingBottom: '1px' }}>
                    {mockReg.amountInWords}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section: Declaration / Undertaking */}
          {isVisible('terms') && config.showTerms && (
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
                {config.termsTitle || 'Declaration & Undertaking:'}
              </div>
              <div
                style={{
                  fontSize: '9.5px',
                  color: '#334155',
                  lineHeight: 1.35,
                  fontStyle: 'italic',
                }}
              >
                {config.termsText}
              </div>
            </div>
          )}

          {/* Section: Signatures */}
          {isVisible('signatures') && config.showSignatures && (
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
                  {config.signature1 || 'Candidate / Parent Signature'}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Date: {mockReg.slipDate}</div>
              </div>

              {config.showSchoolSealBox && (
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
                  {config.signature2 || 'Authorized Signatory'}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>School Admission Office</div>
              </div>
            </div>
          )}

          {/* Footer Note */}
          {isVisible('footer') && (
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
            <h1 className="text-2xl font-bold text-900 m-0">Dynamic Registration Slip Designer</h1>
            <Tag value="School-Wise & Global" severity="info" rounded></Tag>
          </div>
          <p className="text-500 text-sm m-0 mt-1">
            Customize header branding, form layout, registration fee particulars table, terms, and sections.
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
                { id: 'copies', label: 'Copy & Form Mode', icon: 'pi pi-copy' },
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
                  <label className="text-sm font-medium text-700">Custom School Name Override</label>
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
                      min="14"
                      max="32"
                      value={config.headerSchoolNameFontSize || 20}
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
                        value={config.headerSchoolNameColor || '#0f172a'}
                        onChange={(e) => setConfig({ ...config, headerSchoolNameColor: e.target.value })}
                        style={{ width: '38px', height: '34px', padding: 0, cursor: 'pointer', border: 'none' }}
                      />
                      <InputText
                        value={config.headerSchoolNameColor || '#0f172a'}
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

                {/* School Header Content & Details Section */}
                <div className="p-3 bg-blue-50 border-round border-1 border-blue-200">
                  <div className="flex align-items-center justify-content-between mb-2">
                    <span className="font-bold text-sm text-900 flex align-items-center gap-2">
                      <i className="pi pi-building text-primary"></i> School Header Content & Details
                    </span>
                    <span className="text-xs text-600 bg-white px-2 py-1 border-round border-1 border-200">
                      Scope: {selectedSchool?.name || 'Platform Default School'}
                    </span>
                  </div>
                  <p className="text-xs text-600 m-0 mb-3">
                    Configure which school details appear in the registration slip top header, how they are formatted, and customize any line manually.
                  </p>

                  {/* Header Visibility Toggles */}
                  <div className="grid mb-3">
                    <div className="col-12 md:col-6">
                      <div className="flex align-items-center justify-content-between p-2 bg-white border-round border-1 border-200">
                        <span className="text-xs font-semibold text-700">Show Subtitle / Affiliation</span>
                        <InputSwitch
                          checked={config.showAffiliationNo !== false}
                          onChange={(e) => setConfig({ ...config, showAffiliationNo: e.value })}
                        />
                      </div>
                    </div>
                    <div className="col-12 md:col-6">
                      <div className="flex align-items-center justify-content-between p-2 bg-white border-round border-1 border-200">
                        <span className="text-xs font-semibold text-700">Show School Logo</span>
                        <InputSwitch
                          checked={config.showSchoolLogo !== false}
                          onChange={(e) => setConfig({ ...config, showSchoolLogo: e.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 1: School Name */}
                  <div className="field mb-3">
                    <div className="flex justify-content-between align-items-center mb-1">
                      <label className="text-xs font-bold text-800">1. Institution / School Name:</label>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, headerSchoolNameCustom: defaultSchoolName })}
                        className="text-xs text-primary underline border-none bg-transparent cursor-pointer p-0"
                      >
                        Reset to "{defaultSchoolName}"
                      </button>
                    </div>
                    <InputText
                      value={config.headerSchoolNameCustom || ''}
                      onChange={(e) => setConfig({ ...config, headerSchoolNameCustom: e.target.value })}
                      placeholder={`e.g. ${defaultSchoolName}`}
                      className="w-full p-inputtext-sm bg-white"
                    />
                  </div>

                  {/* Field 2: Subtitle / Affiliation & Board */}
                  <div className="field mb-3">
                    <div className="flex justify-content-between align-items-center mb-1">
                      <label className="text-xs font-bold text-800">2. Affiliation & Accreditation Subtitle:</label>
                      <span className="text-xs text-500">Quick Presets below</span>
                    </div>
                    <InputText
                      value={config.headerSubtitleCustom || ''}
                      onChange={(e) => setConfig({ ...config, headerSubtitleCustom: e.target.value })}
                      placeholder="e.g. Affiliated to CBSE, New Delhi (Affiliation No: 2130892)"
                      className="w-full p-inputtext-sm bg-white mb-2"
                    />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-500 align-self-center mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerSubtitleCustom: `Affiliated to CBSE, New Delhi (Affiliation No: ${selectedSchool?.affiliationNumber || '2130892'})`,
                          })
                        }
                        className="p-1 px-2 text-xs border-1 border-300 border-round bg-white hover:bg-100 cursor-pointer text-700"
                      >
                        CBSE Standard
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerSubtitleCustom: `Recognized by Govt. of NCT Delhi & Affiliated to CBSE (Affiliation No: ${selectedSchool?.affiliationNumber || '2130892'})`,
                          })
                        }
                        className="p-1 px-2 text-xs border-1 border-300 border-round bg-white hover:bg-100 cursor-pointer text-700"
                      >
                        Recognized & CBSE
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerSubtitleCustom: `Affiliated to CISCE, New Delhi (School Code: ${selectedSchool?.affiliationNumber || 'UP-092'})`,
                          })
                        }
                        className="p-1 px-2 text-xs border-1 border-300 border-round bg-white hover:bg-100 cursor-pointer text-700"
                      >
                        ICSE / CISCE
                      </button>
                    </div>
                  </div>

                  {/* Field 3: Address & Phone */}
                  <div className="field mb-1">
                    <div className="flex justify-content-between align-items-center mb-1">
                      <label className="text-xs font-bold text-800">3. Campus Address & Contact Numbers:</label>
                      <span className="text-xs text-500">Quick Presets below</span>
                    </div>
                    <InputText
                      value={config.headerAddressCustom || ''}
                      onChange={(e) => setConfig({ ...config, headerAddressCustom: e.target.value })}
                      placeholder="e.g. Plot No 999, Main Road Surya Vihar, Sec 91 • Phone: +91 9911360909"
                      className="w-full p-inputtext-sm bg-white mb-2"
                    />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-500 align-self-center mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const addr = [selectedSchool?.address, selectedSchool?.city, selectedSchool?.state, selectedSchool?.pincode]
                            .filter(Boolean)
                            .join(', ') || 'Main Campus, Educational Zone';
                          const ph = [selectedSchool?.contactNumber, selectedSchool?.alternateContactNumber].filter(Boolean).join(', ') || '+91 9911360909';
                          setConfig({ ...config, headerAddressCustom: `${addr} • Phone: ${ph}` });
                        }}
                        className="p-1 px-2 text-xs border-1 border-300 border-round bg-white hover:bg-100 cursor-pointer text-700"
                      >
                        Full Address + Phones
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const addr = [selectedSchool?.address, selectedSchool?.city, selectedSchool?.state].filter(Boolean).join(', ') || 'Main Campus';
                          setConfig({ ...config, headerAddressCustom: addr });
                        }}
                        className="p-1 px-2 text-xs border-1 border-300 border-round bg-white hover:bg-100 cursor-pointer text-700"
                      >
                        Address Only
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ph = [selectedSchool?.contactNumber, selectedSchool?.alternateContactNumber].filter(Boolean).join(', ') || '+91 9911360909';
                          setConfig({ ...config, headerAddressCustom: `Helpline: ${ph}` });
                        }}
                        className="p-1 px-2 text-xs border-1 border-300 border-round bg-white hover:bg-100 cursor-pointer text-700"
                      >
                        Phones Only
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Layout & Sizing */}
            {activeTab === 'layout' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Page Sizing & Orientation</h3>
                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Paper Page Size</label>
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
                      value={config.pageMargin || '6mm'}
                      options={PAGE_MARGIN_OPTIONS}
                      onChange={(e) => setConfig({ ...config, pageMargin: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Border Color</label>
                    <div className="flex gap-2 align-items-center">
                      <input
                        type="color"
                        value={config.borderColor || '#1e3a8a'}
                        onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                        style={{ width: '38px', height: '34px', padding: 0, cursor: 'pointer', border: 'none' }}
                      />
                      <InputText
                        value={config.borderColor || '#1e3a8a'}
                        onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                        className="p-inputtext-sm w-full"
                      />
                    </div>
                  </div>
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Typography & Dimensions</h3>
                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Base Font Family</label>
                    <Dropdown
                      value={config.fontFamily || 'Georgia, "Times New Roman", Times, serif'}
                      options={FONT_OPTIONS}
                      onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Base Text Size (px): {config.baseFontSize}px</label>
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
                    <label className="text-xs font-medium text-700">School Logo Size: {config.logoSize}px</label>
                    <input
                      type="range"
                      min="30"
                      max="80"
                      value={config.logoSize || 52}
                      onChange={(e) => setConfig({ ...config, logoSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Inner Box Padding: {config.pagePadding}px</label>
                    <input
                      type="range"
                      min="8"
                      max="24"
                      value={config.pagePadding || 16}
                      onChange={(e) => setConfig({ ...config, pagePadding: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Copy & Form Mode */}
            {activeTab === 'copies' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Print Copy Mode</h3>
                <div className="field mb-3">
                  <label className="text-xs font-medium text-700">Copy Layout Mode</label>
                  <Dropdown
                    value={config.copyLayout || 'SingleCopy'}
                    options={COPY_LAYOUT_OPTIONS}
                    onChange={(e) => setConfig({ ...config, copyLayout: e.value })}
                    className="w-full p-dropdown-sm"
                  />
                  <small className="text-500">
                    Single Form (1 Copy) prints a standard official registration form slip with payment details at the bottom.
                  </small>
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Form Title</label>
                  <InputText
                    value={config.slipTitle || 'New Student Registration Form & Slip'}
                    onChange={(e) => setConfig({ ...config, slipTitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Form Subtitle / Note</label>
                  <InputText
                    value={config.slipSubtitle || 'PLEASE PRINT LEGIBLY • OFFICIAL RECORD COPY'}
                    onChange={(e) => setConfig({ ...config, slipSubtitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Watermark Text</h3>
                <div className="flex align-items-center justify-content-between p-2 border-1 border-200 border-round mb-2">
                  <span className="text-sm font-medium text-700">Enable Diagonal Watermark</span>
                  <InputSwitch
                    checked={config.showWatermark}
                    onChange={(e) => setConfig({ ...config, showWatermark: e.value })}
                  />
                </div>
                {config.showWatermark && (
                  <div className="field mb-2">
                    <label className="text-xs font-medium text-700">Watermark Text</label>
                    <InputText
                      value={config.watermarkText || 'REGISTERED / OFFICIAL'}
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
                <h3 className="text-base font-semibold text-800 m-0 mb-2">Elements Visibility Toggles</h3>

                {[
                  { key: 'showSchoolLogo', label: 'School Logo in Header' },
                  { key: 'showAffiliationNo', label: 'Affiliation & Subtitle in Header' },
                  { key: 'showPreviousSchool', label: 'Previous School Attended Field' },
                  { key: 'showFeeBreakdownTable', label: 'Registration Fee & Payment Details Table (Bottom)' },
                  { key: 'showAmountInWords', label: 'Amount in Words Line' },
                  { key: 'showBalanceDue', label: 'Balance Due Field' },
                  { key: 'showPaymentMode', label: 'Payment Mode & Transaction Reference' },
                  { key: 'showSchoolSealBox', label: 'School Seal / Stamp Box' },
                  { key: 'showTerms', label: 'Declaration & Undertaking Text' },
                  { key: 'showSignatures', label: 'Signatures (Parent & Authorized Signatory)' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex align-items-center justify-content-between p-2 border-1 border-100 border-round hover:surface-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-700">{item.label}</span>
                    <InputSwitch
                      checked={config[item.key] !== false}
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
                      value={config.signature1 || 'Candidate / Parent Signature'}
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

                <h3 className="text-base font-semibold text-800 m-0">Declaration & Undertaking</h3>
                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Declaration Heading</label>
                  <InputText
                    value={config.termsTitle || 'Declaration & Undertaking:'}
                    onChange={(e) => setConfig({ ...config, termsTitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Declaration Text</label>
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
                  Use the up/down arrows or drag rows to change the sequence of slip sections.
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
                  value={
                    config.copyLayout === 'SingleCopy'
                      ? '1 Copy (Official Form Slip)'
                      : config.copyLayout === 'DualSideBySide'
                      ? 'Dual A4 (Side-by-Side)'
                      : 'Dual Stacked'
                  }
                  severity="primary"
                />
              </div>
            }
          >
            <div
              id="printable-registration-form-preview"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '8px',
                borderRadius: '4px',
                maxHeight: '80vh',
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

export default RegistrationSlipDesignerPage;
