import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Avatar,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  AssignmentInd as AllocationIcon,
  FileDownload as FileDownloadIcon,
  ExitToApp as ExitIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { staffApi } from '../api';
import { simpleMasterApi } from '../../masters/api';
import { DataGrid } from '../../../components/DataGrid';
import { usePermission } from '../../../hooks/usePermission';
import AppDatePicker from '../../../components/common/AppDatePicker';
import { Button as ActionButton } from 'primereact/button';

export default function StaffDirectoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  // Filters
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [status, setStatus] = useState('1'); // 1 = Active
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Exit dialog
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [selectedStaffForExit, setSelectedStaffForExit] = useState(null);
  const [relievingDate, setRelievingDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [exitReason, setExitReason] = useState('');
  const [exitError, setExitError] = useState('');

  // Fetch departments & designations
  const { data: deptRes } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => simpleMasterApi.getMasters('Department'),
  });
  const departments = deptRes?.data?.data || [];

  const { data: desigRes } = useQuery({
    queryKey: ['designations-list'],
    queryFn: () => simpleMasterApi.getMasters('Designation'),
  });
  const designations = desigRes?.data?.data || [];

  // Fetch staff list
  const queryParams = {
    pageNo: page + 1,
    pageSize,
    search: searchTerm || undefined,
    departmentId: departmentId || undefined,
    designationId: designationId || undefined,
    status: status !== '' ? status : undefined,
  };

  const {
    data: staffRes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['staff-directory', queryParams],
    queryFn: () => staffApi.getEmployees(queryParams),
  });

  const staffData = staffRes?.data?.data || {};
  const employees = staffData.items || (Array.isArray(staffRes?.data?.data) ? staffRes?.data?.data : []);
  const totalCount = staffData.totalCount || employees.length || 0;

  // Process Exit Mutation
  const exitMutation = useMutation({
    mutationFn: ({ id, data }) => staffApi.processExit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-directory']);
      setExitDialogOpen(false);
      setSelectedStaffForExit(null);
      setExitReason('');
      setExitError('');
    },
    onError: (err) => {
      setExitError(err?.response?.data?.message || 'Failed to process employee exit.');
    },
  });

  const handleResetFilters = () => {
    setDepartmentId('');
    setDesignationId('');
    setStatus('1');
    setSearchTerm('');
    setPage(0);
  };

  const getStatusChip = (st) => {
    const s = Number(st);
    if (s === 1) {
      return (
        <span
          className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          Active
        </span>
      );
    }
    if (s === 2) {
      return (
        <span
          className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          On Leave
        </span>
      );
    }
    if (s === 3) {
      return (
        <span
          className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          Resigned
        </span>
      );
    }
    if (s === 4) {
      return (
        <span
          className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          Terminated
        </span>
      );
    }
    if (s === 5) {
      return (
        <span
          className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
          Retired
        </span>
      );
    }
    return (
      <span
        className="inline-flex align-items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
        style={{
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          borderRadius: '9999px',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
        Active
      </span>
    );
  };

  const handleExportCSV = () => {
    if (!employees.length) return;
    const headers = ['Code', 'Name', 'Department', 'Designation', 'Joining Date', 'Mobile', 'Email', 'Status'];
    const rows = employees.map((e) => [
      `"${e.employeeCode}"`,
      `"${e.fullName}"`,
      `"${e.departmentName || ''}"`,
      `"${e.designationName || ''}"`,
      `"${dayjs(e.joiningDate).format('YYYY-MM-DD')}"`,
      `"${e.mobile}"`,
      `"${e.email || ''}"`,
      e.status === 1 ? 'Active' : e.status === 3 ? 'Resigned' : 'Other',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Staff_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExitDialog = (employee) => {
    setSelectedStaffForExit(employee);
    setRelievingDate(dayjs().format('YYYY-MM-DD'));
    setExitReason('');
    setExitError('');
    setExitDialogOpen(true);
  };

  const handleConfirmExit = (e) => {
    e.preventDefault();
    if (!exitReason.trim()) {
      setExitError('Please provide a reason for relieving/exit.');
      return;
    }
    exitMutation.mutate({
      id: selectedStaffForExit.id,
      data: {
        relievingDate,
        reason: exitReason.trim(),
      },
    });
  };

  const columns = [
    {
      field: 'employeeCode',
      headerName: 'Emp Code',
      width: 125,
      minWidth: 125,
      renderCell: (params) => (
        <span
          title={params.value}
          className="font-bold text-xs text-blue-700 font-monospace cursor-pointer white-space-nowrap select-all"
          style={{
            backgroundColor: '#eff6ff',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid #bfdbfe',
            display: 'inline-block',
          }}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: 'fullName',
      headerName: 'Staff Member',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <div className="flex align-items-center gap-2" style={{ minWidth: '180px' }}>
          <Avatar
            src={params.row.photoUrl}
            sx={{ width: 34, height: 34, bgcolor: '#3b82f6', fontSize: 13, fontWeight: 700 }}
          >
            {params.value ? params.value[0] : 'S'}
          </Avatar>
          <div className="flex flex-column min-w-0" style={{ lineHeight: '1.25' }}>
            <span className="font-bold text-slate-900 text-sm white-space-nowrap">
              {params.value}
            </span>
            <span className="text-xs text-slate-400">
              {params.row.gender || 'Staff'}
            </span>
          </div>
        </div>
      ),
    },
    {
      field: 'department',
      headerName: 'Department & Role',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (v, row) => `${row.departmentName || '—'} / ${row.designationName || '—'}`,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {params.row.departmentName || 'General'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.designationName || 'Staff'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'contact',
      headerName: 'Contact Details',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params) => (
        <Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="body2">{params.row.mobile}</Typography>
          </Stack>
          {params.row.email && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{params.row.email}</Typography>
            </Stack>
          )}
        </Box>
      ),
    },
    {
      field: 'joiningDate',
      headerName: 'Joining Date',
      width: 125,
      minWidth: 125,
      renderCell: (params) => (
        <span className="text-xs text-slate-700 font-medium">
          {params.value ? dayjs(params.value).format('DD MMM YYYY') : '—'}
        </span>
      ),
    },
    {
      field: 'allocationsCount',
      headerName: 'Allocations',
      width: 120,
      minWidth: 120,
      renderCell: (params) => (
        <span
          className="inline-flex align-items-center gap-1 px-2 py-0.5 font-bold text-xs"
          style={{
            backgroundColor: Number(params.value) > 0 ? '#eff6ff' : '#f1f5f9',
            color: Number(params.value) > 0 ? '#1e40af' : '#64748b',
            border: `1px solid ${Number(params.value) > 0 ? '#bfdbfe' : '#e2e8f0'}`,
            borderRadius: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <i className="pi pi-book text-xs" />
          <span>{params.value || 0} Classes</span>
        </span>
      ),
    },
    {
      field: 'hasUserAccount',
      headerName: 'Login',
      width: 100,
      minWidth: 100,
      renderCell: (params) => (
        params.value ? (
          <span
            className="inline-flex align-items-center gap-1 text-xs font-semibold px-2 py-0.5"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="pi pi-check-circle text-xs text-green-600" />
            <span>Active</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">No Login</span>
        )
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 115,
      minWidth: 115,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      minWidth: 140,
      sortable: false,
      frozen: true,
      alignFrozen: 'right',
      headerStyle: { width: '140px', minWidth: '140px', textAlign: 'center' },
      style: { width: '140px', minWidth: '140px', textAlign: 'center' },
      renderCell: (params) => (
        <div className="flex align-items-center gap-1 justify-content-center" style={{ minWidth: '125px' }}>
          <ActionButton
            icon="pi pi-eye"
            className="p-button-rounded p-button-text p-button-primary p-button-sm"
            tooltip="View Profile"
            tooltipOptions={{ position: 'top' }}
            style={{ width: '30px', height: '30px' }}
            onClick={() => navigate(`/staff/profile/${params.row.id}`)}
          />

          {can('Staff', 'Edit') && (
            <ActionButton
              icon="pi pi-pencil"
              className="p-button-rounded p-button-text p-button-secondary p-button-sm"
              tooltip="Edit Staff Details"
              tooltipOptions={{ position: 'top' }}
              style={{ width: '30px', height: '30px' }}
              onClick={() => navigate(`/staff/edit/${params.row.id}`)}
            />
          )}

          {can('Staff', 'Edit') && params.row.status === 1 && (
            <ActionButton
              icon="pi pi-sign-out"
              className="p-button-rounded p-button-text p-button-danger p-button-sm"
              tooltip="Process Relieving / Exit"
              tooltipOptions={{ position: 'top' }}
              style={{ width: '30px', height: '30px' }}
              onClick={() => handleOpenExitDialog(params.row)}
            />
          )}

          {params.row.mobile && (
            <ActionButton
              icon="pi pi-whatsapp"
              className="p-button-rounded p-button-text p-button-success p-button-sm"
              tooltip="Send WhatsApp Message"
              tooltipOptions={{ position: 'top' }}
              style={{ width: '30px', height: '30px' }}
              onClick={() => {
                const cleanMobile = params.row.mobile.replace(/[^0-9]/g, '');
                const mobileWithCountry = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
                window.open(`https://wa.me/${mobileWithCountry}`, '_blank');
              }}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={{ xs: 1.25, sm: 2 }}
        sx={{ mb: { xs: 1.5, sm: 3 } }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ fontSize: { xs: '1.15rem', sm: '1.45rem' } }}>
            Staff Directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.85rem' }, mt: 0.25 }}>
            Manage teachers, administrative staff, profiles, and designations
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, auto)' },
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
            py: 0.5,
            '& .MuiButton-root': {
              width: '100%',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
            },
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon sx={{ fontSize: 18 }} />}
            onClick={handleExportCSV}
            disabled={!employees.length}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              px: { xs: 1.5, sm: 2 },
              height: { xs: 34, sm: 38 },
            }}
          >
            Export CSV
          </Button>

          {can('TeacherAllocation', 'View') && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<AllocationIcon sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/staff/allocation')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                px: { xs: 1.5, sm: 2 },
                height: { xs: 34, sm: 38 },
              }}
            >
              Teacher Allocation
            </Button>
          )}

          {can('Staff', 'Add') && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/staff/new')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                px: { xs: 1.5, sm: 2.5 },
                height: { xs: 34, sm: 38 },
                boxShadow: 2,
                gridColumn: { xs: 'span 2', sm: 'auto' }, // Primary action spans full width on row 2 on phones!
              }}
            >
              Add Staff Member
            </Button>
          )}
        </Box>
      </Stack>

      {/* Filter Toolbar */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search Staff"
                placeholder="Name, Emp Code, Mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Designation"
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
              >
                <MenuItem value="">All Designations</MenuItem>
                {designations.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="1">Active</MenuItem>
                <MenuItem value="2">On Leave</MenuItem>
                <MenuItem value="3">Resigned</MenuItem>
                <MenuItem value="4">Terminated</MenuItem>
                <MenuItem value="5">Retired</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<RefreshIcon />}
                onClick={handleResetFilters}
                sx={{ height: 40 }}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Staff DataGrid */}
      <Card sx={{ boxShadow: 2 }}>
        <DataGrid
          rows={employees}
          columns={columns}
          loading={isLoading}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
        />
      </Card>

      {/* Relieving / Exit Dialog (FR-4.5) */}
      <Dialog
        open={exitDialogOpen}
        onClose={() => setExitDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleConfirmExit}>
          <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
            Process Employee Relieving / Exit (FR-4.5)
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Marking employee <b>{selectedStaffForExit?.fullName}</b> ({selectedStaffForExit?.employeeCode}) as relieved will automatically <b>deactivate their system login</b> and remove all active teacher allocations.
            </Typography>

            {exitError && <Alert severity="error" sx={{ mb: 2 }}>{exitError}</Alert>}

            <Stack spacing={2}>
              <AppDatePicker
                required
                label="Relieving Date"
                value={relievingDate}
                onChange={(e) => setRelievingDate(e.value)}
              />

              <TextField
                fullWidth
                size="small"
                required
                multiline
                rows={3}
                label="Exit Reason / Handover Notes"
                placeholder="e.g. Resignation accepted, notice period served..."
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setExitDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              loading={exitMutation.isPending}
            >
              Confirm Relieving
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
