import React, { useState, useMemo } from 'react';
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
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar
} from '@mui/material';
import {
  AssignmentTurnedIn as AssignIcon,
  CardGiftcard as ConcessionIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feesApi } from '../api';
import { classesApi } from '../../masters/api';
import { studentApi } from '../../students/api';
import { usePermission } from '../../../hooks/usePermission';

export default function FeeAssignmentPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();

  // Bulk assignment state
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSectionId, setAssignSectionId] = useState('');
  const [assignGroupId, setAssignGroupId] = useState('');
  const [assignResultMsg, setAssignResultMsg] = useState('');
  const [assignErrorMsg, setAssignErrorMsg] = useState('');

  // Concession form state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [concessionHeadId, setConcessionHeadId] = useState('');
  const [concessionType, setConcessionType] = useState(1); // 1 = Percentage, 2 = Fixed
  const [concessionValue, setConcessionValue] = useState('');
  const [concessionReasonCategory, setConcessionReasonCategory] = useState('Sibling Concession (FR-3.4)');
  const [concessionNotes, setConcessionNotes] = useState('');
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [concessionError, setConcessionError] = useState('');

  // Queries
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];

  const selectedClassObj = classes.find((c) => String(c.id) === String(assignClassId));
  const sections = selectedClassObj ? selectedClassObj.sections : [];

  const { data: groupsRes } = useQuery({
    queryKey: ['fee-groups'],
    queryFn: () => feesApi.getGroups(),
  });
  const groups = groupsRes?.data?.data || [];

  const { data: headsRes } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: () => feesApi.getHeads(),
  });
  const heads = headsRes?.data?.data || [];

  // Search students for concession
  const { data: searchStudentsRes, isLoading: isSearchingStudents } = useQuery({
    queryKey: ['search-students-concession', studentSearch],
    queryFn: () => studentApi.getStudents({ search: studentSearch, pageSize: 8 }),
    enabled: studentSearch.length >= 2,
  });
  const searchResults = searchStudentsRes?.data?.data?.items || [];

  // Fetch concessions list
  const { data: concessionsRes, isLoading: isLoadingConcessions } = useQuery({
    queryKey: ['fee-concessions-list'],
    queryFn: () => feesApi.getConcessions(),
  });
  const concessions = concessionsRes?.data?.data || [];

  const existingConcessionForHead = useMemo(() => {
    if (!selectedStudent || !concessionHeadId) return null;
    return concessions.find(
      (c) =>
        Number(c.studentId) === Number(selectedStudent.id) &&
        Number(c.feeHeadId) === Number(concessionHeadId)
    );
  }, [selectedStudent, concessionHeadId, concessions]);

  // Bulk Assign Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: (payload) => feesApi.bulkAssign(payload),
    onSuccess: (res) => {
      setAssignResultMsg(res?.data?.message || 'Fee structure assigned successfully!');
      setAssignErrorMsg('');
    },
    onError: (err) => {
      setAssignErrorMsg(err?.response?.data?.message || 'Failed to assign fee structure.');
    },
  });

  // Create Concession Mutation
  const createConcessionMutation = useMutation({
    mutationFn: (payload) => feesApi.createConcession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-concessions-list']);
      setSnackbarMsg('Fee concession granted and approved.');
      setSelectedStudent(null);
      setStudentSearch('');
      setConcessionValue('');
      setConcessionNotes('');
      setConcessionError('');
    },
    onError: (err) => {
      setConcessionError(err?.response?.data?.message || 'Failed to grant concession.');
    },
  });

  // Delete Concession Mutation
  const deleteConcessionMutation = useMutation({
    mutationFn: (id) => feesApi.deleteConcession(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-concessions-list']);
      setSnackbarMsg('Concession revoked.');
    },
  });

  const handleRunBulkAssignment = (e) => {
    e.preventDefault();
    if (!assignClassId || !assignGroupId) {
      setAssignErrorMsg('Please select Class and Fee Group.');
      return;
    }
    bulkAssignMutation.mutate({
      classId: Number(assignClassId),
      sectionId: assignSectionId ? Number(assignSectionId) : null,
      feeGroupId: Number(assignGroupId),
    });
  };

  const handleGrantConcession = (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setConcessionError('Please search and select a student.');
      return;
    }
    if (!concessionHeadId) {
      setConcessionError('Please select a fee head.');
      return;
    }
    if (existingConcessionForHead) {
      setConcessionError(
        `This student already has an active concession (${existingConcessionForHead.type === 1 ? `${existingConcessionForHead.value}% Off` : `₹${existingConcessionForHead.value} Off`}) on '${existingConcessionForHead.feeHeadName}'. A fee head cannot have multiple concessions for the same student. Please delete the existing concession first.`
      );
      return;
    }
    if (!concessionValue || Number(concessionValue) <= 0) {
      setConcessionError('Please enter a valid concession amount or percentage.');
      return;
    }

    const fullReason = `${concessionReasonCategory}: ${concessionNotes.trim()}`.trim();
    createConcessionMutation.mutate({
      studentId: selectedStudent.id,
      feeHeadId: Number(concessionHeadId),
      type: Number(concessionType),
      value: Number(concessionValue),
      reason: fullReason,
    });
  };

  return (
    <Box sx={{ p: 3 }}>


      <Grid container spacing={3}>
        {/* Left: Bulk Fee Assignment Wizard */}
        <Grid item xs={12} md={5}>
          <Card sx={{ boxShadow: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <AssignIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  1. Bulk Class Fee Assignment (FR-5.2)
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Generates student installment dues for all active students in the selected class.
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              {assignResultMsg && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
                  {assignResultMsg}
                </Alert>
              )}
              {assignErrorMsg && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {assignErrorMsg}
                </Alert>
              )}

              <form onSubmit={handleRunBulkAssignment}>
                <Stack spacing={2.5}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    required
                    label="Select Class"
                    value={assignClassId}
                    onChange={(e) => {
                      setAssignClassId(e.target.value);
                      setAssignSectionId('');
                    }}
                  >
                    <MenuItem value="">Choose Class</MenuItem>
                    {classes.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Section (Optional)"
                    value={assignSectionId}
                    disabled={!assignClassId}
                    onChange={(e) => setAssignSectionId(e.target.value)}
                  >
                    <MenuItem value="">All Sections</MenuItem>
                    {sections.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name} (Cap: {s.capacity})</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    required
                    label="Fee Group / Category"
                    value={assignGroupId}
                    onChange={(e) => setAssignGroupId(e.target.value)}
                    helperText="Applies configured fee structure for this group"
                  >
                    <MenuItem value="">Select Fee Group</MenuItem>
                    {groups.map((g) => (
                      <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                    ))}
                  </TextField>

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<AssignIcon />}
                    disabled={!assignClassId || !assignGroupId}
                    loading={bulkAssignMutation.isPending}
                    sx={{ mt: 1 }}
                  >
                    Apply Fee Structure to Students
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Grant Concession Form */}
        <Grid item xs={12} md={7}>
          <Card sx={{ boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <ConcessionIcon color="secondary" />
                <Typography variant="h6" fontWeight={700}>
                  2. Grant Fee Concession (FR-5.3)
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Concessions for siblings, staff wards, scholarships, or RTE are applied to student dues.
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              {concessionError && <Alert severity="error" sx={{ mb: 2 }}>{concessionError}</Alert>}

              {/* Student Search */}
              <Box sx={{ mb: 2 }}>
                {!selectedStudent ? (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      label="Search Student"
                      placeholder="Type student name or admission number..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />,
                      }}
                    />

                    {searchResults.length > 0 && (
                      <Paper sx={{ mt: 1, maxHeight: 180, overflow: 'auto', border: '1px solid #ccc' }}>
                        {searchResults.map((st) => (
                          <Box
                            key={st.id}
                            sx={{
                              p: 1.5,
                              cursor: 'pointer',
                              borderBottom: '1px solid #eee',
                              '&:hover': { bgcolor: '#f0f7ff' },
                            }}
                            onClick={() => {
                              setSelectedStudent(st);
                              setStudentSearch('');
                            }}
                          >
                            <Typography variant="body2" fontWeight={700}>
                              {st.fullName} ({st.admissionNo})
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Class: {st.className} - {st.sectionName} | Guardian: {st.guardianName}
                            </Typography>
                          </Box>
                        ))}
                      </Paper>
                    )}
                  </>
                ) : (
                  <Paper sx={{ p: 2, bgcolor: '#f4f8fd', border: '1px solid #1976d2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <PersonIcon color="primary" />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {selectedStudent.fullName} ({selectedStudent.admissionNo})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Class: {selectedStudent.className} - {selectedStudent.sectionName}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button size="small" color="error" onClick={() => setSelectedStudent(null)}>
                      Change Student
                    </Button>
                  </Paper>
                )}
              </Box>

              <form onSubmit={handleGrantConcession}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      required
                      label="Fee Head"
                      value={concessionHeadId}
                      onChange={(e) => setConcessionHeadId(e.target.value)}
                    >
                      <MenuItem value="">Choose Fee Head</MenuItem>
                      {heads.map((h) => (
                        <MenuItem key={h.id} value={h.id}>{h.name} ({h.code})</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Type"
                      value={concessionType}
                      onChange={(e) => setConcessionType(Number(e.target.value))}
                    >
                      <MenuItem value={1}>Percentage (%)</MenuItem>
                      <MenuItem value={2}>Fixed (₹)</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      required
                      type="number"
                      label={concessionType === 1 ? 'Discount (%)' : 'Amount (₹)'}
                      value={concessionValue}
                      inputProps={{ min: 1, max: concessionType === 1 ? 100 : 100000 }}
                      onChange={(e) => setConcessionValue(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      required
                      label="Concession Category"
                      value={concessionReasonCategory}
                      onChange={(e) => setConcessionReasonCategory(e.target.value)}
                    >
                      <MenuItem value="Sibling Concession (FR-3.4)">Sibling Concession (FR-3.4)</MenuItem>
                      <MenuItem value="Staff Ward Concession">Staff Ward Concession</MenuItem>
                      <MenuItem value="Merit Scholarship">Merit Scholarship</MenuItem>
                      <MenuItem value="RTE Quota">RTE Quota</MenuItem>
                      <MenuItem value="Management / Discretionary">Management / Discretionary</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Approval / Note"
                      placeholder="e.g. Approved per sibling policy #2"
                      value={concessionNotes}
                      onChange={(e) => setConcessionNotes(e.target.value)}
                    />
                  </Grid>

                  {existingConcessionForHead && (
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                        <Typography variant="body2" fontWeight={700}>
                          Concession Already Exists:
                        </Typography>
                        <Typography variant="caption">
                          This student already has an active concession of{' '}
                          <b>{existingConcessionForHead.type === 1 ? `${existingConcessionForHead.value}% Off` : `₹${existingConcessionForHead.value} Off`}</b>{' '}
                          on <b>{existingConcessionForHead.feeHeadName}</b>. A fee head can only have one concession per student. Please delete the existing concession below before adding a new one.
                        </Typography>
                      </Alert>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color={existingConcessionForHead ? "warning" : "secondary"}
                      startIcon={<ConcessionIcon />}
                      disabled={!selectedStudent || !concessionHeadId || Boolean(existingConcessionForHead)}
                      loading={createConcessionMutation.isPending}
                    >
                      {existingConcessionForHead ? 'Concession Already Applied' : 'Grant & Approve Concession'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Concessions Table */}
      <Card sx={{ mt: 3, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Active Approved Concessions ({concessions.length})
          </Typography>

          {isLoadingConcessions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : concessions.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                  <TableRow>
                    <TableCell width={140}><b>Adm No</b></TableCell>
                    <TableCell><b>Student Name</b></TableCell>
                    <TableCell width={160}><b>Fee Head</b></TableCell>
                    <TableCell width={140}><b>Concession</b></TableCell>
                    <TableCell><b>Reason / Approval Notes</b></TableCell>
                    <TableCell width={80} align="right"><b>Action</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {concessions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Chip label={c.admissionNo} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell><b>{c.studentName}</b></TableCell>
                      <TableCell>{c.feeHeadName}</TableCell>
                      <TableCell>
                        <Chip
                          label={c.type === 1 ? `${c.value}% Off` : `₹${c.value} Off`}
                          color="secondary"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{c.reason || '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {can('FeeConcessions', 'Delete') && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteConcessionMutation.mutate(c.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" variant="outlined">
              No concessions granted yet.
            </Alert>
          )}
        </CardContent>
      </Card>

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
