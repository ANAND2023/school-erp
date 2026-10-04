import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  ExitToApp as ExitIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  AccountBalance as BankIcon,
  VpnKey as KeyIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AssignmentInd as AllocationIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { staffApi } from '../api';
import { usePermission } from '../../../hooks/usePermission';
import AppDatePicker from '../../../components/common/AppDatePicker';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const [activeTab, setActiveTab] = useState(0);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [relievingDate, setRelievingDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [exitReason, setExitReason] = useState('');
  const [exitError, setExitError] = useState('');

  // Fetch employee details
  const {
    data: empRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['employee-detail', id],
    queryFn: () => staffApi.getEmployee(id),
    enabled: !!id,
  });

  const employee = empRes?.data?.data;

  // Process Exit Mutation
  const exitMutation = useMutation({
    mutationFn: (data) => staffApi.processExit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employee-detail', id]);
      setExitDialogOpen(false);
      setExitReason('');
      setExitError('');
    },
    onError: (err) => {
      setExitError(err?.response?.data?.message || 'Failed to process employee exit.');
    },
  });

  const handleConfirmExit = (e) => {
    e.preventDefault();
    if (!exitReason.trim()) {
      setExitError('Please provide a reason for relieving/exit.');
      return;
    }
    exitMutation.mutate({
      relievingDate,
      reason: exitReason.trim(),
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !employee) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/staff')} sx={{ mb: 2 }}>
          Back to Directory
        </Button>
        <Alert severity="error">{error?.response?.data?.message || 'Failed to load employee details.'}</Alert>
      </Box>
    );
  }

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

  return (
    <Box sx={{ p: 3 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/staff')}
        sx={{ mb: 2 }}
      >
        Back to Staff Directory
      </Button>

      {/* Header Profile Card */}
      <Card sx={{ mb: 3, boxShadow: 2, background: 'linear-gradient(135deg, #fbfcfd 0%, #ffffff 100%)' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={3}
          >
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                src={employee.photoUrl}
                sx={{
                  width: 90,
                  height: 90,
                  border: '3px solid #7b1fa2',
                  boxShadow: 2,
                  bgcolor: 'secondary.main',
                  fontSize: 32,
                }}
              >
                {employee.fullName ? employee.fullName[0] : 'E'}
              </Avatar>

              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="h5" fontWeight={700} color="text.primary">
                    {employee.fullName}
                  </Typography>
                  <Chip
                    label={employee.employeeCode}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                  {getStatusChip(employee.status)}
                </Stack>

                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                  {employee.departmentName || 'General Department'} &bull; {employee.designationName || 'Staff Member'}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Gender: <b>{employee.gender}</b> | Joining: <b>{dayjs(employee.joiningDate).format('DD MMM YYYY')}</b> | Mobile: <b>{employee.mobile}</b>
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              {can('TeacherAllocation', 'View') && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<AllocationIcon />}
                  onClick={() => navigate('/staff/allocation')}
                >
                  Manage Allocations
                </Button>
              )}

              {can('Staff', 'Edit') && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/staff/edit/${employee.id}`)}
                >
                  Edit Details
                </Button>
              )}

              {can('Staff', 'Edit') && employee.status === 1 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<ExitIcon />}
                  onClick={() => setExitDialogOpen(true)}
                >
                  Relieve Employee (FR-4.5)
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>

        <Divider />

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ px: 3, bgcolor: '#fafafa' }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Personal & Contact" />
          <Tab icon={<WorkIcon fontSize="small" />} iconPosition="start" label="Employment & Payroll" />
          <Tab icon={<SchoolIcon fontSize="small" />} iconPosition="start" label={`Allocated Classes & Subjects (${employee.allocations.length})`} />
          <Tab icon={<KeyIcon fontSize="small" />} iconPosition="start" label="ERP Login Account" />
        </Tabs>
      </Card>

      {/* Tab Panels */}
      {/* 1. Personal & Contact */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Personal Details
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Full Name:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.fullName}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Employee Code:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.employeeCode}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Gender:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.gender}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Date of Birth:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>
                        {employee.dateOfBirth ? dayjs(employee.dateOfBirth).format('DD MMMM YYYY') : '—'}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Highest Qualification:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.qualification || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Total Experience:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>
                        {employee.experienceYears !== null ? `${employee.experienceYears} Years` : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Contact & Identity Info
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Mobile Number:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>
                        <a href={`tel:${employee.mobile}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                          {employee.mobile}
                        </a>
                      </Typography>
                    </Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Email Address:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>
                        {employee.email || '—'}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">PAN Card No:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.panNo || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Aadhaar Card No:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.aadhaarNo || '—'}</Typography></Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 2. Employment & Payroll */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Job Position & Dates
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Department:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.departmentName || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Designation:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.designationName || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Date of Joining:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={600}>
                        {dayjs(employee.joiningDate).format('DD MMMM YYYY')}
                      </Typography>
                    </Grid>
                  </Grid>

                  {employee.relievingDate && (
                    <>
                      <Grid container spacing={1}>
                        <Grid item xs={5}><Typography variant="body2" color="error.main">Date of Relieving:</Typography></Grid>
                        <Grid item xs={7}>
                          <Typography variant="body2" fontWeight={700} color="error.main">
                            {dayjs(employee.relievingDate).format('DD MMMM YYYY')}
                          </Typography>
                        </Grid>
                      </Grid>

                      <Grid container spacing={1}>
                        <Grid item xs={5}><Typography variant="body2" color="error.main">Exit Reason:</Typography></Grid>
                        <Grid item xs={7}>
                          <Typography variant="body2" fontWeight={600} color="error.main">
                            {employee.exitReason || '—'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Bank & Payroll Info
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Bank Name:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.bankName || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Account Number:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.accountNo || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">IFSC Code:</Typography></Grid>
                    <Grid item xs={7}><Typography variant="body2" fontWeight={600}>{employee.ifscCode || '—'}</Typography></Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={5}><Typography variant="body2" color="text.secondary">Basic Salary:</Typography></Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2" fontWeight={700} color="success.main">
                        {employee.salaryBasic ? `₹${Number(employee.salaryBasic).toLocaleString()}` : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 3. Teacher Allocations */}
      {activeTab === 2 && (
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="primary">
                  Teaching Responsibilities & Allocations (FR-4.3, FR-4.4)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sections where this teacher is assigned as Class Teacher or Subject Teacher
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AllocationIcon />}
                onClick={() => navigate('/staff/allocation')}
              >
                Configure Allocations
              </Button>
            </Stack>

            {employee.allocations.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell><b>Class</b></TableCell>
                      <TableCell><b>Section</b></TableCell>
                      <TableCell><b>Role</b></TableCell>
                      <TableCell><b>Subject</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employee.allocations.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell><b>{a.className}</b></TableCell>
                        <TableCell>{a.sectionName}</TableCell>
                        <TableCell>
                          {a.isClassTeacher ? (
                            <Chip label="Class Teacher" color="primary" size="small" />
                          ) : (
                            <Chip label="Subject Teacher" color="default" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          {a.subjectName ? <b>{a.subjectName}</b> : <i>Class Administration</i>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" variant="outlined">
                No class or subject teaching allocations currently assigned to this staff member.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. ERP Login Account */}
      {activeTab === 3 && (
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
              ERP System Login Account (FR-4.2)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {employee.userId ? (
              <Stack spacing={2} sx={{ maxWidth: 500 }}>
                <Grid container spacing={1}>
                  <Grid item xs={5}><Typography variant="body2" color="text.secondary">Username:</Typography></Grid>
                  <Grid item xs={7}>
                    <Chip label={employee.username} color="primary" size="small" sx={{ fontWeight: 700 }} />
                  </Grid>
                </Grid>

                <Grid container spacing={1}>
                  <Grid item xs={5}><Typography variant="body2" color="text.secondary">Account Status:</Typography></Grid>
                  <Grid item xs={7}>
                    <Chip
                      label={employee.status === 1 ? 'Active & Accessible' : 'Deactivated'}
                      color={employee.status === 1 ? 'success' : 'error'}
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  When this staff member is relieved via the exit action, their system user login will be automatically deactivated (FR-4.5).
                </Alert>
              </Stack>
            ) : (
              <Box sx={{ py: 2 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This staff member does not currently have an active ERP user login account.
                </Alert>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/staff/edit/${employee.id}`)}
                >
                  Setup User Account in Edit Staff
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Relieving / Exit Dialog */}
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
              Relieving <b>{employee.fullName}</b> ({employee.employeeCode}) will deactivate their system login and remove active teacher allocations.
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
                placeholder="e.g. Resignation accepted, handover complete..."
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
