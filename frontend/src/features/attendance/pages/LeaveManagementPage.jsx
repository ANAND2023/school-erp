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
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  EventNote as LeaveIcon,
  Policy as PolicyIcon,
  AccountBalanceWallet as LedgerIcon,
  School as StudentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import {
  getLeaveRequests,
  applyLeave,
  actionLeave,
  getLeavePolicies,
  saveLeavePolicy,
  deleteLeavePolicy,
  getStaffLeaveBalances,
  setStaffLeaveAllocation,
} from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';
import { usePermission } from '../../../hooks/usePermission';

const LEAVE_TYPES = {
  1: { label: 'Casual Leave (CL)', short: 'CL', color: '#0f766e', bg: '#ccfbf1' },
  2: { label: 'Sick / Medical Leave (SL)', short: 'SL', color: '#7e22ce', bg: '#f3e8ff' },
  3: { label: 'Earned Leave (EL)', short: 'EL', color: '#b45309', bg: '#fef3c7' },
  4: { label: 'Maternity Leave', short: 'ML', color: '#be185d', bg: '#fce7f3' },
  5: { label: 'Unpaid Leave', short: 'LWP', color: '#b91c1c', bg: '#fee2e2' },
  6: { label: 'Other', short: 'OTH', color: '#475569', bg: '#f1f5f9' },
};

const STATUS_CHIPS = {
  1: { label: 'Pending', color: 'warning' },
  2: { label: 'Approved', color: 'success' },
  3: { label: 'Rejected', color: 'error' },
};

export const LeaveManagementPage = () => {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission('LeaveManagement', 'Edit');
  const canAdd = hasPermission('LeaveManagement', 'Add');

  // Tabs: 0 = Staff Leaves, 1 = Category Quotas (Policies), 2 = Staff Balances Ledger, 3 = Student Leaves
  const [tabValue, setTabValue] = useState(0);

  const [requests, setRequests] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerDeptFilter, setLedgerDeptFilter] = useState('');

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

  // Policy Modal (Add / Edit)
  const [policyDialog, setPolicyDialog] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    id: null,
    categoryName: '',
    departmentId: '',
    casualLeaveDays: 12,
    sickLeaveDays: 10,
    earnedLeaveDays: 0,
    description: '',
  });
  const [policyLoading, setPolicyLoading] = useState(false);

  // Custom Staff Allocation Modal
  const [allocDialog, setAllocDialog] = useState(false);
  const [allocForm, setAllocForm] = useState({
    employeeId: null,
    employeeName: '',
    casualLeaveDays: 12,
    sickLeaveDays: 10,
    earnedLeaveDays: 0,
    remarks: '',
  });
  const [allocLoading, setAllocLoading] = useState(false);

  // Dropdown options
  const [employees, setEmployees] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchStudents();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (tabValue === 0 || tabValue === 3) {
      loadRequests();
    } else if (tabValue === 1) {
      loadPolicies();
    } else if (tabValue === 2) {
      loadBalances();
    }
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

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/simplemasters?type=Department');
      const list = res.data?.data || res.data || [];
      setDepartments(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const applicantType = tabValue === 3 ? 'Student' : 'Employee';
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

  const loadPolicies = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await getLeavePolicies();
      const list = res.data?.data || res.data || [];
      setPolicies(list);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load leave policies.' });
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const params = {};
      if (ledgerDeptFilter) params.departmentId = ledgerDeptFilter;
      const res = await getStaffLeaveBalances(params);
      const list = res.data?.data || res.data || [];
      setBalances(list);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load staff leave ledger.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Leave Actions (Approve / Reject) ---
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
        message: `Leave application ${actionText} successfully.${actionDialog.action === 'approve' ? ' Daily Attendance register has been updated with CL/SL.' : ''}`,
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

  // --- Apply Leave Dialog ---
  const handleOpenApply = () => {
    const defaultEmp = employees.length > 0 ? employees[0].id : '';
    setApplyForm({
      applicantType: tabValue === 3 ? 'Student' : 'Employee',
      employeeId: defaultEmp,
      studentId: students.length > 0 ? students[0].id : '',
      leaveType: 1, // Default Casual Leave (CL)
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
      if (tabValue === 0 || tabValue === 3) {
        loadRequests();
      } else if (tabValue === 2) {
        loadBalances();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to submit leave application.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setApplyLoading(false);
    }
  };

  // Find selected employee's balance
  const selectedEmpBalance = balances.find((b) => b.employeeId === Number(applyForm.employeeId));

  // --- Category Policy Management ---
  const handleOpenAddPolicy = () => {
    setPolicyForm({
      id: null,
      categoryName: '',
      departmentId: '',
      casualLeaveDays: 12,
      sickLeaveDays: 10,
      earnedLeaveDays: 0,
      description: '',
    });
    setPolicyDialog(true);
  };

  const handleOpenEditPolicy = (p) => {
    setPolicyForm({
      id: p.id,
      categoryName: p.categoryName,
      departmentId: p.departmentId || '',
      casualLeaveDays: p.casualLeaveDays,
      sickLeaveDays: p.sickLeaveDays,
      earnedLeaveDays: p.earnedLeaveDays,
      description: p.description || '',
    });
    setPolicyDialog(true);
  };

  const handleSubmitPolicy = async () => {
    if (!policyForm.categoryName.trim()) {
      setAlert({ type: 'error', message: 'Category name is required' });
      return;
    }
    setPolicyLoading(true);
    try {
      await saveLeavePolicy({
        categoryName: policyForm.categoryName.trim(),
        departmentId: policyForm.departmentId ? Number(policyForm.departmentId) : null,
        casualLeaveDays: Number(policyForm.casualLeaveDays),
        sickLeaveDays: Number(policyForm.sickLeaveDays),
        earnedLeaveDays: Number(policyForm.earnedLeaveDays || 0),
        description: policyForm.description,
      });
      setAlert({ type: 'success', message: 'Staff category leave policy saved successfully!' });
      setPolicyDialog(false);
      loadPolicies();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save leave policy' });
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleDeletePolicy = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete policy '${name}'?`)) return;
    try {
      await deleteLeavePolicy(id);
      setAlert({ type: 'success', message: 'Leave policy deleted successfully' });
      loadPolicies();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to delete leave policy' });
    }
  };

  // --- Custom Staff Allocation ---
  const handleOpenCustomAlloc = (staff) => {
    setAllocForm({
      employeeId: staff.employeeId,
      employeeName: `${staff.employeeName} (${staff.employeeCode})`,
      casualLeaveDays: staff.allocatedCL,
      sickLeaveDays: staff.allocatedSL,
      earnedLeaveDays: staff.allocatedEL,
      remarks: '',
    });
    setAllocDialog(true);
  };

  const handleSubmitAlloc = async () => {
    setAllocLoading(true);
    try {
      await setStaffLeaveAllocation({
        employeeId: allocForm.employeeId,
        casualLeaveDays: Number(allocForm.casualLeaveDays),
        sickLeaveDays: Number(allocForm.sickLeaveDays),
        earnedLeaveDays: Number(allocForm.earnedLeaveDays || 0),
        remarks: allocForm.remarks,
      });
      setAlert({ type: 'success', message: `Custom leave quota saved for ${allocForm.employeeName}` });
      setAllocDialog(false);
      loadBalances();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to update staff allocation' });
    } finally {
      setAllocLoading(false);
    }
  };

  // Filtered Ledger Rows
  const filteredBalances = balances.filter((b) => {
    const q = ledgerSearch.toLowerCase();
    const matchQuery =
      !q ||
      b.employeeName.toLowerCase().includes(q) ||
      b.employeeCode.toLowerCase().includes(q) ||
      (b.department && b.department.toLowerCase().includes(q));
    const matchDept = !ledgerDeptFilter || b.department === ledgerDeptFilter;
    return matchQuery && matchDept;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="primary.main">
            Leave Management & Staff Quota
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Configure category-wise CL & SL quotas, process applications, and track staff leave balances
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tabValue === 1 && canAdd && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddPolicy}
              sx={{ px: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Add Category Policy
            </Button>
          )}
          {canAdd && (
            <Button
              variant="contained"
              color={tabValue === 1 ? 'inherit' : 'primary'}
              startIcon={<AddIcon />}
              onClick={handleOpenApply}
              sx={{ px: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Apply Leave
            </Button>
          )}
        </Box>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Tabs Bar */}
      <Card sx={{ mb: 2.5, boxShadow: 1, borderRadius: 2 }}>
        <CardContent sx={{ p: '12px !important' }}>
          <Tabs
            value={tabValue}
            onChange={(e, val) => setTabValue(val)}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<LeaveIcon sx={{ fontSize: '1.1rem' }} />}
              iconPosition="start"
              label="Staff Leave Applications"
              sx={{ fontWeight: 600, textTransform: 'none', minHeight: 44 }}
            />
            <Tab
              icon={<PolicyIcon sx={{ fontSize: '1.1rem' }} />}
              iconPosition="start"
              label="Category Quota (CL / SL Master)"
              sx={{ fontWeight: 600, textTransform: 'none', minHeight: 44 }}
            />
            <Tab
              icon={<LedgerIcon sx={{ fontSize: '1.1rem' }} />}
              iconPosition="start"
              label="Staff Leave Balances & Ledger"
              sx={{ fontWeight: 600, textTransform: 'none', minHeight: 44 }}
            />
            <Tab
              icon={<StudentIcon sx={{ fontSize: '1.1rem' }} />}
              iconPosition="start"
              label="Student Leaves"
              sx={{ fontWeight: 600, textTransform: 'none', minHeight: 44 }}
            />
          </Tabs>
        </CardContent>
      </Card>

      {/* =====================================================================
          TAB 0 & 3: LEAVE APPLICATIONS (Staff & Student)
      ===================================================================== */}
      {(tabValue === 0 || tabValue === 3) && (
        <>
          <Card sx={{ mb: 2, boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center" justifyContent="space-between">
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

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : requests.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <LeaveIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No leave requests found.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{tabValue === 0 ? 'Staff Member' : 'Student'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{tabValue === 0 ? 'Department' : 'Class & Section'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Leave Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total Days</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
                    {canApprove && <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 140 }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((row) => {
                    const lType = LEAVE_TYPES[row.leaveType] || { label: 'Leave', short: 'L', color: '#475569', bg: '#f1f5f9' };
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {tabValue === 0 ? (
                            <>
                              <Typography variant="body2" fontWeight={600} color="#0f172a">
                                {row.employeeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.employeeCode}
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" fontWeight={600} color="#0f172a">
                                {row.studentName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.admissionNo}
                              </Typography>
                            </>
                          )}
                        </TableCell>

                        <TableCell>{tabValue === 0 ? row.departmentName || '-' : row.classSection || '-'}</TableCell>

                        <TableCell>
                          <Chip
                            label={lType.label}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              bgcolor: lType.bg,
                              color: lType.color,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '12px' }}>
                            {new Date(row.fromDate).toLocaleDateString('en-IN')} to {new Date(row.toDate).toLocaleDateString('en-IN')}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{row.totalDays} Days</TableCell>

                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" noWrap title={row.reason} sx={{ fontSize: '12px' }}>
                            {row.reason}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip
                            size="small"
                            label={STATUS_CHIPS[row.status]?.label || 'Pending'}
                            color={STATUS_CHIPS[row.status]?.color || 'default'}
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>

                        {canApprove && (
                          <TableCell sx={{ textAlign: 'center' }}>
                            {row.status === 1 ? (
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <Tooltip title="Approve Leave (Updates Attendance)">
                                  <IconButton size="small" color="success" onClick={() => handleOpenAction(row, 'approve')}>
                                    <ApproveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject Leave">
                                  <IconButton size="small" color="error" onClick={() => handleOpenAction(row, 'reject')}>
                                    <RejectIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Processed
                              </Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* =====================================================================
          TAB 1: STAFF CATEGORY LEAVE QUOTA (POLICIES)
      ===================================================================== */}
      {tabValue === 1 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Set standard annual Casual Leave (CL) and Sick Leave (SL) quota for each staff category or department.
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : policies.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <PolicyIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No leave policies configured yet.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddPolicy} sx={{ mt: 2 }}>
                Add First Policy
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {policies.map((p) => (
                <Grid item xs={12} md={4} key={p.id}>
                  <Card sx={{ height: '100%', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                            {p.categoryName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Scope: {p.departmentName ? `Department: ${p.departmentName}` : 'All Staff / Default'}
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton size="small" color="primary" onClick={() => handleOpenEditPolicy(p)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeletePolicy(p.id, p.categoryName)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {p.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem' }}>
                          {p.description}
                        </Typography>
                      )}

                      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f0fdfa', border: '1px solid #ccfbf1' }}>
                            <Typography variant="caption" color="#0f766e" fontWeight={600}>
                              Casual Leave (CL)
                            </Typography>
                            <Typography variant="h5" fontWeight={800} color="#0f766e">
                              {p.casualLeaveDays}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Days / Year
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#faf5ff', border: '1px solid #f3e8ff' }}>
                            <Typography variant="caption" color="#7e22ce" fontWeight={600}>
                              Sick Leave (SL)
                            </Typography>
                            <Typography variant="h5" fontWeight={800} color="#7e22ce">
                              {p.sickLeaveDays}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Days / Year
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Earned Leave (EL): <b>{p.earnedLeaveDays || 0}d</b>
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color="primary.main">
                          Total Quota: {Number(p.casualLeaveDays) + Number(p.sickLeaveDays) + Number(p.earnedLeaveDays || 0)} Days
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* =====================================================================
          TAB 2: STAFF LEAVE BALANCES & LEDGER
      ===================================================================== */}
      {tabValue === 2 && (
        <>
          {/* Filters & Search */}
          <Card sx={{ mb: 2, boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search staff by name or code..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={ledgerDeptFilter}
                      label="Department"
                      onChange={(e) => setLedgerDeptFilter(e.target.value)}
                    >
                      <MenuItem value="">All Departments</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={d.name}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<LedgerIcon />}
                    onClick={loadBalances}
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Refresh Ledger
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : filteredBalances.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <PersonIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No staff balance records found.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Staff Member</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category Policy</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', bgcolor: '#f0fdfa' }}>
                      Casual Leave (CL)
                      <div style={{ fontSize: '10px', color: '#0f766e', fontWeight: 500 }}>Allocated | Used | Balance</div>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', bgcolor: '#faf5ff' }}>
                      Sick Leave (SL)
                      <div style={{ fontSize: '10px', color: '#7e22ce', fontWeight: 500 }}>Allocated | Used | Balance</div>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Total Available</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBalances.map((staff) => (
                    <TableRow key={staff.employeeId} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Typography variant="body2" fontWeight={600} color="#0f172a">
                          {staff.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {staff.employeeCode} {staff.designation ? `• ${staff.designation}` : ''}
                        </Typography>
                      </TableCell>

                      <TableCell>{staff.department || '-'}</TableCell>

                      <TableCell>
                        <Chip
                          label={staff.categoryName}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.72rem', fontWeight: 600 }}
                        />
                      </TableCell>

                      {/* CL Quota & Balance */}
                      <TableCell sx={{ textAlign: 'center', bgcolor: '#f0fdfa' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{staff.allocatedCL}</span>
                          <span style={{ fontSize: '11px', color: '#b91c1c' }}>-{staff.usedCL}</span>
                          <Chip
                            label={`${staff.availableCL}d`}
                            size="small"
                            sx={{
                              height: 20,
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: staff.availableCL > 0 ? '#ccfbf1' : '#fee2e2',
                              color: staff.availableCL > 0 ? '#0f766e' : '#b91c1c',
                            }}
                          />
                        </Box>
                      </TableCell>

                      {/* SL Quota & Balance */}
                      <TableCell sx={{ textAlign: 'center', bgcolor: '#faf5ff' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{staff.allocatedSL}</span>
                          <span style={{ fontSize: '11px', color: '#b91c1c' }}>-{staff.usedSL}</span>
                          <Chip
                            label={`${staff.availableSL}d`}
                            size="small"
                            sx={{
                              height: 20,
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              bgcolor: staff.availableSL > 0 ? '#f3e8ff' : '#fee2e2',
                              color: staff.availableSL > 0 ? '#7e22ce' : '#b91c1c',
                            }}
                          />
                        </Box>
                      </TableCell>

                      {/* Total Available */}
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight={800} color="#15803d">
                          {staff.totalAvailable} Days
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title="Customize Leave Quota for this employee">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenCustomAlloc(staff)}
                            sx={{ fontSize: '11px', py: 0.25, px: 1, textTransform: 'none' }}
                          >
                            Custom Quota
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* =====================================================================
          DIALOG: ADD / EDIT CATEGORY POLICY
      ===================================================================== */}
      <Dialog open={policyDialog} onClose={() => setPolicyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {policyForm.id ? 'Edit Category Leave Policy' : 'Add Staff Category Leave Policy'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Category / Policy Name *"
                placeholder="e.g. Teaching Staff / Academics, Administration, Support Staff"
                value={policyForm.categoryName}
                onChange={(e) => setPolicyForm({ ...policyForm, categoryName: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Department Scope</InputLabel>
                <Select
                  value={policyForm.departmentId}
                  label="Department Scope"
                  onChange={(e) => setPolicyForm({ ...policyForm, departmentId: e.target.value })}
                >
                  <MenuItem value="">All Departments (Default Fallback)</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Casual Leave (CL) Days *"
                value={policyForm.casualLeaveDays}
                onChange={(e) => setPolicyForm({ ...policyForm, casualLeaveDays: e.target.value })}
                helperText="Annual CL quota"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Sick Leave (SL) Days *"
                value={policyForm.sickLeaveDays}
                onChange={(e) => setPolicyForm({ ...policyForm, sickLeaveDays: e.target.value })}
                helperText="Annual SL quota"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Earned Leave (EL) Days"
                value={policyForm.earnedLeaveDays}
                onChange={(e) => setPolicyForm({ ...policyForm, earnedLeaveDays: e.target.value })}
                helperText="Optional EL"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Description / Policy Note"
                placeholder="Details regarding policy entitlement"
                value={policyForm.description}
                onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitPolicy} disabled={policyLoading}>
            {policyLoading ? 'Saving...' : 'Save Policy'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =====================================================================
          DIALOG: CUSTOM STAFF ALLOCATION (Individual Override)
      ===================================================================== */}
      <Dialog open={allocDialog} onClose={() => setAllocDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Customize Staff Quota</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Set custom annual leave days for <strong>{allocForm.employeeName}</strong>:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Casual Leave (CL)"
                value={allocForm.casualLeaveDays}
                onChange={(e) => setAllocForm({ ...allocForm, casualLeaveDays: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Sick Leave (SL)"
                value={allocForm.sickLeaveDays}
                onChange={(e) => setAllocForm({ ...allocForm, sickLeaveDays: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Remarks"
                placeholder="Reason for special quota"
                value={allocForm.remarks}
                onChange={(e) => setAllocForm({ ...allocForm, remarks: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllocDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitAlloc} disabled={allocLoading}>
            {allocLoading ? 'Saving...' : 'Save Custom Quota'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =====================================================================
          DIALOG: APPLY LEAVE (With CL / SL and Live Balance Check)
      ===================================================================== */}
      <Dialog open={applyDialog} onClose={() => setApplyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Leave Application</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Applicant Type</InputLabel>
                <Select
                  value={applyForm.applicantType}
                  label="Applicant Type"
                  onChange={(e) => setApplyForm({ ...applyForm, applicantType: e.target.value })}
                >
                  <MenuItem value="Employee">Staff / Employee</MenuItem>
                  <MenuItem value="Student">Student</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              {applyForm.applicantType === 'Employee' ? (
                <FormControl fullWidth size="small">
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={applyForm.employeeId}
                    label="Employee"
                    onChange={(e) => setApplyForm({ ...applyForm, employeeId: e.target.value })}
                  >
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeCode})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel>Student</InputLabel>
                  <Select
                    value={applyForm.studentId}
                    label="Student"
                    onChange={(e) => setApplyForm({ ...applyForm, studentId: e.target.value })}
                  >
                    {students.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.fullName} ({s.admissionNumber || s.admissionNo})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            {/* Live Balance indicator for Employee */}
            {applyForm.applicantType === 'Employee' && selectedEmpBalance && (
              <Grid item xs={12}>
                <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    CURRENT AVAILABLE LEAVE BALANCE:
                  </Typography>
                  <Stack direction="row" spacing={1.5}>
                    <Chip
                      label={`CL Available: ${selectedEmpBalance.availableCL} / ${selectedEmpBalance.allocatedCL} Days`}
                      size="small"
                      sx={{ bgcolor: '#ccfbf1', color: '#0f766e', fontWeight: 700 }}
                    />
                    <Chip
                      label={`SL Available: ${selectedEmpBalance.availableSL} / ${selectedEmpBalance.allocatedSL} Days`}
                      size="small"
                      sx={{ bgcolor: '#f3e8ff', color: '#7e22ce', fontWeight: 700 }}
                    />
                  </Stack>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Leave Type *</InputLabel>
                <Select
                  value={applyForm.leaveType}
                  label="Leave Type *"
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: Number(e.target.value) })}
                >
                  <MenuItem value={1}>Casual Leave (CL) - Standard Paid Leave</MenuItem>
                  <MenuItem value={2}>Sick / Medical Leave (SL) - Health / Medical</MenuItem>
                  <MenuItem value={3}>Earned Leave (EL)</MenuItem>
                  <MenuItem value={4}>Maternity Leave</MenuItem>
                  <MenuItem value={5}>Unpaid Leave (Loss of Pay)</MenuItem>
                  <MenuItem value={6}>Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="From Date *"
                value={applyForm.fromDate}
                onChange={(e) => setApplyForm({ ...applyForm, fromDate: e.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="To Date *"
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
                placeholder="State the reason for taking leave"
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

      {/* =====================================================================
          DIALOG: ACTION LEAVE (Approve / Reject)
      ===================================================================== */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, request: null, action: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
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
              Approving will automatically mark attendance as{' '}
              <strong>
                {actionDialog.request?.leaveType === 1
                  ? 'Casual Leave (CL)'
                  : actionDialog.request?.leaveType === 2
                  ? 'Sick Leave (SL)'
                  : 'Leave'}
              </strong>{' '}
              in the Daily Staff Attendance register.
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
    </Box>
  );
};

export default LeaveManagementPage;
