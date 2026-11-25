import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircleOutline as CheckAllIcon,
  HighlightOff as AbsentAllIcon,
  Badge as StaffIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import { getStaffAttendance, saveStaffAttendanceBulk } from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';

const StaffAttendancePage = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceSheet, setAttendanceSheet] = useState(null);
  const [staffRows, setStaffRows] = useState([]);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/simplemasters?type=Department');
      const list = res.data?.data || res.data || [];
      setDepartments(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (date) {
      loadAttendance();
    }
  }, [date, selectedDeptId]);

  const loadAttendance = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await getStaffAttendance(date, selectedDeptId || null);
      const data = res.data?.data || res.data;
      setAttendanceSheet(data);
      setStaffRows(
        (data.staff || []).map((s) => ({
          employeeId: s.employeeId,
          employeeCode: s.employeeCode,
          fullName: s.fullName,
          departmentName: s.departmentName,
          designationName: s.designationName,
          status: s.status || 1, // Present by default
          inTime: s.inTime || '08:30',
          outTime: s.outTime || '15:30',
          remarks: s.remarks || '',
        }))
      );
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to load staff attendance.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (employeeId, field, val) => {
    setStaffRows((prev) =>
      prev.map((r) => (r.employeeId === employeeId ? { ...r, [field]: val } : r))
    );
  };

  const markAll = (status) => {
    setStaffRows((prev) => prev.map((r) => ({ ...r, status })));
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const payload = {
        date,
        attendances: staffRows.map((r) => ({
          employeeId: r.employeeId,
          status: r.status,
          inTime: r.inTime,
          outTime: r.outTime,
          remarks: r.remarks,
        })),
      };
      await saveStaffAttendanceBulk(payload);
      setAlert({ type: 'success', message: 'Staff attendance recorded successfully!' });
      loadAttendance();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save staff attendance.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const counts = staffRows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 6: 0, 7: 0 }
  );

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2 }}>
            Daily Staff Attendance
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Log employee attendance, duty hours, in/out timings and leave status
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || staffRows.length === 0}
          sx={{ px: 3, py: 1 }}
        >
          {saving ? 'Saving...' : 'Save Staff Attendance'}
        </Button>
      </Box>

      {/* Alert Notifications */}
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Filter / Selector Bar */}
      <Card sx={{ mb: 1.5, boxShadow: 1, borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <AppDatePicker
                label="Attendance Date"
                value={date}
                onChange={(e) => setDate(e.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={selectedDeptId}
                  label="Department"
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<CheckAllIcon />}
                  onClick={() => markAll(1)}
                  disabled={staffRows.length === 0}
                >
                  All Present
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<AbsentAllIcon />}
                  onClick={() => markAll(2)}
                  disabled={staffRows.length === 0}
                >
                  All Absent
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Counter Bar */}
      {staffRows.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label={`Total Staff: ${staffRows.length}`} color="default" variant="outlined" sx={{ fontWeight: 700 }} />
          <Chip label={`Present: ${counts[1]}`} color="success" sx={{ fontWeight: 700 }} />
          <Chip label={`Absent: ${counts[2]}`} color="error" sx={{ fontWeight: 700 }} />
          <Chip label={`CL: ${counts[6]}`} sx={{ fontWeight: 700, bgcolor: '#ccfbf1', color: '#0f766e' }} />
          <Chip label={`SL: ${counts[7]}`} sx={{ fontWeight: 700, bgcolor: '#f3e8ff', color: '#7e22ce' }} />
          <Chip label={`Leave: ${counts[3]}`} color="info" sx={{ fontWeight: 700 }} />
          <Chip label={`Half Day: ${counts[4]}`} color="warning" sx={{ fontWeight: 700 }} />

          {attendanceSheet?.alreadyMarked && (
            <Chip
              label="Already Recorded for Today"
              color="primary"
              variant="outlined"
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
        </Paper>
      )}

      {/* Staff Attendance Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : staffRows.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <StaffIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No active staff members found.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Employee Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Employee Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 440 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>In Time</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Out Time</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffRows.map((row, index) => (
                <TableRow
                  key={row.employeeId}
                  hover
                  sx={{
                    bgcolor:
                      row.status === 2
                        ? '#fff8f8'
                        : row.status === 6
                        ? '#f0fdfa'
                        : row.status === 7
                        ? '#faf5ff'
                        : row.status === 3
                        ? '#f0f9ff'
                        : row.status === 4
                        ? '#fffbeb'
                        : index % 2 === 0
                        ? '#fff'
                        : '#fafafa',
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{row.employeeCode}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                  <TableCell>{row.departmentName || '-'}</TableCell>
                  <TableCell>{row.designationName || '-'}</TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <RadioGroup
                      row
                      value={row.status}
                      onChange={(e) => handleRowChange(row.employeeId, 'status', Number(e.target.value))}
                      sx={{ justifyContent: 'center', flexWrap: 'nowrap', gap: 0.5 }}
                    >
                      <FormControlLabel
                        value={1}
                        control={<Radio size="small" color="success" sx={{ p: 0.5 }} />}
                        label={<Typography variant="body2" sx={{ color: 'success.main', fontWeight: row.status === 1 ? 700 : 400, fontSize: '0.8rem' }}>Present</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        value={2}
                        control={<Radio size="small" color="error" sx={{ p: 0.5 }} />}
                        label={<Typography variant="body2" sx={{ color: 'error.main', fontWeight: row.status === 2 ? 700 : 400, fontSize: '0.8rem' }}>Absent</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        value={6}
                        control={<Radio size="small" sx={{ p: 0.5, color: '#0d9488', '&.Mui-checked': { color: '#0f766e' } }} />}
                        label={<Typography variant="body2" sx={{ color: '#0f766e', fontWeight: row.status === 6 ? 700 : 500, fontSize: '0.8rem' }}>CL</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        value={7}
                        control={<Radio size="small" sx={{ p: 0.5, color: '#9333ea', '&.Mui-checked': { color: '#7e22ce' } }} />}
                        label={<Typography variant="body2" sx={{ color: '#7e22ce', fontWeight: row.status === 7 ? 700 : 500, fontSize: '0.8rem' }}>SL</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        value={3}
                        control={<Radio size="small" color="info" sx={{ p: 0.5 }} />}
                        label={<Typography variant="body2" sx={{ color: 'info.main', fontWeight: row.status === 3 ? 700 : 400, fontSize: '0.8rem' }}>Leave</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        value={4}
                        control={<Radio size="small" color="warning" sx={{ p: 0.5 }} />}
                        label={<Typography variant="body2" sx={{ color: 'warning.main', fontWeight: row.status === 4 ? 700 : 400, fontSize: '0.8rem' }}>Half Day</Typography>}
                        sx={{ m: 0 }}
                      />
                    </RadioGroup>
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      type="time"
                      value={row.inTime}
                      onChange={(e) => handleRowChange(row.employeeId, 'inTime', e.target.value)}
                      disabled={row.status === 2 || row.status === 3 || row.status === 6 || row.status === 7}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      type="time"
                      value={row.outTime}
                      onChange={(e) => handleRowChange(row.employeeId, 'outTime', e.target.value)}
                      disabled={row.status === 2 || row.status === 3}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Remarks"
                      value={row.remarks}
                      onChange={(e) => handleRowChange(row.employeeId, 'remarks', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StaffAttendancePage;
