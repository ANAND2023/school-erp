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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as PeriodIcon,
  TableChart as GridIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Warning as WarningIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import api from '../../../api/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getPeriods,
  createPeriod,
  updatePeriod,
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
  const [forceRender, setForceRender] = useState(0);
  const [newPeriod, setNewPeriod] = useState({
    id: null,
    periodNumber: 1,
    name: 'Period 1',
    startTime: '08:30',
    endTime: '09:15',
    isBreak: false,
    isBellEnabled: false,
    isDismissalBell: false,
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
      const activeStaff = empList.filter(emp => emp.status !== 0);
      setTeachers(activeStaff.length > 0 ? activeStaff : empList);

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

  // Add or Edit Period
  const handleAddPeriod = async () => {
    try {
      if (newPeriod.id) {
        await updatePeriod(newPeriod.id, newPeriod);
        setAlert({ type: 'success', message: 'Period updated successfully!' });
      } else {
        await createPeriod(newPeriod);
        setAlert({ type: 'success', message: 'Period created successfully!' });
      }
      fetchPeriods();
      loadTimetable();
      setNewPeriod({
        id: null,
        periodNumber: periods.length + (newPeriod.id ? 1 : 2),
        name: `Period ${periods.length + (newPeriod.id ? 1 : 2)}`,
        startTime: '09:15',
        endTime: '10:00',
        isBreak: false,
        isBellEnabled: false,
        isDismissalBell: false,
        displayOrder: periods.length + (newPeriod.id ? 1 : 2),
      });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save period.';
      setAlert({ type: 'error', message: msg });
    }
  };

  const handleEditPeriod = (p) => {
    setNewPeriod({
      id: p.id,
      periodNumber: p.periodNumber,
      name: p.name,
      startTime: p.startTime.substring(0, 5),
      endTime: p.endTime.substring(0, 5),
      isBreak: p.isBreak,
      isBellEnabled: p.isBellEnabled,
      isDismissalBell: p.isDismissalBell,
      displayOrder: p.displayOrder,
    });
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

  const handleDownloadPdf = () => {
    if (!timetable || !periods || periods.length === 0) {
      setAlert({ type: 'error', message: 'No schedule available to export.' });
      return;
    }

    const doc = new jsPDF('landscape');
    
    // Add Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Class Timetable', 14, 22);
    
    const cls = classes.find(c => c.id === selectedClassId);
    const sec = sections.find(s => s.id === selectedSectionId);
    
    if (cls && sec) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Class: ${cls.name} - Section: ${sec.name}`, 14, 30);
    }

    const headRow = ['Day / Period', ...periods.map(p => `${p.name}\n${p.startTime.substring(0,5)} - ${p.endTime.substring(0,5)}`)];
    
    const bodyRows = DAYS.map(day => {
      const row = [day.name];
      periods.forEach(p => {
        if (p.isBreak) {
          row.push('BREAK');
        } else {
          const slot = (timetable?.slots || []).find(s => s.dayOfWeek === day.id && s.periodId === p.id);
          if (slot) {
            let cellText = `${slot.subjectName}`;
            if (slot.teacherName || slot.employeeName) cellText += `\n${slot.teacherName || slot.employeeName}`;
            if (slot.roomNo) cellText += `\nRoom: ${slot.roomNo}`;
            row.push(cellText);
          } else {
            row.push('Not Assigned');
          }
        }
      });
      return row;
    });

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [232, 234, 246], textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
      bodyStyles: { halign: 'center', valign: 'middle' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', fillColor: [250, 250, 250] }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.cell.raw === 'BREAK') {
          data.cell.styles.fillColor = [255, 248, 225];
          data.cell.styles.textColor = [230, 81, 0];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.cell.raw === 'Not Assigned') {
          data.cell.styles.textColor = [150, 150, 150];
        }
        if (data.section === 'body' && data.cell.raw !== 'BREAK' && data.cell.raw !== 'Not Assigned' && data.column.index !== 0) {
          data.cell.styles.fillColor = [239, 246, 255];
        }
      }
    });

    doc.save(`Class_Timetable_${cls?.name || 'Class'}_${sec?.name || 'Sec'}.pdf`);
  };

  const handleDownloadExcel = () => {
    if (!timetable || !periods || periods.length === 0) {
      setAlert({ type: 'error', message: 'No schedule available to export.' });
      return;
    }

    const cls = classes.find(c => c.id === selectedClassId);
    const sec = sections.find(s => s.id === selectedSectionId);

    const data = [
      ['Class Timetable'],
      [`Class: ${cls?.name || 'Class'} | Section: ${sec?.name || 'Section'}`],
      [],
      ['Day / Period', ...periods.map(p => `${p.name} (${p.startTime ? p.startTime.substring(0, 5) : ''} - ${p.endTime ? p.endTime.substring(0, 5) : ''})`)]
    ];

    DAYS.forEach(day => {
      const row = [day.name];
      periods.forEach(p => {
        if (p.isBreak) {
          row.push('BREAK');
        } else {
          const slot = (timetable?.slots || []).find(s => s.dayOfWeek === day.id && s.periodId === p.id);
          if (slot) {
            let cellText = slot.subjectName || '';
            const teacher = slot.teacherName || slot.employeeName;
            if (teacher) cellText += ` (${teacher})`;
            if (slot.roomNo) cellText += ` [Room: ${slot.roomNo}]`;
            row.push(cellText);
          } else {
            row.push('-');
          }
        }
      });
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const colWidths = [{ wch: 15 }];
    periods.forEach(() => colWidths.push({ wch: 28 }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class Timetable');
    XLSX.writeFile(wb, `Class_Timetable_${cls?.name || 'Class'}_${sec?.name || 'Sec'}.xlsx`);
  };

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2 }}>
            Class Timetable Builder
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Construct weekly schedules with automated teacher clash prevention
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            startIcon={<ExcelIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadExcel}
            disabled={!timetable || !periods || periods.length === 0}
            sx={{
              bgcolor: '#107c41',
              color: '#ffffff',
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(16, 124, 65, 0.25)',
              textTransform: 'none',
              '&:hover': { bgcolor: '#0b5c30', boxShadow: '0 4px 10px rgba(16, 124, 65, 0.4)' },
              '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
            }}
          >
            Download Excel
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
            onClick={handleDownloadPdf}
            disabled={!timetable || !periods || periods.length === 0}
            sx={{
              bgcolor: '#d32f2f',
              color: '#ffffff',
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(211, 47, 47, 0.25)',
              textTransform: 'none',
              '&:hover': { bgcolor: '#b71c1c', boxShadow: '0 4px 10px rgba(211, 47, 47, 0.4)' },
              '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
            }}
          >
            Download PDF
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PeriodIcon sx={{ fontSize: 16 }} />}
            onClick={() => setPeriodDrawer(true)}
            sx={{
              height: 32,
              fontSize: '0.78rem',
              fontWeight: 700,
              px: 1.8,
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Manage Periods / Bell Schedule
          </Button>
        </Stack>
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
              {newPeriod.id ? 'Edit Period / Break' : 'Add New Period / Break'}
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
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newPeriod.isBellEnabled}
                      onChange={(e) => setNewPeriod({ ...newPeriod, isBellEnabled: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Enable Bell Ring"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newPeriod.isDismissalBell}
                      onChange={(e) => setNewPeriod({ ...newPeriod, isDismissalBell: e.target.checked })}
                      color="error"
                    />
                  }
                  label="Is Dismissal (Chhuti) Bell?"
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="contained" size="small" onClick={handleAddPeriod}>
                    {newPeriod.id ? 'Update Period' : 'Save Period'}
                  </Button>
                  {newPeriod.id && (
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      size="small" 
                      onClick={() => setNewPeriod({
                        id: null,
                        periodNumber: periods.length + 1,
                        name: `Period ${periods.length + 1}`,
                        startTime: '09:15',
                        endTime: '10:00',
                        isBreak: false,
                        isBellEnabled: false,
                        isDismissalBell: false,
                        displayOrder: periods.length + 1,
                      })}
                    >
                      Cancel
                    </Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          <Divider sx={{ my: 2 }} />

          {/* Bell Sound Settings */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#166534' }}>
              Upload Custom Bell Audio (MP3/WAV)
            </Typography>
            <input
              type="file"
              accept="audio/*"
              id="bell-audio-upload"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (file.size > 2 * 1024 * 1024) {
                  alert("File is too large! Please select an audio file under 2MB.");
                  return;
                }

                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    localStorage.setItem('custom_bell_data_url', ev.target.result);
                    alert("Custom Bell Audio saved successfully!");
                  } catch (err) {
                    alert("Error saving audio. The file might be too large.");
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <Button
              variant="outlined"
              color="success"
              fullWidth
              size="small"
              onClick={() => document.getElementById('bell-audio-upload').click()}
            >
              Select Audio File from Computer
            </Button>
            {localStorage.getItem('custom_bell_data_url') && (
              <Button
                variant="text"
                color="error"
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                onClick={() => {
                  localStorage.removeItem('custom_bell_data_url');
                  alert("Custom audio removed. Reverted to default bell.");
                }}
              >
                Remove Custom Audio
              </Button>
            )}
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#166534' }}>
              Select your own loud MP3 from your PC. Max size: 2MB.
            </Typography>
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
                  flexDirection: 'column',
                  bgcolor: p.isBreak ? '#fff8e1' : '#fff',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {p.name} {p.isBreak && <Chip size="small" label="Break" color="warning" sx={{ height: 18 }} />}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      #{p.periodNumber} | {p.startTime} - {p.endTime}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" color="primary" onClick={() => handleEditPeriod(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeletePeriod(p.id, p.name)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {localStorage.getItem(`custom_bell_data_url_${p.id}`) ? 'Custom Bell Set' : 'Default Bell'}
                  </Typography>
                  <Box>
                    <input
                      type="file"
                      accept="audio/*"
                      id={`bell-audio-upload-${p.id}`}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert("File is too large! Please select an audio file under 2MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            localStorage.setItem(`custom_bell_data_url_${p.id}`, ev.target.result);
                            alert(`Custom Bell Audio saved for ${p.name}!`);
                            setForceRender(prev => prev + 1);
                          } catch (err) {
                            alert("Error saving audio. The file might be too large.");
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: '0.65rem', py: 0, px: 1, minWidth: 0, mr: 0.5 }}
                      onClick={() => document.getElementById(`bell-audio-upload-${p.id}`).click()}
                    >
                      Set Bell
                    </Button>
                    {localStorage.getItem(`custom_bell_data_url_${p.id}`) && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        sx={{ fontSize: '0.65rem', py: 0, px: 1, minWidth: 0 }}
                        onClick={() => {
                          localStorage.removeItem(`custom_bell_data_url_${p.id}`);
                          alert(`Custom audio removed for ${p.name}. Reverted to default.`);
                          setForceRender(prev => prev + 1);
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ClassTimetablePage;
