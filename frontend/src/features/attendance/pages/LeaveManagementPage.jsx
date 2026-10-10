import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  EventNote as LeaveIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import { getLeaveRequests, applyLeave, actionLeave } from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';
import { usePermission } from '../../../hooks/usePermission';

const LEAVE_TYPES = {
  1: 'Casual Leave',
  2: 'Medical Leave',
  3: 'Earned Leave',
  4: 'Maternity Leave',
  5: 'Unpaid Leave',
  6: 'Other',
};

const STATUS_CHIPS = {
  1: { label: 'Pending', color: 'warning' },
  2: { label: 'Approved', color: 'success' },
  3: { label: 'Rejected', color: 'error' },
};

const LeaveManagementPage = () => {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission('LeaveManagement', 'Edit');
  const [tabValue, setTabValue] = useState(0); // 0 = Staff, 1 = Students
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Action Dialog (Approve / Reject)
  const [actionDialog, setActionDialog] = useState({ open: false, request: null, action: '' });
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Apply Leave Dialog
  const [applyDialog, setApplyDialog] = useState(false);
  const [applyForm, setApplyForm] = useState({
    applicantType: 'Employee',
    employeeId: '',
    studentId: '',
    leaveType: 1,
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [applyLoading, setApplyLoading] = useState(false);

  // Dropdown options
  const [employees, setEmployees] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchStudents();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [tabValue, statusFilter]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      const list = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : []);
      setEmployees(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      const list = res.data?.data?.items || res.data?.items || [];
      setStudents(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const applicantType = tabValue === 0 ? 'Employee' : 'Student';
      const params = { applicantType };
      if (statusFilter) params.status = statusFilter;

      const res = await getLeaveRequests(params);
      const list = res.data?.data || res.data || [];
      setRequests(list);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load leave requests.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (req, action) => {
    setActionDialog({ open: true, request: req, action });
    setActionRemarks('');
  };

  const handleSubmitAction = async () => {
    setActionLoading(true);
    setAlert(null);
    try {
      const statusValue = actionDialog.action === 'approve' ? 2 : 3;
      await actionLeave(actionDialog.request.id, {
        status: statusValue,
        actionRemarks: actionRemarks,
      });

      const actionText = actionDialog.action === 'approve' ? 'approved' : 'rejected';
      setAlert({
        type: 'success',
        message: `Leave application ${actionText} successfully.${actionDialog.action === 'approve' ? ' Attendance has been automatically updated (FR-6.5).' : ''}`,
      });

      setActionDialog({ open: false, request: null, action: '' });
      loadRequests();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to process leave action.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenApply = () => {
    setApplyForm({
      applicantType: tabValue === 0 ? 'Employee' : 'Student',
      employeeId: employees.length > 0 ? employees[0].id : '',
      studentId: students.length > 0 ? students[0].id : '',
      leaveType: 1,
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      reason: '',
    });
    setApplyDialog(true);
  };

  const handleSubmitApply = async () => {
    if (!applyForm.reason.trim()) {
      setAlert({ type: 'error', message: 'Reason for leave is required.' });
      return;
    }
    setApplyLoading(true);
    try {
      const payload = {
        applicantType: applyForm.applicantType,
        employeeId: applyForm.applicantType === 'Employee' ? (applyForm.employeeId || null) : null,
        studentId: applyForm.applicantType === 'Student' ? (applyForm.studentId || null) : null,
        leaveType: applyForm.leaveType,
        fromDate: applyForm.fromDate,
        toDate: applyForm.toDate,
        reason: applyForm.reason,
      };
      await applyLeave(payload);
      setAlert({ type: 'success', message: 'Leave application submitted successfully!' });
      setApplyDialog(false);
      loadRequests();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to submit leave application.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Leave Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process employee and student leave requests with automated attendance integration (FR-6.5)
          </Typography>
        </Box>
        {hasPermission("LeaveManagement", "Add") && (<Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenApply} sx={{ px: 3 }}>Apply Leave</Button>)}
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Tabs & Filter Bar */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item xs={12} sm={6}>
              <Tabs
                value={tabValue}
                onChange={(e, val) => setTabValue(val)}
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab label="Staff Leaves" />
                <Tab label="Student Leaves" />
              </Tabs>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Filter by Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="1">Pending</MenuItem>
                  <MenuItem value="2">Approved</MenuItem>
                  <MenuItem value="3">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <LeaveIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No leave requests found.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>
                  {tabValue === 0 ? 'Employee' : 'Student'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {tabValue === 0 ? 'Department' : 'Class & Section'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Leave Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Days</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
                {canApprove && <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 140 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {tabValue === 0 ? (
                      <>
                        <Typography variant="body2" fontWeight={600}>
                          {row.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.employeeCode}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" fontWeight={600}>
                          {row.studentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.admissionNo}
                        </Typography>
                      </>
                    )}
                  </TableCell>

                  <TableCell>
                    {tabValue === 0 ? row.departmentName || '-' : row.classSection || '-'}
                  </TableCell>

                  <TableCell>{LEAVE_TYPES[row.leaveType] || 'Leave'}</TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {new Date(row.fromDate).toLocaleDateString()} to{' '}
                      {new Date(row.toDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>{row.totalDays} Days</TableCell>

                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap title={row.reason}>
                      {row.reason}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <Chip
                      size="small"
                      label={STATUS_CHIPS[row.status]?.label || 'Pending'}
                      color={STATUS_CHIPS[row.status]?.color || 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>

                  {canApprove && (<TableCell sx={{ textAlign: 'center' }}>{row.status === 1 ? (<Stack direction="row" spacing={1} justifyContent="center"><Tooltip title="Approve Leave"><IconButton size="small" color="success" onClick={() => handleOpenAction(row, 'approve')}><ApproveIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Reject Leave"><IconButton size="small" color="error" onClick={() => handleOpenAction(row, 'reject')}><RejectIcon fontSize="small" /></IconButton></Tooltip></Stack>) : (<Typography variant="caption" color="text.secondary">Processed</Typography>)}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Action Dialog (Approve / Reject) */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, request: null, action: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to {actionDialog.action} leave for{' '}
            <strong>
              {actionDialog.request?.applicantType === 'Employee'
                ? actionDialog.request?.employeeName
                : actionDialog.request?.studentName}
            </strong>{' '}
            ({actionDialog.request?.totalDays} days)?
          </Typography>
          {actionDialog.action === 'approve' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Approving will automatically mark attendance as <strong>Leave</strong> for all days in this duration (FR-6.5).
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            label="Remarks / Note"
            multiline
            rows={3}
            value={actionRemarks}
            onChange={(e) => setActionRemarks(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, request: null, action: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={actionDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleSubmitAction}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : actionDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Apply Leave Dialog */}
      <Dialog open={applyDialog} onClose={() => setApplyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Leave Application</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {canApprove && (<><Grid item xs={12} sm={6}> <FormControl fullWidth size="small"> <InputLabel>Applicant Type</InputLabel> <Select value={applyForm.applicantType} label="Applicant Type" onChange={(e) => setApplyForm({ ...applyForm, applicantType: e.target.value }) } > <MenuItem value="Employee">Staff / Employee</MenuItem> <MenuItem value="Student">Student</MenuItem> </Select> </FormControl> </Grid> <Grid item xs={12} sm={6}> {applyForm.applicantType === 'Employee' ? ( <FormControl fullWidth size="small"> <InputLabel>Employee</InputLabel> <Select value={applyForm.employeeId} label="Employee" onChange={(e) => setApplyForm({ ...applyForm, employeeId: e.target.value })} > {employees.map((e) => ( <MenuItem key={e.id} value={e.id}> {e.fullName} ({e.employeeCode}) </MenuItem> ))} </Select> </FormControl> ) : ( <FormControl fullWidth size="small"> <InputLabel>Student</InputLabel> <Select value={applyForm.studentId} label="Student" onChange={(e) => setApplyForm({ ...applyForm, studentId: e.target.value })} > {students.map((s) => ( <MenuItem key={s.id} value={s.id}> {s.fullName} ({s.admissionNumber || s.admissionNo}) </MenuItem> ))} </Select> </FormControl> )} </Grid></>)}

            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={applyForm.leaveType}
                  label="Leave Type"
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: Number(e.target.value) })}
                >
                  <MenuItem value={1}>Casual Leave</MenuItem>
                  <MenuItem value={2}>Medical Leave</MenuItem>
                  <MenuItem value={3}>Earned Leave</MenuItem>
                  <MenuItem value={4}>Maternity Leave</MenuItem>
                  <MenuItem value={5}>Unpaid Leave</MenuItem>
                  <MenuItem value={6}>Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="From Date"
                value={applyForm.fromDate}
                onChange={(e) => setApplyForm({ ...applyForm, fromDate: e.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="To Date"
                value={applyForm.toDate}
                onChange={(e) => setApplyForm({ ...applyForm, toDate: e.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Reason for Leave *"
                placeholder="State the reason for leave"
                value={applyForm.reason}
                onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitApply} disabled={applyLoading}>
            {applyLoading ? 'Submitting...' : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveManagementPage;






