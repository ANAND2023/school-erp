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
  { name: 'Forest Emerald', primary: '#065f46', secondary: '#ecfdf5', accent: '#064e3b', border: '#065f46' },
  { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#eff6ff', accent: '#172554', border: '#1e3a8a' },
  { name: 'Teal Elegance', primary: '#0f766e', secondary: '#f0fdfa', accent: '#115e59', border: '#0f766e' },
  { name: 'Crimson Heritage', primary: '#991b1b', secondary: '#fef2f2', accent: '#7f1d1d', border: '#991b1b' },
  { name: 'Imperial Violet', primary: '#581c87', secondary: '#faf5ff', accent: '#3b0764', border: '#581c87' },
  { name: 'Slate Executive', primary: '#1e293b', secondary: '#f8fafc', accent: '#0f172a', border: '#334155' },
  { name: 'Amber Gold', primary: '#b45309', secondary: '#fffbeb', accent: '#78350f', border: '#b45309' },
];

const FONT_OPTIONS = [
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Poppins (Geometric & Friendly)', value: 'Poppins, sans-serif' },
  { label: 'Roboto (Balanced Neo-Grotesque)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Premium Bold)', value: 'Montserrat, sans-serif' },
  { label: 'Segoe UI (System Standard)', value: '"Segoe UI", -apple-system, sans-serif' },
  { label: 'Arial / Sans-Serif', value: 'Arial, Helvetica, sans-serif' },
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

const HEADER_DIVIDER_OPTIONS = [
  { label: 'Double Line (2.5px)', value: 'Double' },
  { label: 'Solid Line (1.5px)', value: 'Solid' },
  { label: 'Dashed Line (1.5px)', value: 'Dashed' },
  { label: 'No Bottom Line', value: 'None' },
];

const BORDER_STYLES = [
  { label: 'Solid Border', value: 'Solid' },
  { label: 'Double Border', value: 'Double' },
  { label: 'Dashed Border', value: 'Dashed' },
  { label: 'Clean / Borderless', value: 'None' },
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

export const AdmissionSlipDesignerPage = () => {
  const toastRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [activeTab, setActiveTab] = useState('header'); // 'header' | 'layout' | 'elements' | 'documents' | 'content' | 'sections'
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [newDocText, setNewDocText] = useState('');

  // Admission Slip Config State
  const [config, setConfig] = useState({
    schoolId: null,
    schoolName: 'Platform Default (All Schools)',
    isSchoolOverride: false,

    // Colors & Fonts
    primaryColor: '#065f46',
    secondaryColor: '#ecfdf5',
    accentColor: '#064e3b',
    borderColor: '#065f46',
    fontFamily: 'Inter, sans-serif',
    fontScale: 'Normal',
    baseFontSize: 12,
    fontScalePercent: 100,
    headerLayout: 'Classic',
    borderStyle: 'Solid',

    // Sizing Controls
    logoSize: 56,
    photoWidth: 76,
    photoHeight: 92,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargin: '6mm',
    pagePadding: 16,
    pageMaxWidth: 800,

    // Header Customization
    headerSchoolNameCustom: '',
    headerSchoolNameFontSize: 22,
    headerSchoolNameColor: '#065f46',
    headerSchoolNameFontWeight: '900',
    headerSchoolNameFontFamily: 'inherit',
    headerSchoolNameTransform: 'uppercase',
    headerSchoolNameLetterSpacing: '0.8px',

    headerSubtitleCustom: '',
    headerSubtitleFontSize: 12,
    headerSubtitleColor: '#334155',
    headerSubtitleFontWeight: '600',

    headerAddressCustom: '',
    headerAddressFontSize: 11,
    headerAddressColor: '#475569',

    headerAlignment: 'center',
    headerBgColor: 'transparent',
    headerPaddingY: 8,
    headerDividerStyle: 'Double',
    headerDividerColor: '#065f46',

    // Slip Title Badge
    slipTitle: 'OFFICIAL STUDENT ADMISSION & REGISTRATION ACKNOWLEDGEMENT',
    slipSubtitle: 'Academic Enrollment & Verification Document',
    slipTitleBgColor: '#065f46',
    slipTitleTextColor: '#ffffff',
    slipTitleFontSize: 12,

    // Watermark
    watermarkText: 'CONFIRMED ADMISSION',
    showWatermark: false,

    // Element Toggles
    showSchoolLogo: true,
    showAffiliationNo: true,
    showStudentPhotoBox: true,
    showFatherPhotoBox: true,
    showMotherPhotoBox: true,
    showGuardianPhotoBox: true,
    showSchoolSealBox: true,
    showQrCode: true,
    showDobInWords: true,
    showBloodGroup: true,
    showAadhaarNo: true,
    showCategory: true,
    showEmergencyContact: true,
    showPreviousSchool: true,
    showTransportDetails: true,
    showHostelDetails: false,
    showDocumentsChecklist: true,
    showDeclaration: true,
    showSignatures: true,

    // Signatures
    signature1: 'Parent / Guardian Signature',
    signature2: 'Admission Counselor / Clerk',
    signature3: 'Principal / Head of Institution',

    // Content Texts
    declarationTitle: 'DECLARATION BY PARENT / GUARDIAN:',
    declarationText:
      'I hereby declare that all particulars stated in this admission application form are true, correct, and complete to the best of my knowledge and belief. I agree to abide by all the rules, regulations, code of conduct, and fee policies of the school as in force from time to time.',

    documentsRequired: [
      '1. Original Birth Certificate (Municipal Corp / Gram Panchayat)',
      '2. Student & Parents\' Aadhaar Cards (Photocopies)',
      '3. Transfer Certificate (TC) from Previous School (Countersigned)',
      '4. Previous Class Marksheet / Progress Report Card',
      '5. 4 Passport-size Photographs of Student & 2 of Parents',
      '6. Valid Address Proof (Electricity Bill / Voter ID / Passport / Domicile)',
    ],

    footerText: 'Generated from DVS ERP (Digital Vidya Sarthi) • Official Student Admission Slip',

    // Drag and Drop Sections
    sections: [
      { key: 'header', title: 'School Header & Affiliation', visible: true, order: 1 },
      { key: 'meta_bar', title: 'Admission Reference & Status Bar', visible: true, order: 2 },
      { key: 'student_profile', title: 'Student Personal & Contact Details', visible: true, order: 3 },
      { key: 'parents_info', title: 'Parents / Guardian Information', visible: true, order: 4 },
      { key: 'academic_admission', title: 'Class, Section, Roll & Academic Info', visible: true, order: 5 },
      { key: 'additional_details', title: 'Category, Blood Group, Aadhaar & Transport', visible: true, order: 6 },
      { key: 'photos_strip', title: 'Student & Parents Photographs Strip', visible: true, order: 7 },
      { key: 'documents_checklist', title: 'Admission Documents Verification Checklist', visible: true, order: 8 },
      { key: 'declaration', title: 'Parent Undertaking & Declaration', visible: true, order: 9 },
      { key: 'signatures', title: 'Signatures & School Seal', visible: true, order: 10 },
      { key: 'footer', title: 'Footer System Note', visible: true, order: 11 },
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
      const res = await superAdminApi.getAdmissionSlipConfig(schoolId);
      if (res?.success && res.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data,
          headerSchoolNameCustom: res.data.headerSchoolNameCustom || '',
          headerSchoolNameFontSize: res.data.headerSchoolNameFontSize || 22,
          headerSchoolNameColor: res.data.headerSchoolNameColor || res.data.primaryColor || '#065f46',
          headerSchoolNameFontWeight: res.data.headerSchoolNameFontWeight || '900',
          headerSchoolNameFontFamily: res.data.headerSchoolNameFontFamily || 'inherit',
          headerSchoolNameTransform: res.data.headerSchoolNameTransform || 'uppercase',
          headerSchoolNameLetterSpacing: res.data.headerSchoolNameLetterSpacing || '0.8px',
          headerSubtitleCustom: res.data.headerSubtitleCustom || '',
          headerSubtitleFontSize: res.data.headerSubtitleFontSize || 12,
          headerSubtitleColor: res.data.headerSubtitleColor || '#334155',
          headerAddressCustom: res.data.headerAddressCustom || '',
          headerAddressFontSize: res.data.headerAddressFontSize || 11,
          headerAddressColor: res.data.headerAddressColor || '#475569',
          headerAlignment: res.data.headerAlignment || 'center',
          headerBgColor: res.data.headerBgColor || 'transparent',
          headerPaddingY: res.data.headerPaddingY || 8,
          headerDividerStyle: res.data.headerDividerStyle || 'Double',
          headerDividerColor: res.data.headerDividerColor || res.data.borderColor || '#065f46',
          slipTitleBgColor: res.data.slipTitleBgColor || res.data.primaryColor || '#065f46',
          slipTitleTextColor: res.data.slipTitleTextColor || '#ffffff',
          slipTitleFontSize: res.data.slipTitleFontSize || 12,
          logoSize: res.data.logoSize || 56,
          photoWidth: res.data.photoWidth || 76,
          photoHeight: res.data.photoHeight || 92,
          baseFontSize: res.data.baseFontSize || 12,
          fontScalePercent: res.data.fontScalePercent || 100,
          pageSize: res.data.pageSize || 'A4',
          pageOrientation: res.data.pageOrientation || 'portrait',
          pageMargin: res.data.pageMargin || '6mm',
          pagePadding: res.data.pagePadding || 16,
          pageMaxWidth: res.data.pageMaxWidth || 800,
          signature1: res.data.signature1 || 'Parent / Guardian Signature',
          signature2: res.data.signature2 || 'Admission Counselor / Clerk',
          signature3: res.data.signature3 || 'Principal / Head of Institution',
          documentsRequired:
            Array.isArray(res.data.documentsRequired) && res.data.documentsRequired.length > 0
              ? res.data.documentsRequired
              : prev.documentsRequired,
        }));
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load admission slip configuration',
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await superAdminApi.saveAdmissionSlipConfig(config, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Saved Successfully',
          detail: selectedSchoolId
            ? `Custom admission slip saved for school #${selectedSchoolId}`
            : 'Platform default admission slip template updated',
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
      const res = await superAdminApi.resetAdmissionSlipConfig(selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Reset Successful',
          detail: 'School admission slip reset to platform default',
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

  // Manage documents required
  const handleAddDocument = () => {
    if (!newDocText.trim()) return;
    setConfig((prev) => ({
      ...prev,
      documentsRequired: [...prev.documentsRequired, newDocText.trim()],
    }));
    setNewDocText('');
  };

  const handleRemoveDocument = (docIndex) => {
    setConfig((prev) => ({
      ...prev,
      documentsRequired: prev.documentsRequired.filter((_, idx) => idx !== docIndex),
    }));
  };

  const handlePrintSlip = () => {
    printElement('printable-admission-slip', {
      title: `Admission_Slip_${config.schoolName || 'Template'}`,
      pageSize: config.pageSize || 'A4',
      orientation: config.pageOrientation || 'portrait',
      margin: config.pageMargin || '6mm',
    });
  };

  // Mock admission student data for preview
  const defaultSchoolName = selectedSchoolId
    ? schools.find((s) => s.id === selectedSchoolId)?.name || 'DELHI PUBLIC SCHOOL'
    : 'DELHI PUBLIC SCHOOL';

  const mockStudent = {
    fullName: 'AARAV SHARMA',
    admissionNo: 'DPS-2026-0428',
    admissionDate: '14 Oct 2026',
    dobFigures: '12-05-2012',
    dobWords: 'Twelfth May Two Thousand Twelve',
    gender: 'Male',
    bloodGroup: 'B+ Positive',
    aadhaarNo: '7829-4019-2049',
    category: 'General',
    className: 'Class 9',
    sectionName: 'Section A',
    rollNo: '18',
    academicYear: '2026-2027',
    fatherName: 'Mr. Rajesh Sharma',
    fatherPhone: '+91 9911360909',
    fatherOccupation: 'Senior Business Manager',
    motherName: 'Mrs. Sunita Sharma',
    motherPhone: '+91 9811223344',
    motherOccupation: 'Software Engineer',
    guardianName: 'Mr. Rajesh Sharma',
    address: 'Flat 402, Royal Palms, Sector 12, RK Puram, New Delhi - 110022',
    emergencyContact: '+91 9911360909',
    previousSchool: 'St. Paul Convent School, New Delhi',
    transportRoute: 'Route 4 - Sector 12 to School Campus (Bus #12)',
  };

  const isVisible = (key) => {
    const sec = config.sections.find((s) => s.key === key);
    return sec ? sec.visible : true;
  };

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Toast ref={toastRef} />

      {/* Top Header Bar */}
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
        <div>
          <div className="flex align-items-center gap-2">
            <h1 className="text-2xl font-bold text-900 m-0">Dynamic Admission Slip Designer</h1>
            <Tag value="School-Wise & Global" severity="success" rounded></Tag>
          </div>
          <p className="text-500 text-sm m-0 mt-1">
            Customize admission slip header, school branding, student/parent fields, document checklist, undertaking declaration, signatures, and stamps.
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
            className="p-button-success p-button-sm"
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
                { id: 'elements', label: 'Student & Photos', icon: 'pi pi-user' },
                { id: 'documents', label: 'Documents Checklist', icon: 'pi pi-list' },
                { id: 'content', label: 'Declaration & Signatures', icon: 'pi pi-pencil' },
                { id: 'sections', label: 'Sections Order', icon: 'pi pi-sort-alt' },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  className={`p-button-sm ${
                    activeTab === tab.id ? 'p-button-success' : 'p-button-text p-button-secondary'
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
                    <label className="text-xs font-medium text-700">Font Size: {config.headerSchoolNameFontSize}px</label>
                    <input
                      type="range"
                      min="14"
                      max="34"
                      value={config.headerSchoolNameFontSize || 22}
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
                  <label className="text-xs font-medium text-700">Affiliation & Board Subtitle</label>
                  <InputText
                    value={config.headerSubtitleCustom || ''}
                    onChange={(e) => setConfig({ ...config, headerSubtitleCustom: e.target.value })}
                    placeholder="e.g. Affiliated to CBSE, New Delhi (Affiliation No: 2130892)"
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Campus Address & Contact Phone Line</label>
                  <InputText
                    value={config.headerAddressCustom || ''}
                    onChange={(e) => setConfig({ ...config, headerAddressCustom: e.target.value })}
                    placeholder="e.g. Sector 12, RK Puram, New Delhi - 110022 • Phone: +91 11 2617 8900"
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
                      value={config.headerDividerStyle || 'Double'}
                      options={HEADER_DIVIDER_OPTIONS}
                      onChange={(e) => setConfig({ ...config, headerDividerStyle: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Slip Title & Watermark</h3>
                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Slip Title Banner Heading</label>
                  <InputText
                    value={config.slipTitle || 'OFFICIAL STUDENT ADMISSION & REGISTRATION ACKNOWLEDGEMENT'}
                    onChange={(e) => setConfig({ ...config, slipTitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="flex align-items-center justify-content-between p-2 border-1 border-200 border-round">
                  <span className="text-sm font-medium">Show Background Watermark</span>
                  <InputSwitch
                    checked={config.showWatermark}
                    onChange={(e) => setConfig({ ...config, showWatermark: e.value })}
                  />
                </div>
                {config.showWatermark && (
                  <div className="field mt-2">
                    <label className="text-xs font-medium text-700">Watermark Text</label>
                    <InputText
                      value={config.watermarkText || 'CONFIRMED ADMISSION'}
                      onChange={(e) => setConfig({ ...config, watermarkText: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Layout & Sizing */}
            {activeTab === 'layout' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Page Dimensions & Typography</h3>
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
                      value={config.pageMargin || '6mm'}
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
                    <label className="text-xs font-medium text-700">Font Family</label>
                    <Dropdown
                      value={config.fontFamily || 'Inter, sans-serif'}
                      options={FONT_OPTIONS}
                      onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Base Font Size: {config.baseFontSize || 12}px</label>
                    <input
                      type="range"
                      min="10"
                      max="15"
                      value={config.baseFontSize || 12}
                      onChange={(e) => setConfig({ ...config, baseFontSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Photo Box & Logo Dimensions</h3>
                <div className="grid">
                  <div className="col-4">
                    <label className="text-xs font-medium text-700">School Logo: {config.logoSize || 56}px</label>
                    <input
                      type="range"
                      min="36"
                      max="80"
                      value={config.logoSize || 56}
                      onChange={(e) => setConfig({ ...config, logoSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="col-4">
                    <label className="text-xs font-medium text-700">Photo Width: {config.photoWidth || 76}px</label>
                    <input
                      type="range"
                      min="60"
                      max="120"
                      value={config.photoWidth || 76}
                      onChange={(e) => setConfig({ ...config, photoWidth: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="col-4">
                    <label className="text-xs font-medium text-700">Photo Height: {config.photoHeight || 92}px</label>
                    <input
                      type="range"
                      min="70"
                      max="140"
                      value={config.photoHeight || 92}
                      onChange={(e) => setConfig({ ...config, photoHeight: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Student & Photos Elements */}
            {activeTab === 'elements' && (
              <div className="flex flex-column gap-2">
                <h3 className="text-base font-semibold text-800 m-0 mb-2">Display Elements & Toggles</h3>
                {[
                  { key: 'showSchoolLogo', label: 'School Logo / Seal' },
                  { key: 'showAffiliationNo', label: 'Affiliation & Registration Number' },
                  { key: 'showStudentPhotoBox', label: 'Student Photo Box' },
                  { key: 'showFatherPhotoBox', label: 'Father Photo Box' },
                  { key: 'showMotherPhotoBox', label: 'Mother Photo Box' },
                  { key: 'showGuardianPhotoBox', label: 'Guardian Photo Box' },
                  { key: 'showDobInWords', label: 'Date of Birth in Words' },
                  { key: 'showBloodGroup', label: 'Blood Group Tag' },
                  { key: 'showAadhaarNo', label: 'Student Aadhaar Number' },
                  { key: 'showCategory', label: 'Social Category (GEN/OBC/SC/ST)' },
                  { key: 'showEmergencyContact', label: 'Emergency Contact Line' },
                  { key: 'showPreviousSchool', label: 'Previous School & TC Info' },
                  { key: 'showTransportDetails', label: 'Transport / Bus Route Details' },
                  { key: 'showQrCode', label: 'QR Code for Online Verification' },
                  { key: 'showSchoolSealBox', label: 'School Seal / Stamp Box' },
                  { key: 'showDocumentsChecklist', label: 'Documents Verification Checklist' },
                  { key: 'showDeclaration', label: 'Parent Undertaking & Declaration' },
                  { key: 'showSignatures', label: 'Signatures Line' },
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

            {/* Tab 4: Documents Checklist */}
            {activeTab === 'documents' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Required Admission Documents</h3>
                <p className="text-xs text-500 m-0">
                  These document items appear in the Admission Documents Verification Checklist with verification status.
                </p>

                <div className="flex gap-2">
                  <InputText
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    placeholder="e.g. 7. Medical Fitness Certificate"
                    className="p-inputtext-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDocument()}
                  />
                  <Button
                    icon="pi pi-plus"
                    label="Add"
                    className="p-button-sm p-button-success"
                    onClick={handleAddDocument}
                    disabled={!newDocText.trim()}
                  />
                </div>

                <div className="flex flex-column gap-2 mt-2">
                  {config.documentsRequired.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex align-items-center justify-content-between p-2 border-1 border-200 border-round bg-white"
                    >
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-file text-500"></i>
                        <span className="text-xs font-semibold text-800">{doc}</span>
                      </div>
                      <Button
                        icon="pi pi-trash"
                        className="p-button-text p-button-danger p-button-sm p-1"
                        onClick={() => handleRemoveDocument(idx)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 5: Declaration & Signatures */}
            {activeTab === 'content' && (
              <div className="flex flex-column gap-3">
                <h3 className="text-base font-semibold text-800 m-0">Parent Undertaking & Declaration</h3>
                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Declaration Heading</label>
                  <InputText
                    value={config.declarationTitle || 'DECLARATION BY PARENT / GUARDIAN:'}
                    onChange={(e) => setConfig({ ...config, declarationTitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Declaration Undertaking Text</label>
                  <InputTextarea
                    value={config.declarationText || ''}
                    onChange={(e) => setConfig({ ...config, declarationText: e.target.value })}
                    rows={4}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Signatures Labels</h3>
                <div className="grid">
                  <div className="col-4">
                    <label className="text-xs font-medium text-700">Left Signature</label>
                    <InputText
                      value={config.signature1 || 'Parent / Guardian Signature'}
                      onChange={(e) => setConfig({ ...config, signature1: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-4">
                    <label className="text-xs font-medium text-700">Center Signature</label>
                    <InputText
                      value={config.signature2 || 'Admission Counselor / Clerk'}
                      onChange={(e) => setConfig({ ...config, signature2: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-4">
                    <label className="text-xs font-medium text-700">Right Signature</label>
                    <InputText
                      value={config.signature3 || 'Principal / Head of Institution'}
                      onChange={(e) => setConfig({ ...config, signature3: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
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
                  Reorder or toggle sections to customize the layout of the admission confirmation slip.
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
                  <i className="pi pi-eye text-success"></i>
                  <span className="text-base font-bold text-800">Live Admission Slip Preview</span>
                </div>
                <Tag value="Full Sheet A4 Format" severity="success" />
              </div>
            }
          >
            <div
              id="printable-admission-slip"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: `${config.pagePadding || 16}px`,
                borderRadius: '4px',
                maxHeight: '78vh',
                overflowY: 'auto',
                fontFamily: config.fontFamily || 'Inter, sans-serif',
                fontSize: `${config.baseFontSize || 12}px`,
                color: '#111827',
                border:
                  config.borderStyle === 'Solid'
                    ? `1.5px solid ${config.borderColor}`
                    : config.borderStyle === 'Double'
                    ? `3px double ${config.borderColor}`
                    : config.borderStyle === 'Dashed'
                    ? `1.5px dashed ${config.borderColor}`
                    : '1px solid #e5e7eb',
                position: 'relative',
              }}
            >
              {/* Background Watermark */}
              {config.showWatermark && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-30deg)',
                    fontSize: '32px',
                    fontWeight: 900,
                    color: 'rgba(6, 95, 70, 0.08)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    zIndex: 0,
                  }}
                >
                  {config.watermarkText || 'CONFIRMED ADMISSION'}
                </div>
              )}

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* 1. Header */}
                {isVisible('header') && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: config.headerAlignment === 'left' ? 'flex-start' : 'center',
                      padding: `${config.headerPaddingY || 8}px 0`,
                      backgroundColor: config.headerBgColor !== 'transparent' ? config.headerBgColor : 'transparent',
                      borderBottom:
                        config.headerDividerStyle === 'Double'
                          ? `2.5px double ${config.headerDividerColor || config.borderColor}`
                          : config.headerDividerStyle === 'Solid'
                          ? `1.5px solid ${config.headerDividerColor || config.borderColor}`
                          : config.headerDividerStyle === 'Dashed'
                          ? `1.5px dashed ${config.headerDividerColor || config.borderColor}`
                          : 'none',
                      marginBottom: '8px',
                    }}
                  >
                    {config.showSchoolLogo && (
                      <div
                        style={{
                          flexShrink: 0,
                          marginRight: '12px',
                          width: `${config.logoSize || 56}px`,
                          height: `${config.logoSize || 56}px`,
                          borderRadius: '50%',
                          backgroundColor: config.secondaryColor,
                          border: `2px solid ${config.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: config.primaryColor,
                        }}
                      >
                        <i className="pi pi-building" style={{ fontSize: `${(config.logoSize || 56) * 0.45}px` }}></i>
                      </div>
                    )}

                    <div style={{ textAlign: config.headerAlignment === 'left' ? 'left' : 'center', flex: 1 }}>
                      <div
                        style={{
                          fontSize: `${config.headerSchoolNameFontSize || 22}px`,
                          fontWeight: config.headerSchoolNameFontWeight || '900',
                          color: config.headerSchoolNameColor || config.primaryColor,
                          textTransform: config.headerSchoolNameTransform || 'uppercase',
                          letterSpacing: config.headerSchoolNameLetterSpacing || '0.8px',
                          lineHeight: 1.2,
                        }}
                      >
                        {config.headerSchoolNameCustom || defaultSchoolName}
                      </div>

                      <div
                        style={{
                          fontSize: `${config.headerSubtitleFontSize || 12}px`,
                          fontWeight: config.headerSubtitleFontWeight || '600',
                          color: config.headerSubtitleColor || '#334155',
                          marginTop: '3px',
                        }}
                      >
                        {config.headerSubtitleCustom || 'Affiliated to CBSE, New Delhi (Affiliation No: 2130892)'}
                      </div>

                      <div
                        style={{
                          fontSize: `${config.headerAddressFontSize || 11}px`,
                          color: config.headerAddressColor || '#475569',
                          marginTop: '2px',
                        }}
                      >
                        {config.headerAddressCustom || 'Sector 12, RK Puram, New Delhi - 110022 • Phone: +91 11 2617 8900'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Meta Bar */}
                {isVisible('meta_bar') && (
                  <div
                    style={{
                      backgroundColor: config.secondaryColor,
                      border: `1px solid ${config.borderColor}`,
                      padding: '4px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      borderRadius: '2px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 'bold',
                        fontSize: `${config.slipTitleFontSize || 12}px`,
                        color: config.primaryColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {config.slipTitle || 'OFFICIAL STUDENT ADMISSION & REGISTRATION ACKNOWLEDGEMENT'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: config.primaryColor,
                        color: '#ffffff',
                      }}
                    >
                      STATUS: ADMITTED & CONFIRMED
                    </span>
                  </div>
                )}

                {/* 3. Student Personal Details */}
                {isVisible('student_profile') && (
                  <div
                    style={{
                      border: `1px solid ${config.borderColor}`,
                      marginBottom: '8px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: config.secondaryColor,
                        padding: '3px 8px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        color: config.primaryColor,
                        borderBottom: `1px solid ${config.borderColor}`,
                      }}
                    >
                      STUDENT PERSONAL & ADMISSION IDENTIFIERS
                    </div>
                    <div style={{ display: 'flex', borderBottom: `1px solid #e2e8f0` }}>
                      <div style={{ width: '50%', padding: '3px 8px', borderRight: `1px solid #e2e8f0` }}>
                        <b>Student Full Name:</b> <span style={{ fontWeight: 600 }}>{mockStudent.fullName}</span>
                      </div>
                      <div style={{ width: '50%', padding: '3px 8px' }}>
                        <b>Admission Number:</b>{' '}
                        <span style={{ fontWeight: 'bold', color: config.primaryColor }}>{mockStudent.admissionNo}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', borderBottom: `1px solid #e2e8f0` }}>
                      <div style={{ width: '50%', padding: '3px 8px', borderRight: `1px solid #e2e8f0` }}>
                        <b>Date of Birth:</b> <span>{mockStudent.dobFigures}</span>
                        {config.showDobInWords && (
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>({mockStudent.dobWords})</span>
                        )}
                      </div>
                      <div style={{ width: '50%', padding: '3px 8px' }}>
                        <b>Admission Date:</b> <span>{mockStudent.admissionDate}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '50%', padding: '3px 8px', borderRight: `1px solid #e2e8f0` }}>
                        <b>Gender:</b> <span>{mockStudent.gender}</span>
                        {config.showBloodGroup && <span style={{ marginLeft: '12px' }}><b>Blood:</b> {mockStudent.bloodGroup}</span>}
                      </div>
                      <div style={{ width: '50%', padding: '3px 8px' }}>
                        {config.showAadhaarNo && <span><b>Aadhaar No:</b> {mockStudent.aadhaarNo}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Academic Details */}
                {isVisible('academic_admission') && (
                  <div
                    style={{
                      border: `1px solid ${config.borderColor}`,
                      marginBottom: '8px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: config.secondaryColor,
                        padding: '3px 8px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        color: config.primaryColor,
                        borderBottom: `1px solid ${config.borderColor}`,
                      }}
                    >
                      CLASS & ACADEMIC ALLOCATION
                    </div>
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '33%', padding: '3px 8px', borderRight: `1px solid #e2e8f0` }}>
                        <b>Class:</b> <span>{mockStudent.className}</span>
                      </div>
                      <div style={{ width: '33%', padding: '3px 8px', borderRight: `1px solid #e2e8f0` }}>
                        <b>Section & Roll:</b> <span>{mockStudent.sectionName} (Roll #{mockStudent.rollNo})</span>
                      </div>
                      <div style={{ width: '34%', padding: '3px 8px' }}>
                        <b>Academic Year:</b> <span>{mockStudent.academicYear}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Parents / Guardian Info */}
                {isVisible('parents_info') && (
                  <div
                    style={{
                      border: `1px solid ${config.borderColor}`,
                      marginBottom: '8px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: config.secondaryColor,
                        padding: '3px 8px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        color: config.primaryColor,
                        borderBottom: `1px solid ${config.borderColor}`,
                      }}
                    >
                      PARENTS & RESIDENTIAL CONTACT
                    </div>
                    <div style={{ display: 'flex', borderBottom: `1px solid #e2e8f0` }}>
                      <div style={{ width: '50%', padding: '3px 8px', borderRight: `1px solid #e2e8f0` }}>
                        <b>Father:</b> <span>{mockStudent.fatherName}</span>
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>Ph: {mockStudent.fatherPhone}</span>
                      </div>
                      <div style={{ width: '50%', padding: '3px 8px' }}>
                        <b>Mother:</b> <span>{mockStudent.motherName}</span>
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>Ph: {mockStudent.motherPhone}</span>
                      </div>
                    </div>
                    <div style={{ padding: '3px 8px' }}>
                      <b>Residential Address:</b> <span>{mockStudent.address}</span>
                    </div>
                  </div>
                )}

                {/* 6. Photos Strip */}
                {isVisible('photos_strip') && (config.showStudentPhotoBox || config.showFatherPhotoBox || config.showMotherPhotoBox) && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'center',
                      marginBottom: '8px',
                      padding: '6px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                    }}
                  >
                    {config.showStudentPhotoBox && (
                      <div
                        style={{
                          width: `${config.photoWidth || 76}px`,
                          height: `${config.photoHeight || 92}px`,
                          border: `1.5px dashed ${config.borderColor}`,
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#ffffff',
                          fontSize: '9px',
                          color: '#64748b',
                        }}
                      >
                        <i className="pi pi-user" style={{ fontSize: '20px', color: config.primaryColor, marginBottom: '2px' }}></i>
                        Student Photo
                      </div>
                    )}

                    {config.showFatherPhotoBox && (
                      <div
                        style={{
                          width: `${config.photoWidth || 76}px`,
                          height: `${config.photoHeight || 92}px`,
                          border: '1px dashed #94a3b8',
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#ffffff',
                          fontSize: '9px',
                          color: '#64748b',
                        }}
                      >
                        <i className="pi pi-user" style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '2px' }}></i>
                        Father Photo
                      </div>
                    )}

                    {config.showMotherPhotoBox && (
                      <div
                        style={{
                          width: `${config.photoWidth || 76}px`,
                          height: `${config.photoHeight || 92}px`,
                          border: '1px dashed #94a3b8',
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#ffffff',
                          fontSize: '9px',
                          color: '#64748b',
                        }}
                      >
                        <i className="pi pi-user" style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '2px' }}></i>
                        Mother Photo
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Documents Checklist */}
                {isVisible('documents_checklist') && config.showDocumentsChecklist && (
                  <div
                    style={{
                      border: `1px solid ${config.borderColor}`,
                      marginBottom: '8px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: config.secondaryColor,
                        padding: '3px 8px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        color: config.primaryColor,
                        borderBottom: `1px solid ${config.borderColor}`,
                      }}
                    >
                      ADMISSION DOCUMENTS VERIFICATION CHECKLIST
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '6px 8px' }}>
                      {config.documentsRequired.map((doc, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                          <span>{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Declaration */}
                {isVisible('declaration') && config.showDeclaration && (
                  <div
                    style={{
                      border: '1px solid #cbd5e1',
                      padding: '6px 8px',
                      marginBottom: '8px',
                      backgroundColor: '#f8fafc',
                      fontSize: '10px',
                      lineHeight: 1.3,
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: config.primaryColor, marginBottom: '2px' }}>
                      {config.declarationTitle}
                    </div>
                    <div style={{ color: '#334155' }}>{config.declarationText}</div>
                  </div>
                )}

                {/* 9. Signatures */}
                {isVisible('signatures') && config.showSignatures && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      marginTop: '20px',
                      marginBottom: '6px',
                      padding: '0 8px',
                    }}
                  >
                    <div style={{ textAlign: 'center', width: '28%' }}>
                      <div style={{ borderTop: '1px dashed #64748b', paddingTop: '3px', fontSize: '10px', fontWeight: 'bold' }}>
                        {config.signature1}
                      </div>
                    </div>

                    {config.showSchoolSealBox && (
                      <div
                        style={{
                          width: '70px',
                          height: '46px',
                          border: '1px dashed #94a3b8',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                        }}
                      >
                        School Seal
                      </div>
                    )}

                    <div style={{ textAlign: 'center', width: '28%' }}>
                      <div style={{ borderTop: '1px dashed #64748b', paddingTop: '3px', fontSize: '10px', fontWeight: 'bold' }}>
                        {config.signature2}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', width: '28%' }}>
                      <div style={{ borderTop: '1px dashed #64748b', paddingTop: '3px', fontSize: '10px', fontWeight: 'bold' }}>
                        {config.signature3}
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. Footer */}
                {isVisible('footer') && (
                  <div
                    style={{
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '4px',
                      textAlign: 'center',
                      fontSize: '9px',
                      color: '#64748b',
                      marginTop: '6px',
                    }}
                  >
                    {config.footerText}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdmissionSlipDesignerPage;
