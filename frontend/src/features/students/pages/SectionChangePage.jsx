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
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  SwapHoriz as SwapHorizIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { classesApi } from '../../masters/api';
import { studentApi } from '../api';

export default function SectionChangePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId');
  const queryClient = useQueryClient();

  const [classId, setClassId] = useState('');
  const [currentSectionId, setCurrentSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId || '');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [reasonCategory, setReasonCategory] = useState('Parent Request');
  const [reasonNotes, setReasonNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  // If preselectedStudentId is given, fetch that student's details directly
  const { data: studentRes, isLoading: isLoadingSingleStudent } = useQuery({
    queryKey: ['student-detail', selectedStudentId],
    queryFn: () => studentApi.getStudentDetail(selectedStudentId),
    enabled: !!selectedStudentId,
  });
  const currentStudent = studentRes?.data?.data;

  // Sync classId and sectionId when student loads from URL
  useEffect(() => {
    if (currentStudent && currentStudent.currentEnrollment) {
      setClassId(String(currentStudent.currentEnrollment.classId));
      setCurrentSectionId(String(currentStudent.currentEnrollment.sectionId));
    }
  }, [currentStudent]);

  const selectedClass = classes.find((c) => String(c.id) === String(classId));
  const classSections = selectedClass ? selectedClass.sections : [];

  // Fetch students enrolled in selected class & section for selection
  const { data: sectionStudentsRes, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-for-section-change', classId, currentSectionId],
    queryFn: () =>
      studentApi.getStudents({
        classId,
        sectionId: currentSectionId,
        status: 1,
        pageSize: 100,
      }),
    enabled: !!classId && !!currentSectionId && !preselectedStudentId,
  });
  const studentsInCurrentSection = sectionStudentsRes?.data?.data?.items || [];

  // Available target sections (all sections in class except current section)
  const availableTargetSections = classSections.filter(
    (sec) => String(sec.id) !== String(currentSectionId)
  );

  // Section Change Mutation
  const changeSectionMutation = useMutation({
    mutationFn: (data) => studentApi.changeSection(data),
    onSuccess: (res) => {
      setSuccessMsg(res?.data?.message || 'Section transferred successfully with audit log!');
      setErrorMsg('');
      queryClient.invalidateQueries(['student-detail', selectedStudentId]);
      queryClient.invalidateQueries(['students-directory']);
      // Reset target section and notes
      setTargetSectionId('');
      setReasonNotes('');
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to change student section.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg('Please select a student.');
      return;
    }
    if (!targetSectionId) {
      setErrorMsg('Please select a target destination section.');
      return;
    }
    const fullReason = `${reasonCategory}: ${reasonNotes.trim()}`.trim();
    if (!reasonNotes.trim()) {
      setErrorMsg('Please provide a brief reason/notes for this section change.');
      return;
    }

    changeSectionMutation.mutate({
      studentId: Number(selectedStudentId),
      toSectionId: Number(targetSectionId),
      reason: fullReason,
    });
  };

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
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/students')}
              sx={{
                px: 1,
                py: 0.25,
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'none',
                minWidth: 'auto',
                '&:hover': { bgcolor: '#f1f5f9', color: '#1e293b' },
              }}
            >
              Back to Student Directory
            </Button>
          </Stack>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2 }}>
            Student Section Transfer
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Transfer active students between sections within the same class with capacity validation and audit tracking
          </Typography>
        </Box>
      </Stack>

      {/* Alerts */}
      {successMsg && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 1.5 }}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Left Card: Selection & Transfer Form */}
        <Grid item xs={12} md={7}>
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom color="primary">
                Section Change Request
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  {/* Class Selection */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        required
                        label="Class"
                        value={classId}
                        onChange={(e) => {
                          setClassId(e.target.value);
                          setCurrentSectionId('');
                          setSelectedStudentId('');
                          setTargetSectionId('');
                        }}
                      >
                        <MenuItem value="">Choose Class</MenuItem>
                        {classes.map((c) => (
                          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        required
                        label="Current Section"
                        value={currentSectionId}
                        disabled={!classId}
                        onChange={(e) => {
                          setCurrentSectionId(e.target.value);
                          setSelectedStudentId('');
                          setTargetSectionId('');
                        }}
                      >
                        <MenuItem value="">Choose Section</MenuItem>
                        {classSections.map((s) => (
                          <MenuItem key={s.id} value={s.id}>{s.name} (Cap: {s.capacity})</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>

                  {/* Student Selection */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    required
                    label="Select Student"
                    value={selectedStudentId}
                    disabled={!currentSectionId && !preselectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                  >
                    <MenuItem value="">Choose Student</MenuItem>
                    {studentsInCurrentSection.map((st) => (
                      <MenuItem key={st.id} value={st.id}>
                        {st.admissionNo} - {st.fullName} (Roll: {st.rollNo || '—'})
                      </MenuItem>
                    ))}
                    {currentStudent && !studentsInCurrentSection.some((s) => s.id === currentStudent.id) && (
                      <MenuItem value={currentStudent.id}>
                        {currentStudent.admissionNo} - {currentStudent.fullName}
                      </MenuItem>
                    )}
                  </TextField>

                  {/* Target Section */}
                  <TextField
                    select
                    fullWidth
                    size="small"
                    required
                    label="Destination / Target Section"
                    value={targetSectionId}
                    disabled={!selectedStudentId || availableTargetSections.length === 0}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    helperText={
                      availableTargetSections.length === 0 && classId
                        ? 'No alternative sections available for this class.'
                        : 'Section maximum capacity limit is strictly enforced.'
                    }
                  >
                    <MenuItem value="">Choose Destination Section</MenuItem>
                    {availableTargetSections.map((sec) => (
                      <MenuItem key={sec.id} value={sec.id}>
                        {sec.name} (Max Capacity: {sec.capacity} seats)
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Reason Category */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        required
                        label="Transfer Category"
                        value={reasonCategory}
                        onChange={(e) => setReasonCategory(e.target.value)}
                      >
                        <MenuItem value="Parent Request">Parent Request</MenuItem>
                        <MenuItem value="Academic Rebalancing">Academic Rebalancing</MenuItem>
                        <MenuItem value="Disciplinary / Behavioral">Disciplinary / Behavioral</MenuItem>
                        <MenuItem value="Medical Grounds">Medical Grounds</MenuItem>
                        <MenuItem value="Administrative Adjustment">Administrative Adjustment</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        label="Reason Notes / Explanation"
                        placeholder="Detailed reason for section change..."
                        value={reasonNotes}
                        onChange={(e) => setReasonNotes(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Button
                    type="submit"
                    variant="contained"
                    color="warning"
                    size="medium"
                    startIcon={<SwapHorizIcon />}
                    disabled={!selectedStudentId || !targetSectionId}
                    loading={changeSectionMutation.isPending}
                    sx={{ mt: 0.5, height: 34, fontSize: '12px', fontWeight: 700 }}
                  >
                    Confirm Section Transfer
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Card: Student Overview & Past Transfers */}
        <Grid item xs={12} md={5}>
          {currentStudent ? (
            <Stack spacing={2}>
              <Card sx={{ boxShadow: 1, borderRadius: 2, bgcolor: '#fbfcfd' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom color="text.primary">
                    Selected Student Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Avatar
                      src={currentStudent.photoUrl}
                      sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}
                    >
                      {currentStudent.fullName ? currentStudent.fullName[0] : 'S'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {currentStudent.fullName}
                      </Typography>
                      <Chip label={currentStudent.admissionNo} color="primary" size="small" />
                    </Box>
                  </Stack>

                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Class:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {currentStudent.currentEnrollment?.className || '—'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Current Section:</Typography>
                      <Chip
                        label={currentStudent.currentEnrollment?.sectionName || '—'}
                        size="small"
                        color="secondary"
                      />
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Current Roll No:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {currentStudent.currentEnrollment?.rollNo ? `#${currentStudent.currentEnrollment.rollNo}` : 'Unassigned'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Primary Guardian:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {currentStudent.guardians?.[0]?.name || '—'} ({currentStudent.guardians?.[0]?.mobile || '—'})
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* History Table for this student */}
              <Card sx={{ boxShadow: 1 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <HistoryIcon color="action" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Past Section Changes for {currentStudent.fullName}
                    </Typography>
                  </Stack>

                  {currentStudent.sectionHistories && currentStudent.sectionHistories.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                          <TableRow>
                            <TableCell><b>Date</b></TableCell>
                            <TableCell><b>From</b></TableCell>
                            <TableCell><b>To</b></TableCell>
                            <TableCell><b>Reason</b></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {currentStudent.sectionHistories.map((h) => (
                            <TableRow key={h.id}>
                              <TableCell>{dayjs(h.changedOn).format('DD/MM/YY')}</TableCell>
                              <TableCell>{h.fromSectionName}</TableCell>
                              <TableCell><b>{h.toSectionName}</b></TableCell>
                              <TableCell>
                                <Typography variant="caption">{h.reason}</Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No prior section transfers on record.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Stack>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#fafafa', border: '1px dashed #ccc' }}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                No Student Selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a class, current section, and student on the left to review their enrollment and initiate a section transfer.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
