import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Payment as PayIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dynamicRegistrationApi } from '../api/dynamicRegistrationApi';
import { useAuthStore } from '../../../store/authStore';
import { RegistrationSlipModal } from '../components/RegistrationSlipModal';

export const RegistrationSlipsListPage = () => {
  const queryClient = useQueryClient();
  const { activeAcademicYearId, activeAcademicYearName } = useAuthStore();

  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [page, setPage] = useState(1);

  // Selected slip for view or pay
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [viewSlipModalOpen, setViewSlipModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');

  // Dashboard Stats Query
  const { data: statsRes } = useQuery({
    queryKey: ['registration-dashboard-stats', activeAcademicYearId],
    queryFn: () => dynamicRegistrationApi.getDashboardStats(activeAcademicYearId),
  });
  const stats = statsRes?.data?.data || {
    totalSlips: 0,
    paidSlips: 0,
    unpaidSlips: 0,
    partialPaidSlips: 0,
    totalFeeCollected: 0,
    totalPendingCollection: 0,
  };

  // Slips List Query
  const { data: slipsRes } = useQuery({
    queryKey: ['registration-slips', activeAcademicYearId, paymentStatus, search, page],
    queryFn: () =>
      dynamicRegistrationApi.getSlips({
        academicYearId: activeAcademicYearId,
        paymentStatus,
        search,
        page,
        pageSize: 15,
      }),
  });

  const slipsData = slipsRes?.data?.data || { items: [], totalCount: 0, totalPages: 1 };

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: (data) => dynamicRegistrationApi.collectPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['registration-slips']);
      queryClient.invalidateQueries(['admission-slips']);
      queryClient.invalidateQueries(['registration-dashboard-stats']);
      queryClient.invalidateQueries(['admission-dashboard-stats']);
      setPayModalOpen(false);
      setPayAmount('');
      setPayRef('');
    },
  });

  const handleOpenPay = (slip) => {
    setSelectedSlip(slip);
    setPayAmount(slip.balanceAmount);
    setPayModalOpen(true);
  };

  const handleCollectPayment = () => {
    if (!selectedSlip || !payAmount || Number(payAmount) <= 0) return;
    payMutation.mutate({
      admissionSlipId: selectedSlip.id,
      amount: Number(payAmount),
      paymentMode: payMode,
      transactionReference: payRef,
      paymentNote: 'Counter payment collection',
    });
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>
          Session Registration Records & Reports
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Real-time registration slip generation, payment reconciliation, and searchable slip register for <strong>{activeAcademicYearName}</strong>.
        </Typography>
      </Box>

      {/* KPI Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#166534', textTransform: 'uppercase' }}>
                Total Generated
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: '#14532d', mt: 0.5 }}>
                {stats.totalSlips}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#065f46', textTransform: 'uppercase' }}>
                Paid Slips
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: '#047857', mt: 0.5 }}>
                {stats.paidSlips}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#991b1b', textTransform: 'uppercase' }}>
                Unpaid Slips
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: '#b91c1c', mt: 0.5 }}>
                {stats.unpaidSlips}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#92400e', textTransform: 'uppercase' }}>
                Partial Paid
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: '#b45309', mt: 0.5 }}>
                {stats.partialPaidSlips}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#1e40af', textTransform: 'uppercase' }}>
                Total Collection
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: '#1d4ed8', mt: 0.5 }}>
                ₹{Number(stats.totalFeeCollected || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Card sx={{ mb: 2.5, borderRadius: 2, border: '1px solid #e2e8f0', p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              placeholder="Search by Student Name, Registration Slip ID, or Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: '#94a3b8', mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Status Filter</InputLabel>
              <Select
                value={paymentStatus}
                label="Payment Status Filter"
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <MenuItem value="All">All Slips</MenuItem>
                <MenuItem value="Paid">Fully Paid</MenuItem>
                <MenuItem value="Partial">Partial Paid</MenuItem>
                <MenuItem value="Unpaid">Unpaid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Slips Register Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Slip Number</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Contact No</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Fee (₹)</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Paid (₹)</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Balance (₹)</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slipsData.items.map((slip) => (
              <TableRow key={slip.id} hover>
                <TableCell sx={{ fontWeight: 700, color: '#0284c7' }}>{slip.slipNumber}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{slip.studentName}</TableCell>
                <TableCell>{slip.className}</TableCell>
                <TableCell>{slip.contactNumber}</TableCell>
                <TableCell>₹{slip.feeAmount}</TableCell>
                <TableCell sx={{ color: '#16a34a', fontWeight: 700 }}>₹{slip.paidAmount}</TableCell>
                <TableCell sx={{ color: slip.balanceAmount > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                  ₹{slip.balanceAmount}
                </TableCell>
                <TableCell>
                  <Chip
                    label={slip.paymentStatus}
                    size="small"
                    color={
                      slip.paymentStatus === 'Paid'
                        ? 'success'
                        : slip.paymentStatus === 'Partial'
                        ? 'warning'
                        : 'error'
                    }
                    sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Tooltip title="View & Print Registration Slip">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedSlip(slip);
                        setViewSlipModalOpen(true);
                      }}
                    >
                      <ViewIcon fontSize="small" sx={{ color: '#0284c7' }} />
                    </IconButton>
                  </Tooltip>
                  {slip.balanceAmount > 0 && (
                    <Tooltip title="Collect Due Payment">
                      <IconButton size="small" onClick={() => handleOpenPay(slip)}>
                        <PayIcon fontSize="small" sx={{ color: '#16a34a' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {slipsData.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                  No registration slips found for current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {slipsData.totalPages > 1 && (
        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={slipsData.totalPages}
            page={page}
            onChange={(e, v) => setPage(v)}
            color="primary"
          />
        </Box>
      )}

      {/* Payment Collection Modal */}
      <Dialog open={payModalOpen} onClose={() => setPayModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Collect Due Payment</DialogTitle>
        <DialogContent dividers>
          {selectedSlip && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2">
                Student: <strong>{selectedSlip.studentName}</strong> ({selectedSlip.slipNumber})
              </Typography>
              <Typography variant="body2" sx={{ color: '#dc2626' }}>
                Remaining Balance: <strong>₹{selectedSlip.balanceAmount}</strong>
              </Typography>

              <TextField
                label="Payment Amount (₹)"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                fullWidth
                size="small"
              />

              <FormControl fullWidth size="small">
                <InputLabel>Payment Mode</InputLabel>
                <Select value={payMode} label="Payment Mode" onChange={(e) => setPayMode(e.target.value)}>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Online">Online Gateway</MenuItem>
                  <MenuItem value="Card">Card</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Txn Reference / Cheque No"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleCollectPayment} disabled={payMutation.isPending}>
            {payMutation.isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View & Print Registration Slip Modal */}
      <RegistrationSlipModal
        open={viewSlipModalOpen}
        onClose={() => {
          setViewSlipModalOpen(false);
          setSelectedSlip(null);
        }}
        slip={selectedSlip}
      />
    </Box>
  );
};

export const AdmissionSlipsListPage = RegistrationSlipsListPage;
export default RegistrationSlipsListPage;
