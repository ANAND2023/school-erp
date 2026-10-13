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
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { studentApi } from '../api';
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';
import { printWithTitle } from '../../../utils/printUtils';

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

export const AdmissionReportModal = ({
  open,
  onClose,
  studentId,
  studentData: initialStudentData,
  isNewlyAdmitted = false,
  onAdmitAnother,
  onNavigateDirectory,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(initialStudentData || null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

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
          const matchedBranch = bRes.data.data.find(b => b.id === (user?.branchId || 1)) || bRes.data.data[0];
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

  const handlePrint = () => {
    const sName = studentFullName && studentFullName !== '—' ? studentFullName : 'Student';
    const aNo = admissionNo && admissionNo !== 'Pending Confirmation' ? `_${admissionNo}` : '';
    printWithTitle(`Admission_Report_${sName}${aNo}`);
  };

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

  const schoolName = branchInfo?.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branchInfo?.name ? `${branchInfo.name} Branch` : (user?.branchName || 'Main Campus');
  const branchAddress = branchInfo?.address || 'Sector 12, RK Puram, New Delhi - 110022';
  const branchPhone = branchInfo?.phone || '+91 11 2617 8900';
  const branchEmail = branchInfo?.email || 'admissions@dpsdelhi.edu.in';
  const affiliationNo = branchInfo?.affiliationNo || '2130892';

  // 4 Photos (Student, Father, Mother, Guardian)
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
    { label: "Student's Photo", url: studentPhoto, sub: 'Pupil' },
    { label: "Father's Photo", url: fatherPhoto, sub: 'Father' },
    { label: "Mother's Photo", url: motherPhoto, sub: 'Mother' },
    { label: "Guardian's Photo", url: guardianPhoto, sub: 'Guardian' },
  ];

  // Verified Document Checklist based on actually uploaded student documents
  const docs = student?.documents || [];
  const docTitles = docs.map((d) => (d.title || d.documentTypeName || '').toLowerCase());

  const checklistItems = [
    {
      id: 1,
      name: '1. Birth Certificate',
      isSubmitted: docTitles.some((t) => t.includes('birth') || t.includes('dob') || t.includes('janm')),
    },
    {
      id: 2,
      name: '2. Student Aadhaar Card',
      isSubmitted: docTitles.some((t) => t.includes('aadhaar') || t.includes('aadhar') || t.includes('uid')),
    },
    {
      id: 3,
      name: '3. Transfer Certificate (TC)',
      isSubmitted: docTitles.some((t) => t.includes('transfer') || t.includes('tc') || t.includes('leaving') || t.includes('school leaving')),
    },
    {
      id: 4,
      name: '4. Previous Marksheet',
      isSubmitted: docTitles.some((t) => t.includes('marksheet') || t.includes('mark sheet') || t.includes('report card') || t.includes('result') || t.includes('previous')),
    },
    {
      id: 5,
      name: '5. 4 Passport Photographs',
      isSubmitted: Boolean(studentPhoto && (fatherPhoto || motherPhoto || guardianPhoto)),
    },
    {
      id: 6,
      name: '6. Address Proof',
      isSubmitted: docTitles.some((t) => t.includes('address') || t.includes('domicile') || t.includes('electricity') || t.includes('ration') || t.includes('voter') || t.includes('rent') || t.includes('residence') || t.includes('niwas')),
    },
  ];

  return (
    <>
      {/* FULL A4 PAGE PRINT CSS */}
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
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
            /* Hide root and backdrop outside modal */
            #root,
            body > *:not(.MuiDialog-root) {
              display: none !important;
            }
            /* Unconstrain Dialog modal */
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
            .MuiBackdrop-root {
              display: none !important;
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
            [class*="MuiDialogTitle"],
            .no-print {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
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
              border: 2px solid #1e3a8a !important;
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
            #printable-admission-report .MuiGrid-root {
              display: flex !important;
              flex-wrap: wrap !important;
            }
            #printable-admission-report .MuiGrid-item {
              display: block !important;
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
            '@media print': {
              display: 'none !important',
            },
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isNewlyAdmitted ? (
              <CheckIcon sx={{ color: 'success.main', fontSize: 28 }} />
            ) : (
              <SchoolIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            )}
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                {isNewlyAdmitted ? 'Admission Successfully Registered!' : 'Official Admission Slip & Report'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                CBSE Standard Pupil Enrollment Record & Acknowledgement Slip (Full A4 Page Format &bull; 4 Photos)
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
                Please print this official full A4 admission report for the school records, student master file, and parent acknowledgement.
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
            /* Printable Admission Report Form (Full A4 Page Layout) */
            <Box
              id="printable-admission-report"
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: '#ffffff',
                border: '2px solid #1e3a8a',
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                color: '#1e293b',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '800px',
              }}
            >
              {/* Institution Header */}
              <Box sx={{ textAlign: 'center', pb: 0.8, borderBottom: '2px double #1e3a8a' }}>
                <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                  {branchInfo?.logoUrl ? (
                    <Box
                      component="img"
                      src={branchInfo.logoUrl}
                      alt="Logo"
                      sx={{
                        width: 50,
                        height: 50,
                        objectFit: 'contain',
                        borderRadius: 1,
                      }}
                    />
                  ) : (
                    <SchoolIcon sx={{ fontSize: 34, color: '#1e3a8a' }} />
                  )}
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      sx={{ color: '#1e3a8a', letterSpacing: 1.1, fontSize: '1.45rem', lineHeight: 1.15 }}
                    >
                      {branchInfo?.printHeader || schoolName}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                      {branchName} &bull; Affiliated to CBSE, New Delhi (Affiliation No: {affiliationNo})
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
                    bgcolor: '#1e3a8a',
                    color: '#ffffff',
                    borderRadius: 1,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    fontSize: '0.76rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Student Admission Report & Official Enrollment Slip
                </Box>
              </Box>

              {/* Enrollment Summary Row */}
              <Box
                sx={{
                  my: 0.8,
                  p: 0.8,
                  bgcolor: '#f1f5f9',
                  borderRadius: 1,
                  border: '1.5px solid #cbd5e1',
                }}
              >
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem', display: 'block', fontWeight: 600 }}>
                      ADMISSION NUMBER
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="#1e3a8a" sx={{ fontSize: '0.92rem', lineHeight: 1.2 }}>
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

              {/* SECTION 1: Pupil Personal Information */}
              <Box sx={{ mb: 0.8 }}>
                <Box
                  sx={{
                    bgcolor: '#e2e8f0',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.6,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: '#0f172a',
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
                  <Grid item xs={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Blood Group:</Typography>
                    <Typography variant="body2" fontWeight={800} color="error.main" sx={{ fontSize: '0.78rem' }}>
                      {student?.bloodGroup || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Aadhaar No:</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem' }}>
                      {student?.aadhaarNo || '—'}
                    </Typography>
                  </Grid>

                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Date of Birth (in figures):</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem' }}>
                      {dobFigures}
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Date of Birth (in words):</Typography>
                    <Typography variant="body2" fontStyle="italic" color="text.primary" sx={{ fontSize: '0.74rem' }}>
                      {dobWords}
                    </Typography>
                  </Grid>

                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Category:</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.74rem' }}>
                      {student?.categoryName || 'General'}
                    </Typography>
                  </Grid>
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
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Emergency Contact:</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.78rem' }}>
                      {student?.emergencyContact || primaryGuardian?.mobile || '—'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>Residential Address:</Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                      {student?.address ? `${student.address}, ${student.city || ''}, ${student.state || ''} - ${student.pincode || ''}` : '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* SECTION 2: Parents & Guardian Information */}
              <Box sx={{ mb: 0.8 }}>
                <Box
                  sx={{
                    bgcolor: '#e2e8f0',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.6,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: '#0f172a',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    mb: 0.6,
                  }}
                >
                  2. Parents & Guardians Information
                </Box>

                <Grid container spacing={1}>
                  {/* Father Details */}
                  <Grid item xs={6}>
                    <Box sx={{ p: 0.8, border: '1px solid #cbd5e1', borderRadius: 1, bgcolor: '#fafafa' }}>
                      <Typography variant="caption" fontWeight={700} color="primary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        FATHER'S DETAILS
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                        Name: <strong>{father?.name || student?.fatherName || primaryGuardian?.name || '—'}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                        Mobile: <strong>{father?.mobile || student?.fatherMobile || primaryGuardian?.mobile || '—'}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                        Occupation: {father?.occupation || student?.fatherOccupation || '—'} &bull; Email: {father?.email || student?.fatherEmail || '—'}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Mother Details */}
                  <Grid item xs={6}>
                    <Box sx={{ p: 0.8, border: '1px solid #cbd5e1', borderRadius: 1, bgcolor: '#fafafa' }}>
                      <Typography variant="caption" fontWeight={700} color="primary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        MOTHER'S DETAILS
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                        Name: <strong>{mother?.name || student?.motherName || '—'}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                        Mobile: <strong>{mother?.mobile || student?.motherMobile || '—'}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                        Occupation: {mother?.occupation || student?.motherOccupation || '—'} &bull; Income: {mother?.annualIncome ? `₹ ${mother.annualIncome.toLocaleString()}` : '—'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* SECTION 3: Official Identity Photographs (4 Photos) */}
              <Box sx={{ mb: 0.8 }}>
                <Box
                  sx={{
                    bgcolor: '#e2e8f0',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.6,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: '#0f172a',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    mb: 0.6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>3. Official Identification Photographs (Student, Father, Mother, Guardian)</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#475569' }}>Standard Passport Size (3.5cm x 4.5cm)</span>
                </Box>

                <Grid container spacing={1.5} justifyContent="space-between">
                  {photoList.map((item, idx) => (
                    <Grid item xs={3} key={idx} sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 82,
                          height: 98,
                          mx: 'auto',
                          border: item.url ? '1.5px solid #1e3a8a' : '1.5px dashed #94a3b8',
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
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: 0.6,
                            }}
                          />
                        ) : (
                          <>
                            <PersonIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
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

              {/* Sibling Information (If any) */}
              {student?.siblings && student.siblings.length > 0 && (
                <Box sx={{ mb: 0.8, p: 0.6, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 0.8 }}>
                  <Typography variant="caption" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                    ENROLLED SIBLINGS IN SCHOOL:
                  </Typography>
                  {student.siblings.map((sib, sIdx) => (
                    <Typography key={sIdx} variant="caption" sx={{ fontSize: '0.68rem', display: 'block' }}>
                      &bull; <strong>{sib.fullName}</strong> (Adm No: <strong>{sib.admissionNo}</strong> &bull; Class: {sib.className} - {sib.sectionName})
                    </Typography>
                  ))}
                </Box>
              )}

              {/* SECTION 4: Document Submission Checklist */}
              <Box sx={{ mb: 0.8 }}>
                <Box
                  sx={{
                    bgcolor: '#e2e8f0',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.6,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: '#0f172a',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    mb: 0.5,
                  }}
                >
                  4. Document Submission & Verification Checklist
                </Box>
                <Grid container spacing={0.5}>
                  {checklistItems.map((doc) => (
                    <Grid item xs={4} key={doc.id}>
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

              {/* Parent Declaration */}
              <Box sx={{ mb: 0.8, p: 0.7, border: '1px dashed #94a3b8', borderRadius: 0.8, bgcolor: '#fafafa' }}>
                <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.68rem', mb: 0.2 }}>
                  PARENT / GUARDIAN UNDERTAKING:
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.64rem', lineHeight: 1.25 }}>
                  I hereby certify that all information submitted in this admission form is true and verified. I undertake to abide by the school rules, discipline norms, fee payment schedules, and academic regulations of the institution.
                </Typography>
              </Box>

              {/* Official Signatures Row */}
              <Grid container spacing={2} sx={{ mt: 0.5, pt: 0.5 }}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: 26 }} />
                  <Divider sx={{ mb: 0.5, borderColor: '#475569' }} />
                  <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.72rem' }}>
                    Parent / Guardian Signature
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                    Date: {dayjs().format('DD-MM-YYYY')}
                  </Typography>
                </Grid>

                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: 26 }} />
                  <Divider sx={{ mb: 0.5, borderColor: '#475569' }} />
                  <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.72rem' }}>
                    Admission In-charge / Clerk
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                    Verified & Entered
                  </Typography>
                </Grid>

                <Grid item xs={4} sx={{ textAlign: 'center' }}>
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
                    Principal / Head of Institution
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                    (With Official School Seal)
                  </Typography>
                </Grid>
              </Grid>

              {/* Footer Note */}
              <Box sx={{ mt: 0.8, textAlign: 'center', borderTop: '1px solid #e2e8f0', pt: 0.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                  Generated from DVS ERP (Digital Vidya Sarthi) on {dayjs().format('DD MMM YYYY, hh:mm A')} &bull; System Verified Student Enrollment Record
                </Typography>
              </Box>
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
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={onAdmitAnother}
                sx={{ mr: 1 }}
              >
                Admit Another Student
              </Button>
            )}
            {isNewlyAdmitted && onNavigateDirectory && (
              <Button
                variant="text"
                endIcon={<ArrowForwardIcon />}
                onClick={onNavigateDirectory}
              >
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
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={loading || !student}
              sx={{ px: 3, fontWeight: 700 }}
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
