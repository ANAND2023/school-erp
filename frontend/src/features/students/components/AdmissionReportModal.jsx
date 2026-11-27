import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Divider,
  Grid,
  CircularProgress,
  IconButton,
  Alert,
  Avatar,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  WhatsApp as WhatsAppIcon,
  QrCode2 as QrCodeIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import apiClient from '../../../api/client';
import { studentApi } from '../api';
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';
import { printWithTitle } from '../../../utils/printUtils';

let cachedAdmissionConfig = null;

// Helper to convert date to words
const dateToWords = (dateStr) => {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  if (!d.isValid()) return '';

  const dayNames = [
    '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
    'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
    'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth', 'Thirty-First'
  ];

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n) => {
    if (n < 20) return ones[n];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? ' ' + ones[digit] : '');
  };

  const dayWord = dayNames[d.date()] || String(d.date());
  const monthWord = d.format('MMMM');
  const year = d.year();

  let yearWord = '';
  if (year >= 2000 && year < 2100) {
    const rem = year - 2000;
    yearWord = 'Two Thousand' + (rem > 0 ? ' ' + numToWords(rem) : '');
  } else if (year >= 1900 && year < 2000) {
    const century = Math.floor(year / 100);
    const rem = year % 100;
    yearWord = numToWords(century) + ' Hundred' + (rem > 0 ? ' ' + numToWords(rem) : '');
  } else {
    yearWord = String(year);
  }

  return `${dayWord} ${monthWord} ${yearWord}`;
};

const DEFAULT_ADMISSION_CONFIG = {
  primaryColor: '#065f46',
  secondaryColor: '#ecfdf5',
  accentColor: '#064e3b',
  borderColor: '#065f46',
  fontFamily: 'Inter, "Segoe UI", Roboto, sans-serif',
  baseFontSize: 12,
  headerLayout: 'Classic',
  borderStyle: 'Solid',
  logoSize: 52,
  photoWidth: 78,
  photoHeight: 94,
  headerSchoolNameCustom: '',
  headerSchoolNameFontSize: 21,
  headerSchoolNameColor: '#065f46',
  headerSchoolNameFontWeight: '900',
  headerSchoolNameTransform: 'uppercase',
  headerSchoolNameLetterSpacing: '0.8px',
  headerSubtitleCustom: '',
  headerSubtitleFontSize: 11.5,
  headerSubtitleColor: '#334155',
  headerAddressCustom: '',
  headerAddressFontSize: 10.5,
  headerAddressColor: '#475569',
  headerAlignment: 'center',
  headerDividerStyle: 'Double',
  headerDividerColor: '#065f46',
  slipTitle: 'OFFICIAL STUDENT ADMISSION & REGISTRATION ACKNOWLEDGEMENT',
  slipSubtitle: 'Academic Enrollment & Verification Document',
  slipTitleBgColor: '#065f46',
  slipTitleTextColor: '#ffffff',
  slipTitleFontSize: 12,
  watermarkText: 'CONFIRMED ADMISSION',
  showWatermark: false,
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
  signature1: 'Parent / Guardian Signature',
  signature2: 'Admission Counselor / Clerk',
  signature3: 'Principal / Head of Institution',
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
};

export const AdmissionReportModal = ({
  open,
  onClose,
  studentId,
  studentData: initialStudentData,
  isNewlyAdmitted = false,
  onAdmitAnother,
  onNavigateDirectory,
  slipConfig = null,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(initialStudentData || null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [activeConfig, setActiveConfig] = useState(slipConfig || cachedAdmissionConfig || DEFAULT_ADMISSION_CONFIG);

  useEffect(() => {
    if (slipConfig) {
      setActiveConfig(slipConfig);
      return;
    }
    if (cachedAdmissionConfig) {
      setActiveConfig(cachedAdmissionConfig);
      return;
    }

    let isMounted = true;
    apiClient
      .get('/students/admission-slip-config')
      .then((res) => {
        if (isMounted && res.data?.success && res.data.data) {
          cachedAdmissionConfig = res.data.data;
          setActiveConfig(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load dynamic admission slip config:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [slipConfig]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const targetId = studentId || initialStudentData?.id;
      const needsFullDetails =
        targetId &&
        (!initialStudentData ||
          !initialStudentData.guardians ||
          !initialStudentData.currentEnrollment ||
          (!initialStudentData.fatherPhotoUrl && !initialStudentData.documents));

      if (needsFullDetails) {
        try {
          setLoading(true);
          const res = await studentApi.getStudentDetail(targetId);
          if (isMounted && res.data?.success) {
            setStudent(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load student detail for admission report:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else if (initialStudentData) {
        setStudent(initialStudentData);
      }

      try {
        const bRes = await branchApi.getBranches();
        if (isMounted && bRes.data?.success && Array.isArray(bRes.data.data)) {
          const matchedBranch = bRes.data.data.find((b) => b.id === (user?.branchId || 1)) || bRes.data.data[0];
          setBranchInfo(matchedBranch);
        }
      } catch (err) {
        console.error('Failed to load branch info:', err);
      }
    };

    if (open) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [open, studentId, initialStudentData, user?.branchId]);

  if (!open) return null;

  // Derive display values
  const studentFullName = student?.fullName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || '—';
  const admissionNo = student?.admissionNo || 'Pending Confirmation';
  const admissionDate = student?.admissionDate ? dayjs(student.admissionDate).format('DD MMM YYYY') : dayjs().format('DD MMM YYYY');
  const dobFigures = student?.dateOfBirth ? dayjs(student.dateOfBirth).format('DD-MM-YYYY') : '—';
  const dobWords = student?.dateOfBirth ? dateToWords(student.dateOfBirth) : '—';

  const className = student?.currentEnrollment?.className || student?.className || '—';
  const sectionName = student?.currentEnrollment?.sectionName || student?.sectionName || '—';
  const rollNo = student?.currentEnrollment?.rollNo || student?.rollNo || null;
  const academicYear = student?.currentEnrollment?.academicYearName || '2026-2027';

  const guardians = student?.guardians || [];
  const father = guardians.find((g) => g.relation?.toLowerCase() === 'father') || null;
  const mother = guardians.find((g) => g.relation?.toLowerCase() === 'mother') || null;
  const primaryGuardian = guardians.find((g) => g.isPrimary) || guardians[0] || null;

  const schoolName = activeConfig.headerSchoolNameCustom || branchInfo?.schoolName || user?.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branchInfo?.name ? `${branchInfo.name} Branch` : (user?.branchName || 'Main Campus');
  const branchAddress = activeConfig.headerAddressCustom || branchInfo?.address || user?.schoolAddress || 'Sector 12, RK Puram, New Delhi - 110022';
  const rawAdmissionPhones = [branchInfo?.phone || user?.schoolPhone, branchInfo?.alternatePhone || user?.schoolAlternatePhone].filter(Boolean);
  const branchPhone = rawAdmissionPhones.length > 0 ? rawAdmissionPhones.join(', ') : '+91 11 2617 8900';
  const branchEmail = branchInfo?.email || user?.schoolEmail || 'admissions@dpsdelhi.edu.in';
  const affiliationNo = branchInfo?.affiliationNo || branchInfo?.affiliationNumber || user?.affiliationNo || '2130892';
  const admissionLogoUrl = branchInfo?.logoUrl || user?.schoolLogoUrl;

  // 4 Photos
  const studentPhoto = student?.photoUrl || null;
  const fatherPhoto =
    student?.fatherPhotoUrl ||
    student?.documents?.find((d) => d.title?.toLowerCase().includes('father'))?.filePath ||
    null;
  const motherPhoto =
    student?.motherPhotoUrl ||
    student?.documents?.find((d) => d.title?.toLowerCase().includes('mother'))?.filePath ||
    null;
  const guardianPhoto =
    student?.guardianPhotoUrl ||
    student?.documents?.find((d) => d.title?.toLowerCase().includes('guardian'))?.filePath ||
    null;

  const photoList = [
    { label: "Student's Photo", url: studentPhoto, show: activeConfig.showStudentPhotoBox },
    { label: "Father's Photo", url: fatherPhoto, show: activeConfig.showFatherPhotoBox },
    { label: "Mother's Photo", url: motherPhoto, show: activeConfig.showMotherPhotoBox },
    { label: "Guardian's Photo", url: guardianPhoto, show: activeConfig.showGuardianPhotoBox },
  ].filter((p) => p.show !== false);

  // Verified Document Checklist based on uploaded documents & config
  const docs = student?.documents || [];
  const docTitles = docs.map((d) => (d.title || d.documentTypeName || '').toLowerCase());

  const configuredDocs = Array.isArray(activeConfig.documentsRequired) && activeConfig.documentsRequired.length > 0
    ? activeConfig.documentsRequired
    : DEFAULT_ADMISSION_CONFIG.documentsRequired;

  const checklistItems = configuredDocs.map((docText, idx) => {
    const lower = docText.toLowerCase();
    const isSubmitted =
      (lower.includes('birth') || lower.includes('dob')) && docTitles.some((t) => t.includes('birth') || t.includes('dob')) ||
      (lower.includes('aadhaar') || lower.includes('aadhar')) && docTitles.some((t) => t.includes('aadhaar') || t.includes('aadhar')) ||
      (lower.includes('transfer') || lower.includes('tc')) && docTitles.some((t) => t.includes('transfer') || t.includes('tc')) ||
      (lower.includes('marksheet') || lower.includes('report') || lower.includes('result')) && docTitles.some((t) => t.includes('marksheet') || t.includes('report') || t.includes('result')) ||
      lower.includes('photo') && Boolean(studentPhoto) ||
      (lower.includes('address') || lower.includes('domicile')) && docTitles.some((t) => t.includes('address') || t.includes('domicile') || t.includes('voter') || t.includes('electricity')) ||
      docTitles.some((t) => lower.split(' ').some((word) => word.length > 3 && t.includes(word)));

    return {
      id: idx + 1,
      name: docText,
      isSubmitted: Boolean(isSubmitted),
    };
  });

  const isVisible = (key) => {
    const sec = activeConfig.sections?.find((s) => s.key === key);
    return sec ? sec.visible : true;
  };

  const primaryCol = activeConfig.primaryColor || '#065f46';
  const secondaryCol = activeConfig.secondaryColor || '#ecfdf5';

  const handlePrint = () => {
    const sName = studentFullName && studentFullName !== '—' ? studentFullName : 'Student';
    const aNo = admissionNo && admissionNo !== 'Pending Confirmation' ? `_${admissionNo}` : '';
    printWithTitle(`Admission_Report_${sName}${aNo}`);
  };

  return (
    <>
      {/* FULL A4 PAGE PRINT CSS */}
      <style>
        {`
          @page {
            size: ${activeConfig.pageSize || 'A4'} ${activeConfig.pageOrientation || 'portrait'};
            margin: ${activeConfig.pageMargin || '6mm'};
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
            #root,
            body > *:not(.MuiDialog-root):not(#printable-admission-report) {
              display: none !important;
            }
            .MuiBackdrop-root {
              display: none !important;
            }
            .MuiDialog-root {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
              z-index: auto !important;
            }
            .MuiDialog-container {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            .MuiPaper-root.MuiDialog-paper,
            .MuiPaper-root,
            .MuiDialogContent-root {
              position: static !important;
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              overflow: visible !important;
              background: #ffffff !important;
            }
            .MuiDialogTitle-root,
            .MuiDialogActions-root,
            .no-print {
              display: none !important;
            }
            #printable-admission-report {
              display: flex !important;
              flex-direction: column !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              margin: 0 auto !important;
              padding: 12px 16px !important;
              border: 2px solid ${primaryCol} !important;
              border-radius: 4px !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              overflow: visible !important;
            }
            #printable-admission-report * {
              visibility: visible !important;
            }
          }
        `}
      </style>

      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{
          '@media print': {
            '& .MuiDialogTitle-root': { display: 'none !important' },
            '& .MuiDialogActions-root': { display: 'none !important' },
          },
        }}
      >
        <DialogTitle
          className="no-print"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.2,
            px: 3,
            bgcolor: isNewlyAdmitted ? '#f0fdf4' : 'inherit',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isNewlyAdmitted ? (
              <CheckIcon sx={{ color: 'success.main', fontSize: 28 }} />
            ) : (
              <SchoolIcon sx={{ color: primaryCol, fontSize: 28 }} />
            )}
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                {isNewlyAdmitted ? 'Admission Successfully Registered!' : 'Official Admission Slip & Report'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Standard Pupil Enrollment Record & Acknowledgement Slip (Full A4 Page Format)
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc' }}>
          {isNewlyAdmitted && (
            <Alert severity="success" sx={{ mb: 2 }} className="no-print" icon={<CheckIcon />}>
              <Typography variant="subtitle2" fontWeight={700}>
                Student enrolled successfully with Admission Number: <strong>{admissionNo}</strong>
              </Typography>
              <Typography variant="caption" display="block">
                Please print this official admission report for school records and parent acknowledgement.
              </Typography>
            </Alert>
          )}

          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Generating Admission Report...
              </Typography>
            </Box>
          ) : (
            <Box
              id="printable-admission-report"
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: '#ffffff',
                border: `2px solid ${primaryCol}`,
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                fontFamily: activeConfig.fontFamily || 'Inter, sans-serif',
                color: '#1e293b',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '800px',
                position: 'relative',
              }}
            >
              {/* Background Watermark */}
              {activeConfig.showWatermark && (
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
                  {activeConfig.watermarkText || 'CONFIRMED ADMISSION'}
                </div>
              )}

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* 1. Header */}
                {isVisible('header') && (
                  <Box sx={{ textAlign: activeConfig.headerAlignment === 'left' ? 'left' : 'center', pb: 0.8, borderBottom: `2.5px double ${primaryCol}` }}>
                    <Stack direction="row" spacing={2} justifyContent={activeConfig.headerAlignment === 'left' ? 'flex-start' : 'center'} alignItems="center">
                      {activeConfig.showSchoolLogo && (
                        admissionLogoUrl ? (
                          <Box
                            component="img"
                            src={admissionLogoUrl}
                            alt="Logo"
                            sx={{ width: activeConfig.logoSize || 52, height: activeConfig.logoSize || 52, objectFit: 'contain', borderRadius: 1 }}
                          />
                        ) : (
                          <SchoolIcon sx={{ fontSize: 36, color: primaryCol }} />
                        )
                      )}
                      <Box>
                        <Typography
                          variant="h5"
                          fontWeight={activeConfig.headerSchoolNameFontWeight || 900}
                          sx={{
                            color: activeConfig.headerSchoolNameColor || primaryCol,
                            letterSpacing: activeConfig.headerSchoolNameLetterSpacing || '0.8px',
                            fontSize: `${activeConfig.headerSchoolNameFontSize || 21}px`,
                            textTransform: activeConfig.headerSchoolNameTransform || 'uppercase',
                            lineHeight: 1.15,
                          }}
                        >
                          {schoolName}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: `${activeConfig.headerSubtitleFontSize || 11.5}px` }}>
                          {activeConfig.headerSubtitleCustom || `${branchName} • Affiliated to CBSE, New Delhi (Affiliation No: ${affiliationNo})`}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.2 }}>
                      Address: {branchAddress} | Phone: {branchPhone} | Email: {branchEmail}
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.6,
                        display: 'inline-block',
                        px: 2.5,
                        py: 0.25,
                        bgcolor: primaryCol,
                        color: '#ffffff',
                        borderRadius: 1,
                        fontWeight: 700,
                        letterSpacing: 0.8,
                        fontSize: '0.76rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      {activeConfig.slipTitle || 'Official Student Admission & Registration Acknowledgement'}
                    </Box>
                  </Box>
                )}

                {/* 2. Meta Bar */}
                {isVisible('meta_bar') && (
                  <Box sx={{ my: 0.8, p: 0.8, bgcolor: secondaryCol, borderRadius: 1, border: `1.5px solid ${primaryCol}` }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem', display: 'block', fontWeight: 600 }}>
                          ADMISSION NUMBER
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ color: primaryCol, fontSize: '0.92rem', lineHeight: 1.2 }}>
                          {admissionNo}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem', display: 'block', fontWeight: 600 }}>
                          DATE OF ADMISSION
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.84rem' }}>
                          {admissionDate}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem', display: 'block', fontWeight: 600 }}>
                          CLASS & SECTION
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.84rem' }}>
                          {className} - {sectionName}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem', display: 'block', fontWeight: 600 }}>
                          SESSION / ROLL NO
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.84rem' }}>
                          {academicYear} {rollNo ? `(Roll #${rollNo})` : '(Roll: Pending)'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* 3. Pupil Personal Information */}
                {isVisible('student_profile') && (
                  <Box sx={{ mb: 0.8 }}>
                    <Box
                      sx={{
                        bgcolor: secondaryCol,
                        px: 1,
                        py: 0.25,
                        borderRadius: 0.6,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        color: primaryCol,
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        mb: 0.6,
                      }}
                    >
                      1. Pupil Personal Information
                    </Box>

                    <Grid container spacing={0.8} rowSpacing={0.6}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Full Name of Student:</Typography>
                        <Typography variant="body2" fontWeight={800} sx={{ textTransform: 'uppercase', fontSize: '0.84rem', lineHeight: 1.2 }}>
                          {studentFullName}
                        </Typography>
                      </Grid>
                      <Grid item xs={2}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Gender:</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem' }}>
                          {student?.gender || '—'}
                        </Typography>
                      </Grid>
                      {activeConfig.showBloodGroup && (
                        <Grid item xs={2}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Blood Group:</Typography>
                          <Typography variant="body2" fontWeight={800} color="error.main" sx={{ fontSize: '0.78rem' }}>
                            {student?.bloodGroup || '—'}
                          </Typography>
                        </Grid>
                      )}
                      {activeConfig.showAadhaarNo && (
                        <Grid item xs={activeConfig.showBloodGroup ? 4 : 6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Aadhaar No:</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem' }}>
                            {student?.aadhaarNo || '—'}
                          </Typography>
                        </Grid>
                      )}

                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Date of Birth (in figures):</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem' }}>
                          {dobFigures}
                        </Typography>
                      </Grid>
                      {activeConfig.showDobInWords && (
                        <Grid item xs={8}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Date of Birth (in words):</Typography>
                          <Typography variant="body2" fontStyle="italic" color="text.primary" sx={{ fontSize: '0.74rem' }}>
                            {dobWords}
                          </Typography>
                        </Grid>
                      )}

                      {activeConfig.showCategory && (
                        <Grid item xs={3}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Category:</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.74rem' }}>
                            {student?.categoryName || 'General'}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Religion:</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.74rem' }}>
                          {student?.religionName || 'Hindu'}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Nationality:</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.74rem' }}>
                          Indian
                        </Typography>
                      </Grid>
                      {activeConfig.showEmergencyContact && (
                        <Grid item xs={3}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Emergency Contact:</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: primaryCol, fontSize: '0.78rem' }}>
                            {student?.emergencyContact || primaryGuardian?.mobile || '—'}
                          </Typography>
                        </Grid>
                      )}

                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Residential Address:</Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                          {student?.address ? `${student.address}, ${student.city || ''}, ${student.state || ''} - ${student.pincode || ''}` : '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* 4. Parents & Guardians Information */}
                {isVisible('parents_info') && (
                  <Box sx={{ mb: 0.8 }}>
                    <Box
                      sx={{
                        bgcolor: secondaryCol,
                        px: 1,
                        py: 0.25,
                        borderRadius: 0.6,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        color: primaryCol,
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        mb: 0.6,
                      }}
                    >
                      2. Parents & Guardians Information
                    </Box>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box sx={{ p: 0.8, border: '1px solid #cbd5e1', borderRadius: 1, bgcolor: '#fafafa' }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: primaryCol, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                            FATHER'S DETAILS
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                            Name: <strong>{father?.name || student?.fatherName || primaryGuardian?.name || '—'}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                            Mobile: <strong>{father?.mobile || student?.fatherMobile || primaryGuardian?.mobile || '—'}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                            Occupation: {father?.occupation || student?.fatherOccupation || '—'}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6}>
                        <Box sx={{ p: 0.8, border: '1px solid #cbd5e1', borderRadius: 1, bgcolor: '#fafafa' }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: primaryCol, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                            MOTHER'S DETAILS
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                            Name: <strong>{mother?.name || student?.motherName || '—'}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                            Mobile: <strong>{mother?.mobile || student?.motherMobile || '—'}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                            Occupation: {mother?.occupation || student?.motherOccupation || '—'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* 5. Photographs Strip */}
                {isVisible('photos_strip') && photoList.length > 0 && (
                  <Box sx={{ mb: 0.8 }}>
                    <Box
                      sx={{
                        bgcolor: secondaryCol,
                        px: 1,
                        py: 0.25,
                        borderRadius: 0.6,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        color: primaryCol,
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        mb: 0.6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>3. Official Identification Photographs</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#475569' }}>Standard Passport Size</span>
                    </Box>

                    <Grid container spacing={1.5} justifyContent="space-between">
                      {photoList.map((item, idx) => (
                        <Grid item xs={12 / photoList.length} key={idx} sx={{ textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: activeConfig.photoWidth || 78,
                              height: activeConfig.photoHeight || 94,
                              mx: 'auto',
                              border: item.url ? `1.5px solid ${primaryCol}` : '1.5px dashed #94a3b8',
                              borderRadius: 1,
                              bgcolor: '#f8fafc',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              p: 0.3,
                            }}
                          >
                            {item.url ? (
                              <Box
                                component="img"
                                src={item.url}
                                alt={item.label}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0.6 }}
                              />
                            ) : (
                              <>
                                <PersonIcon sx={{ fontSize: 26, color: '#94a3b8' }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', mt: 0.2, lineHeight: 1.1 }}>
                                  Affix Photo
                                </Typography>
                              </>
                            )}
                          </Box>
                          <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', display: 'block', mt: 0.3, color: '#1e293b' }}>
                            {item.label}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* 6. Document Submission Checklist */}
                {isVisible('documents_checklist') && activeConfig.showDocumentsChecklist && (
                  <Box sx={{ mb: 0.8 }}>
                    <Box
                      sx={{
                        bgcolor: secondaryCol,
                        px: 1,
                        py: 0.25,
                        borderRadius: 0.6,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        color: primaryCol,
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        mb: 0.5,
                      }}
                    >
                      4. Document Submission & Verification Checklist
                    </Box>
                    <Grid container spacing={0.5}>
                      {checklistItems.map((doc) => (
                        <Grid item xs={6} key={doc.id}>
                          <Typography
                            variant="body2"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '0.72rem',
                              color: doc.isSubmitted ? '#0f172a' : '#64748b',
                            }}
                          >
                            {doc.isSubmitted ? (
                              <span style={{ marginRight: 5, color: '#16a34a', fontWeight: 900, fontSize: '0.8rem' }}>&#x2714;</span>
                            ) : (
                              <span style={{ marginRight: 5, color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>&#x25A2;</span>
                            )}
                            <span style={{ fontWeight: doc.isSubmitted ? 600 : 400 }}>{doc.name}</span>
                            {!doc.isSubmitted && (
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: 4, fontStyle: 'italic' }}>(Pending)</span>
                            )}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* 7. Parent Undertaking / Declaration */}
                {isVisible('declaration') && activeConfig.showDeclaration && (
                  <Box sx={{ mb: 0.8, p: 0.7, border: '1px dashed #94a3b8', borderRadius: 0.8, bgcolor: '#fafafa' }}>
                    <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.68rem', mb: 0.2, color: primaryCol }}>
                      {activeConfig.declarationTitle || 'PARENT / GUARDIAN UNDERTAKING:'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.64rem', lineHeight: 1.25 }}>
                      {activeConfig.declarationText}
                    </Typography>
                  </Box>
                )}

                {/* 8. Signatures */}
                {isVisible('signatures') && activeConfig.showSignatures && (
                  <Grid container spacing={2} sx={{ mt: 0.5, pt: 0.5 }}>
                    <Grid item xs={activeConfig.showSchoolSealBox ? 3 : 4} sx={{ textAlign: 'center' }}>
                      <Box sx={{ height: 26 }} />
                      <Divider sx={{ mb: 0.5, borderColor: '#475569' }} />
                      <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.72rem' }}>
                        {activeConfig.signature1 || 'Parent / Guardian Signature'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                        Date: {dayjs().format('DD-MM-YYYY')}
                      </Typography>
                    </Grid>

                    {activeConfig.showSchoolSealBox && (
                      <Grid item xs={3} sx={{ textAlign: 'center' }}>
                        <Box
                          sx={{
                            width: 60,
                            height: 38,
                            mx: 'auto',
                            border: '1px dashed #94a3b8',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6rem',
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                          }}
                        >
                          School Seal
                        </Box>
                      </Grid>
                    )}

                    <Grid item xs={activeConfig.showSchoolSealBox ? 3 : 4} sx={{ textAlign: 'center' }}>
                      <Box sx={{ height: 26 }} />
                      <Divider sx={{ mb: 0.5, borderColor: '#475569' }} />
                      <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.72rem' }}>
                        {activeConfig.signature2 || 'Admission In-charge / Clerk'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                        Verified & Entered
                      </Typography>
                    </Grid>

                    <Grid item xs={activeConfig.showSchoolSealBox ? 3 : 4} sx={{ textAlign: 'center' }}>
                      <Box sx={{ height: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {branchInfo?.principalSignatureUrl ? (
                          <Box
                            component="img"
                            src={branchInfo.principalSignatureUrl}
                            alt="Principal Signature"
                            sx={{ maxHeight: 30, maxWidth: 120, objectFit: 'contain' }}
                          />
                        ) : (
                          <Box sx={{ height: 26 }} />
                        )}
                      </Box>
                      <Divider sx={{ mb: 0.5, borderColor: '#475569' }} />
                      <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.72rem' }}>
                        {activeConfig.signature3 || 'Principal / Head of Institution'}
                      </Typography>
                    </Grid>
                  </Grid>
                )}

                {/* 9. Footer */}
                {isVisible('footer') && (
                  <Box sx={{ mt: 0.8, textAlign: 'center', borderTop: '1px solid #e2e8f0', pt: 0.4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                      {activeConfig.footerText} &bull; Generated on {dayjs().format('DD MMM YYYY, hh:mm A')}
                    </Typography>
                  </Box>
                )}
              </div>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          className="no-print"
          sx={{
            px: 3,
            py: 1.8,
            justifyContent: 'space-between',
            bgcolor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <Box>
            {isNewlyAdmitted && onAdmitAnother && (
              <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={onAdmitAnother} sx={{ mr: 1 }}>
                Admit Another Student
              </Button>
            )}
            {isNewlyAdmitted && onNavigateDirectory && (
              <Button variant="text" endIcon={<ArrowForwardIcon />} onClick={onNavigateDirectory}>
                Student Directory
              </Button>
            )}
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button onClick={onClose} color="inherit">
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={() => setWhatsAppOpen(true)}
              disabled={loading || !student}
              sx={{
                px: 2.5,
                fontWeight: 700,
                bgcolor: '#25D366',
                '&:hover': { bgcolor: '#128C7E' },
              }}
            >
              WhatsApp Confirmation
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={loading || !student}
              sx={{ px: 3, fontWeight: 700, bgcolor: primaryCol, '&:hover': { bgcolor: activeConfig.accentColor || '#064e3b' } }}
            >
              Print Admission Report
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        recipientName={student?.fatherName || student?.guardianName || student?.fullName}
        recipientPhone={
          student?.fatherMobile ||
          student?.guardianMobile ||
          student?.emergencyContactNumber ||
          student?.mobile ||
          student?.guardians?.[0]?.mobile
        }
        recipientRole={`Parent of ${student?.fullName}`}
        moduleKey="admission"
        moduleTitle="Admission Confirmation (WhatsApp)"
        templateData={{
          ParentName: student?.fatherName || student?.guardianName || 'Parent',
          StudentName: student?.fullName || '',
          AdmissionNo: student?.admissionNo || '',
          ClassName: student?.className || student?.currentEnrollment?.className || '',
          Section: student?.sectionName || student?.currentEnrollment?.sectionName || '',
          Date: student?.admissionDate ? dayjs(student.admissionDate).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY'),
        }}
      />
    </>
  );
};

export default AdmissionReportModal;
