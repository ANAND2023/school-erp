import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Slider } from 'primereact/slider';
import { superAdminApi } from '../api/superAdminApi';
import { printElement } from '../../../utils/printUtils';
import { DEFAULT_CERT_TEMPLATES } from '../../students/components/BonafideCertificateModal';

const PRESET_PALETTES = [
  { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#eff6ff', accent: '#172554', border: '#1e3a8a' },
  { name: 'Forest Emerald', primary: '#065f46', secondary: '#ecfdf5', accent: '#064e3b', border: '#065f46' },
  { name: 'Regal Maroon', primary: '#831843', secondary: '#fdf2f8', accent: '#701a75', border: '#831843' },
  { name: 'Classic Slate', primary: '#1e293b', secondary: '#f8fafc', accent: '#0f172a', border: '#334155' },
  { name: 'Imperial Violet', primary: '#581c87', secondary: '#faf5ff', accent: '#3b0764', border: '#581c87' },
  { name: 'Amber Gold', primary: '#b45309', secondary: '#fffbeb', accent: '#78350f', border: '#b45309' },
  { name: 'Teal Elegance', primary: '#0f766e', secondary: '#f0fdfa', accent: '#115e59', border: '#0f766e' },
];

const CERT_TYPES = [
  { id: 'bonafide', label: 'Bonafide Certificate', shortLabel: 'Bonafide', icon: 'pi pi-file', badge: 'DPS/BC', color: '#1e3a8a' },
  { id: 'birth', label: 'Date of Birth Certificate', shortLabel: 'Birth / DOB', icon: 'pi pi-id-card', badge: 'DPS/DOB', color: '#0f766e' },
  { id: 'age', label: 'Certificate of Age', shortLabel: 'Age Verification', icon: 'pi pi-calendar', badge: 'DPS/AGE', color: '#b45309' },
  { id: 'character', label: 'Character Certificate', shortLabel: 'Conduct & Character', icon: 'pi pi-star', badge: 'DPS/CC', color: '#831843' },
  { id: 'ret', label: 'RET Certificate', shortLabel: 'Record of Education', icon: 'pi pi-book', badge: 'DPS/RET', color: '#581c87' },
];

const FONT_OPTIONS = [
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Poppins (Geometric & Friendly)', value: 'Poppins, sans-serif' },
  { label: 'Roboto (Balanced Neo-Grotesque)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Premium Bold)', value: 'Montserrat, sans-serif' },
  { label: 'Georgia (Classic Academic Serif)', value: 'Georgia, serif' },
  { label: 'Times New Roman (Traditional Formal)', value: '"Times New Roman", Times, serif' },
  { label: 'Segoe UI (System Standard)', value: '"Segoe UI", -apple-system, sans-serif' },
];

const BORDER_STYLES = [
  { label: 'Double Border (Traditional Certificate)', value: 'Double' },
  { label: 'Solid Border (Modern Clean)', value: 'Solid' },
  { label: 'Dashed Border', value: 'Dashed' },
  { label: 'Antique Ornate Border', value: 'Antique' },
  { label: 'Clean / Borderless', value: 'None' },
];

const PAGE_SIZE_OPTIONS = [
  { label: 'A4 Paper (Standard Full Page)', value: 'A4' },
  { label: 'A5 Paper (Half Page / Compact)', value: 'A5' },
  { label: 'Letter (8.5 × 11 in)', value: 'Letter' },
];

const DEFAULT_ELEMENTS = [
  { id: 'header', label: 'School Header & Crest', x: 24, y: 24, width: 752, height: 110, visible: true },
  { id: 'ref_date', label: 'Ref No & Issue Date', x: 24, y: 150, width: 752, height: 32, visible: true },
  { id: 'title_badge', label: 'Certificate Title Heading', x: 24, y: 195, width: 752, height: 48, visible: true },
  { id: 'body_statement', label: 'Certification Text Area', x: 24, y: 260, width: 620, height: 210, visible: true },
  { id: 'photo', label: 'Student Photo Box', x: 665, y: 260, width: 96, height: 120, visible: true },
  { id: 'details_table', label: 'Student Details Grid', x: 24, y: 490, width: 752, height: 95, visible: true },
  { id: 'conduct_purpose', label: 'Conduct & Purpose Statement', x: 24, y: 605, width: 752, height: 75, visible: true },
  { id: 'signatures', label: 'Signatures & Official Seal', x: 24, y: 710, width: 752, height: 110, visible: true },
  { id: 'footer', label: 'System Verification Footer', x: 24, y: 840, width: 752, height: 28, visible: true },
];

const SAMPLE_STUDENT = {
  studentName: 'AARAV SHARMA',
  admissionNo: 'DPS-2024-0412',
  admissionDate: '05-Apr-2024',
  rollNo: '24',
  className: 'Class X',
  sectionName: 'A',
  academicYear: '2025-2026',
  fatherName: 'Dr. Vikram Sharma',
  motherName: 'Mrs. Anjali Sharma',
  dob: '14-Aug-2010',
  dobWords: 'Fourteenth August Two Thousand Ten',
  gender: 'Male',
  bloodGroup: 'B+ Positive',
  aadhaarNo: 'XXXX-XXXX-9821',
  address: 'H-402, Green Avenue, Civil Lines, Jaipur (Rajasthan)',
  photoUrl: '/dvslogo1.jpeg',
  purpose: 'Passport Application',
  refNo: 'DPS/CERT/2026/0412',
  issueDate: '23-Nov-2026',
  calculatedAge: '16 Years, 3 Months, 9 Days',
  ageYears: '16',
  ageMonths: '3',
  ageDays: '9',
  asOnDate: '23-Nov-2026',
  conductRating: 'Exemplary',
};

export const BonafideCertificateDesignerPage = () => {
  const toastRef = useRef(null);
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [selectedCertType, setSelectedCertType] = useState('bonafide');
  const [activeTab, setActiveTab] = useState('colors'); // 'colors' | 'letterhead' | 'dragdrop' | 'statement' | 'header' | 'elements' | 'layout' | 'signatures'

  // Drag and Drop State
  const [selectedElementId, setSelectedElementId] = useState('body_statement');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [config, setConfig] = useState({
    schoolId: null,
    schoolName: 'Platform Default (All Schools)',
    isSchoolOverride: false,

    // Letterhead Background Controls
    letterheadBgImage: '',
    useLetterhead: false,
    hideHeaderOnLetterhead: false,
    hideBorderOnLetterhead: false,
    letterheadTopMargin: 140,
    letterheadBottomMargin: 80,
    letterheadFit: 'contain',
    letterheadOpacity: 100,

    // Layout Mode ('flow' or 'drag')
    layoutMode: 'flow',
    elements: DEFAULT_ELEMENTS,

    // Styling
    primaryColor: '#1e3a8a',
    secondaryColor: '#eff6ff',
    accentColor: '#172554',
    borderColor: '#1e3a8a',
    bodyTextColor: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    fontScale: 'Normal',
    baseFontSize: 13,
    fontScalePercent: 100,
    headerLayout: 'Classic',
    borderStyle: 'Double',

    // Sizing
    logoSize: 64,
    photoWidth: 80,
    photoHeight: 96,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargin: '8mm',
    pagePadding: 24,
    pageMaxWidth: 800,

    // Header
    headerSchoolNameCustom: '',
    headerSchoolNameFontSize: 24,
    headerSchoolNameColor: '#1e3a8a',
    headerSchoolNameFontWeight: '900',
    headerSchoolNameFontFamily: 'inherit',
    headerSchoolNameTransform: 'uppercase',
    headerSchoolNameLetterSpacing: '1px',
    headerSubtitleCustom: '',
    headerSubtitleFontSize: 12,
    headerSubtitleColor: '#334155',
    headerSubtitleFontWeight: '600',
    headerAddressCustom: '',
    headerAddressFontSize: 11,
    headerAddressColor: '#475569',
    headerAlignment: 'center',
    headerBgColor: 'transparent',
    headerPaddingY: 12,
    headerDividerStyle: 'Double',
    headerDividerColor: '#1e3a8a',

    // Titles
    certificateTitle: 'BONAFIDE CERTIFICATE',
    certificateSubtitle: 'TO WHOMSOEVER IT MAY CONCERN',
    titleBgColor: '#1e3a8a',
    titleTextColor: '#ffffff',
    titleFontSize: 16,
    refPrefix: 'DPS/BC',

    // Content Statements
    bodySalutation: 'This is to certify that',
    bodyTemplateText:
      'This is to certify that {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, is a bonafide student of this institution studying in Class {Class} (Section {Section}), Roll No {RollNo}, Admission No {AdmissionNo}, for the Academic Session {AcademicYear}.',
    dobSentenceText:
      'As per the official school records, his/her Date of Birth is {DOB} (in words: {DOBWords}).',
    conductSentenceText:
      'To the best of our knowledge, he/she bears a good moral character and conduct during his/her tenure in this institution.',
    purposeSentenceText:
      'This certificate is issued upon the request of the parent/guardian for {Purpose} purpose only.',
    defaultPurpose: 'official verification',

    // Watermark & Security
    watermarkText: 'BONAFIDE',
    showWatermark: true,
    showQrCode: true,
    showSchoolSealBox: true,

    // Toggles
    showSchoolLogo: true,
    showAffiliationNo: true,
    showStudentPhoto: true,
    showDetailsTable: true,
    showAddress: false,
    showBloodGroup: true,
    showAadhaarNo: true,
    showSignatures: true,
    showIssueDate: true,
    showRefNo: true,

    // Signatures
    signature1: 'Class Teacher',
    signature2: 'Checked By / Office Clerk',
    signature3: 'Principal / Head of Institution',

    // Footer
    footerText:
      'This document is an electronically verified bonafide certificate issued by DVS ERP • Digital Vidya Sarthi',
  });

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    loadTemplate(selectedSchoolId, selectedCertType);
  }, [selectedSchoolId, selectedCertType]);

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

  const loadTemplate = async (schoolId, certType = selectedCertType) => {
    try {
      setLoading(true);
      const defaultTemplate = DEFAULT_CERT_TEMPLATES[certType] || DEFAULT_CERT_TEMPLATES.bonafide;
      const res = await superAdminApi.getCertificateConfig(certType, schoolId);
      if (res?.success && res.data) {
        setConfig((prev) => ({
          ...prev,
          ...defaultTemplate,
          ...res.data,
          elements: res.data.elements && res.data.elements.length > 0 ? res.data.elements : DEFAULT_ELEMENTS,
          headerSchoolNameCustom: res.data.headerSchoolNameCustom || '',
          headerSubtitleCustom: res.data.headerSubtitleCustom || '',
          headerAddressCustom: res.data.headerAddressCustom || '',
          headerSchoolNameColor: res.data.headerSchoolNameColor || res.data.primaryColor || defaultTemplate.primaryColor,
          certificateTitle: res.data.certificateTitle || defaultTemplate.certificateTitle,
          certificateSubtitle: res.data.certificateSubtitle || defaultTemplate.certificateSubtitle,
          refPrefix: res.data.refPrefix || defaultTemplate.refPrefix,
          titleBgColor: res.data.titleBgColor || res.data.primaryColor || defaultTemplate.titleBgColor,
          titleTextColor: res.data.titleTextColor || '#ffffff',
          bodyTextColor: res.data.bodyTextColor || '#1e293b',
          bodyTemplateText: res.data.bodyTemplateText || defaultTemplate.bodyTemplateText,
          dobSentenceText: res.data.dobSentenceText || defaultTemplate.dobSentenceText,
          conductSentenceText: res.data.conductSentenceText || defaultTemplate.conductSentenceText,
          purposeSentenceText: res.data.purposeSentenceText || defaultTemplate.purposeSentenceText,
          defaultPurpose: res.data.defaultPurpose || defaultTemplate.defaultPurpose,
          watermarkText: res.data.watermarkText || defaultTemplate.watermarkText,
          footerText: res.data.footerText || defaultTemplate.footerText,
          primaryColor: res.data.primaryColor || defaultTemplate.primaryColor,
          secondaryColor: res.data.secondaryColor || defaultTemplate.secondaryColor,
          borderColor: res.data.borderColor || defaultTemplate.borderColor,
          letterheadBgImage: res.data.letterheadBgImage || '',
          letterheadTopMargin: res.data.letterheadTopMargin || 140,
        }));
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to load ${certType} certificate configuration`,
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentMeta = CERT_TYPES.find((c) => c.id === selectedCertType) || CERT_TYPES[0];
      const payload = { ...config, certificateType: selectedCertType };
      const res = await superAdminApi.saveCertificateConfig(selectedCertType, payload, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Saved Successfully',
          detail: selectedSchoolId
            ? `Custom ${currentMeta.label} saved for school #${selectedSchoolId}`
            : `Platform default ${currentMeta.label} template updated`,
          life: 3000,
        });
        loadTemplate(selectedSchoolId, selectedCertType);
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

    const currentMeta = CERT_TYPES.find((c) => c.id === selectedCertType) || CERT_TYPES[0];
    if (!window.confirm(`Are you sure you want to remove school custom overrides for ${currentMeta.label} and inherit platform default?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await superAdminApi.resetCertificateConfig(selectedCertType, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Reset Successful',
          detail: `School ${currentMeta.label} reset to platform default`,
          life: 3000,
        });
        loadTemplate(selectedSchoolId, selectedCertType);
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

  const handlePrintTest = () => {
    if (previewRef.current) {
      const currentMeta = CERT_TYPES.find((c) => c.id === selectedCertType) || CERT_TYPES[0];
      printElement(previewRef.current, `${currentMeta.id.toUpperCase()}_Certificate_Sample`);
    }
  };

  const applyPalette = (pal) => {
    setConfig((prev) => ({
      ...prev,
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      borderColor: pal.border,
      headerSchoolNameColor: pal.primary,
      titleBgColor: pal.primary,
      headerDividerColor: pal.border,
    }));
  };

  // Upload Letterhead Image
  const handleLetterheadUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toastRef.current?.show({
          severity: 'warn',
          summary: 'File Too Large',
          detail: 'Please upload an image smaller than 5MB.',
          life: 4000,
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setConfig((prev) => ({
          ...prev,
          letterheadBgImage: evt.target.result,
          useLetterhead: true,
          hideHeaderOnLetterhead: true,
          hideBorderOnLetterhead: true,
        }));
        toastRef.current?.show({
          severity: 'success',
          summary: 'Letterhead Uploaded',
          detail: 'Letterhead background image applied successfully.',
          life: 3000,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLetterhead = () => {
    setConfig((prev) => ({
      ...prev,
      letterheadBgImage: '',
      useLetterhead: false,
      hideHeaderOnLetterhead: false,
      hideBorderOnLetterhead: false,
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag-and-Drop Handlers
  const handleMouseDown = (e, elId) => {
    if (config.layoutMode !== 'drag') return;
    e.stopPropagation();
    setSelectedElementId(elId);
    setIsDragging(true);

    const container = document.getElementById('bonafide-canvas-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const el = config.elements.find((item) => item.id === elId);
    if (!el) return;

    setDragOffset({
      x: e.clientX - containerRect.left - el.x,
      y: e.clientY - containerRect.top - el.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedElementId || config.layoutMode !== 'drag') return;
    const container = document.getElementById('bonafide-canvas-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    let newX = Math.round(e.clientX - containerRect.left - dragOffset.x);
    let newY = Math.round(e.clientY - containerRect.top - dragOffset.y);

    // Keep within bounds
    newX = Math.max(0, Math.min(newX, config.pageMaxWidth - 100));
    newY = Math.max(0, Math.min(newY, 1100));

    setConfig((prev) => ({
      ...prev,
      elements: prev.elements.map((item) =>
        item.id === selectedElementId ? { ...item, x: newX, y: newY } : item
      ),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetElementPositions = () => {
    setConfig((prev) => ({ ...prev, elements: DEFAULT_ELEMENTS }));
    toastRef.current?.show({
      severity: 'info',
      summary: 'Positions Reset',
      detail: 'Canvas element positions have been restored to default.',
      life: 2500,
    });
  };

  const updateSelectedElementCoord = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId ? { ...el, [field]: Number(value) || 0 } : el
      ),
    }));
  };

  const selectedElement = config.elements?.find((el) => el.id === selectedElementId);
  const activeCertMeta = CERT_TYPES.find((c) => c.id === selectedCertType) || CERT_TYPES[0];

  // Replace placeholders for the live preview
  const formatStatement = (template) => {
    if (!template) return '';
    return template
      .replace(/{StudentName}/g, `<strong>${SAMPLE_STUDENT.studentName}</strong>`)
      .replace(/{FatherName}/g, `<strong>${SAMPLE_STUDENT.fatherName}</strong>`)
      .replace(/{MotherName}/g, `<strong>${SAMPLE_STUDENT.motherName}</strong>`)
      .replace(/{Class}/g, `<strong>${SAMPLE_STUDENT.className}</strong>`)
      .replace(/{Section}/g, `<strong>${SAMPLE_STUDENT.sectionName}</strong>`)
      .replace(/{RollNo}/g, `<strong>${SAMPLE_STUDENT.rollNo}</strong>`)
      .replace(/{AdmissionNo}/g, `<strong>${SAMPLE_STUDENT.admissionNo}</strong>`)
      .replace(/{AdmissionDate}/g, `<strong>${SAMPLE_STUDENT.admissionDate}</strong>`)
      .replace(/{AcademicYear}/g, `<strong>${SAMPLE_STUDENT.academicYear}</strong>`)
      .replace(/{DOB}/g, `<strong>${SAMPLE_STUDENT.dob}</strong>`)
      .replace(/{DOBWords}/g, `<strong>${SAMPLE_STUDENT.dobWords}</strong>`)
      .replace(/{CalculatedAge}/g, `<strong>${SAMPLE_STUDENT.calculatedAge}</strong>`)
      .replace(/{AgeYears}/g, `<strong>${SAMPLE_STUDENT.ageYears}</strong>`)
      .replace(/{AgeMonths}/g, `<strong>${SAMPLE_STUDENT.ageMonths}</strong>`)
      .replace(/{AgeDays}/g, `<strong>${SAMPLE_STUDENT.ageDays}</strong>`)
      .replace(/{AsOnDate}/g, `<strong>${SAMPLE_STUDENT.asOnDate}</strong>`)
      .replace(/{ConductRating}/g, `<strong>${SAMPLE_STUDENT.conductRating}</strong>`)
      .replace(/{Gender}/g, `<strong>${SAMPLE_STUDENT.gender}</strong>`)
      .replace(/{Purpose}/g, `<strong>${SAMPLE_STUDENT.purpose}</strong>`);
  };

  // Helper to render individual blocks
  const renderBlockContent = (id) => {
    switch (id) {
      case 'header':
        if (config.useLetterhead && config.hideHeaderOnLetterhead) {
          return (
            <div className="p-3 text-center border-1 surface-border border-round bg-blue-50 text-blue-800 text-xs font-semibold">
              <i className="pi pi-image mr-1"></i> Digital Header Hidden (Letterhead Background Active)
            </div>
          );
        }
        return (
          <div
            style={{
              textAlign: config.headerAlignment,
              paddingBottom: `${config.headerPaddingY}px`,
              borderBottom:
                config.headerDividerStyle === 'Double'
                  ? `3px double ${config.headerDividerColor}`
                  : config.headerDividerStyle === 'Solid'
                    ? `1.5px solid ${config.headerDividerColor}`
                    : config.headerDividerStyle === 'Dashed'
                      ? `1.5px dashed ${config.headerDividerColor}`
                      : 'none',
            }}
          >
            <div className="flex align-items-center justify-content-between">
              {config.showSchoolLogo && (
                <img
                  src={config.schoolLogoUrl || (selectedSchoolId ? schools.find((s) => s.id === selectedSchoolId)?.logoUrl : null) || '/dvslogo1.jpeg'}
                  alt="Logo"
                  style={{
                    width: `${config.logoSize}px`,
                    height: `${config.logoSize}px`,
                    objectFit: 'contain',
                    borderRadius: '6px',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}

              <div className="flex-1 text-center px-2">
                <h2
                  style={{
                    margin: 0,
                    fontSize: `${config.headerSchoolNameFontSize}px`,
                    fontWeight: config.headerSchoolNameFontWeight,
                    color: config.headerSchoolNameColor,
                    textTransform: config.headerSchoolNameTransform,
                    letterSpacing: config.headerSchoolNameLetterSpacing,
                    lineHeight: 1.2,
                  }}
                >
                  {config.headerSchoolNameCustom ||
                    (selectedSchoolId
                      ? schools.find((s) => s.id === selectedSchoolId)?.name
                      : 'DELHI PUBLIC SCHOOL JAIPUR')}
                </h2>

                <div
                  style={{
                    fontSize: `${config.headerSubtitleFontSize}px`,
                    fontWeight: config.headerSubtitleFontWeight,
                    color: config.headerSubtitleColor,
                    marginTop: '4px',
                  }}
                >
                  {config.headerSubtitleCustom ||
                    'Recognized by Dept. of Education • Affiliated to CBSE New Delhi (Affil No: 1730245)'}
                </div>

                <div
                  style={{
                    fontSize: `${config.headerAddressFontSize}px`,
                    color: config.headerAddressColor,
                    marginTop: '3px',
                  }}
                >
                  {config.headerAddressCustom ||
                    'Sector 4, Green Avenue, Vidyadhar Nagar, Jaipur - 302023 • Tel: 0141-2234567'}
                </div>
              </div>

              {config.showQrCode && (
                <div className="text-center p-1 border-1 surface-border border-round" style={{ width: '60px' }}>
                  <i className="pi pi-qrcode text-3xl text-slate-700"></i>
                  <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 600 }}>VERIFIED</div>
                </div>
              )}
            </div>
          </div>
        );

      case 'ref_date':
        return (
          <div
            className="flex justify-content-between align-items-center pb-2 border-bottom-1 surface-border"
            style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}
          >
            {config.showRefNo ? (
              <div>
                <span>Ref No: </span>
                <strong style={{ color: config.primaryColor }}>
                  {config.refPrefix ? `${config.refPrefix}/2026/0412` : SAMPLE_STUDENT.refNo}
                </strong>
              </div>
            ) : (
              <div></div>
            )}

            {config.showIssueDate && (
              <div>
                <span>Date of Issue: </span>
                <strong style={{ color: '#0f172a' }}>{SAMPLE_STUDENT.issueDate}</strong>
              </div>
            )}
          </div>
        );

      case 'title_badge':
        return (
          <div className="text-center my-2">
            <span
              style={{
                display: 'inline-block',
                backgroundColor: config.titleBgColor,
                color: config.titleTextColor,
                padding: '6px 24px',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: `${config.titleFontSize}px`,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              {config.certificateTitle || 'BONAFIDE CERTIFICATE'}
            </span>
            {config.certificateSubtitle && (
              <div
                style={{
                  marginTop: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  color: '#475569',
                  textDecoration: 'underline',
                }}
              >
                {config.certificateSubtitle}
              </div>
            )}
          </div>
        );

      case 'body_statement':
        return (
          <div
            style={{
              lineHeight: '1.9',
              textAlign: 'justify',
              fontSize: `${config.baseFontSize}px`,
              color: config.bodyTextColor || '#1e293b',
            }}
            dangerouslySetInnerHTML={{ __html: formatStatement(config.bodyTemplateText) }}
          />
        );

      case 'photo':
        if (!config.showStudentPhoto) return null;
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `1.5px solid ${config.borderColor}`,
              padding: '2px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '4px',
            }}
          >
            <img
              src={SAMPLE_STUDENT.photoUrl}
              alt="Student"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }}
            />
          </div>
        );

      case 'details_table':
        if (!config.showDetailsTable) return null;

        // 1. DATE OF BIRTH CERTIFICATE TABLE
        if (selectedCertType === 'birth') {
          return (
            <div
              className="p-2 border-1 surface-border border-round"
              style={{ backgroundColor: config.secondaryColor }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: config.primaryColor,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Statutory Birth Record (Admission Register Extract)
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission / Scholar No:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Date of Admission:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Date of Birth (Figures):</td>
                    <td style={{ padding: '4px', fontWeight: 800, color: config.primaryColor }}>{SAMPLE_STUDENT.dob}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Class Admitted:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} (Sec: {SAMPLE_STUDENT.sectionName})</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Date of Birth (in Words):</td>
                    <td colSpan="3" style={{ padding: '4px', fontWeight: 800, color: config.primaryColor }}>
                      {SAMPLE_STUDENT.dobWords}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Father's Full Name:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.fatherName}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Mother's Full Name:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.motherName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Record Source:</td>
                    <td colSpan="3" style={{ padding: '4px', fontWeight: 600, color: '#334155' }}>
                      General Admission Register (Vol. I / G.R. No: {SAMPLE_STUDENT.admissionNo}) • Duly Verified & Authentic
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }

        // 2. CERTIFICATE OF AGE TABLE
        if (selectedCertType === 'age') {
          return (
            <div
              className="p-2 border-1 surface-border border-round"
              style={{ backgroundColor: config.secondaryColor }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: config.primaryColor,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Age Computation & Verification Record
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Roll No:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.rollNo}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Class & Section:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} - {SAMPLE_STUDENT.sectionName}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Academic Session:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.academicYear}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Date of Birth (Figures):</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.dob}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Verified Age on {SAMPLE_STUDENT.asOnDate}:</td>
                    <td style={{ padding: '4px', fontWeight: 800, color: config.primaryColor }}>{SAMPLE_STUDENT.calculatedAge}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Date of Birth (Words):</td>
                    <td colSpan="3" style={{ padding: '4px', fontWeight: 800, color: config.primaryColor }}>
                      {SAMPLE_STUDENT.dobWords}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }

        // 3. CHARACTER & CONDUCT CERTIFICATE TABLE
        if (selectedCertType === 'character') {
          return (
            <div
              className="p-2 border-1 surface-border border-round"
              style={{ backgroundColor: config.secondaryColor }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: config.primaryColor,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Conduct, Character & Institutional Record
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Roll No:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.rollNo}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Class & Section:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} - {SAMPLE_STUDENT.sectionName}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Academic Session:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.academicYear}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Moral Character & Conduct:</td>
                    <td style={{ padding: '4px', fontWeight: 800, color: config.primaryColor }}>Exemplary / Very Good</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Institutional Discipline:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>Obedient & Punctual</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Co-Curricular / Sports:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>Active & Dedicated</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Outstanding Dues:</td>
                    <td style={{ padding: '4px', fontWeight: 700, color: '#16a34a' }}>Nil (Cleared)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }

        // 4. RET (RECORD OF EDUCATION & RETENTION) TABLE
        if (selectedCertType === 'ret') {
          return (
            <div
              className="p-2 border-1 surface-border border-round"
              style={{ backgroundColor: config.secondaryColor }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: config.primaryColor,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Education & Continuous Retention Record
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Date of Admission:</td>
                    <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Current Class & Section:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} - {SAMPLE_STUDENT.sectionName}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Academic Session:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.academicYear}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Retention Status:</td>
                    <td style={{ padding: '4px', fontWeight: 800, color: config.primaryColor }}>Retained on Roll (Regular Student)</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Attendance Record:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>Regular & Satisfactory</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Promotion / Continuation:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>Qualified & Continuing</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Disciplinary Record:</td>
                    <td style={{ padding: '4px', fontWeight: 700, color: '#16a34a' }}>Clean / Unblemished</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }

        // 5. STANDARD BONAFIDE CERTIFICATE TABLE
        return (
          <div
            className="p-2 border-1 surface-border border-round"
            style={{ backgroundColor: config.secondaryColor }}
          >
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                  <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Roll No:</td>
                  <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.rollNo}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Class & Section:</td>
                  <td style={{ padding: '4px', fontWeight: 700 }}>
                    {SAMPLE_STUDENT.className} - {SAMPLE_STUDENT.sectionName}
                  </td>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Academic Session:</td>
                  <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.academicYear}</td>
                </tr>
                {config.showBloodGroup && (
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Blood Group:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.bloodGroup}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Gender:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.gender}</td>
                  </tr>
                )}
                {config.showAadhaarNo && (
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Aadhaar No:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.aadhaarNo}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Purpose:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{SAMPLE_STUDENT.purpose}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case 'conduct_purpose':
        return (
          <div style={{ fontSize: `${config.baseFontSize}px`, lineHeight: '1.8', textAlign: 'justify', color: config.bodyTextColor || '#1e293b' }}>
            {config.dobSentenceText && (
              <div
                className="mb-2"
                dangerouslySetInnerHTML={{ __html: formatStatement(config.dobSentenceText) }}
              />
            )}
            {config.conductSentenceText && (
              <div
                className="mb-2"
                dangerouslySetInnerHTML={{ __html: formatStatement(config.conductSentenceText) }}
              />
            )}
            {config.purposeSentenceText && (
              <div dangerouslySetInnerHTML={{ __html: formatStatement(config.purposeSentenceText) }} />
            )}
          </div>
        );

      case 'signatures':
        if (!config.showSignatures) return null;
        return (
          <div className="flex justify-content-between align-items-end w-full">
            <div className="text-center" style={{ width: '150px' }}>
              <div style={{ height: '36px' }}></div>
              <div
                style={{
                  borderTop: `1px solid ${config.borderColor}`,
                  fontSize: '11px',
                  fontWeight: 700,
                  paddingTop: '4px',
                  color: '#334155',
                }}
              >
                {config.signature1}
              </div>
            </div>

            {config.showSchoolSealBox ? (
              <div
                className="text-center border-circle p-2 flex align-items-center justify-content-center"
                style={{
                  width: '74px',
                  height: '74px',
                  border: `1.5px dashed ${config.borderColor}`,
                  fontSize: '9px',
                  fontWeight: 700,
                  color: config.primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  lineHeight: 1.1,
                }}
              >
                Official
                <br />
                School Seal
              </div>
            ) : (
              <div className="text-center" style={{ width: '150px' }}>
                <div style={{ height: '36px' }}></div>
                <div
                  style={{
                    borderTop: `1px solid ${config.borderColor}`,
                    fontSize: '11px',
                    fontWeight: 700,
                    paddingTop: '4px',
                    color: '#334155',
                  }}
                >
                  {config.signature2}
                </div>
              </div>
            )}

            <div className="text-center" style={{ width: '170px' }}>
              <div style={{ height: '36px' }}></div>
              <div
                style={{
                  borderTop: `1px solid ${config.borderColor}`,
                  fontSize: '11px',
                  fontWeight: 700,
                  paddingTop: '4px',
                  color: '#334155',
                }}
              >
                {config.signature3}
              </div>
            </div>
          </div>
        );

      case 'footer':
        if (!config.footerText) return null;
        return (
          <div
            className="text-center pt-2 border-top-1 surface-border"
            style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}
          >
            {config.footerText}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="p-3 surface-ground min-h-screen"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Toast ref={toastRef} />

      {/* Header Bar */}
      <Card className="mb-4 shadow-1 border-none">
        {/* Certificate Type Switcher Ribbon */}
        <div className="flex gap-2 align-items-center mb-3 overflow-x-auto pb-2 border-bottom-1 surface-border">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex align-items-center gap-1">
            <i className="pi pi-verified text-blue-600"></i> Certificate:
          </span>
          {CERT_TYPES.map((ct) => {
            const isSelected = selectedCertType === ct.id;
            return (
              <button
                key={ct.id}
                type="button"
                onClick={() => setSelectedCertType(ct.id)}
                className={`px-3 py-2 border-1 border-round font-semibold text-xs flex align-items-center gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2'
                    : 'surface-card text-slate-700 border-slate-300 hover:surface-100 hover:border-blue-400'
                }`}
              >
                <i className={ct.icon}></i>
                <span>{ct.label}</span>
                <span
                  className={`px-1.5 py-0.5 border-round ${
                    isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                  }`}
                  style={{ fontSize: '10px' }}
                >
                  {ct.badge}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3">
          <div>
            <div className="flex align-items-center gap-2 mb-1">
              <i className="pi pi-verified text-2xl text-blue-600"></i>
              <h1 className="text-2xl font-bold text-slate-800 m-0">{activeCertMeta.label} Designer</h1>
              <Tag value={activeCertMeta.shortLabel} severity="info" className="text-xs px-2" />
              {config.useLetterhead && <Tag value="Letterhead Mode" severity="success" className="text-xs px-2" />}
              {config.layoutMode === 'drag' && (
                <Tag value="Draggable Canvas" severity="help" className="text-xs px-2" />
              )}
            </div>
            <p className="text-sm text-slate-500 m-0">
              Customize text areas with drag-and-drop positioning, upload custom school letterhead backgrounds, or use digital templates for {activeCertMeta.label}.
            </p>
          </div>

          <div className="flex align-items-center gap-2 flex-wrap">
            {/* School Scope Selector */}
            <Dropdown
              value={selectedSchoolId}
              options={[
                { label: '🌐 Platform Default (All Schools)', value: null },
                ...schools.map((s) => ({
                  label: `🏫 ${s.name} ${s.code ? `(${s.code})` : ''}`,
                  value: s.id,
                })),
              ]}
              onChange={(e) => setSelectedSchoolId(e.value)}
              placeholder="Select School Scope"
              className="p-inputtext-sm w-18rem"
            />

            {selectedSchoolId && config.isSchoolOverride && (
              <Button
                label="Reset to Default"
                icon="pi pi-refresh"
                severity="danger"
                outlined
                size="small"
                onClick={handleResetToDefault}
                disabled={saving || loading}
              />
            )}

            <Button
              label="Print Sample"
              icon="pi pi-print"
              severity="secondary"
              outlined
              size="small"
              onClick={handlePrintTest}
            />

            <Button
              label={saving ? 'Saving...' : 'Save Template'}
              icon="pi pi-check"
              severity="success"
              size="small"
              onClick={handleSave}
              disabled={saving || loading}
            />
          </div>
        </div>
      </Card>

      {/* Main Grid: Controls Left (5 cols) | Live Canvas Right (7 cols) */}
      <div className="grid">
        {/* Left Column: Configuration Controls */}
        <div className="col-12 lg:col-5">
          <Card className="shadow-2 border-none">
            {/* Navigation Tabs */}
            <div className="flex gap-2 border-bottom-1 surface-border pb-2 mb-3 overflow-x-auto">
              {[
                { id: 'colors', label: '🎨 Colour Options', icon: 'pi pi-palette' },
                { id: 'letterhead', label: 'Letterhead & BG', icon: 'pi pi-image' },
                { id: 'dragdrop', label: 'Drag & Position', icon: 'pi pi-arrows-alt' },
                { id: 'statement', label: 'Text & Content', icon: 'pi pi-file-edit' },
                { id: 'header', label: 'Header & Crest', icon: 'pi pi-id-card' },
                { id: 'elements', label: 'Fields & Toggles', icon: 'pi pi-check-square' },
                { id: 'layout', label: 'Paper & Borders', icon: 'pi pi-file' },
                { id: 'signatures', label: 'Signatures', icon: 'pi pi-pencil' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-2 px-3 border-none border-round font-medium text-xs flex align-items-center gap-1 cursor-pointer transition-colors ${activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-1'
                      : 'surface-100 text-slate-600 hover:surface-200'
                    }`}
                >
                  <i className={tab.icon}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB 0: Dedicated Colour Options */}
            {activeTab === 'colors' && (
              <div className="flex flex-column gap-3">
                <div className="p-3 border-round bg-blue-50 text-blue-900 text-xs line-height-3">
                  <strong>Certificate Colour Customizer:</strong> Select from preset school themes below or customize
                  every individual colour (Theme Accent, Statement Text, Title Badge, Borders, and Table Tints).
                  All colour changes update the live certificate canvas in real-time.
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2 flex align-items-center gap-1">
                    <i className="pi pi-palette text-blue-600"></i> Preset Colour Themes
                  </label>
                  <div className="grid">
                    {PRESET_PALETTES.map((pal, idx) => (
                      <div key={idx} className="col-6">
                        <button
                          type="button"
                          onClick={() => applyPalette(pal)}
                          className={`w-full p-2 border-1 border-round text-left flex align-items-center gap-2 cursor-pointer transition-all ${config.primaryColor === pal.primary
                              ? 'border-blue-600 bg-blue-50 shadow-1'
                              : 'surface-border hover:surface-100'
                            }`}
                        >
                          <span
                            className="w-1.5rem h-1.5rem border-circle flex-shrink-0 shadow-1"
                            style={{ backgroundColor: pal.primary }}
                          />
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block text-overflow-ellipsis">
                              {pal.name}
                            </span>
                            <span className="text-xs font-mono text-slate-500">{pal.primary}</span>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-top-1 surface-border pt-3">
                  <label className="text-xs font-bold text-slate-700 block mb-2 flex align-items-center gap-1">
                    <i className="pi pi-sliders-h text-blue-600"></i> Individual Colour Controls
                  </label>
                  <div className="flex flex-column gap-3">
                    {/* Primary Color & Body Text Color */}
                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Theme Accent Colour</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.primaryColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.primaryColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Body Text Colour</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.bodyTextColor || '#1e293b'}
                            onChange={(e) => setConfig({ ...config, bodyTextColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.bodyTextColor || '#1e293b'}
                            onChange={(e) => setConfig({ ...config, bodyTextColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Title Badge Bg & Title Text Color */}
                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Title Badge Background</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.titleBgColor || config.primaryColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, titleBgColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.titleBgColor || config.primaryColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, titleBgColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Title Badge Text Colour</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.titleTextColor || '#ffffff'}
                            onChange={(e) => setConfig({ ...config, titleTextColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.titleTextColor || '#ffffff'}
                            onChange={(e) => setConfig({ ...config, titleTextColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* School Name in Header & Outer Border Color */}
                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">School Name (Header)</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.headerSchoolNameColor || config.primaryColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, headerSchoolNameColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.headerSchoolNameColor || config.primaryColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, headerSchoolNameColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Certificate Border Colour</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.borderColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.borderColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Secondary Box / Details Table Background Tint */}
                    <div className="grid">
                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Details Table Tint (Bg)</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.secondaryColor || '#eff6ff'}
                            onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.secondaryColor || '#eff6ff'}
                            onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="col-6">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Header Divider Line</label>
                        <div className="flex align-items-center gap-2">
                          <input
                            type="color"
                            value={config.headerDividerColor || config.borderColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, headerDividerColor: e.target.value })}
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <InputText
                            value={config.headerDividerColor || config.borderColor || '#1e3a8a'}
                            onChange={(e) => setConfig({ ...config, headerDividerColor: e.target.value })}
                            className="p-inputtext-sm w-full font-mono text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: Letterhead Background Upload */}
            {activeTab === 'letterhead' && (
              <div className="flex flex-column gap-3">
                <div className="p-3 border-round bg-blue-50 text-blue-900 text-xs line-height-3">
                  <strong>School Letterhead Stationery:</strong> If your school uses pre-printed official letterhead
                  or a digital letterhead graphic, upload it here. You can hide the digital header and adjust top/bottom
                  margins so certificates print seamlessly on your official stationery.
                </div>

                <div className="flex justify-content-between align-items-center p-2 surface-50 border-round">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Enable Letterhead Background</span>
                    <small className="text-slate-500">Render uploaded stationery as certificate background</small>
                  </div>
                  <InputSwitch
                    checked={config.useLetterhead}
                    onChange={(e) => setConfig({ ...config, useLetterhead: e.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Upload Letterhead Graphic (JPG / PNG)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLetterheadUpload}
                    className="p-inputtext p-component p-2 text-xs w-full"
                  />
                  {config.letterheadBgImage && (
                    <div className="mt-2 flex gap-2 align-items-center">
                      <Button
                        label="Remove Letterhead"
                        icon="pi pi-trash"
                        severity="danger"
                        size="small"
                        outlined
                        onClick={clearLetterhead}
                      />
                      <span className="text-xs text-green-600 font-semibold">
                        <i className="pi pi-check-circle mr-1"></i> Background graphic loaded
                      </span>
                    </div>
                  )}
                </div>

                {config.useLetterhead && (
                  <>
                    <div className="flex justify-content-between align-items-center p-2 surface-50 border-round">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block">Hide Digital School Header</span>
                        <small className="text-slate-500">Prevents duplicating school name if printed on letterhead</small>
                      </div>
                      <InputSwitch
                        checked={config.hideHeaderOnLetterhead}
                        onChange={(e) => setConfig({ ...config, hideHeaderOnLetterhead: e.value })}
                      />
                    </div>

                    <div className="flex justify-content-between align-items-center p-2 surface-50 border-round">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block">Hide Outer Border</span>
                        <small className="text-slate-500">Enable if letterhead already contains its own border</small>
                      </div>
                      <InputSwitch
                        checked={config.hideBorderOnLetterhead}
                        onChange={(e) => setConfig({ ...config, hideBorderOnLetterhead: e.value })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-content-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Top Margin (Spacing for Letterhead Header):</span>
                        <span className="text-blue-600 font-bold">{config.letterheadTopMargin} px</span>
                      </div>
                      <Slider
                        value={config.letterheadTopMargin}
                        onChange={(e) => setConfig({ ...config, letterheadTopMargin: e.value })}
                        min={0}
                        max={300}
                        step={10}
                      />
                    </div>

                    <div>
                      <div className="flex justify-content-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Background Opacity:</span>
                        <span className="text-blue-600 font-bold">{config.letterheadOpacity}%</span>
                      </div>
                      <Slider
                        value={config.letterheadOpacity}
                        onChange={(e) => setConfig({ ...config, letterheadOpacity: e.value })}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: Drag and Drop & Element Coordinates */}
            {activeTab === 'dragdrop' && (
              <div className="flex flex-column gap-3">
                <div className="p-3 border-round bg-purple-50 text-purple-900 text-xs line-height-3">
                  <strong>Free Drag-and-Drop Mode:</strong> Switch to{' '}
                  <span className="font-bold text-purple-700">"Interactive Draggable Canvas"</span> to freely click and
                  drag text areas, signatures, photo boxes, or tables anywhere on the letterhead canvas with your mouse!
                </div>

                <div className="flex justify-content-between align-items-center p-2 surface-50 border-round">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Layout Mode</span>
                    <small className="text-slate-500">
                      {config.layoutMode === 'drag'
                        ? 'Free Draggable Canvas (Mouse move enabled)'
                        : 'Standard Document Flow (Automatic vertical flow)'}
                    </small>
                  </div>
                  <Dropdown
                    value={config.layoutMode}
                    options={[
                      { label: 'Flow Document', value: 'flow' },
                      { label: 'Draggable Canvas', value: 'drag' },
                    ]}
                    onChange={(e) => setConfig({ ...config, layoutMode: e.value })}
                    className="p-inputtext-sm w-11rem"
                  />
                </div>

                {config.layoutMode === 'drag' && (
                  <>
                    <div className="flex justify-content-between align-items-center">
                      <label className="text-xs font-bold text-slate-700">Select Element to Inspect / Nudge:</label>
                      <Button
                        label="Reset Coordinates"
                        icon="pi pi-refresh"
                        severity="secondary"
                        size="small"
                        text
                        onClick={resetElementPositions}
                      />
                    </div>

                    <Dropdown
                      value={selectedElementId}
                      options={config.elements.map((el) => ({ label: el.label, value: el.id }))}
                      onChange={(e) => setSelectedElementId(e.value)}
                      className="p-inputtext-sm w-full"
                    />

                    {selectedElement && (
                      <div className="p-3 surface-50 border-round border-1 surface-border">
                        <span className="text-xs font-bold text-slate-800 block mb-2">
                          {selectedElement.label} Coordinates:
                        </span>

                        <div className="grid">
                          <div className="col-6">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">X Position (px)</label>
                            <InputNumber
                              value={selectedElement.x}
                              onValueChange={(e) => updateSelectedElementCoord('x', e.value)}
                              min={0}
                              max={config.pageMaxWidth}
                              inputClassName="p-inputtext-sm w-full"
                            />
                          </div>

                          <div className="col-6">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Y Position (px)</label>
                            <InputNumber
                              value={selectedElement.y}
                              onValueChange={(e) => updateSelectedElementCoord('y', e.value)}
                              min={0}
                              max={1200}
                              inputClassName="p-inputtext-sm w-full"
                            />
                          </div>

                          <div className="col-6">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Width (px)</label>
                            <InputNumber
                              value={selectedElement.width}
                              onValueChange={(e) => updateSelectedElementCoord('width', e.value)}
                              min={50}
                              max={config.pageMaxWidth}
                              inputClassName="p-inputtext-sm w-full"
                            />
                          </div>

                          <div className="col-6">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Height (px)</label>
                            <InputNumber
                              value={selectedElement.height}
                              onValueChange={(e) => updateSelectedElementCoord('height', e.value)}
                              min={20}
                              max={600}
                              inputClassName="p-inputtext-sm w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-500 italic">
                      💡 Tip: You can directly click on any section on the right-side preview canvas and drag it with your mouse to move it in real-time.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: Statement & Content */}
            {activeTab === 'statement' && (
              <div className="flex flex-column gap-3">
                <div className="flex justify-content-between align-items-center p-2 surface-50 border-round border-1 surface-border">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      <i className="pi pi-verified text-blue-600 mr-1"></i> Standard {activeCertMeta.label} Template
                    </span>
                    <small className="text-slate-500">
                      Ref Prefix: <strong>{activeCertMeta.badge}</strong> • Statutory school wording
                    </small>
                  </div>
                  <Button
                    label={`Apply ${activeCertMeta.shortLabel} Defaults`}
                    icon="pi pi-refresh"
                    size="small"
                    severity="info"
                    outlined
                    onClick={() => {
                      const defTpl = DEFAULT_CERT_TEMPLATES[selectedCertType] || DEFAULT_CERT_TEMPLATES.bonafide;
                      setConfig((prev) => ({
                        ...prev,
                        certificateTitle: defTpl.certificateTitle,
                        certificateSubtitle: defTpl.certificateSubtitle,
                        refPrefix: defTpl.refPrefix,
                        bodyTemplateText: defTpl.bodyTemplateText,
                        dobSentenceText: defTpl.dobSentenceText,
                        conductSentenceText: defTpl.conductSentenceText,
                        purposeSentenceText: defTpl.purposeSentenceText,
                        defaultPurpose: defTpl.defaultPurpose,
                        watermarkText: defTpl.watermarkText,
                        footerText: defTpl.footerText,
                        primaryColor: defTpl.primaryColor,
                        secondaryColor: defTpl.secondaryColor,
                        borderColor: defTpl.borderColor,
                        titleBgColor: defTpl.titleBgColor,
                      }));
                      toastRef.current?.show({
                        severity: 'info',
                        summary: 'Statutory Defaults Applied',
                        detail: `Loaded standard format, tables, and wording for ${activeCertMeta.label}.`,
                        life: 3000,
                      });
                    }}
                  />
                </div>

                <div className="p-3 border-round bg-blue-50 text-blue-900 text-xs line-height-3">
                  <strong>Smart Tags:</strong>{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{StudentName}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{FatherName}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{MotherName}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{Class}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{Section}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{RollNo}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{AdmissionNo}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{AdmissionDate}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{AcademicYear}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{DOB}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{DOBWords}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{CalculatedAge}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{AgeYears}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{AgeMonths}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{AgeDays}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{AsOnDate}'}</code>,{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{ConductRating}'}</code>, and{' '}
                  <code className="bg-white px-1 border-round font-bold">{'{Purpose}'}</code>.
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Certificate Heading</label>
                  <InputText
                    value={config.certificateTitle}
                    onChange={(e) => setConfig({ ...config, certificateTitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                    placeholder="e.g. CERTIFICATE"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Certificate Subtitle</label>
                  <InputText
                    value={config.certificateSubtitle}
                    onChange={(e) => setConfig({ ...config, certificateSubtitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                    placeholder="e.g. TO WHOMSOEVER IT MAY CONCERN"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Main Certification Statement Paragraph
                  </label>
                  <InputTextarea
                    rows={4}
                    value={config.bodyTemplateText}
                    onChange={(e) => setConfig({ ...config, bodyTemplateText: e.target.value })}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Date of Birth Verification Sentence</label>
                  <InputTextarea
                    rows={2}
                    value={config.dobSentenceText}
                    onChange={(e) => setConfig({ ...config, dobSentenceText: e.target.value })}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Conduct & Character Sentence</label>
                  <InputTextarea
                    rows={2}
                    value={config.conductSentenceText}
                    onChange={(e) => setConfig({ ...config, conductSentenceText: e.target.value })}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Purpose / Reason Sentence</label>
                  <InputTextarea
                    rows={2}
                    value={config.purposeSentenceText}
                    onChange={(e) => setConfig({ ...config, purposeSentenceText: e.target.value })}
                    className="w-full text-xs"
                  />
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Default Purpose</label>
                    <InputText
                      value={config.defaultPurpose}
                      onChange={(e) => setConfig({ ...config, defaultPurpose: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Ref No Prefix</label>
                    <InputText
                      value={config.refPrefix}
                      onChange={(e) => setConfig({ ...config, refPrefix: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Header & Crest */}
            {activeTab === 'header' && (
              <div className="flex flex-column gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Custom School Title (Override)</label>
                  <InputText
                    value={config.headerSchoolNameCustom}
                    onChange={(e) => setConfig({ ...config, headerSchoolNameCustom: e.target.value })}
                    className="w-full p-inputtext-sm"
                    placeholder="Leave blank to use tenant school name"
                  />
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Font Size (px)</label>
                    <InputText
                      type="number"
                      value={config.headerSchoolNameFontSize}
                      onChange={(e) => setConfig({ ...config, headerSchoolNameFontSize: Number(e.target.value) || 24 })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Alignment</label>
                    <Dropdown
                      value={config.headerAlignment}
                      options={[
                        { label: 'Center', value: 'center' },
                        { label: 'Left', value: 'left' },
                      ]}
                      onChange={(e) => setConfig({ ...config, headerAlignment: e.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">School Subtitle / Tagline</label>
                  <InputText
                    value={config.headerSubtitleCustom}
                    onChange={(e) => setConfig({ ...config, headerSubtitleCustom: e.target.value })}
                    className="w-full p-inputtext-sm"
                    placeholder="e.g. Affiliated to CBSE New Delhi (Affil No: 1730245)"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">School Address & Contact</label>
                  <InputTextarea
                    rows={2}
                    value={config.headerAddressCustom}
                    onChange={(e) => setConfig({ ...config, headerAddressCustom: e.target.value })}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: Fields & Toggles */}
            {activeTab === 'elements' && (
              <div className="flex flex-column gap-2">
                {[
                  { key: 'showSchoolLogo', label: 'School Crest / Logo in Header' },
                  { key: 'showStudentPhoto', label: 'Student Photograph Box' },
                  { key: 'showDetailsTable', label: 'Student Core Details Grid (Class, Adm No, Roll, DOB)' },
                  { key: 'showBloodGroup', label: 'Blood Group in Grid' },
                  { key: 'showAadhaarNo', label: 'Aadhaar Card No in Grid' },
                  { key: 'showIssueDate', label: 'Date of Issue' },
                  { key: 'showRefNo', label: 'Official Dispatch Reference Number' },
                  { key: 'showSchoolSealBox', label: 'Official School Round Seal Box' },
                  { key: 'showQrCode', label: 'Digital Verification QR Code' },
                  { key: 'showWatermark', label: 'Anti-Fraud Watermark Background' },
                ].map((item) => (
                  <div key={item.key} className="flex justify-content-between align-items-center p-2 surface-50 border-round">
                    <span className="text-xs text-slate-700">{item.label}</span>
                    <InputSwitch
                      checked={config[item.key]}
                      onChange={(e) => setConfig({ ...config, [item.key]: e.value })}
                    />
                  </div>
                ))}

                {config.showWatermark && (
                  <div className="mt-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Watermark Text</label>
                    <InputText
                      value={config.watermarkText}
                      onChange={(e) => setConfig({ ...config, watermarkText: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: Paper & Borders */}
            {activeTab === 'layout' && (
              <div className="flex flex-column gap-3">
                  <div className="p-3 border-round bg-blue-50 text-blue-900 text-xs line-height-3">
                    <strong>Paper & Typography Settings:</strong> Configure font family, base font scale, outer border style,
                    and paper padding margins for printing.
                  </div>

                  <div className="grid">
                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Font Family</label>
                      <Dropdown
                        value={config.fontFamily}
                        options={FONT_OPTIONS}
                        onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                        className="w-full p-inputtext-sm"
                      />
                    </div>
                    <div className="col-6">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Certificate Border Style</label>
                      <Dropdown
                        value={config.borderStyle}
                        options={BORDER_STYLES}
                        onChange={(e) => setConfig({ ...config, borderStyle: e.value })}
                        className="w-full p-inputtext-sm"
                      />
                    </div>
                  </div>

                      <div className="grid">
                        <div className="col-6">
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Base Font Size ({config.baseFontSize}px)</label>
                          <Slider
                            value={config.baseFontSize}
                            onChange={(e) => setConfig({ ...config, baseFontSize: e.value })}
                            min={10}
                            max={18}
                            className="w-full"
                          />
                        </div>
                        <div className="col-6">
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Canvas Padding ({config.pagePadding}px)</label>
                          <Slider
                            value={config.pagePadding}
                            onChange={(e) => setConfig({ ...config, pagePadding: e.value })}
                            min={12}
                            max={48}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
            )}

                    {/* TAB 7: Signatures */}
                    {activeTab === 'signatures' && (
                      <div className="flex flex-column gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Left Signature Label</label>
                          <InputText
                            value={config.signature1}
                            onChange={(e) => setConfig({ ...config, signature1: e.target.value })}
                            className="w-full p-inputtext-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Center Signature Label</label>
                          <InputText
                            value={config.signature2}
                            onChange={(e) => setConfig({ ...config, signature2: e.target.value })}
                            className="w-full p-inputtext-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Right Authority Signature</label>
                          <InputText
                            value={config.signature3}
                            onChange={(e) => setConfig({ ...config, signature3: e.target.value })}
                            className="w-full p-inputtext-sm"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Right Column: Interactive Live Preview / Draggable Canvas (7 cols) */}
                <div className="col-12 lg:col-7">
                  <Card className="shadow-2 border-none surface-100 p-2 overflow-auto" style={{ maxHeight: '90vh' }}>
                      <div className="flex flex-wrap justify-content-between align-items-center mb-2 px-2 gap-2">
                        <div className="flex align-items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Live Certificate Canvas
                          </span>
                          {config.layoutMode === 'drag' && (
                            <Tag severity="help" value="Drag text area & elements freely" icon="pi pi-arrows-alt" />
                          )}
                          {config.useLetterhead && <Tag severity="success" value="Letterhead Active" icon="pi pi-image" />}
                        </div>

                        {/* Quick Colour Themes Bar directly above the canvas */}
                        <div className="flex align-items-center gap-1 bg-white p-1 px-2 border-round shadow-1">
                          <span className="text-xs font-bold text-slate-700 mr-1 flex align-items-center gap-1">
                            <i className="pi pi-palette text-blue-600"></i> Colour:
                          </span>
                          {PRESET_PALETTES.map((pal, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyPalette(pal)}
                              title={`Apply ${pal.name} Colour`}
                              className="w-1.5rem h-1.5rem border-circle border-2 cursor-pointer transition-transform hover:scale-125 p-0"
                              style={{
                                backgroundColor: pal.primary,
                                borderColor: config.primaryColor === pal.primary ? '#000000' : 'transparent',
                              }}
                            />
                          ))}
                          <span className="text-slate-300 mx-1">|</span>
                          <input
                            type="color"
                            value={config.primaryColor || '#1e3a8a'}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                primaryColor: e.target.value,
                                titleBgColor: e.target.value,
                              }))
                            }
                            title="Pick Custom Accent Colour"
                            className="w-1.5rem h-1.5rem border-none p-0 cursor-pointer border-round shadow-1"
                          />
                        </div>
                      </div>

                      {/* Canvas Outer Wrapper */}
                      <div
                        id="bonafide-canvas-container"
                        ref={previewRef}
                        className="bg-white mx-auto shadow-3 relative select-none"
                        style={{
                          width: `${config.pageMaxWidth}px`,
                          minHeight: '850px',
                          height: config.layoutMode === 'drag' ? '1000px' : 'auto',
                          padding: config.layoutMode === 'drag' ? '0px' : `${config.pagePadding}px`,
                          paddingTop:
                            config.layoutMode === 'flow' && config.useLetterhead
                              ? `${config.letterheadTopMargin}px`
                              : config.layoutMode === 'flow'
                                ? `${config.pagePadding}px`
                                : '0px',
                          fontFamily: config.fontFamily,
                          fontSize: `${config.baseFontSize}px`,
                          border:
                            config.useLetterhead && config.hideBorderOnLetterhead
                              ? 'none'
                              : config.borderStyle === 'Double'
                                ? `4px double ${config.borderColor}`
                                : config.borderStyle === 'Solid'
                                  ? `2px solid ${config.borderColor}`
                                  : config.borderStyle === 'Antique'
                                    ? `6px ridge ${config.borderColor}`
                                    : 'none',
                          color: '#1e293b',
                          backgroundImage:
                            config.useLetterhead && config.letterheadBgImage ? `url(${config.letterheadBgImage})` : 'none',
                          backgroundSize: config.letterheadFit || 'contain',
                          backgroundPosition: 'top center',
                          backgroundRepeat: 'no-repeat',
                          position: 'relative',
                        }}
                      >
                        {/* Optional Watermark */}
                        {config.showWatermark && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%) rotate(-30deg)',
                              fontSize: '68px',
                              fontWeight: 900,
                              color: 'rgba(0,0,0,0.04)',
                              pointerEvents: 'none',
                              letterSpacing: '8px',
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                              zIndex: 0,
                            }}
                          >
                            {config.watermarkText || activeCertMeta.shortLabel.toUpperCase()}
                          </div>
                        )}

                        {/* MODE 1: Interactive Draggable Canvas Mode */}
                        {config.layoutMode === 'drag' ? (
                          config.elements.map((el) => {
                            if (!el.visible) return null;
                            const isSelected = selectedElementId === el.id;
                            return (
                              <div
                                key={el.id}
                                onMouseDown={(e) => handleMouseDown(e, el.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedElementId(el.id);
                                }}
                                style={{
                                  position: 'absolute',
                                  left: `${el.x}px`,
                                  top: `${el.y}px`,
                                  width: `${el.width}px`,
                                  minHeight: `${el.height}px`,
                                  cursor: 'move',
                                  outline: isSelected ? '2px dashed #3b82f6' : '1px dashed transparent',
                                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  zIndex: isSelected ? 10 : 2,
                                  transition: isDragging ? 'none' : 'outline 0.15s ease',
                                }}
                                title="Click and drag to position"
                              >
                                {/* Selection Badge Header */}
                                {isSelected && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '-20px',
                                      left: '0px',
                                      backgroundColor: '#3b82f6',
                                      color: '#ffffff',
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {el.label} (X: {el.x}, Y: {el.y})
                                  </div>
                                )}
                                {renderBlockContent(el.id)}
                              </div>
                            );
                          })
                        ) : (
                          /* MODE 2: Document Flow Mode */
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            {(!config.useLetterhead || !config.hideHeaderOnLetterhead) && renderBlockContent('header')}
                            <div className="my-3">{renderBlockContent('ref_date')}</div>
                            <div className="my-3">{renderBlockContent('title_badge')}</div>

                            <div className="flex gap-4 my-3">
                              <div className="flex-1">{renderBlockContent('body_statement')}</div>
                              {config.showStudentPhoto && (
                                <div style={{ width: `${config.photoWidth}px`, height: `${config.photoHeight}px`, flexShrink: 0 }}>
                                  {renderBlockContent('photo')}
                                </div>
                              )}
                            </div>

                            <div className="my-3">{renderBlockContent('details_table')}</div>
                            <div className="my-3">{renderBlockContent('conduct_purpose')}</div>
                            <div className="mt-5 pt-4">{renderBlockContent('signatures')}</div>
                            <div className="mt-4">{renderBlockContent('footer')}</div>
                          </div>
                        )}
                      </div>
                  </Card>
                </div>
              </div>
    </div>
        );
};

        export default BonafideCertificateDesignerPage;
