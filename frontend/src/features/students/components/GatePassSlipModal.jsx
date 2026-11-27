import React, { useState, useRef } from 'react';
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
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
  ContentCut as CutIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import { printElement } from '../../../utils/printUtils';

/**
 * Compact Single Gate Pass Slip Component
 * Specifically budgeted to fit strictly within 1/2 of an A4 page (height <= 125mm)
 */
const SingleGatePassSlip = ({ pass, copyTitle = '', schoolInfo = {} }) => {
  const {
    schoolName = 'Delhi Public School',
    branchName = 'Main Campus',
    schoolAddress = '',
    schoolPhone = '',
    schoolLogoUrl = '/dvslogo1.jpeg',
  } = schoolInfo;

  return (
    <Box
      sx={{
        bgcolor: '#ffffff',
        border: '1.5px solid #0284c7',
        borderRadius: 1.5,
        p: '10px 14px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '@media print': {
          border: '1.5px solid #0284c7 !important',
          borderRadius: '4px !important',
          p: '6px 12px !important',
          boxShadow: 'none !important',
          pageBreakInside: 'avoid !important',
          breakInside: 'avoid !important',
        },
      }}
    >
      {/* 1. Header Row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ pb: 0.8, borderBottom: '1.5px solid #0284c7' }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <img
            src={schoolLogoUrl}
            alt="Logo"
            style={{
              width: 38,
              height: 38,
              objectFit: 'contain',
              borderRadius: 4,
              border: '1px solid #e2e8f0',
              padding: 2,
              backgroundColor: '#ffffff',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <Box>
            <Typography variant="subtitle2" fontWeight={900} sx={{ color: '#0f172a', textTransform: 'uppercase', lineHeight: 1.15, fontSize: '0.95rem' }}>
              {schoolName}
            </Typography>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              {branchName && (
                <Typography variant="caption" fontWeight={700} sx={{ color: '#0284c7', fontSize: '0.68rem' }}>
                  Branch: {branchName}
                </Typography>
              )}
              {schoolPhone && (
                <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.66rem' }}>
                  • Ph: {schoolPhone}
                </Typography>
              )}
            </Stack>
            {schoolAddress && (
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.64rem', lineHeight: 1.1 }}>
                {schoolAddress}
              </Typography>
            )}
          </Box>
        </Stack>

        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Box sx={{ bgcolor: '#0284c7', color: '#ffffff', px: 1, py: 0.25, borderRadius: 0.8, display: 'inline-block', mb: 0.2 }}>
            <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 0.5, fontSize: '0.68rem', textTransform: 'uppercase' }}>
              {copyTitle ? `GATE PASS (${copyTitle})` : 'STUDENT GATE PASS'}
            </Typography>
          </Box>
          <Typography variant="caption" fontWeight={800} sx={{ color: '#0f172a', display: 'block', fontSize: '0.74rem' }}>
            Pass No: <span style={{ fontFamily: 'monospace', color: '#0369a1' }}>{pass.gatePassNo}</span>
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.64rem' }}>
            Date: <strong>{dayjs(pass.passDate).format('DD MMM YYYY')}</strong>
          </Typography>
        </Box>
      </Stack>

      {/* 2. Timing Bar */}
      <Box
        sx={{
          my: 0.6,
          px: 1.2,
          py: 0.4,
          bgcolor: '#f8fafc',
          borderRadius: 1,
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
        }}
      >
        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.68rem' }}>
          🕒 Exit / Out Time: <strong style={{ color: '#0f172a' }}>{pass.outTime || 'N/A'}</strong>
        </Typography>
        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.68rem' }}>
          🚶 Expected Return: <strong style={{ color: '#0f172a' }}>{pass.expectedReturnTime || 'Will Not Return Today'}</strong>
        </Typography>
        {pass.actualReturnTime && (
          <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, fontSize: '0.68rem' }}>
            ✓ Returned: {pass.actualReturnTime}
          </Typography>
        )}
      </Box>

      {/* 3. Student & Escort Details Grid (Side by Side) */}
      <Grid container spacing={1} sx={{ mb: 0.6 }}>
        {/* Student Column */}
        <Grid item xs={6}>
          <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 1, p: 0.8, bgcolor: '#ffffff', height: '100%' }}>
            <Typography variant="caption" fontWeight={900} sx={{ color: '#0369a1', textTransform: 'uppercase', fontSize: '0.62rem', display: 'block', mb: 0.4 }}>
              Student Information
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                src={pass.photoUrl}
                variant="rounded"
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: '#0284c7',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 1,
                  border: '1px solid #bae6fd',
                }}
              >
                {pass.studentName?.charAt(0) || 'S'}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" fontWeight={800} sx={{ color: '#0f172a', display: 'block', fontSize: '0.74rem', lineHeight: 1.15 }} noWrap>
                  {pass.studentName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontSize: '0.64rem', lineHeight: 1.1 }}>
                  Adm: <strong>{pass.admissionNo || 'N/A'}</strong> | Class: <strong>{pass.className || 'N/A'} {pass.sectionName ? `(${pass.sectionName})` : ''}</strong>
                </Typography>
                {pass.fatherName && (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.62rem', lineHeight: 1.1 }}>
                    Father: {pass.fatherName}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.62rem', lineHeight: 1.1 }}>
                  Contact: {pass.fatherMobile || pass.emergencyContact || 'N/A'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>

        {/* Escort / Receiver Column */}
        <Grid item xs={6}>
          <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 1, p: 0.8, bgcolor: '#ffffff', height: '100%' }}>
            <Typography variant="caption" fontWeight={900} sx={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.62rem', display: 'block', mb: 0.4 }}>
              Accompanying / Picked Up By
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                src={pass.receiverPhotoUrl}
                variant="rounded"
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: '#475569',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 1,
                  border: '1px solid #cbd5e1',
                }}
              >
                <PersonIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" fontWeight={800} sx={{ color: '#0f172a', display: 'block', fontSize: '0.74rem', lineHeight: 1.15 }} noWrap>
                  {pass.receiverName || 'Self'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 700, display: 'block', fontSize: '0.64rem', lineHeight: 1.1 }}>
                  Relation: {pass.receiverRelation || 'Parent'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.62rem', lineHeight: 1.1 }}>
                  Phone: {pass.receiverContact || 'Not Specified'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.62rem', lineHeight: 1.1 }}>
                  Approved: {pass.approvedBy || 'School Office'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>
      </Grid>

      {/* 4. Reason & Remarks Box */}
      <Box sx={{ px: 1, py: 0.4, mb: 0.6, borderRadius: 1, border: '1px solid #e2e8f0', bgcolor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.65rem' }}>
          <strong>Reason for Early Exit:</strong> {pass.reason}
          {pass.reasonDetail ? ` (${pass.reasonDetail})` : ''}
          {pass.remarks ? ` • Note: ${pass.remarks}` : ''}
        </Typography>
      </Box>

      {/* 5. Signatures Row */}
      <Box sx={{ pt: 0.4, borderTop: '1px solid #cbd5e1' }}>
        <Grid container spacing={1} textAlign="center">
          <Grid item xs={3}>
            <Box sx={{ borderBottom: '1px solid #94a3b8', height: 16, mb: 0.2 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', fontSize: '0.62rem' }}>
              Student Sign
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ borderBottom: '1px solid #94a3b8', height: 16, mb: 0.2 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', fontSize: '0.62rem' }}>
              Parent / Escort Sign
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ borderBottom: '1px solid #94a3b8', height: 16, mb: 0.2 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', fontSize: '0.62rem' }}>
              Security Guard Sign
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ borderBottom: '1px solid #94a3b8', height: 16, mb: 0.2 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', fontSize: '0.62rem' }}>
              Principal / Seal
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* 6. Security Note */}
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#94a3b8', fontSize: '0.58rem', mt: 0.3 }}>
        * Security Note: Security guards must verify identity of the escort person before permitting the student to exit the campus gate.
      </Typography>
    </Box>
  );
};

export default function GatePassSlipModal({ open, onClose, pass, onStatusUpdate }) {
  const printRef = useRef(null);
  const { user } = useAuthStore();
  const [printFormat, setPrintFormat] = useState('single'); // 'single' (1/2 A4) or 'dual' (2 copies on 1 A4)

  const { data: branchRes } = useQuery({
    queryKey: ['current-branch-info'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/branches/current');
        return res?.data?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 15,
  });

  if (!pass) return null;

  const branch = branchRes || {};
  const schoolInfo = {
    schoolName: branch.schoolName || user?.schoolName || 'Delhi Public School',
    branchName: branch.name || user?.branchName || '',
    schoolAddress: [branch.address, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ') || user?.schoolAddress || '',
    schoolPhone: [branch.phone || user?.schoolPhone, branch.alternatePhone || user?.schoolAlternatePhone].filter(Boolean).join(', '),
    schoolLogoUrl: branch.logoUrl || user?.schoolLogoUrl || '/dvslogo1.jpeg',
  };

  const handlePrint = () => {
    printElement('gate-pass-print-area', {
      title: `GatePass_${pass.gatePassNo}_${pass.studentName || 'Student'}`,
      pageSize: 'A4',
      orientation: 'portrait',
      margin: '6mm',
    });
  };

  const getStatusColor = (st) => {
    switch (st?.toLowerCase()) {
      case 'issued':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' };
      case 'departed':
        return { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
      case 'returned':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const statusStyle = getStatusColor(pass.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        className="no-print"
        sx={{
          m: 0,
          p: 2,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#0f172a',
          color: '#ffffff',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <BadgeIcon sx={{ color: '#38bdf8' }} />
          <Typography variant="h6" fontWeight={700}>
            Student Gate Pass Slip
          </Typography>
          <Chip
            label={pass.status?.toUpperCase()}
            size="small"
            sx={{
              bgcolor: statusStyle.bg,
              color: statusStyle.text,
              border: `1px solid ${statusStyle.border}`,
              fontWeight: 800,
              fontSize: '0.72rem',
            }}
          />
        </Stack>
        <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: { xs: 2, sm: 2.5 },
          bgcolor: '#f8fafc',
          flex: '1 1 auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Layout Format Switcher (1/2 A4 vs 2 Copies on 1 A4) */}
        <Box
          className="no-print"
          sx={{
            mb: 2,
            p: 1.2,
            bgcolor: '#ffffff',
            borderRadius: 1.5,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" fontWeight={800} color="#0f172a">
              Print Format:
            </Typography>
            <Chip
              label="1/2 of A4 Sheet (Single Slip)"
              size="small"
              color={printFormat === 'single' ? 'primary' : 'default'}
              variant={printFormat === 'single' ? 'filled' : 'outlined'}
              onClick={() => setPrintFormat('single')}
              clickable
              sx={{ fontWeight: 800, fontSize: '0.72rem' }}
            />
            <Chip
              label="2 Copies / A4 Sheet (Gate + Parent)"
              size="small"
              color={printFormat === 'dual' ? 'primary' : 'default'}
              variant={printFormat === 'dual' ? 'filled' : 'outlined'}
              onClick={() => setPrintFormat('dual')}
              clickable
              sx={{ fontWeight: 800, fontSize: '0.72rem' }}
            />
          </Stack>

          <Typography variant="caption" color="#64748b">
            {printFormat === 'single'
              ? '• Compact 1/2 A4 size (leaves bottom half clean to cut)'
              : '• 2 copies on 1 A4 sheet (Gate Copy + Student Copy)'}
          </Typography>
        </Box>

        {/* Printable Pass Container */}
        <Box
          id="gate-pass-print-area"
          ref={printRef}
          className="printable-slip"
          sx={{
            bgcolor: '#ffffff',
            maxWidth: 780,
            mx: 'auto',
            boxShadow: 'none',
            '@media print': {
              boxShadow: 'none !important',
              p: 0,
              m: '0 auto !important',
              maxWidth: '100% !important',
              width: '100% !important',
            },
          }}
        >
          {printFormat === 'single' ? (
            <>
              {/* Single Slip (Strictly <= 125mm in height, occupying 1/2 of A4 page) */}
              <SingleGatePassSlip pass={pass} schoolInfo={schoolInfo} />

              {/* Dotted Cut Guide for Half A4 (visible on print/screen) */}
              <Box
                sx={{
                  mt: 1.5,
                  textAlign: 'center',
                  borderTop: '1px dashed #cbd5e1',
                  color: '#94a3b8',
                  fontSize: '0.62rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.8,
                  py: 0.5,
                }}
              >
                <span>✂</span>
                <span>Cut along this line (1/2 of A4 Sheet)</span>
              </Box>
            </>
          ) : (
            <>
              {/* Top Half: Gate Security Copy */}
              <SingleGatePassSlip pass={pass} copyTitle="GATE SECURITY COPY" schoolInfo={schoolInfo} />

              {/* Middle Scissor Divider Line */}
              <Box
                sx={{
                  my: 1.2,
                  textAlign: 'center',
                  borderTop: '1.5px dashed #94a3b8',
                  color: '#64748b',
                  fontSize: '0.62rem',
                  letterSpacing: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  py: 0.4,
                }}
              >
                <span>✂</span>
                <span style={{ fontWeight: 700 }}>CUT ALONG THIS LINE (HALF A4)</span>
                <span>✂</span>
              </Box>

              {/* Bottom Half: Parent / Escort Copy */}
              <SingleGatePassSlip pass={pass} copyTitle="PARENT / ESCORT COPY" schoolInfo={schoolInfo} />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions className="no-print" sx={{ p: 2, flexShrink: 0, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1}>
          {pass.status?.toLowerCase() === 'issued' && (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={() => onStatusUpdate && onStatusUpdate(pass.id, 'Departed')}
            >
              Mark Departed (Out)
            </Button>
          )}
          {pass.status?.toLowerCase() === 'departed' && (
            <Button
              variant="outlined"
              color="success"
              size="small"
              onClick={() => onStatusUpdate && onStatusUpdate(pass.id, 'Returned')}
            >
              Mark Returned
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={onClose} color="inherit">
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ fontWeight: 700 }}
          >
            {printFormat === 'single' ? 'Print 1/2 A4 Slip' : 'Print 2 Copies / Sheet'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
