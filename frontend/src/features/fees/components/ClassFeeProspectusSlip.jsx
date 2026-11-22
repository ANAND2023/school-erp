import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';

export default function ClassFeeProspectusSlip({ summary }) {
  const { user, activeAcademicYearName } = useAuthStore();

  // Fetch branch information to ensure accurate letterhead details
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

  if (!summary) return null;

  const branch = branchRes || {};
  const schoolName = branch.schoolName || user?.schoolName || 'Delhi Public School';
  const branchName = branch.name || user?.branchName || '';
  const affiliationNo = branch.affiliationNumber || '';
  const fullAddress = [branch.address, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ') || user?.schoolAddress || '';
  const phone = branch.phone || user?.schoolPhone || '';
  const email = branch.email || user?.schoolEmail || '';
  const logoUrl = branch.logoUrl || user?.schoolLogoUrl || '/dvslogo1.jpeg';

  const validInstallments = (summary.installments || []).filter((i) => Number(i.totalAmount || 0) > 0);
  const totalScheduled = validInstallments.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

  return (
    <Box
      className="printable-slip"
      sx={{
        width: '100%',
        maxWidth: '820px',
        mx: 'auto',
        p: { xs: 2, sm: 2.5 },
        bgcolor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
        border: '1.5px solid #0284c7',
        borderRadius: 2,
        '@media print': {
          border: '1px solid #0284c7 !important',
          borderRadius: 0,
          p: '4mm 6mm !important',
          m: '0 auto !important',
          width: '100% !important',
          maxWidth: '100% !important',
          boxShadow: 'none !important',
          pageBreakInside: 'avoid !important',
          breakInside: 'avoid !important',
        },
      }}
    >
      {/* ================= 1. SCHOOL LETTERHEAD ================= */}
      <Box sx={{ borderBottom: '2px solid #0284c7', pb: 1.2, mb: 1.2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <img
              src={logoUrl}
              alt="School Logo"
              style={{
                width: 54,
                height: 54,
                objectFit: 'contain',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                padding: 2,
                backgroundColor: '#ffffff',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <Box>
              <Typography
                variant="h6"
                fontWeight={900}
                sx={{
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                  letterSpacing: '0.3px',
                  fontSize: '1.15rem',
                }}
              >
                {schoolName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3, flexWrap: 'wrap' }}>
                {branchName && (
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#0284c7', fontSize: '0.74rem' }}>
                    Campus: {branchName}
                  </Typography>
                )}
                {affiliationNo && (
                  <Typography variant="caption" fontWeight={600} sx={{ color: '#475569', fontSize: '0.72rem' }}>
                    • Affiliation: {affiliationNo}
                  </Typography>
                )}
              </Stack>
              {(fullAddress || phone) && (
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem', mt: 0.2 }}>
                  {[fullAddress, phone ? `Phone: ${phone}` : '', email].filter(Boolean).join(' | ')}
                </Typography>
              )}
            </Box>
          </Stack>

          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Box
              sx={{
                bgcolor: '#0284c7',
                color: '#ffffff',
                px: 1.4,
                py: 0.35,
                borderRadius: 1,
                display: 'inline-block',
                mb: 0.4,
              }}
            >
              <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 0.8, fontSize: '0.74rem', textTransform: 'uppercase' }}>
                Fee Prospectus Slip
              </Typography>
            </Box>
            <Typography variant="subtitle2" fontWeight={900} sx={{ color: '#0f172a', fontSize: '0.88rem', lineHeight: 1.2 }}>
              Class: {summary.className}
            </Typography>
            <Typography variant="caption" fontWeight={600} sx={{ color: '#475569', display: 'block', fontSize: '0.7rem' }}>
              Session: {activeAcademicYearName || '2026-2027'} • Date: {dayjs().format('DD-MMM-YYYY')}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ================= 2. KEY FEE HIGHLIGHTS ================= */}
      <Grid container spacing={1} sx={{ mb: 1.2 }}>
        <Grid item xs={3}>
          <Box sx={{ p: 0.8, bgcolor: '#f0f9ff', borderRadius: 1.2, border: '1px solid #bae6fd', textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={800} sx={{ color: '#0369a1', textTransform: 'uppercase', fontSize: '0.64rem', display: 'block' }}>
              Total Annual Fee
            </Typography>
            <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#0c4a6e', lineHeight: 1.2, fontSize: '1rem', mt: 0.1 }}>
              ₹{Number(summary.totalAnnualFee || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#0284c7', fontSize: '0.62rem' }}>
              Mandatory: ₹{Number(summary.totalMandatoryFee || 0).toLocaleString()}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box sx={{ p: 0.8, bgcolor: '#faf5ff', borderRadius: 1.2, border: '1px solid #e9d5ff', textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={800} sx={{ color: '#7e22ce', textTransform: 'uppercase', fontSize: '0.64rem', display: 'block' }}>
              One-Time / Admission
            </Typography>
            <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#581c87', lineHeight: 1.2, fontSize: '1rem', mt: 0.1 }}>
              ₹{Number(summary.totalOneTimeFee || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7e22ce', fontSize: '0.62rem' }}>
              Payable at admission
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box sx={{ p: 0.8, bgcolor: '#f0fdf4', borderRadius: 1.2, border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={800} sx={{ color: '#15803d', textTransform: 'uppercase', fontSize: '0.64rem', display: 'block' }}>
              Tuition & Recurring
            </Typography>
            <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#14532d', lineHeight: 1.2, fontSize: '1rem', mt: 0.1 }}>
              ₹{Number(summary.totalRecurringFee || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#15803d', fontSize: '0.62rem' }}>
              Spread across terms
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box sx={{ p: 0.8, bgcolor: '#fffbeb', borderRadius: 1.2, border: '1px solid #fde68a', textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={800} sx={{ color: '#b45309', textTransform: 'uppercase', fontSize: '0.64rem', display: 'block' }}>
              Optional / Extra
            </Typography>
            <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#78350f', lineHeight: 1.2, fontSize: '1rem', mt: 0.1 }}>
              ₹{Number(summary.totalOptionalFee || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#b45309', fontSize: '0.62rem' }}>
              If opted by parent
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* ================= 3. TWO-COLUMN TABLES ================= */}
      <Grid container spacing={1.2} alignItems="flex-start" sx={{ mb: 1 }}>
        {/* Left Column: Fee Components & Heads */}
        <Grid item xs={6.5}>
          <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 1.2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f1f5f9', px: 1.2, py: 0.5, borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight={900} sx={{ color: '#0f172a', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                1. Fee Components & Heads
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                Annual Breakup
              </Typography>
            </Box>
            <Table size="small" sx={{ '& td, & th': { py: 0.35, px: 0.8, fontSize: '0.71rem' } }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Component</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Nature</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#334155' }}>Amount (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(summary.heads || []).map((h) => (
                  <TableRow key={h.feeHeadId || h.feeHeadName} sx={{ '&:nth-of-type(even)': { bgcolor: '#fbfcfd' } }}>
                    <TableCell>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#0f172a', display: 'block', lineHeight: 1.15, fontSize: '0.71rem' }}>
                        {h.feeHeadName}
                      </Typography>
                      {h.feeHeadCode && (
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.61rem', display: 'block' }}>
                          Code: {h.feeHeadCode}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.67rem', color: '#475569' }}>
                      {h.feeHeadType === 'OneTime' ? 'One-Time' : 'Recurring'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 5px',
                          borderRadius: 3,
                          fontSize: '0.61rem',
                          fontWeight: 700,
                          backgroundColor: h.isOptional ? '#fef3c7' : '#e0f2fe',
                          color: h.isOptional ? '#92400e' : '#0369a1',
                        }}
                      >
                        {h.isOptional ? 'Optional' : 'Mandatory'}
                      </span>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(h.totalAnnualAmount || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '1.5px solid #94a3b8' }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 900, color: '#0f172a', fontSize: '0.74rem' }}>
                    TOTAL ANNUAL FEE
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: '#0284c7', fontSize: '0.82rem' }}>
                    ₹{Number(summary.totalAnnualFee || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          {/* Important Guidelines for Parents */}
          <Box sx={{ mt: 1, p: 0.8, bgcolor: '#f8fafc', borderRadius: 1.2, border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" fontWeight={900} sx={{ color: '#1e3a8a', textTransform: 'uppercase', display: 'block', fontSize: '0.67rem', mb: 0.2 }}>
              Important Parent Information:
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontSize: '0.64rem', lineHeight: 1.35 }}>
              • <strong>Payment Modes:</strong> Fee can be paid via UPI, Net Banking, Card, Cash or Cheque at the school accounts desk or online ERP.
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontSize: '0.64rem', lineHeight: 1.35 }}>
              • <strong>Due Dates:</strong> Regular monthly dues are payable on or before the 10th of respective month. Late fine applies post-grace period.
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontSize: '0.64rem', lineHeight: 1.35 }}>
              • <strong>Optional Services:</strong> Transport / activities fees are charged only upon enrollment.
            </Typography>
          </Box>
        </Grid>

        {/* Right Column: Installment Schedule & Due Dates */}
        <Grid item xs={5.5}>
          <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 1.2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f1f5f9', px: 1.2, py: 0.5, borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight={900} sx={{ color: '#0f172a', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                2. Installment Schedule
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                Due by 10th
              </Typography>
            </Box>
            <Table size="small" sx={{ '& td, & th': { py: 0.32, px: 0.7, fontSize: '0.7rem' } }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Installment</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Due Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#334155' }}>Amount (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {validInstallments.map((inst) => (
                  <TableRow key={inst.installmentId || inst.installmentName} sx={{ '&:nth-of-type(even)': { bgcolor: '#fbfcfd' } }}>
                    <TableCell sx={{ fontWeight: 600, color: '#0f172a', py: 0.3 }}>
                      {inst.installmentName}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.65rem', py: 0.3 }}>
                      {inst.dueDate ? dayjs(inst.dueDate).format('DD MMM YYYY') : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', py: 0.3 }}>
                      ₹{Number(inst.totalAmount || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '1.5px solid #94a3b8' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 900, color: '#0f172a', fontSize: '0.71rem' }}>
                    TOTAL SCHEDULED
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: '#0284c7', fontSize: '0.79rem' }}>
                    ₹{totalScheduled.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Grid>
      </Grid>

      {/* ================= 4. SIGNATURES ================= */}
      <Box sx={{ mt: 1.2, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
        <Grid container spacing={3} textAlign="center">
          <Grid item xs={4}>
            <Box sx={{ borderBottom: '1px solid #94a3b8', height: 22, mb: 0.4 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', fontSize: '0.68rem' }}>
              Parent / Guardian Signature
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ borderBottom: '1px solid #94a3b8', height: 22, mb: 0.4 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', fontSize: '0.68rem' }}>
              Admission Counselor / Accounts
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ borderBottom: '1px solid #94a3b8', height: 22, mb: 0.4 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', fontSize: '0.68rem' }}>
              Principal / Authorized Seal
            </Typography>
          </Grid>
        </Grid>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#94a3b8', fontSize: '0.61rem', mt: 0.8 }}>
          * Computer generated fee prospectus slip for admission enquiry. Valid for Academic Session {activeAcademicYearName || '2026-2027'}.
        </Typography>
      </Box>
    </Box>
  );
}
