import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  FilterAlt as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { DataGrid } from '../../../components/DataGrid';
import { auditLogApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import AppDatePicker from '../../../components/common/AppDatePicker';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../../../hooks/usePermission';

export const AuditLogsPage = () => {
  const { isSuperAdmin } = usePermission();

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }
  const { showSnackbar } = useUiStore();

  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        pageNo: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      };

      const res = await auditLogApi.getLogs(params);
      if (res.data.success) {
        const data = res.data.data;
        setLogs(data?.items || (Array.isArray(data) ? data : []));
        setTotalCount(data?.totalCount || (Array.isArray(data) ? data.length : 0));
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [paginationModel, moduleFilter, actionFilter]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setModuleFilter('');
    setActionFilter('');
    setFromDate('');
    setToDate('');
    setPaginationModel({ page: 0, pageSize: 20 });
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'login':
        return 'info';
      case 'create':
        return 'success';
      case 'update':
        return 'warning';
      case 'delete':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      field: 'createdOn',
      headerName: 'Timestamp',
      width: 180,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format('DD/MM/YYYY hh:mm A') : '-',
    },
    { field: 'username', headerName: 'User', width: 140 },
    { field: 'module', headerName: 'Module', width: 150 },
    {
      field: 'action',
      headerName: 'Action',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getActionColor(params.value)}
          size="small"
        />
      ),
    },
    { field: 'entityName', headerName: 'Entity', width: 130 },
    { field: 'recordId', headerName: 'Record ID', width: 110 },
    { field: 'ipAddress', headerName: 'IP Address', width: 140 },
    {
      field: 'details',
      headerName: 'Diff / Values',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Change Details">
          <IconButton
            size="small"
            color="primary"
            onClick={() => {
              setSelectedLog(params.row);
              setDetailModalOpen(true);
            }}
          >
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Audit Trail & Security Logs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Complete historical log of system logins, record creations, updates, and deletes with old and new values
        </Typography>
      </Box>

      {/* Filter Form */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Box component="form" onSubmit={handleFilterSubmit}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="User, action, values..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Module"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <MenuItem value="">All Modules</MenuItem>
                <MenuItem value="Authentication">Authentication</MenuItem>
                <MenuItem value="Users">Users</MenuItem>
                <MenuItem value="Roles">Roles</MenuItem>
                <MenuItem value="Students">Students</MenuItem>
                <MenuItem value="Fees">Fees</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="Login">Login</MenuItem>
                <MenuItem value="Create">Create</MenuItem>
                <MenuItem value="Update">Update</MenuItem>
                <MenuItem value="Delete">Delete</MenuItem>
                <MenuItem value="Activate">Activate</MenuItem>
                <MenuItem value="Deactivate">Deactivate</MenuItem>
                <MenuItem value="Unlock">Unlock</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <AppDatePicker
                label="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <AppDatePicker
                label="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.value)}
              />
            </Grid>
            <Grid item xs={12} sm={1}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" type="submit" size="medium" sx={{ minWidth: 40, px: 2 }}>
                  <FilterIcon fontSize="small" />
                </Button>
                <Button variant="outlined" color="inherit" onClick={handleResetFilters} size="medium">
                  <RefreshIcon fontSize="small" />
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* DataGrid */}
      <DataGrid
        menuKey="AuditLogs"
        columns={columns}
        rows={logs}
        rowCount={totalCount}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      {/* Detail Dialog */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Audit Log Details - #{selectedLog?.id}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                User
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedLog?.username || 'System'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Module
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedLog?.module}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Action
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedLog?.action}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                IP Address
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedLog?.ipAddress || '-'}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Old Values:
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, bgcolor: '#fafafa', fontFamily: 'monospace', fontSize: '0.85rem' }}
            >
              {selectedLog?.oldValues || '(None)'}
            </Paper>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              New Values:
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, bgcolor: '#fafafa', fontFamily: 'monospace', fontSize: '0.85rem' }}
            >
              {selectedLog?.newValues || '(None)'}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
