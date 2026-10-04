import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  ReceiptLong as ReceiptIcon,
  CalendarMonth as CalendarIcon,
  PointOfSale as CollectIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { feesApi } from '../api';

export const StudentFeeHistoryModal = ({
  open,
  onClose,
  studentId,
  onPrintReceipt,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const {
    data: historyRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['fee-student-history', studentId],
    queryFn: () => feesApi.getStudentFullHistory(studentId),
    enabled: Boolean(open && studentId),
  });

  const history = historyRes?.data?.data || null;

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2.5, minHeight: '75vh' } }}>
      {/* Header Banner */}
      <DialogTitle sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={history?.photoUrl}
              sx={{
                width: 44,
                height: 44,
                bgcolor: '#eff6ff',
                color: '#2563eb',
                fontWeight: 800,
                fontSize: 16,
                border: '2px solid #bfdbfe',
              }}
            >
              {history?.studentName ? history.studentName.charAt(0).toUpperCase() : <PersonIcon />}
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  {history?.studentName || 'Loading Student...'}
                </Typography>
                {history?.admissionNo && (
                  <Chip
                    label={history.admissionNo}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                  />
                )}
                {history?.rollNo && (
                  <Chip
                    label={`Roll: ${history.rollNo}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                  />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                Class: <b>{history?.className || '—'} - {history?.sectionName || '—'}</b> | Guardian: <b>{history?.guardianName || '—'}</b> ({history?.guardianMobile || '—'}) | Session: <b>{history?.academicSession || '2026-27'}</b>
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading complete student fee history...
            </Typography>
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error?.response?.data?.message || 'Failed to load student fee history.'}
          </Alert>
        ) : !history ? (
          <Alert severity="info" sx={{ my: 2 }}>
            No fee dues or payment records found for this student.
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {/* 5 Financial Metric Cards */}
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={2.4}>
                <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    Total Annual Fee
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.15rem', mt: 0.5 }}>
                    ₹{Number(history.totalAnnualFee || 0).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={2.4}>
                <Paper sx={{ p: 1.5, bgcolor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#7e22ce' }} fontWeight={600} display="block">
                    Concession Applied
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#7e22ce', fontSize: '1.15rem', mt: 0.5 }}>
                    - ₹{Number(history.totalAnnualConcession || 0).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={2.4}>
                <Paper sx={{ p: 1.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#1e40af' }} fontWeight={600} display="block">
                    Net Annual Payable
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#1d4ed8', fontSize: '1.15rem', mt: 0.5 }}>
                    ₹{Number(history.netAnnualPayable || 0).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={2.4}>
                <Paper sx={{ p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#166534' }} fontWeight={600} display="block">
                    Total Amount Paid
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#16a34a', fontSize: '1.15rem', mt: 0.5 }}>
                    ₹{Number(history.totalAnnualPaid || 0).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={2.4}>
                <Paper sx={{ p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#991b1b' }} fontWeight={600} display="block">
                    Outstanding Dues
                  </Typography>
                  <Typography variant="h6" fontWeight={900} sx={{ color: '#dc2626', fontSize: '1.15rem', mt: 0.5 }}>
                    ₹{Number(history.totalOutstandingDues || 0).toLocaleString()}
                  </Typography>
                  {history.totalFine > 0 && (
                    <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 700, fontSize: 10 }}>
                      +₹{history.totalFine} Fine
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Sub-Tabs: Month Breakdown vs Payment Receipts */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
                <Tab
                  icon={<CalendarIcon fontSize="small" />}
                  iconPosition="start"
                  label={`Academic Month Breakdown (${history.installments?.length || 0})`}
                  sx={{ fontWeight: 700 }}
                />
                <Tab
                  icon={<ReceiptIcon fontSize="small" />}
                  iconPosition="start"
                  label={`Payment Receipts & Ledger (${history.receipts?.length || 0})`}
                  sx={{ fontWeight: 700 }}
                />
              </Tabs>
            </Box>

            {/* TAB 0: Academic Months Breakdown */}
            {activeTab === 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Month / Installment</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fee Heads & Breakdown</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total Fee</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Concession</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Net Payable</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Paid</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining Due</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.installments?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No fee installments configured for this student.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.installments.map((m) => (
                        <TableRow key={m.installmentId} hover>
                          <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {m.installmentName}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {m.dueDate ? dayjs(m.dueDate).format('DD MMM YYYY') : '—'}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                              {m.feeHeads?.map((h) => (
                                <Chip
                                  key={h.dueId}
                                  label={`${h.feeHeadName}: ₹${h.originalAmount.toLocaleString()}${
                                    h.concessionAmount > 0 ? ` (-₹${h.concessionAmount})` : ''
                                  }${h.balanceAmount <= 0 ? ' ✓' : ` (Due: ₹${h.balanceAmount})`}`}
                                  size="small"
                                  color={h.balanceAmount <= 0 ? "success" : h.paidAmount > 0 ? "warning" : "default"}
                                  variant="outlined"
                                  sx={{ fontSize: 10.5, height: 20 }}
                                />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹{m.totalOriginal.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#7e22ce', fontWeight: 600 }}>
                            {m.totalConcession > 0 ? `-₹${m.totalConcession.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            ₹{m.netPayable.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#16a34a', fontWeight: 700 }}>
                            ₹{m.totalPaid.toLocaleString()}
                          </TableCell>
                          <TableCell align="right" sx={{ color: m.balanceDue > 0 ? '#dc2626' : 'text.secondary', fontWeight: 800 }}>
                            ₹{m.balanceDue.toLocaleString()}
                            {m.fineAmount > 0 && (
                              <Typography variant="caption" sx={{ color: '#dc2626', display: 'block', fontSize: 10 }}>
                                +₹{m.fineAmount} Fine
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={m.status.toUpperCase()}
                              size="small"
                              color={
                                m.status === 'Paid'
                                  ? 'success'
                                  : m.status === 'Partial'
                                  ? 'warning'
                                  : 'error'
                              }
                              sx={{ fontWeight: 700, height: 22, fontSize: 10.5 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 1: Payment Receipts & Ledger */}
            {activeTab === 1 && (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Receipt No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Receipt Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Payment Modes</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Credited Fee Heads</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Paid</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Collected By</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.receipts?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No fee payments recorded yet for this student.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.receipts.map((r) => (
                        <TableRow key={r.receiptId} hover>
                          <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'monospace' }}>
                            {r.receiptNo}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {dayjs(r.receiptDate).format('DD MMM YYYY, hh:mm A')}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {r.payments?.map((p, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${p.mode}: ₹${p.amount.toLocaleString()}${
                                    p.transactionRef ? ` (${p.transactionRef})` : ''
                                  }`}
                                  size="small"
                                  sx={{ fontSize: 10.5, height: 20 }}
                                />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {r.items?.map((it) => `${it.feeHeadName} (${it.installmentName})`).join(', ') || 'Fee allocation'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a', fontSize: 13.5 }}>
                            ₹{r.totalPaid.toLocaleString()}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {r.collectedBy}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={r.status}
                              size="small"
                              color={r.status === 'Cancelled' ? 'error' : 'success'}
                              sx={{ fontWeight: 700, height: 20, fontSize: 10 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<PrintIcon fontSize="small" />}
                              onClick={() => onPrintReceipt && onPrintReceipt(r.receiptId)}
                              sx={{ py: 0.25, px: 1, fontSize: 11, fontWeight: 700 }}
                            >
                              Print Slip
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          color="warning"
          startIcon={<CollectIcon />}
          onClick={() => {
            onClose();
            navigate(`/fees/collection?studentId=${studentId}`);
          }}
          sx={{ fontWeight: 700 }}
        >
          Collect Fee for this Student
        </Button>

        <Button onClick={onClose} variant="outlined" color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
