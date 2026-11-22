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
  Divider,
} from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import { printWithTitle } from '../../../utils/printUtils';

export const AdmissionSlipModal = ({ open, onClose, slip, branchInfo = {} }) => {
  if (!slip) return null;

  const handlePrint = () => {
    printWithTitle(`Admission_Slip_${slip.slipNumber}_${slip.studentName}`);
  };

  const schoolName = branchInfo.schoolName || 'DELHI PUBLIC SCHOOL';
  const branchName = branchInfo.branchName || 'Main Campus';
  const schoolAddress = branchInfo.address || 'Knowledge Park, Educational Zone';
  const schoolPhone = branchInfo.phone || '+91 9873993957';
  const logoUrl = '/dvslogo1.jpeg';

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
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span>Admission Registration Slip</span>
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

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          id="printable-admission-slip"
          sx={{
            border: '2px solid #0284c7',
            borderRadius: 2,
            p: 3,
            bgcolor: '#ffffff',
            color: '#0f172a',
            fontFamily: 'Inter, sans-serif',
            '@media print': {
              border: '2px solid #0284c7 !important',
              p: '15mm !important',
              m: 0,
            },
          }}
        >
          {/* Header */}
          <Box sx={{ borderBottom: '2px solid #0284c7', pb: 2, mb: 2 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={2} sx={{ textAlign: 'center' }}>
                <img
                  src={logoUrl}
                  alt="School Logo"
                  style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8 }}
                />
              </Grid>
              <Grid item xs={7}>
                <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a', textTransform: 'uppercase' }}>
                  {schoolName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 700, display: 'block' }}>
                  Branch / Campus: {branchName} &bull; Ph: {schoolPhone}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  {schoolAddress}
                </Typography>
              </Grid>
              <Grid item xs={3} sx={{ textAlign: 'right' }}>
                <Box
                  sx={{
                    bgcolor: '#0284c7',
                    color: '#ffffff',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    display: 'inline-block',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="caption" fontWeight={900} sx={{ textTransform: 'uppercase' }}>
                    Admission Slip
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={800}>
                  Slip No: <span style={{ color: '#0284c7' }}>{slip.slipNumber}</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  Session: <strong>{slip.academicYearName || '2026-2027'}</strong>
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Student Info Grid */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0284c7', textTransform: 'uppercase', mb: 1 }}>
            Candidate & Admission Details
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2, bgcolor: '#f8fafc', p: 2, borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Student Full Name</Typography>
              <Typography variant="subtitle2" fontWeight={800}>{slip.studentName}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Seeking Class</Typography>
              <Typography variant="subtitle2" fontWeight={800}>{slip.className}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Gender</Typography>
              <Typography variant="subtitle2" fontWeight={800}>{slip.gender || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Father's Name</Typography>
              <Typography variant="subtitle2" fontWeight={800}>{slip.fatherName || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Mother's Name</Typography>
              <Typography variant="subtitle2" fontWeight={800}>{slip.motherName || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Primary Mobile Number</Typography>
              <Typography variant="subtitle2" fontWeight={800}>{slip.contactNumber}</Typography>
            </Grid>
            {slip.address && (
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Residential Address</Typography>
                <Typography variant="body2">{slip.address}</Typography>
              </Grid>
            )}
          </Grid>

          {/* Fee & Payment Ledger */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0284c7', textTransform: 'uppercase', mb: 1 }}>
            Application Fee & Payment Breakdown
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={4}>
              <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1.5, border: '1px solid #bae6fd', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 800 }}>Total Fee Amount</Typography>
                <Typography variant="h6" fontWeight={900} sx={{ color: '#0c4a6e' }}>₹{slip.feeAmount}</Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800 }}>Paid Amount</Typography>
                <Typography variant="h6" fontWeight={900} sx={{ color: '#14532d' }}>₹{slip.paidAmount}</Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ p: 1.5, bgcolor: '#fef2f2', borderRadius: 1.5, border: '1px solid #fecaca', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800 }}>Pending Balance</Typography>
                <Typography variant="h6" fontWeight={900} sx={{ color: '#991b1b' }}>₹{slip.balanceAmount}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Payment Transactions Record */}
          {slip.payments && slip.payments.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#475569', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                Payment Receipts Record:
              </Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Receipt No</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Mode</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Txn Ref</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {slip.payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700 }}>{p.receiptNumber}</td>
                      <td style={{ padding: '6px 10px' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td style={{ padding: '6px 10px' }}>{p.paymentMode}</td>
                      <td style={{ padding: '6px 10px' }}>{p.transactionReference || '-'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        ₹{p.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}

          {/* Footer Signature */}
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px dashed #94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                Issued on: <strong>{new Date(slip.createdOn).toLocaleString()}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                * This slip is a verified system-generated registration record.
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 160 }}>
              <Box sx={{ borderBottom: '1px solid #334155', height: 28, mb: 0.5 }} />
              <Typography variant="caption" fontWeight={800} sx={{ color: '#0f172a' }}>
                Authorized Signature & Seal
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Close
        </Button>
        <Button onClick={handlePrint} variant="contained" color="primary" startIcon={<PrintIcon />}>
          Print Admission Slip
        </Button>
      </DialogActions>
    </Dialog>
  );
};
