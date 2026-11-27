import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Slider } from 'primereact/slider';
import { superAdminApi } from '../api/superAdminApi';
import { printElement } from '../../../utils/printUtils';

const PRESET_PALETTES = [
  { name: 'Forest Emerald', primary: '#065f46', secondary: '#ecfdf5', accent: '#064e3b', border: '#065f46', tableHeader: '#065f46' },
  { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#eff6ff', accent: '#172554', border: '#1e3a8a', tableHeader: '#1e3a8a' },
  { name: 'Classic Slate', primary: '#1e293b', secondary: '#f8fafc', accent: '#0f172a', border: '#334155', tableHeader: '#1e293b' },
  { name: 'Regal Maroon', primary: '#831843', secondary: '#fdf2f8', accent: '#701a75', border: '#831843', tableHeader: '#831843' },
  { name: 'Imperial Violet', primary: '#581c87', secondary: '#faf5ff', accent: '#3b0764', border: '#581c87', tableHeader: '#581c87' },
  { name: 'Amber Gold', primary: '#b45309', secondary: '#fffbeb', accent: '#78350f', border: '#b45309', tableHeader: '#b45309' },
  { name: 'Teal Elegance', primary: '#0f766e', secondary: '#f0fdfa', accent: '#115e59', border: '#0f766e', tableHeader: '#0f766e' },
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
  { label: 'Solid Border (Modern Clean)', value: 'Solid' },
  { label: 'Double Border (Traditional Ledger)', value: 'Double' },
  { label: 'Dashed Border', value: 'Dashed' },
  { label: 'Clean / Borderless', value: 'None' },
];

const SAMPLE_STUDENTS = [
  {
    admissionNo: 'DPS-2024-0412',
    admissionDate: '05-Apr-2024',
    studentName: 'AARAV SHARMA',
    gender: 'Male',
    dob: '14-Aug-2010',
    dobWords: 'Fourteenth August Two Thousand Ten',
    placeOfBirth: 'Jaipur',
    fatherName: 'Dr. Vikram Sharma',
    fatherOccupation: 'Physician',
    motherName: 'Mrs. Anjali Sharma',
    categoryName: 'General',
    religionName: 'Hindu',
    aadhaarNo: 'XXXX-9821',
    classAdmitted: 'Class VIII',
    currentClass: 'Class X-A',
    status: 'Active',
    withdrawalDate: '-',
    reasonForLeaving: '-',
    tcNumber: '-',
    conduct: 'Good',
  },
  {
    admissionNo: 'DPS-2024-0413',
    admissionDate: '10-Apr-2024',
    studentName: 'ANANYA VERMA',
    gender: 'Female',
    dob: '22-Oct-2011',
    dobWords: 'Twenty-Second October Two Thousand Eleven',
    placeOfBirth: 'Delhi',
    fatherName: 'Mr. Rakesh Verma',
    fatherOccupation: 'Civil Engineer',
    motherName: 'Mrs. Sunita Verma',
    categoryName: 'OBC',
    religionName: 'Hindu',
    aadhaarNo: 'XXXX-4312',
    classAdmitted: 'Class VII',
    currentClass: 'Class IX-B',
    status: 'Active',
    withdrawalDate: '-',
    reasonForLeaving: '-',
    tcNumber: '-',
    conduct: 'Exemplary',
  },
  {
    admissionNo: 'DPS-2022-0198',
    admissionDate: '12-Jul-2022',
    studentName: 'KABIR MEHTA',
    gender: 'Male',
    dob: '05-Feb-2009',
    dobWords: 'Fifth February Two Thousand Nine',
    placeOfBirth: 'Udaipur',
    fatherName: 'Mr. Deepak Mehta',
    fatherOccupation: 'Bank Manager',
    motherName: 'Mrs. Priya Mehta',
    categoryName: 'General',
    religionName: 'Jain',
    aadhaarNo: 'XXXX-6701',
    classAdmitted: 'Class VI',
    currentClass: 'Class X',
    status: 'Withdrawn',
    withdrawalDate: '15-Mar-2026',
    reasonForLeaving: "Parents' Transfer to Mumbai",
    tcNumber: 'DPS/TC/2026/041',
    conduct: 'Very Good',
  },
];

export const AwrReportDesignerPage = () => {
  const toastRef = useRef(null);
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [activeTab, setActiveTab] = useState('colors'); // 'colors' | 'letterhead' | 'columns' | 'header' | 'titles' | 'signatures'
  const [previewMode, setPreviewMode] = useState('ledger'); // 'ledger' (landscape master table) or 'folio' (single student sheet)

  const [config, setConfig] = useState({
    schoolId: null,
    schoolName: 'Platform Default (All Schools)',
    isSchoolOverride: false,

    // Letterhead Background Controls
    letterheadBgImage: '',
    useLetterhead: false,
    hideHeaderOnLetterhead: false,
    hideBorderOnLetterhead: false,
    letterheadTopMargin: 120,
    letterheadBottomMargin: 70,
    letterheadFit: 'contain',
    letterheadOpacity: 100,

    // Layout
    layoutMode: 'flow',
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargin: '6mm',
    pagePadding: 16,
    pageMaxWidth: 1150,

    // Styling
    primaryColor: '#065f46',
    secondaryColor: '#ecfdf5',
    accentColor: '#064e3b',
    borderColor: '#065f46',
    bodyTextColor: '#1e293b',
    tableHeaderBgColor: '#065f46',
    tableHeaderTextColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    baseFontSize: 11,
    borderStyle: 'Solid',

    // Sizing
    logoSize: 54,
    photoWidth: 64,
    photoHeight: 78,

    // Header Customization
    headerSchoolNameCustom: '',
    headerSchoolNameFontSize: 20,
    headerSchoolNameColor: '#065f46',
    headerSchoolNameFontWeight: '900',
    headerSchoolNameTransform: 'uppercase',
    headerSchoolNameLetterSpacing: '1px',
    headerSubtitleCustom: '',
    headerSubtitleFontSize: 11,
    headerSubtitleColor: '#334155',
    headerSubtitleFontWeight: '600',
    headerAddressCustom: '',
    headerAddressFontSize: 10,
    headerAddressColor: '#475569',
    headerAlignment: 'center',
    headerPaddingY: 10,
    headerDividerStyle: 'Double',
    headerDividerColor: '#065f46',

    // Titles
    reportTitle: 'ADMISSION AND WITHDRAWAL REGISTER (A.W.R.)',
    reportSubtitle: 'Statutory General Register maintained under Education Act & Board Rules',
    folioTitle: 'STUDENT A.W.R. FOLIO EXTRACT',
    titleBgColor: '#065f46',
    titleTextColor: '#ffffff',
    titleFontSize: 14,
    refPrefix: 'DPS/AWR',

    // Security & Seals
    watermarkText: 'OFFICIAL AWR',
    showWatermark: true,
    showQrCode: true,
    showSchoolSealBox: true,
    showSchoolLogo: true,
    showAffiliationNo: true,
    showDiseCode: true,

    // Columns Visibility
    showAdmissionDate: true,
    showDobWords: true,
    showPlaceOfBirth: true,
    showFatherDetails: true,
    showMotherDetails: true,
    showCategoryReligion: true,
    showAadhaarNo: true,
    showClassAdmitted: true,
    showCurrentClass: true,
    showWithdrawalDetails: true,
    showTcDetails: true,
    showConduct: true,
    showSignatures: true,
    showIssueDate: true,
    showRefNo: true,

    // Signatures
    signature1: 'Prepared By / Record Clerk',
    signature2: 'Checked By / Section In-Charge',
    signature3: 'Principal / Head of Institution',

    // Footer
    footerText:
      'Certified that this document is an authentic extract from the Admission and Withdrawal Register maintained by the institution.',
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
      const res = await superAdminApi.getAwrConfig(schoolId);
      if (res?.success && res.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data,
          headerSchoolNameCustom: res.data.headerSchoolNameCustom || '',
          headerSubtitleCustom: res.data.headerSubtitleCustom || '',
          headerAddressCustom: res.data.headerAddressCustom || '',
          headerSchoolNameColor: res.data.headerSchoolNameColor || res.data.primaryColor || '#065f46',
          tableHeaderBgColor: res.data.tableHeaderBgColor || res.data.primaryColor || '#065f46',
          reportTitle: res.data.reportTitle || 'ADMISSION AND WITHDRAWAL REGISTER (A.W.R.)',
          letterheadBgImage: res.data.letterheadBgImage || '',
          letterheadTopMargin: res.data.letterheadTopMargin || 120,
        }));
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load AWR configuration',
        life: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await superAdminApi.saveAwrConfig(config, selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Saved Successfully',
          detail: selectedSchoolId
            ? `Custom AWR report layout saved for school #${selectedSchoolId}`
            : 'Platform default AWR template updated',
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

    if (!window.confirm('Are you sure you want to remove school custom overrides for AWR and inherit platform default?')) {
      return;
    }

    try {
      setSaving(true);
      const res = await superAdminApi.resetAwrConfig(selectedSchoolId);
      if (res?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Reset Successful',
          detail: 'School AWR configuration reset to platform default',
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

  const handlePrintTest = () => {
    if (previewRef.current) {
      printElement(previewRef.current, 'AWR_Report_Sample');
    }
  };

  const applyPalette = (pal) => {
    setConfig((prev) => ({
      ...prev,
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      borderColor: pal.border,
      tableHeaderBgColor: pal.tableHeader,
      headerSchoolNameColor: pal.primary,
      titleBgColor: pal.primary,
      headerDividerColor: pal.border,
    }));
  };

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
          detail: 'AWR background image applied successfully.',
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

  return (
    <div className="p-3 surface-ground min-h-screen">
      <Toast ref={toastRef} />

      {/* Top Header Card */}
      <Card className="mb-4 shadow-1 border-none">
        <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3">
          <div>
            <div className="flex align-items-center gap-2 mb-1">
              <i className="pi pi-table text-2xl text-emerald-600"></i>
              <h1 className="text-2xl font-bold text-slate-800 m-0">Student AWR Report Designer</h1>
              <Tag value="Statutory Register" severity="success" className="text-xs px-2" />
              {config.useLetterhead && <Tag value="Letterhead Mode" severity="info" className="text-xs px-2" />}
            </div>
            <p className="text-sm text-slate-500 m-0">
              Customize the Admission & Withdrawal Register (A.W.R.) ledger format and student folio extract certificates.
            </p>
          </div>

          <div className="flex align-items-center gap-2 flex-wrap">
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

      {/* Main Grid: Controls Left (4 cols) | Live Canvas Right (8 cols) */}
      <div className="grid">
        {/* Controls Column */}
        <div className="col-12 lg:col-4">
          <Card className="shadow-2 border-none">
            {/* Tabs */}
            <div className="flex gap-1 border-bottom-1 surface-border pb-2 mb-3 overflow-x-auto">
              {[
                { id: 'colors', label: '🎨 Colours', icon: 'pi pi-palette' },
                { id: 'letterhead', label: 'Letterhead', icon: 'pi pi-image' },
                { id: 'columns', label: 'Columns', icon: 'pi pi-list' },
                { id: 'header', label: 'Header', icon: 'pi pi-id-card' },
                { id: 'titles', label: 'Titles', icon: 'pi pi-file-edit' },
                { id: 'signatures', label: 'Signatures', icon: 'pi pi-pencil' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-2 px-3 border-none border-round font-medium text-xs flex align-items-center gap-1 cursor-pointer transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-1'
                      : 'surface-100 text-slate-600 hover:surface-200'
                  }`}
                >
                  <i className={tab.icon}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB: Colours */}
            {activeTab === 'colors' && (
              <div className="flex flex-column gap-3">
                <div className="p-2 border-round bg-emerald-50 text-emerald-900 text-xs">
                  <strong>AWR Ledger Themes:</strong> Select official register color schemes or fine-tune individual table header, text, and border accents.
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Preset Color Themes</label>
                  <div className="grid">
                    {PRESET_PALETTES.map((pal, idx) => (
                      <div key={idx} className="col-6">
                        <button
                          type="button"
                          onClick={() => applyPalette(pal)}
                          className={`w-full p-2 border-1 border-round text-left flex align-items-center gap-2 cursor-pointer transition-all ${
                            config.primaryColor === pal.primary
                              ? 'border-emerald-600 bg-emerald-50 shadow-1'
                              : 'surface-border surface-card hover:surface-100'
                          }`}
                        >
                          <span
                            className="w-1.5rem h-1.5rem border-circle flex-shrink-0 border-1 surface-border"
                            style={{ backgroundColor: pal.primary }}
                          />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 line-clamp-1">{pal.name}</div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid">
                  <div className="col-6">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Theme Accent</label>
                    <div className="flex align-items-center gap-2">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            primaryColor: e.target.value,
                            headerSchoolNameColor: e.target.value,
                            titleBgColor: e.target.value,
                            tableHeaderBgColor: e.target.value,
                          })
                        }
                        className="w-2rem h-2rem border-none p-0 cursor-pointer border-round shadow-1"
                      />
                      <InputText
                        value={config.primaryColor}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="p-inputtext-sm w-full font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="col-6">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Header BG</label>
                    <div className="flex align-items-center gap-2">
                      <input
                        type="color"
                        value={config.tableHeaderBgColor}
                        onChange={(e) => setConfig({ ...config, tableHeaderBgColor: e.target.value })}
                        className="w-2rem h-2rem border-none p-0 cursor-pointer border-round shadow-1"
                      />
                      <InputText
                        value={config.tableHeaderBgColor}
                        onChange={(e) => setConfig({ ...config, tableHeaderBgColor: e.target.value })}
                        className="p-inputtext-sm w-full font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Font Family</label>
                  <Dropdown
                    value={config.fontFamily}
                    options={FONT_OPTIONS}
                    onChange={(e) => setConfig({ ...config, fontFamily: e.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>
              </div>
            )}

            {/* TAB: Letterhead */}
            {activeTab === 'letterhead' && (
              <div className="flex flex-column gap-3">
                <div className="p-2 border-round bg-blue-50 text-blue-900 text-xs">
                  Upload custom school letterhead background for printing AWR sheets on pre-printed stationery.
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Upload Letterhead Image (PNG / JPEG)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleLetterheadUpload}
                    className="w-full text-xs p-2 border-1 surface-border border-round"
                  />
                </div>

                {config.letterheadBgImage && (
                  <>
                    <div className="flex align-items-center justify-content-between p-2 surface-100 border-round">
                      <span className="text-xs font-semibold text-slate-700">Letterhead Active</span>
                      <Button
                        label="Remove"
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        size="small"
                        onClick={clearLetterhead}
                      />
                    </div>

                    <div className="flex align-items-center justify-content-between">
                      <span className="text-xs font-semibold text-slate-700">Hide Digital Header</span>
                      <InputSwitch
                        checked={config.hideHeaderOnLetterhead}
                        onChange={(e) => setConfig({ ...config, hideHeaderOnLetterhead: e.value })}
                      />
                    </div>

                    <div className="flex align-items-center justify-content-between">
                      <span className="text-xs font-semibold text-slate-700">Hide Border</span>
                      <InputSwitch
                        checked={config.hideBorderOnLetterhead}
                        onChange={(e) => setConfig({ ...config, hideBorderOnLetterhead: e.value })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-content-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Top Header Spacing</span>
                        <span className="text-slate-500">{config.letterheadTopMargin}px</span>
                      </div>
                      <Slider
                        value={config.letterheadTopMargin}
                        min={40}
                        max={260}
                        onChange={(e) => setConfig({ ...config, letterheadTopMargin: e.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: Columns */}
            {activeTab === 'columns' && (
              <div className="flex flex-column gap-2">
                <div className="text-xs text-slate-500 mb-1">
                  Toggle columns to include or omit in the statutory AWR ledger table:
                </div>

                {[
                  { key: 'showAdmissionDate', label: 'Admission Date' },
                  { key: 'showDobWords', label: 'DOB in Words' },
                  { key: 'showPlaceOfBirth', label: 'Place of Birth' },
                  { key: 'showFatherDetails', label: "Father's Details (Name & Occupation)" },
                  { key: 'showMotherDetails', label: "Mother's Details" },
                  { key: 'showCategoryReligion', label: 'Caste Category & Religion' },
                  { key: 'showAadhaarNo', label: 'Aadhaar / PEN No.' },
                  { key: 'showClassAdmitted', label: 'Class to which Admitted' },
                  { key: 'showCurrentClass', label: 'Current / Last Class Studied' },
                  { key: 'showWithdrawalDetails', label: 'Withdrawal Date & Reason' },
                  { key: 'showTcDetails', label: 'Transfer Certificate (TC) Details' },
                  { key: 'showConduct', label: 'Conduct & Remarks' },
                  { key: 'showSignatures', label: 'Signatures & Seal Box' },
                ].map((col) => (
                  <div
                    key={col.key}
                    className="flex align-items-center justify-content-between p-2 surface-50 border-round"
                  >
                    <span className="text-xs font-medium text-slate-700">{col.label}</span>
                    <InputSwitch
                      checked={config[col.key]}
                      onChange={(e) => setConfig({ ...config, [col.key]: e.value })}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* TAB: Header */}
            {activeTab === 'header' && (
              <div className="flex flex-column gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">School Name (Header)</label>
                  <InputText
                    value={config.headerSchoolNameCustom}
                    onChange={(e) => setConfig({ ...config, headerSchoolNameCustom: e.target.value })}
                    className="w-full p-inputtext-sm"
                    placeholder="Leave blank to use default school name"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Sub-heading (Affiliation & Codes)</label>
                  <InputText
                    value={config.headerSubtitleCustom}
                    onChange={(e) => setConfig({ ...config, headerSubtitleCustom: e.target.value })}
                    className="w-full p-inputtext-sm"
                    placeholder="e.g. Affiliated to CBSE • U-DISE Code: 081203001"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Address & Contact Details</label>
                  <InputText
                    value={config.headerAddressCustom}
                    onChange={(e) => setConfig({ ...config, headerAddressCustom: e.target.value })}
                    className="w-full p-inputtext-sm"
                    placeholder="e.g. Sector 4, Green Avenue, Jaipur - 302023"
                  />
                </div>

                <div className="flex align-items-center justify-content-between">
                  <span className="text-xs font-semibold text-slate-700">Show School Logo</span>
                  <InputSwitch
                    checked={config.showSchoolLogo}
                    onChange={(e) => setConfig({ ...config, showSchoolLogo: e.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB: Titles */}
            {activeTab === 'titles' && (
              <div className="flex flex-column gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">AWR Main Heading</label>
                  <InputText
                    value={config.reportTitle}
                    onChange={(e) => setConfig({ ...config, reportTitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Subtitle / Statutory Note</label>
                  <InputText
                    value={config.reportSubtitle}
                    onChange={(e) => setConfig({ ...config, reportSubtitle: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Watermark Text</label>
                  <InputText
                    value={config.watermarkText}
                    onChange={(e) => setConfig({ ...config, watermarkText: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Verification Statement (Footer)</label>
                  <InputTextarea
                    rows={3}
                    value={config.footerText}
                    onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB: Signatures */}
            {activeTab === 'signatures' && (
              <div className="flex flex-column gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Signature 1</label>
                  <InputText
                    value={config.signature1}
                    onChange={(e) => setConfig({ ...config, signature1: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Signature 2</label>
                  <InputText
                    value={config.signature2}
                    onChange={(e) => setConfig({ ...config, signature2: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Signature 3 (Head of School)</label>
                  <InputText
                    value={config.signature3}
                    onChange={(e) => setConfig({ ...config, signature3: e.target.value })}
                    className="w-full p-inputtext-sm"
                  />
                </div>

                <div className="flex align-items-center justify-content-between">
                  <span className="text-xs font-semibold text-slate-700">Official Seal Box</span>
                  <InputSwitch
                    checked={config.showSchoolSealBox}
                    onChange={(e) => setConfig({ ...config, showSchoolSealBox: e.value })}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Live Canvas Preview Column */}
        <div className="col-12 lg:col-8">
          <Card className="shadow-2 border-none">
            {/* Mode Switcher */}
            <div className="flex justify-content-between align-items-center mb-3 pb-2 border-bottom-1 surface-border">
              <div className="flex gap-2">
                <Button
                  label="Master Ledger View (Landscape)"
                  icon="pi pi-table"
                  size="small"
                  severity={previewMode === 'ledger' ? 'success' : 'secondary'}
                  outlined={previewMode !== 'ledger'}
                  onClick={() => setPreviewMode('ledger')}
                />
                <Button
                  label="Student Folio Extract (A4 Portrait)"
                  icon="pi pi-id-card"
                  size="small"
                  severity={previewMode === 'folio' ? 'success' : 'secondary'}
                  outlined={previewMode !== 'folio'}
                  onClick={() => setPreviewMode('folio')}
                />
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Live Interactive Preview
              </span>
            </div>

            {/* Canvas Container */}
            <div
              className="overflow-x-auto p-2 surface-200 border-round"
              style={{ minHeight: '650px' }}
            >
              <div
                ref={previewRef}
                className="bg-white mx-auto shadow-3 relative"
                style={{
                  width: previewMode === 'ledger' ? '1080px' : '750px',
                  minHeight: '600px',
                  padding: `${config.pagePadding}px`,
                  paddingTop:
                    config.useLetterhead && config.hideHeaderOnLetterhead
                      ? `${config.letterheadTopMargin}px`
                      : `${config.pagePadding}px`,
                  fontFamily: config.fontFamily,
                  fontSize: `${config.baseFontSize}px`,
                  border:
                    config.useLetterhead && config.hideBorderOnLetterhead
                      ? 'none'
                      : config.borderStyle === 'Double'
                      ? `3px double ${config.borderColor}`
                      : `1.5px solid ${config.borderColor}`,
                  backgroundImage:
                    config.useLetterhead && config.letterheadBgImage
                      ? `url(${config.letterheadBgImage})`
                      : 'none',
                  backgroundSize: config.letterheadFit,
                  backgroundPosition: 'top center',
                  backgroundRepeat: 'no-repeat',
                  position: 'relative',
                }}
              >
                {/* Watermark */}
                {config.showWatermark && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-25deg)',
                      fontSize: '60px',
                      fontWeight: 900,
                      color: 'rgba(0,0,0,0.03)',
                      pointerEvents: 'none',
                      letterSpacing: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {config.watermarkText}
                  </div>
                )}

                {/* Header Section */}
                {(!config.useLetterhead || !config.hideHeaderOnLetterhead) && (
                  <div
                    className="text-center pb-2 mb-2"
                    style={{
                      borderBottom:
                        config.headerDividerStyle === 'Double'
                          ? `3px double ${config.headerDividerColor}`
                          : `1.5px solid ${config.headerDividerColor}`,
                    }}
                  >
                    <div className="flex align-items-center justify-content-between">
                      {config.showSchoolLogo && (
                        <img
                          src={config.schoolLogoUrl || (selectedSchoolId ? schools.find((s) => s.id === selectedSchoolId)?.logoUrl : null) || '/dvslogo1.jpeg'}
                          alt="Logo"
                          style={{ width: `${config.logoSize}px`, height: `${config.logoSize}px`, objectFit: 'contain' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
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
                          }}
                        >
                          {config.headerSchoolNameCustom ||
                            (selectedSchoolId
                              ? schools.find((s) => s.id === selectedSchoolId)?.name
                              : 'DELHI PUBLIC SCHOOL')}
                        </h2>

                        <div
                          style={{
                            fontSize: `${config.headerSubtitleFontSize}px`,
                            fontWeight: config.headerSubtitleFontWeight,
                            color: config.headerSubtitleColor,
                            marginTop: '2px',
                          }}
                        >
                          {config.headerSubtitleCustom ||
                            'Affiliated to CBSE • Affil No: 2026/0912 • Statutory General Register'}
                        </div>

                        <div
                          style={{
                            fontSize: `${config.headerAddressFontSize}px`,
                            color: config.headerAddressColor,
                            marginTop: '2px',
                          }}
                        >
                          {config.headerAddressCustom ||
                            '123 Knowledge Park, Sector 4, New Delhi - 110001'}
                        </div>
                      </div>

                      {config.showQrCode && (
                        <div className="text-center p-1 border-1 surface-border border-round" style={{ width: '56px' }}>
                          <i className="pi pi-qrcode text-2xl text-slate-700"></i>
                          <div style={{ fontSize: '7px', color: '#64748b', fontWeight: 700 }}>AWR SECURE</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Title Ribbon */}
                <div
                  className="text-center py-1.5 px-3 mb-3 border-round"
                  style={{
                    backgroundColor: config.titleBgColor,
                    color: config.titleTextColor,
                  }}
                >
                  <div style={{ fontSize: `${config.titleFontSize}px`, fontWeight: 800, letterSpacing: '1px' }}>
                    {previewMode === 'ledger' ? config.reportTitle : config.folioTitle}
                  </div>
                  <div style={{ fontSize: '9px', opacity: 0.9 }}>
                    {config.reportSubtitle}
                  </div>
                </div>

                {/* Sub-bar: Ref & Date */}
                <div className="flex justify-content-between text-xs text-slate-600 mb-2 pb-1 border-bottom-1 surface-border">
                  <div>
                    <strong>Ref No: </strong>
                    <span style={{ color: config.primaryColor, fontWeight: 700 }}>
                      {config.refPrefix}/2026/REG-01
                    </span>
                  </div>
                  <div>
                    <strong>Academic Session: </strong> 2025-2026
                  </div>
                  <div>
                    <strong>Date of Print: </strong> 23-Nov-2026
                  </div>
                </div>

                {/* PREVIEW MODE 1: MASTER LEDGER TABLE */}
                {previewMode === 'ledger' ? (
                  <div className="overflow-x-auto mb-4">
                    <table
                      className="w-full border-collapse"
                      style={{ fontSize: '9.5px', border: `1px solid ${config.borderColor}` }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: config.tableHeaderBgColor,
                            color: config.tableHeaderTextColor,
                            textAlign: 'left',
                          }}
                        >
                          <th className="p-1.5 border-1 border-slate-300">Scholar No</th>
                          {config.showAdmissionDate && <th className="p-1.5 border-1 border-slate-300">Adm Date</th>}
                          <th className="p-1.5 border-1 border-slate-300">Student Name</th>
                          <th className="p-1.5 border-1 border-slate-300">DOB</th>
                          {config.showDobWords && <th className="p-1.5 border-1 border-slate-300">DOB in Words</th>}
                          {config.showFatherDetails && <th className="p-1.5 border-1 border-slate-300">Father's Name</th>}
                          {config.showCategoryReligion && <th className="p-1.5 border-1 border-slate-300">Cat / Rel</th>}
                          {config.showClassAdmitted && <th className="p-1.5 border-1 border-slate-300">Adm Class</th>}
                          {config.showCurrentClass && <th className="p-1.5 border-1 border-slate-300">Current</th>}
                          <th className="p-1.5 border-1 border-slate-300">Status</th>
                          {config.showWithdrawalDetails && <th className="p-1.5 border-1 border-slate-300">Left Date & Reason</th>}
                          {config.showTcDetails && <th className="p-1.5 border-1 border-slate-300">TC No</th>}
                          {config.showConduct && <th className="p-1.5 border-1 border-slate-300">Conduct</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_STUDENTS.map((st, i) => (
                          <tr
                            key={i}
                            style={{
                              backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                              borderBottom: '1px solid #cbd5e1',
                            }}
                          >
                            <td className="p-1.5 font-bold border-1 border-slate-200" style={{ color: config.primaryColor }}>
                              {st.admissionNo}
                            </td>
                            {config.showAdmissionDate && (
                              <td className="p-1.5 border-1 border-slate-200">{st.admissionDate}</td>
                            )}
                            <td className="p-1.5 font-bold border-1 border-slate-200">{st.studentName}</td>
                            <td className="p-1.5 border-1 border-slate-200">{st.dob}</td>
                            {config.showDobWords && (
                              <td className="p-1.5 border-1 border-slate-200 italic" style={{ fontSize: '8.5px' }}>
                                {st.dobWords}
                              </td>
                            )}
                            {config.showFatherDetails && (
                              <td className="p-1.5 border-1 border-slate-200">{st.fatherName}</td>
                            )}
                            {config.showCategoryReligion && (
                              <td className="p-1.5 border-1 border-slate-200">
                                {st.categoryName} / {st.religionName}
                              </td>
                            )}
                            {config.showClassAdmitted && (
                              <td className="p-1.5 border-1 border-slate-200">{st.classAdmitted}</td>
                            )}
                            {config.showCurrentClass && (
                              <td className="p-1.5 font-semibold border-1 border-slate-200">{st.currentClass}</td>
                            )}
                            <td className="p-1.5 border-1 border-slate-200">
                              <span
                                className={`px-1.5 py-0.5 border-round font-bold ${
                                  st.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                                style={{ fontSize: '8.5px' }}
                              >
                                {st.status}
                              </span>
                            </td>
                            {config.showWithdrawalDetails && (
                              <td className="p-1.5 border-1 border-slate-200" style={{ fontSize: '8.5px' }}>
                                {st.withdrawalDate !== '-' ? `${st.withdrawalDate} (${st.reasonForLeaving})` : '-'}
                              </td>
                            )}
                            {config.showTcDetails && (
                              <td className="p-1.5 border-1 border-slate-200 font-mono" style={{ fontSize: '8.5px' }}>
                                {st.tcNumber}
                              </td>
                            )}
                            {config.showConduct && (
                              <td className="p-1.5 border-1 border-slate-200">{st.conduct}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* PREVIEW MODE 2: SINGLE STUDENT AWR FOLIO EXTRACT */
                  <div className="mb-4">
                    <div className="p-3 border-1 border-round surface-50 mb-3" style={{ borderColor: config.borderColor }}>
                      <div className="grid">
                        <div className="col-8">
                          <table className="w-full text-xs">
                            <tbody>
                              <tr>
                                <td className="font-bold py-1 text-slate-600" style={{ width: '150px' }}>Scholar / Admission No:</td>
                                <td className="font-bold" style={{ color: config.primaryColor }}>{SAMPLE_STUDENTS[0].admissionNo}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Date of Admission:</td>
                                <td>{SAMPLE_STUDENTS[0].admissionDate}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Student Full Name:</td>
                                <td className="font-bold uppercase">{SAMPLE_STUDENTS[0].studentName}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Date of Birth (in Figures):</td>
                                <td>{SAMPLE_STUDENTS[0].dob}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Date of Birth (in Words):</td>
                                <td className="italic">{SAMPLE_STUDENTS[0].dobWords}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Father's Name & Occ:</td>
                                <td>{SAMPLE_STUDENTS[0].fatherName} ({SAMPLE_STUDENTS[0].fatherOccupation})</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Mother's Name:</td>
                                <td>{SAMPLE_STUDENTS[0].motherName}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Category & Religion:</td>
                                <td>{SAMPLE_STUDENTS[0].categoryName} • {SAMPLE_STUDENTS[0].religionName}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Class Admitted:</td>
                                <td>{SAMPLE_STUDENTS[0].classAdmitted}</td>
                              </tr>
                              <tr>
                                <td className="font-bold py-1 text-slate-600">Current Academic Status:</td>
                                <td><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 border-round">{SAMPLE_STUDENTS[0].status} on Roll</span></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="col-4 text-center">
                          <div
                            className="border-1 surface-border border-round mx-auto flex flex-column align-items-center justify-content-center p-2 bg-white"
                            style={{ width: `${config.photoWidth + 10}px`, height: `${config.photoHeight + 10}px` }}
                          >
                            <i className="pi pi-user text-3xl text-slate-400 mb-1"></i>
                            <span style={{ fontSize: '8px', color: '#64748b' }}>STUDENT PHOTO</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signatures & Seal Section */}
                {config.showSignatures && (
                  <div className="flex justify-content-between align-items-end pt-3 mt-4 border-top-1 surface-border">
                    <div className="text-center" style={{ width: '180px' }}>
                      <div style={{ height: '32px' }}></div>
                      <div
                        style={{
                          borderTop: `1px solid ${config.borderColor}`,
                          fontSize: '10px',
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
                          width: '70px',
                          height: '70px',
                          border: `1.5px dashed ${config.borderColor}`,
                          fontSize: '8.5px',
                          fontWeight: 700,
                          color: config.primaryColor,
                          textTransform: 'uppercase',
                          lineHeight: 1.1,
                        }}
                      >
                        Official
                        <br />
                        School Seal
                      </div>
                    ) : (
                      <div className="text-center" style={{ width: '160px' }}>
                        <div style={{ height: '32px' }}></div>
                        <div
                          style={{
                            borderTop: `1px solid ${config.borderColor}`,
                            fontSize: '10px',
                            fontWeight: 700,
                            paddingTop: '4px',
                            color: '#334155',
                          }}
                        >
                          {config.signature2}
                        </div>
                      </div>
                    )}

                    <div className="text-center" style={{ width: '180px' }}>
                      <div style={{ height: '32px' }}></div>
                      <div
                        style={{
                          borderTop: `1px solid ${config.borderColor}`,
                          fontSize: '10px',
                          fontWeight: 700,
                          paddingTop: '4px',
                          color: '#334155',
                        }}
                      >
                        {config.signature3}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                {config.footerText && (
                  <div
                    className="text-center pt-2 mt-3 border-top-1 surface-border"
                    style={{ fontSize: '8.5px', color: '#94a3b8', fontStyle: 'italic' }}
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

export default AwrReportDesignerPage;
