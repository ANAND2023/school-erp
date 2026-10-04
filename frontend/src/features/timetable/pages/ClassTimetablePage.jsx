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
  Stack,
  IconButton,
  Tooltip,
  Drawer,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as PeriodIcon,
  TableChart as GridIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import {
  getPeriods,
  createPeriod,
  deletePeriod,
  getSectionTimetable,
  saveTimetableSlot,
  deleteTimetableSlot,
} from '../api';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const ClassTimetablePage = () => {
  // Class / Section
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Masters
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [periods, setPeriods] = useState([]);

  // Timetable State
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Slot Assignment Dialog
  const [slotDialog, setSlotDialog] = useState(false);
  const [currentSlot, setCurrentSlot] = useState({
    slotId: null,
    dayOfWeek: 1,
    periodId: null,
    periodName: '',
    subjectId: '',
    employeeId: '',
    roomNo: '',
  });
  const [slotSaving, setSlotSaving] = useState(false);

  // Period Master Drawer
  const [periodDrawer, setPeriodDrawer] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    periodNumber: 1,
    name: 'Period 1',
    startTime: '08:30',
    endTime: '09:15',
    isBreak: false,
    displayOrder: 1,
  });

  useEffect(() => {
    fetchInitialData();
    fetchPeriods();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classRes, subRes, empRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/employees'),
      ]);
      const classList = classRes.data?.data || classRes.data || [];
      setClasses(classList);
      setSubjects(subRes.data?.data || subRes.data || []);
      const empList = empRes.data?.data?.items || (Array.isArray(empRes.data?.data) ? empRes.data?.data : []);
      setTeachers(empList);

      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
        const secs = classList[0].sections || [];
        setSections(secs);
        if (secs.length > 0) setSelectedSectionId(secs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await getPeriods();
      setPeriods(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
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
      setTimetable(null);
    }
  };

  useEffect(() => {
    if (selectedSectionId) {
      loadTimetable();
    }
  }, [selectedSectionId]);

  const loadTimetable = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await getSectionTimetable(selectedSectionId);
      setTimetable(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load section timetable.' });
    } finally {
      setLoading(false);
    }
  };

  // Open slot dialog
  const handleOpenSlot = (dayId, period) => {
    const existing = (timetable?.slots || []).find(
      (s) => s.dayOfWeek === dayId && s.periodId === period.id
    );

    setCurrentSlot({
      slotId: existing?.id || null,
      dayOfWeek: dayId,
      periodId: period.id,
      periodName: period.name,
      subjectId: existing?.subjectId || '',
      employeeId: existing?.employeeId || '',
      roomNo: existing?.roomNo || '',
    });
    setSlotDialog(true);
  };

  const handleSaveSlot = async () => {
    setSlotSaving(true);
    setAlert(null);
    try {
      const payload = {
        sectionId: selectedSectionId,
        dayOfWeek: currentSlot.dayOfWeek,
        periodId: currentSlot.periodId,
        subjectId: currentSlot.subjectId || null,
        employeeId: currentSlot.employeeId || null,
        roomNo: currentSlot.roomNo || null,
      };

      await saveTimetableSlot(payload);
      setAlert({ type: 'success', message: 'Timetable slot assigned successfully!' });
      setSlotDialog(false);
      loadTimetable();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save timetable slot.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSlotSaving(false);
    }
  };

  const handleClearSlot = async () => {
    if (!currentSlot.slotId) {
      setSlotDialog(false);
      return;
    }
    setSlotSaving(true);
    try {
      await deleteTimetableSlot(currentSlot.slotId);
      setAlert({ type: 'success', message: 'Timetable slot cleared.' });
      setSlotDialog(false);
      loadTimetable();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to clear slot.' });
    } finally {
      setSlotSaving(false);
    }
  };

  // Add Period
  const handleAddPeriod = async () => {
    try {
      await createPeriod(newPeriod);
      setAlert({ type: 'success', message: 'Period created successfully!' });
      fetchPeriods();
      loadTimetable();
      setNewPeriod({
        periodNumber: periods.length + 2,
        name: `Period ${periods.length + 2}`,
        startTime: '09:15',
        endTime: '10:00',
        isBreak: false,
        displayOrder: periods.length + 2,
      });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to add period.';
      setAlert({ type: 'error', message: msg });
    }
  };

  const handleDeletePeriod = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deletePeriod(id);
      setAlert({ type: 'success', message: 'Period deleted successfully.' });
      fetchPeriods();
      loadTimetable();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to delete period.';
      setAlert({ type: 'error', message: msg });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Class Timetable Builder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Construct weekly schedules with automated teacher clash prevention (FR-6.6, FR-6.7)
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PeriodIcon />}
          onClick={() => setPeriodDrawer(true)}
          sx={{ px: 2.5 }}
        >
          Manage Periods / Bell Schedule
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Selector Bar */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
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

            <Grid item xs={12} sm={4}>
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

            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Click on any cell in the grid below to assign a subject and teacher to that period slot.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : periods.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <PeriodIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No periods defined. Click "Manage Periods" to configure your bell schedule.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f4f6f8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 110, bgcolor: '#e8eaf6' }}>
                  Day / Period
                </TableCell>
                {periods.map((p) => (
                  <TableCell
                    key={p.id}
                    sx={{
                      fontWeight: 700,
                      textAlign: 'center',
                      minWidth: 150,
                      bgcolor: p.isBreak ? '#fff3e0' : 'inherit',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.startTime} - {p.endTime}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {DAYS.map((day) => (
                <TableRow key={day.id} hover>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>{day.name}</TableCell>
                  {periods.map((p) => {
                    if (p.isBreak) {
                      return (
                        <TableCell
                          key={p.id}
                          sx={{
                            textAlign: 'center',
                            bgcolor: '#fff8e1',
                            color: '#e65100',
                            fontWeight: 700,
                            letterSpacing: 1,
                          }}
                        >
                          BREAK / RECESS
                        </TableCell>
                      );
                    }

                    const slot = (timetable?.slots || []).find(
                      (s) => s.dayOfWeek === day.id && s.periodId === p.id
                    );

                    return (
                      <TableCell
                        key={p.id}
                        onClick={() => handleOpenSlot(day.id, p)}
                        sx={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          p: 1.5,
                          border: '1px solid #f0f0f0',
                          bgcolor: slot?.subjectId ? '#f0fdf4' : '#fff',
                          '&:hover': {
                            bgcolor: slot?.subjectId ? '#dcfce7' : '#f8fafc',
                          },
                          transition: 'background-color 0.2s',
                        }}
                      >
                        {slot?.subjectId ? (
                          <Box>
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {slot.subjectName}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {slot.employeeName || 'No Teacher'}
                            </Typography>
                            {slot.roomNo && (
                              <Chip
                                size="small"
                                label={`Room: ${slot.roomNo}`}
                                sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ color: '#bdbdbd', py: 1 }}>
                            <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                              + Assign
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assign Slot Dialog */}
      <Dialog open={slotDialog} onClose={() => setSlotDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Assign Period Slot - {currentSlot.periodName} ({DAYS.find((d) => d.id === currentSlot.dayOfWeek)?.name})
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Subject</InputLabel>
                <Select
                  value={currentSlot.subjectId}
                  label="Subject"
                  onChange={(e) => setCurrentSlot({ ...currentSlot, subjectId: e.target.value })}
                >
                  <MenuItem value="">-- Select Subject --</MenuItem>
                  {subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Teacher / Instructor</InputLabel>
                <Select
                  value={currentSlot.employeeId}
                  label="Teacher / Instructor"
                  onChange={(e) => setCurrentSlot({ ...currentSlot, employeeId: e.target.value })}
                >
                  <MenuItem value="">-- Select Teacher --</MenuItem>
                  {teachers.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Room / Lab No"
                placeholder="e.g. Room 101, Physics Lab"
                value={currentSlot.roomNo}
                onChange={(e) => setCurrentSlot({ ...currentSlot, roomNo: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          {currentSlot.slotId ? (
            <Button color="error" onClick={handleClearSlot} disabled={slotSaving}>
              Clear Slot
            </Button>
          ) : (
            <Box />
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setSlotDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveSlot} disabled={slotSaving}>
              {slotSaving ? 'Saving...' : 'Save Slot'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Period Master Drawer */}
      <Drawer anchor="right" open={periodDrawer} onClose={() => setPeriodDrawer(false)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Period / Bell Master
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure standard school periods and breaks across the academic year.
          </Typography>

          {/* Add Period Form */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Add New Period / Break
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Period #"
                  value={newPeriod.periodNumber}
                  onChange={(e) =>
                    setNewPeriod({ ...newPeriod, periodNumber: Number(e.target.value) })
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Name"
                  placeholder="e.g. Period 1, Lunch"
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="time"
                  label="Start Time"
                  value={newPeriod.startTime}
                  onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="time"
                  label="End Time"
                  value={newPeriod.endTime}
                  onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newPeriod.isBreak ? 'break' : 'period'}
                    label="Type"
                    onChange={(e) =>
                      setNewPeriod({ ...newPeriod, isBreak: e.target.value === 'break' })
                    }
                  >
                    <MenuItem value="period">Teaching Period</MenuItem>
                    <MenuItem value="break">Break / Recess / Assembly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Button fullWidth variant="contained" size="small" onClick={handleAddPeriod}>
                  Save Period
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Divider sx={{ my: 2 }} />

          {/* List of Periods */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Current Periods ({periods.length})
          </Typography>
          <Stack spacing={1}>
            {periods.map((p) => (
              <Paper
                key={p.id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: p.isBreak ? '#fff8e1' : '#fff',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {p.name} {p.isBreak && <Chip size="small" label="Break" color="warning" sx={{ height: 18 }} />}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #{p.periodNumber} | {p.startTime} - {p.endTime}
                  </Typography>
                </Box>
                <IconButton size="small" color="error" onClick={() => handleDeletePeriod(p.id, p.name)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ClassTimetablePage;
