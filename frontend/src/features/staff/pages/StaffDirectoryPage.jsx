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
    switch (Number(st)) {
      case 1:
        return <Chip label="Active" color="success" size="small" />;
      case 2:
        return <Chip label="On Leave" color="warning" size="small" />;
      case 3:
        return <Chip label="Resigned" color="default" size="small" />;
      case 4:
        return <Chip label="Terminated" color="error" size="small" />;
      case 5:
        return <Chip label="Retired" color="info" size="small" />;
      default:
        return <Chip label="Active" color="success" size="small" />;
    }
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
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      field: 'fullName',
      headerName: 'Staff Member',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={params.row.photoUrl}
            sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: 14 }}
          >
            {params.value ? params.value[0] : 'E'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {params.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.gender}
            </Typography>
          </Box>
        </Stack>
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
      width: 120,
      valueFormatter: (value) => value ? dayjs(value).format('DD MMM YYYY') : '—',
    },
    {
      field: 'allocationsCount',
      headerName: 'Allocations',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={`${params.value} Classes`}
          size="small"
          variant="filled"
          color={params.value > 0 ? 'info' : 'default'}
        />
      ),
    },
    {
      field: 'hasUserAccount',
      headerName: 'Login',
      width: 90,
      renderCell: (params) => (
        params.value ? (
          <Tooltip title="User Login Active">
            <BadgeIcon color="primary" fontSize="small" />
          </Tooltip>
        ) : (
          <Typography variant="caption" color="text.disabled">No Login</Typography>
        )
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Profile">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/staff/profile/${params.row.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {can('Staff', 'Edit') && (
            <Tooltip title="Edit Staff Details">
              <IconButton
                size="small"
                color="secondary"
                onClick={() => navigate(`/staff/edit/${params.row.id}`)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {can('Staff', 'Edit') && params.row.status === 1 && (
            <Tooltip title="Process Relieving / Exit (FR-4.5)">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleOpenExitDialog(params.row)}
              >
                <ExitIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Staff Directory
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Button
            variant="outlined"
            size="medium"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            disabled={!employees.length}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 2,
              height: 40,
            }}
          >
            Export CSV
          </Button>

          {can('TeacherAllocation', 'View') && (
            <Button
              variant="outlined"
              color="secondary"
              size="medium"
              startIcon={<AllocationIcon />}
              onClick={() => navigate('/staff/allocation')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
                height: 40,
              }}
            >
              Teacher Allocation
            </Button>
          )}

          {can('Staff', 'Add') && (
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<AddIcon />}
              onClick={() => navigate('/staff/new')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5,
                height: 40,
                boxShadow: 2,
              }}
            >
              Add Staff Member
            </Button>
          )}
        </Stack>
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
