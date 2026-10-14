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
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  CheckCircle as CheckIcon,
  HowToReg as ConvertIcon,
  WhatsApp as WhatsAppIcon,
  Person as PersonIcon,
  QrCode2 as QrCodeIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import apiClient from '../../../api/client';
import { enquiryApi } from '../api';
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { WhatsAppDialog } from '../../communication/components/WhatsAppDialog';
import { printWithTitle } from '../../../utils/printUtils';

const DEFAULT_SLIP_CONFIG = {
  primaryColor: '#0f766e',
  secondaryColor: '#f0fdfa',
  accentColor: '#115e59',
  borderColor: '#0f766e',
  fontFamily: 'Inter, "Segoe UI", Roboto, sans-serif',
  fontScale: 'Normal',
  headerLayout: 'Classic',
  borderStyle: 'Solid',
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
};

export const EnquirySlipModal = ({
  open,
  onClose,
  enquiryId,
  enquiryData: initialEnquiryData,
  isNew = false,
  onConvertToAdmission,
}) => {
  const { user, activeAcademicYearName } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [enquiry, setEnquiry] = useState(initialEnquiryData || null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [slipConfig, setSlipConfig] = useState(DEFAULT_SLIP_CONFIG);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const targetId = enquiryId || initialEnquiryData?.id;
      if (targetId && (!initialEnquiryData || !initialEnquiryData.className || !initialEnquiryData.followups)) {
        try {
          setLoading(true);
          const res = await enquiryApi.getEnquiry(targetId);
          if (isMounted && res.data?.success) {
            setEnquiry(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load enquiry detail for slip:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else if (initialEnquiryData) {
        setEnquiry(initialEnquiryData);
      }

      // 1. Load Branch Info
      try {
        const curRes = await apiClient.get('/branches/current');
        if (isMounted && curRes.data?.success && curRes.data?.data) {
          setBranchInfo(curRes.data.data);
        } else {
          const bRes = await branchApi.getBranches();
          if (isMounted && bRes.data?.success && Array.isArray(bRes.data.data)) {
            const matchedBranch = bRes.data.data.find((b) => b.id === (user?.branchId || 1)) || bRes.data.data[0];
            setBranchInfo(matchedBranch);
          }
        }
      } catch (err) {
        console.error('Failed to load branch info:', err);
      }

      // 2. Load School-Wise Dynamic Slip Configuration
      try {
        const cfgRes = await apiClient.get('/enquiries/slip-config');
        if (isMounted && cfgRes.data?.success && cfgRes.data?.data) {
          setSlipConfig(cfgRes.data.data);
        }
      } catch (err) {
        console.warn('Could not load custom slip config, using defaults:', err);
      }
    };

    if (open) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [open, enquiryId, initialEnquiryData, user?.branchId]);

  const handlePrint = () => {
    const sName = enquiry?.studentName || 'Student';
    const num = enquiry?.enquiryNo || (enquiry?.id ? `ENQ-${enquiry.id}` : 'ENQ');
    printWithTitle(`Enquiry_Slip_${sName}_${num}`);
  };

  if (!open) return null;

  const yearStr = dayjs(enquiry?.createdOn || new Date()).format('YYYY');
  const enqNum = enquiry?.id ? `ENQ-${yearStr}-${String(enquiry.id).padStart(4, '0')}` : 'ENQ-NEW';
  const enquiryDate = enquiry?.createdOn
    ? dayjs(enquiry.createdOn).format('DD MMM YYYY, hh:mm A')
    : dayjs().format('DD MMM YYYY, hh:mm A');
  const nextFollowup = enquiry?.nextFollowupDate
    ? dayjs(enquiry.nextFollowupDate).format('DD MMM YYYY')
    : 'Not Scheduled';

  const schoolName = branchInfo?.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branchInfo?.name ? `${branchInfo.name} Branch` : user?.branchName || 'Main Campus';
  const branchAddress = branchInfo?.address || 'Sector 12, RK Puram, New Delhi - 110022';
  const branchPhone = branchInfo?.phone || '+91 11 2617 8900';
  const branchEmail = branchInfo?.email || 'admissions@dpsdelhi.edu.in';
  const affiliationNo = branchInfo?.affiliationNo || '2130892';

  const getStatusLabel = (status) => {
    switch (Number(status)) {
      case 1:
        return { text: 'Open / Under Review', color: slipConfig.primaryColor || '#0284c7' };
      case 2:
        return { text: 'In Follow-up', color: '#d97706' };
      case 3:
        return { text: 'Converted to Admission', color: '#16a34a' };
      case 4:
        return { text: 'Closed', color: '#64748b' };
      default:
        return { text: 'Active', color: slipConfig.primaryColor || '#0284c7' };
    }
  };

  const statusInfo = getStatusLabel(enquiry?.status || 1);

  // Border helper
  const getBorderCss = () => {
    switch (slipConfig.borderStyle) {
      case 'Solid':
        return `2px solid ${slipConfig.borderColor || slipConfig.primaryColor}`;
      case 'Double':
        return `3.5px double ${slipConfig.borderColor || slipConfig.primaryColor}`;
      case 'Dashed':
        return `2px dashed ${slipConfig.borderColor || slipConfig.primaryColor}`;
      case 'None':
        return '1px solid #e2e8f0';
      default:
        return `2px solid ${slipConfig.borderColor || slipConfig.primaryColor}`;
    }
  };

  // Font scale helper
  const getFontScaleFactor = () => {
    switch (slipConfig.fontScale) {
      case 'Compact':
        return 0.9;
      case 'Large':
        return 1.1;
      default:
        return 1.0;
    }
  };

  const fontScale = getFontScaleFactor();

  // Dynamic Section Renderers
  const renderSection = (sectionKey) => {
    switch (sectionKey) {
      case 'header':
        if (slipConfig.headerLayout === 'Banner') {
          return (
            <Box
              key="header"
              sx={{
                bgcolor: slipConfig.primaryColor,
                color: '#ffffff',
                p: { xs: 1.5, sm: 2 },
                borderRadius: 1.5,
                mb: 1.5,
                textAlign: 'center',
              }}
            >
              <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                {slipConfig.showSchoolLogo && (
                  branchInfo?.logoUrl ? (
                    <Box
                      component="img"
                      src={branchInfo.logoUrl}
                      alt="Logo"
                      sx={{
                        width: 50,
                        height: 50,
                        objectFit: 'contain',
                        bgcolor: '#ffffff',
                        borderRadius: '50%',
                        p: 0.5,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: '#ffffff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: slipConfig.primaryColor,
                      }}
                    >
                      <SchoolIcon sx={{ fontSize: 28 }} />
                    </Box>
                  )
                )}
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{ letterSpacing: 1, fontSize: `${1.45 * fontScale}rem`, lineHeight: 1.15 }}
                  >
                    {branchInfo?.printHeader || schoolName}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: `${0.78 * fontScale}rem`, opacity: 0.95 }}>
                    {branchName} {slipConfig.showAffiliationNo && `• Affiliated to CBSE, New Delhi (Affiliation No: ${affiliationNo})`}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="caption" sx={{ fontSize: `${0.7 * fontScale}rem`, opacity: 0.9, display: 'block', mt: 0.5 }}>
                Address: {branchAddress} | Helpline: {branchPhone} | Email: {branchEmail}
              </Typography>
              <Box
                sx={{
                  display: 'inline-block',
                  mt: 1,
                  px: 2.5,
                  py: 0.4,
                  bgcolor: 'rgba(255,255,255,0.25)',
                  borderRadius: 1,
                  fontWeight: 700,
                  fontSize: `${0.75 * fontScale}rem`,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                {slipConfig.slipTitle}
              </Box>
            </Box>
          );
        }

        if (slipConfig.headerLayout === 'Modern') {
          return (
            <Box
              key="header"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 1.2,
                borderBottom: `2px solid ${slipConfig.borderColor || slipConfig.primaryColor}`,
                mb: 1.5,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                {slipConfig.showSchoolLogo && (
                  branchInfo?.logoUrl ? (
                    <Box
                      component="img"
                      src={branchInfo.logoUrl}
                      alt="Logo"
                      sx={{ width: 54, height: 54, objectFit: 'contain', borderRadius: 1 }}
                    />
                  ) : (
                    <SchoolIcon sx={{ fontSize: 44, color: slipConfig.primaryColor }} />
                  )
                )}
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight={900}
                    sx={{ color: slipConfig.primaryColor, fontSize: `${1.35 * fontScale}rem`, lineHeight: 1.2 }}
                  >
                    {branchInfo?.printHeader || schoolName}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: `${0.78 * fontScale}rem` }}>
                    {branchName} {slipConfig.showAffiliationNo && `• Affiliation No: ${affiliationNo}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem`, display: 'block' }}>
                    {branchAddress} | {branchPhone}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ textAlign: 'right' }}>
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1.8,
                    py: 0.4,
                    bgcolor: slipConfig.primaryColor,
                    color: '#ffffff',
                    borderRadius: 1,
                    fontWeight: 700,
                    fontSize: `${0.72 * fontScale}rem`,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    mb: 0.5,
                  }}
                >
                  {slipConfig.slipTitle}
                </Box>
                {slipConfig.showQrCode && (
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                    <QrCodeIcon sx={{ fontSize: 20, color: slipConfig.primaryColor }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.65 * fontScale}rem` }}>
                      Ref QR Verify
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Box>
          );
        }

        if (slipConfig.headerLayout === 'Minimal') {
          return (
            <Box
              key="header"
              sx={{
                pb: 1,
                borderBottom: '1px solid #cbd5e1',
                mb: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: slipConfig.primaryColor, fontSize: `${1.3 * fontScale}rem` }}
                  >
                    {branchInfo?.printHeader || schoolName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: `${0.76 * fontScale}rem` }}>
                    {branchName} | {branchAddress} | {branchPhone}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    border: `1.5px solid ${slipConfig.primaryColor}`,
                    color: slipConfig.primaryColor,
                    px: 1.5,
                    py: 0.3,
                    borderRadius: 1,
                    fontWeight: 700,
                    fontSize: `${0.72 * fontScale}rem`,
                    textTransform: 'uppercase',
                  }}
                >
                  {slipConfig.slipTitle}
                </Box>
              </Box>
            </Box>
          );
        }

        // Classic Layout (Default)
        return (
          <Box
            key="header"
            sx={{
              textAlign: 'center',
              pb: 1,
              borderBottom: `2.5px double ${slipConfig.borderColor || slipConfig.primaryColor}`,
              mb: 1.5,
            }}
          >
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
              {slipConfig.showSchoolLogo && (
                branchInfo?.logoUrl ? (
                  <Box
                    component="img"
                    src={branchInfo.logoUrl}
                    alt="Logo"
                    sx={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 1 }}
                  />
                ) : (
                  <SchoolIcon sx={{ fontSize: 38, color: slipConfig.primaryColor }} />
                )
              )}
              <Box>
                <Typography
                  variant="h4"
                  fontWeight={900}
                  sx={{
                    color: slipConfig.primaryColor,
                    letterSpacing: 1.2,
                    fontSize: `${1.5 * fontScale}rem`,
                    lineHeight: 1.15,
                  }}
                >
                  {branchInfo?.printHeader || schoolName}
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: `${0.8 * fontScale}rem` }}>
                  {branchName} {slipConfig.showAffiliationNo && `• Affiliated to CBSE, New Delhi (Affiliation No: ${affiliationNo})`}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.72 * fontScale}rem`, display: 'block', mt: 0.3 }}>
              Address: {branchAddress} | Helpline: {branchPhone} | Email: {branchEmail}
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: 'inline-block',
                px: 3,
                py: 0.4,
                bgcolor: slipConfig.primaryColor,
                color: '#ffffff',
                borderRadius: 1,
                fontWeight: 700,
                letterSpacing: 1,
                fontSize: `${0.78 * fontScale}rem`,
                textTransform: 'uppercase',
              }}
            >
              {slipConfig.slipTitle}
            </Box>
          </Box>
        );

      case 'meta_bar':
        return (
          <Box
            key="meta_bar"
            sx={{
              mb: 1.2,
              p: 1.2,
              bgcolor: slipConfig.secondaryColor,
              borderRadius: 1.5,
              border: `1.5px solid ${slipConfig.borderColor || slipConfig.primaryColor}`,
            }}
          >
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem`, display: 'block', fontWeight: 600 }}>
                  ENQUIRY REF. NO
                </Typography>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: slipConfig.primaryColor, fontSize: `${0.96 * fontScale}rem` }}>
                  {enqNum}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem`, display: 'block', fontWeight: 600 }}>
                  DATE & TIME
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ fontSize: `${0.85 * fontScale}rem` }}>
                  {enquiryDate}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem`, display: 'block', fontWeight: 600 }}>
                  ENQUIRY SOURCE
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ fontSize: `${0.85 * fontScale}rem` }}>
                  {enquiry?.source || 'Walk-in Visit'}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem`, display: 'block', fontWeight: 600 }}>
                  CURRENT STATUS
                </Typography>
                <Typography variant="body2" fontWeight={800} sx={{ color: statusInfo.color, fontSize: `${0.85 * fontScale}rem` }}>
                  {statusInfo.text}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        );

      case 'student_guardian':
        return (
          <Box key="student_guardian" sx={{ mb: 1.2 }}>
            <Box
              sx={{
                bgcolor: slipConfig.secondaryColor,
                borderLeft: `3px solid ${slipConfig.primaryColor}`,
                px: 1.2,
                py: 0.35,
                borderRadius: '0 4px 4px 0',
                fontWeight: 700,
                fontSize: `${0.74 * fontScale}rem`,
                color: slipConfig.accentColor || slipConfig.primaryColor,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                mb: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>1. Prospective Student & Guardian Information</span>
              {slipConfig.showStudentPhotoBox && (
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Passport Photo Area</span>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Grid container spacing={1.5} sx={{ flex: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                    Candidate / Student Name:
                  </Typography>
                  <Typography variant="body1" fontWeight={800} sx={{ color: '#0f172a', textTransform: 'uppercase', fontSize: `${0.92 * fontScale}rem` }}>
                    {enquiry?.studentName || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                    Seeking Admission to Class:
                  </Typography>
                  <Typography variant="body1" fontWeight={800} sx={{ color: slipConfig.primaryColor, fontSize: `${0.92 * fontScale}rem` }}>
                    {enquiry?.className || `Class ID: ${enquiry?.classId || '—'}`}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                    Father / Guardian Name:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: `${0.82 * fontScale}rem` }}>
                    {enquiry?.guardianName || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                    Primary Contact Mobile:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: `${0.82 * fontScale}rem` }}>
                    {enquiry?.mobile || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                    Email Address:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: `${0.8 * fontScale}rem` }}>
                    {enquiry?.email || '—'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                    Academic Session:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: slipConfig.primaryColor, fontSize: `${0.82 * fontScale}rem` }}>
                    {enquiry?.academicYearName || activeAcademicYearName || user?.academicYearName || '2026-27'}
                  </Typography>
                </Grid>
              </Grid>

              {slipConfig.showStudentPhotoBox && (
                <Box
                  sx={{
                    width: 86,
                    height: 102,
                    border: '1.5px dashed #94a3b8',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.5,
                    textAlign: 'center',
                    bgcolor: '#fafafa',
                  }}
                >
                  <PersonIcon sx={{ fontSize: 26, color: '#94a3b8', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748b', lineHeight: 1.1 }}>
                    Affix Student Photo
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 'discussion_notes':
        return (
          <Box key="discussion_notes" sx={{ mb: 1.2 }}>
            <Box
              sx={{
                bgcolor: slipConfig.secondaryColor,
                borderLeft: `3px solid ${slipConfig.primaryColor}`,
                px: 1.2,
                py: 0.35,
                borderRadius: '0 4px 4px 0',
                fontWeight: 700,
                fontSize: `${0.74 * fontScale}rem`,
                color: slipConfig.accentColor || slipConfig.primaryColor,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              2. Discussion Notes & Scheduled Follow-up
            </Box>

            <Grid container spacing={1.5}>
              <Grid item xs={slipConfig.showNextFollowupDate ? 8 : 12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                  Counselor Notes / Inquiries Raised:
                </Typography>
                <Box
                  sx={{
                    p: 1.2,
                    minHeight: 46,
                    bgcolor: '#fafafa',
                    border: '1px solid #e2e8f0',
                    borderRadius: 1,
                    fontSize: `${0.8 * fontScale}rem`,
                    lineHeight: 1.35,
                  }}
                >
                  {enquiry?.notes || 'Enquired about syllabus, fee structure, and school transport facility.'}
                </Box>
              </Grid>

              {slipConfig.showNextFollowupDate && (
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.68 * fontScale}rem` }}>
                    Next Follow-up / Visit Date:
                  </Typography>
                  <Box
                    sx={{
                      p: 1.2,
                      bgcolor: slipConfig.secondaryColor,
                      border: `1px solid ${slipConfig.borderColor || slipConfig.primaryColor}`,
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={800} sx={{ color: slipConfig.primaryColor, fontSize: `${0.92 * fontScale}rem` }}>
                      {nextFollowup}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 'documents_checklist':
        return (
          <Box key="documents_checklist" sx={{ mb: 1.2 }}>
            <Box
              sx={{
                bgcolor: slipConfig.secondaryColor,
                borderLeft: `3px solid ${slipConfig.primaryColor}`,
                px: 1.2,
                py: 0.35,
                borderRadius: '0 4px 4px 0',
                fontWeight: 700,
                fontSize: `${0.74 * fontScale}rem`,
                color: slipConfig.accentColor || slipConfig.primaryColor,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                mb: 0.8,
              }}
            >
              3. Documents Required at the Time of Admission
            </Box>

            <Grid container spacing={0.8}>
              {slipConfig.documentsRequired?.map((doc, idx) => (
                <Grid item xs={6} key={idx}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontSize: `${0.78 * fontScale}rem` }}>
                    <span style={{ marginRight: 6, color: slipConfig.primaryColor, fontWeight: 900 }}>&#x2714;</span> {doc}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 'instructions':
        return (
          <Box
            key="instructions"
            sx={{
              mb: 1.5,
              p: 1,
              border: `1px dashed ${slipConfig.borderColor || slipConfig.primaryColor}`,
              borderRadius: 1,
              bgcolor: slipConfig.secondaryColor,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: slipConfig.primaryColor, fontSize: `${0.72 * fontScale}rem`, mb: 0.2, display: 'block' }}
            >
              {slipConfig.instructionsTitle}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ fontSize: `${0.68 * fontScale}rem`, lineHeight: 1.35, whiteSpace: 'pre-line' }}
            >
              {slipConfig.termsText}
            </Typography>
          </Box>
        );

      case 'signatures':
        return (
          <Grid
            container
            spacing={2}
            key="signatures"
            sx={{ mt: 1, pt: 1, alignItems: 'flex-end' }}
          >
            <Grid item xs={slipConfig.showSchoolSealBox ? 3 : 4} sx={{ textAlign: 'center' }}>
              <Box sx={{ height: 35 }} />
              <Divider sx={{ mb: 0.6, borderColor: '#475569' }} />
              <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: `${0.74 * fontScale}rem` }}>
                Parent / Visitor Signature
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.66 * fontScale}rem` }}>
                Date: {dayjs().format('DD-MM-YYYY')}
              </Typography>
            </Grid>

            <Grid item xs={slipConfig.showSchoolSealBox ? 3 : 4} sx={{ textAlign: 'center' }}>
              <Box sx={{ height: 35 }} />
              <Divider sx={{ mb: 0.6, borderColor: '#475569' }} />
              <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: `${0.74 * fontScale}rem` }}>
                Admission Counselor
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.66 * fontScale}rem` }}>
                Front-Desk Verification
              </Typography>
            </Grid>

            <Grid item xs={slipConfig.showSchoolSealBox ? 3 : 4} sx={{ textAlign: 'center' }}>
              <Box sx={{ height: 38, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {branchInfo?.principalSignatureUrl || branchInfo?.authorizedSignatureUrl ? (
                  <Box
                    component="img"
                    src={branchInfo.principalSignatureUrl || branchInfo.authorizedSignatureUrl}
                    alt="Signature"
                    sx={{ maxHeight: 36, maxWidth: 120, objectFit: 'contain' }}
                  />
                ) : (
                  <Box sx={{ height: 35 }} />
                )}
              </Box>
              <Divider sx={{ mb: 0.6, borderColor: '#475569' }} />
              <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: `${0.74 * fontScale}rem` }}>
                Principal / Authorized Signatory
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.66 * fontScale}rem` }}>
                Official School Verification
              </Typography>
            </Grid>

            {slipConfig.showSchoolSealBox && (
              <Grid item xs={3} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    border: '1.5px dashed #94a3b8',
                    borderRadius: 1,
                    height: 54,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.5,
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>
                    OFFICIAL SCHOOL SEAL / STAMP
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        );

      case 'footer':
        return (
          <Box
            key="footer"
            sx={{ mt: 1.5, textAlign: 'center', borderTop: '1px solid #e2e8f0', pt: 0.6 }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${0.66 * fontScale}rem` }}>
              {slipConfig.footerText}
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* FULL A4 PAGE PRINT CSS */}
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 8mm 8mm;
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
            body > *:not(.MuiDialog-root) {
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
            #printable-enquiry-slip {
              display: flex !important;
              flex-direction: column !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              margin: 0 auto !important;
              padding: 16px 20px !important;
              border: ${getBorderCss()} !important;
              border-radius: 6px !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              overflow: visible !important;
              font-family: ${slipConfig.fontFamily} !important;
            }
            #printable-enquiry-slip * {
              visibility: visible !important;
            }
            #printable-enquiry-slip .MuiGrid-root {
              display: flex !important;
              flex-wrap: wrap !important;
            }
            #printable-enquiry-slip .MuiGrid-item {
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
            bgcolor: isNew ? '#f0fdfa' : 'inherit',
            borderBottom: '1px solid #e2e8f0',
            '@media print': {
              display: 'none !important',
            },
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isNew ? (
              <CheckIcon sx={{ color: slipConfig.primaryColor, fontSize: 28 }} />
            ) : (
              <SchoolIcon sx={{ color: slipConfig.primaryColor, fontSize: 28 }} />
            )}
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                {isNew ? 'Enquiry Registered Successfully!' : slipConfig.slipTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Official Visitor Acknowledgement & Follow-up Lead Slip (Dynamic School Format)
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc' }}>
          {isNew && (
            <Alert severity="success" sx={{ mb: 2 }} className="no-print" icon={<CheckIcon />}>
              <Typography variant="subtitle2" fontWeight={700}>
                Enquiry saved with Reference No: <strong>{enqNum}</strong>
              </Typography>
              <Typography variant="caption" display="block">
                You can print this official enquiry slip and hand it over to the parent/visitor.
              </Typography>
            </Alert>
          )}

          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <CircularProgress size={40} sx={{ color: slipConfig.primaryColor }} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Generating Enquiry Slip...
              </Typography>
            </Box>
          ) : (
            /* Printable Dynamic Slip Container */
            <Box
              id="printable-enquiry-slip"
              sx={{
                p: { xs: 2, sm: 3 },
                bgcolor: '#ffffff',
                border: getBorderCss(),
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                fontFamily: slipConfig.fontFamily,
                color: '#1e293b',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '800px',
              }}
            >
              {/* Dynamically render sections in configured order & visibility */}
              {slipConfig.sections
                ?.filter((s) => s.visible)
                .map((section) => renderSection(section.key))}
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
            {onConvertToAdmission && enquiry?.status !== 3 && (
              <Button
                variant="outlined"
                color="success"
                startIcon={<ConvertIcon />}
                onClick={() => onConvertToAdmission(enquiry)}
                sx={{ mr: 1, fontWeight: 600 }}
              >
                Proceed to Admission
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
              disabled={loading || !enquiry}
              sx={{
                px: 2.5,
                fontWeight: 700,
                bgcolor: '#25D366',
                '&:hover': { bgcolor: '#128C7E' },
              }}
            >
              WhatsApp Slip
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={loading || !enquiry}
              sx={{
                px: 3,
                fontWeight: 700,
                bgcolor: slipConfig.primaryColor,
                '&:hover': { bgcolor: slipConfig.accentColor || slipConfig.primaryColor },
              }}
            >
              Print Enquiry Slip
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        recipientName={enquiry?.guardianName || enquiry?.studentName}
        recipientPhone={enquiry?.mobile}
        recipientRole={`Parent of ${enquiry?.studentName}`}
        moduleKey="enquiry"
        moduleTitle="Enquiry Slip (WhatsApp)"
        templateData={{
          ParentName: enquiry?.guardianName || 'Parent',
          StudentName: enquiry?.studentName || '',
          ClassName: enquiry?.className || '',
          EnquiryNo: enquiry?.enquiryNo || `ENQ-${enquiry?.id}`,
        }}
      />
    </>
  );
};

export default EnquirySlipModal;
