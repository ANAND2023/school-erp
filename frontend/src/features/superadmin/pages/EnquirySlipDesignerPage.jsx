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
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Poppins (Geometric & Friendly)', value: 'Poppins, sans-serif' },
  { label: 'Roboto (Balanced Neo-Grotesque)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Premium Header & Body)', value: 'Montserrat, sans-serif' },
  { label: 'Playfair Display (Prestigious Serif)', value: '"Playfair Display", Georgia, serif' },
  { label: 'Segoe UI (System Standard)', value: '"Segoe UI", -apple-system, sans-serif' },
];

const HEADER_LAYOUTS = [
  { label: 'Classic Centered', value: 'Classic', desc: 'Centered school logo and details with double-line divider' },
  { label: 'Modern Side-by-Side', value: 'Modern', desc: 'Logo on left, school details center, enquiry badge & QR on right' },
  { label: 'Solid Color Banner', value: 'Banner', desc: 'Full-bleed primary colored header with bold white text' },
  { label: 'Clean Minimalist', value: 'Minimal', desc: 'Understated light header with crisp thin dividers' },
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
  const [activeTab, setActiveTab] = useState('sizing'); // 'sizing' | 'sections' | 'styling' | 'layout' | 'content'
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

    // Sizing Controls (Requested by User)
    logoSize: 52, // 30px to 120px
    photoWidth: 86, // 50px to 140px
    photoHeight: 104, // 70px to 180px
    baseFontSize: 13, // 10px to 18px
    fontScalePercent: 100, // 70% to 140%
    pageSize: 'A4', // 'A4' | 'A5' | 'Letter'
    pageOrientation: 'portrait', // 'portrait' | 'landscape'
    pageMargin: '8mm', // '5mm' | '8mm' | '12mm' | '16mm'
    pagePadding: 20, // 8px to 36px
    pageMaxWidth: 760, // 540px to 960px

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

  // Load school list on mount
  useEffect(() => {
    loadSchools();
  }, []);

  // Reload template config whenever selected school changes
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

  // Trigger Isolated Print
  const handlePrintSlip = () => {
    printElement('printable-enquiry-slip', {
      title: `Enquiry_Slip_${config.schoolName || 'Template'}`,
      pageSize: config.pageSize || 'A4',
      orientation: config.pageOrientation || 'portrait',
      margin: config.pageMargin || '8mm',
    });
  };

  // Mock enquiry data for live preview
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
    schoolName: selectedSchoolId
      ? schools.find((s) => s.id === selectedSchoolId)?.name || 'ST. XAVIER SENIOR SECONDARY SCHOOL'
      : 'DELHI PUBLIC SCHOOL',
    branchName: 'Main Campus',
    affiliation: 'Affiliated to CBSE, New Delhi (Affiliation No: 2130892)',
    address: 'Sector 12, RK Puram, New Delhi - 110022 | Helpline: +91 11 2617 8900 | Email: admissions@school.edu.in',
  };

  // Render individual preview section
  const renderPreviewSection = (sectionKey) => {
    switch (sectionKey) {
      case 'header':
        if (config.headerLayout === 'Banner') {
          return (
            <div
              key="header"
              style={{
                backgroundColor: config.primaryColor,
                color: '#ffffff',
                padding: `${12 * fontMultiplier}px ${16 * fontMultiplier}px`,
                borderRadius: '6px',
                marginBottom: `${10 * fontMultiplier}px`,
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${14 * fontMultiplier}px` }}>
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
                  <h2 style={{ margin: 0, fontSize: `${1.4 * fontMultiplier}rem`, fontWeight: 800, letterSpacing: '0.5px' }}>
                    {mockEnquiry.schoolName}
                  </h2>
                  <div style={{ fontSize: `${0.75 * fontMultiplier}rem`, opacity: 0.95, marginTop: '2px' }}>
                    {mockEnquiry.branchName} • {config.showAffiliationNo && mockEnquiry.affiliation}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: `${0.68 * fontMultiplier}rem`, opacity: 0.9, marginTop: '5px' }}>{mockEnquiry.address}</div>
              <div
                style={{
                  display: 'inline-block',
                  marginTop: '8px',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  padding: `${3 * fontMultiplier}px ${14 * fontMultiplier}px`,
                  borderRadius: '12px',
                  fontSize: `${0.72 * fontMultiplier}rem`,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                {config.slipTitle}
              </div>
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
                paddingBottom: `${10 * fontMultiplier}px`,
                borderBottom: `2px solid ${config.borderColor}`,
                marginBottom: `${12 * fontMultiplier}px`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: `${14 * fontMultiplier}px` }}>
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
                  <h2 style={{ margin: 0, fontSize: `${1.3 * fontMultiplier}rem`, fontWeight: 800, color: config.primaryColor }}>
                    {mockEnquiry.schoolName}
                  </h2>
                  <div style={{ fontSize: `${0.76 * fontMultiplier}rem`, color: '#64748b', fontWeight: 600 }}>
                    {mockEnquiry.branchName} • {config.showAffiliationNo && mockEnquiry.affiliation}
                  </div>
                  <div style={{ fontSize: `${0.68 * fontMultiplier}rem`, color: '#64748b', marginTop: '2px' }}>
                    {mockEnquiry.address}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    backgroundColor: config.primaryColor,
                    color: '#ffffff',
                    padding: `${4 * fontMultiplier}px ${10 * fontMultiplier}px`,
                    borderRadius: '4px',
                    fontSize: `${0.7 * fontMultiplier}rem`,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'inline-block',
                    marginBottom: '4px',
                  }}
                >
                  {config.slipTitle}
                </span>
                {config.showQrCode && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      fontSize: `${0.65 * fontMultiplier}rem`,
                      color: '#64748b',
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

        if (config.headerLayout === 'Minimal') {
          return (
            <div
              key="header"
              style={{
                textAlign: 'left',
                paddingBottom: `${8 * fontMultiplier}px`,
                borderBottom: '1px solid #cbd5e1',
                marginBottom: `${10 * fontMultiplier}px`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: `${1.25 * fontMultiplier}rem`, fontWeight: 800, color: config.primaryColor }}>
                    {mockEnquiry.schoolName}
                  </h2>
                  <div style={{ fontSize: `${0.74 * fontMultiplier}rem`, color: '#475569', marginTop: '2px' }}>
                    {mockEnquiry.branchName} | {mockEnquiry.address}
                  </div>
                </div>
                <div
                  style={{
                    border: `1.5px solid ${config.primaryColor}`,
                    color: config.primaryColor,
                    padding: `${3 * fontMultiplier}px ${10 * fontMultiplier}px`,
                    borderRadius: '4px',
                    fontSize: `${0.7 * fontMultiplier}rem`,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {config.slipTitle}
                </div>
              </div>
            </div>
          );
        }

        // Classic Layout (Default)
        return (
          <div
            key="header"
            style={{
              textAlign: 'center',
              paddingBottom: `${10 * fontMultiplier}px`,
              borderBottom: `2.5px double ${config.borderColor}`,
              marginBottom: `${12 * fontMultiplier}px`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${12 * fontMultiplier}px` }}>
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
                <h2
                  style={{
                    margin: 0,
                    color: config.primaryColor,
                    fontSize: `${1.45 * fontMultiplier}rem`,
                    fontWeight: 900,
                    letterSpacing: '0.8px',
                  }}
                >
                  {mockEnquiry.schoolName}
                </h2>
                <div style={{ fontSize: `${0.78 * fontMultiplier}rem`, fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                  {mockEnquiry.branchName} • {config.showAffiliationNo && mockEnquiry.affiliation}
                </div>
              </div>
            </div>
            <div style={{ fontSize: `${0.7 * fontMultiplier}rem`, color: '#64748b', marginTop: '4px' }}>{mockEnquiry.address}</div>
            <div
              style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: `${3 * fontMultiplier}px ${16 * fontMultiplier}px`,
                backgroundColor: config.primaryColor,
                color: '#ffffff',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: `${0.74 * fontMultiplier}rem`,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              {config.slipTitle}
            </div>
          </div>
        );

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
    <div className="p-3" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Toast ref={toastRef} />

      {/* CSS PRINT MEDIA STYLES TO ENSURE 100% ISOLATION IF USER USES CTRL+P */}
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
        `}
      </style>

      {/* Top Banner & School Selector Bar (Hidden in Print) */}
      <div
        className="no-print flex flex-column md:flex-row md:align-items-center md:justify-content-between p-4 border-round-xl shadow-1 mb-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
        }}
      >
        <div>
          <div className="flex align-items-center gap-2 mb-1">
            <span
              className="px-2 py-1 border-round font-bold text-xs"
              style={{ backgroundColor: '#6366f1', color: '#ffffff' }}
            >
              SUPER ADMIN
            </span>
            <Tag
              value={config.isSchoolOverride ? 'School Custom Template' : 'Inheriting Platform Default'}
              severity={config.isSchoolOverride ? 'warning' : 'info'}
            />
          </div>
          <h1 className="text-2xl font-bold m-0 flex align-items-center gap-2">
            <i className="pi pi-file-edit text-xl text-indigo-400"></i>
            Enquiry Slip Designer (Dynamic & School-Wise)
          </h1>
          <p className="text-xs text-slate-300 mt-1 mb-0">
            Adjust logo size, student photo dimensions, typography scaling, page format (A4/A5), and drag-and-drop sections.
          </p>
        </div>

        {/* School Dropdown Selector */}
        <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center gap-2 mt-3 md:mt-0">
          <div className="flex flex-column">
            <label className="text-xs text-slate-300 font-semibold mb-1">Select School / Tenant:</label>
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
              placeholder="Select School"
              className="p-inputtext-sm"
              style={{ minWidth: '280px', backgroundColor: '#ffffff', color: '#0f172a' }}
              filter
            />
          </div>

          <div className="flex gap-2 mt-3 sm:mt-auto">
            {selectedSchoolId && (
              <Button
                label="Reset"
                icon="pi pi-refresh"
                className="p-button-outlined p-button-secondary p-button-sm text-slate-200"
                tooltip="Reset to platform default"
                onClick={handleResetToDefault}
                disabled={loading || saving}
              />
            )}
            <Button
              label={saving ? 'Saving...' : 'Save Template'}
              icon="pi pi-check"
              className="p-button-primary p-button-sm font-bold"
              style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}
              onClick={handleSave}
              loading={saving}
            />
          </div>
        </div>
      </div>

      {/* Main Designer Layout (Grid: Controls on Left, Live Preview on Right) */}
      <div className="grid">
        {/* Left Column: Customization Controls (Hidden in Print via .designer-controls-column) */}
        <div className="col-12 lg:col-5 designer-controls-column no-print">
          <Card className="shadow-2 border-round-xl p-0 overflow-hidden mb-3">
            {/* Navigation Tabs */}
            <div
              className="flex border-bottom-1 surface-border overflow-x-auto"
              style={{ backgroundColor: '#f1f5f9', padding: '6px 8px' }}
            >
              {[
                { id: 'sizing', label: 'Sizes & Dimensions', icon: 'pi pi-arrows-alt', badge: 'New' },
                { id: 'sections', label: 'Drag & Order', icon: 'pi pi-bars' },
                { id: 'styling', label: 'Colors & Font', icon: 'pi pi-palette' },
                { id: 'layout', label: 'Header Style', icon: 'pi pi-table' },
                { id: 'content', label: 'Texts & Notes', icon: 'pi pi-pencil' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 py-2 px-2 text-xs font-bold border-round transition-all border-none cursor-pointer flex align-items-center justify-content-center gap-1.5 whitespace-nowrap"
                  style={{
                    backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <i className={tab.icon} style={{ fontSize: '13px' }}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-3">
              {/* TAB 1: SIZES & DIMENSIONS (LOGO, PHOTO, FONT, FULL PAGE) */}
              {activeTab === 'sizing' && (
                <div className="flex flex-column gap-3">
                  {/* 1. School Logo Size Adjustment */}
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

                    {/* Quick Presets */}
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

                  {/* 2. Student Photo Box Dimensions */}
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

                    {/* Quick Presets */}
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

                  {/* 3. Font Size Scaling */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-align-left text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">3. Text & Font Size Scale</span>
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

                    {/* Quick Presets */}
                    <div className="flex gap-1.5 mt-2">
                      {[
                        { label: 'Compact (85%)', scale: 85, base: 12 },
                        { label: 'Normal (100%)', scale: 100, base: 13 },
                        { label: 'Large (115%)', scale: 115, base: 14 },
                        { label: 'Spacious (130%)', scale: 130, base: 15 },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setConfig({ ...config, fontScalePercent: p.scale, baseFontSize: p.base })}
                          className="px-2 py-1 text-xs border-round border-1 border-slate-200 cursor-pointer font-semibold"
                          style={{
                            backgroundColor: config.fontScalePercent === p.scale ? '#e0e7ff' : '#f8fafc',
                            color: config.fontScalePercent === p.scale ? '#3730a3' : '#475569',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Page Size & Layout Adjustments (Pure Page Ki Size) */}
                  <div className="p-3 border-round-lg border-1 border-slate-200" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-file text-indigo-600 font-bold"></i>
                        <span className="text-sm font-bold text-slate-800">4. Pure Page Size & Print Format</span>
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
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Paper Orientation:</label>
                        <Dropdown
                          value={config.pageOrientation}
                          onChange={(e) => setConfig({ ...config, pageOrientation: e.value })}
                          options={ORIENTATION_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">Print Page Margin:</label>
                        <Dropdown
                          value={config.pageMargin}
                          onChange={(e) => setConfig({ ...config, pageMargin: e.value })}
                          options={PAGE_MARGIN_OPTIONS}
                          className="p-inputtext-sm w-full"
                        />
                      </div>

                      <div className="col-6">
                        <label className="text-xs text-slate-600 font-semibold block mb-1">
                          Slip Inner Padding: <strong>{config.pagePadding}px</strong>
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
                        <div className="flex gap-2 mt-1">
                          {[
                            { label: 'Compact (600px)', val: 600 },
                            { label: 'Standard (760px)', val: 760 },
                            { label: 'Wide A4 (860px)', val: 860 },
                            { label: 'Full Width (960px)', val: 960 },
                          ].map((pw) => (
                            <button
                              key={pw.val}
                              type="button"
                              onClick={() => setConfig({ ...config, pageMaxWidth: pw.val })}
                              className="px-2 py-0.5 text-xs border-round border-1 border-slate-200 cursor-pointer font-semibold"
                              style={{
                                backgroundColor: config.pageMaxWidth === pw.val ? '#e0e7ff' : '#f8fafc',
                                color: config.pageMaxWidth === pw.val ? '#3730a3' : '#475569',
                              }}
                            >
                              {pw.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DRAG & DROP SECTIONS REORDER */}
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

                  <div className="mt-3 p-2.5 border-round-md" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex align-items-center gap-2 text-xs font-bold text-green-800">
                      <i className="pi pi-info-circle"></i>
                      <span>Tip: Click and drag any row by its handle (☰) or use the arrow buttons to position it.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STYLING & COLORS */}
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
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Primary Brand Color:</label>
                      <div className="flex align-items-center gap-2">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          style={{
                            width: '36px',
                            height: '36px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        />
                        <InputText
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="p-inputtext-sm font-mono uppercase w-full"
                        />
                      </div>
                    </div>

                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Accent / Tint Background:</label>
                      <div className="flex align-items-center gap-2">
                        <input
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                          style={{
                            width: '36px',
                            height: '36px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
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
                          style={{
                            width: '36px',
                            height: '36px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        />
                        <InputText
                          value={config.borderColor}
                          onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                          className="p-inputtext-sm font-mono uppercase w-full"
                        />
                      </div>
                    </div>

                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Border Line Style:</label>
                      <Dropdown
                        value={config.borderStyle}
                        onChange={(e) => setConfig({ ...config, borderStyle: e.value })}
                        options={BORDER_STYLES}
                        className="p-inputtext-sm w-full"
                      />
                    </div>
                  </div>

                  <Divider className="my-1" />

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Slip Font Family:</label>
                    <Dropdown
                      value={config.fontFamily}
                      onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                      options={FONT_OPTIONS}
                      className="p-inputtext-sm w-full mb-2"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: HEADER & LAYOUT */}
              {activeTab === 'layout' && (
                <div className="flex flex-column gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">School Header Presentation Style:</label>
                    <div className="flex flex-column gap-2">
                      {HEADER_LAYOUTS.map((hl) => (
                        <div
                          key={hl.value}
                          onClick={() => setConfig({ ...config, headerLayout: hl.value })}
                          className="p-3 border-round-lg border-1 cursor-pointer transition-all flex align-items-center justify-content-between"
                          style={{
                            backgroundColor: config.headerLayout === hl.value ? '#eef2ff' : '#ffffff',
                            borderColor: config.headerLayout === hl.value ? '#6366f1' : '#e2e8f0',
                          }}
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-800">{hl.label}</div>
                            <div className="text-xs text-slate-500 mt-1">{hl.desc}</div>
                          </div>
                          {config.headerLayout === hl.value && (
                            <i className="pi pi-check-circle text-indigo-600 text-lg"></i>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Divider className="my-1" />

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">Visual Elements & Placeholders:</label>
                    <div className="flex flex-column gap-2">
                      {[
                        {
                          key: 'showSchoolLogo',
                          label: 'School Logo in Header',
                          desc: 'Displays institutional emblem or generic icon',
                        },
                        {
                          key: 'showAffiliationNo',
                          label: 'Board Affiliation Line',
                          desc: 'Displays CBSE / ICSE / State board affiliation',
                        },
                        {
                          key: 'showStudentPhotoBox',
                          label: 'Student Photo Paste Box',
                          desc: 'Dashed box for physical passport photograph',
                        },
                        {
                          key: 'showSchoolSealBox',
                          label: 'School Seal & Stamp Box',
                          desc: 'Official stamp placeholder in signatures row',
                        },
                        {
                          key: 'showQrCode',
                          label: 'Quick Verification QR Placeholder',
                          desc: 'Instant lookup code in top-right corner',
                        },
                        {
                          key: 'showNextFollowupDate',
                          label: 'Scheduled Follow-up Date Box',
                          desc: 'Shows upcoming counselor visit date',
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex align-items-center justify-content-between p-2 border-round surface-50"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-700">{item.label}</div>
                            <div className="text-xs text-slate-400">{item.desc}</div>
                          </div>
                          <InputSwitch
                            checked={config[item.key]}
                            onChange={(e) => setConfig({ ...config, [item.key]: e.value })}
                            className="p-inputswitch-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TEXTS & CONTENT */}
              {activeTab === 'content' && (
                <div className="flex flex-column gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Slip Title Banner:</label>
                    <InputText
                      value={config.slipTitle}
                      onChange={(e) => setConfig({ ...config, slipTitle: e.target.value })}
                      className="p-inputtext-sm w-full"
                    />
                  </div>

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
          <Card className="shadow-2 border-round-xl p-0 overflow-hidden sticky" style={{ top: '16px' }}>
            <div
              className="no-print flex flex-wrap align-items-center justify-content-between p-3 border-bottom-1 surface-border gap-2"
              style={{ backgroundColor: '#ffffff' }}
            >
              <div className="flex align-items-center gap-2">
                <i className="pi pi-eye text-indigo-600"></i>
                <span className="text-sm font-bold text-slate-800">Live Slip Preview</span>
                <span className="text-xs text-indigo-600 font-bold px-2 py-0.5 border-round bg-indigo-50">
                  {config.pageSize} {config.pageOrientation} • Max: {maxWidthPx}px
                </span>
              </div>

              {/* Action Buttons: Preview Modal, Download PDF, Isolated Print */}
              <div className="flex align-items-center gap-2">
                <Button
                  label="Modal View"
                  icon="pi pi-window-maximize"
                  className="p-button-outlined p-button-secondary p-button-sm font-semibold"
                  tooltip="Preview full-screen slip dialog"
                  onClick={() => setPreviewModalOpen(true)}
                />
                <Button
                  label="Download PDF"
                  icon="pi pi-file-pdf"
                  className="p-button-outlined p-button-danger p-button-sm font-semibold"
                  tooltip="Directly download PDF file"
                  onClick={() => downloadElementAsPdf('printable-enquiry-slip', `Enquiry_Slip_${config.schoolName || 'Template'}.pdf`)}
                />
                <Button
                  label="Print Slip"
                  icon="pi pi-print"
                  className="p-button-primary p-button-sm font-bold"
                  style={{ backgroundColor: config.primaryColor, borderColor: config.primaryColor }}
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
                minHeight: '640px',
                maxHeight: '85vh',
                overflowY: 'auto',
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
