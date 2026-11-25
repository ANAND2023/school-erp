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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Verified as VerifiedIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  WorkspacePremium as AwardIcon,
  Description as DocumentIcon,
  School as SchoolIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { certificateApi } from '../api';
import { classesApi } from '../../masters/api';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { useThemeStore, shadeColor } from '../../../store/themeStore';
import { BonafideCertificateModal } from '../components/BonafideCertificateModal';
import { IssueCertificateModal } from '../components/IssueCertificateModal';

const CERT_CONFIGS = {
  bonafide: {
    id: 'bonafide',
    title: 'Bonafide Certificate',
    shortTitle: 'Bonafide Certificate',
    badge: 'DPS/BC',
    path: '/certificates/bonafide',
    subtitle: 'Generate and reprint officially verified bonafide student certificates verifying institutional enrollment and session.',
    themeColor: '#0284c7',
    lighterColor: '#f0f9ff',
    borderColor: '#bae6fd',
    icon: VerifiedIcon,
  },
  birth: {
    id: 'birth',
    title: 'Date of Birth (DOB) Certificate',
    shortTitle: 'Date of Birth Certificate',
    badge: 'DPS/DOB',
    path: '/certificates/birth',
    subtitle: 'Extract and issue certified Date of Birth certificates directly from official school admission register records.',
    themeColor: '#0f766e',
    lighterColor: '#f0fdfa',
    borderColor: '#99f6e4',
    icon: CalendarIcon,
  },
  age: {
    id: 'age',
    title: 'Certificate of Age',
    shortTitle: 'Certificate of Age',
    badge: 'DPS/AGE',
    path: '/certificates/age',
    subtitle: 'Generate verified age certificates showing student exact calculated age as of reference date from institutional records.',
    themeColor: '#b45309',
    lighterColor: '#fffbeb',
    borderColor: '#fde68a',
    icon: TimeIcon,
  },
  character: {
    id: 'character',
    title: 'Character & Conduct Certificate',
    shortTitle: 'Character Certificate',
    badge: 'DPS/CC',
    path: '/certificates/character',
    subtitle: 'Issue certified moral character, obedience, exemplary discipline, and academic conduct certificates.',
    themeColor: '#831843',
    lighterColor: '#fff1f2',
    borderColor: '#fecdd3',
    icon: AwardIcon,
  },
  ret: {
    id: 'ret',
    title: 'RET Certificate',
    shortTitle: 'RET Certificate',
    badge: 'DPS/RET',
    path: '/certificates/ret',
    subtitle: 'Generate verified record of education, examination results, academic performance, and retention status.',
    themeColor: '#581c87',
    lighterColor: '#faf5ff',
    borderColor: '#e9d5ff',
    icon: DocumentIcon,
  },
};

const CERT_TABS = [
  { id: 'bonafide', label: 'Bonafide Certificate', badge: 'DPS/BC' },
  { id: 'birth', label: 'Date of Birth Certificate', badge: 'DPS/DOB' },
  { id: 'age', label: 'Certificate of Age', badge: 'DPS/AGE' },
  { id: 'character', label: 'Character Certificate', badge: 'DPS/CC' },
  { id: 'ret', label: 'RET Certificate', badge: 'DPS/RET' },
];

export const BonafideCertificatesPage = ({ defaultType = 'bonafide' }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useAcademicYear();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const themeColor = currentColorHex || '#0284c7';
  const themeDarker = shadeColor(themeColor, -20);
  const themeLighterBg = isDarkMode ? 'rgba(255,255,255,0.04)' : `${themeColor}0d`;
  const themeBorder = isDarkMode ? 'rgba(255,255,255,0.12)' : `${themeColor}30`;

  const [activeCertType, setActiveCertType] = useState(defaultType);

  // Filters matching StudentGatePassPage
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // 'Today' or 'All'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedStudentForPrint, setSelectedStudentForPrint] = useState(null);
  const [customCertOptions, setCustomCertOptions] = useState(null);
  const [bannerNotice, setBannerNotice] = useState(null);

  useEffect(() => {
    setActiveCertType(defaultType);
  }, [defaultType]);

  const activeMeta = CERT_CONFIGS[activeCertType] || CERT_CONFIGS.bonafide;
  const ActiveIcon = activeMeta.icon;

  // Fetch classes
  const { data: classesRes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesApi.getClasses(),
  });
  const classes = classesRes?.data?.data || [];
  const selectedClass = classes.find((c) => String(c.id) === String(classId));
  const sections = selectedClass?.sections || [];

  // Fetch Stats
  const { data: statsRes, refetch: refetchStats } = useQuery({
    queryKey: ['certificate-stats', activeCertType],
    queryFn: () => certificateApi.getStats({ certificateType: activeCertType }),
  });
  const stats = statsRes?.data?.data || {
    totalIssued: 0,
    issuedToday: 0,
    bonafideCount: 0,
    dobCount: 0,
    ageCount: 0,
    characterCount: 0,
    retCount: 0,
  };

  // Build query params
  const fromDate = dateFilter === 'Today' ? dayjs().startOf('day').toISOString() : undefined;
  const toDate = dateFilter === 'Today' ? dayjs().endOf('day').toISOString() : undefined;

  // Fetch Issued Certificates List
  const {
    data: certificatesRes,
    isLoading,
    isFetching,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      'certificates-list',
      activeCertType,
      search,
      classId,
      sectionId,
      status,
      dateFilter,
      page,
      rowsPerPage,
    ],
    queryFn: () =>
      certificateApi.getCertificates({
        certificateType: activeCertType,
        search: search || undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        status: status !== 'All' ? status : undefined,
        fromDate,
        toDate,
        pageNo: page + 1,
        pageSize: rowsPerPage,
      }),
  });

  const pagedData = certificatesRes?.data?.data;
  const items = pagedData?.items || [];
  const totalCount = pagedData?.totalCount || 0;

  // Create Certificate Mutation
  const createCertMutation = useMutation({
    mutationFn: (data) => certificateApi.createCertificate(data),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['certificates-list'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });

      const newCert = res?.data?.data;
      setBannerNotice({
        type: 'success',
        text: `Certificate #${newCert?.certificateNo || variables.certificateNo} issued successfully!`,
      });

      // Automatically open the printable slip/certificate
      if (newCert) {
        setSelectedStudentForPrint({
          studentId: newCert.studentId,
          studentName: newCert.studentName,
          admissionNo: newCert.admissionNo,
          rollNo: newCert.rollNo,
          className: newCert.className,
          sectionName: newCert.sectionName,
          dob: newCert.dob,
          fatherName: newCert.fatherName,
          motherName: newCert.motherName,
          photoUrl: newCert.photoUrl,
        });
        setCustomCertOptions({
          refNo: newCert.certificateNo,
          issueDate: dayjs(newCert.issueDate).format('DD-MMM-YYYY'),
          purpose: newCert.purpose,
          printWithLetterhead: true,
        });
        setPrintModalOpen(true);
      }
    },
    onError: (err) => {
      setBannerNotice({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to issue certificate.',
      });
    },
  });

  // Delete/Revoke Certificate Mutation
  const deleteCertMutation = useMutation({
    mutationFn: (id) => certificateApi.deleteCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates-list'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      setBannerNotice({ type: 'info', text: 'Certificate cancelled successfully.' });
    },
  });

  const handleIssueSuccess = (student, certOptions) => {
    setIssueModalOpen(false);

    createCertMutation.mutate({
      studentId: student.studentId || student.id,
      certificateType: activeCertType,
      certificateNo: certOptions.refNo,
      issueDate: dayjs().toISOString(),
      purpose: certOptions.purpose,
      issuedBy: 'Principal / Authorized Signatory',
      optionsJson: JSON.stringify(certOptions),
    });
  };

  const handleOpenPrintForExisting = (row) => {
    setSelectedStudentForPrint({
      studentId: row.studentId,
      studentName: row.studentName,
      admissionNo: row.admissionNo,
      rollNo: row.rollNo,
      className: row.className,
      sectionName: row.sectionName,
      dob: row.dob,
      fatherName: row.fatherName,
      motherName: row.motherName,
      photoUrl: row.photoUrl,
    });
    setCustomCertOptions({
      refNo: row.certificateNo,
      issueDate: dayjs(row.issueDate).format('DD-MMM-YYYY'),
      purpose: row.purpose,
      printWithLetterhead: true,
    });
    setPrintModalOpen(true);
  };

  const handleTabChange = (typeId) => {
    setActiveCertType(typeId);
    setPage(0);
    navigate(`/certificates/${typeId}`);
  };

  return (
    <Box sx={{ pb: 2 }}>
      {/* Top Banner Notice */}
      {bannerNotice && (
        <Alert
          severity={bannerNotice.type}
          sx={{ mb: 1.5 }}
          onClose={() => setBannerNotice(null)}
        >
          {bannerNotice.text}
        </Alert>
      )}

      {/* Certificate Navigation Tabs */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          mb: 1.5,
          overflowX: 'auto',
          pb: 0.5,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {CERT_TABS.map((tab) => {
          const isSelected = activeCertType === tab.id;
          return (
            <Button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              variant={isSelected ? 'contained' : 'outlined'}
              size="small"
              sx={{
                borderRadius: 1.5,
                px: 1.5,
                py: 0.5,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                bgcolor: isSelected ? themeColor : 'transparent',
                borderColor: isSelected ? themeColor : '#cbd5e1',
                color: isSelected ? '#ffffff' : '#475569',
                boxShadow: isSelected ? `0 2px 8px ${themeColor}35` : 'none',
                '&:hover': {
                  bgcolor: isSelected ? themeDarker : isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                  borderColor: isSelected ? themeDarker : themeColor,
                },
                flexShrink: 0,
              }}
            >
              {tab.label}
              <Chip
                label={tab.badge}
                size="small"
                sx={{
                  ml: 1,
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: isSelected ? '#ffffff' : '#334155',
                }}
              />
            </Button>
          );
        })}
      </Stack>

      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={800}
            color={isDarkMode ? '#f8fafc' : '#0f172a'}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.2, fontSize: { xs: '1.15rem', sm: '1.25rem' } }}
          >
            <ActiveIcon sx={{ color: themeColor, fontSize: 28 }} />
            {activeMeta.title} Register
          </Typography>
          <Typography variant="body2" color={isDarkMode ? '#94a3b8' : '#64748b'} sx={{ mt: 0.25, fontSize: '0.8rem' }}>
            {activeMeta.subtitle}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={() => setIssueModalOpen(true)}
          sx={{
            fontWeight: 700,
            fontSize: '0.82rem',
            px: 2,
            py: 0.7,
            borderRadius: 1.75,
            bgcolor: themeColor,
            boxShadow: `0 3px 10px ${themeColor}35`,
            textTransform: 'none',
            '&:hover': {
              bgcolor: themeDarker,
            },
          }}
        >
          Issue New {activeMeta.shortTitle}
        </Button>
      </Stack>

      {/* Stats Summary Cards (matched scaling with StudentGatePassPage) */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: themeLighterBg,
              border: `1px solid ${themeBorder}`,
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ color: themeColor, fontSize: '0.68rem', letterSpacing: '0.5px' }}
                    textTransform="uppercase"
                  >
                    Issued Today
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color={isDarkMode ? '#f8fafc' : '#0f172a'}
                    sx={{ mt: 0.25, fontSize: '1.45rem', lineHeight: 1.2 }}
                  >
                    {stats.issuedToday}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: themeColor, width: 38, height: 38 }}>
                  <ActiveIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f0f9ff',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #bae6fd',
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="#0369a1"
                    sx={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
                    textTransform="uppercase"
                  >
                    Total Issued
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="#0c4a6e"
                    sx={{ mt: 0.25, fontSize: '1.45rem', lineHeight: 1.2 }}
                  >
                    {stats.totalIssued}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#38bdf8', width: 38, height: 38 }}>
                  <VerifiedIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="#475569"
                    sx={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
                    textTransform="uppercase"
                  >
                    Statutory Code
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{ color: themeColor, mt: 0.25, fontSize: '1.15rem', fontFamily: 'monospace', lineHeight: 1.2 }}
                  >
                    {activeMeta.badge}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#cbd5e1', width: 38, height: 38 }}>
                  <DocumentIcon sx={{ color: '#334155', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f0fdf4',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #bbf7d0',
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="#15803d"
                    sx={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
                    textTransform="uppercase"
                  >
                    Academic Session
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    color="#14532d"
                    sx={{ mt: 0.25, fontSize: '1.05rem', lineHeight: 1.2 }}
                  >
                    {activeAcademicYear?.name || 'Active Session'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4ade80', width: 38, height: 38 }}>
                  <SchoolIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar Card (matched scaling with StudentGatePassPage) */}
      <Card sx={{ mb: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Search Certificate"
                placeholder="Student, Adm No, Ref No..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />
                  ),
                }}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Class"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Section"
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setPage(0);
                }}
                disabled={!classId}
              >
                <MenuItem value="">All Sections</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Issued">Issued</MenuItem>
                <MenuItem value="Valid">Valid</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Date Range"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="All">All History</MenuItem>
                <MenuItem value="Today">Today Only</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={1} textAlign="right">
              <Tooltip title="Refresh List">
                <IconButton
                  onClick={() => {
                    refetchList();
                    refetchStats();
                  }}
                  sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Table Card (matched scaling with StudentGatePassPage) */}
      <Paper sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 700 }} size="small">
            <TableHead sx={{ bgcolor: isDarkMode ? '#1e293b' : '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#334155', py: 1, fontSize: '0.78rem' }}>
                  Certificate Ref No & Date
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#334155', py: 1, fontSize: '0.78rem' }}>
                  Student Details
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#334155', py: 1, fontSize: '0.78rem' }}>
                  Parent / Guardian Details
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#334155', py: 1, fontSize: '0.78rem' }}>
                  Purpose / Reason
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#334155', py: 1, fontSize: '0.78rem' }}>
                  Status
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#334155', py: 1, fontSize: '0.78rem' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading || isFetching ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="#64748b" sx={{ mt: 1 }}>
                      Loading issued certificates...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <ActiveIcon sx={{ fontSize: 44, color: '#cbd5e1', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#475569">
                      No {activeMeta.shortTitle} Records Found
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 2, fontSize: '0.8rem' }}>
                      No certificates match your active filters in this academic session.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setIssueModalOpen(true)}
                      sx={{
                        borderColor: themeColor,
                        color: themeColor,
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: themeColor,
                          bgcolor: themeLighterBg,
                        },
                      }}
                    >
                      Issue First {activeMeta.shortTitle}
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    {/* Column 1: Ref No & Date */}
                    <TableCell>
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color={themeColor}
                        sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                      >
                        {row.certificateNo}
                      </Typography>
                      <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.72rem' }}>
                        Issued on: {dayjs(row.issueDate).format('DD MMM YYYY')}
                      </Typography>
                    </TableCell>

                    {/* Column 2: Student Details */}
                    <TableCell>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Avatar
                          src={row.photoUrl}
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: themeColor,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          {row.studentName?.charAt(0) || 'S'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color={isDarkMode ? '#f8fafc' : '#0f172a'} sx={{ fontSize: '0.82rem' }}>
                            {row.studentName}
                          </Typography>
                          <Typography variant="caption" color="#64748b" display="block" sx={{ fontSize: '0.72rem' }}>
                            Adm: <strong>{row.admissionNo}</strong> | {row.className}{' '}
                            {row.sectionName ? `(${row.sectionName})` : ''}
                            {row.rollNo ? ` | Roll: ${row.rollNo}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Column 3: Parent / Guardian */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color={isDarkMode ? '#e2e8f0' : '#334155'} sx={{ fontSize: '0.8rem' }}>
                        {row.fatherName || '—'}
                      </Typography>
                      <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.72rem' }}>
                        {row.fatherMobile || row.emergencyContact || '—'}
                      </Typography>
                    </TableCell>

                    {/* Column 4: Purpose */}
                    <TableCell>
                      <Typography variant="body2" color={isDarkMode ? '#cbd5e1' : '#334155'} fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                        {row.purpose || 'Official Verification'}
                      </Typography>
                    </TableCell>

                    {/* Column 5: Status */}
                    <TableCell>
                      <Chip
                        label={row.status || 'Issued'}
                        size="small"
                        color={
                          row.status === 'Cancelled'
                            ? 'error'
                            : row.status === 'Valid'
                            ? 'success'
                            : 'info'
                        }
                        variant={row.status === 'Issued' ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>

                    {/* Column 6: Actions */}
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Print / View Certificate">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PrintIcon sx={{ fontSize: 15 }} />}
                            onClick={() => handleOpenPrintForExisting(row)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              py: 0.25,
                              px: 1,
                              borderColor: themeColor,
                              color: themeColor,
                              '&:hover': {
                                bgcolor: themeLighterBg,
                                borderColor: themeColor,
                              },
                            }}
                          >
                            Print
                          </Button>
                        </Tooltip>

                        {row.status !== 'Cancelled' && (
                          <Tooltip title="Cancel / Revoke Certificate">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to cancel certificate ${row.certificateNo}?`
                                  )
                                ) {
                                  deleteCertMutation.mutate(row.id);
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Table Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Modal: Issue Certificate (Student Selection & Parameters) */}
      <IssueCertificateModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        certificateType={activeCertType}
        classes={classes}
        onIssueSuccess={handleIssueSuccess}
      />

      {/* Modal: View & Print Certificate */}
      {printModalOpen && selectedStudentForPrint && (
        <BonafideCertificateModal
          open={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedStudentForPrint(null);
            setCustomCertOptions(null);
          }}
          studentData={selectedStudentForPrint}
          certificateType={activeCertType}
          customOptions={customCertOptions}
          initialRefNo={customCertOptions?.refNo}
          initialPurpose={customCertOptions?.purpose}
          initialDate={customCertOptions?.issueDate}
          initialPrintWithLetterhead={customCertOptions?.printWithLetterhead}
        />
      )}
    </Box>
  );
};

export default BonafideCertificatesPage;
