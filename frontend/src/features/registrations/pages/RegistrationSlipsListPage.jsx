import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  HowToReg as ConvertIcon,
  ReceiptLong as ReceiptLongIcon,
  WhatsApp as WhatsAppIcon,
  Payment as PayIcon,
  Tune as TuneIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '../../../components/DataGrid';
import { AppInput, AppSelect } from '../../../components/common';
import { dynamicRegistrationApi } from '../api/dynamicRegistrationApi';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';
import { RegistrationSlipModal } from '../components/RegistrationSlipModal';
import apiClient from '../../../api/client';

const PAYMENT_STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Fully Paid', value: 'Paid' },
  { label: 'Partial Paid', value: 'Partial' },
  { label: 'Unpaid', value: 'Unpaid' },
];

export const RegistrationSlipsListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSnackbar } = useUiStore();
  const { activeAcademicYearId, activeAcademicYearName } = useAuthStore();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  // Selected slip for modal view or payment
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [viewSlipModalOpen, setViewSlipModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');

  // Classes list
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => apiClient.get('/classes'),
  });
  const classesList = classesRes?.data?.data || [];

  // Slips List Query (Session Registration Records)
  const { data: slipsRes, isLoading } = useQuery({
    queryKey: [
      'registration-slips',
      activeAcademicYearId,
      selectedClass,
      selectedPaymentStatus,
      search,
      paginationModel.page,
      paginationModel.pageSize,
    ],
    queryFn: () =>
      dynamicRegistrationApi.getSlips({
        academicYearId: activeAcademicYearId,
        classId: selectedClass || undefined,
        paymentStatus: selectedPaymentStatus !== 'All' ? selectedPaymentStatus : undefined,
        search: search.trim() || undefined,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      }),
  });

  const slipsData = slipsRes?.data?.data || { items: [], totalCount: 0, totalPages: 1 };
  const rows = slipsData.items || [];
  const totalCount = slipsData.totalCount || 0;

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: (data) => dynamicRegistrationApi.collectPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['registration-slips']);
      queryClient.invalidateQueries(['admission-slips']);
      showSnackbar('Payment recorded successfully!', 'success');
      setPayModalOpen(false);
      setPayAmount('');
      setPayRef('');
    },
    onError: (err) => {
      showSnackbar(err.response?.data?.message || 'Failed to record payment', 'error');
    },
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedClass('');
    setSelectedPaymentStatus('All');
    setPaginationModel({ page: 0, pageSize: 15 });
  };

  const handleConvertToAdmission = (slip) => {
    // Pre-fill admission form with registration slip data (FR-3.2)
    navigate('/admissions/new', {
      state: {
        registrationSlipId: slip.id,
        registrationSlipNo: slip.slipNumber,
        studentName: slip.studentName,
        classId: slip.classId,
        guardianName: slip.fatherName || slip.motherName,
        fatherName: slip.fatherName,
        motherName: slip.motherName,
        gender: slip.gender,
        dob: slip.dob,
        mobile: slip.contactNumber,
        email: slip.email,
        address: slip.address,
        state: slip.state,
        city: slip.city,
        previousSchool: slip.previousSchool,
      },
    });
  };

  const handleShareWhatsApp = (slip) => {
    if (!slip.contactNumber) {
      showSnackbar('No mobile number registered for this student.', 'warning');
      return;
    }
    const rawNumber = String(slip.contactNumber).replace(/\D/g, '');
    const phone = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
    const msg = `*STUDENT REGISTRATION SLIP*\n\nDear Parent/Student,\nRegistration details for ${slip.studentName}:\n\n*Slip No:* ${slip.slipNumber}\n*Class:* ${slip.className}\n*Registration Fee:* Rs. ${slip.feeAmount}\n*Paid Amount:* Rs. ${slip.paidAmount}\n*Balance Due:* Rs. ${slip.balanceAmount}\n*Status:* ${slip.paymentStatus}`;
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleOpenPay = (slip) => {
    setSelectedSlip(slip);
    setPayAmount(slip.balanceAmount);
    setPayModalOpen(true);
  };

  const handleCollectPayment = () => {
    if (!selectedSlip || !payAmount || Number(payAmount) <= 0) {
      showSnackbar('Please enter a valid payment amount.', 'warning');
      return;
    }
    payMutation.mutate({
      admissionSlipId: selectedSlip.id,
      amount: Number(payAmount),
      paymentMode: payMode,
      transactionReference: payRef,
      paymentNote: 'Counter payment collection',
    });
  };

  const columns = [
    {
      field: 'studentName',
      headerName: 'Student Name',
      width: 170,
      minWidth: 170,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a', fontSize: '12px' }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'className', headerName: 'Seeking Class', width: 120, minWidth: 120 },
    {
      field: 'academicYearName',
      headerName: 'Session',
      width: 110,
      minWidth: 110,
      renderCell: (params) => (
        <Chip
          label={params.value || activeAcademicYearName || 'Current'}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ fontWeight: 700, fontSize: '11px' }}
        />
      ),
    },
    {
      field: 'slipNumber',
      headerName: 'Slip No',
      width: 125,
      minWidth: 125,
      renderCell: (params) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
          {params.value}
        </span>
      ),
    },
    { field: 'fatherName', headerName: 'Parent / Guardian', width: 150, minWidth: 150 },
    { field: 'contactNumber', headerName: 'Mobile', width: 130, minWidth: 130 },
    {
      field: 'feeAmount',
      headerName: 'Fee (₹)',
      width: 90,
      minWidth: 90,
      renderCell: (params) => `₹${params.value}`,
    },
    {
      field: 'paidAmount',
      headerName: 'Paid (₹)',
      width: 90,
      minWidth: 90,
      renderCell: (params) => (
        <span style={{ color: '#16a34a', fontWeight: 700 }}>₹{params.value}</span>
      ),
    },
    {
      field: 'balanceAmount',
      headerName: 'Balance (₹)',
      width: 95,
      minWidth: 95,
      renderCell: (params) => (
        <span style={{ color: params.value > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
          ₹{params.value}
        </span>
      ),
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment Status',
      width: 120,
      minWidth: 120,
      renderCell: (params) => {
        const s = params.value;
        return (
          <Chip
            label={s}
            size="small"
            color={s === 'Paid' ? 'success' : s === 'Partial' ? 'warning' : 'error'}
            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
          />
        );
      },
    },
    {
      field: 'admissionStatus',
      headerName: 'Admission',
      width: 115,
      minWidth: 115,
      renderCell: (params) => {
        const isAdmitted = params.value === 'Admitted';
        return (
          <Chip
            label={isAdmitted ? 'Admitted' : 'Registered'}
            size="small"
            color={isAdmitted ? 'success' : 'default'}
            variant={isAdmitted ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      minWidth: 170,
      sortable: false,
      frozen: true,
      alignFrozen: 'right',
      headerStyle: { width: '170px', minWidth: '170px', textAlign: 'center' },
      bodyStyle: { width: '170px', minWidth: '170px', textAlign: 'center' },
      style: { width: '170px', minWidth: '170px', textAlign: 'center' },
      renderCell: (params) => {
        const slip = params.row;
        const isAdmitted = slip.admissionStatus === 'Admitted';

        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
            {/* Convert to Admission / Admit Student Option */}
            <Tooltip title={isAdmitted ? 'Student already admitted' : 'Admit Student / Convert to Admission'}>
              <span>
                <IconButton
                  size="small"
                  color="success"
                  disabled={isAdmitted}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: isAdmitted ? '#f1f5f9' : '#f0fdf4',
                    '&:hover': { bgcolor: '#dcfce7' },
                  }}
                  onClick={() => handleConvertToAdmission(slip)}
                >
                  <ConvertIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </span>
            </Tooltip>

            {/* View & Print Slip */}
            <Tooltip title="View & Print Registration Slip">
              <IconButton
                size="small"
                color="info"
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: '#f0f9ff',
                  '&:hover': { bgcolor: '#e0f2fe' },
                }}
                onClick={() => {
                  setSelectedSlip(slip);
                  setViewSlipModalOpen(true);
                }}
              >
                <ReceiptLongIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>

            {/* Send WhatsApp Message */}
            <Tooltip title="Share Slip on WhatsApp">
              <IconButton
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  color: '#25D366',
                  bgcolor: '#f0fdf4',
                  '&:hover': { bgcolor: '#dcfce7' },
                }}
                onClick={() => handleShareWhatsApp(slip)}
              >
                <WhatsAppIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>

            {/* Collect Fee (if balance > 0) */}
            {slip.balanceAmount > 0 && (
               <Tooltip title={`Collect Due Balance (₹${slip.balanceAmount})`}>
                <IconButton
                  size="small"
                  color="warning"
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: '#fffbeb',
                    '&:hover': { bgcolor: '#fef3c7' },
                  }}
                  onClick={() => handleOpenPay(slip)}
                >
                  <PayIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ pb: 2 }}>
      {/* Page Header matching EnquiriesPage */}
      <Box
        sx={{
          mb: 1.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.35rem' }, lineHeight: 1.2 }}>
            Session Registration Records & Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.82rem' }, mt: 0.25 }}>
            Manage registered students, fees, slip generation, and convert to official admission
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<TuneIcon sx={{ fontSize: '16px !important' }} />}
            onClick={() => navigate('/registrations/builder')}
            sx={{
              height: 32,
              minHeight: 32,
              px: 1.5,
              py: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12px',
              borderRadius: '6px',
              borderWidth: '1.5px',
              alignSelf: { xs: 'flex-start', sm: 'center' },
              '&:hover': { borderWidth: '1.5px' },
            }}
          >
            Registration Form Builder
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
            onClick={() => navigate('/registrations/slip-generator')}
            sx={{
              height: 32,
              minHeight: 32,
              px: 1.5,
              py: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12px',
              borderRadius: '6px',
              alignSelf: { xs: 'flex-start', sm: 'center' },
            }}
          >
            New Registration Slip
          </Button>
        </Box>
      </Box>

      {/* Filter Toolbar matching EnquiriesPage */}
      <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <AppInput
                  label="Search Registration Records"
                  placeholder="Student name, slip ID, parent, mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Box>
              <Button
                variant="contained"
                type="submit"
                startIcon={<SearchIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  height: 32,
                  minHeight: 32,
                  minWidth: 84,
                  px: 1.5,
                  py: 0,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  flexShrink: 0,
                  borderRadius: '6px',
                }}
              >
                Search
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3} md={3.5}>
            <AppSelect
              label="Seeking Class"
              placeholder="All Classes"
              value={selectedClass}
              options={classesList.map((c) => ({ label: c.name, value: c.id }))}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
              showClear
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2.5}>
            <AppSelect
              label="Payment Status"
              placeholder="All Statuses"
              value={selectedPaymentStatus}
              options={PAYMENT_STATUS_OPTIONS}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
              showClear
            />
          </Grid>
          {(search || selectedClass || selectedPaymentStatus !== 'All') && (
            <Grid item xs={12} md={1}>
              <Button
                variant="text"
                color="secondary"
                size="small"
                startIcon={<ClearIcon sx={{ fontSize: '16px !important' }} />}
                onClick={handleClearFilters}
                sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, height: 32, minHeight: 32 }}
              >
                Clear
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Main DataGrid matching EnquiriesPage */}
      <DataGrid
        menuKey="Admissions"
        columns={columns}
        rows={rows}
        rowCount={totalCount}
        loading={isLoading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onAddClick={() => navigate('/registrations/slip-generator')}
        addLabel="New Registration Slip"
        tableStyle={{ minWidth: '1250px' }}
      />

      {/* Payment Collection Dialog */}
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
        onAdmit={handleConvertToAdmission}
      />
    </Box>
  );
};

export const AdmissionSlipsListPage = RegistrationSlipsListPage;
export default RegistrationSlipsListPage;
