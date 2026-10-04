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
} from '@mui/icons-material';
import dayjs from 'dayjs';
import apiClient from '../../../api/client';
import { enquiryApi } from '../api';
import { branchApi } from '../../masters/api';
import { useAuthStore } from '../../../store/authStore';
import { printWithTitle } from '../../../utils/printUtils';

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

      try {
        const curRes = await apiClient.get('/branches/current');
        if (isMounted && curRes.data?.success && curRes.data?.data) {
          setBranchInfo(curRes.data.data);
        } else {
          const bRes = await branchApi.getBranches();
          if (isMounted && bRes.data?.success && Array.isArray(bRes.data.data)) {
            const matchedBranch = bRes.data.data.find(b => b.id === (user?.branchId || 1)) || bRes.data.data[0];
            setBranchInfo(matchedBranch);
          }
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
  }, [open, enquiryId, initialEnquiryData, user?.branchId]);

  const handlePrint = () => {
    const sName = enquiry?.studentName || 'Student';
    const num = enquiry?.enquiryNo || (enquiry?.id ? `ENQ-${enquiry.id}` : 'ENQ');
    printWithTitle(`Enquiry_Slip_${sName}_${num}`);
  };

  if (!open) return null;

  const yearStr = dayjs(enquiry?.createdOn || new Date()).format('YYYY');
  const enqNum = enquiry?.id ? `ENQ-${yearStr}-${String(enquiry.id).padStart(4, '0')}` : 'ENQ-NEW';
  const enquiryDate = enquiry?.createdOn ? dayjs(enquiry.createdOn).format('DD MMM YYYY, hh:mm A') : dayjs().format('DD MMM YYYY, hh:mm A');
  const nextFollowup = enquiry?.nextFollowupDate ? dayjs(enquiry.nextFollowupDate).format('DD MMM YYYY') : 'Not Scheduled';

  const schoolName = branchInfo?.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branchInfo?.name ? `${branchInfo.name} Branch` : (user?.branchName || 'Main Campus');
  const branchAddress = branchInfo?.address || 'Sector 12, RK Puram, New Delhi - 110022';
  const branchPhone = branchInfo?.phone || '+91 11 2617 8900';
  const branchEmail = branchInfo?.email || 'admissions@dpsdelhi.edu.in';
  const affiliationNo = branchInfo?.affiliationNo || '2130892';

  const getStatusLabel = (status) => {
    switch (Number(status)) {
      case 1: return { text: 'Open / Under Review', color: '#0284c7' };
      case 2: return { text: 'In Follow-up', color: '#d97706' };
      case 3: return { text: 'Converted to Admission', color: '#16a34a' };
      case 4: return { text: 'Closed', color: '#64748b' };
      default: return { text: 'Active', color: '#0284c7' };
    }
  };

  const statusInfo = getStatusLabel(enquiry?.status || 1);

  return (
    <>
      {/* FULL A4 PAGE PRINT CSS */}
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          @media print {
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden !important;
            }
            #printable-enquiry-slip, #printable-enquiry-slip * {
              visibility: visible !important;
            }
            #printable-enquiry-slip {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: calc(297mm - 16mm) !important;
              max-height: calc(297mm - 16mm) !important;
              margin: 0 !important;
              padding: 14px 18px !important;
              border: 2.5px solid #0f766e !important;
              border-radius: 4px !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isNew ? (
              <CheckIcon sx={{ color: 'teal', fontSize: 28 }} />
            ) : (
              <SchoolIcon sx={{ color: 'teal', fontSize: 28 }} />
            )}
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                {isNew ? 'Enquiry Registered Successfully!' : 'Admission Enquiry Slip'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Official Visitor Acknowledgement & Follow-up Lead Slip (Full A4 Page Format)
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
                You can print this official full-page enquiry slip and hand it over to the parent/visitor.
              </Typography>
            </Alert>
          )}

          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <CircularProgress size={40} sx={{ color: 'teal' }} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Generating Enquiry Slip...
              </Typography>
            </Box>
          ) : (
            /* Printable Enquiry Slip Container (Full A4 Page Layout) */
            <Box
              id="printable-enquiry-slip"
              sx={{
                p: { xs: 2, sm: 3 },
                bgcolor: '#ffffff',
                border: '2px solid #0f766e',
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
              <Box sx={{ textAlign: 'center', pb: 1, borderBottom: '2px double #0f766e' }}>
                <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                  {branchInfo?.logoUrl ? (
                    <Box
                      component="img"
                      src={branchInfo.logoUrl}
                      alt="Logo"
                      sx={{
                        width: 52,
                        height: 52,
                        objectFit: 'contain',
                        borderRadius: 1,
                      }}
                    />
                  ) : (
                    <SchoolIcon sx={{ fontSize: 38, color: '#0f766e' }} />
                  )}
                  <Box>
                    <Typography
                      variant="h4"
                      fontWeight={900}
                      sx={{ color: '#0f766e', letterSpacing: 1.2, fontSize: '1.6rem', lineHeight: 1.15 }}
                    >
                      {branchInfo?.printHeader || schoolName}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {branchName} &bull; Affiliated to CBSE, New Delhi (Affiliation No: {affiliationNo})
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block', mt: 0.3 }}>
                  Address: {branchAddress} | Helpline: {branchPhone} | Email: {branchEmail}
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    display: 'inline-block',
                    px: 3,
                    py: 0.4,
                    bgcolor: '#0f766e',
                    color: '#ffffff',
                    borderRadius: 1,
                    fontWeight: 700,
                    letterSpacing: 1,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Visitor & Admission Enquiry Slip
                </Box>
              </Box>

              {/* Enquiry Quick Meta Bar */}
              <Box
                sx={{
                  my: 1.2,
                  p: 1.2,
                  bgcolor: '#f0fdfa',
                  borderRadius: 1.5,
                  border: '1.5px solid #99f6e4',
                }}
              >
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>
                      ENQUIRY REF. NO
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f766e" sx={{ fontSize: '0.98rem' }}>
                      {enqNum}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>
                      DATE & TIME
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.88rem' }}>
                      {enquiryDate}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>
                      ENQUIRY SOURCE
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.88rem' }}>
                      {enquiry?.source || 'Walk-in Visit'}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>
                      CURRENT STATUS
                    </Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ color: statusInfo.color, fontSize: '0.88rem' }}>
                      {statusInfo.text}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Section 1: Candidate & Parent Information */}
              <Box sx={{ mb: 1.2 }}>
                <Box
                  sx={{
                    bgcolor: '#ccfbf1',
                    px: 1.2,
                    py: 0.35,
                    borderRadius: 0.8,
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    color: '#115e59',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    mb: 1,
                  }}
                >
                  1. Prospective Student & Guardian Information
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Candidate / Student Name:</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ color: '#0f172a', textTransform: 'uppercase', fontSize: '0.92rem' }}>
                      {enquiry?.studentName || '—'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Seeking Admission to Class:</Typography>
                    <Typography variant="body1" fontWeight={800} color="primary.main" sx={{ fontSize: '0.92rem' }}>
                      {enquiry?.className || `Class ID: ${enquiry?.classId || '—'}`}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Father / Guardian Name:</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                      {enquiry?.guardianName || '—'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Primary Contact Mobile:</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                      {enquiry?.mobile || '—'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Email Address:</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {enquiry?.email || '—'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Academic Session:</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.82rem' }}>
                      {enquiry?.academicYearName || activeAcademicYearName || user?.academicYearName || '2026-27'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Section 2: Discussion Notes & Next Follow-up */}
              <Box sx={{ mb: 1.2 }}>
                <Box
                  sx={{
                    bgcolor: '#ccfbf1',
                    px: 1.2,
                    py: 0.35,
                    borderRadius: 0.8,
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    color: '#115e59',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    mb: 1,
                  }}
                >
                  2. Discussion Notes & Scheduled Follow-up
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={8}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Counselor Notes / Inquiries Raised:</Typography>
                    <Box
                      sx={{
                        p: 1.2,
                        minHeight: 46,
                        bgcolor: '#fafafa',
                        border: '1px solid #e2e8f0',
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        lineHeight: 1.35,
                      }}
                    >
                      {enquiry?.notes || 'Enquired about syllabus, fee structure, and school transport facility.'}
                    </Box>
                  </Grid>

                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Next Follow-up / Visit Date:</Typography>
                    <Box
                      sx={{
                        p: 1.2,
                        bgcolor: '#f0fdfa',
                        border: '1px solid #5eead4',
                        borderRadius: 1,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={800} color="#0f766e" sx={{ fontSize: '0.92rem' }}>
                        {nextFollowup}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Section 3: Essential Documents Checklist for Admission */}
              <Box sx={{ mb: 1.2 }}>
                <Box
                  sx={{
                    bgcolor: '#ccfbf1',
                    px: 1.2,
                    py: 0.35,
                    borderRadius: 0.8,
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    color: '#115e59',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    mb: 0.8,
                  }}
                >
                  3. Documents Required at the Time of Admission
                </Box>

                <Grid container spacing={0.8}>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ marginRight: 6, color: '#0f766e', fontWeight: 900 }}>&#x2714;</span> 1. Original Birth Certificate (Municipal Corp / Gram Panchayat)
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ marginRight: 6, color: '#0f766e', fontWeight: 900 }}>&#x2714;</span> 2. Student & Parents' Aadhaar Cards (Photocopies)
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ marginRight: 6, color: '#0f766e', fontWeight: 900 }}>&#x2714;</span> 3. Transfer Certificate (TC) from Previous School (Countersigned)
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ marginRight: 6, color: '#0f766e', fontWeight: 900 }}>&#x2714;</span> 4. Previous Year Academic Marksheet / Report Card
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ marginRight: 6, color: '#0f766e', fontWeight: 900 }}>&#x2714;</span> 5. 4 Passport-size Photographs of Student & 2 of Parents
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ marginRight: 6, color: '#0f766e', fontWeight: 900 }}>&#x2714;</span> 6. Valid Address Proof (Electricity Bill / Voter ID / Passport)
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Office Guidelines Note */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px dashed #0f766e', borderRadius: 1, bgcolor: '#f0fdfa' }}>
                <Typography variant="caption" fontWeight={700} color="#0f766e" display="block" sx={{ fontSize: '0.72rem', mb: 0.2 }}>
                  IMPORTANT INSTRUCTIONS FOR PARENTS:
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem', lineHeight: 1.3 }}>
                  &bull; Admissions are processed on a first-come, first-served basis subject to seat availability in the sought class.<br />
                  &bull; School admission desk is operational from Monday to Saturday, 9:00 AM to 2:00 PM.<br />
                  &bull; For any enquiry queries or admission confirmation, please quote Reference Number: <strong>{enqNum}</strong>.
                </Typography>
              </Box>

              {/* Official Signatures Row */}
              <Grid container spacing={3} sx={{ mt: 1, pt: 1 }}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: 35 }} />
                  <Divider sx={{ mb: 0.6, borderColor: '#475569' }} />
                  <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.74rem' }}>
                    Parent / Visitor Signature
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem' }}>
                    Date: {dayjs().format('DD-MM-YYYY')}
                  </Typography>
                </Grid>

                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: 35 }} />
                  <Divider sx={{ mb: 0.6, borderColor: '#475569' }} />
                  <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.74rem' }}>
                    Admission Counselor / Dealing Clerk
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem' }}>
                    Front-Desk Verification
                  </Typography>
                </Grid>

                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ height: 38, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {(branchInfo?.principalSignatureUrl || branchInfo?.authorizedSignatureUrl) ? (
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
                  <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.74rem' }}>
                    Principal / Authorized Signatory
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem' }}>
                    Official School Verification
                  </Typography>
                </Grid>
              </Grid>

              {/* Footer Note */}
              <Box sx={{ mt: 1.5, textAlign: 'center', borderTop: '1px solid #e2e8f0', pt: 0.6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem' }}>
                  Generated from DVS ERP (Digital Vidya Sarthi) on {dayjs().format('DD MMM YYYY, hh:mm A')} &bull; Official Enquiry Acknowledgement Slip
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
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={loading || !enquiry}
              sx={{ px: 3, fontWeight: 700, bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
            >
              Print Enquiry Slip
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnquirySlipModal;
