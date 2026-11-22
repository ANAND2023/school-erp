import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
} from '@mui/material';
import {
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { printElement } from '../../../utils/printUtils';

export const AdmissionSlipModal = ({ open, onClose, slip, branchInfo = {} }) => {
  if (!slip) return null;

  const schoolName = branchInfo.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branchInfo.branchName || 'Main Campus';
  const schoolAddress = branchInfo.address || 'Knowledge Park, Educational Zone';
  const schoolPhone = branchInfo.phone || '+91 9873993957';
  const logoUrl = '/dvslogo1.jpeg';

  const handlePrint = () => {
    printElement('printable-admission-slip', {
      title: `Registration_Slip_${slip.slipNumber}_${slip.studentName}`,
      margin: '6mm',
    });
  };

  const handleShareWhatsApp = () => {
    const rawNumber = slip.contactNumber ? String(slip.contactNumber).replace(/\D/g, '') : '';
    const phone = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
    const msg = `*STUDENT REGISTRATION SLIP - ${schoolName}*\n\nDear Parent/Student,\nRegistration has been successfully generated!\n\n*Slip No:* ${slip.slipNumber}\n*Student Name:* ${slip.studentName}\n*Class:* ${slip.className}\n*Registration Fee:* Rs. ${slip.feeAmount}\n*Paid Amount:* Rs. ${slip.paidAmount}\n*Balance Due:* Rs. ${slip.balanceAmount}\n*Payment Status:* ${slip.paymentStatus}\n\nThank you for choosing ${schoolName}!`;
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 900,
          bgcolor: '#0284c7',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.2,
          px: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span>Student Registration Slip</span>
          <Chip
            label={slip.slipNumber}
            size="small"
            sx={{ bgcolor: '#ffffff', color: '#0284c7', fontWeight: 800 }}
          />
        </Box>
        <Chip
          label={slip.paymentStatus}
          size="small"
          color={slip.paymentStatus === 'Paid' ? 'success' : slip.paymentStatus === 'Partial' ? 'warning' : 'error'}
          sx={{ fontWeight: 800 }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#f8fafc' }}>
        {/* Printable 1/3 A4 Compact Slip Container */}
        <Box
          id="printable-admission-slip"
          sx={{
            width: '100%',
            maxWidth: '780px',
            mx: 'auto',
            bgcolor: '#ffffff',
            border: '2px solid #0284c7',
            borderRadius: 2,
            p: 2,
            boxSizing: 'border-box',
            fontFamily: 'Inter, -apple-system, sans-serif',
            color: '#0f172a',
            '@media print': {
              width: '100% !important',
              maxWidth: '100% !important',
              border: '1.5px solid #0284c7 !important',
              borderRadius: '0 !important',
              p: '5mm 8mm !important',
              m: '0 auto !important',
              boxShadow: 'none !important',
              pageBreakInside: 'avoid !important',
              breakInside: 'avoid !important',
            },
          }}
        >
          {/* Header Row: School Branding + Logo + Slip Title */}
          <Box sx={{ borderBottom: '2px solid #0284c7', pb: 1, mb: 1.2 }}>
            <Grid container alignItems="center" spacing={1.5}>
              <Grid item xs={2} sx={{ textAlign: 'center' }}>
                <img
                  src={logoUrl}
                  alt="School Logo"
                  style={{
                    width: 52,
                    height: 52,
                    objectFit: 'contain',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    padding: 2,
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </Grid>
              <Grid item xs={6.5}>
                <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#0f172a', textTransform: 'uppercase', lineHeight: 1.15, fontSize: '1.05rem' }}>
                  {schoolName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 700, display: 'block', fontSize: '0.72rem' }}>
                  Branch: {branchName} &bull; Ph: {schoolPhone}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem', lineHeight: 1.1 }}>
                  {schoolAddress}
                </Typography>
              </Grid>
              <Grid item xs={3.5} sx={{ textAlign: 'right' }}>
                <Box
                  sx={{
                    bgcolor: '#0284c7',
                    color: '#ffffff',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.8,
                    display: 'inline-block',
                    mb: 0.3,
                  }}
                >
                  <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 0.5, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                    Registration Slip
                  </Typography>
                </Box>
                <Typography variant="caption" fontWeight={800} sx={{ display: 'block', color: '#0f172a', fontSize: '0.76rem' }}>
                  Reg Slip No: <span style={{ color: '#0284c7', fontFamily: 'monospace' }}>{slip.slipNumber}</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                  Session: <strong>{slip.academicYearName || '2026-2027'}</strong>
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Student Info Compact Grid */}
          <Box sx={{ bgcolor: '#f8fafc', p: 1.2, borderRadius: 1.2, border: '1px solid #e2e8f0', mb: 1.2 }}>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Student Name</Typography>
                <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.84rem' }}>{slip.studentName}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Seeking Class</Typography>
                <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.84rem' }}>{slip.className}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Mobile Number</Typography>
                <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.84rem' }}>{slip.contactNumber}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Father's Name</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{slip.fatherName || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Mother's Name</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{slip.motherName || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Gender / DOB</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                  {slip.gender || 'N/A'} {slip.dob ? `(${new Date(slip.dob).toLocaleDateString()})` : ''}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Fee & Payment Breakdown Compact Row */}
          <Grid container spacing={1} sx={{ mb: 1.2 }}>
            <Grid item xs={4}>
              <Box sx={{ p: 0.8, bgcolor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 800, fontSize: '0.65rem' }}>Registration Fee</Typography>
                <Typography variant="subtitle2" fontWeight={900} sx={{ color: '#0c4a6e', fontSize: '0.92rem' }}>₹{slip.feeAmount}</Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ p: 0.8, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, fontSize: '0.65rem' }}>Paid Amount</Typography>
                <Typography variant="subtitle2" fontWeight={900} sx={{ color: '#14532d', fontSize: '0.92rem' }}>₹{slip.paidAmount}</Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ p: 0.8, bgcolor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800, fontSize: '0.65rem' }}>Balance Due</Typography>
                <Typography variant="subtitle2" fontWeight={900} sx={{ color: '#991b1b', fontSize: '0.92rem' }}>₹{slip.balanceAmount}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Footer Signature Strip */}
          <Box sx={{ pt: 1, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', display: 'block' }}>
                Date: <strong>{new Date(slip.createdOn).toLocaleDateString()}</strong> &bull; Status: <strong>{slip.paymentStatus}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.62rem' }}>
                * Official verified admission registration slip.
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 140 }}>
              <Box sx={{ borderBottom: '1px solid #0f172a', height: 20, mb: 0.3 }} />
              <Typography variant="caption" fontWeight={800} sx={{ color: '#0f172a', fontSize: '0.68rem' }}>
                Authorized Seal & Signature
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" size="small">
          Close
        </Button>
        <Button
          onClick={handleShareWhatsApp}
          variant="contained"
          sx={{ bgcolor: '#25D366', color: '#ffffff', '&:hover': { bgcolor: '#128C7E' }, fontWeight: 700, textTransform: 'none' }}
          size="small"
          startIcon={<WhatsAppIcon />}
        >
          Share on WhatsApp
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          size="small"
          startIcon={<PrintIcon />}
          sx={{ fontWeight: 800, textTransform: 'none' }}
        >
          Print Slip (1/3 A4)
        </Button>
      </DialogActions>
    </Dialog>
  );
};
