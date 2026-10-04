import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  FormatListNumbered as RollNoIcon,
  SortByAlpha as SortAlphaIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { classesApi } from '../../masters/api';
import { studentApi } from '../api';

export default function RollNumbersPage() {
  const navigate = useNavigate();

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [studentList, setStudentList] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  const selectedClass = classes.find((c) => String(c.id) === String(classId));
  const sections = selectedClass ? selectedClass.sections : [];

  // Fetch students for selected class and section
  const {
    isLoading: isLoadingStudents,
    refetch: fetchStudents,
    data: studentsRes,
  } = useQuery({
    queryKey: ['students-for-roll-no', classId, sectionId],
    queryFn: async () => {
      const res = await studentApi.getStudents({
        classId,
        sectionId,
        status: 1, // Active only
        pageSize: 100,
      });
      const items = res?.data?.data?.items || [];
      // Populate local state
      setStudentList(
        items.map((s) => ({
          studentId: s.id,
          admissionNo: s.admissionNo,
          fullName: s.fullName,
          gender: s.gender,
          photoUrl: s.photoUrl,
          currentRollNo: s.rollNo,
          rollNo: s.rollNo || '',
        }))
      );
      setSuccessMsg('');
      setErrorMsg('');
      return items;
    },
    enabled: !!classId && !!sectionId,
  });

  // Assign Roll Numbers Mutation
  const assignMutation = useMutation({
    mutationFn: (data) => studentApi.assignRollNumbers(data),
    onSuccess: () => {
      setSuccessMsg('Roll numbers assigned successfully!');
      setErrorMsg('');
      fetchStudents();
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to assign roll numbers.');
    },
  });

  const handleRollNoChange = (index, value) => {
    const updated = [...studentList];
    updated[index].rollNo = value === '' ? '' : parseInt(value, 10);
    setStudentList(updated);
    setSuccessMsg('');
  };

  // FR-3.7: Assign alphabetically
  const handleAutoAssignAlphabetical = () => {
    if (!studentList.length) return;
    const sorted = [...studentList].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
    );

    const renumbered = sorted.map((s, idx) => ({
      ...s,
      rollNo: idx + 1,
    }));

    setStudentList(renumbered);
    setSuccessMsg('Roll numbers automatically generated in alphabetical order. Click "Save Roll Numbers" to apply.');
  };

  // Validation: Check duplicate roll numbers
  const getDuplicateRollNos = () => {
    const rollCounts = {};
    studentList.forEach((s) => {
      if (s.rollNo !== '' && s.rollNo !== undefined) {
        rollCounts[s.rollNo] = (rollCounts[s.rollNo] || 0) + 1;
      }
    });
    return Object.keys(rollCounts).filter((r) => rollCounts[r] > 1);
  };

  const duplicates = getDuplicateRollNos();

  const handleSave = () => {
    if (duplicates.length > 0) {
      setErrorMsg(`Duplicate roll number(s) found: ${duplicates.join(', ')}. Please resolve duplicates before saving.`);
      return;
    }

    const assignments = studentList
      .filter((s) => s.rollNo !== '' && s.rollNo !== undefined && !isNaN(s.rollNo))
      .map((s) => ({
        studentId: s.studentId,
        rollNo: Number(s.rollNo),
      }));

    if (!assignments.length) {
      setErrorMsg('No roll numbers entered to save.');
      return;
    }

    assignMutation.mutate({
      classId: Number(classId),
      sectionId: Number(sectionId),
      assignments,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/students')}
            sx={{ mb: 1 }}
          >
            Back to Student Directory
          </Button>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Bulk Roll Number Assignment (FR-3.7)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign or renumber student roll numbers by class and section alphabetically or manually
          </Typography>
        </Box>

        {studentList.length > 0 && (
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SortAlphaIcon />}
              onClick={handleAutoAssignAlphabetical}
            >
              Assign Alphabetically
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={duplicates.length > 0}
              loading={assignMutation.isPending}
            >
              Save Roll Numbers
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Class & Section Selector Card */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Class"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                  setStudentList([]);
                }}
              >
                <MenuItem value="">Choose Class</MenuItem>
                {classes.map((cls) => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Section"
                value={sectionId}
                disabled={!classId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setStudentList([]);
                }}
              >
                <MenuItem value="">Choose Section</MenuItem>
                {sections.map((sec) => (
                  <MenuItem key={sec.id} value={sec.id}>
                    {sec.name} (Capacity: {sec.capacity})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={2}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {studentList.length ? `Total: ${studentList.length} Students` : ''}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alerts */}
      {successMsg && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {duplicates.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          Duplicate roll numbers detected: <b>{duplicates.join(', ')}</b>. Each student in the section must have a unique roll number.
        </Alert>
      )}

      {/* Student List Table */}
      {isLoadingStudents ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : studentList.length > 0 ? (
        <Card sx={{ boxShadow: 2 }}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                <TableRow>
                  <TableCell width={60}><b>#</b></TableCell>
                  <TableCell width={160}><b>Admission No</b></TableCell>
                  <TableCell><b>Student Name</b></TableCell>
                  <TableCell width={120}><b>Gender</b></TableCell>
                  <TableCell width={150}><b>Current Roll No</b></TableCell>
                  <TableCell width={200}><b>Assigned Roll No</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentList.map((st, index) => {
                  const isDuplicate = st.rollNo !== '' && duplicates.includes(String(st.rollNo));
                  return (
                    <TableRow key={st.studentId} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Chip label={st.admissionNo} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            src={st.photoUrl}
                            sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}
                          >
                            {st.fullName ? st.fullName[0] : 'S'}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {st.fullName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{st.gender}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {st.currentRollNo ? `#${st.currentRollNo}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          sx={{ width: 130 }}
                          value={st.rollNo}
                          error={isDuplicate}
                          helperText={isDuplicate ? 'Duplicate!' : ''}
                          inputProps={{ min: 1, max: 999 }}
                          onChange={(e) => handleRollNoChange(index, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />

          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: '#fafafa' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={duplicates.length > 0}
              loading={assignMutation.isPending}
            >
              Save Roll Numbers
            </Button>
          </Box>
        </Card>
      ) : (
        classId && sectionId && (
          <Alert severity="info" variant="outlined">
            No active students found in the selected class and section.
          </Alert>
        )
      )}
    </Box>
  );
}
