import React, { useState } from 'react';
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
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  ReceiptLong as ReceiptLongIcon,
  Payment as PayIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  DeleteOutline as DeleteIcon,
  Bolt as BoltIcon,
  Clear as ClearIcon,
  CheckCircleOutline as CheckCircleIcon,
  AccountBalanceWallet as WalletIcon,
  PeopleAlt as PeopleIcon,
  PendingActions as PendingIcon,
  EventAvailable as AttendanceIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '../../../components/DataGrid';
import { AppInput, AppSelect, SlideActionCell } from '../../../components/common';
import { payrollApi } from '../api';
import { simpleMasterApi } from '../../masters/api';
import { useUiStore } from '../../../store/uiStore';
import { SalarySlipModal } from '../components/SalarySlipModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { EditPayrollModal } from '../components/EditPayrollModal';
import { GeneratePayrollModal } from '../components/GeneratePayrollModal';

const MONTH_OPTIONS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Paid', value: 'Paid' },
];

export const StaffPayrollPage = () => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useUiStore();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Modals state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [viewSlipModalOpen, setViewSlipModalOpen] = useState(false);
  const [selectedSlipDetail, setSelectedSlipDetail] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [actionTargetSlip, setActionTargetSlip] = useState(null);
  const [bulkPayConfirmOpen, setBulkPayConfirmOpen] = useState(false);

  // Fetch departments
  const { data: deptData } = useQuery({
    queryKey: ['simple-masters', 'departments'],
    queryFn: () => simpleMasterApi.getDepartments(),
  });
  const departments = deptData?.data?.data || deptData?.data || [];

  // Fetch Payroll Summary Metrics
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['payroll', 'summary', selectedMonth, selectedYear],
    queryFn: () => payrollApi.getSummary({ month: selectedMonth, year: selectedYear }),
  });
  const summary = summaryData?.data?.data || {
    totalEmployees: 0,
    processedCount: 0,
    paidCount: 0,
    pendingCount: 0,
    totalGrossPayable: 0,
    totalDeductions: 0,
    totalNetPayable: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  };

  // Fetch Payrolls Table
  const {
    data: payrollsData,
    isLoading,
    refetch: refetchPayrolls,
  } = useQuery({
    queryKey: [
      'payroll',
      'list',
      selectedMonth,
      selectedYear,
      selectedDepartment,
      selectedStatus,
      searchQuery,
      paginationModel.page,
      paginationModel.pageSize,
    ],
    queryFn: () =>
      payrollApi.getPayrolls({
        month: selectedMonth,
        year: selectedYear,
        departmentId: selectedDepartment || undefined,
        status: selectedStatus === 'All' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        pageNo: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      }),
  });

  const pagedResult = payrollsData?.data?.data || {};
  const payrollList = pagedResult.items || [];
  const totalCount = pagedResult.totalCount || 0;

  // Mutations
  const generateMutation = useMutation({
    mutationFn: (data) => payrollApi.generateMonthlyPayroll(data),
    onSuccess: (res) => {
      showSnackbar(res?.data?.data?.message || 'Monthly payroll generated successfully', 'success');
      setGenerateModalOpen(false);
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      showSnackbar(err?.response?.data?.message || 'Failed to generate payroll', 'error');
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => payrollApi.recordPayment(id, data),
    onSuccess: () => {
      showSnackbar('Salary payment recorded successfully', 'success');
      setPayModalOpen(false);
      setActionTargetSlip(null);
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      showSnackbar(err?.response?.data?.message || 'Failed to record payment', 'error');
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => payrollApi.updatePayroll(id, data),
    onSuccess: () => {
      showSnackbar('Salary breakdown updated successfully', 'success');
      setEditModalOpen(false);
      setActionTargetSlip(null);
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      showSnackbar(err?.response?.data?.message || 'Failed to update salary breakdown', 'error');
    },
  });

  const bulkPayMutation = useMutation({
    mutationFn: (data) => payrollApi.bulkPay(data),
    onSuccess: (res) => {
      showSnackbar(res?.data?.data?.message || 'Batch payments processed successfully', 'success');
      setBulkPayConfirmOpen(false);
      setSelectedRowIds([]);
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      showSnackbar(err?.response?.data?.message || 'Bulk payment failed', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => payrollApi.deletePayroll(id),
    onSuccess: () => {
      showSnackbar('Salary slip deleted successfully', 'success');
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      showSnackbar(err?.response?.data?.message || 'Failed to delete salary slip', 'error');
    },
  });

  // Action Handlers
  const handleViewSlip = async (row) => {
    try {
      const res = await payrollApi.getPayroll(row.id);
      setSelectedSlipDetail(res?.data?.data || row);
      setViewSlipModalOpen(true);
    } catch {
      setSelectedSlipDetail(row);
      setViewSlipModalOpen(true);
    }
  };

  const handleShareWhatsApp = (row) => {
    const mobile = row.mobile ? String(row.mobile).replace(/\D/g, '') : '';
    if (!mobile) {
      showSnackbar('No mobile number registered for this employee', 'warning');
      return;
    }
    const cleanMobile = mobile.length === 10 ? `91${mobile}` : mobile;
    const msg =
      `*SALARY SLIP - DELHI PUBLIC SCHOOL*\n` +
      `--------------------------------\n` +
      `Employee: *${row.employeeName}* (${row.employeeCode})\n` +
      `Designation: ${row.designation || 'Staff'}\n` +
      `Month: *${row.monthName}*\n` +
      `Slip No: ${row.salarySlipNo}\n` +
      `--------------------------------\n` +
      `Gross Salary: Rs. ${row.grossSalary?.toLocaleString('en-IN')}\n` +
      `Total Deductions: Rs. ${row.totalDeductions?.toLocaleString('en-IN')}\n` +
      `*Net Payable: Rs. ${row.netSalary?.toLocaleString('en-IN')}*\n` +
      `Status: *${row.paymentStatus?.toUpperCase()}*\n` +
      `--------------------------------\n` +
      `Digital Vidya Sarthi (DVS ERP)`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(search.trim());
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchQuery('');
    setSelectedDepartment('');
    setSelectedStatus('All');
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  // DataGrid Columns
  const columns = [
    {
      field: 'salarySlipNo',
      headerName: 'Slip No',
      width: 140,
      minWidth: 140,
      renderCell: (params) => (
        <span
          onClick={() => handleViewSlip(params.row)}
          style={{
            fontFamily: 'monospace',
            fontWeight: 800,
            color: '#0284c7',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
          title="Click to view & print salary slip"
        >
          {params.value}
        </span>
      ),
    },
    {
      field: 'employeeName',
      headerName: 'Employee / Staff',
      width: 190,
      minWidth: 190,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>
            {params.value}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10.5px' }}>
            {params.row.employeeCode} • {params.row.mobile}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'designation',
      headerName: 'Designation & Dept',
      width: 160,
      minWidth: 160,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '11.5px', color: '#1e293b' }}>
            {params.value || 'Teacher'}
          </span>
          <span style={{ fontSize: '10.5px', color: '#64748b' }}>
            {params.row.department || 'Academics'}
          </span>
        </Box>
      ),
    },
    {
      field: 'attendance',
      headerName: 'Days & Leaves',
      width: 130,
      minWidth: 130,
      renderCell: (params) => (
        <Box sx={{ fontSize: '11px' }}>
          <div>
            <b style={{ color: '#15803d' }}>{params.row.presentDays}</b> / {params.row.totalWorkingDays} Days
          </div>
          <div style={{ color: params.row.unpaidLeaves > 0 ? '#b91c1c' : '#64748b', fontSize: '10px' }}>
            LOP: {params.row.unpaidLeaves || 0}d | Paid: {params.row.paidLeaves || 0}d
          </div>
        </Box>
      ),
    },
    {
      field: 'basicSalary',
      headerName: 'Monthly Salary (₹)',
      width: 135,
      minWidth: 135,
      renderCell: (params) => (
        <span style={{ fontWeight: 600, color: '#1e40af' }}>
          ₹{params.value?.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      field: 'totalDeductions',
      headerName: 'Deductions (₹)',
      width: 120,
      minWidth: 120,
      renderCell: (params) => (
        <span style={{ fontWeight: 600, color: params.value > 0 ? '#b91c1c' : '#64748b' }}>
          ₹{(params.value || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      field: 'netSalary',
      headerName: 'Net Payable (₹)',
      width: 135,
      minWidth: 135,
      renderCell: (params) => (
        <span style={{ fontWeight: 800, color: '#15803d', fontSize: '13px' }}>
          ₹{params.value?.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      field: 'paymentStatus',
      headerName: 'Status',
      width: 100,
      minWidth: 100,
      renderCell: (params) => {
        const isPaid = params.value === 'Paid';
        return (
          <Chip
            label={isPaid ? 'Paid' : 'Pending'}
            size="small"
            color={isPaid ? 'success' : 'warning'}
            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
          />
        );
      },
    },
    {
      field: 'paymentDate',
      headerName: 'Disbursement Info',
      width: 150,
      minWidth: 150,
      renderCell: (params) => {
        if (!params.row.paymentDate) {
          return <span style={{ color: '#94a3b8', fontSize: '11px' }}>Unpaid</span>;
        }
        return (
          <Box sx={{ fontSize: '10.5px' }}>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>
              {new Date(params.row.paymentDate).toLocaleDateString('en-IN')}
            </div>
            <div style={{ color: '#64748b' }}>
              {params.row.paymentMode || 'Bank'} {params.row.transactionReference ? `• ${params.row.transactionReference}` : ''}
            </div>
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      minWidth: 90,
      sortable: false,
      frozen: true,
      alignFrozen: 'right',
      headerStyle: { width: '90px', minWidth: '90px', textAlign: 'center' },
      bodyStyle: { width: '90px', minWidth: '90px', textAlign: 'center', overflow: 'visible' },
      style: { width: '90px', minWidth: '90px', textAlign: 'center', overflow: 'visible' },
      renderCell: (params) => {
        const slip = params.row;
        const isPaid = slip.paymentStatus === 'Paid';

        return (
          <SlideActionCell label="Actions">
            {/* View & Print Salary Slip */}
            <Tooltip title="View & Print Salary Slip">
              <IconButton
                size="small"
                color="info"
                sx={{
                  width: 30,
                  height: 30,
                  bgcolor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  '&:hover': { bgcolor: '#e0f2fe' },
                }}
                onClick={() => handleViewSlip(slip)}
              >
                <ReceiptLongIcon sx={{ fontSize: '1rem', color: '#0284c7' }} />
              </IconButton>
            </Tooltip>

            {/* Record Payment */}
            <Tooltip title={isPaid ? 'Payment already recorded' : 'Record Salary Disbursement'}>
              <span>
                <IconButton
                  size="small"
                  color="success"
                  disabled={isPaid}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: isPaid ? '#f1f5f9' : '#f0fdf4',
                    border: isPaid ? '1px solid #e2e8f0' : '1px solid #bbf7d0',
                    '&:hover': { bgcolor: '#dcfce7' },
                  }}
                  onClick={() => {
                    setActionTargetSlip(slip);
                    setPayModalOpen(true);
                  }}
                >
                  <PayIcon sx={{ fontSize: '1rem', color: isPaid ? '#94a3b8' : '#16a34a' }} />
                </IconButton>
              </span>
            </Tooltip>

            {/* Edit Salary Breakdown */}
            <Tooltip title={isPaid ? 'Cannot edit paid slip' : 'Edit Allowances / Deductions'}>
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  disabled={isPaid}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: isPaid ? '#f1f5f9' : '#eff6ff',
                    border: isPaid ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                    '&:hover': { bgcolor: '#dbeafe' },
                  }}
                  onClick={() => {
                    setActionTargetSlip(slip);
                    setEditModalOpen(true);
                  }}
                >
                  <EditIcon sx={{ fontSize: '1rem', color: isPaid ? '#94a3b8' : '#2563eb' }} />
                </IconButton>
              </span>
            </Tooltip>

            {/* Quick WhatsApp Share */}
            <Tooltip title="Share Salary Slip on WhatsApp">
              <IconButton
                size="small"
                color="success"
                sx={{
                  width: 30,
                  height: 30,
                  bgcolor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  '&:hover': { bgcolor: '#dcfce7' },
                }}
                onClick={() => handleShareWhatsApp(slip)}
              >
                <WhatsAppIcon sx={{ fontSize: '1rem', color: '#16a34a' }} />
              </IconButton>
            </Tooltip>

            {/* Delete Record (if unpaid) */}
            {!isPaid && (
              <Tooltip title="Delete Unpaid Salary Record">
                <IconButton
                  size="small"
                  color="error"
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: '#fef2f2',
                    border: '1px solid #fecaca',
                    '&:hover': { bgcolor: '#fee2e2' },
                  }}
                  onClick={() => {
                    if (window.confirm(`Delete salary slip ${slip.salarySlipNo} for ${slip.employeeName}?`)) {
                      deleteMutation.mutate(slip.id);
                    }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: '1rem', color: '#dc2626' }} />
                </IconButton>
              </Tooltip>
            )}
          </SlideActionCell>
        );
      },
    },
  ];

  return (
    <Box sx={{ pb: 2 }}>
      {/* Page Header */}
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
            Staff & Teacher Payroll Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.82rem' }, mt: 0.25 }}>
            Generate monthly payroll, record salary payments, adjust allowances, and print professional payslips
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {selectedRowIds.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />}
              onClick={() => setBulkPayConfirmOpen(true)}
              sx={{
                height: 32,
                minHeight: 32,
                px: 1.5,
                py: 0,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: '6px',
              }}
            >
              Bulk Pay ({selectedRowIds.length})
            </Button>
          )}

          <Button
            variant="outlined"
            color="primary"
            startIcon={<AttendanceIcon sx={{ fontSize: '16px !important' }} />}
            onClick={() => window.open('/attendance/staff', '_blank')}
            sx={{
              height: 32,
              minHeight: 32,
              px: 1.5,
              py: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12px',
              borderRadius: '6px',
            }}
          >
            Staff Attendance
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<BoltIcon sx={{ fontSize: '16px !important' }} />}
            onClick={() => setGenerateModalOpen(true)}
            sx={{
              height: 32,
              minHeight: 32,
              px: 1.5,
              py: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12px',
              borderRadius: '6px',
            }}
          >
            Generate Monthly Payroll
          </Button>
        </Box>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '10px' }}>
                Total Monthly Net
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.25, fontSize: '1.15rem' }}>
                ₹{summary.totalNetPayable?.toLocaleString('en-IN') || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10.5px' }}>
                Gross: ₹{summary.totalGrossPayable?.toLocaleString('en-IN') || 0}
              </Typography>
            </Box>
            <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WalletIcon sx={{ color: '#2563eb', fontSize: 20 }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d', textTransform: 'uppercase', fontSize: '10px' }}>
                Disbursed / Paid
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#15803d', mt: 0.25, fontSize: '1.15rem' }}>
                ₹{summary.totalPaidAmount?.toLocaleString('en-IN') || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#16a34a', fontSize: '10.5px', fontWeight: 600 }}>
                {summary.paidCount || 0} Staff Paid
              </Typography>
            </Box>
            <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid #fed7aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', fontSize: '10px' }}>
                Pending Disbursement
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#c2410c', mt: 0.25, fontSize: '1.15rem' }}>
                ₹{summary.totalPendingAmount?.toLocaleString('en-IN') || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#ea580c', fontSize: '10.5px', fontWeight: 600 }}>
                {summary.pendingCount || 0} Staff Pending
              </Typography>
            </Box>
            <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PendingIcon sx={{ color: '#ea580c', fontSize: 20 }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '10px' }}>
                Staff Processed
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.25, fontSize: '1.15rem' }}>
                {summary.processedCount || 0} / {summary.totalEmployees || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10.5px' }}>
                Active School Employees
              </Typography>
            </Box>
            <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PeopleIcon sx={{ color: '#475569', fontSize: 20 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={4} md={3.5}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <AppInput
                  label="Search Staff Payroll"
                  placeholder="Employee name, code, slip no, mobile..."
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

          <Grid item xs={6} sm={2} md={2}>
            <AppSelect
              label="Month"
              value={selectedMonth}
              options={MONTH_OPTIONS}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
            />
          </Grid>

          <Grid item xs={6} sm={2} md={1.5}>
            <AppSelect
              label="Year"
              value={selectedYear}
              options={[
                { label: '2026', value: 2026 },
                { label: '2027', value: 2027 },
                { label: '2028', value: 2028 },
              ]}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
            />
          </Grid>

          <Grid item xs={12} sm={2.5} md={2.5}>
            <AppSelect
              label="Department"
              placeholder="All Departments"
              value={selectedDepartment}
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
              showClear
            />
          </Grid>

          <Grid item xs={12} sm={1.5} md={1.5}>
            <AppSelect
              label="Payment Status"
              value={selectedStatus}
              options={STATUS_OPTIONS}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
              }}
            />
          </Grid>

          {(searchQuery || selectedDepartment || selectedStatus !== 'All') && (
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

      {/* Payroll DataGrid */}
      <DataGrid
        rows={payrollList}
        columns={columns}
        rowCount={totalCount}
        loading={isLoading}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 15, 25, 50]}
        checkboxSelection
        rowSelectionModel={selectedRowIds}
        onRowSelectionModelChange={(newSelection) => setSelectedRowIds(newSelection)}
        autoHeight
        density="compact"
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8fafc',
            fontWeight: 700,
            fontSize: '11.5px',
          },
          '& .MuiDataGrid-cell': {
            fontSize: '11.5px',
            py: '4px',
          },
        }}
      />

      {/* Salary Slip View & Print Modal */}
      <SalarySlipModal
        visible={viewSlipModalOpen}
        onHide={() => {
          setViewSlipModalOpen(false);
          setSelectedSlipDetail(null);
        }}
        payroll={selectedSlipDetail}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        visible={payModalOpen}
        onHide={() => {
          setPayModalOpen(false);
          setActionTargetSlip(null);
        }}
        payroll={actionTargetSlip}
        onSubmit={(data) => payMutation.mutate({ id: actionTargetSlip.id, data })}
        loading={payMutation.isPending}
      />

      {/* Edit Salary Breakdown Modal */}
      <EditPayrollModal
        visible={editModalOpen}
        onHide={() => {
          setEditModalOpen(false);
          setActionTargetSlip(null);
        }}
        payroll={actionTargetSlip}
        onSubmit={(data) => editMutation.mutate({ id: actionTargetSlip.id, data })}
        loading={editMutation.isPending}
      />

      {/* Generate Monthly Payroll Modal */}
      <GeneratePayrollModal
        visible={generateModalOpen}
        onHide={() => setGenerateModalOpen(false)}
        departments={departments}
        onGenerate={(data) => generateMutation.mutate(data)}
        loading={generateMutation.isPending}
      />

      {/* Bulk Pay Confirmation Dialog */}
      <Dialog
        open={bulkPayConfirmOpen}
        onClose={() => setBulkPayConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1 }}>
          Confirm Bulk Salary Payment
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '12.5px' }}>
            Are you sure you want to mark <b>{selectedRowIds.length} salary slip(s)</b> as <b>Paid</b> via Bank Transfer for today's date?
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 1.5 }}>
          <Button
            size="small"
            onClick={() => setBulkPayConfirmOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled={bulkPayMutation.isPending}
            onClick={() =>
              bulkPayMutation.mutate({
                payrollIds: selectedRowIds,
                paymentMode: 'Bank Transfer',
                paymentDate: new Date().toISOString(),
                transactionReference: `BULK-PAY-${Date.now().toString().slice(-6)}`,
                remarks: `Bulk salary disbursement processed on ${new Date().toLocaleDateString('en-IN')}`,
              })
            }
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {bulkPayMutation.isPending ? 'Processing...' : 'Confirm & Pay'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffPayrollPage;
