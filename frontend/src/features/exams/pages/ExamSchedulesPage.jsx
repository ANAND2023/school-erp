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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Alert,
  Tooltip,
  Drawer,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Publish as PublishIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Assignment as ExamIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { examApi } from '../api';
import api from '../../../api/client';
import AppDatePicker from '../../../components/common/AppDatePicker';
import { usePermission } from '../../../hooks/usePermission';

export const ExamSchedulesPage = () => {
  const { hasPermission, can } = usePermission();

  // Filter state
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Data state
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Active exam for schedules drawer
  const [selectedExam, setSelectedExam] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Term Modal
  const [termModal, setTermModal] = useState(false);
  const [newTerm, setNewTerm] = useState({ name: '', termCode: '', weightage: 50, description: '' });

  // Exam Modal
  const [examModal, setExamModal] = useState(false);
  const [newExam, setNewExam] = useState({ name: '', termId: '', classId: '', description: '' });

  // Schedule Modal
  const [scheduleModal, setScheduleModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    subjectId: '',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    maxMarks: 100,
    passMarks: 33,
    roomNo: '',
  });

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      const [classRes, termRes, subRes] = await Promise.all([
        api.get('/classes'),
        examApi.getTerms(),
        api.get('/subjects'),
      ]);
      const classList = classRes.data?.data || [];
      setClasses(classList);
      setTerms(termRes.data?.data || []);
      setSubjects(subRes.data?.data || []);

      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load initial data.' });
    }
  };

  useEffect(() => {
    loadExams();
  }, [selectedClassId, selectedTermId]);

  const loadExams = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const params = {};
      if (selectedClassId) params.classId = selectedClassId;
      if (selectedTermId) params.termId = selectedTermId;

      const res = await examApi.getExams(params);
      setExams(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load exams.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSchedules = async (exam) => {
    setSelectedExam(exam);
    setDrawerOpen(true);
    setSchedulesLoading(true);
    try {
      const res = await examApi.getSchedules(exam.id);
      setSchedules(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleCreateTerm = async () => {
    if (!newTerm.name.trim() || !newTerm.termCode.trim()) {
      setAlert({ type: 'error', message: 'Term name and code are required.' });
      return;
    }
    try {
      await examApi.createTerm(newTerm);
      setAlert({ type: 'success', message: 'Term created successfully.' });
      setTermModal(false);
      setNewTerm({ name: '', termCode: '', weightage: 50, description: '' });
      const termRes = await examApi.getTerms();
      setTerms(termRes.data?.data || []);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to create term.' });
    }
  };

  const handleCreateExam = async () => {
    if (!newExam.name.trim() || !newExam.termId || !newExam.classId) {
      setAlert({ type: 'error', message: 'Exam name, term, and class are required.' });
      return;
    }
    try {
      await examApi.createExam(newExam);
      setAlert({ type: 'success', message: 'Exam created successfully.' });
      setExamModal(false);
      setNewExam({ name: '', termId: '', classId: '', description: '' });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to create exam.' });
    }
  };

  const handleSaveSchedule = async () => {
    if (!newSchedule.subjectId || !newSchedule.examDate) {
      setAlert({ type: 'error', message: 'Subject and date are required.' });
      return;
    }
    try {
      await examApi.saveSchedule(selectedExam.id, newSchedule);
      setScheduleModal(false);
      const res = await examApi.getSchedules(selectedExam.id);
      setSchedules(res.data?.data || []);
      setAlert({ type: 'success', message: 'Exam schedule saved.' });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save schedule.' });
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject exam schedule?')) return;
    try {
      await examApi.deleteSchedule(id);
      const res = await examApi.getSchedules(selectedExam.id);
      setSchedules(res.data?.data || []);
      setAlert({ type: 'success', message: 'Schedule deleted.' });
      loadExams();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Cannot delete schedule.' });
    }
  };

  const handleToggleLock = async (exam) => {
    try {
      const res = await examApi.toggleLockExam(exam.id);
      setAlert({ type: 'success', message: res.data?.message || 'Lock status updated.' });
      loadExams();
      if (selectedExam?.id === exam.id) {
        setSelectedExam((prev) => ({ ...prev, isLocked: !prev.isLocked }));
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update lock status.' });
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      const res = await examApi.togglePublishExam(exam.id);
      setAlert({ type: 'success', message: res.data?.message || 'Publish status updated.' });
      loadExams();
      if (selectedExam?.id === exam.id) {
        setSelectedExam((prev) => ({ ...prev, isPublished: !prev.isPublished }));
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update publish status.' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Examination Setup & Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage academic terms, class examinations, and subject datesheets (Module 7: FR-7.1)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<CalendarIcon />} onClick={() => setTermModal(true)}>
            Exam Terms
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setExamModal(true)}>
            New Exam
          </Button>
        </Stack>
      </Stack>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Filter Card */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Class</InputLabel>
                <Select
                  value={selectedClassId}
                  label="Filter by Class"
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={5}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Term</InputLabel>
                <Select
                  value={selectedTermId}
                  label="Filter by Term"
                  onChange={(e) => setSelectedTermId(e.target.value)}
                >
                  <MenuItem value="">All Terms</MenuItem>
                  {terms.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} ({t.termCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="outlined" onClick={loadExams}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Exams Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Exam Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Term</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Subjects Scheduled</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Marks Lock</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Publish Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  Loading exams...
                </TableCell>
              </TableRow>
            ) : exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No exams found. Click "New Exam" to define an exam for this academic year.
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => (
                <TableRow key={exam.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {exam.name}
                    </Typography>
                    {exam.description && (
                      <Typography variant="caption" color="text.secondary">
                        {exam.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={exam.termName || 'Term 1'} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>{exam.className}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${exam.scheduleCount} Subjects`}
                      size="small"
                      color={exam.scheduleCount > 0 ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {exam.isLocked ? (
                      <Chip icon={<LockIcon />} label="Locked" size="small" color="error" />
                    ) : (
                      <Chip icon={<LockOpenIcon />} label="Open" size="small" color="success" />
                    )}
                  </TableCell>
                  <TableCell>
                    {exam.isPublished ? (
                      <Chip label="Published" size="small" color="info" />
                    ) : (
                      <Chip label="Draft" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EventIcon />}
                        onClick={() => handleOpenSchedules(exam)}
                      >
                        Schedules
                      </Button>
                      <Tooltip title={exam.isLocked ? 'Unlock Marks Entry' : 'Lock Marks Entry'}>
                        <IconButton
                          size="small"
                          color={exam.isLocked ? 'error' : 'success'}
                          onClick={() => handleToggleLock(exam)}
                        >
                          {exam.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={exam.isPublished ? 'Unpublish Results' : 'Publish Results'}>
                        <IconButton
                          size="small"
                          color={exam.isPublished ? 'info' : 'default'}
                          onClick={() => handleTogglePublish(exam)}
                        >
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Schedules Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 540 }, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {selectedExam?.name} - Datesheet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedExam?.className} ({selectedExam?.termName})
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setNewSchedule({
                  subjectId: '',
                  examDate: new Date().toISOString().split('T')[0],
                  startTime: '09:00',
                  endTime: '12:00',
                  maxMarks: 100,
                  passMarks: 33,
                  roomNo: '',
                });
                setScheduleModal(true);
              }}
            >
              Add Subject
            </Button>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {schedulesLoading ? (
            <Typography variant="body2" sx={{ py: 3, textAlign: 'center' }}>
              Loading schedules...
            </Typography>
          ) : schedules.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              <ExamIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography variant="body2">No subjects scheduled for this exam yet.</Typography>
              <Typography variant="caption">Click "Add Subject" to configure date and marks.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {schedules.map((sch) => (
                <Card key={sch.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {sch.subjectName} ({sch.subjectCode})
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Date: {sch.examDate} | {sch.startTime} - {sch.endTime}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip label={`Max: ${sch.maxMarks}`} size="small" variant="outlined" />
                        <Chip label={`Pass: ${sch.passMarks}`} size="small" variant="outlined" color="warning" />
                        {sch.roomNo && <Chip label={`Room: ${sch.roomNo}`} size="small" variant="outlined" />}
                        <Chip
                          label={`${sch.marksEnteredCount} Marks Entered`}
                          size="small"
                          color={sch.marksEnteredCount > 0 ? 'success' : 'default'}
                        />
                      </Stack>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleDeleteSchedule(sch.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Term Modal */}
      <Dialog open={termModal} onClose={() => setTermModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Exam Term</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Term Name"
                placeholder="e.g. Term 1, Half Yearly"
                value={newTerm.name}
                onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Term Code"
                placeholder="e.g. T1, HY"
                value={newTerm.termCode}
                onChange={(e) => setNewTerm({ ...newTerm, termCode: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Weightage (%)"
                value={newTerm.weightage}
                onChange={(e) => setNewTerm({ ...newTerm, weightage: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                multiline
                rows={2}
                value={newTerm.description}
                onChange={(e) => setNewTerm({ ...newTerm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTermModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTerm}>
            Create Term
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exam Modal */}
      <Dialog open={examModal} onClose={() => setExamModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Define New Examination</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Exam Name"
                placeholder="e.g. Periodic Test 1, Annual Examination 2026-27"
                value={newExam.name}
                onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Term</InputLabel>
                <Select
                  value={newExam.termId}
                  label="Term"
                  onChange={(e) => setNewExam({ ...newExam, termId: e.target.value })}
                >
                  {terms.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} ({t.termCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={newExam.classId}
                  label="Class"
                  onChange={(e) => setNewExam({ ...newExam, classId: e.target.value })}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                multiline
                rows={2}
                value={newExam.description}
                onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setExamModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateExam}>
            Create Exam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={scheduleModal} onClose={() => setScheduleModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Schedule Subject Exam</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Subject</InputLabel>
                <Select
                  value={newSchedule.subjectId}
                  label="Subject"
                  onChange={(e) => setNewSchedule({ ...newSchedule, subjectId: e.target.value })}
                >
                  {subjects.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <AppDatePicker
                label="Exam Date"
                value={newSchedule.examDate}
                onChange={(e) => setNewSchedule({ ...newSchedule, examDate: e.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Start Time"
                InputLabelProps={{ shrink: true }}
                value={newSchedule.startTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="End Time"
                InputLabelProps={{ shrink: true }}
                value={newSchedule.endTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Max Marks"
                value={newSchedule.maxMarks}
                onChange={(e) => setNewSchedule({ ...newSchedule, maxMarks: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Pass Marks"
                value={newSchedule.passMarks}
                onChange={(e) => setNewSchedule({ ...newSchedule, passMarks: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Room / Hall No"
                placeholder="e.g. Hall 1, Room 204"
                value={newSchedule.roomNo}
                onChange={(e) => setNewSchedule({ ...newSchedule, roomNo: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScheduleModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSchedule}>
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamSchedulesPage;
