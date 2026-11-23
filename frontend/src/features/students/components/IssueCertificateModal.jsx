import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Autocomplete,
  Button,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { certificateApi, studentApi } from '../api';
import { DEFAULT_CERT_TEMPLATES, dateToWords } from './BonafideCertificateModal';

const PURPOSE_OPTIONS = [
  'Passport Application',
  'Visa Processing / Embassy Verification',
  'Bank Account Opening',
  'Bus / Rail Concession Pass',
  'Scholarship Application',
  'College / Higher Secondary Admission',
  'Aadhaar / Identity Proof Verification',
  'Sports & Tournament Age Verification',
  'Government Welfare Scheme',
  'General Official Verification',
];

export const IssueCertificateModal = ({
  open,
  onClose,
  certificateType = 'bonafide',
  classes = [],
  onIssueSuccess,
}) => {
  const typeKey = certificateType || 'bonafide';
  const defaultTemplate = DEFAULT_CERT_TEMPLATES[typeKey] || DEFAULT_CERT_TEMPLATES.bonafide;
  const themeColor = defaultTemplate.primaryColor || '#0284c7';

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Certificate Parameters
  const [refNo, setRefNo] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [purpose, setPurpose] = useState(defaultTemplate.defaultPurpose);
  const [customPurpose, setCustomPurpose] = useState('');
  const [printWithLetterhead, setPrintWithLetterhead] = useState(true);

  // Section options
  const currentClassObj = classes.find((c) => String(c.id) === String(selectedClassId));
  const sections = currentClassObj?.sections || [];

  // Reset when opened
  useEffect(() => {
    if (open) {
      setIssueDate(dayjs().format('DD-MMM-YYYY'));
      setPurpose(defaultTemplate.defaultPurpose);
      setCustomPurpose('');
      setPrintWithLetterhead(true);
      setSelectedStudent(null);
      setStudentSearchText('');
      setRefNo('');
      setSelectedClassId('');
      setSelectedSectionId('');
      loadStudents('', '', '');
    }
  }, [open, typeKey, defaultTemplate.defaultPurpose]);

  // Load students query
  const loadStudents = async (cId, sId, search) => {
    try {
      setSearching(true);
      const res = await certificateApi.searchStudents({
        query: search?.trim() || undefined,
        classId: cId || undefined,
        sectionId: sId || undefined,
        limit: 50,
      });

      if (res?.data?.data && Array.isArray(res.data.data)) {
        setStudentsList(res.data.data);
      } else {
        // Fallback to studentApi
        const fRes = await studentApi.getStudents({
          classId: cId || undefined,
          sectionId: sId || undefined,
          search: search?.trim() || undefined,
          limit: 30,
        });
        const items = fRes?.data?.data?.items || fRes?.data?.data || [];
        setStudentsList(items);
      }
    } catch (err) {
      console.error('Failed to search students for certificate:', err);
      setStudentsList([]);
    } finally {
      setSearching(false);
    }
  };

  const handleClassChange = (newClassId) => {
    setSelectedClassId(newClassId);
    setSelectedSectionId('');
    loadStudents(newClassId, '', studentSearchText);
  };

  const handleSectionChange = (newSectionId) => {
    setSelectedSectionId(newSectionId);
    loadStudents(selectedClassId, newSectionId, studentSearchText);
  };

  const handleSearchChange = (val) => {
    setStudentSearchText(val);
    loadStudents(selectedClassId, selectedSectionId, val);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    if (student) {
      const currentYear = new Date().getFullYear();
      const adm = student.admissionNo || student.studentId || student.id || '001';
      const cleanAdm = String(adm).replace(/[^a-zA-Z0-9]/g, '');
      const prefix = defaultTemplate.refPrefix || 'DPS/BC';
      setRefNo(`${prefix}/${currentYear}/${cleanAdm}`);
    } else {
      setRefNo('');
    }
  };

  const handleGenerate = () => {
    if (!selectedStudent) return;

    const certOptions = {
      refNo:
        refNo.trim() ||
        `${defaultTemplate.refPrefix}/${new Date().getFullYear()}/${selectedStudent.admissionNo || '001'}`,
      issueDate: issueDate || dayjs().format('DD-MMM-YYYY'),
      purpose: customPurpose.trim() || purpose || defaultTemplate.defaultPurpose,
      printWithLetterhead,
    };

    if (onIssueSuccess) {
      onIssueSuccess(selectedStudent, certOptions);
    }
    onClose();
  };

  // Student details display helpers
  const sName =
    selectedStudent?.fullName ||
    selectedStudent?.studentName ||
    `${selectedStudent?.firstName || ''} ${selectedStudent?.lastName || ''}`.trim() ||
    'Student';

  const fName =
    selectedStudent?.fatherName ||
    selectedStudent?.guardians?.find((g) => g.relation === 'Father')?.fullName ||
    selectedStudent?.parentName ||
    '—';

  const mName =
    selectedStudent?.motherName ||
    selectedStudent?.guardians?.find((g) => g.relation === 'Mother')?.fullName ||
    '—';

  const cls = selectedStudent?.className || selectedStudent?.currentEnrollment?.className || 'N/A';
  const sec = selectedStudent?.sectionName || selectedStudent?.currentEnrollment?.sectionName || '';
  const roll = selectedStudent?.rollNo || selectedStudent?.currentEnrollment?.rollNo || '';
  const admNo = selectedStudent?.admissionNo || 'N/A';
  const dobFormatted = selectedStudent?.dob
    ? dayjs(selectedStudent.dob).format('DD MMM YYYY')
    : 'N/A';
  const dobWords = selectedStudent?.dob ? dateToWords(selectedStudent.dob) : 'N/A';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        },
      }}
    >
      {/* Dark Slate Modal Header (matching Gate Pass) */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#0f172a',
          color: '#ffffff',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: themeColor, width: 36, height: 36 }}>
            <VerifiedIcon sx={{ color: '#ffffff', fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Issue {defaultTemplate.shortTitle || defaultTemplate.certificateTitle}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Statutory Code: <strong style={{ color: '#38bdf8' }}>{defaultTemplate.refPrefix}</strong> • Institutional Register
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={defaultTemplate.refPrefix}
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontWeight: 800,
              fontFamily: 'monospace',
            }}
          />
          <IconButton
            onClick={onClose}
            sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: { xs: 2, sm: 3 },
          overflowY: 'auto',
          bgcolor: '#f8fafc',
        }}
      >
        <Stack spacing={3}>
          {/* STEP 1: SELECT STUDENT */}
          <Box
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={800}
              color="#0f172a"
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PersonIcon sx={{ color: themeColor, fontSize: 20 }} /> 1. Select Student for Certificate
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter Class"
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter Section"
                  value={selectedSectionId}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  disabled={!selectedClassId || sections.length === 0}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {sections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  size="small"
                  options={studentsList}
                  getOptionLabel={(option) => {
                    if (!option) return '';
                    const name = option.fullName || option.studentName || 'Student';
                    const adm = option.admissionNo || 'No Adm';
                    const c = option.className || '';
                    const s = option.sectionName ? `(${option.sectionName})` : '';
                    const r = option.rollNo ? `Roll: ${option.rollNo}` : '';
                    return `${name} | Adm: ${adm} | ${c} ${s} ${r}`.trim();
                  }}
                  value={selectedStudent}
                  onChange={(_, newValue) => handleStudentSelect(newValue)}
                  isOptionEqualToValue={(option, val) =>
                    (option.studentId || option.id) === (val.studentId || val.id)
                  }
                  loading={searching}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search & Select Student"
                      placeholder="Type student name, admission no, or roll..."
                      onChange={(e) => handleSearchChange(e.target.value)}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {searching ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>

            {/* Selected Student Profile Preview Card */}
            {selectedStudent ? (
              <Box
                sx={{
                  mt: 2.5,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="#0369a1"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase' }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 16 }} /> Verified Student Profile
                  </Typography>

                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => handleStudentSelect(null)}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0.5 }}
                  >
                    Change Student
                  </Button>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Avatar
                    src={selectedStudent.photoUrl || selectedStudent.photo}
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: themeColor,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                  >
                    {sName.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1, width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        {sName}
                      </Typography>
                      <Chip label={`Adm: ${admNo}`} size="small" color="primary" sx={{ fontWeight: 700, height: 22 }} />
                      {roll && <Chip label={`Roll: ${roll}`} size="small" variant="outlined" sx={{ height: 22 }} />}
                      <Chip label={`Class: ${cls} ${sec ? `- ${sec}` : ''}`} size="small" color="success" sx={{ fontWeight: 700, height: 22 }} />
                    </Stack>

                    <Grid container spacing={1} sx={{ fontSize: '0.8rem', color: '#475569' }}>
                      <Grid item xs={12} sm={6}>
                        Father: <strong style={{ color: '#0f172a' }}>{fName}</strong>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        Mother: <strong style={{ color: '#0f172a' }}>{mName}</strong>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        Date of Birth: <strong style={{ color: '#0f172a' }}>{dobFormatted}</strong>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        DOB in Words: <strong style={{ color: '#0f172a' }}>{dobWords}</strong>
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                Please search by name, admission no, or roll number above to select a student.
              </Alert>
            )}
          </Box>

          {/* STEP 2: CERTIFICATE DISPATCH & PARAMETERS */}
          <Box
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={800}
              color="#0f172a"
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <DocumentIcon sx={{ color: themeColor, fontSize: 20 }} /> 2. Certificate Particulars & Dispatch Ref
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Dispatch Ref No"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder={`e.g. ${defaultTemplate.refPrefix}/2026/0418`}
                  inputProps={{ style: { fontFamily: 'monospace', fontWeight: 700 } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date of Issue"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  placeholder="DD-MMM-YYYY"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                    px: 1,
                    border: '1px solid #e2e8f0',
                    borderRadius: 1,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={printWithLetterhead}
                        onChange={(e) => setPrintWithLetterhead(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={600} color="#334155">
                        {printWithLetterhead ? 'Letterhead Active' : 'Plain Paper'}
                      </Typography>
                    }
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Certificate Purpose / Reason"
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                    setCustomPurpose('');
                  }}
                >
                  {PURPOSE_OPTIONS.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Custom Purpose (Optional)"
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="e.g. College Admission / Scholarship"
                />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          px: 3,
          bgcolor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          justifyContent: 'space-between',
        }}
      >
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ fontWeight: 600 }}>
          Cancel
        </Button>

        <Button
          onClick={handleGenerate}
          variant="contained"
          startIcon={<PrintIcon />}
          disabled={!selectedStudent}
          sx={{
            fontWeight: 700,
            px: 3,
            bgcolor: themeColor,
            boxShadow: `0 4px 12px ${themeColor}40`,
            '&:hover': {
              bgcolor: themeColor,
              filter: 'brightness(0.9)',
            },
          }}
        >
          Generate & Issue Certificate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IssueCertificateModal;
