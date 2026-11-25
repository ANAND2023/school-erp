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
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Badge as BadgeIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  DirectionsWalk as WalkIcon,
  AccessTime as AccessTimeIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon,
  ExitToApp as ExitIcon,
  AssignmentTurnedIn as ReturnedIcon,
  Person as PersonIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gatePassApi } from '../api';
import { classesApi } from '../../masters/api';
import { useThemeStore, shadeColor } from '../../../store/themeStore';
import CreateGatePassModal from '../components/CreateGatePassModal';
import GatePassSlipModal from '../components/GatePassSlipModal';
import { SlideActionCell } from '../../../components/common';

export default function StudentGatePassPage() {
  const queryClient = useQueryClient();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const themeColor = currentColorHex || '#0284c7';
  const themeDarker = shadeColor(themeColor, -20);

  // Filters
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState('Today'); // 'Today' or 'All'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPassForSlip, setSelectedPassForSlip] = useState(null);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];
  const selectedClass = classes.find((c) => String(c.id) === String(classId));
  const sections = selectedClass?.sections || [];

  // Fetch Stats
  const { data: statsRes, refetch: refetchStats } = useQuery({
    queryKey: ['gate-pass-stats'],
    queryFn: () => gatePassApi.getStats(),
  });
  const stats = statsRes?.data?.data || {
    totalToday: 0,
    currentlyOut: 0,
    returnedToday: 0,
    cancelledToday: 0,
  };

  // Build query params
  const fromDate = dateFilter === 'Today' ? dayjs().startOf('day').toISOString() : undefined;
  const toDate = dateFilter === 'Today' ? dayjs().endOf('day').toISOString() : undefined;

  // Fetch Gate Passes
  const {
    data: gatePassesRes,
    isLoading,
    isFetching,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['gate-passes-list', search, classId, sectionId, status, dateFilter, page, rowsPerPage],
    queryFn: () =>
      gatePassApi.getGatePasses({
        search: search || undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        status: status !== 'All' ? status : undefined,
        fromDate,
        toDate,
        pageNo: page + 1,
        pageSize: rowsPerPage,
      }),
  });

  const pagedData = gatePassesRes?.data?.data;
  const items = pagedData?.items || [];
  const totalCount = pagedData?.totalCount || 0;

  // Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, actualReturnTime }) =>
      gatePassApi.updateStatus(id, { status, actualReturnTime }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['gate-passes-list'] });
      queryClient.invalidateQueries({ queryKey: ['gate-pass-stats'] });
      const updatedPass = res?.data?.data;
      if (selectedPassForSlip && updatedPass && selectedPassForSlip.id === updatedPass.id) {
        setSelectedPassForSlip(updatedPass);
      }
      setBannerNotice({
        type: 'success',
        text: `Gate Pass #${updatedPass?.gatePassNo || ''} marked as ${updatedPass?.status || 'updated'}.`,
      });
    },
    onError: (err) => {
      setBannerNotice({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update status.',
      });
    },
  });

  // Cancel Mutation
  const cancelPassMutation = useMutation({
    mutationFn: (id) => gatePassApi.deleteGatePass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate-passes-list'] });
      queryClient.invalidateQueries({ queryKey: ['gate-pass-stats'] });
      setBannerNotice({ type: 'info', text: 'Gate pass cancelled.' });
    },
  });

  const handleStatusChange = (id, newStatus) => {
    updateStatusMutation.mutate({
      id,
      status: newStatus,
      actualReturnTime: newStatus === 'Returned' ? dayjs().format('hh:mm A') : undefined,
    });
  };

  const handleOpenSlip = (pass) => {
    setSelectedPassForSlip(pass);
    setSlipModalOpen(true);
  };

  const handlePassCreated = (newPass) => {
    setCreateModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['gate-passes-list'] });
    queryClient.invalidateQueries({ queryKey: ['gate-pass-stats'] });
    setBannerNotice({
      type: 'success',
      text: `Gate Pass #${newPass.gatePassNo} issued successfully!`,
    });
    // Auto-open print slip
    setSelectedPassForSlip(newPass);
    setSlipModalOpen(true);
  };

  const getStatusChip = (st) => {
    switch (st?.toLowerCase()) {
      case 'issued':
        return <Chip label="Issued" size="small" color="info" variant="outlined" sx={{ fontWeight: 700 }} />;
      case 'departed':
        return <Chip label="Departed (Out)" size="small" color="warning" sx={{ fontWeight: 700 }} />;
      case 'returned':
        return <Chip label="Returned" size="small" color="success" sx={{ fontWeight: 700 }} />;
      case 'cancelled':
        return <Chip label="Cancelled" size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />;
      default:
        return <Chip label={st || 'Unknown'} size="small" />;
    }
  };

  return (
    <Box sx={{ pb: 2 }}>
      {/* Top Banner Notice */}
      {bannerNotice && (
        <Alert
          severity={bannerNotice.type}
          sx={{ mb: 1.5 }}
          onClose={() => setBannerNotice(null)}
        >
          {bannerNotice.text}
        </Alert>
      )}

      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1.15rem', sm: '1.25rem' }, lineHeight: 1.2, m: 0 }}>
            <BadgeIcon sx={{ color: themeColor, fontSize: 24 }} />
            Student Gate Pass Management
          </Typography>
          <Typography variant="caption" color="#64748b" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Issue student departure passes, verify security gate checkpoints, and print exit permits
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          sx={{
            fontWeight: 700,
            px: 2,
            height: 32,
            fontSize: '11.5px',
            textTransform: 'none',
            borderRadius: 2,
            bgcolor: themeColor,
            boxShadow: `0 2px 8px ${themeColor}30`,
            '&:hover': {
              bgcolor: themeDarker,
            },
          }}
        >
          Issue New Gate Pass
        </Button>
      </Stack>

      {/* Stats Summary Cards */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="#0369a1" textTransform="uppercase" sx={{ fontSize: '10.5px' }}>
                    Passes Today
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#0c4a6e" sx={{ mt: 0.25 }}>
                    {stats.totalToday}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#38bdf8', width: 36, height: 36 }}>
                  <BadgeIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="#b45309" textTransform="uppercase" sx={{ fontSize: '10.5px' }}>
                    Currently Out
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#78350f" sx={{ mt: 0.25 }}>
                    {stats.currentlyOut}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fbbf24', width: 36, height: 36 }}>
                  <ExitIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="#15803d" textTransform="uppercase" sx={{ fontSize: '10.5px' }}>
                    Returned Today
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#14532d" sx={{ mt: 0.25 }}>
                    {stats.returnedToday}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4ade80', width: 36, height: 36 }}>
                  <ReturnedIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="#b91c1c" textTransform="uppercase" sx={{ fontSize: '10.5px' }}>
                    Cancelled Today
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#7f1d1d" sx={{ mt: 0.25 }}>
                    {stats.cancelledToday}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f87171', width: 36, height: 36 }}>
                  <CancelIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar Card */}
      <Card sx={{ mb: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Search Gate Pass"
                placeholder="Student, Adm No, Pass #..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />,
                }}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Class"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Section"
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setPage(0);
                }}
                disabled={!classId}
              >
                <MenuItem value="">All Sections</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Issued">Issued</MenuItem>
                <MenuItem value="Departed">Departed (Out)</MenuItem>
                <MenuItem value="Returned">Returned</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Date Range"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="Today">Today Only</MenuItem>
                <MenuItem value="All">All History</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={1} textAlign="right">
              <Tooltip title="Refresh List">
                <IconButton
                  onClick={() => {
                    refetchList();
                    refetchStats();
                  }}
                  sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Paper sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 700 }} size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Pass No & Date</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Student Details</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Out & Return Timings</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Accompanying Person</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#334155', width: 95, minWidth: 95 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading || isFetching ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="#64748b" sx={{ mt: 1 }}>
                      Loading gate passes...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <BadgeIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#475569">
                      No Gate Passes Found
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 2 }}>
                      No student gate passes match your active filters.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateModalOpen(true)}
                    >
                      Issue First Gate Pass
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    {/* Column 1: Pass No */}
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={800} color={themeColor} sx={{ fontFamily: 'monospace' }}>
                        {row.gatePassNo}
                      </Typography>
                      <Typography variant="caption" color="#64748b">
                        {dayjs(row.passDate).format('DD MMM YYYY')}
                      </Typography>
                    </TableCell>

                    {/* Column 2: Student */}
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={row.photoUrl}
                          sx={{ width: 34, height: 34, bgcolor: themeColor, fontSize: '0.85rem', fontWeight: 700 }}
                        >
                          {row.studentName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {row.studentName}
                          </Typography>
                          <Typography variant="caption" color="#64748b" display="block">
                            Adm: <strong>{row.admissionNo}</strong> | {row.className} {row.sectionName ? `(${row.sectionName})` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Column 3: Timings */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="#0f172a">
                        Out: {row.outTime}
                      </Typography>
                      <Typography variant="caption" color="#64748b" display="block">
                        Expected: {row.expectedReturnTime || 'Not Returning'}
                      </Typography>
                      {row.actualReturnTime && (
                        <Typography variant="caption" color="#16a34a" fontWeight={700} display="block">
                          Returned: {row.actualReturnTime}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Column 4: Escort */}
                    <TableCell>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Avatar
                          src={row.receiverPhotoUrl}
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}
                        >
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {row.receiverName}
                          </Typography>
                          <Typography variant="caption" color="#64748b" display="block">
                            {row.receiverRelation} {row.receiverContact ? `(${row.receiverContact})` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Column 5: Reason */}
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" fontWeight={600} color="#334155" noWrap>
                        {row.reason}
                      </Typography>
                      {row.reasonDetail && (
                        <Typography variant="caption" color="#64748b" noWrap display="block">
                          {row.reasonDetail}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Column 6: Status */}
                    <TableCell>{getStatusChip(row.status)}</TableCell>

                    {/* Column 7: Actions */}
                    <TableCell align="center" sx={{ width: 95, minWidth: 95, overflow: 'visible' }}>
                      <SlideActionCell label="Actions">
                        {/* Print / View Slip */}
                        <Tooltip title="View & Print Slip">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenSlip(row)}
                            sx={{ border: '1px solid #bae6fd', bgcolor: '#f0f9ff', width: 28, height: 28 }}
                          >
                            <PrintIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>

                        {/* Quick Status: Mark Departed */}
                        {row.status?.toLowerCase() === 'issued' && (
                          <Tooltip title="Mark as Departed (Left Campus)">
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() => handleStatusChange(row.id, 'Departed')}
                              sx={{ fontSize: '0.7rem', height: 26, px: 0.8, textTransform: 'none', fontWeight: 700 }}
                            >
                              Depart
                            </Button>
                          </Tooltip>
                        )}

                        {/* Quick Status: Mark Returned */}
                        {row.status?.toLowerCase() === 'departed' && (
                          <Tooltip title="Mark as Returned Back to School">
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleStatusChange(row.id, 'Returned')}
                              sx={{ fontSize: '0.7rem', height: 26, px: 0.8, textTransform: 'none', fontWeight: 700 }}
                            >
                              Return
                            </Button>
                          </Tooltip>
                        )}

                        {/* Cancel Pass */}
                        {row.status?.toLowerCase() !== 'cancelled' && row.status?.toLowerCase() !== 'returned' && (
                          <Tooltip title="Cancel Gate Pass">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to cancel Gate Pass #${row.gatePassNo}?`)) {
                                  cancelPassMutation.mutate(row.id);
                                }
                              }}
                              sx={{ border: '1px solid #fecaca', bgcolor: '#fef2f2', width: 28, height: 28 }}
                            >
                              <CancelIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </SlideActionCell>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Create Modal */}
      <CreateGatePassModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handlePassCreated}
      />

      {/* Print Slip Modal */}
      <GatePassSlipModal
        open={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        pass={selectedPassForSlip}
        onStatusUpdate={(id, newStatus) => handleStatusChange(id, newStatus)}
      />
    </Box>
  );
}
