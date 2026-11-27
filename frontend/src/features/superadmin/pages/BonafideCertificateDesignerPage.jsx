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
import { printElement, sanitizeFileName } from '../../../utils/printUtils';
import { DEFAULT_CERT_TEMPLATES } from '../../students/components/BonafideCertificateModal';

const PRESET_PALETTES = [
  { name: 'Forest Emerald', primary: '#065f46', secondary: '#ecfdf5', accent: '#064e3b', border: '#065f46' },
  { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#eff6ff', accent: '#172554', border: '#1e3a8a' },
  { name: 'Teal Elegance', primary: '#0f766e', secondary: '#f0fdfa', accent: '#115e59', border: '#0f766e' },
  { name: 'Crimson Heritage', primary: '#991b1b', secondary: '#fef2f2', accent: '#7f1d1d', border: '#991b1b' },
  { name: 'Imperial Violet', primary: '#581c87', secondary: '#faf5ff', accent: '#3b0764', border: '#581c87' },
  { name: 'Slate Executive', primary: '#1e293b', secondary: '#f8fafc', accent: '#0f172a', border: '#334155' },
  { name: 'Amber Gold', primary: '#b45309', secondary: '#fffbeb', accent: '#78350f', border: '#b45309' },
];

const CERT_TYPES = [
  { id: 'bonafide', label: 'Bonafide Certificate', shortLabel: 'Bonafide', icon: 'pi pi-file', badge: 'DPS/BC' },
  { id: 'birth', label: 'Date of Birth Certificate', shortLabel: 'Birth / DOB', icon: 'pi pi-id-card', badge: 'DPS/DOB' },
  { id: 'age', label: 'Certificate of Age', shortLabel: 'Age Verification', icon: 'pi pi-calendar', badge: 'DPS/AGE' },
  { id: 'character', label: 'Character Certificate', shortLabel: 'Conduct & Character', icon: 'pi pi-star', badge: 'DPS/CC' },
  { id: 'ret', label: 'RET Certificate', shortLabel: 'Record of Education', icon: 'pi pi-book', badge: 'DPS/RET' },
];

const FONT_OPTIONS = [
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Poppins (Geometric & Friendly)', value: 'Poppins, sans-serif' },
  { label: 'Roboto (Balanced Neo-Grotesque)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Premium Bold)', value: 'Montserrat, sans-serif' },
  { label: 'Georgia (Classic Academic Serif)', value: 'Georgia, serif' },
  { label: 'Times New Roman (Traditional Formal)', value: '"Times New Roman", Times, serif' },
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
  { label: 'Double Border (Traditional Certificate)', value: 'Double' },
  { label: 'Solid Border (Modern Clean)', value: 'Solid' },
  { label: 'Dashed Border', value: 'Dashed' },
  { label: 'Antique Ornate Border', value: 'Antique' },
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

const SAMPLE_STUDENT = {
  studentName: 'AARAV SHARMA',
  admissionNo: 'DPS-2026-0428',
  admissionDate: '14 Oct 2026',
  rollNo: '18',
  className: 'Class 9',
  sectionName: 'Section A',
  academicYear: '2026-2027',
  fatherName: 'Mr. Rajesh Sharma',
  fatherPhone: '+91 9911360909',
  motherName: 'Mrs. Sunita Sharma',
  motherPhone: '+91 9811223344',
  dob: '12-May-2012',
  dobWords: 'Twelfth May Two Thousand Twelve',
  gender: 'Male',
  bloodGroup: 'B+ Positive',
  aadhaarNo: '7829-4019-2049',
  category: 'General',
  address: 'Flat 402, Royal Palms, Sector 12, RK Puram, New Delhi - 110022',
  purpose: 'Passport Application',
  refNo: 'DPS/CERT/2026/0428',
  issueDate: '27 Nov 2026',
  asOnDate: '27 Nov 2026',
  calculatedAge: '14 Years, 6 Months, 15 Days',
  ageYears: '14',
  ageMonths: '6',
  ageDays: '15',
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
  const [activeTab, setActiveTab] = useState('header'); // 'header' | 'content' | 'letterhead' | 'elements' | 'layout' | 'signatures'

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

    // Styling & Theme
    primaryColor: '#065f46',
    secondaryColor: '#ecfdf5',
    accentColor: '#064e3b',
    borderColor: '#065f46',
    bodyTextColor: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    fontScale: 'Normal',
    baseFontSize: 13,
    fontScalePercent: 100,
    headerLayout: 'Classic',
    borderStyle: 'Double',

    // Sizing
    logoSize: 56,
    photoWidth: 80,
    photoHeight: 96,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargin: '8mm',
    pagePadding: 20,
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

    // Certificate Specific Text
    certificateTitle: 'BONAFIDE CERTIFICATE',
    certificateSubtitle: 'TO WHOMSOEVER IT MAY CONCERN',
    titleBgColor: '#065f46',
    titleTextColor: '#ffffff',
    titleFontSize: 14,
    refPrefix: 'DPS/BC',

    bodyTemplateText: '',
    dobSentenceText: '',
    conductSentenceText: '',
    purposeSentenceText: '',
    defaultPurpose: 'Passport Application',

    // Toggles
    showSchoolLogo: true,
    showStudentPhoto: true,
    showSchoolSealBox: true,
    showQrCode: true,
    showRefNo: true,
    showIssueDate: true,
    showDetailsTable: true,
    showConductSentence: true,
    showPurposeSentence: true,

    // Watermark
    watermarkText: 'BONAFIDE',
    showWatermark: false,

    // Signatures
    signature1: 'Class Teacher',
    signature2: 'Office Clerk',
    signature3: 'Principal / Head of Institution',

    footerText: 'This document is an electronically verified institutional certificate issued by DVS ERP • Digital Vidya Sarthi',
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
          headerSchoolNameCustom: res.data.headerSchoolNameCustom || '',
          headerSubtitleCustom: res.data.headerSubtitleCustom || '',
          headerAddressCustom: res.data.headerAddressCustom || '',
          headerSchoolNameColor: res.data.headerSchoolNameColor || res.data.primaryColor || defaultTemplate.primaryColor,
          headerSchoolNameFontSize: res.data.headerSchoolNameFontSize || 22,
          headerSchoolNameFontWeight: res.data.headerSchoolNameFontWeight || '900',
          headerSubtitleFontSize: res.data.headerSubtitleFontSize || 12,
          headerAddressFontSize: res.data.headerAddressFontSize || 11,
          headerAlignment: res.data.headerAlignment || 'center',
          headerDividerStyle: res.data.headerDividerStyle || 'Double',
          headerDividerColor: res.data.headerDividerColor || res.data.primaryColor || defaultTemplate.primaryColor,
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
      } else {
        setConfig((prev) => ({
          ...prev,
          ...defaultTemplate,
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

  const handleApplyPalette = (pal) => {
    setConfig((prev) => ({
      ...prev,
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      borderColor: pal.border,
      titleBgColor: pal.primary,
      headerSchoolNameColor: pal.primary,
      headerDividerColor: pal.primary,
    }));
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
    if (!selectedSchoolId) return;
    try {
      setSaving(true);
      const res = await superAdminApi.resetCertificateConfig(selectedCertType, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'info',
          summary: 'Reset Completed',
          detail: 'Custom school override removed. Inheriting platform template.',
          life: 3000,
        });
        loadTemplate(selectedSchoolId, selectedCertType);
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Reset Failed',
        detail: err?.response?.data?.message || err.message,
        life: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTest = () => {
    printElement('printable-certificate-container', {
      title: `${sanitizeFileName(config.certificateTitle || 'Certificate')}_Sample`,
      pageSize: config.pageSize || 'A4',
      orientation: config.pageOrientation || 'portrait',
      margin: config.pageMargin || '8mm',
      padding: '8mm',
    });
  };

  const handleLetterheadUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toastRef.current?.show({
          severity: 'warn',
          summary: 'File Too Large',
          detail: 'Letterhead image size should be under 2MB',
          life: 3000,
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Data = uploadEvent.target?.result;
        setConfig((prev) => ({
          ...prev,
          letterheadBgImage: base64Data,
          useLetterhead: true,
        }));
        toastRef.current?.show({
          severity: 'success',
          summary: 'Letterhead Loaded',
          detail: 'Background preview updated.',
          life: 2500,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // School Details Resolution (matching AdmissionSlipDesignerPage)
  const selectedSchool = selectedSchoolId ? schools.find((s) => s.id === selectedSchoolId) : null;
  const defaultSchoolName = selectedSchool?.name || 'DELHI PUBLIC SCHOOL';

  const affiliationNumber = selectedSchool?.affiliationNumber || 'CBSE/2026/0912';
  const defaultSubtitle = `Affiliated to CBSE, New Delhi (Affiliation No: ${affiliationNumber})`;

  const addressParts = selectedSchool
    ? [selectedSchool.address, selectedSchool.city, selectedSchool.state, selectedSchool.pincode].filter(Boolean)
    : [];
  const phones = [selectedSchool?.contactNumber, selectedSchool?.alternateContactNumber].filter(Boolean);
  const phoneText = phones.length > 0 ? `Phone: ${phones.join(', ')}` : 'Phone: 4564564564, 9811223344';
  const defaultAddress = addressParts.length > 0
    ? `${addressParts.join(', ')} • ${phoneText}`
    : `123 Knowledge Park, Sector 4, New Delhi, Delhi, 110001 • ${phoneText}`;

  const activeCertMeta = CERT_TYPES.find((c) => c.id === selectedCertType) || CERT_TYPES[0];

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
      .replace(/{Purpose}/g, `<strong>${config.defaultPurpose || SAMPLE_STUDENT.purpose}</strong>`);
  };

  const renderDetailsTable = () => {
    if (!config.showDetailsTable) return null;

    if (selectedCertType === 'birth') {
      return (
        <div className="p-2 border-1 border-round" style={{ borderColor: config.borderColor, backgroundColor: config.secondaryColor }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: config.primaryColor, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Statutory Birth Record (Admission Register Extract)
          </div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission / Scholar No:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Date of Admission:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionDate}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Date of Birth (Figures):</td>
                <td style={{ padding: '3px 4px', fontWeight: 800, color: config.primaryColor }}>{SAMPLE_STUDENT.dob}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Class Admitted:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} ({SAMPLE_STUDENT.sectionName})</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Date of Birth (In Words):</td>
                <td colSpan={3} style={{ padding: '3px 4px', fontWeight: 700, fontStyle: 'italic' }}>{SAMPLE_STUDENT.dobWords}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Father's Full Name:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.fatherName}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Mother's Full Name:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.motherName}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCertType === 'age') {
      return (
        <div className="p-2 border-1 border-round" style={{ borderColor: config.borderColor, backgroundColor: config.secondaryColor }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: config.primaryColor, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Verified Age Particulars (Statutory Records)
          </div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Date of Birth:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.dob}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Exact Verified Age:</td>
                <td style={{ padding: '3px 4px', fontWeight: 800, color: config.primaryColor }}>{SAMPLE_STUDENT.calculatedAge}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>As On Date:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.asOnDate}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Date of Birth (Words):</td>
                <td colSpan={3} style={{ padding: '3px 4px', fontWeight: 700, fontStyle: 'italic' }}>{SAMPLE_STUDENT.dobWords}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Current Class:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} ({SAMPLE_STUDENT.sectionName})</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Roll No:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.rollNo}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCertType === 'character') {
      return (
        <div className="p-2 border-1 border-round" style={{ borderColor: config.borderColor, backgroundColor: config.secondaryColor }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: config.primaryColor, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Conduct, Character & Institutional Record
          </div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Roll No:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.rollNo}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Class & Section:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} - {SAMPLE_STUDENT.sectionName}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Academic Session:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.academicYear}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Moral Character:</td>
                <td style={{ padding: '3px 4px', fontWeight: 800, color: config.primaryColor }}>Exemplary / Very Good</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Institutional Conduct:</td>
                <td style={{ padding: '3px 4px', fontWeight: 800, color: config.primaryColor }}>Disciplined & Obedient</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCertType === 'ret') {
      return (
        <div className="p-2 border-1 border-round" style={{ borderColor: config.borderColor, backgroundColor: config.secondaryColor }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: config.primaryColor, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Record of Continuous Enrollment & Retention
          </div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission Date:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionDate}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Class Retained:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} ({SAMPLE_STUDENT.sectionName})</td>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Roll No:</td>
                <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.rollNo}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Retention Status:</td>
                <td colSpan={3} style={{ padding: '3px 4px', fontWeight: 800, color: config.primaryColor }}>
                  Continuously Enrolled on Institutional Rolls (No Discontinuation)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    // Default: BONAFIDE CERTIFICATE TABLE
    return (
      <div className="p-2 border-1 border-round" style={{ borderColor: config.borderColor, backgroundColor: config.secondaryColor }}>
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission / Scholar No:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.admissionNo}</td>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569', width: '25%' }}>Roll No:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700, width: '25%' }}>{SAMPLE_STUDENT.rollNo}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Class & Section:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.className} ({SAMPLE_STUDENT.sectionName})</td>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Academic Session:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.academicYear}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Father's Full Name:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.fatherName}</td>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Mother's Full Name:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.motherName}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Date of Birth:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700 }}>{SAMPLE_STUDENT.dob}</td>
              <td style={{ padding: '3px 4px', fontWeight: 600, color: '#475569' }}>Verification Purpose:</td>
              <td style={{ padding: '3px 4px', fontWeight: 700, color: config.primaryColor }}>{config.defaultPurpose || SAMPLE_STUDENT.purpose}</td>
            </tr>
          </tbody>
        </table>
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
            <h1 className="text-2xl font-bold text-900 m-0">Dynamic Certificate Designer</h1>
            <Tag value="5 Types • School-Wise & Global" severity="success" rounded></Tag>
          </div>
          <p className="text-500 text-sm m-0 mt-1">
            Customize institutional certificates (Bonafide, DOB, Age Verification, Character & Conduct, RET), school branding, text templates, signatures, and stamps.
          </p>
        </div>

        <div className="flex align-items-center gap-2">
          <Button
            label="Test Print Preview"
            icon="pi pi-print"
            className="p-button-outlined p-button-secondary p-button-sm"
            onClick={handlePrintTest}
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

      {/* School Selection Bar & Certificate Switcher */}
      <Card className="mb-4 shadow-1 border-none">
        <div className="flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between gap-3 mb-3">
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

        {/* 5 Certificate Types Pill Ribbon */}
        <div className="flex gap-2 align-items-center overflow-x-auto pt-2 border-top-1 border-200">
          <span className="text-xs font-bold text-700 uppercase tracking-wider mr-2 flex align-items-center gap-1">
            <i className="pi pi-verified text-primary"></i> Certificate Type:
          </span>
          {CERT_TYPES.map((ct) => {
            const isSelected = selectedCertType === ct.id;
            return (
              <Button
                key={ct.id}
                label={`${ct.label} (${ct.badge})`}
                icon={ct.icon}
                className={`p-button-sm ${isSelected ? 'p-button-success' : 'p-button-outlined p-button-secondary'}`}
                onClick={() => setSelectedCertType(ct.id)}
              />
            );
          })}
        </div>
      </Card>

      {/* Main Split Grid: Controls (Left 6 cols) & Live Preview (Right 6 cols) */}
      <div className="grid">
        {/* Left Column: Configuration Controls */}
        <div className="col-12 xl:col-6">
          <Card className="shadow-2 border-none">
            {/* Nav Tabs */}
            <div className="flex flex-wrap gap-2 border-bottom-1 border-200 pb-3 mb-4">
              {[
                { id: 'header', label: 'Header & School', icon: 'pi pi-id-card' },
                { id: 'content', label: 'Statement & Content', icon: 'pi pi-file-edit' },
                { id: 'letterhead', label: 'Letterhead & BG', icon: 'pi pi-image' },
                { id: 'elements', label: 'Student Details & Photo', icon: 'pi pi-user' },
                { id: 'layout', label: 'Layout & Paper', icon: 'pi pi-sliders-h' },
                { id: 'signatures', label: 'Signatures & Seal', icon: 'pi pi-pencil' },
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

                <div className="surface-100 p-3 border-round border-1 border-300">
                  <div className="flex align-items-center justify-content-between mb-2">
                    <span className="font-bold text-sm text-900 flex align-items-center gap-2">
                      <i className="pi pi-building text-primary"></i> School Header Content & Details
                    </span>
                    <span className="text-xs text-600 bg-white px-2 py-1 border-round border-1 border-200">
                      Scope: {selectedSchool?.name || 'Platform Default School'}
                    </span>
                  </div>
                  <p className="text-xs text-600 m-0 mb-3">
                    Configure which school details appear in the certificate top header, how they are formatted, and customize any line manually.
                  </p>

                  {/* Header Visibility Toggles */}
                  <div className="grid mb-3">
                    <div className="col-12 md:col-6">
                      <div className="flex align-items-center justify-content-between p-2 bg-white border-round border-1 border-200">
                        <span className="text-xs font-semibold text-700">Show Subtitle / Affiliation</span>
                        <InputSwitch
                          checked={config.showHeaderSubtitle !== false}
                          onChange={(e) => setConfig({ ...config, showHeaderSubtitle: e.value })}
                        />
                      </div>
                    </div>
                    <div className="col-12 md:col-6">
                      <div className="flex align-items-center justify-content-between p-2 bg-white border-round border-1 border-200">
                        <span className="text-xs font-semibold text-700">Show Address & Phone</span>
                        <InputSwitch
                          checked={config.showHeaderAddress !== false}
                          onChange={(e) => setConfig({ ...config, showHeaderAddress: e.value })}
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
                        Reset to Default ({defaultSchoolName})
                      </button>
                    </div>
                    <InputText
                      value={config.headerSchoolNameCustom ?? ''}
                      onChange={(e) => setConfig({ ...config, headerSchoolNameCustom: e.target.value })}
                      placeholder={`Default: ${defaultSchoolName}`}
                      className="w-full p-inputtext-sm font-semibold"
                    />
                  </div>

                  {/* Field 2: Affiliation & Board Subtitle Line */}
                  <div className="field mb-3">
                    <div className="flex justify-content-between align-items-center mb-1">
                      <label className="text-xs font-bold text-800">2. Affiliation & Board Subtitle Line:</label>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, headerSubtitleCustom: defaultSubtitle })}
                        className="text-xs text-primary underline border-none bg-transparent cursor-pointer p-0"
                      >
                        Reset to Profile ({defaultSubtitle})
                      </button>
                    </div>
                    <InputText
                      value={config.headerSubtitleCustom ?? ''}
                      onChange={(e) => setConfig({ ...config, headerSubtitleCustom: e.target.value })}
                      placeholder={`Default: ${defaultSubtitle}`}
                      className="w-full p-inputtext-sm"
                    />
                    <div className="flex gap-1 flex-wrap mt-1">
                      <span className="text-xs text-500 mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerSubtitleCustom: `Affiliated to CBSE, New Delhi (Affiliation No: ${affiliationNumber})`,
                          })
                        }
                        className="text-xs surface-200 text-700 border-none px-2 py-1 border-round cursor-pointer hover:surface-300"
                      >
                        CBSE ({affiliationNumber})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerSubtitleCustom: 'Recognized by Dept. of Education • Affiliated to CBSE New Delhi',
                          })
                        }
                        className="text-xs surface-200 text-700 border-none px-2 py-1 border-round cursor-pointer hover:surface-300"
                      >
                        Recognized & CBSE
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerSubtitleCustom: 'Affiliated to Council for the Indian School Certificate Examinations (CISCE)',
                          })
                        }
                        className="text-xs surface-200 text-700 border-none px-2 py-1 border-round cursor-pointer hover:surface-300"
                      >
                        ICSE / CISCE
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerSubtitleCustom: '',
                          })
                        }
                        className="text-xs surface-200 text-red-600 border-none px-2 py-1 border-round cursor-pointer hover:surface-300"
                      >
                        Clear (Use Profile)
                      </button>
                    </div>
                  </div>

                  {/* Field 3: Address & Phone Line */}
                  <div className="field mb-2">
                    <div className="flex justify-content-between align-items-center mb-1">
                      <label className="text-xs font-bold text-800">3. Campus Address & Contact Phone Line:</label>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, headerAddressCustom: defaultAddress })}
                        className="text-xs text-primary underline border-none bg-transparent cursor-pointer p-0"
                      >
                        Reset to Profile ({defaultAddress})
                      </button>
                    </div>
                    <InputText
                      value={config.headerAddressCustom ?? ''}
                      onChange={(e) => setConfig({ ...config, headerAddressCustom: e.target.value })}
                      placeholder={`Default: ${defaultAddress}`}
                      className="w-full p-inputtext-sm"
                    />
                    <div className="flex gap-1 flex-wrap mt-1">
                      <span className="text-xs text-500 mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerAddressCustom: defaultAddress,
                          })
                        }
                        className="text-xs surface-200 text-700 border-none px-2 py-1 border-round cursor-pointer hover:surface-300"
                      >
                        Full Address + Phones
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            headerAddressCustom: '',
                          })
                        }
                        className="text-xs surface-200 text-red-600 border-none px-2 py-1 border-round cursor-pointer hover:surface-300"
                      >
                        Clear (Use Profile)
                      </button>
                    </div>
                  </div>
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

                <h3 className="text-base font-semibold text-800 m-0">Certificate Title & Heading</h3>
                <div className="grid">
                  <div className="col-7">
                    <label className="text-xs font-medium text-700">Main Title</label>
                    <InputText
                      value={config.certificateTitle || ''}
                      onChange={(e) => setConfig({ ...config, certificateTitle: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                  <div className="col-5">
                    <label className="text-xs font-medium text-700">Ref Prefix</label>
                    <InputText
                      value={config.refPrefix || ''}
                      onChange={(e) => setConfig({ ...config, refPrefix: e.target.value })}
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Subtitle Heading (e.g. TO WHOMSOEVER IT MAY CONCERN)</label>
                  <InputText
                    value={config.certificateSubtitle || ''}
                    onChange={(e) => setConfig({ ...config, certificateSubtitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Title Background Color</label>
                    <div className="flex gap-2 align-items-center">
                      <input
                        type="color"
                        value={config.titleBgColor || config.primaryColor}
                        onChange={(e) => setConfig({ ...config, titleBgColor: e.target.value })}
                        style={{ width: '38px', height: '34px', padding: 0, cursor: 'pointer', border: 'none' }}
                      />
                      <InputText
                        value={config.titleBgColor || config.primaryColor}
                        onChange={(e) => setConfig({ ...config, titleBgColor: e.target.value })}
                        className="p-inputtext-sm w-full"
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Title Text Color</label>
                    <div className="flex gap-2 align-items-center">
                      <input
                        type="color"
                        value={config.titleTextColor || '#ffffff'}
                        onChange={(e) => setConfig({ ...config, titleTextColor: e.target.value })}
                        style={{ width: '38px', height: '34px', padding: 0, cursor: 'pointer', border: 'none' }}
                      />
                      <InputText
                        value={config.titleTextColor || '#ffffff'}
                        onChange={(e) => setConfig({ ...config, titleTextColor: e.target.value })}
                        className="p-inputtext-sm w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Statement & Content */}
            {activeTab === 'content' && (
              <div className="flex flex-column gap-3">
                <div className="p-3 border-round bg-blue-50 text-blue-900 text-xs">
                  <strong>Dynamic Placeholders:</strong> Use any of these tags in the statements below:
                  <div className="flex flex-wrap gap-1 mt-2">
                    {['{StudentName}', '{FatherName}', '{MotherName}', '{Class}', '{Section}', '{RollNo}', '{AdmissionNo}', '{AdmissionDate}', '{DOB}', '{DOBWords}', '{AcademicYear}', '{Purpose}'].map((tag) => (
                      <span key={tag} className="bg-white px-2 py-1 border-round border-1 border-blue-200 font-mono text-xs font-bold text-blue-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Primary Certification Statement</label>
                  <InputTextarea
                    value={config.bodyTemplateText || ''}
                    onChange={(e) => setConfig({ ...config, bodyTemplateText: e.target.value })}
                    rows={4}
                    className="w-full text-sm font-sans"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Date of Birth & Age Verification Sentence</label>
                  <InputTextarea
                    value={config.dobSentenceText || ''}
                    onChange={(e) => setConfig({ ...config, dobSentenceText: e.target.value })}
                    rows={2}
                    className="w-full text-sm font-sans"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Conduct & Character Sentence</label>
                  <InputTextarea
                    value={config.conductSentenceText || ''}
                    onChange={(e) => setConfig({ ...config, conductSentenceText: e.target.value })}
                    rows={2}
                    className="w-full text-sm font-sans"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Purpose Sentence</label>
                  <InputTextarea
                    value={config.purposeSentenceText || ''}
                    onChange={(e) => setConfig({ ...config, purposeSentenceText: e.target.value })}
                    rows={2}
                    className="w-full text-sm font-sans"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Default Purpose (if parent specifies none)</label>
                  <InputText
                    value={config.defaultPurpose || ''}
                    onChange={(e) => setConfig({ ...config, defaultPurpose: e.target.value })}
                    placeholder="e.g. Passport Application / Visa / Admission"
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Verification Footer Text</label>
                  <InputText
                    value={config.footerText || ''}
                    onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Letterhead & BG */}
            {activeTab === 'letterhead' && (
              <div className="flex flex-column gap-3">
                <div className="flex align-items-center justify-content-between p-3 border-round border-1 border-200 bg-white">
                  <div>
                    <span className="font-semibold text-800 text-sm block">Use Pre-Printed School Letterhead</span>
                    <span className="text-xs text-500">Enable if certificates are printed on physical stationeries</span>
                  </div>
                  <InputSwitch
                    checked={config.useLetterhead}
                    onChange={(e) => setConfig({ ...config, useLetterhead: e.value })}
                  />
                </div>

                {config.useLetterhead && (
                  <div className="flex flex-column gap-3 p-3 border-round border-1 border-blue-200 bg-blue-50">
                    <div className="flex align-items-center justify-content-between">
                      <span className="text-xs font-semibold text-800">Hide Digital Header (Letterhead has school name)</span>
                      <InputSwitch
                        checked={config.hideHeaderOnLetterhead}
                        onChange={(e) => setConfig({ ...config, hideHeaderOnLetterhead: e.value })}
                      />
                    </div>

                    <div className="flex align-items-center justify-content-between">
                      <span className="text-xs font-semibold text-800">Hide Outer Border (Letterhead has borders)</span>
                      <InputSwitch
                        checked={config.hideBorderOnLetterhead}
                        onChange={(e) => setConfig({ ...config, hideBorderOnLetterhead: e.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-700 block mb-1">
                        Top Margin for Letterhead ({config.letterheadTopMargin || 140}px)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="250"
                        value={config.letterheadTopMargin || 140}
                        onChange={(e) => setConfig({ ...config, letterheadTopMargin: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-700 block mb-1">Upload Letterhead Template Background</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleLetterheadUpload}
                        className="p-inputtext-sm w-full text-xs"
                      />
                      {config.letterheadBgImage && (
                        <Button
                          label="Remove Letterhead Image"
                          icon="pi pi-times"
                          className="p-button-text p-button-danger p-button-sm mt-2"
                          onClick={() => setConfig({ ...config, letterheadBgImage: '' })}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Student Details & Photo */}
            {activeTab === 'elements' && (
              <div className="flex flex-column gap-3">
                <div className="flex align-items-center justify-content-between p-2 border-round border-1 border-200 bg-white">
                  <span className="text-xs font-semibold text-800">Show Student Passport Photo Box</span>
                  <InputSwitch
                    checked={config.showStudentPhoto}
                    onChange={(e) => setConfig({ ...config, showStudentPhoto: e.value })}
                  />
                </div>

                {config.showStudentPhoto && (
                  <div className="grid">
                    <div className="col-6">
                      <label className="text-xs font-medium text-700">Photo Width: {config.photoWidth || 80}px</label>
                      <input
                        type="range"
                        min="60"
                        max="120"
                        value={config.photoWidth || 80}
                        onChange={(e) => setConfig({ ...config, photoWidth: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div className="col-6">
                      <label className="text-xs font-medium text-700">Photo Height: {config.photoHeight || 96}px</label>
                      <input
                        type="range"
                        min="70"
                        max="140"
                        value={config.photoHeight || 96}
                        onChange={(e) => setConfig({ ...config, photoHeight: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                <div className="flex align-items-center justify-content-between p-2 border-round border-1 border-200 bg-white">
                  <span className="text-xs font-semibold text-800">Show Student Details Table</span>
                  <InputSwitch
                    checked={config.showDetailsTable}
                    onChange={(e) => setConfig({ ...config, showDetailsTable: e.value })}
                  />
                </div>

                <div className="flex align-items-center justify-content-between p-2 border-round border-1 border-200 bg-white">
                  <span className="text-xs font-semibold text-800">Show Ref / Dispatch Number</span>
                  <InputSwitch
                    checked={config.showRefNo}
                    onChange={(e) => setConfig({ ...config, showRefNo: e.value })}
                  />
                </div>

                <div className="flex align-items-center justify-content-between p-2 border-round border-1 border-200 bg-white">
                  <span className="text-xs font-semibold text-800">Show Date of Issue</span>
                  <InputSwitch
                    checked={config.showIssueDate}
                    onChange={(e) => setConfig({ ...config, showIssueDate: e.value })}
                  />
                </div>

                <div className="flex align-items-center justify-content-between p-2 border-round border-1 border-200 bg-white">
                  <span className="text-xs font-semibold text-800">Show Official School Seal Box</span>
                  <InputSwitch
                    checked={config.showSchoolSealBox}
                    onChange={(e) => setConfig({ ...config, showSchoolSealBox: e.value })}
                  />
                </div>

                <div className="flex align-items-center justify-content-between p-2 border-round border-1 border-200 bg-white">
                  <span className="text-xs font-semibold text-800">Show Anti-Tamper QR Verification Chip</span>
                  <InputSwitch
                    checked={config.showQrCode}
                    onChange={(e) => setConfig({ ...config, showQrCode: e.value })}
                  />
                </div>

                <Divider />

                <h3 className="text-base font-semibold text-800 m-0">Watermark Security</h3>
                <div className="flex align-items-center justify-content-between p-2 border-round border-1 border-200 bg-white">
                  <span className="text-xs font-semibold text-800">Enable Diagonal Watermark</span>
                  <InputSwitch
                    checked={config.showWatermark}
                    onChange={(e) => setConfig({ ...config, showWatermark: e.value })}
                  />
                </div>
                {config.showWatermark && (
                  <div className="field mb-2">
                    <label className="text-xs font-medium text-700">Watermark Text</label>
                    <InputText
                      value={config.watermarkText || ''}
                      onChange={(e) => setConfig({ ...config, watermarkText: e.target.value })}
                      placeholder="e.g. BONAFIDE / VERIFIED"
                      className="w-full p-inputtext-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Layout & Paper */}
            {activeTab === 'layout' && (
              <div className="flex flex-column gap-3">
                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Paper Standard</label>
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
                      value={config.pageMargin || '8mm'}
                      options={PAGE_MARGIN_OPTIONS}
                      onChange={(e) => setConfig({ ...config, pageMargin: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Border Style</label>
                    <Dropdown
                      value={config.borderStyle || 'Double'}
                      options={BORDER_STYLES}
                      onChange={(e) => setConfig({ ...config, borderStyle: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Typography Font Family</label>
                    <Dropdown
                      value={config.fontFamily || 'Inter, sans-serif'}
                      options={FONT_OPTIONS}
                      onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                      className="w-full p-dropdown-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="text-xs font-medium text-700">Base Font Size: {config.baseFontSize || 13}px</label>
                    <input
                      type="range"
                      min="11"
                      max="17"
                      value={config.baseFontSize || 13}
                      onChange={(e) => setConfig({ ...config, baseFontSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-700">Canvas Inner Padding: {config.pagePadding || 20}px</label>
                  <input
                    type="range"
                    min="12"
                    max="40"
                    value={config.pagePadding || 20}
                    onChange={(e) => setConfig({ ...config, pagePadding: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Tab 6: Signatures & Seal */}
            {activeTab === 'signatures' && (
              <div className="flex flex-column gap-3">
                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Left Signature Authority</label>
                  <InputText
                    value={config.signature1 || ''}
                    onChange={(e) => setConfig({ ...config, signature1: e.target.value })}
                    placeholder="e.g. Class Teacher / Verifying Clerk"
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Center Signature Label (when seal box is off)</label>
                  <InputText
                    value={config.signature2 || ''}
                    onChange={(e) => setConfig({ ...config, signature2: e.target.value })}
                    placeholder="e.g. Office Superintendent / Exam Incharge"
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="field mb-2">
                  <label className="text-xs font-medium text-700">Right Authority Signature (Principal / Head)</label>
                  <InputText
                    value={config.signature3 || ''}
                    onChange={(e) => setConfig({ ...config, signature3: e.target.value })}
                    placeholder="e.g. Principal / Head of Institution"
                    className="w-full p-inputtext-sm"
                  />
                </div>
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
                  <span className="text-base font-bold text-800">Live Certificate Preview</span>
                </div>
                <Tag value="Full Sheet A4 Format" severity="success" />
              </div>
            }
          >
            <div
              id="printable-certificate-container"
              ref={previewRef}
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: `${config.pagePadding || 20}px`,
                paddingTop:
                  config.useLetterhead && config.hideHeaderOnLetterhead
                    ? `${config.letterheadTopMargin || 140}px`
                    : `${config.pagePadding || 20}px`,
                borderRadius: '4px',
                maxHeight: '78vh',
                overflowY: 'auto',
                fontFamily: config.fontFamily || 'Inter, sans-serif',
                fontSize: `${config.baseFontSize || 13}px`,
                color: config.bodyTextColor || '#1e293b',
                border:
                  config.useLetterhead && config.hideBorderOnLetterhead
                    ? 'none'
                    : config.borderStyle === 'Solid'
                    ? `2px solid ${config.borderColor}`
                    : config.borderStyle === 'Double'
                    ? `4px double ${config.borderColor}`
                    : config.borderStyle === 'Dashed'
                    ? `1.5px dashed ${config.borderColor}`
                    : config.borderStyle === 'Antique'
                    ? `6px ridge ${config.borderColor}`
                    : '1px solid #e5e7eb',
                backgroundImage:
                  config.useLetterhead && config.letterheadBgImage ? `url(${config.letterheadBgImage})` : 'none',
                backgroundSize: config.letterheadFit || 'contain',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
              }}
            >
              {/* Optional Background Watermark */}
              {config.showWatermark && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-30deg)',
                    fontSize: '48px',
                    fontWeight: 900,
                    color: 'rgba(0,0,0,0.04)',
                    pointerEvents: 'none',
                    letterSpacing: '6px',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 0,
                  }}
                >
                  {config.watermarkText || activeCertMeta.shortLabel.toUpperCase()}
                </div>
              )}

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* 1. School Header */}
                {(!config.useLetterhead || !config.hideHeaderOnLetterhead) && (
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
                      marginBottom: '10px',
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
                          overflow: 'hidden',
                        }}
                      >
                        {config.schoolLogoUrl || selectedSchool?.logoUrl ? (
                          <img
                            src={config.schoolLogoUrl || selectedSchool?.logoUrl}
                            alt="Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <i className="pi pi-building" style={{ fontSize: `${(config.logoSize || 56) * 0.45}px` }}></i>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        textAlign: config.headerAlignment === 'left' ? 'left' : 'center',
                        flex: 1,
                        cursor: 'pointer',
                      }}
                      title="Click to edit Header & School Details in Left Controls"
                      onClick={() => setActiveTab('header')}
                      className="hover:surface-50 p-1 border-round transition-colors"
                    >
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

                      {config.showHeaderSubtitle !== false && (
                        <div
                          style={{
                            fontSize: `${config.headerSubtitleFontSize || 12}px`,
                            fontWeight: config.headerSubtitleFontWeight || '600',
                            color: config.headerSubtitleColor || '#334155',
                            marginTop: '3px',
                          }}
                        >
                          {config.headerSubtitleCustom || defaultSubtitle}
                        </div>
                      )}

                      {config.showHeaderAddress !== false && (
                        <div
                          style={{
                            fontSize: `${config.headerAddressFontSize || 11}px`,
                            color: config.headerAddressColor || '#475569',
                            marginTop: '2px',
                          }}
                        >
                          {config.headerAddressCustom || defaultAddress}
                        </div>
                      )}
                    </div>

                    {config.showQrCode && (
                      <div className="text-center p-1 border-1 surface-border border-round ml-2" style={{ width: '56px', flexShrink: 0 }}>
                        <i className="pi pi-qrcode text-2xl text-slate-700"></i>
                        <div style={{ fontSize: '7px', color: '#64748b', fontWeight: 700 }}>VERIFIED</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Ref No & Issue Date Bar */}
                <div
                  className="flex justify-content-between align-items-center pb-2 border-bottom-1 surface-border mb-3"
                  style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}
                >
                  {config.showRefNo ? (
                    <div>
                      <span>Ref No: </span>
                      <strong style={{ color: config.primaryColor }}>
                        {config.refPrefix ? `${config.refPrefix}/2026/0428` : SAMPLE_STUDENT.refNo}
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

                {/* 3. Certificate Title Badge */}
                <div className="text-center my-3">
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: config.titleBgColor || config.primaryColor,
                      color: config.titleTextColor || '#ffffff',
                      padding: '5px 18px',
                      borderRadius: '4px',
                      fontSize: `${config.titleFontSize || 14}px`,
                      fontWeight: 800,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {config.certificateTitle || activeCertMeta.label.toUpperCase()}
                  </span>

                  {config.certificateSubtitle && (
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: config.primaryColor,
                        marginTop: '4px',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        textDecoration: 'underline',
                      }}
                    >
                      {config.certificateSubtitle}
                    </div>
                  )}
                </div>

                {/* 4. Certification Statement Body & Photo */}
                <div className="flex gap-4 my-3 align-items-start">
                  <div
                    className="flex-1"
                    style={{
                      lineHeight: '1.9',
                      textAlign: 'justify',
                      fontSize: `${config.baseFontSize || 13}px`,
                      color: config.bodyTextColor || '#1e293b',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatStatement(config.bodyTemplateText) }}
                  />

                  {config.showStudentPhoto && (
                    <div
                      style={{
                        width: `${config.photoWidth || 80}px`,
                        height: `${config.photoHeight || 96}px`,
                        flexShrink: 0,
                        border: `1.5px solid ${config.borderColor}`,
                        padding: '2px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '4px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="pi pi-user text-3xl text-slate-400"></i>
                      <span style={{ fontSize: '8px', color: '#94a3b8', marginTop: '2px' }}>STUDENT PHOTO</span>
                    </div>
                  )}
                </div>

                {/* 5. DOB / Age / Record Sentence */}
                {config.dobSentenceText && (
                  <div
                    className="my-2"
                    style={{
                      lineHeight: '1.8',
                      textAlign: 'justify',
                      fontSize: `${config.baseFontSize || 13}px`,
                      color: config.bodyTextColor || '#1e293b',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatStatement(config.dobSentenceText) }}
                  />
                )}

                {/* 6. Student Particulars Table */}
                <div className="my-3">{renderDetailsTable()}</div>

                {/* 7. Conduct & Purpose Statements */}
                {config.conductSentenceText && (
                  <div
                    className="my-2"
                    style={{
                      lineHeight: '1.8',
                      textAlign: 'justify',
                      fontSize: `${config.baseFontSize || 13}px`,
                      color: config.bodyTextColor || '#1e293b',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatStatement(config.conductSentenceText) }}
                  />
                )}

                {config.purposeSentenceText && (
                  <div
                    className="my-2"
                    style={{
                      lineHeight: '1.8',
                      textAlign: 'justify',
                      fontSize: `${config.baseFontSize || 13}px`,
                      color: config.bodyTextColor || '#1e293b',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatStatement(config.purposeSentenceText) }}
                  />
                )}

                {/* 8. Signatures Strip */}
                <div className="flex justify-content-between align-items-end mt-5 pt-3">
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
                      {config.signature1 || 'Class Teacher'}
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
                        {config.signature2 || 'Office Clerk'}
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
                      {config.signature3 || 'Principal / Head of Institution'}
                    </div>
                  </div>
                </div>

                {/* 9. System Footer */}
                {config.footerText && (
                  <div
                    className="text-center pt-2 mt-4 border-top-1 surface-border"
                    style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}
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

export default BonafideCertificateDesignerPage;
