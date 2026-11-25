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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import {
  getSubstitutions,
  createSubstitution,
  deleteSubstitution,
  getPeriods,
  getFreeTeachers,
} from '../api';
import AppDatePicker from '../../../components/common/AppDatePicker';

const SubstitutionPage = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [substitutions, setSubstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Masters
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    substitutionDate: new Date().toISOString().split('T')[0],
    classId: '',
    sectionId: '',
    periodId: '',
    subjectId: '',
    originalEmployeeId: '',
    substituteEmployeeId: '',
    remarks: '',
  });
  const [sectionsForModal, setSectionsForModal] = useState([]);
  const [freeTeachers, setFreeTeachers] = useState([]);
  const [freeLoading, setFreeLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    if (date) {
      loadSubstitutions();
    }
  }, [date]);

  const fetchMasters = async () => {
    try {
      const [classRes, periodRes, empRes, subRes] = await Promise.all([
        api.get('/classes'),
        getPeriods(),
        api.get('/employees'),
        api.get('/subjects'),
      ]);
      setClasses(classRes.data?.data || classRes.data || []);
      setPeriods(periodRes.data?.data || periodRes.data || []);
      setTeachers(empRes.data?.data?.items || (Array.isArray(empRes.data?.data) ? empRes.data?.data : []));
      setSubjects(subRes.data?.data || subRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSubstitutions = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await getSubstitutions(date);
      setSubstitutions(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load substitutions.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    const firstClass = classes[0];
    const secs = firstClass?.sections || [];
    setSectionsForModal(secs);

    setModalForm({
      substitutionDate: date,
      classId: firstClass?.id || '',
      sectionId: secs[0]?.id || '',
      periodId: periods[0]?.id || '',
      subjectId: subjects[0]?.id || '',
      originalEmployeeId: teachers[0]?.id || '',
      substituteEmployeeId: '',
      remarks: '',
    });
    setFreeTeachers([]);
    setDialogOpen(true);
  };

  const handleModalClassChange = (classId) => {
    const found = classes.find((c) => c.id === classId);
    const secs = found?.sections || [];
    setSectionsForModal(secs);
    setModalForm({
      ...modalForm,
      classId,
      sectionId: secs[0]?.id || '',
    });
  };

  // Fetch free teachers when date or period changes
  useEffect(() => {
    if (dialogOpen && modalForm.substitutionDate && modalForm.periodId) {
      fetchFreeTeachersList();
    }
  }, [dialogOpen, modalForm.substitutionDate, modalForm.periodId]);

  const fetchFreeTeachersList = async () => {
    setFreeLoading(true);
    try {
      const res = await getFreeTeachers(modalForm.substitutionDate, modalForm.periodId);
      const list = res.data?.data || res.data || [];
      setFreeTeachers(list);
      if (list.length > 0) {
        setModalForm((prev) => ({ ...prev, substituteEmployeeId: list[0].employeeId }));
      } else {
        setModalForm((prev) => ({ ...prev, substituteEmployeeId: '' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFreeLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!modalForm.substituteEmployeeId) {
      setAlert({ type: 'error', message: 'Please select an available substitute teacher.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        substitutionDate: modalForm.substitutionDate,
        periodId: modalForm.periodId,
        sectionId: modalForm.sectionId,
        subjectId: modalForm.subjectId || null,
        originalEmployeeId: modalForm.originalEmployeeId,
        substituteEmployeeId: modalForm.substituteEmployeeId,
        remarks: modalForm.remarks,
      };
      await createSubstitution(payload);
      setAlert({ type: 'success', message: 'Substitution arranged successfully!' });
      setDialogOpen(false);
      loadSubstitutions();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to create substitution.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this substitution?')) return;
    try {
      await deleteSubstitution(id);
      setAlert({ type: 'success', message: 'Substitution cancelled successfully.' });
      loadSubstitutions();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to cancel substitution.' });
    }
  };

  return (
    <Box sx={{ pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2 }}>
            Teacher Substitutions (Proxy)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Assign available teachers to cover classes when colleagues are absent or on leave
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ px: 3 }}>
          Arrange Substitution
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Date Filter Card */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <AppDatePicker
                label="Substitution Date"
                value={date}
                onChange={(e) => setDate(e.value)}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <Typography variant="body2" color="text.secondary">
                Showing all substitute arrangements recorded for{' '}
                <strong>{new Date(date).toLocaleDateString()}</strong>.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : substitutions.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <SwapIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No substitutions arranged for this date.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Class & Section</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Original Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Substitute Teacher (Proxy)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {substitutions.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{row.periodName}</TableCell>
                  <TableCell>{row.timeRange}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {row.className} - {row.sectionName}
                  </TableCell>
                  <TableCell>{row.subjectName || '-'}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: 600 }}>
                    {row.originalEmployeeName}
                  </TableCell>
                  <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>
                    {row.substituteEmployeeName}
                  </TableCell>
                  <TableCell>{row.remarks || '-'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="Cancel Substitution">
                      <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Arrange Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Arrange Teacher Substitution</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="Date"
                value={modalForm.substitutionDate}
                onChange={(e) =>
                  setModalForm({ ...modalForm, substitutionDate: e.value })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select
                  value={modalForm.periodId}
                  label="Period"
                  onChange={(e) => setModalForm({ ...modalForm, periodId: e.target.value })}
                >
                  {periods
                    .filter((p) => !p.isBreak)
                    .map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name} ({p.startTime} - {p.endTime})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={modalForm.classId}
                  label="Class"
                  onChange={(e) => handleModalClassChange(e.target.value)}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Section</InputLabel>
                <Select
                  value={modalForm.sectionId}
                  label="Section"
                  onChange={(e) => setModalForm({ ...modalForm, sectionId: e.target.value })}
                >
                  {sectionsForModal.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Subject</InputLabel>
                <Select
                  value={modalForm.subjectId}
                  label="Subject"
                  onChange={(e) => setModalForm({ ...modalForm, subjectId: e.target.value })}
                >
                  <MenuItem value="">-- None --</MenuItem>
                  {subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Original (Absent) Teacher</InputLabel>
                <Select
                  value={modalForm.originalEmployeeId}
                  label="Original (Absent) Teacher"
                  onChange={(e) =>
                    setModalForm({ ...modalForm, originalEmployeeId: e.target.value })
                  }
                >
                  {teachers.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Free Teacher Auto-Filtered Selector */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>
                  {freeLoading ? 'Checking available teachers...' : 'Substitute (Available Faculty) *'}
                </InputLabel>
                <Select
                  value={modalForm.substituteEmployeeId}
                  label="Substitute (Available Faculty) *"
                  onChange={(e) =>
                    setModalForm({ ...modalForm, substituteEmployeeId: e.target.value })
                  }
                  disabled={freeLoading || freeTeachers.length === 0}
                >
                  {freeTeachers.length === 0 ? (
                    <MenuItem value="">No free teachers found for this period</MenuItem>
                  ) : (
                    freeTeachers.map((ft) => (
                      <MenuItem key={ft.employeeId} value={ft.employeeId}>
                        {ft.fullName} ({ft.employeeCode} - {ft.departmentName})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              {freeTeachers.length > 0 && (
                <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                  {freeTeachers.length} faculty members have no timetable clashes or approved leaves on this period.
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Remarks / Proxy Note"
                placeholder="e.g. Teacher on medical leave, class will cover Chapter 4 revision"
                value={modalForm.remarks}
                onChange={(e) => setModalForm({ ...modalForm, remarks: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving || !modalForm.substituteEmployeeId}>
            {saving ? 'Arranging...' : 'Confirm Substitution'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubstitutionPage;
