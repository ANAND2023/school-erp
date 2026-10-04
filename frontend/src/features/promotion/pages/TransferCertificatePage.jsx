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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { promotionApi } from '../api';
import { studentApi } from '../../students/api';
import { printWithTitle } from '../../../utils/printUtils';
import AppDatePicker from '../../../components/common/AppDatePicker';

export const TransferCertificatePage = () => {
  const [tcList, setTcList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState(null);

  // Issue TC Modal State
  const [issueModal, setIssueModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [clearanceData, setClearanceData] = useState(null);
  const [clearanceLoading, setClearanceLoading] = useState(false);

  const [tcForm, setTcForm] = useState({
    applicationDate: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    lastClassStudied: '',
    qualifiedForPromotion: true,
    reasonForLeaving: 'Parent Relocation / Transfer',
    conduct: 'Good',
    adminOverrideDues: false,
    remarks: 'Student bears good moral character.',
  });
  const [issuing, setIssuing] = useState(false);

  // Print TC Modal State
  const [printModal, setPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  useEffect(() => {
    loadTcList();
  }, [search]);

  const loadTcList = async () => {
    setLoading(true);
    try {
      const res = await promotionApi.getTransferCertificates(search || undefined);
      setTcList(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load transfer certificates.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchStudents = async (val) => {
    setStudentSearch(val);
    if (val.trim().length >= 2) {
      try {
        const res = await studentApi.getStudents({ search: val.trim(), pageSize: 6 });
        const data = res.data?.data;
        const items = data?.items || (Array.isArray(data) ? data : []);
        setStudentResults(items);
      } catch (err) {
        console.error(err);
      }
    } else {
      setStudentResults([]);
    }
  };

  const handleSelectStudentForTc = async (student) => {
    setSelectedStudent(student);
    setClearanceLoading(true);
    setTcForm((prev) => ({
      ...prev,
      lastClassStudied: student.className || '',
    }));
    try {
      const res = await promotionApi.checkDuesForTc(student.id);
      setClearanceData(res.data?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setClearanceLoading(false);
    }
  };

  const handleIssueSubmit = async () => {
    if (!selectedStudent) {
      setAlert({ type: 'error', message: 'Please select a student.' });
      return;
    }
    if (!clearanceData?.canIssueTc && !tcForm.adminOverrideDues) {
      setAlert({
        type: 'error',
        message: 'Student has pending fee dues! Clear dues or check Admin Override (FR-8.4).',
      });
      return;
    }

    setIssuing(true);
    setAlert(null);
    try {
      const payload = {
        studentId: selectedStudent.id,
        applicationDate: tcForm.applicationDate,
        issueDate: tcForm.issueDate,
        lastClassStudied: tcForm.lastClassStudied,
        qualifiedForPromotion: tcForm.qualifiedForPromotion,
        reasonForLeaving: tcForm.reasonForLeaving,
        conduct: tcForm.conduct,
        adminOverrideDues: tcForm.adminOverrideDues,
        remarks: tcForm.remarks,
      };

      const res = await promotionApi.issueTc(payload);
      setAlert({
        type: 'success',
        message: res.data?.message || 'Transfer Certificate issued successfully!',
      });
      setIssueModal(false);
      setSelectedStudent(null);
      setClearanceData(null);
      loadTcList();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to issue TC.' });
    } finally {
      setIssuing(false);
    }
  };

  const handleOpenPrint = async (tcId) => {
    setPrintLoading(true);
    setPrintModal(true);
    try {
      const res = await promotionApi.getTcPrintData(tcId);
      setPrintData(res.data?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setPrintLoading(false);
    }
  };

  const handlePrint = () => {
    const sName = printData?.studentName || selectedTc?.studentName || 'Student';
    const tcNo = printData?.tcNumber || selectedTc?.tcNumber || 'TC';
    printWithTitle(`Transfer_Certificate_${sName}_${tcNo}`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Transfer Certificates (TC)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate, print and track official school leaving certificates with clearance verification (Module 8: FR-8.4, FR-8.5)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedStudent(null);
            setClearanceData(null);
            setStudentSearch('');
            setStudentResults([]);
            setIssueModal(true);
          }}
        >
          Issue New TC
        </Button>
      </Stack>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by TC Number, Student Name, or Admission Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />
        </CardContent>
      </Card>

      {/* TC List Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>TC Number</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Admission No</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Issue Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Last Class Studied</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Clearance Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  Loading transfer certificates...
                </TableCell>
              </TableRow>
            ) : tcList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No transfer certificates found. Click "Issue New TC" to generate one.
                </TableCell>
              </TableRow>
            ) : (
              tcList.map((tc) => (
                <TableRow key={tc.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{tc.tcNumber}</TableCell>
                  <TableCell>{tc.admissionNo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{tc.studentName}</TableCell>
                  <TableCell>{tc.issueDate}</TableCell>
                  <TableCell>{tc.lastClassStudied}</TableCell>
                  <TableCell>
                    {tc.feeCleared ? (
                      <Chip label="Fee Cleared" size="small" color="success" variant="outlined" />
                    ) : (
                      <Chip label={`Dues: ₹${tc.pendingDuesAmount}`} size="small" color="error" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tc.status}
                      size="small"
                      color={tc.status === 'Issued' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={() => handleOpenPrint(tc.id)}
                    >
                      Print TC
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Issue TC Dialog */}
      <Dialog open={issueModal} onClose={() => setIssueModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Issue Transfer Certificate</DialogTitle>
        <DialogContent dividers>
          {/* Student Selector */}
          {!selectedStudent ? (
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Search Student (Name or Admission No)"
                value={studentSearch}
                onChange={(e) => handleSearchStudents(e.target.value)}
                placeholder="Type at least 2 characters..."
                sx={{ mb: 1.5 }}
              />
              {studentResults.length > 0 && (
                <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {studentResults.map((s) => (
                    <Box
                      key={s.id}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f1f5f9' },
                        borderBottom: '1px solid #f1f5f9',
                      }}
                      onClick={() => handleSelectStudentForTc(s)}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {s.fullName} ({s.admissionNo})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Class: {s.className || 'N/A'} - {s.sectionName || ''} | Father: {s.guardianName || 'N/A'}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>
          ) : (
            <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {selectedStudent.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Admission No: <strong>{selectedStudent.admissionNo}</strong> | Class: {selectedStudent.className}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setSelectedStudent(null)}>
                  Change
                </Button>
              </Stack>
            </Card>
          )}

          {/* Dues & Clearance Alert (FR-8.4) */}
          {clearanceLoading && (
            <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>
              Checking fee dues and library clearance...
            </Typography>
          )}

          {clearanceData && (
            <Alert
              severity={clearanceData.feeCleared ? 'success' : 'error'}
              sx={{ mb: 3 }}
              icon={clearanceData.feeCleared ? <PassIcon /> : <WarningIcon />}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {clearanceData.message}
              </Typography>
              {!clearanceData.feeCleared && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tcForm.adminOverrideDues}
                      onChange={(e) => setTcForm({ ...tcForm, adminOverrideDues: e.target.checked })}
                      color="error"
                    />
                  }
                  label={
                    <Typography variant="caption" fontWeight={700} color="error">
                      Principal / Admin Override: Issue TC despite pending dues
                    </Typography>
                  }
                />
              )}
            </Alert>
          )}

          {/* TC Form Fields */}
          {selectedStudent && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <AppDatePicker
                  label="Application Date"
                  value={tcForm.applicationDate}
                  onChange={(e) => setTcForm({ ...tcForm, applicationDate: e.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <AppDatePicker
                  label="Issue Date"
                  value={tcForm.issueDate}
                  onChange={(e) => setTcForm({ ...tcForm, issueDate: e.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Last Class Studied"
                  value={tcForm.lastClassStudied}
                  onChange={(e) => setTcForm({ ...tcForm, lastClassStudied: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Promoted to Higher Class?</InputLabel>
                  <Select
                    value={tcForm.qualifiedForPromotion ? 'Yes' : 'No'}
                    label="Promoted to Higher Class?"
                    onChange={(e) => setTcForm({ ...tcForm, qualifiedForPromotion: e.target.value === 'Yes' })}
                  >
                    <MenuItem value="Yes">Yes, Qualified</MenuItem>
                    <MenuItem value="No">No, Detained</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Reason for Leaving"
                  value={tcForm.reasonForLeaving}
                  onChange={(e) => setTcForm({ ...tcForm, reasonForLeaving: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Conduct / Character"
                  value={tcForm.conduct}
                  onChange={(e) => setTcForm({ ...tcForm, conduct: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="General Remarks"
                  value={tcForm.remarks}
                  onChange={(e) => setTcForm({ ...tcForm, remarks: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setIssueModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!selectedStudent || issuing || (!clearanceData?.canIssueTc && !tcForm.adminOverrideDues)}
            onClick={handleIssueSubmit}
          >
            {issuing ? 'Generating TC...' : 'Issue Certificate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print TC Modal */}
      <Dialog open={printModal} onClose={() => setPrintModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Official School Transfer Certificate
          </Typography>
          <IconButton size="small" onClick={() => setPrintModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4, bgcolor: '#ffffff' }}>
          {printLoading || !printData ? (
            <Typography variant="body2" sx={{ py: 6, textAlign: 'center' }}>
              Loading certificate...
            </Typography>
          ) : (
            <Box
              id="printable-tc"
              sx={{
                p: 4,
                border: '3px double #1e3a8a',
                borderRadius: 2,
                fontFamily: 'serif',
                color: '#1e293b',
              }}
            >
              {/* Certificate Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight={800} color="#1e3a8a" sx={{ letterSpacing: 2 }}>
                  {printData.schoolName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  (Affiliated to CBSE, New Delhi | Affiliation No: {printData.affiliationNo})
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {printData.address}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{
                    mt: 2,
                    display: 'inline-block',
                    borderBottom: '2px solid #1e3a8a',
                    pb: 0.5,
                    letterSpacing: 1.5,
                  }}
                >
                  TRANSFER CERTIFICATE
                </Typography>
              </Box>

              {/* Number and Book */}
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={700}>
                  TC No: <span style={{ color: '#1e3a8a' }}>{printData.tcNumber}</span>
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  Admission No: <span style={{ color: '#1e3a8a' }}>{printData.student.admissionNo}</span>
                </Typography>
              </Stack>

              {/* Numbered Entries */}
              <Stack spacing={1.5} sx={{ mb: 4, '& .row-line': { borderBottom: '1px dotted #94a3b8', pb: 0.5 } }}>
                <Box className="row-line">
                  <Typography variant="body2">
                    1. Name of the Pupil:{' '}
                    <strong>{printData.student.fullName}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    2. Father's / Guardian's Name:{' '}
                    <strong>{printData.student.fatherName}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    3. Mother's Name:{' '}
                    <strong>{printData.student.motherName}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    4. Nationality: <strong>{printData.student.nationality}</strong> | Category:{' '}
                    <strong>{printData.student.category}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    5. Date of Birth (in figures): <strong>{printData.student.dob}</strong> (in words:{' '}
                    <em>{printData.student.dobWords}</em>)
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    6. Class in which pupil last studied: <strong>{printData.lastClassStudied}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    7. School / Board Annual Examination Result:{' '}
                    <strong>{printData.qualifiedForPromotion}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    8. Month up to which school dues paid:{' '}
                    <strong>{printData.monthUptoWhichDuesPaid}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    9. Total working days / present:{' '}
                    <strong>
                      {printData.totalDaysPresent} / {printData.totalWorkingDays}
                    </strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    10. Date of application for certificate: <strong>{printData.applicationDate}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    11. Date of issue of certificate: <strong>{printData.issueDate}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    12. Reason for leaving the school: <strong>{printData.reasonForLeaving}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    13. General Conduct: <strong>{printData.conduct}</strong>
                  </Typography>
                </Box>
                <Box className="row-line">
                  <Typography variant="body2">
                    14. Any other remarks: <em>{printData.remarks}</em>
                  </Typography>
                </Box>
              </Stack>

              {/* Signatures */}
              <Grid container spacing={2} sx={{ mt: 5, pt: 3 }}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Class Teacher Signature
                  </Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Checked by (Clerk)
                  </Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Principal / Headmaster (with Seal)
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPrintModal(false)}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print Certificate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransferCertificatePage;
