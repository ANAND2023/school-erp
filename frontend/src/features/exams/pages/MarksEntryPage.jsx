import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalHospital as MedicalIcon,
  HelpOutline as AbsentIcon,
} from '@mui/icons-material';
import { examApi } from '../api';
import api from '../../../api/client';
import { usePermission } from '../../../hooks/usePermission';

export const MarksEntryPage = () => {
  const { isSuperAdmin } = usePermission();

  // Filter state
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');

  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  // Loaded Marks Data
  const [scheduleData, setScheduleData] = useState(null);
  const [studentRows, setStudentRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      const res = await api.get('/classes');
      const list = res.data?.data || [];
      setClasses(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
        const secs = list[0].sections || [];
        setSections(secs);
        if (secs.length > 0) setSelectedSectionId(secs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c.id === classId);
    const secs = found?.sections || [];
    setSections(secs);
    if (secs.length > 0) setSelectedSectionId(secs[0].id);
    else setSelectedSectionId('');
  };

  // Load exams when class changes
  useEffect(() => {
    if (selectedClassId) {
      loadExamsForClass();
    } else {
      setExams([]);
      setSelectedExamId('');
    }
  }, [selectedClassId]);

  const loadExamsForClass = async () => {
    try {
      const res = await examApi.getExams({ classId: selectedClassId });
      const examList = res.data?.data || [];
      setExams(examList);
      if (examList.length > 0) {
        setSelectedExamId(examList[0].id);
      } else {
        setSelectedExamId('');
        setSchedules([]);
        setSelectedScheduleId('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load schedules when exam changes
  useEffect(() => {
    if (selectedExamId) {
      loadSchedulesForExam();
    } else {
      setSchedules([]);
      setSelectedScheduleId('');
    }
  }, [selectedExamId]);

  const loadSchedulesForExam = async () => {
    try {
      const res = await examApi.getSchedules(selectedExamId);
      const schList = res.data?.data || [];
      setSchedules(schList);
      if (schList.length > 0) {
        setSelectedScheduleId(schList[0].id);
      } else {
        setSelectedScheduleId('');
        setStudentRows([]);
        setScheduleData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load students and existing marks
  useEffect(() => {
    if (selectedScheduleId && selectedSectionId) {
      loadMarksGrid();
    }
  }, [selectedScheduleId, selectedSectionId]);

  const loadMarksGrid = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await examApi.getMarksForEntry(selectedScheduleId, selectedSectionId);
      const data = res.data?.data || {};
      setScheduleData(data);
      setStudentRows(
        (data.students || []).map((s) => ({
          studentId: s.studentId,
          admissionNo: s.admissionNo,
          fullName: s.fullName,
          rollNo: s.rollNo,
          marksObtained: s.marksObtained !== null && s.marksObtained !== undefined ? s.marksObtained : '',
          isAbsent: s.isAbsent || false,
          isMedicalLeave: s.isMedicalLeave || false,
          remarks: s.remarks || '',
        }))
      );
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load marks grid.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (studentId, field, value) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;

        if (field === 'marksObtained') {
          // If entering marks, clear absent and medical leave
          return {
            ...row,
            marksObtained: value,
            isAbsent: false,
            isMedicalLeave: false,
          };
        }
        if (field === 'isAbsent') {
          return {
            ...row,
            isAbsent: value,
            isMedicalLeave: false,
            marksObtained: value ? '' : row.marksObtained,
          };
        }
        if (field === 'isMedicalLeave') {
          return {
            ...row,
            isMedicalLeave: value,
            isAbsent: false,
            marksObtained: value ? '' : row.marksObtained,
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleSaveAll = async () => {
    if (!scheduleData) return;

    // Validate marks BR-7.1
    for (const r of studentRows) {
      if (r.marksObtained !== '' && !r.isAbsent && !r.isMedicalLeave) {
        const val = Number(r.marksObtained);
        if (isNaN(val) || val < 0 || val > scheduleData.maxMarks) {
          setAlert({
            type: 'error',
            message: `Marks for student ${r.fullName} must be between 0 and maximum marks (${scheduleData.maxMarks}).`,
          });
          return;
        }
      }
    }

    setSaving(true);
    setAlert(null);
    try {
      const payload = {
        scheduleId: scheduleData.scheduleId,
        entries: studentRows.map((r) => ({
          studentId: r.studentId,
          marksObtained:
            r.isAbsent || r.isMedicalLeave || r.marksObtained === '' ? null : Number(r.marksObtained),
          isAbsent: r.isAbsent,
          isMedicalLeave: r.isMedicalLeave,
          remarks: r.remarks,
        })),
      };

      await examApi.saveMarksBulk(payload);
      setAlert({ type: 'success', message: 'Examination marks saved successfully!' });
      loadMarksGrid();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save marks.' });
    } finally {
      setSaving(false);
    }
  };

  const isLocked = scheduleData?.isLocked && !isSuperAdmin;

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
            Examination Marks Entry
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Enter marks, absent (AB) and medical leave (ML) class-section-subject wise
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
          onClick={handleSaveAll}
          disabled={saving || loading || studentRows.length === 0 || isLocked}
          sx={{
            px: 2.5,
            py: 0.6,
            fontWeight: 700,
            fontSize: { xs: '0.78rem', sm: '0.875rem' },
            width: { xs: '100%', sm: 'auto' },
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? 'Saving...' : 'Save Marks'}
        </Button>
      </Stack>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Selectors */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select value={selectedClassId} label="Class" onChange={(e) => handleClassChange(e.target.value)}>
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
                  disabled={!sections.length}
                >
                  {sections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      Section {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Exam</InputLabel>
                <Select
                  value={selectedExamId}
                  label="Exam"
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  disabled={!exams.length}
                >
                  {exams.map((ex) => (
                    <MenuItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Subject</InputLabel>
                <Select
                  value={selectedScheduleId}
                  label="Subject"
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  disabled={!schedules.length}
                >
                  {schedules.map((sch) => (
                    <MenuItem key={sch.id} value={sch.id}>
                      {sch.subjectName} ({sch.subjectCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Schedule Info Banner */}
      {scheduleData && (
        <Card sx={{ mb: 2, bgcolor: isLocked ? '#fff4e5' : '#f0fdf4', border: '1px solid', borderColor: isLocked ? '#ffb74d' : '#86efac' }}>
          <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>
                  {scheduleData.subjectName}
                </Typography>
                <Chip label={`Max Marks: ${scheduleData.maxMarks}`} size="small" color="primary" />
                <Chip label={`Pass Marks: ${scheduleData.passMarks}`} size="small" color="warning" />
                <Typography variant="body2" color="text.secondary">
                  Enrolled Students: <strong>{studentRows.length}</strong>
                </Typography>
              </Stack>
              {isLocked ? (
                <Chip icon={<LockIcon />} label="Marks Entry Locked (Admin Only)" color="error" size="small" />
              ) : (
                <Chip icon={<CheckCircleIcon />} label="Marks Entry Open" color="success" size="small" />
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Marks Grid Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>Roll No</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 140 }}>Admission No</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 160 }}>Marks Obtained</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 100 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 140 }}>Quick Flags</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  Loading students and marks...
                </TableCell>
              </TableRow>
            ) : studentRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No students or schedule selected. Select Class, Section, Exam and Subject.
                </TableCell>
              </TableRow>
            ) : (
              studentRows.map((row) => {
                const markVal = Number(row.marksObtained);
                const hasValidMark = row.marksObtained !== '' && !isNaN(markVal);
                const isPassing = hasValidMark && markVal >= (scheduleData?.passMarks || 33);
                const isFailing = hasValidMark && markVal < (scheduleData?.passMarks || 33);

                return (
                  <TableRow
                    key={row.studentId}
                    hover
                    sx={{
                      bgcolor: row.isAbsent ? '#fff1f2' : row.isMedicalLeave ? '#f0f9ff' : 'inherit',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{row.rollNo ? `#${row.rollNo}` : '—'}</TableCell>
                    <TableCell>{row.admissionNo}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{row.fullName}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        placeholder={`0 - ${scheduleData?.maxMarks}`}
                        value={row.marksObtained}
                        disabled={isLocked || row.isAbsent || row.isMedicalLeave}
                        onChange={(e) => handleRowChange(row.studentId, 'marksObtained', e.target.value)}
                        sx={{
                          width: 130,
                          '& input': {
                            fontWeight: 700,
                            color: isPassing ? '#15803d' : isFailing ? '#b91c1c' : 'inherit',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.isAbsent ? (
                        <Chip label="Absent" size="small" color="error" />
                      ) : row.isMedicalLeave ? (
                        <Chip label="Medical" size="small" color="info" />
                      ) : isPassing ? (
                        <Chip label="Pass" size="small" color="success" variant="outlined" />
                      ) : isFailing ? (
                        <Chip label="Fail" size="small" color="error" variant="outlined" />
                      ) : (
                        <Chip label="Pending" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Mark Absent (AB)">
                          <IconButton
                            size="small"
                            color={row.isAbsent ? 'error' : 'default'}
                            disabled={isLocked}
                            onClick={() => handleRowChange(row.studentId, 'isAbsent', !row.isAbsent)}
                          >
                            <AbsentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Medical Leave (ML)">
                          <IconButton
                            size="small"
                            color={row.isMedicalLeave ? 'info' : 'default'}
                            disabled={isLocked}
                            onClick={() => handleRowChange(row.studentId, 'isMedicalLeave', !row.isMedicalLeave)}
                          >
                            <MedicalIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Optional remarks"
                        value={row.remarks}
                        disabled={isLocked}
                        onChange={(e) => handleRowChange(row.studentId, 'remarks', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MarksEntryPage;
