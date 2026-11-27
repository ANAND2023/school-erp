import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import apiClient from '../../../api/client';
import { printElement } from '../../../utils/printUtils';
import { useThemeStore, shadeColor } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';

export const AwrStudentFolioModal = ({ open, onClose, student, config: passedConfig }) => {
  const printRef = useRef(null);
  const { currentColorHex, isDarkMode } = useThemeStore();
  const themeColor = currentColorHex || '#0f766e';
  const [config, setConfig] = useState(passedConfig || null);
  const [printWithLetterhead, setPrintWithLetterhead] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (passedConfig) {
      setConfig(passedConfig);
      if (passedConfig.useLetterhead !== undefined) {
        setPrintWithLetterhead(passedConfig.useLetterhead);
      }
    } else {
      apiClient
        .get('/students/awr-config')
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setConfig(res.data.data);
            if (res.data.data.useLetterhead !== undefined) {
              setPrintWithLetterhead(res.data.data.useLetterhead);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load AWR config:', err);
        });
    }
  }, [open, passedConfig]);

  if (!student) return null;

  const user = useAuthStore((state) => state.user);
  const schoolLogo = currentConfig.schoolLogoUrl || user?.schoolLogoUrl || '/dvslogo1.jpeg';

  const currentConfig = config || {
    primaryColor: '#065f46',
    secondaryColor: '#ecfdf5',
    accentColor: '#064e3b',
    borderColor: '#065f46',
    fontFamily: 'Inter, sans-serif',
    baseFontSize: 11,
    borderStyle: 'Solid',
    folioTitle: 'STUDENT A.W.R. FOLIO EXTRACT',
    reportSubtitle: 'Statutory General Register maintained under Education Act & Board Rules',
    refPrefix: 'DPS/AWR',
    showWatermark: true,
    watermarkText: 'OFFICIAL AWR',
    showQrCode: true,
    showSchoolSealBox: true,
    showSchoolLogo: true,
    signature1: 'Prepared By / Record Clerk',
    signature2: 'Checked By / Section In-Charge',
    signature3: 'Principal / Head of Institution',
    footerText:
      'Certified that this document is an authentic extract from the Admission and Withdrawal Register maintained by the institution.',
  };

  const handlePrint = () => {
    if (printRef.current) {
      printElement(printRef.current, {
        title: `AWR_Folio_${student.admissionNo}`,
        pageSize: 'A4',
        orientation: 'portrait',
        margin: '8mm',
        padding: '8mm',
      });
    }
  };

  return (
    <Dialog
      visible={open}
      onHide={onClose}
      header={
        <div className="flex align-items-center justify-content-between w-full pr-4">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-id-card text-xl" style={{ color: themeColor }}></i>
            <div>
              <div className="font-bold text-slate-800 text-base">
                AWR Folio Extract — {student.studentName}
              </div>
              <div className="text-xs text-slate-500">
                Scholar No: {student.admissionNo} • Class: {student.currentClass || student.classAdmitted}
              </div>
            </div>
          </div>
          <div className="flex align-items-center gap-2">
            {currentConfig.letterheadBgImage && (
              <div className="flex align-items-center gap-1 bg-slate-100 px-2 py-1 border-round text-xs">
                <span>Letterhead:</span>
                <InputSwitch
                  checked={printWithLetterhead}
                  onChange={(e) => setPrintWithLetterhead(e.value)}
                  className="p-inputswitch-sm"
                />
              </div>
            )}
            <Button
              label="Print Folio"
              icon="pi pi-print"
              size="small"
              onClick={handlePrint}
              style={{
                backgroundColor: themeColor,
                borderColor: themeColor,
                color: '#ffffff',
                fontWeight: 700,
              }}
            />
          </div>
        </div>
      }
      style={{ width: '850px', maxWidth: '96vw' }}
      modal
      className="p-fluid"
    >
      <div className="p-3 surface-100 border-round overflow-x-auto">
        {/* Printable Canvas */}
        <div
          ref={printRef}
          id="awr-student-folio-print-area"
          className="bg-white mx-auto shadow-2 relative awr-folio-print"
          style={{
            width: '740px',
            minHeight: '850px',
            padding: `${currentConfig.pagePadding || 16}px`,
            paddingTop:
              printWithLetterhead && currentConfig.letterheadBgImage && currentConfig.hideHeaderOnLetterhead
                ? `${currentConfig.letterheadTopMargin || 120}px`
                : `${currentConfig.pagePadding || 16}px`,
            fontFamily: currentConfig.fontFamily,
            fontSize: `${currentConfig.baseFontSize || 11}px`,
            color: '#1e293b',
            border:
              printWithLetterhead && currentConfig.letterheadBgImage && currentConfig.hideBorderOnLetterhead
                ? 'none'
                : `2px solid ${currentConfig.borderColor || '#065f46'}`,
            backgroundImage:
              printWithLetterhead && currentConfig.letterheadBgImage
                ? `url(${currentConfig.letterheadBgImage})`
                : 'none',
            backgroundSize: currentConfig.letterheadFit || 'contain',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
          }}
        >
          {/* Watermark */}
          {currentConfig.showWatermark && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                fontSize: '56px',
                fontWeight: 900,
                color: 'rgba(0,0,0,0.035)',
                pointerEvents: 'none',
                letterSpacing: '6px',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {currentConfig.watermarkText || 'OFFICIAL AWR'}
            </div>
          )}

          {/* Header Section */}
          {(!printWithLetterhead || !currentConfig.letterheadBgImage || !currentConfig.hideHeaderOnLetterhead) && (
            <div
              className="text-center pb-2 mb-2"
              style={{
                borderBottom: `2px double ${currentConfig.borderColor || '#065f46'}`,
              }}
            >
              <div className="flex align-items-center justify-content-between">
                {currentConfig.showSchoolLogo && (
                  <img
                    src={schoolLogo}
                    alt="Logo"
                    style={{
                      width: `${currentConfig.logoSize || 54}px`,
                      height: `${currentConfig.logoSize || 54}px`,
                      objectFit: 'contain',
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}

                <div className="flex-1 text-center px-2">
                  <h2
                    style={{
                      margin: 0,
                      fontSize: `${currentConfig.headerSchoolNameFontSize || 20}px`,
                      fontWeight: currentConfig.headerSchoolNameFontWeight || '900',
                      color: currentConfig.headerSchoolNameColor || currentConfig.primaryColor || '#065f46',
                      textTransform: currentConfig.headerSchoolNameTransform || 'uppercase',
                      letterSpacing: currentConfig.headerSchoolNameLetterSpacing || '1px',
                    }}
                  >
                    {currentConfig.headerSchoolNameCustom || 'DELHI PUBLIC SCHOOL JAIPUR'}
                  </h2>

                  <div
                    style={{
                      fontSize: `${currentConfig.headerSubtitleFontSize || 11}px`,
                      fontWeight: 600,
                      color: currentConfig.headerSubtitleColor || '#334155',
                      marginTop: '2px',
                    }}
                  >
                    {currentConfig.headerSubtitleCustom ||
                      'Affiliated to CBSE, New Delhi • Affil No: 1730245 • School Code: 10589 • U-DISE: 081203001'}
                  </div>

                  <div
                    style={{
                      fontSize: `${currentConfig.headerAddressFontSize || 10}px`,
                      color: currentConfig.headerAddressColor || '#475569',
                      marginTop: '2px',
                    }}
                  >
                    {currentConfig.headerAddressCustom ||
                      'Sector 4, Green Avenue, Vidyadhar Nagar, Jaipur - 302023 (Rajasthan)'}
                  </div>
                </div>

                {currentConfig.showQrCode && (
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
              backgroundColor: currentConfig.titleBgColor || currentConfig.primaryColor || '#065f46',
              color: currentConfig.titleTextColor || '#ffffff',
            }}
          >
            <div style={{ fontSize: `${currentConfig.titleFontSize || 13}px`, fontWeight: 800, letterSpacing: '1px' }}>
              {currentConfig.folioTitle || 'STUDENT A.W.R. FOLIO EXTRACT'}
            </div>
            <div style={{ fontSize: '9px', opacity: 0.9 }}>
              {currentConfig.reportSubtitle || 'Statutory General Register maintained under Education Act & Board Rules'}
            </div>
          </div>

          {/* Meta Bar: Folio No & Issue Date */}
          <div className="flex justify-content-between text-xs text-slate-600 mb-3 pb-1 border-bottom-1 surface-border">
            <div>
              <strong>AWR Folio No: </strong>
              <span style={{ color: currentConfig.primaryColor || '#065f46', fontWeight: 700 }}>
                {currentConfig.refPrefix || 'DPS/AWR'}/FOLIO/{student.admissionNo}
              </span>
            </div>
            <div>
              <strong>Academic Session: </strong> {student.academicYear || 'Current Session'}
            </div>
            <div>
              <strong>Date of Extract: </strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>

          {/* Student Photo & Core Grid */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <table className="w-full border-collapse text-xs" style={{ border: '1px solid #cbd5e1' }}>
                <tbody>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <td className="p-1.5 font-bold text-slate-600" style={{ width: '38%' }}>1. Scholar / Admission No:</td>
                    <td className="p-1.5 font-bold" style={{ color: currentConfig.primaryColor || '#065f46' }}>
                      {student.admissionNo}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td className="p-1.5 font-bold text-slate-600">2. Date of Admission:</td>
                    <td className="p-1.5 font-semibold">{student.admissionDateFormatted || student.admissionDate}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <td className="p-1.5 font-bold text-slate-600">3. Student's Full Name:</td>
                    <td className="p-1.5 font-bold uppercase">{student.studentName}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td className="p-1.5 font-bold text-slate-600">4. Gender:</td>
                    <td className="p-1.5">{student.gender || 'Male'}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <td className="p-1.5 font-bold text-slate-600">5. Date of Birth (Figures):</td>
                    <td className="p-1.5 font-bold">{student.dobFormatted}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td className="p-1.5 font-bold text-slate-600">6. Date of Birth (In Words):</td>
                    <td className="p-1.5 italic text-slate-800">{student.dobWords}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <td className="p-1.5 font-bold text-slate-600">7. Place of Birth:</td>
                    <td className="p-1.5">{student.placeOfBirth || student.city || 'As per record'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Student Photo Card */}
            <div
              className="text-center p-2 border-1 surface-border border-round bg-white flex flex-column align-items-center justify-content-center"
              style={{ width: '110px', height: '145px', border: '1px solid #cbd5e1' }}
            >
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.studentName}
                  style={{ width: '92px', height: '115px', objectFit: 'cover', borderRadius: '4px' }}
                />
              ) : (
                <div className="flex flex-column align-items-center justify-content-center h-full">
                  <i className="pi pi-user text-4xl text-slate-400 mb-1"></i>
                  <span style={{ fontSize: '8px', color: '#64748b' }}>STUDENT PHOTO</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Family & Demographics */}
          <div className="mb-3">
            <div
              className="px-2 py-1 font-bold text-xs border-round-top"
              style={{ backgroundColor: currentConfig.secondaryColor || '#ecfdf5', color: currentConfig.accentColor || '#064e3b' }}
            >
              Parentage, Community & Identity Particulars
            </div>
            <table className="w-full border-collapse text-xs" style={{ border: '1px solid #cbd5e1' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="p-1.5 font-bold text-slate-600" style={{ width: '30%' }}>Father's Full Name:</td>
                  <td className="p-1.5 font-semibold" style={{ width: '35%' }}>{student.fatherName || '-'}</td>
                  <td className="p-1.5 font-bold text-slate-600" style={{ width: '15%' }}>Occupation:</td>
                  <td className="p-1.5">{student.fatherOccupation || 'Private / Business'}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <td className="p-1.5 font-bold text-slate-600">Mother's Full Name:</td>
                  <td className="p-1.5 font-semibold">{student.motherName || '-'}</td>
                  <td className="p-1.5 font-bold text-slate-600">Occupation:</td>
                  <td className="p-1.5">{student.motherOccupation || 'Homemaker'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="p-1.5 font-bold text-slate-600">Category & Religion:</td>
                  <td className="p-1.5">{student.categoryName || 'General'} • {student.religionName || 'Hindu'}</td>
                  <td className="p-1.5 font-bold text-slate-600">Nationality:</td>
                  <td className="p-1.5">{student.nationality || 'Indian'}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <td className="p-1.5 font-bold text-slate-600">Aadhaar / ID No:</td>
                  <td className="p-1.5 font-mono">{student.aadhaarNo || 'Verified'}</td>
                  <td className="p-1.5 font-bold text-slate-600">Blood Group:</td>
                  <td className="p-1.5">{student.bloodGroup || 'B+'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="p-1.5 font-bold text-slate-600">Residential Address:</td>
                  <td colSpan={3} className="p-1.5">
                    {student.address ? `${student.address}, ${student.city || ''} ${student.state || ''} ${student.pincode || ''}` : 'As recorded in admission form'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Academic Progression & Withdrawal */}
          <div className="mb-3">
            <div
              className="px-2 py-1 font-bold text-xs border-round-top"
              style={{ backgroundColor: currentConfig.secondaryColor || '#ecfdf5', color: currentConfig.accentColor || '#064e3b' }}
            >
              Academic Enrollment, Progress & Departure Details
            </div>
            <table className="w-full border-collapse text-xs" style={{ border: '1px solid #cbd5e1' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td className="p-1.5 font-bold text-slate-600" style={{ width: '30%' }}>Class to which Admitted:</td>
                  <td className="p-1.5 font-semibold" style={{ width: '35%' }}>{student.classAdmitted || '-'}</td>
                  <td className="p-1.5 font-bold text-slate-600" style={{ width: '15%' }}>Current Class:</td>
                  <td className="p-1.5 font-bold" style={{ color: currentConfig.primaryColor || '#065f46' }}>
                    {student.currentClass} {student.currentSection ? `(${student.currentSection})` : ''}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <td className="p-1.5 font-bold text-slate-600">Academic Status on Register:</td>
                  <td className="p-1.5">
                    <span
                      className={`px-2 py-0.5 border-round font-bold ${
                        student.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {student.status === 'Active' ? 'Active / On Roll' : 'Withdrawn / Left'}
                    </span>
                  </td>
                  <td className="p-1.5 font-bold text-slate-600">Conduct:</td>
                  <td className="p-1.5 font-semibold">{student.conduct || 'Good'}</td>
                </tr>
                {student.status !== 'Active' && (
                  <>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td className="p-1.5 font-bold text-slate-600">Date of Withdrawal / Leaving:</td>
                      <td className="p-1.5 font-semibold text-rose-700">{student.withdrawalDateFormatted || '-'}</td>
                      <td className="p-1.5 font-bold text-slate-600">TC Number:</td>
                      <td className="p-1.5 font-mono font-bold">{student.tcNumber || '-'}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <td className="p-1.5 font-bold text-slate-600">Reason for Leaving:</td>
                      <td colSpan={3} className="p-1.5 italic text-slate-700">
                        {student.reasonForLeaving || 'Course completed / TC issued upon parent request'}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 4: Signatures & Seal */}
          {currentConfig.showSignatures && (
            <div className="flex justify-content-between align-items-end pt-3 mt-4 border-top-1 surface-border">
              <div className="text-center" style={{ width: '180px' }}>
                <div style={{ height: '36px' }}></div>
                <div
                  style={{
                    borderTop: `1px solid ${currentConfig.borderColor || '#065f46'}`,
                    fontSize: '10px',
                    fontWeight: 700,
                    paddingTop: '4px',
                    color: '#334155',
                  }}
                >
                  {currentConfig.signature1 || 'Prepared By / Record Clerk'}
                </div>
              </div>

              {currentConfig.showSchoolSealBox ? (
                <div
                  className="text-center border-circle p-2 flex align-items-center justify-content-center"
                  style={{
                    width: '74px',
                    height: '74px',
                    border: `1.5px dashed ${currentConfig.borderColor || '#065f46'}`,
                    fontSize: '8.5px',
                    fontWeight: 700,
                    color: currentConfig.primaryColor || '#065f46',
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
                  <div style={{ height: '36px' }}></div>
                  <div
                    style={{
                      borderTop: `1px solid ${currentConfig.borderColor || '#065f46'}`,
                      fontSize: '10px',
                      fontWeight: 700,
                      paddingTop: '4px',
                      color: '#334155',
                    }}
                  >
                    {currentConfig.signature2 || 'Checked By / Section In-Charge'}
                  </div>
                </div>
              )}

              <div className="text-center" style={{ width: '180px' }}>
                <div style={{ height: '36px' }}></div>
                <div
                  style={{
                    borderTop: `1px solid ${currentConfig.borderColor || '#065f46'}`,
                    fontSize: '10px',
                    fontWeight: 700,
                    paddingTop: '4px',
                    color: '#334155',
                  }}
                >
                  {currentConfig.signature3 || 'Principal / Head of Institution'}
                </div>
              </div>
            </div>
          )}

          {/* Footer Statement */}
          {currentConfig.footerText && (
            <div
              className="text-center pt-2 mt-3 border-top-1 surface-border"
              style={{ fontSize: '8.5px', color: '#94a3b8', fontStyle: 'italic' }}
            >
              {currentConfig.footerText}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default AwrStudentFolioModal;
