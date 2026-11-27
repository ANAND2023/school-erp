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
import { printElement, downloadElementAsPdf, sanitizeFileName } from '../../../utils/printUtils';

const PRESET_PALETTES = [
  { name: 'Teal Elegance', primary: '#0f766e', secondary: '#f0fdfa', accent: '#115e59', border: '#0f766e' },
  { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#eff6ff', accent: '#172554', border: '#1e3a8a' },
  { name: 'Crimson Heritage', primary: '#991b1b', secondary: '#fef2f2', accent: '#7f1d1d', border: '#991b1b' },
  { name: 'Forest Emerald', primary: '#065f46', secondary: '#ecfdf5', accent: '#064e3b', border: '#065f46' },
  { name: 'Imperial Violet', primary: '#581c87', secondary: '#faf5ff', accent: '#3b0764', border: '#581c87' },
  { name: 'Slate Executive', primary: '#1e293b', secondary: '#f8fafc', accent: '#0f172a', border: '#334155' },
  { name: 'Amber Gold', primary: '#b45309', secondary: '#fffbeb', accent: '#78350f', border: '#b45309' },
];

const FONT_OPTIONS = [
  { label: 'Inherit Slip Font', value: 'inherit' },
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Poppins (Geometric & Friendly)', value: 'Poppins, sans-serif' },
  { label: 'Roboto (Balanced Neo-Grotesque)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Premium Bold)', value: 'Montserrat, sans-serif' },
  { label: 'Playfair Display (Prestigious Serif)', value: '"Playfair Display", Georgia, serif' },
  { label: 'Segoe UI (System Standard)', value: '"Segoe UI", -apple-system, sans-serif' },
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
  { label: 'Slightly Spaced (0.8px)', value: '0.8px' },
  { label: 'Wide (1.5px)', value: '1.5px' },
  { label: 'Extra Spacious (2.5px)', value: '2.5px' },
];

const HEADER_LAYOUTS = [
  { label: 'Classic Centered', value: 'Classic', desc: 'Centered school logo and details with double-line divider' },
  { label: 'Modern Side-by-Side', value: 'Modern', desc: 'Logo on left, school details center, enquiry badge & QR on right' },
  { label: 'Solid Color Banner', value: 'Banner', desc: 'Full-bleed primary colored header with bold white text' },
  { label: 'Clean Minimalist', value: 'Minimal', desc: 'Understated light header with crisp thin dividers' },
];

const HEADER_DIVIDER_OPTIONS = [
  { label: 'Double Line (2.5px)', value: 'Double' },
  { label: 'Solid Line (2px)', value: 'Solid' },
  { label: 'Dashed Outline (1.5px)', value: 'Dashed' },
  { label: 'No Bottom Line', value: 'None' },
];

const BORDER_STYLES = [
  { label: 'Solid Border (2px)', value: 'Solid' },
  { label: 'Double Border (3.5px)', value: 'Double' },
  { label: 'Dashed Outline (2px)', value: 'Dashed' },
  { label: 'Borderless / Clean', value: 'None' },
];

const PAGE_SIZE_OPTIONS = [
  { label: 'A4 Paper (210 × 297 mm - Standard Full Page)', value: 'A4' },
  { label: 'A5 Paper (148 × 210 mm - Half Sheet / Voucher)', value: 'A5' },
  { label: 'Letter (8.5 × 11 in)', value: 'Letter' },
];

const ORIENTATION_OPTIONS = [
  { label: 'Portrait (Vertical)', value: 'portrait' },
  { label: 'Landscape (Horizontal)', value: 'landscape' },
];

const PAGE_MARGIN_OPTIONS = [
  { label: 'Compact Margins (5mm / 0.2 in)', value: '5mm' },
  { label: 'Standard Margins (8mm / 0.3 in)', value: '8mm' },
  { label: 'Comfortable Margins (12mm / 0.5 in)', value: '12mm' },
  { label: 'Spacious Margins (16mm / 0.65 in)', value: '16mm' },
];

export const EnquirySlipDesignerPage = () => {
  const toastRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null); // null = Global default
  const [activeTab, setActiveTab] = useState('header'); // 'header' | 'sizing' | 'sections' | 'styling' | 'content'
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Enquiry Slip Config State
  const [config, setConfig] = useState({
    schoolId: null,
    schoolName: 'Platform Default (All Schools)',
    isSchoolOverride: false,

    // Colors & Borders
    primaryColor: '#0f766e',
    secondaryColor: '#f0fdfa',
    accentColor: '#115e59',
    borderColor: '#0f766e',
    fontFamily: 'Inter, sans-serif',
    headerLayout: 'Classic',
    borderStyle: 'Solid',

    // Full Header Customization (School Name font size, style, color, weight)
    headerSchoolNameCustom: '',
    headerSchoolNameFontSize: 24, // 14px to 42px
    headerSchoolNameColor: '#0f766e',
    headerSchoolNameFontWeight: '900',
    headerSchoolNameFontFamily: 'inherit',
    headerSchoolNameTransform: 'uppercase',
    headerSchoolNameLetterSpacing: '0.8px',

    headerSubtitleCustom: '',
    headerSubtitleFontSize: 13,
    headerSubtitleColor: '#475569',
    headerSubtitleFontWeight: '600',

    headerAddressCustom: '',
    headerAddressFontSize: 11,
    headerAddressColor: '#64748b',

    headerAlignment: 'center',
    headerBgColor: 'transparent',
    headerPaddingY: 10,
    headerDividerStyle: 'Double',
    headerDividerColor: '#0f766e',

    slipTitleBgColor: '#0f766e',
    slipTitleTextColor: '#ffffff',
    slipTitleFontSize: 12,

    // Sizing Controls
    logoSize: 52,
    photoWidth: 86,
    photoHeight: 104,
    baseFontSize: 13,
    fontScalePercent: 100,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargin: '8mm',
    pagePadding: 20,
    pageMaxWidth: 760,

    // Titles & Toggles
    slipTitle: 'Visitor & Admission Enquiry Slip',
    slipSubtitle: 'Official Visitor Acknowledgement & Follow-up Lead Slip',
    watermarkText: 'OFFICIAL ADMISSION ENQUIRY',
    showWatermark: false,
    showSchoolLogo: true,
    showAffiliationNo: true,
    showStudentPhotoBox: true,
    showSchoolSealBox: true,
    showQrCode: true,
    showNextFollowupDate: true,
    showCounselorRemarks: true,

    // Content texts
    instructionsTitle: 'IMPORTANT INSTRUCTIONS FOR PARENTS:',
    termsText:
      '• Admissions are processed on a first-come, first-served basis subject to seat availability in the sought class.\n• School admission desk is operational from Monday to Saturday, 9:00 AM to 2:00 PM.\n• For any enquiry queries or admission confirmation, please quote the Reference Number.',
    documentsRequired: [
      '1. Original Birth Certificate (Municipal Corp / Gram Panchayat)',
      '2. Student & Parents\' Aadhaar Cards (Photocopies)',
      '3. Transfer Certificate (TC) from Previous School (Countersigned)',
      '4. 4 Passport-size Photographs of Student & 2 of Parents',
      '5. Valid Address Proof (Electricity Bill / Voter ID / Passport)',
    ],
    footerText: 'Generated from DVS ERP (Digital Vidya Sarthi) • Official Enquiry Acknowledgement Slip',
    sections: [
      { key: 'header', title: 'School Header & Affiliation', visible: true, order: 1 },
      { key: 'meta_bar', title: 'Enquiry Reference & Status Bar', visible: true, order: 2 },
      { key: 'student_guardian', title: 'Student & Guardian Information', visible: true, order: 3 },
      { key: 'discussion_notes', title: 'Discussion Notes & Follow-up', visible: true, order: 4 },
      { key: 'documents_checklist', title: 'Admission Documents Checklist', visible: true, order: 5 },
      { key: 'instructions', title: 'Parent Guidelines & Terms', visible: true, order: 6 },
      { key: 'signatures', title: 'Signatures & School Seal', visible: true, order: 7 },
      { key: 'footer', title: 'Footer System Note', visible: true, order: 8 },
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
      const res = await superAdminApi.getEnquirySlipConfig(schoolId);
      if (res?.success && res.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data,
          headerSchoolNameCustom: res.data.headerSchoolNameCustom || '',
          headerSchoolNameFontSize: res.data.headerSchoolNameFontSize || 24,
          headerSchoolNameColor: res.data.headerSchoolNameColor || res.data.primaryColor || '#0f766e',
          headerSchoolNameFontWeight: res.data.headerSchoolNameFontWeight || '900',
          headerSchoolNameFontFamily: res.data.headerSchoolNameFontFamily || 'inherit',
          headerSchoolNameTransform: res.data.headerSchoolNameTransform || 'uppercase',
          headerSchoolNameLetterSpacing: res.data.headerSchoolNameLetterSpacing || '0.8px',
          headerSubtitleCustom: res.data.headerSubtitleCustom || '',
          headerSubtitleFontSize: res.data.headerSubtitleFontSize || 13,
          headerSubtitleColor: res.data.headerSubtitleColor || '#475569',
          headerAddressCustom: res.data.headerAddressCustom || '',
          headerAddressFontSize: res.data.headerAddressFontSize || 11,
          headerAddressColor: res.data.headerAddressColor || '#64748b',
          headerAlignment: res.data.headerAlignment || 'center',
          headerBgColor: res.data.headerBgColor || 'transparent',
          headerPaddingY: res.data.headerPaddingY || 10,
          headerDividerStyle: res.data.headerDividerStyle || 'Double',
          headerDividerColor: res.data.headerDividerColor || res.data.borderColor || '#0f766e',
          slipTitleBgColor: res.data.slipTitleBgColor || res.data.primaryColor || '#0f766e',
          slipTitleTextColor: res.data.slipTitleTextColor || '#ffffff',
          slipTitleFontSize: res.data.slipTitleFontSize || 12,
          logoSize: res.data.logoSize || 52,
          photoWidth: res.data.photoWidth || 86,
          photoHeight: res.data.photoHeight || 104,
          baseFontSize: res.data.baseFontSize || 13,
          fontScalePercent: res.data.fontScalePercent || 100,
          pageSize: res.data.pageSize || 'A4',
          pageOrientation: res.data.pageOrientation || 'portrait',
          pageMargin: res.data.pageMargin || '8mm',
          pagePadding: res.data.pagePadding || 20,
          pageMaxWidth: res.data.pageMaxWidth || 760,
        }));
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load enquiry slip configuration',
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await superAdminApi.saveEnquirySlipConfig(config, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Saved Successfully',
          detail: selectedSchoolId
            ? `Custom enquiry slip saved for school #${selectedSchoolId}`
            : 'Platform default enquiry slip template updated',
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
      const res = await superAdminApi.resetEnquirySlipConfig(selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Reset Successful',
          detail: 'School enquiry slip reset to platform default',
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

  // Calculation helpers for live preview & print
  const fontMultiplier = (config.fontScalePercent || 100) / 100;
  const logoPx = config.logoSize || 52;
  const photoW = config.photoWidth || 86;
  const photoH = config.photoHeight || 104;
  const slipPadding = config.pagePadding || 20;
  const maxWidthPx = config.pageMaxWidth || 760;

  const getBorderCss = () => {
    switch (config.borderStyle) {
      case 'Solid':
        return `2px solid ${config.borderColor}`;
      case 'Double':
        return `3.5px double ${config.borderColor}`;
      case 'Dashed':
        return `2px dashed ${config.borderColor}`;
      case 'None':
        return '1px solid #e2e8f0';
      default:
        return `2px solid ${config.borderColor}`;
    }
  };

  const getHeaderDividerCss = () => {
    switch (config.headerDividerStyle) {
      case 'Double':
        return `2.5px double ${config.headerDividerColor || config.borderColor}`;
      case 'Solid':
        return `2px solid ${config.headerDividerColor || config.borderColor}`;
      case 'Dashed':
        return `1.5px dashed ${config.headerDividerColor || config.borderColor}`;
      case 'None':
        return 'none';
      default:
        return `2.5px double ${config.headerDividerColor || config.borderColor}`;
    }
  };

  // Trigger Isolated Print
  const handlePrintSlip = () => {
    printElement('printable-enquiry-slip', {
      title: `Enquiry_Slip_${config.schoolName || 'Template'}`,
      pageSize: config.pageSize || 'A4',
      orientation: config.pageOrientation || 'portrait',
      margin: '8mm',
      padding: '8mm',
    });
  };

  // Mock enquiry data for live preview
  const defaultSchoolName = selectedSchoolId
    ? schools.find((s) => s.id === selectedSchoolId)?.name || 'ST. XAVIER SENIOR SECONDARY SCHOOL'
    : 'DELHI PUBLIC SCHOOL';

  const mockEnquiry = {
    refNo: 'ENQ-2026-0042',
    dateTime: '14 Oct 2026, 11:30 AM',
    source: 'Walk-in Visit',
    statusText: 'Open / Under Review',
    statusColor: config.primaryColor,
    studentName: 'AARAV SHARMA',
    className: 'Class V - Emerald (CBSE)',
    guardianName: 'Rajesh Sharma (Father)',
    mobile: '+91 98765 43210',
    email: 'rajesh.sharma@example.com',
    academicSession: '2026-27',
    notes: 'Enquired about Science lab curriculum, bus transport route, and quarterly fee breakdown.',
    nextFollowup: '20 Oct 2026',
    schoolName: config.headerSchoolNameCustom?.trim() || defaultSchoolName,
    branchName: 'Main Campus',
    affiliation: config.headerSubtitleCustom?.trim() || 'Main Campus • Affiliated to CBSE, New Delhi (Affiliation No: 2130892)',
    address: config.headerAddressCustom?.trim() || 'Sector 12, RK Puram, New Delhi - 110022 | Helpline: +91 11 2617 8900 | Email: admissions@school.edu.in',
  };

  // Render individual preview section
  const renderPreviewSection = (sectionKey) => {
    switch (sectionKey) {
      case 'header': {
        const schoolNameFont = config.headerSchoolNameFontFamily === 'inherit' ? config.fontFamily : config.headerSchoolNameFontFamily;
        const schoolNamePx = Math.round((config.headerSchoolNameFontSize || 24) * fontMultiplier);
        const subPx = Math.round((config.headerSubtitleFontSize || 13) * fontMultiplier);
        const addrPx = Math.round((config.headerAddressFontSize || 11) * fontMultiplier);
        const badgePx = Math.round((config.slipTitleFontSize || 12) * fontMultiplier);

        const schoolNameStyle = {
          margin: 0,
          color: config.headerLayout === 'Banner' ? '#ffffff' : (config.headerSchoolNameColor || config.primaryColor),
          fontSize: `${schoolNamePx}px`,
          fontWeight: config.headerSchoolNameFontWeight || '900',
          fontFamily: schoolNameFont,
          textTransform: config.headerSchoolNameTransform || 'uppercase',
          letterSpacing: config.headerSchoolNameLetterSpacing || '0.8px',
          lineHeight: 1.15,
        };

        const subtitleStyle = {
          fontSize: `${subPx}px`,
          color: config.headerLayout === 'Banner' ? 'rgba(255,255,255,0.92)' : (config.headerSubtitleColor || '#475569'),
          fontWeight: config.headerSubtitleFontWeight || '600',
          marginTop: '2px',
        };

        const addressStyle = {
          fontSize: `${addrPx}px`,
          color: config.headerLayout === 'Banner' ? 'rgba(255,255,255,0.85)' : (config.headerAddressColor || '#64748b'),
          marginTop: '3px',
          lineHeight: 1.3,
        };

        const badgeStyle = {
          display: 'inline-block',
          marginTop: '8px',
          backgroundColor: config.headerLayout === 'Banner' ? 'rgba(255,255,255,0.22)' : (config.slipTitleBgColor || config.primaryColor),
          color: config.slipTitleTextColor || '#ffffff',
          padding: '3px 16px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: `${badgePx}px`,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
        };

        if (config.headerLayout === 'Banner') {
          return (
            <div
              key="header"
              style={{
                backgroundColor: config.primaryColor,
                color: '#ffffff',
                padding: `${config.headerPaddingY || 12}px 16px`,
                borderRadius: '6px',
                marginBottom: `${10 * fontMultiplier}px`,
                textAlign: config.headerAlignment || 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: config.headerAlignment === 'left' ? 'flex-start' : 'center',
                  gap: '14px',
                }}
              >
                {config.showSchoolLogo && (
                  <div
                    style={{
                      width: `${logoPx}px`,
                      height: `${logoPx}px`,
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: config.primaryColor,
                      fontSize: `${Math.round(logoPx * 0.45)}px`,
                      flexShrink: 0,
                    }}
                  >
                    <i className="pi pi-building"></i>
                  </div>
                )}
                <div>
                  <h2 style={schoolNameStyle}>{mockEnquiry.schoolName}</h2>
                  <div style={subtitleStyle}>{mockEnquiry.affiliation}</div>
                </div>
              </div>
              <div style={addressStyle}>{mockEnquiry.address}</div>
              <div style={badgeStyle}>{config.slipTitle}</div>
            </div>
          );
        }

        if (config.headerLayout === 'Modern') {
          return (
            <div
              key="header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: `${config.headerPaddingY || 10}px`,
                borderBottom: getHeaderDividerCss(),
                marginBottom: `${12 * fontMultiplier}px`,
                backgroundColor: config.headerBgColor !== 'transparent' ? config.headerBgColor : 'transparent',
                padding: config.headerBgColor !== 'transparent' ? '12px' : undefined,
                borderRadius: config.headerBgColor !== 'transparent' ? '6px' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {config.showSchoolLogo && (
                  <div
                    style={{
                      width: `${logoPx}px`,
                      height: `${logoPx}px`,
                      backgroundColor: config.secondaryColor,
                      border: `1.5px solid ${config.primaryColor}`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: config.primaryColor,
                      fontSize: `${Math.round(logoPx * 0.45)}px`,
                      flexShrink: 0,
                    }}
                  >
                    <i className="pi pi-building"></i>
                  </div>
                )}
                <div>
                  <h2 style={schoolNameStyle}>{mockEnquiry.schoolName}</h2>
                  <div style={subtitleStyle}>{mockEnquiry.affiliation}</div>
                  <div style={addressStyle}>{mockEnquiry.address}</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={badgeStyle}>{config.slipTitle}</span>
                {config.showQrCode && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      fontSize: `${0.65 * fontMultiplier}rem`,
                      color: '#64748b',
                      marginTop: '4px',
                    }}
                  >
                    <i className="pi pi-qrcode" style={{ fontSize: `${18 * fontMultiplier}px`, color: config.primaryColor }}></i>
                    <span>Verify QR</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Classic Layout (Default)
        return (
          <div
            key="header"
            style={{
              textAlign: config.headerAlignment || 'center',
              paddingTop: `${config.headerPaddingY || 4}px`,
              paddingBottom: `${config.headerPaddingY || 10}px`,
              borderBottom: getHeaderDividerCss(),
              marginBottom: `${12 * fontMultiplier}px`,
              backgroundColor: config.headerBgColor !== 'transparent' ? config.headerBgColor : 'transparent',
              paddingLeft: config.headerBgColor !== 'transparent' ? '12px' : undefined,
              paddingRight: config.headerBgColor !== 'transparent' ? '12px' : undefined,
              borderRadius: config.headerBgColor !== 'transparent' ? '6px' : undefined,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: config.headerAlignment === 'left' ? 'flex-start' : 'center',
                gap: '12px',
              }}
            >
              {config.showSchoolLogo && (
                <div
                  style={{
                    width: `${logoPx}px`,
                    height: `${logoPx}px`,
                    backgroundColor: config.secondaryColor,
                    border: `1.5px solid ${config.primaryColor}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: config.primaryColor,
                    fontSize: `${Math.round(logoPx * 0.45)}px`,
                    flexShrink: 0,
                  }}
                >
                  <i className="pi pi-building"></i>
                </div>
              )}
              <div>
                <h2 style={schoolNameStyle}>{mockEnquiry.schoolName}</h2>
                <div style={subtitleStyle}>{mockEnquiry.affiliation}</div>
              </div>
            </div>
            <div style={addressStyle}>{mockEnquiry.address}</div>
            <div style={badgeStyle}>{config.slipTitle}</div>
          </div>
        );
      }

      case 'meta_bar':
        return (
          <div
            key="meta_bar"
            style={{
              marginBottom: `${12 * fontMultiplier}px`,
              padding: `${8 * fontMultiplier}px ${12 * fontMultiplier}px`,
              backgroundColor: config.secondaryColor,
              borderRadius: '6px',
              border: `1.5px solid ${config.borderColor}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: `${0.65 * fontMultiplier}rem`,
                  color: '#64748b',
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Enquiry Ref No
              </span>
              <span style={{ fontSize: `${0.92 * fontMultiplier}rem`, fontWeight: 800, color: config.primaryColor }}>
                {mockEnquiry.refNo}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: `${0.65 * fontMultiplier}rem`,
                  color: '#64748b',
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Date & Time
              </span>
              <span style={{ fontSize: `${0.82 * fontMultiplier}rem`, fontWeight: 700, color: '#1e293b' }}>
                {mockEnquiry.dateTime}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: `${0.65 * fontMultiplier}rem`,
                  color: '#64748b',
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Enquiry Source
              </span>
              <span style={{ fontSize: `${0.82 * fontMultiplier}rem`, fontWeight: 700, color: '#1e293b' }}>
                {mockEnquiry.source}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: `${0.65 * fontMultiplier}rem`,
                  color: '#64748b',
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Status
              </span>
              <span style={{ fontSize: `${0.82 * fontMultiplier}rem`, fontWeight: 800, color: config.primaryColor }}>
                {mockEnquiry.statusText}
              </span>
            </div>
          </div>
        );

      case 'student_guardian':
        return (
          <div key="student_guardian" style={{ marginBottom: `${12 * fontMultiplier}px` }}>
            <div
              style={{
                backgroundColor: config.secondaryColor,
                borderLeft: `3px solid ${config.primaryColor}`,
                padding: '4px 8px',
                borderRadius: '0 4px 4px 0',
                fontWeight: 700,
                fontSize: `${0.74 * fontMultiplier}rem`,
                color: config.accentColor,
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>1. Prospective Student & Guardian Information</span>
              {config.showStudentPhotoBox && (
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  Photo Box: {photoW}×{photoH}px
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: `${8 * fontMultiplier}px ${14 * fontMultiplier}px`,
                }}
              >
                <div>
                  <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b' }}>Candidate / Student Name:</div>
                  <div
                    style={{
                      fontSize: `${0.9 * fontMultiplier}rem`,
                      fontWeight: 800,
                      color: '#0f172a',
                      textTransform: 'uppercase',
                    }}
                  >
                    {mockEnquiry.studentName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b' }}>Seeking Admission to Class:</div>
                  <div style={{ fontSize: `${0.88 * fontMultiplier}rem`, fontWeight: 800, color: config.primaryColor }}>
                    {mockEnquiry.className}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b' }}>Father / Guardian Name:</div>
                  <div style={{ fontSize: `${0.82 * fontMultiplier}rem`, fontWeight: 700, color: '#1e293b' }}>
                    {mockEnquiry.guardianName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b' }}>Primary Contact Mobile:</div>
                  <div style={{ fontSize: `${0.82 * fontMultiplier}rem`, fontWeight: 700, color: '#1e293b' }}>
                    {mockEnquiry.mobile}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b' }}>Email Address:</div>
                  <div style={{ fontSize: `${0.8 * fontMultiplier}rem`, color: '#334155' }}>{mockEnquiry.email}</div>
                </div>

                <div>
                  <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b' }}>Academic Session:</div>
                  <div style={{ fontSize: `${0.82 * fontMultiplier}rem`, fontWeight: 700, color: config.primaryColor }}>
                    {mockEnquiry.academicSession}
                  </div>
                </div>
              </div>

              {config.showStudentPhotoBox && (
                <div
                  style={{
                    width: `${photoW}px`,
                    height: `${photoH}px`,
                    border: '1.5px dashed #94a3b8',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    textAlign: 'center',
                    backgroundColor: '#fafafa',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className="pi pi-user" style={{ fontSize: `${Math.round(photoW * 0.28)}px`, color: '#94a3b8', marginBottom: '4px' }}></i>
                  <span style={{ fontSize: `${0.6 * fontMultiplier}rem`, color: '#64748b', lineHeight: 1.1 }}>
                    Affix Photo
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      case 'discussion_notes':
        return (
          <div key="discussion_notes" style={{ marginBottom: `${12 * fontMultiplier}px` }}>
            <div
              style={{
                backgroundColor: config.secondaryColor,
                borderLeft: `3px solid ${config.primaryColor}`,
                padding: '4px 8px',
                borderRadius: '0 4px 4px 0',
                fontWeight: 700,
                fontSize: `${0.74 * fontMultiplier}rem`,
                color: config.accentColor,
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              2. Discussion Notes & Follow-up
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: config.showNextFollowupDate ? '3fr 1.2fr' : '1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b', marginBottom: '3px' }}>
                  Counselor Notes / Inquiries Raised:
                </div>
                <div
                  style={{
                    padding: `${8 * fontMultiplier}px`,
                    minHeight: '44px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: `${0.78 * fontMultiplier}rem`,
                    color: '#334155',
                    lineHeight: 1.35,
                  }}
                >
                  {mockEnquiry.notes}
                </div>
              </div>

              {config.showNextFollowupDate && (
                <div>
                  <div style={{ fontSize: `${0.66 * fontMultiplier}rem`, color: '#64748b', marginBottom: '3px' }}>
                    Scheduled Follow-up Date:
                  </div>
                  <div
                    style={{
                      padding: `${8 * fontMultiplier}px`,
                      backgroundColor: config.secondaryColor,
                      border: `1px solid ${config.borderColor}`,
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: `${0.9 * fontMultiplier}rem`, fontWeight: 800, color: config.primaryColor }}>
                      {mockEnquiry.nextFollowup}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'documents_checklist':
        return (
          <div key="documents_checklist" style={{ marginBottom: `${12 * fontMultiplier}px` }}>
            <div
              style={{
                backgroundColor: config.secondaryColor,
                borderLeft: `3px solid ${config.primaryColor}`,
                padding: '4px 8px',
                borderRadius: '0 4px 4px 0',
                fontWeight: 700,
                fontSize: `${0.74 * fontMultiplier}rem`,
                color: config.accentColor,
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              3. Documents Required at Time of Admission
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px 12px',
                fontSize: `${0.74 * fontMultiplier}rem`,
                color: '#334155',
              }}
            >
              {config.documentsRequired?.map((doc, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: config.primaryColor, fontWeight: 900 }}>✔</span>
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'instructions':
        return (
          <div
            key="instructions"
            style={{
              marginBottom: `${12 * fontMultiplier}px`,
              padding: `${8 * fontMultiplier}px ${12 * fontMultiplier}px`,
              border: `1px dashed ${config.borderColor}`,
              borderRadius: '6px',
              backgroundColor: config.secondaryColor,
            }}
          >
            <div
              style={{
                fontSize: `${0.72 * fontMultiplier}rem`,
                fontWeight: 800,
                color: config.primaryColor,
                marginBottom: '4px',
                textTransform: 'uppercase',
              }}
            >
              {config.instructionsTitle}
            </div>
            <div
              style={{
                fontSize: `${0.68 * fontMultiplier}rem`,
                color: '#475569',
                lineHeight: 1.35,
                whiteSpace: 'pre-line',
              }}
            >
              {config.termsText}
            </div>
          </div>
        );

      case 'signatures':
        return (
          <div
            key="signatures"
            style={{
              marginTop: `${12 * fontMultiplier}px`,
              paddingTop: '6px',
              display: 'grid',
              gridTemplateColumns: config.showSchoolSealBox ? '1.2fr 1.2fr 1.2fr 1fr' : 'repeat(3, 1fr)',
              gap: '14px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: `${32 * fontMultiplier}px` }}></div>
              <div style={{ borderTop: '1px solid #475569', margin: '4px 0' }}></div>
              <div style={{ fontSize: `${0.74 * fontMultiplier}rem`, fontWeight: 700, color: '#1e293b' }}>
                Parent / Visitor Signature
              </div>
              <div style={{ fontSize: `${0.65 * fontMultiplier}rem`, color: '#64748b' }}>Date: 14-10-2026</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ height: `${32 * fontMultiplier}px` }}></div>
              <div style={{ borderTop: '1px solid #475569', margin: '4px 0' }}></div>
              <div style={{ fontSize: `${0.74 * fontMultiplier}rem`, fontWeight: 700, color: '#1e293b' }}>
                Admission Counselor
              </div>
              <div style={{ fontSize: `${0.65 * fontMultiplier}rem`, color: '#64748b' }}>Front-Desk Verification</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ height: `${32 * fontMultiplier}px` }}></div>
              <div style={{ borderTop: '1px solid #475569', margin: '4px 0' }}></div>
              <div style={{ fontSize: `${0.74 * fontMultiplier}rem`, fontWeight: 700, color: '#1e293b' }}>
                Principal / Authorized Signatory
              </div>
              <div style={{ fontSize: `${0.65 * fontMultiplier}rem`, color: '#64748b' }}>Official School Authorization</div>
            </div>

            {config.showSchoolSealBox && (
              <div
                style={{
                  border: '1.5px dashed #94a3b8',
                  borderRadius: '4px',
                  height: `${56 * fontMultiplier}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '4px',
                }}
              >
                <span style={{ fontSize: `${0.62 * fontMultiplier}rem`, color: '#64748b', fontWeight: 600 }}>
                  OFFICIAL SCHOOL SEAL
                </span>
              </div>
            )}
          </div>
        );

      case 'footer':
        return (
          <div
            key="footer"
            style={{
              marginTop: `${12 * fontMultiplier}px`,
              paddingTop: '6px',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'center',
              fontSize: `${0.66 * fontMultiplier}rem`,
              color: '#64748b',
            }}
          >
            {config.footerText}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-2 md:px-3 md:py-2" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Toast ref={toastRef} />

      {/* CSS PRINT MEDIA STYLES TO ENSURE 100% ISOLATION */}
      <style>
        {`
          @page {
            size: ${config.pageSize || 'A4'} ${config.pageOrientation || 'portrait'};
            margin: ${config.pageMargin || '8mm'};
          }
          @media print {
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
            .no-print,
            aside,
            header,
            nav,
            .p-toast,
            .p-card-header,
            button,
            .designer-controls-column {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              width: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .designer-preview-column,
            .designer-preview-column .p-card,
            .designer-preview-column .p-card-body,
            .designer-preview-column .p-card-content {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
            }
            .designer-preview-canvas {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              max-height: none !important;
              overflow: visible !important;
            }
            #printable-enquiry-slip {
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
          }

          /* Screen styling for independent scrollable panels */
          .designer-controls-card .p-card-body,
          .designer-controls-card .p-card-content,
          .designer-preview-card .p-card-body,
          .designer-preview-card .p-card-content {
            padding: 0 !important;
          }
          @media (min-width: 992px) {
            .designer-controls-card.sticky-desktop {
              position: sticky !important;
              top: 68px !important;
              z-index: 2;
            }
            .designer-controls-scroll {
              max-height: calc(100vh - 130px) !important;
              overflow-y: auto !important;
            }
            .designer-preview-card.sticky-desktop {
              position: sticky !important;
              top: 68px !important;
              z-index: 2;
            }
            .designer-preview-canvas {
              max-height: calc(100vh - 130px) !important;
              overflow-y: auto !important;
            }
          }
          @media (max-width: 991px) {
            .designer-controls-scroll {
              max-height: 65vh !important;
              overflow-y: auto !important;
            }
            .designer-preview-canvas {
              max-height: 70vh !important;
              overflow-y: auto !important;
            }
          }
          /* Custom styled scrollbars so users can clearly see and grab them */
          .designer-controls-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--app-scrollbar-thumb, #818cf8) var(--app-scrollbar-track, #f1f5f9);
          }
          .designer-controls-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .designer-controls-scroll::-webkit-scrollbar-track {
            background: var(--app-scrollbar-track, #f1f5f9);
            border-radius: 4px;
          }
          .designer-controls-scroll::-webkit-scrollbar-thumb {
            background: var(--app-scrollbar-thumb, #818cf8);
            border-radius: 4px;
          }
          .designer-controls-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--app-scrollbar-thumb-hover, #4f46e5);
          }

          .designer-preview-canvas {
            scrollbar-width: thin;
            scrollbar-color: var(--app-scrollbar-thumb, #cbd5e1) var(--app-scrollbar-track, #64748b);
          }
          .designer-preview-canvas::-webkit-scrollbar {
            width: 8px;
          }
          .designer-preview-canvas::-webkit-scrollbar-track {
            background: var(--app-scrollbar-track, #64748b);
            border-radius: 4px;
          }
          .designer-preview-canvas::-webkit-scrollbar-thumb {
            background: var(--app-scrollbar-thumb, #cbd5e1);
            border-radius: 4px;
          }
          .designer-preview-canvas::-webkit-scrollbar-thumb:hover {
            background: var(--app-scrollbar-thumb-hover, #ffffff);
          }
        `}
      </style>

      {/* Sleek Compact Header Bar (Hidden in Print) */}
      <div
        className="no-print flex flex-column sm:flex-row sm:align-items-center sm:justify-content-between px-3 py-2 border-round-lg shadow-1 mb-2 gap-2"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          minHeight: '44px',
        }}
      >
        <div className="flex align-items-center gap-2">
          <i className="pi pi-file-edit text-indigo-400 text-base"></i>
          <span className="font-bold text-sm text-white">Enquiry Slip Designer</span>
          <Tag
            value={config.isSchoolOverride ? 'School Custom' : 'Platform Default'}
            severity={config.isSchoolOverride ? 'warning' : 'info'}
            style={{ fontSize: '11px', padding: '1px 8px' }}
          />
        </div>

        {/* Compact School Selector & Action Buttons */}
        <div className="flex flex-wrap align-items-center gap-2">
          <Dropdown
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.value)}
            options={[
              { label: '🌟 Platform Default (All Schools)', value: null },
              ...schools.map((s) => ({
                label: `${s.name} (${s.code || `ID: ${s.id}`})`,
                value: s.id,
              })),
            ]}
            optionLabel="label"
            placeholder="Select School / Tenant"
            className="p-inputtext-sm"
            style={{ minWidth: '220px', maxWidth: '300px', height: '32px', backgroundColor: '#ffffff', color: '#0f172a' }}
            filter
          />

          {selectedSchoolId && (
            <Button
              label="Reset"
              icon="pi pi-refresh"
              className="p-button-outlined p-button-secondary p-button-sm text-slate-200"
              style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}
              tooltip="Reset to platform default"
              onClick={handleResetToDefault}
              disabled={loading || saving}
            />
          )}

          <Button
            label={saving ? 'Saving...' : 'Save Template'}
            icon="pi pi-check"
            className="p-button-primary p-button-sm font-bold"
            style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', height: '32px', padding: '0 12px', fontSize: '12px' }}
            onClick={handleSave}
            loading={saving}
          />
        </div>
      </div>

      {/* Main Designer Layout (Grid: Controls on Left, Live Preview on Right) */}
      <div className="grid">
        {/* Left Column: Customization Controls */}
        <div className="col-12 lg:col-5 designer-controls-column no-print">
          <Card className="shadow-2 border-round-xl p-0 overflow-hidden mb-3 designer-controls-card sticky-desktop">
            {/* Navigation Tabs (Fixed at the top of the card) */}
            <div
              className="flex border-bottom-1 surface-border overflow-x-auto flex-shrink-0"
              style={{ backgroundColor: '#f1f5f9', padding: '4px 6px' }}
            >
              {[
                { id: 'header', label: 'Header & School Name', icon: 'pi pi-id-card', highlight: true },
                { id: 'sizing', label: 'Sizes & Dimensions', icon: 'pi pi-arrows-alt' },
                { id: 'sections', label: 'Drag & Order', icon: 'pi pi-bars' },
                { id: 'styling', label: 'Colors & Theme', icon: 'pi pi-palette' },
                { id: 'content', label: 'Texts & Notes', icon: 'pi pi-pencil' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 py-1.5 px-2 text-xs font-bold border-round transition-all border-none cursor-pointer flex align-items-center justify-content-center gap-1 whitespace-nowrap"
                  style={{
                    backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <i className={tab.icon} style={{ fontSize: '12px' }}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Scrollable Control Form Body with visible scrollbar */}
            <div className="p-3 designer-controls-scroll">
              {/* TAB 1: FULL HEADER & SCHOOL NAME CONTROLS (Requested by user) */}
              {activeTab === 'header' && (
                <div className="flex flex-column gap-3">
                  {/* Section A: School Name Font, Size, Style & Color */}
                  <div className="p-3 border-round-lg border-1 border-indigo-200" style={{ backgroundColor: '#f8faff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-bookmark text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-900">A. School Name (Font, Size & Color)</span>
                      </div>
                      <span className="px-2 py-0.5 border-round font-mono text-xs font-bold bg-indigo-100 text-indigo-800">
                        {config.headerSchoolNameFontSize}px • {config.headerSchoolNameFontWeight}
                      </span>
                    </div>

                    {/* Custom School Name Override */}
                    <div className="mb-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Custom School Name (Leave empty to use tenant name):
                      </label>
                      <InputText
                        value={config.headerSchoolNameCustom || ''}
                        onChange={(e) => setConfig({ ...config, headerSchoolNameCustom: e.target.value })}
                        placeholder={defaultSchoolName}
                        className="p-inputtext-sm w-full font-bold"
                      />
                    </div>

                    {/* School Name Font Size Slider */}
                    <div className="mb-2">
                      <div className="flex justify-content-between align-items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          School Name Font Size: <strong>{config.headerSchoolNameFontSize}px</strong>
                        </label>
                        <div className="flex gap-1">
                          {[18, 22, 26, 30, 36].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setConfig({ ...config, headerSchoolNameFontSize: sz })}
                              className="px-1.5 py-0.5 text-xs border-round border-1 border-slate-200 cursor-pointer font-semibold"
                              style={{
                                backgroundColor: config.headerSchoolNameFontSize === sz ? '#6366f1' : '#ffffff',
                                color: config.headerSchoolNameFontSize === sz ? '#ffffff' : '#475569',
                              }}
                            >
                              {sz}px
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="range"
                        min={14}
                        max={42}
                        step={1}
                        value={config.headerSchoolNameFontSize}
                        onChange={(e) => setConfig({ ...config, headerSchoolNameFontSize: Number(e.target.value) })}
                        className="w-full cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* School Name Color & Font Weight */}
                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs font-bold text-slate-700 block mb-1">School Name Color:</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.headerSchoolNameColor}
                            onChange={(e) => setConfig({ ...config, headerSchoolNameColor: e.target.value })}
                            style={{
                              width: '36px',
                              height: '36px',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          />
                          <InputText
                            value={config.headerSchoolNameColor}
                            onChange={(e) => setConfig({ ...config, headerSchoolNameColor: e.target.value })}
                            className="p-inputtext-sm font-mono uppercase w-full"
                          />
                        </div>
                      </div>

                      <div className="col-6">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Font Weight (Thickness):</label>
                        <Dropdown
                          value={config.headerSchoolNameFontWeight}
                          onChange={(e) => setConfig({ ...config, headerSchoolNameFontWeight: e.value })}
                          options={FONT_WEIGHT_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Specific Font Family:</label>
                        <Dropdown
                          value={config.headerSchoolNameFontFamily}
                          onChange={(e) => setConfig({ ...config, headerSchoolNameFontFamily: e.value })}
                          options={FONT_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Text Case (Transform):</label>
                        <Dropdown
                          value={config.headerSchoolNameTransform}
                          onChange={(e) => setConfig({ ...config, headerSchoolNameTransform: e.value })}
                          options={TEXT_TRANSFORM_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-12">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Letter Spacing (Kerning):</label>
                        <Dropdown
                          value={config.headerSchoolNameLetterSpacing}
                          onChange={(e) => setConfig({ ...config, headerSchoolNameLetterSpacing: e.value })}
                          options={LETTER_SPACING_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section B: Subtitle / Affiliation & Branch line */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-id-card text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">B. Subtitle / Affiliation & Branch Line</span>
                      </div>
                      <span className="px-2 py-0.5 border-round font-mono text-xs font-bold bg-slate-100 text-slate-700">
                        {config.headerSubtitleFontSize}px
                      </span>
                    </div>

                    <div className="mb-2">
                      <label className="text-xs text-slate-600 font-semibold block mb-1">
                        Subtitle Text (Override branch / affiliation):
                      </label>
                      <InputText
                        value={config.headerSubtitleCustom || ''}
                        onChange={(e) => setConfig({ ...config, headerSubtitleCustom: e.target.value })}
                        placeholder="Main Campus • Affiliated to CBSE, New Delhi (Affiliation No: 2130892)"
                        className="p-inputtext-sm w-full"
                      />
                    </div>

                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">
                          Subtitle Font Size: <strong>{config.headerSubtitleFontSize}px</strong>
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={18}
                          step={1}
                          value={config.headerSubtitleFontSize}
                          onChange={(e) => setConfig({ ...config, headerSubtitleFontSize: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Subtitle Color:</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.headerSubtitleColor}
                            onChange={(e) => setConfig({ ...config, headerSubtitleColor: e.target.value })}
                            style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          />
                          <InputText
                            value={config.headerSubtitleColor}
                            onChange={(e) => setConfig({ ...config, headerSubtitleColor: e.target.value })}
                            className="p-inputtext-sm font-mono uppercase w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section C: Address & Helpline Bar */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-map-marker text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">C. Address, Helpline & Email Text</span>
                      </div>
                      <span className="px-2 py-0.5 border-round font-mono text-xs font-bold bg-slate-100 text-slate-700">
                        {config.headerAddressFontSize}px
                      </span>
                    </div>

                    <div className="mb-2">
                      <label className="text-xs text-slate-600 font-semibold block mb-1">
                        Address & Helpline String:
                      </label>
                      <InputText
                        value={config.headerAddressCustom || ''}
                        onChange={(e) => setConfig({ ...config, headerAddressCustom: e.target.value })}
                        placeholder="Sector 12, RK Puram, New Delhi - 110022 | Helpline: +91 11 2617 8900 | Email: admissions@school.edu.in"
                        className="p-inputtext-sm w-full"
                      />
                    </div>

                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">
                          Address Font Size: <strong>{config.headerAddressFontSize}px</strong>
                        </label>
                        <input
                          type="range"
                          min={9}
                          max={15}
                          step={1}
                          value={config.headerAddressFontSize}
                          onChange={(e) => setConfig({ ...config, headerAddressFontSize: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Address Text Color:</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.headerAddressColor}
                            onChange={(e) => setConfig({ ...config, headerAddressColor: e.target.value })}
                            style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          />
                          <InputText
                            value={config.headerAddressColor}
                            onChange={(e) => setConfig({ ...config, headerAddressColor: e.target.value })}
                            className="p-inputtext-sm font-mono uppercase w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section D: Header Presentation & Dividers */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-sliders-h text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">D. Header Presentation & Dividers</span>
                      </div>
                    </div>

                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Header Layout Style:</label>
                        <Dropdown
                          value={config.headerLayout}
                          onChange={(e) => setConfig({ ...config, headerLayout: e.value })}
                          options={HEADER_LAYOUTS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Text Alignment:</label>
                        <Dropdown
                          value={config.headerAlignment}
                          onChange={(e) => setConfig({ ...config, headerAlignment: e.value })}
                          options={[
                            { label: 'Centered (Classic)', value: 'center' },
                            { label: 'Left Aligned (Modern)', value: 'left' },
                          ]}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Bottom Divider Style:</label>
                        <Dropdown
                          value={config.headerDividerStyle}
                          onChange={(e) => setConfig({ ...config, headerDividerStyle: e.value })}
                          options={HEADER_DIVIDER_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Bottom Divider Color:</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.headerDividerColor}
                            onChange={(e) => setConfig({ ...config, headerDividerColor: e.target.value })}
                            style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          />
                          <InputText
                            value={config.headerDividerColor}
                            onChange={(e) => setConfig({ ...config, headerDividerColor: e.target.value })}
                            className="p-inputtext-sm font-mono uppercase w-full"
                          />
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">
                          Header Vertical Spacing: <strong>{config.headerPaddingY}px</strong>
                        </label>
                        <input
                          type="range"
                          min={4}
                          max={28}
                          step={2}
                          value={config.headerPaddingY}
                          onChange={(e) => setConfig({ ...config, headerPaddingY: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section E: Slip Title Badge Styling */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-tag text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">E. Slip Title Badge Styling</span>
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="text-xs text-slate-600 font-semibold block mb-1">Slip Badge Text:</label>
                      <InputText
                        value={config.slipTitle}
                        onChange={(e) => setConfig({ ...config, slipTitle: e.target.value })}
                        className="p-inputtext-sm w-full font-bold"
                      />
                    </div>

                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Badge Background:</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.slipTitleBgColor}
                            onChange={(e) => setConfig({ ...config, slipTitleBgColor: e.target.value })}
                            style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          />
                          <InputText
                            value={config.slipTitleBgColor}
                            onChange={(e) => setConfig({ ...config, slipTitleBgColor: e.target.value })}
                            className="p-inputtext-sm font-mono uppercase w-full"
                          />
                        </div>
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Badge Text Color:</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.slipTitleTextColor}
                            onChange={(e) => setConfig({ ...config, slipTitleTextColor: e.target.value })}
                            style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          />
                          <InputText
                            value={config.slipTitleTextColor}
                            onChange={(e) => setConfig({ ...config, slipTitleTextColor: e.target.value })}
                            className="p-inputtext-sm font-mono uppercase w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SIZES & DIMENSIONS */}
              {activeTab === 'sizing' && (
                <div className="flex flex-column gap-3">
                  {/* Logo Size */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-image text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">1. School Logo Size</span>
                      </div>
                      <span className="px-2 py-0.5 border-round font-mono text-xs font-bold bg-indigo-50 text-indigo-700">
                        {config.logoSize} px
                      </span>
                    </div>

                    <input
                      type="range"
                      min={30}
                      max={120}
                      step={2}
                      value={config.logoSize}
                      onChange={(e) => setConfig({ ...config, logoSize: Number(e.target.value) })}
                      className="w-full cursor-pointer accent-indigo-600"
                    />

                    <div className="flex gap-1.5 mt-2">
                      {[
                        { label: 'Small (38px)', val: 38 },
                        { label: 'Normal (52px)', val: 52 },
                        { label: 'Large (70px)', val: 70 },
                        { label: 'X-Large (94px)', val: 94 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setConfig({ ...config, logoSize: p.val })}
                          className="px-2 py-1 text-xs border-round border-1 border-slate-200 cursor-pointer font-semibold"
                          style={{
                            backgroundColor: config.logoSize === p.val ? '#e0e7ff' : '#f8fafc',
                            color: config.logoSize === p.val ? '#3730a3' : '#475569',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Photo Box */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-user text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">2. Student Photo Box Size</span>
                      </div>
                      <span className="px-2 py-0.5 border-round font-mono text-xs font-bold bg-indigo-50 text-indigo-700">
                        {config.photoWidth} × {config.photoHeight} px
                      </span>
                    </div>

                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs text-slate-500 font-semibold block mb-1">
                          Photo Width: <strong>{config.photoWidth}px</strong>
                        </label>
                        <input
                          type="range"
                          min={50}
                          max={140}
                          step={2}
                          value={config.photoWidth}
                          onChange={(e) => setConfig({ ...config, photoWidth: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-xs text-slate-500 font-semibold block mb-1">
                          Photo Height: <strong>{config.photoHeight}px</strong>
                        </label>
                        <input
                          type="range"
                          min={70}
                          max={180}
                          step={2}
                          value={config.photoHeight}
                          onChange={(e) => setConfig({ ...config, photoHeight: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { label: 'Passport (86×104)', w: 86, h: 104 },
                        { label: 'Compact (70×86)', w: 70, h: 86 },
                        { label: 'Large (100×130)', w: 100, h: 130 },
                        { label: 'Square (85×85)', w: 85, h: 85 },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setConfig({ ...config, photoWidth: p.w, photoHeight: p.h })}
                          className="px-2 py-1 text-xs border-round border-1 border-slate-200 cursor-pointer font-semibold"
                          style={{
                            backgroundColor: config.photoWidth === p.w && config.photoHeight === p.h ? '#e0e7ff' : '#f8fafc',
                            color: config.photoWidth === p.w && config.photoHeight === p.h ? '#3730a3' : '#475569',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size Scaling */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-align-left text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">3. Body Text & Font Scale</span>
                      </div>
                      <span className="px-2 py-0.5 border-round font-mono text-xs font-bold bg-indigo-50 text-indigo-700">
                        {config.fontScalePercent}% ({config.baseFontSize}px base)
                      </span>
                    </div>

                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs text-slate-500 font-semibold block mb-1">
                          Font Scale: <strong>{config.fontScalePercent}%</strong>
                        </label>
                        <input
                          type="range"
                          min={70}
                          max={140}
                          step={5}
                          value={config.fontScalePercent}
                          onChange={(e) => setConfig({ ...config, fontScalePercent: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-xs text-slate-500 font-semibold block mb-1">
                          Base Font: <strong>{config.baseFontSize}px</strong>
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={18}
                          step={1}
                          value={config.baseFontSize}
                          onChange={(e) => setConfig({ ...config, baseFontSize: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Page Size & Print Format */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-file text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">4. Page Sheet & Layout</span>
                      </div>
                      <span className="px-2 py-0.5 border-round font-mono text-xs font-bold bg-indigo-50 text-indigo-700">
                        {config.pageSize} ({config.pageOrientation})
                      </span>
                    </div>

                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Paper Sheet Size:</label>
                        <Dropdown
                          value={config.pageSize}
                          onChange={(e) => setConfig({ ...config, pageSize: e.value })}
                          options={PAGE_SIZE_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Orientation:</label>
                        <Dropdown
                          value={config.pageOrientation}
                          onChange={(e) => setConfig({ ...config, pageOrientation: e.value })}
                          options={ORIENTATION_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Print Margins:</label>
                        <Dropdown
                          value={config.pageMargin}
                          onChange={(e) => setConfig({ ...config, pageMargin: e.value })}
                          options={PAGE_MARGIN_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">
                          Inner Padding: <strong>{config.pagePadding}px</strong>
                        </label>
                        <input
                          type="range"
                          min={8}
                          max={36}
                          step={2}
                          value={config.pagePadding}
                          onChange={(e) => setConfig({ ...config, pagePadding: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600 mt-2"
                        />
                      </div>

                      <div className="col-12">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">
                          Max Container Width: <strong>{config.pageMaxWidth}px</strong>
                        </label>
                        <input
                          type="range"
                          min={540}
                          max={960}
                          step={20}
                          value={config.pageMaxWidth}
                          onChange={(e) => setConfig({ ...config, pageMaxWidth: Number(e.target.value) })}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DRAG & DROP SECTIONS REORDER */}
              {activeTab === 'sections' && (
                <div>
                  <div className="flex align-items-center justify-content-between mb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">
                      Drag sections to rearrange slip hierarchy
                    </span>
                    <span className="text-xs text-indigo-600 font-semibold">
                      {config.sections.filter((s) => s.visible).length} / {config.sections.length} Visible
                    </span>
                  </div>

                  <div className="flex flex-column gap-2">
                    {config.sections.map((section, idx) => (
                      <div
                        key={section.key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className="flex align-items-center justify-content-between p-2.5 border-round-lg border-1 transition-all cursor-move"
                        style={{
                          backgroundColor: section.visible ? '#ffffff' : '#f8fafc',
                          borderColor: draggedIndex === idx ? '#4f46e5' : section.visible ? '#e2e8f0' : '#cbd5e1',
                          opacity: draggedIndex === idx ? 0.5 : section.visible ? 1 : 0.65,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div className="flex align-items-center gap-3">
                          <i className="pi pi-bars text-slate-400 cursor-move" style={{ fontSize: '15px' }}></i>
                          <div
                            className="flex align-items-center justify-content-center border-round text-xs font-bold"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: section.visible ? '#eef2ff' : '#f1f5f9',
                              color: section.visible ? '#4f46e5' : '#94a3b8',
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: section.visible ? '#0f172a' : '#64748b' }}
                            >
                              {section.title}
                            </div>
                            <div className="text-xs text-slate-400" style={{ fontSize: '11px' }}>
                              Key: <code>{section.key}</code>
                            </div>
                          </div>
                        </div>

                        <div className="flex align-items-center gap-2">
                          <Button
                            icon="pi pi-arrow-up"
                            className="p-button-text p-button-rounded p-button-sm text-slate-400 p-0"
                            style={{ width: '28px', height: '28px' }}
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, -1)}
                          />
                          <Button
                            icon="pi pi-arrow-down"
                            className="p-button-text p-button-rounded p-button-sm text-slate-400 p-0"
                            style={{ width: '28px', height: '28px' }}
                            disabled={idx === config.sections.length - 1}
                            onClick={() => moveSection(idx, 1)}
                          />
                          <InputSwitch
                            checked={section.visible}
                            onChange={() => toggleSectionVisibility(idx)}
                            className="p-inputswitch-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: COLORS & THEME */}
              {activeTab === 'styling' && (
                <div className="flex flex-column gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">Preset Color Schemes:</label>
                    <div className="grid">
                      {PRESET_PALETTES.map((pal) => (
                        <div key={pal.name} className="col-6 sm:col-4 p-1">
                          <button
                            onClick={() => handleApplyPalette(pal)}
                            className="w-full text-left p-2 border-round border-1 border-slate-200 cursor-pointer transition-all flex align-items-center gap-2"
                            style={{
                              backgroundColor: config.primaryColor === pal.primary ? '#f5f3ff' : '#ffffff',
                              borderColor: config.primaryColor === pal.primary ? '#6366f1' : '#e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: pal.primary,
                                borderRadius: '4px',
                                flexShrink: 0,
                              }}
                            />
                            <div className="text-xs font-semibold text-slate-700 truncate">{pal.name}</div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Divider className="my-1" />

                  <div className="grid">
                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Primary Theme Color:</label>
                      <div className="flex align-items-center gap-2">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        />
                        <InputText
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="p-inputtext-sm font-mono uppercase w-full"
                        />
                      </div>
                    </div>

                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Accent Background Tint:</label>
                      <div className="flex align-items-center gap-2">
                        <input
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                          style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        />
                        <InputText
                          value={config.secondaryColor}
                          onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                          className="p-inputtext-sm font-mono uppercase w-full"
                        />
                      </div>
                    </div>

                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Slip Outer Border Color:</label>
                      <div className="flex align-items-center gap-2">
                        <input
                          type="color"
                          value={config.borderColor}
                          onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                          style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        />
                        <InputText
                          value={config.borderColor}
                          onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                          className="p-inputtext-sm font-mono uppercase w-full"
                        />
                      </div>
                    </div>

                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Outer Border Style:</label>
                      <Dropdown
                        value={config.borderStyle}
                        onChange={(e) => setConfig({ ...config, borderStyle: e.value })}
                        options={BORDER_STYLES}
                        className="p-inputtext-sm w-full"
                      />
                    </div>

                    <div className="col-12">
                      <label className="text-xs font-bold text-slate-600 block mb-1">Slip Base Font Family:</label>
                      <Dropdown
                        value={config.fontFamily}
                        onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                        options={FONT_OPTIONS.filter((f) => f.value !== 'inherit')}
                        className="p-inputtext-sm w-full mb-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TEXTS & CONTENT */}
              {activeTab === 'content' && (
                <div className="flex flex-column gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Important Instructions Title:</label>
                    <InputText
                      value={config.instructionsTitle}
                      onChange={(e) => setConfig({ ...config, instructionsTitle: e.target.value })}
                      className="p-inputtext-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Parent Guidelines & Terms Text:</label>
                    <InputTextarea
                      value={config.termsText}
                      onChange={(e) => setConfig({ ...config, termsText: e.target.value })}
                      rows={4}
                      className="p-inputtext-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Admission Checklist Items (one per line):
                    </label>
                    <InputTextarea
                      value={config.documentsRequired?.join('\n') || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          documentsRequired: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                        })
                      }
                      rows={5}
                      className="p-inputtext-sm w-full font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Slip Bottom Footer Text:</label>
                    <InputText
                      value={config.footerText}
                      onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                      className="p-inputtext-sm w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Interactive Live Preview */}
        <div className="col-12 lg:col-7 designer-preview-column">
          <Card className="shadow-2 border-round-xl p-0 overflow-hidden designer-preview-card sticky-desktop">
            <div
              className="no-print flex flex-wrap align-items-center justify-content-between px-3 py-1.5 border-bottom-1 surface-border gap-2 flex-shrink-0"
              style={{ backgroundColor: '#ffffff', minHeight: '40px' }}
            >
              <div className="flex align-items-center gap-2">
                <i className="pi pi-eye text-indigo-600"></i>
                <span className="text-sm font-bold text-slate-800">Live Slip Preview</span>
                <span className="text-xs text-indigo-600 font-bold px-2 py-0.5 border-round bg-indigo-50">
                  {config.pageSize} {config.pageOrientation} • {config.headerSchoolNameFontSize}px Name
                </span>
              </div>

              {/* Action Buttons: Preview Modal, Download PDF, Isolated Print */}
              <div className="flex align-items-center gap-2">
                <Button
                  label="Modal View"
                  icon="pi pi-window-maximize"
                  className="p-button-outlined p-button-secondary p-button-sm font-semibold"
                  style={{ height: '32px', fontSize: '12px', padding: '0 10px' }}
                  tooltip="Preview full-screen slip dialog"
                  onClick={() => setPreviewModalOpen(true)}
                />
                <Button
                  label="Download PDF"
                  icon="pi pi-file-pdf"
                  className="p-button-outlined p-button-danger p-button-sm font-semibold"
                  style={{ height: '32px', fontSize: '12px', padding: '0 10px' }}
                  tooltip="Directly download PDF file"
                  onClick={() => downloadElementAsPdf('printable-enquiry-slip', `Enquiry_Slip_${config.schoolName || 'Template'}.pdf`)}
                />
                <Button
                  label="Print Slip"
                  icon="pi pi-print"
                  className="p-button-primary p-button-sm font-bold"
                  style={{ backgroundColor: config.primaryColor, borderColor: config.primaryColor, height: '32px', fontSize: '12px', padding: '0 12px' }}
                  tooltip="Print ONLY the Enquiry Slip (No admin UI)"
                  onClick={handlePrintSlip}
                />
              </div>
            </div>

            {/* Live Slip Paper Preview Canvas */}
            <div
              className="p-3 designer-preview-canvas"
              style={{
                backgroundColor: '#94a3b8',
                minHeight: '480px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
            >
              {/* Slip Paper Container with Dynamic Width, Padding & Border */}
              <div
                id="printable-enquiry-slip"
                style={{
                  backgroundColor: '#ffffff',
                  border: getBorderCss(),
                  borderRadius: '6px',
                  padding: `${slipPadding}px`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  fontFamily: config.fontFamily,
                  color: '#1e293b',
                  width: '100%',
                  maxWidth: `${maxWidthPx}px`,
                  minHeight: config.pageSize === 'A5' && config.pageOrientation === 'landscape' ? '420px' : '620px',
                  margin: '0 auto',
                  transition: 'all 0.2s ease-in-out',
                  fontSize: `${config.baseFontSize || 13}px`,
                }}
              >
                {/* Dynamically render ordered and visible sections */}
                {config.sections
                  .filter((s) => s.visible)
                  .map((section) => renderPreviewSection(section.key))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* FULL PREVIEW MODAL DIALOG */}
      <Dialog
        header={`Official Slip Preview — ${config.schoolName || 'Platform Default'}`}
        visible={previewModalOpen}
        onHide={() => setPreviewModalOpen(false)}
        style={{ width: '90vw', maxWidth: '880px' }}
        maximizable
        modal
        className="no-print"
      >
        <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: getBorderCss(),
              borderRadius: '6px',
              padding: `${slipPadding}px`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              fontFamily: config.fontFamily,
              color: '#1e293b',
              width: '100%',
              maxWidth: `${maxWidthPx}px`,
              margin: '0 auto',
              fontSize: `${config.baseFontSize || 13}px`,
            }}
          >
            {config.sections
              .filter((s) => s.visible)
              .map((section) => renderPreviewSection(section.key))}
          </div>

          <div className="flex justify-content-end gap-2 mt-3">
            <Button
              label="Close"
              icon="pi pi-times"
              className="p-button-text p-button-secondary p-button-sm"
              onClick={() => setPreviewModalOpen(false)}
            />
            <Button
              label="Download PDF"
              icon="pi pi-file-pdf"
              className="p-button-outlined p-button-danger p-button-sm"
              onClick={() => downloadElementAsPdf('printable-enquiry-slip', `Enquiry_Slip_${config.schoolName || 'Template'}.pdf`)}
            />
            <Button
              label="Print Enquiry Slip"
              icon="pi pi-print"
              className="p-button-primary p-button-sm font-bold"
              style={{ backgroundColor: config.primaryColor, borderColor: config.primaryColor }}
              onClick={handlePrintSlip}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default EnquirySlipDesignerPage;
