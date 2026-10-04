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
  Tabs,
  Tab,
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
  Divider,
  Snackbar
} from '@mui/material';
import {
  School as SchoolIcon,
  MenuBook as SubjectIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../../masters/api';
import { staffApi } from '../api';

export default function TeacherAllocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);

  // Tab 1 filters
  const [classFilter, setClassFilter] = useState('');

  // Tab 2 filters
  const [subjectClassFilter, setSubjectClassFilter] = useState('');
  const [subjectSectionFilter, setSubjectSectionFilter] = useState('');

  // Notification
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  const selectedSubjectClassObj = classes.find((c) => String(c.id) === String(subjectClassFilter));
  const subjectSections = selectedSubjectClassObj ? selectedSubjectClassObj.sections : [];

  // Fetch staff list for teacher dropdown
  const { data: staffRes } = useQuery({
    queryKey: ['teachers-dropdown-list'],
    queryFn: () => staffApi.getEmployees({ status: 1, pageSize: 200 }),
  });
  const teachers = staffRes?.data?.data?.items || [];

  // Fetch Class Teachers
  const {
    data: classTeachersRes,
    isLoading: isLoadingClassTeachers,
  } = useQuery({
    queryKey: ['class-teachers-allocations', classFilter],
    queryFn: () => staffApi.getClassTeachers(classFilter || undefined),
  });
  const classTeachers = classTeachersRes?.data?.data || [];

  // Fetch Subject Teachers
  const subjectQueryParams = {
    classId: subjectClassFilter || undefined,
    sectionId: subjectSectionFilter || undefined,
  };
  const {
    data: subjectTeachersRes,
    isLoading: isLoadingSubjectTeachers,
  } = useQuery({
    queryKey: ['subject-teachers-allocations', subjectQueryParams],
    queryFn: () => staffApi.getSubjectTeachers(subjectQueryParams),
  });
  const subjectTeachers = subjectTeachersRes?.data?.data || [];

  // Mutations
  const saveClassTeacherMutation = useMutation({
    mutationFn: (data) => staffApi.saveClassTeacher(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['class-teachers-allocations']);
      setSnackbarMsg(res?.data?.message || 'Class teacher saved successfully.');
    },
  });

  const saveSubjectTeacherMutation = useMutation({
    mutationFn: (data) => staffApi.saveSubjectTeacher(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['subject-teachers-allocations']);
      setSnackbarMsg(res?.data?.message || 'Subject teacher saved successfully.');
    },
  });

  const handleClassTeacherChange = (row, newEmployeeId) => {
    saveClassTeacherMutation.mutate({
      classId: row.classId,
      sectionId: row.sectionId,
      employeeId: newEmployeeId ? Number(newEmployeeId) : null,
    });
  };

  const handleSubjectTeacherChange = (row, newEmployeeId) => {
    saveSubjectTeacherMutation.mutate({
      classId: row.classId,
      sectionId: row.sectionId,
      subjectId: row.subjectId,
      employeeId: newEmployeeId ? Number(newEmployeeId) : null,
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
            onClick={() => navigate('/staff')}
            sx={{ mb: 1 }}
          >
            Back to Staff Directory
          </Button>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Teacher Allocation Matrix (FR-4.3, BR-4.2)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign Class Teachers per section and Subject Teachers per class-section-subject for the current academic session
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            icon={<SchoolIcon fontSize="small" />}
            iconPosition="start"
            label="1. Class Teacher Allocation (One Per Section)"
          />
          <Tab
            icon={<SubjectIcon fontSize="small" />}
            iconPosition="start"
            label="2. Subject Teacher Allocation (Per Class-Section-Subject)"
          />
        </Tabs>
      </Card>

      {/* Tab 1: Class Teachers */}
      {activeTab === 0 && (
        <Card sx={{ boxShadow: 2 }}>
          <CardContent sx={{ pb: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label="Filter by Class"
                sx={{ width: 220 }}
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>

              <Typography variant="body2" color="text.secondary">
                Rule BR-4.2: Each section can have at most one designated Class Teacher per academic year.
              </Typography>
            </Stack>

            {isLoadingClassTeachers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                    <TableRow>
                      <TableCell width={180}><b>Class</b></TableCell>
                      <TableCell width={150}><b>Section</b></TableCell>
                      <TableCell width={130}><b>Capacity</b></TableCell>
                      <TableCell><b>Assigned Class Teacher</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classTeachers.map((row) => (
                      <TableRow key={`${row.classId}-${row.sectionId}`} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.className}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`Section ${row.sectionName}`} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {row.capacity} Seats
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            sx={{ width: 320 }}
                            value={row.employeeId || ''}
                            onChange={(e) => handleClassTeacherChange(row, e.target.value)}
                          >
                            <MenuItem value="">
                              <em>-- Unassigned --</em>
                            </MenuItem>
                            {teachers.map((t) => (
                              <MenuItem key={t.id} value={t.id}>
                                {t.fullName} ({t.employeeCode})
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Subject Teachers */}
      {activeTab === 1 && (
        <Card sx={{ boxShadow: 2 }}>
          <CardContent sx={{ pb: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Filter Class"
                sx={{ width: 200 }}
                value={subjectClassFilter}
                onChange={(e) => {
                  setSubjectClassFilter(e.target.value);
                  setSubjectSectionFilter('');
                }}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Filter Section"
                sx={{ width: 180 }}
                value={subjectSectionFilter}
                disabled={!subjectClassFilter}
                onChange={(e) => setSubjectSectionFilter(e.target.value)}
              >
                <MenuItem value="">All Sections</MenuItem>
                {subjectSections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </TextField>

              <Typography variant="body2" color="text.secondary">
                Assign teachers to enter subject marks and attendance (FR-4.4).
              </Typography>
            </Stack>

            {isLoadingSubjectTeachers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                    <TableRow>
                      <TableCell width={160}><b>Class</b></TableCell>
                      <TableCell width={140}><b>Section</b></TableCell>
                      <TableCell width={220}><b>Subject</b></TableCell>
                      <TableCell width={140}><b>Type</b></TableCell>
                      <TableCell><b>Assigned Subject Teacher</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subjectTeachers.map((row) => (
                      <TableRow key={`${row.classId}-${row.sectionId}-${row.subjectId}`} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.className}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`Section ${row.sectionName}`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {row.subjectName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Code: {row.subjectCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.subjectType === 1 ? 'Scholastic' : 'Co-Scholastic'}
                            size="small"
                            color={row.subjectType === 1 ? 'info' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            sx={{ width: 320 }}
                            value={row.employeeId || ''}
                            onChange={(e) => handleSubjectTeacherChange(row, e.target.value)}
                          >
                            <MenuItem value="">
                              <em>-- Unassigned --</em>
                            </MenuItem>
                            {teachers.map((t) => (
                              <MenuItem key={t.id} value={t.id}>
                                {t.fullName} ({t.employeeCode})
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Snackbar feedback */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg('')}
        message={snackbarMsg}
      />
    </Box>
  );
}
