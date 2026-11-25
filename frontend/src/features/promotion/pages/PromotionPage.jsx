import React, { useState, useEffect } from 'react';
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
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Upgrade as PromoteIcon,
  History as HistoryIcon,
  Undo as UndoIcon,
  CheckCircle as SuccessIcon,
  ArrowForward as ArrowIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { promotionApi } from '../api';
import api from '../../../api/client';

export const PromotionPage = () => {
  const [tabIndex, setTabIndex] = useState(0);

  // Common masters
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);

  // Source selection
  const [fromAY, setFromAY] = useState('');
  const [fromClassId, setFromClassId] = useState('');
  const [fromSections, setFromSections] = useState([]);
  const [fromSectionId, setFromSectionId] = useState('');

  // Target selection
  const [toAY, setToAY] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [toSections, setToSections] = useState([]);
  const [toSectionId, setToSectionId] = useState('');

  // Students list for promotion
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentResults, setStudentResults] = useState({}); // studentId -> { result: 1 (Promoted)/2 (Detained)/3 (Left), targetSectionId }
  const [carryForwardDues, setCarryForwardDues] = useState(true);

  // Status & Alerts
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [alert, setAlert] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      const [ayRes, classRes] = await Promise.all([
        api.get('/academicyears'),
        api.get('/classes'),
      ]);
      const ays = ayRes.data?.data || [];
      const cls = classRes.data?.data || [];

      setAcademicYears(ays);
      setClasses(cls);

      // Chronological sort: earlier year first
      const sortedAys = [...ays].sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
      if (sortedAys.length > 1) {
        // e.g. from 2026-27 to 2027-28
        setFromAY(sortedAys[0].id);
        setToAY(sortedAys[1].id);
      } else if (sortedAys.length === 1) {
        setFromAY(sortedAys[0].id);
        setToAY(sortedAys[0].id);
      }

      if (cls.length > 0) {
        setFromClassId(cls[0].id);
        const secs = cls[0].sections || [];
        setFromSections(secs);
        if (secs.length > 0) setFromSectionId(secs[0].id);

        // Next class default
        const nextClass = cls.length > 1 ? cls[1] : cls[0];
        setToClassId(nextClass.id);
        const targetSecs = nextClass.sections || [];
        setToSections(targetSecs);
        if (targetSecs.length > 0) setToSectionId(targetSecs[0].id);
      }
    } catch (err) {
      console.error('Failed to load masters:', err);
      setAlert({
        type: 'error',
        message: 'Failed to load Academic Years or Classes: ' + (err.response?.data?.message || err.message),
      });
    }
  };

  const handleFromClassChange = (classId) => {
    setFromClassId(classId);
    const found = classes.find((c) => c.id === classId);
    const secs = found?.sections || [];
    setFromSections(secs);
    if (secs.length > 0) setFromSectionId(secs[0].id);
    else setFromSectionId('');

    // Suggest next class automatically
    const currentIndex = classes.findIndex((c) => c.id === classId);
    if (currentIndex >= 0 && currentIndex + 1 < classes.length) {
      const nextCls = classes[currentIndex + 1];
      setToClassId(nextCls.id);
      const targetSecs = nextCls.sections || [];
      setToSections(targetSecs);
      if (targetSecs.length > 0) setToSectionId(targetSecs[0].id);
    }
  };

  const handleToClassChange = (classId) => {
    setToClassId(classId);
    const found = classes.find((c) => c.id === classId);
    const secs = found?.sections || [];
    setToSections(secs);
    if (secs.length > 0) setToSectionId(secs[0].id);
    else setToSectionId('');
  };

  useEffect(() => {
    if (fromClassId && fromSectionId && fromAY && tabIndex === 0) {
      loadEligibleStudents();
    }
  }, [fromClassId, fromSectionId, fromAY, tabIndex]);

  const loadEligibleStudents = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await promotionApi.getEligibleStudents(fromClassId, fromSectionId, fromAY);
      const data = res.data?.data || {};
      const list = data.students || [];
      setStudents(list);

      // Select all by default
      const allIds = list.map((s) => s.studentId);
      setSelectedStudentIds(allIds);

      // Default result = 1 (Promoted)
      const resMap = {};
      list.forEach((s) => {
        resMap[s.studentId] = { result: 1, targetSectionId: toSectionId };
      });
      setStudentResults(resMap);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load eligible students.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabIndex === 1) {
      loadHistory();
    }
  }, [tabIndex]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await promotionApi.getPromotionHistory();
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map((s) => s.studentId));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleResultChange = (studentId, resultVal) => {
    setStudentResults((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        result: Number(resultVal),
      },
    }));
  };

  const handleExecutePromotion = async () => {
    if (!selectedStudentIds.length) {
      setAlert({ type: 'error', message: 'Please select at least one student to promote.' });
      return;
    }
    if (fromAY === toAY) {
      setAlert({ type: 'error', message: 'Target Academic Year must be different from Source Academic Year.' });
      return;
    }

    setPromoting(true);
    setAlert(null);
    try {
      const payload = {
        fromAcademicYearId: fromAY,
        toAcademicYearId: toAY,
        fromClassId,
        fromSectionId,
        toClassId,
        toSectionId,
        carryForwardDues,
        students: selectedStudentIds.map((id) => ({
          studentId: id,
          result: studentResults[id]?.result || 1,
          targetSectionId: toSectionId,
        })),
      };

      const res = await promotionApi.executeBulkPromotion(payload);
      setAlert({
        type: 'success',
        message: res.data?.message || 'Students successfully promoted to the next academic year!',
      });
      loadEligibleStudents();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to execute promotion.' });
    } finally {
      setPromoting(false);
    }
  };

  const handleRollback = async (historyId, studentName) => {
    if (!window.confirm(`Are you sure you want to rollback promotion for ${studentName}?`)) return;
    try {
      await promotionApi.rollbackPromotion(historyId);
      setAlert({ type: 'success', message: `Promotion rolled back for ${studentName}.` });
      loadHistory();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Cannot rollback promotion.' });
    }
  };

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#1e293b', m: 0, lineHeight: 1.2 }}>
            Student Promotion & Year-End Roll-over
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 0.25 }}>
            Promote, detain, or exit students batch-wise with fee dues carryover
          </Typography>
        </Box>
      </Stack>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 1.5 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} sx={{ mb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<PromoteIcon />} iconPosition="start" label="Batch Promotion" />
        <Tab icon={<HistoryIcon />} iconPosition="start" label="Promotion History & Rollback" />
      </Tabs>

      {/* TAB 0: Batch Promotion */}
      {tabIndex === 0 && (
        <Box>
          {/* Source and Target Setup Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* From Source */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 2, borderTop: '4px solid #1976d2', borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 2 }}>
                    STEP 1: SELECT SOURCE (CURRENT CLASS)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Academic Year</InputLabel>
                        <Select value={fromAY} label="Academic Year" onChange={(e) => setFromAY(e.target.value)}>
                          {academicYears.map((a) => (
                            <MenuItem key={a.id} value={a.id}>
                              {a.name} {a.isCurrent ? '(Current)' : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Class</InputLabel>
                        <Select value={fromClassId} label="Class" onChange={(e) => handleFromClassChange(e.target.value)}>
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
                          value={fromSectionId}
                          label="Section"
                          onChange={(e) => setFromSectionId(e.target.value)}
                          disabled={!fromSections.length}
                        >
                          {fromSections.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              Section {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* To Target */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 2, borderTop: '4px solid #15803d', borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="success.main" sx={{ mb: 2 }}>
                    STEP 2: SELECT TARGET (NEXT CLASS)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Target Year</InputLabel>
                        <Select value={toAY} label="Target Year" onChange={(e) => setToAY(e.target.value)}>
                          {academicYears.map((a) => (
                            <MenuItem key={a.id} value={a.id}>
                              {a.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Promote To Class</InputLabel>
                        <Select value={toClassId} label="Promote To Class" onChange={(e) => handleToClassChange(e.target.value)}>
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
                        <InputLabel>Target Section</InputLabel>
                        <Select
                          value={toSectionId}
                          label="Target Section"
                          onChange={(e) => setToSectionId(e.target.value)}
                          disabled={!toSections.length}
                        >
                          {toSections.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              Section {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Action and Settings Bar */}
          <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={carryForwardDues}
                    onChange={(e) => setCarryForwardDues(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Carry forward unpaid fee dues to next academic year
                  </Typography>
                }
              />
              <Typography variant="body2" color="text.secondary">
                Selected: <strong>{selectedStudentIds.length}</strong> / {students.length} students
              </Typography>
            </Stack>
            <Button
              variant="contained"
              color="success"
              startIcon={<PromoteIcon />}
              onClick={handleExecutePromotion}
              disabled={promoting || loading || selectedStudentIds.length === 0}
              sx={{ px: 3, fontWeight: 700 }}
            >
              {promoting ? 'Promoting...' : `Execute Bulk Promotion (${selectedStudentIds.length})`}
            </Button>
          </Paper>

          {/* Students Table */}
          <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={students.length > 0 && selectedStudentIds.length === students.length}
                      indeterminate={selectedStudentIds.length > 0 && selectedStudentIds.length < students.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Admission No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Outstanding Dues</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 220 }}>Promotion Decision</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Result Destination</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      Loading eligible students...
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No active students found in the selected source class & section.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.studentId);
                    const currentDecision = studentResults[st.studentId]?.result || 1;

                    return (
                      <TableRow key={st.studentId} hover selected={isSelected}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={isSelected} onChange={() => handleToggleStudent(st.studentId)} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{st.rollNo ? `#${st.rollNo}` : '—'}</TableCell>
                        <TableCell>{st.admissionNo}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{st.fullName}</TableCell>
                        <TableCell>
                          {st.pendingDues > 0 ? (
                            <Chip
                              icon={<MoneyIcon sx={{ fontSize: 14 }} />}
                              label={`₹${st.pendingDues.toLocaleString()} (${st.pendingDuesCount} dues)`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ) : (
                            <Chip label="Dues Cleared" size="small" color="success" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={currentDecision}
                              onChange={(e) => handleResultChange(st.studentId, e.target.value)}
                            >
                              <MenuItem value={1}>Promote to Next Class</MenuItem>
                              <MenuItem value={2}>Detain in Same Class</MenuItem>
                              <MenuItem value={3}>Mark as Left School</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          {currentDecision === 1 ? (
                            <Chip label={`Promote: ${classes.find(c => c.id === toClassId)?.name || 'Next'}`} color="success" size="small" />
                          ) : currentDecision === 2 ? (
                            <Chip label={`Repeat: ${classes.find(c => c.id === fromClassId)?.name || 'Same'}`} color="error" size="small" />
                          ) : (
                            <Chip label="Leaving School" color="default" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: Promotion History & Rollback */}
      {tabIndex === 1 && (
        <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Promotion Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Admission No</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>From Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>To Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Dues Carried</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No promotion transactions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>{h.promotionDate}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{h.admissionNo}</TableCell>
                    <TableCell>{h.studentName}</TableCell>
                    <TableCell>{h.fromClass}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{h.toClass}</TableCell>
                    <TableCell>
                      <Chip
                        label={h.result}
                        size="small"
                        color={h.result === 'Promoted' ? 'success' : h.result === 'Detained' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {h.duesCarriedForward > 0 ? `₹${h.duesCarriedForward.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell>
                      {h.isRolledBack ? (
                        <Chip label="Rolled Back" size="small" color="error" variant="outlined" />
                      ) : (
                        <Chip label="Active" size="small" color="success" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!h.isRolledBack && (
                        <Tooltip title="Rollback promotion before any new transactions in new year">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<UndoIcon />}
                            onClick={() => handleRollback(h.id, h.studentName)}
                          >
                            Rollback
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default PromotionPage;
