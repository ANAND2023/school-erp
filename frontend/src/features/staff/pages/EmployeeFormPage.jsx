import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  Avatar,
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  AccountBalance as BankIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { staffApi } from '../api';
import { simpleMasterApi } from '../../masters/api';
import apiClient from '../../../api/client';
import { PhotoCaptureUpload } from '../../students/components/PhotoCaptureUpload';
import { AppDatePicker } from '../../../components/common/AppDatePicker';

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    departmentId: '',
    designationId: '',
    joiningDate: dayjs().format('YYYY-MM-DD'),
    mobile: '',
    email: '',
    gender: 'Male',
    dateOfBirth: '',
    qualification: '',
    experienceYears: '',
    panNo: '',
    aadhaarNo: '',
    bankName: '',
    accountNo: '',
    ifscCode: '',
    salaryBasic: '',
    photoUrl: '',
    status: 1,
    // Auto-create user
    hasUserAccount: false, autoCreateUser: false,
    username: '',
    password: '',
    roleId: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

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

  // Fetch roles for user creation
  const { data: rolesRes } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => apiClient.get('/roles'),
    enabled: !isEdit,
  });
  const roles = (rolesRes?.data?.data || []).filter(
    (r) => !r.name.toLowerCase().includes('super admin')
  );

  // Fetch next employee code if creating
  const { data: nextCodeRes } = useQuery({
    queryKey: ['next-employee-code'],
    queryFn: () => staffApi.getNextCode(),
    enabled: !isEdit,
  });

  useEffect(() => {
    if (!isEdit && nextCodeRes?.data?.data && !formData.employeeCode) {
      setFormData((prev) => ({ ...prev, employeeCode: nextCodeRes.data.data }));
    }
  }, [nextCodeRes, isEdit]);

  // Fetch existing employee if editing
  const { data: employeeRes, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['employee-detail', id],
    queryFn: () => staffApi.getEmployee(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && employeeRes?.data?.data) {
      const e = employeeRes.data.data;
      setFormData({
        employeeCode: e.employeeCode || '',
        firstName: e.firstName || '',
        lastName: e.lastName || '',
        departmentId: e.departmentId || '',
        designationId: e.designationId || '',
        joiningDate: e.joiningDate ? dayjs(e.joiningDate).format('YYYY-MM-DD') : '',
        mobile: e.mobile || '',
        email: e.email || '',
        gender: e.gender || 'Male',
        dateOfBirth: e.dateOfBirth ? dayjs(e.dateOfBirth).format('YYYY-MM-DD') : '',
        qualification: e.qualification || '',
        experienceYears: e.experienceYears ?? '',
        panNo: e.panNo || '',
        aadhaarNo: e.aadhaarNo || '',
        bankName: e.bankName || '',
        accountNo: e.accountNo || '',
        ifscCode: e.ifscCode || '',
        salaryBasic: e.salaryBasic ?? '',
        photoUrl: e.photoUrl || '',
        status: e.status || 1, hasUserAccount: !!e.userId || !!e.hasUserAccount, autoCreateUser: false,
        username: '',
        password: '',
        roleId: '',
      });
    }
  }, [isEdit, employeeRes]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (isEdit) {
        return staffApi.updateEmployee(id, payload);
      } else {
        return staffApi.createEmployee(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-directory']);
      navigate('/staff');
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to save employee.');
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.firstName.trim()) {
      setErrorMsg('First Name is required.');
      return;
    }
    if (!formData.mobile.trim()) {
      setErrorMsg('Mobile number is required.');
      return;
    }

    const payload = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email?.trim() || null,
      departmentId: formData.departmentId ? Number(formData.departmentId) : null,
      designationId: formData.designationId ? Number(formData.designationId) : null,
      experienceYears: formData.experienceYears !== '' ? Number(formData.experienceYears) : null,
      salaryBasic: formData.salaryBasic !== '' ? Number(formData.salaryBasic) : null,
      roleId: formData.roleId ? Number(formData.roleId) : null,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingEmployee) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/staff')}>
          Back to Directory
        </Button>
        <Typography variant="h5" fontWeight={700}>
          {isEdit ? `Edit Staff Member (${formData.employeeCode})` : 'New Staff & Employee Onboarding'}
        </Typography>
      </Stack>

      {errorMsg && <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>}

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Section 1: Personal Details */}
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  1. Personal & Contact Information
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2.5 }} />

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'flex-start' }}>
                {/* Staff Photo Upload on Left */}
                <Box sx={{ width: { xs: '100%', md: 140 }, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <PhotoCaptureUpload
                    label="Staff Photo"
                    value={formData.photoUrl}
                    onChange={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1, fontSize: '11px' }}>
                    Capture webcam photo or upload picture
                  </Typography>
                </Box>

                {/* Personal Fields on Right */}
                <Box sx={{ flex: 1, width: '100%' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        label="First Name"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Gender"
                        value={formData.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                      >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AppDatePicker
                        label="Date of Birth"
                        value={formData.dateOfBirth}
                        onChange={(e) => {
                          if (e.value) {
                            handleChange('dateOfBirth', dayjs(e.value).format('YYYY-MM-DD'));
                          } else {
                            handleChange('dateOfBirth', '');
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        label="Mobile Number"
                        value={formData.mobile}
                        inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                        onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="email"
                        label="Email Address"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Photo URL (Direct or Auto-filled)"
                        value={formData.photoUrl}
                        onChange={(e) => handleChange('photoUrl', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Section 2: Job & Position Details */}
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <WorkIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  2. Job & Position Details (FR-4.1)
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Employee Code"
                    value={formData.employeeCode}
                    disabled={isEdit}
                    helperText={isEdit ? 'Code cannot be changed' : 'Auto-suggested code'}
                    onChange={(e) => handleChange('employeeCode', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Department"
                    value={formData.departmentId}
                    onChange={(e) => handleChange('departmentId', e.target.value)}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Designation"
                    value={formData.designationId}
                    onChange={(e) => handleChange('designationId', e.target.value)}
                  >
                    <MenuItem value="">Select Designation</MenuItem>
                    {designations.map((d) => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <AppDatePicker
                    required
                    label="Joining Date"
                    value={formData.joiningDate}
                    onChange={(e) => {
                      if (e.value) {
                        handleChange('joiningDate', dayjs(e.value).format('YYYY-MM-DD'));
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Basic Monthly Salary (₹)"
                    value={formData.salaryBasic}
                    onChange={(e) => handleChange('salaryBasic', e.target.value)}
                  />
                </Grid>

                {isEdit && (
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Status"
                      value={formData.status}
                      onChange={(e) => handleChange('status', Number(e.target.value))}
                    >
                      <MenuItem value={1}>Active</MenuItem>
                      <MenuItem value={2}>On Leave</MenuItem>
                      <MenuItem value={3}>Resigned</MenuItem>
                      <MenuItem value={4}>Terminated</MenuItem>
                      <MenuItem value={5}>Retired</MenuItem>
                    </TextField>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Section 3: Qualifications & Identity */}
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SchoolIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  3. Qualifications & Identity Documents
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Highest Qualification"
                    placeholder="e.g. B.Ed, M.Sc, M.A."
                    value={formData.qualification}
                    onChange={(e) => handleChange('qualification', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Experience (in Years)"
                    value={formData.experienceYears}
                    onChange={(e) => handleChange('experienceYears', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="PAN Card Number"
                    value={formData.panNo}
                    onChange={(e) => handleChange('panNo', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Aadhaar Card Number"
                    value={formData.aadhaarNo}
                    inputProps={{ maxLength: 12, inputMode: 'numeric', pattern: '[0-9]*' }}
                    onChange={(e) => handleChange('aadhaarNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Section 4: Bank & Payroll */}
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <BankIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  4. Bank & Salary Account Details
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Bank Name"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Account Number"
                    value={formData.accountNo}
                    onChange={(e) => handleChange('accountNo', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="IFSC Code"
                    value={formData.ifscCode}
                    onChange={(e) => handleChange('ifscCode', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Section 5: Auto Create User Login (FR-4.2) */}
          {(!isEdit || !formData.hasUserAccount) && (
            <Card sx={{ boxShadow: 1, bgcolor: '#fbfcfd', border: formData.autoCreateUser ? '2px solid #1976d2' : '1px solid #e0e0e0' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <KeyIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    5. System User Login Credentials (FR-4.2)
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.autoCreateUser}
                      onChange={(e) => handleChange('autoCreateUser', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<b>Automatically create ERP login user account for this staff member (FR-4.2)</b>}
                />

                {formData.autoCreateUser && (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        required={formData.autoCreateUser}
                        label="Username"
                        placeholder="e.g. john.doe"
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        label="Initial Password"
                        placeholder="Default: Staff@123"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        required={formData.autoCreateUser}
                        label="Assigned Role"
                        value={formData.roleId}
                        onChange={(e) => handleChange('roleId', e.target.value)}
                      >
                        <MenuItem value="">Select Role</MenuItem>
                        {roles.map((r) => (
                          <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pb: 4 }}>
            <Button variant="outlined" color="inherit" onClick={() => navigate('/staff')}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              loading={saveMutation.isPending}
            >
              {isEdit ? 'Save Employee Changes' : 'Create & Onboard Employee'}
            </Button>
          </Box>
        </Stack>
      </form>
    </Box>
  );
}


