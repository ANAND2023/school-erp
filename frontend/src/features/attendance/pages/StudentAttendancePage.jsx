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
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircleOutline as CheckAllIcon,
  HighlightOff as AbsentAllIcon,
  EventBusy as HolidayIcon,
  Info as InfoIcon,
  Person as StudentIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import { getStudentAttendance, saveStudentAttendanceBulk } from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';
import { useUiStore } from '../../../store/uiStore';

const STATUS_CONFIG = {
  1: { label: 'Present', color: 'success', bg: '#e8f5e9' },
  2: { label: 'Absent', color: 'error', bg: '#ffebee' },
  3: { label: 'Leave', color: 'info', bg: '#e1f5fe' },
  4: { label: 'Half Day', color: 'warning', bg: '#fff3e0' },
  5: { label: 'Late', color: 'secondary', bg: '#f3e5f5' },
};

const StudentAttendancePage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceSheet, setAttendanceSheet] = useState(null);
  const [studentRows, setStudentRows] = useState([]);
  const { showSnackbar } = useUiStore();

  // 1. Fetch Classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      const list = res.data?.data || res.data || [];
      setClasses(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
        const secs = list[0].sections || [];
        setSections(secs);
        if (secs.length > 0) {
          setSelectedSectionId(secs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to load classes.', 'error');
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c.id === classId);
    const secs = found?.sections || [];
    setSections(secs);
    if (secs.length > 0) {
      setSelectedSectionId(secs[0].id);
    } else {
      setSelectedSectionId('');
      setAttendanceSheet(null);
      setStudentRows([]);
    }
  };

  // 2. Fetch Attendance when section or date changes
  useEffect(() => {
    if (selectedSectionId && date) {
      loadAttendance();
    }
  }, [selectedSectionId, date]);

  const loadAttendance = async (preserveAlert = false) => {
    setLoading(true);
    
    try {
      const res = await getStudentAttendance(selectedSectionId, date);
      const data = res.data?.data || res.data;
      setAttendanceSheet(data);
      setStudentRows(
        (data.students || []).map((s) => ({
          studentId: s.studentId,
          enrollmentId: s.enrollmentId,
          admissionNo: s.admissionNo,
          rollNo: s.rollNo,
          fullName: s.fullName,
          gender: s.gender,
          status: s.status || 1, // Present by default (FR-6.1)
          remarks: s.remarks || '',
        }))
      );
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to load attendance sheet.';
      showSnackbar(msg, 'error');
      setAttendanceSheet(null);
      setStudentRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle row status change
  const handleStatusChange = (studentId, status) => {
    setStudentRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, status } : row))
    );
  };

  // Handle remarks change
  const handleRemarksChange = (studentId, remarks) => {
    setStudentRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, remarks } : row))
    );
  };

  // Bulk mark all
  const markAll = (status) => {
    setStudentRows((prev) => prev.map((row) => ({ ...row, status })));
  };

  // Save Attendance
  const handleSave = async () => {
    if (!selectedSectionId) return;
    setSaving(true);
    
    try {
      const payload = {
        sectionId: selectedSectionId,
        date: date,
        attendances: studentRows.map((r) => ({
          studentId: r.studentId,
          enrollmentId: r.enrollmentId,
          status: r.status,
          remarks: r.remarks,
        })),
      };
      await saveStudentAttendanceBulk(payload);
      showSnackbar('Attendance recorded successfully!', 'success');
      // Reload to reflect saved state
      loadAttendance(true);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save attendance.';
      showSnackbar(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Compute live counts
  const counts = studentRows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );

  const isBlocked = attendanceSheet?.isSunday || attendanceSheet?.isHoliday;
  const isReadOnly = isBlocked || (attendanceSheet && !attendanceSheet.isEditable);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Daily Student Attendance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mark daily class attendance with real-time status counts and instant absence reporting (FR-6.1, FR-6.2, BR-6.1)
          </Typography>
        </Box>
        {attendanceSheet && !isReadOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || studentRows.length === 0}
            sx={{ px: 3, py: 1 }}
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        )}
      </Box>

      {/* Filter / Selector Bar */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={selectedClassId}
                  label="Class"
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Section</InputLabel>
                <Select
                  value={selectedSectionId}
                  label="Section"
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                >
                  {sections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <AppDatePicker
                label="Attendance Date"
                value={date}
                onChange={(e) => setDate(e.value)}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<CheckAllIcon />}
                  onClick={() => markAll(1)}
                  disabled={isReadOnly || studentRows.length === 0}
                >
                  All Present
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<AbsentAllIcon />}
                  onClick={() => markAll(2)}
                  disabled={isReadOnly || studentRows.length === 0}
                >
                  All Absent
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Holiday / Sunday / Editability Notice */}
      {attendanceSheet?.isSunday && (
        <Alert severity="warning" icon={<HolidayIcon />} sx={{ mb: 3 }}>
          <strong>Sunday:</strong> Attendance marking is blocked on Sundays (FR-6.2).
        </Alert>
      )}

      {attendanceSheet?.isHoliday && (
        <Alert severity="warning" icon={<HolidayIcon />} sx={{ mb: 3 }}>
          <strong>Holiday:</strong> Attendance marking is blocked for{' '}
          <strong>{attendanceSheet.holidayName}</strong> (FR-6.2).
        </Alert>
      )}

      {attendanceSheet && !attendanceSheet.isEditable && !isBlocked && (
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <strong>Past Date:</strong> Teachers can only mark attendance for the current day. Editing past attendance requires Admin authorization (BR-6.1).
        </Alert>
      )}

      {/* Attendance Summary Counter Bar */}
      {studentRows.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label={`Total: ${studentRows.length}`} color="default" variant="outlined" sx={{ fontWeight: 700 }} />
          <Chip label={`Present: ${counts[1]}`} color="success" sx={{ fontWeight: 700 }} />
          <Chip label={`Absent: ${counts[2]}`} color="error" sx={{ fontWeight: 700 }} />
          <Chip label={`Leave: ${counts[3]}`} color="info" sx={{ fontWeight: 700 }} />
          <Chip label={`Half Day: ${counts[4]}`} color="warning" sx={{ fontWeight: 700 }} />
          <Chip label={`Late: ${counts[5]}`} color="secondary" sx={{ fontWeight: 700 }} />

          {attendanceSheet?.alreadyMarked && (
            <Chip
              label="Already Marked (Saved)"
              color="primary"
              variant="outlined"
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
        </Paper>
      )}

      {/* Student Attendance Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : studentRows.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <StudentIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No active students enrolled in this section.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>Roll No</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Admission No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 90 }}>Gender</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 440 }}>
                  Attendance Status (FR-6.1)
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 220 }}>Remarks / Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentRows.map((row, index) => {
                const config = STATUS_CONFIG[row.status] || STATUS_CONFIG[1];
                return (
                  <TableRow
                    key={row.studentId}
                    hover
                    sx={{
                      bgcolor: row.status === 2 ? '#fff8f8' : index % 2 === 0 ? '#fff' : '#fafafa',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{row.rollNo ?? '-'}</TableCell>
                    <TableCell>{row.admissionNo}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                    <TableCell>{row.gender}</TableCell>

                    {/* Status Options */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <RadioGroup
                        row
                        value={row.status}
                        onChange={(e) => handleStatusChange(row.studentId, Number(e.target.value))}
                        sx={{ justifyContent: 'center' }}
                      >
                        <FormControlLabel
                          value={1}
                          control={<Radio size="small" color="success" disabled={isReadOnly} />}
                          label={<Typography variant="body2" sx={{ color: 'success.main', fontWeight: row.status === 1 ? 700 : 400 }}>Present</Typography>}
                        />
                        <FormControlLabel
                          value={2}
                          control={<Radio size="small" color="error" disabled={isReadOnly} />}
                          label={<Typography variant="body2" sx={{ color: 'error.main', fontWeight: row.status === 2 ? 700 : 400 }}>Absent</Typography>}
                        />
                        <FormControlLabel
                          value={3}
                          control={<Radio size="small" color="info" disabled={isReadOnly} />}
                          label={<Typography variant="body2" sx={{ color: 'info.main', fontWeight: row.status === 3 ? 700 : 400 }}>Leave</Typography>}
                        />
                        <FormControlLabel
                          value={4}
                          control={<Radio size="small" color="warning" disabled={isReadOnly} />}
                          label={<Typography variant="body2" sx={{ color: 'warning.main', fontWeight: row.status === 4 ? 700 : 400 }}>Half Day</Typography>}
                        />
                        <FormControlLabel
                          value={5}
                          control={<Radio size="small" color="secondary" disabled={isReadOnly} />}
                          label={<Typography variant="body2" sx={{ color: 'secondary.main', fontWeight: row.status === 5 ? 700 : 400 }}>Late</Typography>}
                        />
                      </RadioGroup>
                    </TableCell>

                    {/* Remarks Input */}
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Optional remarks"
                        value={row.remarks}
                        onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StudentAttendancePage;
