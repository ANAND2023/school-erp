import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Print as PrintIcon,
  Visibility as ViewIcon,
  Assessment as ResultIcon,
  School as SchoolIcon,
  EmojiEvents as RankIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { examApi } from '../api';
import api from '../../../api/client';
import { printWithTitle } from '../../../utils/printUtils';

export const ReportCardsPage = () => {
  // Filters
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');

  // Results State
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Single Report Card Modal
  const [reportCardModal, setReportCardModal] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

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

  useEffect(() => {
    if (selectedClassId) {
      loadExams();
    }
  }, [selectedClassId]);

  const loadExams = async () => {
    try {
      const res = await examApi.getExams({ classId: selectedClassId });
      const list = res.data?.data || [];
      setExams(list);
      if (list.length > 0) setSelectedExamId(list[0].id);
      else {
        setSelectedExamId('');
        setResultsData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      loadResults();
    }
  }, [selectedExamId, selectedSectionId]);

  const loadResults = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await examApi.processResults(selectedExamId, selectedSectionId || undefined);
      setResultsData(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to process results.' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReportCard = async (studentId) => {
    setCardLoading(true);
    setReportCardModal(true);
    try {
      const res = await examApi.getReportCard(studentId, selectedExamId);
      setSelectedReportCard(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load report card details.' });
    } finally {
      setCardLoading(false);
    }
  };

  const handlePrint = () => {
    const sName = reportCard?.studentName || 'Student';
    const admNo = reportCard?.admissionNo ? `_${reportCard.admissionNo}` : '';
    const examName = reportCard?.examName ? `_${reportCard.examName}` : '';
    printWithTitle(`Report_Card_${sName}${admNo}${examName}`);
  };

  const studentsList = resultsData?.results || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Results & CBSE Report Cards
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process marks, auto-compute ranks and grades, and generate printable report cards (Module 7: FR-7.4, FR-7.7)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            disabled={!studentsList.length}
            onClick={handlePrint}
          >
            Print Summary
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ResultIcon />}
            onClick={loadResults}
            disabled={loading || !selectedExamId}
          >
            {loading ? 'Processing...' : 'Recalculate Results'}
          </Button>
        </Stack>
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
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Section (Optional)</InputLabel>
                <Select
                  value={selectedSectionId}
                  label="Section (Optional)"
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {sections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      Section {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
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
          </Grid>
        </CardContent>
      </Card>

      {/* Results Overview Metrics */}
      {resultsData && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#eff6ff', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  TOTAL CANDIDATES
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#1e40af">
                  {studentsList.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#f0fdf4', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  PASSED
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#15803d">
                  {studentsList.filter((s) => s.resultStatus === 'Pass').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#fff1f2', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  NEEDS IMPROVEMENT
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#b91c1c">
                  {studentsList.filter((s) => s.resultStatus !== 'Pass').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#faf5ff', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  CLASS TOPPER %
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#6b21a8">
                  {studentsList.length > 0
                    ? `${Math.max(...studentsList.map((s) => s.percentage))}%`
                    : '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Results Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Class Rank</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Sec Rank</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Roll No</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Marks</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Percentage</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Report Card</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  Computing grades and calculating rankings...
                </TableCell>
              </TableRow>
            ) : studentsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No result records found. Select an exam with entered marks.
                </TableCell>
              </TableRow>
            ) : (
              studentsList.map((st) => (
                <TableRow key={st.studentId} hover>
                  <TableCell>
                    {st.classRank <= 3 ? (
                      <Chip
                        icon={<RankIcon sx={{ fontSize: 16 }} />}
                        label={`#${st.classRank}`}
                        color={st.classRank === 1 ? 'warning' : 'primary'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      `#${st.classRank}`
                    )}
                  </TableCell>
                  <TableCell>#{st.sectionRank}</TableCell>
                  <TableCell>{st.rollNo ? `#${st.rollNo}` : '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{st.fullName}</TableCell>
                  <TableCell>{st.sectionName}</TableCell>
                  <TableCell align="right">
                    <strong>{st.totalObtained}</strong> / {st.totalMax}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {st.percentage}%
                  </TableCell>
                  <TableCell>
                    <Chip label={st.grade} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    {st.resultStatus === 'Pass' ? (
                      <Chip label="Passed" size="small" color="success" />
                    ) : (
                      <Chip label="Failed" size="small" color="error" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewReportCard(st.studentId)}
                    >
                      Report Card
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CBSE Report Card Modal */}
      <Dialog
        open={reportCardModal}
        onClose={() => setReportCardModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            CBSE Format Report Card
          </Typography>
          <IconButton size="small" onClick={() => setReportCardModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4, bgcolor: '#ffffff' }}>
          {cardLoading || !selectedReportCard ? (
            <Typography variant="body2" sx={{ py: 6, textAlign: 'center' }}>
              Loading report card details...
            </Typography>
          ) : (
            <Box id="printable-report-card" sx={{ p: 2, border: '2px solid #1e3a8a', borderRadius: 2 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={800} color="#1e3a8a" sx={{ letterSpacing: 1 }}>
                  {selectedReportCard.schoolName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Affiliated to CBSE, New Delhi (Affiliation No: {selectedReportCard.affiliationNo})
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {selectedReportCard.address}
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    mt: 1.5,
                    display: 'inline-block',
                    px: 3,
                    py: 0.5,
                    bgcolor: '#f1f5f9',
                    borderRadius: 1,
                    border: '1px solid #cbd5e1',
                  }}
                >
                  PROGRESS REPORT: {selectedReportCard.examName} ({selectedReportCard.academicYear})
                </Typography>
              </Box>

              {/* Student Details Grid */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Student Name:
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {selectedReportCard.student.fullName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Admission No:
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {selectedReportCard.student.admissionNo}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Class & Section:
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {selectedReportCard.student.className} - {selectedReportCard.student.sectionName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Roll Number:
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {selectedReportCard.student.rollNo || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Father's Name:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedReportCard.student.fatherName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Mother's Name:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedReportCard.student.motherName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth:
                    </Typography>
                    <Typography variant="body2">{selectedReportCard.student.dob}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Attendance:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedReportCard.attendance.daysPresent} / {selectedReportCard.attendance.totalWorkingDays} (
                      {selectedReportCard.attendance.percentage}%)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Part 1: Scholastic Subjects Table */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#1e3a8a' }}>
                PART 1: ACADEMIC PERFORMANCE (SCHOLASTIC AREAS)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Subject Code & Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Max Marks</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Pass Marks</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Marks Obtained</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Grade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReportCard.scholasticSubjects.map((sub, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {sub.subjectName} {sub.subjectCode ? `(${sub.subjectCode})` : ''}
                        </TableCell>
                        <TableCell align="center">{sub.maxMarks}</TableCell>
                        <TableCell align="center">{sub.passMarks}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {sub.marksObtained}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {sub.grade}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>GRAND TOTAL / SUMMARY</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {selectedReportCard.totalMaxMarks}
                      </TableCell>
                      <TableCell align="center">—</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#15803d' }}>
                        {selectedReportCard.totalObtainedMarks}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {selectedReportCard.overallGrade}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Part 2: Co-Scholastic Activities */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#1e3a8a' }}>
                PART 2: CO-SCHOLASTIC ACTIVITIES & ATTITUDES (3-POINT SCALE A, B, C)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Activity Area</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReportCard.coScholastic.map((cs, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 500 }}>{cs.activityName}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {cs.grade}
                        </TableCell>
                        <TableCell>{cs.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Remarks & Result */}
              <Paper variant="outlined" sx={{ p: 2, mb: 4, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="caption" color="text.secondary">
                      Class Teacher Remarks:
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                      "{selectedReportCard.remarks.teacherRemarks}"
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Final Result:
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700} color="#15803d">
                      {selectedReportCard.result} (Percentage: {selectedReportCard.percentage}%, Grade:{' '}
                      {selectedReportCard.overallGrade})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: '1px dashed #cbd5e1', p: 1.5, textAlign: 'center', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Grading Scale:
                      </Typography>
                      <Typography variant="caption" display="block">
                        A1 (91-100) | A2 (81-90) | B1 (71-80) | B2 (61-70)
                      </Typography>
                      <Typography variant="caption" display="block">
                        C1 (51-60) | C2 (41-50) | D (33-40) | E (Below 33)
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Signatures */}
              <Grid container spacing={2} sx={{ mt: 3, pt: 3 }}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Class Teacher Signature
                  </Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Parent's Signature
                  </Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Principal / Head of Institution
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setReportCardModal(false)}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print Report Card
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportCardsPage;
