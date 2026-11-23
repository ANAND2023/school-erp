import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import apiClient from '../../../api/client';
import { printElement } from '../../../utils/printUtils';

const PURPOSE_OPTIONS = [
  { label: 'Passport Application', value: 'Passport Application' },
  { label: 'Visa Processing / Embassy Verification', value: 'Visa Processing / Embassy Verification' },
  { label: 'Bank Account Opening', value: 'Bank Account Opening' },
  { label: 'Bus / Rail Concession Pass', value: 'Bus / Rail Concession Pass' },
  { label: 'Scholarship Application', value: 'Scholarship Application' },
  { label: 'College / Higher Secondary Admission', value: 'College / Higher Secondary Admission' },
  { label: 'Aadhaar / Identity Proof Verification', value: 'Aadhaar / Identity Proof Verification' },
  { label: 'Government Welfare Scheme', value: 'Government Welfare Scheme' },
  { label: 'General Official Verification', value: 'General Official Verification' },
];

export const BonafideCertificateModal = ({ open, onClose, studentId, studentData, certificateType = 'bonafide' }) => {
  const printRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [purpose, setPurpose] = useState('Passport Application');
  const [customPurpose, setCustomPurpose] = useState('');
  const [refNo, setRefNo] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [printWithLetterhead, setPrintWithLetterhead] = useState(true);

  useEffect(() => {
    if (!open) return;

    const typeKey = certificateType || 'bonafide';

    // Load Dynamic Configuration for this specific certificate type
    apiClient
      .get(`/students/certificate-config/${typeKey}`)
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setConfig(res.data.data);
          if (res.data.data.defaultPurpose) {
            setPurpose(res.data.data.defaultPurpose);
          }
          if (res.data.data.useLetterhead !== undefined) {
            setPrintWithLetterhead(res.data.data.useLetterhead);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load certificate config:', err);
      });

    // Set default Issue Date (Today in dd-MMM-yyyy)
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;
    setIssueDate(formattedDate);

    // Set Default Ref No according to certificate type
    const adm = studentData?.admissionNo || studentId || '001';
    const prefix =
      typeKey === 'birth'
        ? 'DPS/DOB'
        : typeKey === 'age'
        ? 'DPS/AGE'
        : typeKey === 'character'
        ? 'DPS/CC'
        : typeKey === 'ret'
        ? 'DPS/RET'
        : 'DPS/BC';
    setRefNo(`${prefix}/${today.getFullYear()}/${adm}`);
  }, [open, studentId, studentData, certificateType]);

  if (!open) return null;

  const currentPurpose = customPurpose.trim() || purpose || 'official verification';

  // Calculate age helper
  const calculateAge = (dobStr) => {
    if (!dobStr) return { ageText: 'N/A', years: 'N/A', months: 'N/A' };
    try {
      const birth = new Date(dobStr);
      if (isNaN(birth.getTime())) return { ageText: 'N/A', years: 'N/A', months: 'N/A' };
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      let months = today.getMonth() - birth.getMonth();
      if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
        years--;
        months = (months + 12) % 12;
      }
      return {
        ageText: `${years} Years and ${months} Months`,
        years: `${years}`,
        months: `${months}`,
      };
    } catch {
      return { ageText: 'N/A', years: 'N/A', months: 'N/A' };
    }
  };

  // Format DOB in words helper
  const getDobWords = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper to replace placeholders
  const formatStatement = (template) => {
    if (!template) return '';
    const sName = studentData?.studentName || studentData?.fullName || 'Student';
    const fName =
      studentData?.fatherName || studentData?.guardians?.find((g) => g.relation === 'Father')?.fullName || 'Father';
    const mName =
      studentData?.motherName || studentData?.guardians?.find((g) => g.relation === 'Mother')?.fullName || 'Mother';
    const cls = studentData?.className || studentData?.currentEnrollment?.className || 'N/A';
    const sec = studentData?.sectionName || studentData?.currentEnrollment?.sectionName || 'A';
    const roll = studentData?.rollNo || studentData?.currentEnrollment?.rollNo || 'N/A';
    const admNo = studentData?.admissionNo || 'N/A';
    const ay = studentData?.academicYear || 'Current Session';
    const dob = studentData?.dob ? new Date(studentData.dob).toLocaleDateString('en-GB') : 'N/A';
    const dobWords = getDobWords(studentData?.dob);
    const gender = studentData?.gender || 'N/A';
    const ageInfo = calculateAge(studentData?.dob);
    const admDate = studentData?.admissionDate
      ? new Date(studentData.admissionDate).toLocaleDateString('en-GB')
      : 'At time of admission';
    const asOnDate = issueDate || new Date().toLocaleDateString('en-GB');

    return template
      .replace(/{StudentName}/g, `<strong>${sName.toUpperCase()}</strong>`)
      .replace(/{FatherName}/g, `<strong>${fName}</strong>`)
      .replace(/{MotherName}/g, `<strong>${mName}</strong>`)
      .replace(/{Class}/g, `<strong>${cls}</strong>`)
      .replace(/{Section}/g, `<strong>${sec}</strong>`)
      .replace(/{RollNo}/g, `<strong>${roll}</strong>`)
      .replace(/{AdmissionNo}/g, `<strong>${admNo}</strong>`)
      .replace(/{AcademicYear}/g, `<strong>${ay}</strong>`)
      .replace(/{DOB}/g, `<strong>${dob}</strong>`)
      .replace(/{DOBWords}/g, `<strong>${dobWords}</strong>`)
      .replace(/{Gender}/g, `<strong>${gender}</strong>`)
      .replace(/{AdmissionDate}/g, `<strong>${admDate}</strong>`)
      .replace(/{CalculatedAge}/g, `<strong>${ageInfo.ageText}</strong>`)
      .replace(/{AgeYears}/g, `<strong>${ageInfo.years}</strong>`)
      .replace(/{AgeMonths}/g, `<strong>${ageInfo.months}</strong>`)
      .replace(/{AsOnDate}/g, `<strong>${asOnDate}</strong>`)
      .replace(/{ConductRating}/g, `<strong>Exemplary</strong>`)
      .replace(/{Purpose}/g, `<strong>${currentPurpose}</strong>`);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const sName = studentData?.studentName || studentData?.fullName || 'Student';
      printElement(printRef.current, `Bonafide_Certificate_${sName}`);
    }
  };

  // Settings
  const primaryColor = config?.primaryColor || '#1e3a8a';
  const borderColor = config?.borderColor || '#1e3a8a';
  const secondaryColor = config?.secondaryColor || '#eff6ff';
  const fontFamily = config?.fontFamily || 'Inter, sans-serif';
  const baseFontSize = config?.baseFontSize || 13;
  const schoolName = config?.headerSchoolNameCustom || studentData?.schoolName || 'DELHI PUBLIC SCHOOL';

  const hasLetterhead = Boolean(config?.letterheadBgImage && printWithLetterhead);
  const hideHeader = hasLetterhead && config?.hideHeaderOnLetterhead;
  const hideBorder = hasLetterhead && config?.hideBorderOnLetterhead;
  const topPadding = hasLetterhead ? config?.letterheadTopMargin || 140 : config?.pagePadding || 24;

  const renderBlockContent = (id) => {
    switch (id) {
      case 'header':
        if (hideHeader) return null;
        return (
          <div
            style={{
              textAlign: config?.headerAlignment || 'center',
              paddingBottom: `${config?.headerPaddingY || 12}px`,
              borderBottom: `3px double ${config?.headerDividerColor || primaryColor}`,
            }}
          >
            <div className="flex align-items-center justify-content-between">
              {config?.showSchoolLogo !== false && (
                <img
                  src={studentData?.schoolLogo || '/dvslogo1.jpeg'}
                  alt="Logo"
                  style={{
                    width: `${config?.logoSize || 64}px`,
                    height: `${config?.logoSize || 64}px`,
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
                    fontSize: `${config?.headerSchoolNameFontSize || 24}px`,
                    fontWeight: config?.headerSchoolNameFontWeight || '900',
                    color: config?.headerSchoolNameColor || primaryColor,
                    textTransform: config?.headerSchoolNameTransform || 'uppercase',
                    letterSpacing: config?.headerSchoolNameLetterSpacing || '1px',
                    lineHeight: 1.2,
                  }}
                >
                  {schoolName}
                </h2>

                <div
                  style={{
                    fontSize: `${config?.headerSubtitleFontSize || 12}px`,
                    fontWeight: config?.headerSubtitleFontWeight || '600',
                    color: config?.headerSubtitleColor || '#334155',
                    marginTop: '4px',
                  }}
                >
                  {config?.headerSubtitleCustom ||
                    studentData?.affiliationText ||
                    'Recognized by Dept. of Education • Affiliated to CBSE New Delhi'}
                </div>

                <div
                  style={{
                    fontSize: `${config?.headerAddressFontSize || 11}px`,
                    color: config?.headerAddressColor || '#475569',
                    marginTop: '3px',
                  }}
                >
                  {config?.headerAddressCustom ||
                    studentData?.schoolAddress ||
                    'Sector 4, Green Avenue, Civil Lines • Phone: 011-26171268'}
                </div>
              </div>

              {config?.showQrCode !== false && (
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
            className="flex justify-content-between align-items-center my-3 pb-2 border-bottom-1 surface-border"
            style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}
          >
            {config?.showRefNo !== false ? (
              <div>
                <span>Ref No: </span>
                <strong style={{ color: primaryColor }}>{refNo}</strong>
              </div>
            ) : (
              <div></div>
            )}

            {config?.showIssueDate !== false && (
              <div>
                <span>Date of Issue: </span>
                <strong style={{ color: '#0f172a' }}>{issueDate}</strong>
              </div>
            )}
          </div>
        );

      case 'title_badge':
        return (
          <div className="text-center my-3">
            <span
              style={{
                display: 'inline-block',
                backgroundColor: config?.titleBgColor || primaryColor,
                color: config?.titleTextColor || '#ffffff',
                padding: '6px 24px',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: `${config?.titleFontSize || 16}px`,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              {config?.certificateTitle || 'BONAFIDE CERTIFICATE'}
            </span>
            <div
              style={{
                marginTop: '6px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                color: '#475569',
                textDecoration: 'underline',
              }}
            >
              {config?.certificateSubtitle || 'TO WHOMSOEVER IT MAY CONCERN'}
            </div>
          </div>
        );

      case 'body_statement':
        return (
          <div
            style={{
              lineHeight: '1.9',
              textAlign: 'justify',
              fontSize: `${baseFontSize}px`,
              color: config?.bodyTextColor || '#1e293b',
            }}
            dangerouslySetInnerHTML={{
              __html: formatStatement(
                config?.bodyTemplateText ||
                'This is to certify that {StudentName}, Son / Daughter of Mr. {FatherName} and Mrs. {MotherName}, is a bonafide student of this institution studying in Class {Class} (Section {Section}), Roll No {RollNo}, Admission No {AdmissionNo}, for the Academic Session {AcademicYear}.'
              ),
            }}
          />
        );

      case 'photo':
        if (config?.showStudentPhoto === false) return null;
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `1.5px solid ${borderColor}`,
              padding: '2px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '4px',
            }}
          >
            <img
              src={studentData?.photoUrl || studentData?.photo || '/dvslogo1.jpeg'}
              alt="Student"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }}
              onError={(e) => {
                e.target.src = '/dvslogo1.jpeg';
              }}
            />
          </div>
        );

      case 'details_table':
        if (config?.showDetailsTable === false) return null;
        return (
          <div
            className="my-3 p-2 border-1 surface-border border-round"
            style={{ backgroundColor: secondaryColor }}
          >
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Admission No:</td>
                  <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>
                    {studentData?.admissionNo || 'N/A'}
                  </td>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569', width: '25%' }}>Roll No:</td>
                  <td style={{ padding: '4px', fontWeight: 700, width: '25%' }}>
                    {studentData?.rollNo || studentData?.currentEnrollment?.rollNo || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Class & Section:</td>
                  <td style={{ padding: '4px', fontWeight: 700 }}>
                    {studentData?.className || studentData?.currentEnrollment?.className || 'N/A'} -{' '}
                    {studentData?.sectionName || studentData?.currentEnrollment?.sectionName || 'A'}
                  </td>
                  <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Academic Session:</td>
                  <td style={{ padding: '4px', fontWeight: 700 }}>{studentData?.academicYear || '2025-2026'}</td>
                </tr>
                {config?.showBloodGroup !== false && (
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Blood Group:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{studentData?.bloodGroup || 'N/A'}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Gender:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{studentData?.gender || 'N/A'}</td>
                  </tr>
                )}
                {config?.showAadhaarNo !== false && studentData?.aadhaarNo && (
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Aadhaar No:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{studentData.aadhaarNo}</td>
                    <td style={{ padding: '4px', fontWeight: 600, color: '#475569' }}>Purpose:</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{currentPurpose}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case 'conduct_purpose':
        return (
          <div style={{ fontSize: `${baseFontSize}px`, lineHeight: '1.8', textAlign: 'justify', color: config?.bodyTextColor || '#1e293b' }}>
            {config?.dobSentenceText && (
              <div
                className="mb-2"
                dangerouslySetInnerHTML={{
                  __html: formatStatement(
                    config.dobSentenceText ||
                    'As per the official school records, his/her Date of Birth is {DOB} (in words: {DOBWords}).'
                  ),
                }}
              />
            )}
            {config?.conductSentenceText && (
              <div
                className="mb-2"
                dangerouslySetInnerHTML={{
                  __html: formatStatement(
                    config.conductSentenceText ||
                    'To the best of our knowledge, he/she bears a good moral character and conduct during his/her tenure in this institution.'
                  ),
                }}
              />
            )}
            {config?.purposeSentenceText && (
              <div
                dangerouslySetInnerHTML={{
                  __html: formatStatement(
                    config.purposeSentenceText ||
                    'This certificate is issued upon the request of the parent/guardian for {Purpose} purpose only.'
                  ),
                }}
              />
            )}
          </div>
        );

      case 'signatures':
        if (config?.showSignatures === false) return null;
        return (
          <div className="flex justify-content-between align-items-end w-full mt-6 pt-5">
            <div className="text-center" style={{ width: '150px' }}>
              <div style={{ height: '36px' }}></div>
              <div
                style={{
                  borderTop: `1px solid ${borderColor}`,
                  fontSize: '11px',
                  fontWeight: 700,
                  paddingTop: '4px',
                  color: '#334155',
                }}
              >
                {config?.signature1 || 'Class Teacher'}
              </div>
            </div>

            {config?.showSchoolSealBox !== false ? (
              <div
                className="text-center border-circle p-2 flex align-items-center justify-content-center"
                style={{
                  width: '74px',
                  height: '74px',
                  border: `1.5px dashed ${borderColor}`,
                  fontSize: '9px',
                  fontWeight: 700,
                  color: primaryColor,
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
                    borderTop: `1px solid ${borderColor}`,
                    fontSize: '11px',
                    fontWeight: 700,
                    paddingTop: '4px',
                    color: '#334155',
                  }}
                >
                  {config?.signature2 || 'Office Clerk'}
                </div>
              </div>
            )}

            <div className="text-center" style={{ width: '170px' }}>
              <div style={{ height: '36px' }}></div>
              <div
                style={{
                  borderTop: `1px solid ${borderColor}`,
                  fontSize: '11px',
                  fontWeight: 700,
                  paddingTop: '4px',
                  color: '#334155',
                }}
              >
                {config?.signature3 || 'Principal / Head of Institution'}
              </div>
            </div>
          </div>
        );

      case 'footer':
        if (!config?.footerText) return null;
        return (
          <div
            className="text-center mt-5 pt-3 border-top-1 surface-border"
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
    <Dialog
      visible={open}
      onHide={onClose}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-verified text-xl text-blue-600"></i>
          <span className="font-bold text-lg">Issue Dynamic Bonafide Certificate</span>
        </div>
      }
      style={{ width: '920px', maxWidth: '96vw' }}
      modal
      className="p-fluid"
      footer={
        <div className="flex justify-content-between align-items-center">
          <Button label="Close" icon="pi pi-times" severity="secondary" outlined onClick={onClose} />
          <Button label="Print Bonafide Certificate" icon="pi pi-print" severity="primary" onClick={handlePrint} />
        </div>
      }
    >
      {/* Purpose & Letterhead Configuration Toolbar */}
      <div className="surface-50 p-3 border-round mb-3 border-1 surface-border">
            {/* Row 1: Purpose & Dispatch Ref */}
            <div className="grid align-items-center mb-2">
              <div className="col-12 md:col-5">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Certificate Purpose / Reason:</label>
                <Dropdown
                  value={purpose}
                  options={PURPOSE_OPTIONS}
                  onChange={(e) => {
                    setPurpose(e.value);
                    setCustomPurpose('');
                  }}
                  placeholder="Select Purpose"
                  className="p-inputtext-sm w-full"
                />
              </div>

                <div className="col-12 md:col-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Custom Purpose (Optional):</label>
                  <InputText
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="e.g. Higher Studies / Passport"
                    className="p-inputtext-sm w-full"
                  />
                </div>

                  <div className="col-12 md:col-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Dispatch Ref No:</label>
                    <InputText
                      value={refNo}
                      onChange={(e) => setRefNo(e.target.value)}
                      className="p-inputtext-sm font-semibold w-full"
                    />
                  </div>
                </div>

                    {/* Row 2: Prominent Colour Options & Letterhead Switch */}
                    <div className="flex flex-wrap justify-content-between align-items-center pt-2 border-top-1 surface-border gap-2">
                      {/* Quick Colour Themes Bar */}
                      <div className="flex align-items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700 flex align-items-center gap-1">
                          <i className="pi pi-palette text-blue-600"></i> Certificate Colour:
                        </span>
                        {[
                          { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#eff6ff', border: '#1e3a8a', text: '#1e293b' },
                          { name: 'Academic Crimson', primary: '#881337', secondary: '#fff1f2', border: '#881337', text: '#1e293b' },
                          { name: 'Emerald Green', primary: '#064e3b', secondary: '#ecfdf5', border: '#064e3b', text: '#1e293b' },
                          { name: 'Regal Purple', primary: '#581c87', secondary: '#faf5ff', border: '#581c87', text: '#1e293b' },
                          { name: 'Slate Dark', primary: '#0f172a', secondary: '#f8fafc', border: '#334155', text: '#0f172a' },
                          { name: 'Amber Gold', primary: '#78350f', secondary: '#fffbeb', border: '#78350f', text: '#1e293b' },
                        ].map((theme, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                primaryColor: theme.primary,
                                titleBgColor: theme.primary,
                                borderColor: theme.border,
                                secondaryColor: theme.secondary,
                                bodyTextColor: theme.text,
                              }))
                            }
                            title={`Apply ${theme.name} Colour`}
                            className="w-2rem h-2rem border-circle border-2 cursor-pointer transition-transform hover:scale-110 flex align-items-center justify-content-center p-0 shadow-1"
                            style={{
                              backgroundColor: theme.primary,
                              borderColor: (config?.primaryColor || '#1e3a8a') === theme.primary ? '#000' : '#ffffff',
                            }}
                          >
                            {(config?.primaryColor || '#1e3a8a') === theme.primary && (
                              <i className="pi pi-check text-xs text-white"></i>
                            )}
                          </button>
                        ))}

                        <div className="flex align-items-center gap-2 ml-2 pl-2 border-left-1 surface-border">
                          <label className="text-xs text-slate-600 font-semibold">Custom Colour:</label>
                          <input
                            type="color"
                            value={config?.primaryColor || '#1e3a8a'}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                primaryColor: e.target.value,
                                titleBgColor: e.target.value,
                                borderColor: e.target.value,
                              }))
                            }
                            className="border-none p-0 cursor-pointer border-round shadow-1"
                            style={{ width: '30px', height: '30px' }}
                            title="Pick Custom Certificate Accent Colour"
                          />
                            <span className="text-xs font-mono font-bold text-slate-700">
                              {config?.primaryColor || '#1e3a8a'}
                            </span>
                        </div>
                      </div>

                      {/* Letterhead Switch */}
                      {config?.letterheadBgImage && (
                          <div className="flex align-items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Letterhead:</span>
                            <InputSwitch
                              checked={printWithLetterhead}
                              onChange={(e) => setPrintWithLetterhead(e.value)}
                            />
                            <span className="text-xs font-medium text-slate-600">
                              {printWithLetterhead ? 'Letterhead Active' : 'Plain Paper'}
                            </span>
                          </div>
          )}
                        </div>
      </div>

                    {/* Certificate Print Preview Container */}
                    <div className="surface-200 p-3 border-round overflow-auto" style={{ maxHeight: '72vh' }}>
                      <div
                        ref={printRef}
                        className="bg-white mx-auto shadow-2 relative"
                        style={{
                          maxWidth: `${config?.pageMaxWidth || 800}px`,
                          width: `${config?.pageMaxWidth || 800}px`,
                          minHeight: config?.layoutMode === 'drag' ? '1000px' : '850px',
                          height: config?.layoutMode === 'drag' ? '1000px' : 'auto',
                          padding: config?.layoutMode === 'drag' ? '0px' : `${config?.pagePadding || 24}px`,
                          paddingTop: `${topPadding}px`,
                          fontFamily: fontFamily,
                          fontSize: `${baseFontSize}px`,
                          border:
                            hideBorder
                              ? 'none'
                              : config?.borderStyle === 'Double'
                                ? `4px double ${borderColor}`
                                : config?.borderStyle === 'Solid'
                                  ? `2px solid ${borderColor}`
                                  : config?.borderStyle === 'Antique'
                                    ? `6px ridge ${borderColor}`
                                    : 'none',
                          color: '#1e293b',
                          backgroundImage: hasLetterhead ? `url(${config.letterheadBgImage})` : 'none',
                          backgroundSize: config?.letterheadFit || 'contain',
                          backgroundPosition: 'top center',
                          backgroundRepeat: 'no-repeat',
                          position: 'relative',
                        }}
                      >
                        {/* Watermark */}
                        {config?.showWatermark !== false && (
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
                            {config?.watermarkText || 'BONAFIDE'}
                          </div>
                        )}

                        {/* Render based on Layout Mode */}
                        {config?.layoutMode === 'drag' && config?.elements ? (
                          /* DRAGGABLE COORDINATE LAYOUT */
                          config.elements.map((el) => {
                            if (!el.visible) return null;
                            if (el.id === 'header' && hideHeader) return null;
                            return (
                              <div
                                key={el.id}
                                style={{
                                  position: 'absolute',
                                  left: `${el.x}px`,
                                  top: `${el.y}px`,
                                  width: `${el.width}px`,
                                  minHeight: `${el.height}px`,
                                  zIndex: 2,
                                }}
                              >
                                {renderBlockContent(el.id)}
                              </div>
                            );
                          })
                        ) : (
                          /* STANDARD FLOW LAYOUT */
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            {renderBlockContent('header')}
                            <div className="my-3">{renderBlockContent('ref_date')}</div>
                            <div className="my-3">{renderBlockContent('title_badge')}</div>

                            <div className="flex gap-4 my-3">
                              <div className="flex-1">{renderBlockContent('body_statement')}</div>
                              {config?.showStudentPhoto !== false && (
                                <div
                                  style={{
                                    width: `${config?.photoWidth || 80}px`,
                                    height: `${config?.photoHeight || 96}px`,
                                    flexShrink: 0,
                                  }}
                                >
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
                    </div>
                  </Dialog>
                  );
};

                  export default BonafideCertificateModal;
