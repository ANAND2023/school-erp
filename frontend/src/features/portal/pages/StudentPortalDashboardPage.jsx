import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Alert,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  School as StudentIcon,
  EventAvailable as AttendanceIcon,
  AccountBalanceWallet as FeesIcon,
  MenuBook as ExamIcon,
  Schedule as TimetableIcon,
  Notifications as NoticeIcon,
  ReceiptLong as ReceiptIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Call as PhoneIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as AbsentIcon,
  AutoAwesome as AiIcon,
  LocalLibrary as NcertIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  ArrowForward as ArrowIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { downloadElementAsPdf, printWithTitle } from '../../../utils/printUtils';
import { portalApi } from '../api';
import { StudentAiChatTab } from '../components/StudentAiChatTab';
import { StudentNcertReaderTab } from '../components/StudentNcertReaderTab';
import { CceProgressReportCardSlip } from '../../exams/components/CceProgressReportCardSlip';
import FeeReceiptSlip from '../../fees/components/FeeReceiptSlip';

export const StudentPortalDashboardPage = () => {
  const { user } = useAuthStore();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const primaryColor = currentColorHex || '#0a387c';
  const { activeAcademicYearId, activeAcademicYearName } = useAcademicYear();

  const [wards, setWards] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);

  // Tab 3: Exams & Report Cards states
  const [examsList, setExamsList] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [reportCardDialog, setReportCardDialog] = useState({
    open: false,
    loading: false,
    title: '',
    data: null,
    isCce: false
  });

  // Tab 4: Fee Slip states
  const [feeSlipDialog, setFeeSlipDialog] = useState({
    open: false,
    loading: false,
    data: null
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const resolveTab = (param) => {
    if (!param) return 0;
    switch (param) {
      case 'attendance': return 1;
      case 'timetable': return 2;
      case 'exams': return 3;
      case 'fees': return 4;
      case 'notices': return 5;
      case 'ncert': return 6;
      case 'ai-tutor': return 7;
      default: return !isNaN(Number(param)) ? Number(param) : 0;
    }
  };

  const initialTab = resolveTab(tabParam);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(resolveTab(tabParam));
    }
  }, [tabParam]);

  const handleTabChange = (_, val) => {
    setActiveTab(val);
    const tabKeys = ['overview', 'attendance', 'timetable', 'exams', 'fees', 'notices', 'ncert', 'ai-tutor'];
    setSearchParams({ tab: tabKeys[val] || String(val) });
  };

  const isParent = user?.userType === 6;

  // 1. Initial Load: wards (children) for parents, or self for student
  useEffect(() => {
    loadWards();
  }, []);

  // 2. Reactivity to Academic Session (Year) change!
  useEffect(() => {
    if (selectedStudentId) {
      loadDashboard(selectedStudentId);
      loadExamsData(selectedStudentId);
    }
  }, [activeAcademicYearId]);

  // Also listen to window event 'academicYearChanged'
  useEffect(() => {
    const handleYearChange = () => {
      if (selectedStudentId) {
        loadDashboard(selectedStudentId);
        loadExamsData(selectedStudentId);
      }
    };
    window.addEventListener('academicYearChanged', handleYearChange);
    return () => window.removeEventListener('academicYearChanged', handleYearChange);
  }, [selectedStudentId]);

  // When activeTab changes to Exams (3), fetch exams data if not loaded
  useEffect(() => {
    if (activeTab === 3 && selectedStudentId) {
      loadExamsData(selectedStudentId);
    }
  }, [activeTab, selectedStudentId]);

  const loadWards = async () => {
    try {
      const res = await portalApi.getWards();
      const list = res.data?.data || [];
      setWards(list);
      if (list.length > 0) {
        setSelectedStudentId(list[0].id);
        loadDashboard(list[0].id);
        loadExamsData(list[0].id);
      } else {
        loadDashboard(null);
      }
    } catch (err) {
      console.error(err);
      loadDashboard(null);
    }
  };

  const loadDashboard = async (sId) => {
    setLoading(true);
    try {
      const res = await portalApi.getDashboard(sId);
      setPortalData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching portal dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExamsData = async (sId) => {
    if (!sId) return;
    setLoadingExams(true);
    try {
      const res = await portalApi.getExams(sId);
      setExamsList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching exams', err);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleStudentChange = (e) => {
    const sId = e.target.value;
    setSelectedStudentId(sId);
    loadDashboard(sId);
    loadExamsData(sId);
  };

  // Report Card Modal Handlers
  const handleOpenReportCard = async (examId = null, title = 'Annual CCE Progress Report Card') => {
    setReportCardDialog({
      open: true,
      loading: true,
      title,
      data: null,
      isCce: !examId
    });

    try {
      const res = await portalApi.getReportCard(selectedStudentId, examId);
      const cardData = res.data?.data || null;
      setReportCardDialog((prev) => ({
        ...prev,
        loading: false,
        data: cardData,
        isCce: !examId || Boolean(cardData?.terms || cardData?.Terms)
      }));
    } catch (err) {
      console.error('Error fetching report card', err);
      setReportCardDialog((prev) => ({
        ...prev,
        loading: false,
        data: null
      }));
    }
  };

  const handleCloseReportCard = () => {
    setReportCardDialog({ open: false, loading: false, title: '', data: null, isCce: false });
  };

  // Fee Slip Modal Handlers
  const handleOpenFeeSlip = async (receiptId) => {
    setFeeSlipDialog({
      open: true,
      loading: true,
      data: null
    });

    try {
      const res = await portalApi.getReceiptPrint(receiptId, selectedStudentId);
      setFeeSlipDialog({
        open: true,
        loading: false,
        data: res.data?.data || null
      });
    } catch (err) {
      console.error('Error fetching fee receipt', err);
      setFeeSlipDialog({
        open: true,
        loading: false,
        data: null
      });
    }
  };

  const handleCloseFeeSlip = () => {
    setFeeSlipDialog({ open: false, loading: false, data: null });
  };

  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingFeeSlip, setDownloadingFeeSlip] = useState(false);

  const handleDownloadReportPdf = async () => {
    try {
      setDownloadingReport(true);
      const fileName = `${student?.fullName || 'Student'}_Report_Card_${activeAcademicYearName || '2026-27'}`;
      await downloadElementAsPdf('report-card-print-page', fileName);
    } catch (err) {
      console.error('Error downloading report card PDF:', err);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDownloadFeeSlipPdf = async () => {
    try {
      setDownloadingFeeSlip(true);
      const fileName = `Fee_Receipt_${feeSlipDialog.data?.receiptNo || 'Slip'}`;
      await downloadElementAsPdf('fee-receipt-print-area', fileName);
    } catch (err) {
      console.error('Error downloading fee slip PDF:', err);
    } finally {
      setDownloadingFeeSlip(false);
    }
  };

  const student = portalData?.student || {};
  const attendance = portalData?.attendance || { percentage: 0, totalMarked: 0, present: 0, absent: 0, leave: 0 };
  const fees = portalData?.fees || { totalFee: 0, totalPaid: 0, totalPending: 0, pendingDues: [], recentReceipts: [] };
  const upcomingExams = portalData?.upcomingExams || [];
  const recentMarks = portalData?.recentMarks || [];
  const timetable = portalData?.todayTimetable || [];
  const notices = portalData?.notices || [];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', minHeight: '100vh' }}>
      
      {/* Top Banner & Multi-Child Switcher for Parents */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryColor} 0%, #071834 100%)`,
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(10, 56, 124, 0.3)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={student?.photoUrl}
            sx={{
              width: { xs: 58, sm: 72 },
              height: { xs: 58, sm: 72 },
              border: '3px solid #ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              bgcolor: '#ffb000',
              fontSize: '1.8rem',
              fontWeight: 800
            }}
          >
            {student?.fullName ? student.fullName.charAt(0) : 'S'}
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
              <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.01em' }}>
                {student?.fullName || user?.fullName || 'Student Portal'}
              </Typography>
              <Chip
                label={isParent ? "Parent Portal" : "Student Portal"}
                size="small"
                sx={{ bgcolor: 'rgba(255, 176, 0, 0.25)', color: '#ffd47e', fontWeight: 800, border: '1px solid #ffb000' }}
              />
              <Chip
                label={activeAcademicYearName ? `Session: ${activeAcademicYearName}` : "Session: 2026-27"}
                size="small"
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Adm No: <strong>{student?.admissionNo || '—'}</strong> • Class: <strong>{student?.className} ({student?.sectionName})</strong> • Roll No: <strong>{student?.rollNo || '—'}</strong>
            </Typography>
          </Box>
        </Box>

        {/* Multi-Child Selector for Parents */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          {isParent && wards.length > 1 && (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.12)', p: 1, borderRadius: 2, minWidth: 240 }}>
              <FormControl fullWidth size="small" variant="standard" sx={{ '& .MuiInputBase-root': { color: '#ffffff' } }}>
                <InputLabel sx={{ color: '#ffd47e', fontWeight: 700 }}>Select Ward (Child)</InputLabel>
                <Select
                  value={selectedStudentId || ''}
                  onChange={handleStudentChange}
                  sx={{ color: '#ffffff', '& .MuiSvgIcon-root': { color: '#ffffff' } }}
                >
                  {wards.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.fullName} — {w.className} ({w.sectionName})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          <Tooltip title="Refresh Session Data">
            <IconButton
              onClick={() => {
                loadDashboard(selectedStudentId);
                loadExamsData(selectedStudentId);
              }}
              sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.12)' }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Metric KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Attendance Summary */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid #e2e8f0', bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    Attendance Rate
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color={attendance.percentage >= 75 ? "#10b981" : "#ef4444"} sx={{ my: 0.5 }}>
                    {attendance.percentage}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {attendance.present} Present / {attendance.totalMarked} Days
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 48, height: 48 }}>
                  <AttendanceIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Fees Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid #e2e8f0', bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    Total Pending Fees
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color={fees.totalPending > 0 ? "#f59e0b" : "#10b981"} sx={{ my: 0.5 }}>
                    ₹ {Number(fees.totalPending || 0).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Paid: ₹ {Number(fees.totalPaid || 0).toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fffbeb', color: '#f59e0b', width: 48, height: 48 }}>
                  <FeesIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Exams & Tests */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid #e2e8f0', bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    Class Exams & Tests
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color={primaryColor} sx={{ my: 0.5 }}>
                    {examsList?.length || upcomingExams?.length || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Session Papers
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#eef2ff', color: primaryColor, width: 48, height: 48 }}>
                  <ExamIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Circulars & Notices */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid #e2e8f0', bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    School Circulars
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="#6366f1" sx={{ my: 0.5 }}>
                    {notices.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Important Updates
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e0e7ff', color: '#6366f1', width: 48, height: 48 }}>
                  <NoticeIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.95rem',
              py: 2,
              minHeight: 56
            }
          }}
        >
          <Tab icon={<StudentIcon fontSize="small" />} iconPosition="start" label="Overview" />
          <Tab icon={<AttendanceIcon fontSize="small" />} iconPosition="start" label="Attendance Log" />
          <Tab icon={<TimetableIcon fontSize="small" />} iconPosition="start" label="Timetable" />
          <Tab icon={<ExamIcon fontSize="small" />} iconPosition="start" label="Exams & Report Cards" />
          <Tab icon={<FeesIcon fontSize="small" />} iconPosition="start" label="Fees & Receipts" />
          <Tab icon={<NoticeIcon fontSize="small" />} iconPosition="start" label="Notices & Circulars" />
          <Tab icon={<NcertIcon fontSize="small" />} iconPosition="start" label="NCERT Book Reader" />
          <Tab icon={<AiIcon fontSize="small" />} iconPosition="start" label="AI Study Buddy" />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

      {/* TAB 0: COMPREHENSIVE OVERVIEW */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Today's Timetable Schedule */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
              <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimetableIcon fontSize="small" /> Today's Class Timetable
              </Typography>
              {timetable.length === 0 ? (
                <Alert severity="info" sx={{ my: 2 }}>
                  No classes scheduled for today or today is a declared holiday / weekend.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Period / Timing</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Teacher</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timetable.map((t, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t.periodName || `P-${t.periodNo}`} ({t.startTime} - {t.endTime})
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{t.subject}</TableCell>
                          <TableCell>{t.teacher || 'Class Teacher'}</TableCell>
                          <TableCell>{t.roomNo || 'Room-1'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Student Profile Snapshot & Notice Board */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              {/* Profile Card */}
              <Paper sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
                <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" /> Student Identity Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.88rem' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Date of Birth:</span>
                    <strong>{student?.dateOfBirth ? String(student.dateOfBirth).split('T')[0] : '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Blood Group:</span>
                    <strong>{student?.bloodGroup || '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Emergency Phone:</span>
                    <strong>{student?.emergencyContact || '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Address:</span>
                    <strong style={{ textAlign: 'right' }}>{student?.address ? `${student.address}, ${student.city || ''}` : 'On School Record'}</strong>
                  </Box>
                </Box>
              </Paper>

              {/* Recent Circulars */}
              <Paper sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
                <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NoticeIcon fontSize="small" /> School Circulars & Notices
                </Typography>
                {notices.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No new announcements at this time.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {notices.map((n) => (
                      <Box key={n.id} sx={{ p: 1.5, bgcolor: isDarkMode ? '#334155' : '#f8fafc', borderRadius: 2, borderLeft: `4px solid ${primaryColor}` }}>
                        <Typography variant="subtitle2" fontWeight={800}>
                          {n.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                          {n.message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block' }}>
                          {new Date(n.sentAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: ATTENDANCE LOG */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color={primaryColor}>
                Monthly Attendance Breakdown & Logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cumulative Session Presence: <strong>{attendance.percentage}%</strong> ({attendance.present} Present / {attendance.absent} Absent)
              </Typography>
            </Box>
            <Chip
              icon={attendance.percentage >= 75 ? <CheckIcon /> : <AbsentIcon />}
              label={attendance.percentage >= 75 ? "CBSE Eligible (>75%)" : "Low Attendance Warning"}
              color={attendance.percentage >= 75 ? "success" : "error"}
              sx={{ fontWeight: 800 }}
            />
          </Stack>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {attendance.monthlyBreakdown?.map((m, idx) => (
              <Grid item xs={12} sm={4} md={2} key={idx}>
                <Card sx={{ p: 2, textAlign: 'center', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" fontWeight={800}>{m.month}</Typography>
                  <Typography variant="h5" fontWeight={900} color={m.percentage >= 75 ? "#10b981" : "#ef4444"} sx={{ my: 0.5 }}>
                    {m.percentage}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.present} Present / {m.total} Days
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* TAB 2: WEEKLY TIMETABLE */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
          <Typography variant="h6" fontWeight={800} color={primaryColor} sx={{ mb: 2 }}>
            Class Weekly Master Timetable (Class {student?.className} - {student?.sectionName})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Period / Timing</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Faculty Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timetable.map((t, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      Period {t.periodNo || idx + 1} ({t.startTime} - {t.endTime})
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{t.subject}</TableCell>
                    <TableCell>{t.teacher || 'Subject Teacher'}</TableCell>
                    <TableCell>{t.roomNo || 'Room 101'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* TAB 3: EXAMINATIONS & REPORT CARDS */}
      {activeTab === 3 && (
        <Stack spacing={3}>
          {/* Top Master Banner with CCE Progress Card Print Button */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2.5,
              border: `1.5px solid ${primaryColor}22`,
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={900} color={primaryColor} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ExamIcon /> Examinations & Academic Performance
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                View complete examination schedules, subject date sheets, marks obtained, and official CBSE/CCE report cards.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<DownloadIcon />}
              onClick={() => handleOpenReportCard(null, 'Annual CCE Progress Report Card')}
              sx={{
                bgcolor: primaryColor,
                color: '#ffffff',
                fontWeight: 800,
                px: 3,
                py: 1.2,
                borderRadius: 2,
                boxShadow: `0 6px 16px ${primaryColor}44`,
                '&:hover': { bgcolor: primaryColor, opacity: 0.95 }
              }}
            >
              Download CCE Report Card
            </Button>
          </Paper>

          {/* Quick Performance Summary Table (Recent Marks) */}
          {recentMarks.length > 0 && (
            <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
              <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ mb: 1.5 }}>
                Recent Marks Scored Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Exam</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Max Marks</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Marks Scored</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentMarks.map((m, idx) => {
                      const pct = m.maxMarks > 0 ? Math.round((m.marksObtained / m.maxMarks) * 100) : 0;
                      return (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{m.examName}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{m.subject}</TableCell>
                          <TableCell align="center">{m.maxMarks}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: pct >= 33 ? '#10b981' : '#ef4444' }}>
                            {m.isAbsent ? 'AB' : m.marksObtained}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {m.isAbsent ? 'Absent' : `${pct}%`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* ALL EXAMINATIONS & DETAILED SCHEDULES */}
          <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color={primaryColor}>
                  All Class Examinations & Date Sheet Schedules
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Complete list of scheduled examinations for Class {student?.className || ''} ({activeAcademicYearName || '2026-27'}).
                </Typography>
              </Box>
            </Stack>

            {loadingExams ? (
              <LinearProgress sx={{ my: 2 }} />
            ) : examsList.length === 0 ? (
              <Alert severity="info">
                No examinations registered for this class in session {activeAcademicYearName || '2026-27'}.
              </Alert>
            ) : (
              <Stack spacing={2.5}>
                {examsList.map((exam) => (
                  <Card
                    key={exam.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      border: '1.5px solid #e2e8f0',
                      bgcolor: isDarkMode ? '#1e293b' : '#fafafa'
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1.5} sx={{ mb: 2 }}>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                            <Typography variant="h6" fontWeight={900} color={primaryColor}>
                              {exam.name}
                            </Typography>
                            <Chip label={exam.termName || "Term"} size="small" sx={{ fontWeight: 700 }} />
                            {exam.isPublished ? (
                              <Chip label="Results Published" color="success" size="small" sx={{ fontWeight: 800 }} />
                            ) : exam.publishDate ? (
                              <Chip
                                label={`Result Publish: ${new Date(exam.publishDate).toLocaleDateString()}`}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <Chip label="Exam Scheduled" color="info" size="small" sx={{ fontWeight: 700 }} />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Total Papers: <strong>{exam.scheduleCount || exam.schedules?.length || 0}</strong> • Dates: <strong>{exam.minDate ? new Date(exam.minDate).toLocaleDateString() : 'TBD'}</strong> to <strong>{exam.maxDate ? new Date(exam.maxDate).toLocaleDateString() : 'TBD'}</strong>
                          </Typography>
                        </Box>

                        {/* View Report Card Button for this Exam */}
                        {exam.canViewReport && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleOpenReportCard(exam.id, `${exam.name} Marks Card / Report`)}
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          >
                            Download Report Card
                          </Button>
                        )}
                      </Stack>

                      {/* Subject Schedules Table */}
                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Timings</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Max Marks</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Pass Marks</TableCell>
                              {exam.canViewReport && (
                                <>
                                  <TableCell align="center" sx={{ fontWeight: 800 }}>Marks Scored</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 800 }}>Grade</TableCell>
                                </>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {exam.schedules?.map((s) => (
                              <TableRow key={s.id} hover>
                                <TableCell sx={{ fontWeight: 800, color: primaryColor }}>
                                  {s.subjectName} {s.subjectCode ? `(${s.subjectCode})` : ''}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
                                  {new Date(s.examDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{s.startTime || '09:00'} - {s.endTime || '12:00'}</TableCell>
                                <TableCell>{s.roomNo || 'Exam Hall'}</TableCell>
                                <TableCell align="center">{s.maxMarks}</TableCell>
                                <TableCell align="center">{s.passMarks}</TableCell>
                                {exam.canViewReport && (
                                  <>
                                    <TableCell align="center" sx={{ fontWeight: 800, color: s.marksObtained !== null && s.marksObtained !== undefined ? '#10b981' : '#64748b' }}>
                                      {s.isAbsent ? 'AB' : s.marksObtained !== null && s.marksObtained !== undefined ? s.marksObtained : '—'}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                                      {s.grade || '—'}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}

      {/* TAB 4: FEES RECEIPTS & DUES */}
      {activeTab === 4 && (
        <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color={primaryColor}>
                Student Fee Ledger & Receipts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Assigned: ₹ {Number(fees.totalFee).toLocaleString('en-IN')} • Paid: ₹ {Number(fees.totalPaid).toLocaleString('en-IN')} • Pending: ₹ {Number(fees.totalPending).toLocaleString('en-IN')}
              </Typography>
            </Box>
            {fees.totalPending > 0 && (
              <Chip label={`Due: ₹ ${Number(fees.totalPending).toLocaleString('en-IN')}`} color="warning" sx={{ fontWeight: 800 }} />
            )}
          </Stack>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, mt: 2, color: '#475569' }}>
            Fee Payment Receipts & Downloadable Slips
          </Typography>
          {fees.recentReceipts?.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              No fee receipts issued yet for this academic session.
            </Alert>
          ) : (
            <TableContainer sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Receipt No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Amount Paid</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Fee Slip (Download)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fees.recentReceipts.map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{r.receiptNo}</TableCell>
                      <TableCell>{new Date(r.receiptDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#10b981' }}>
                        ₹ {Number(r.totalPaid).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={r.status || 'Paid'} size="small" color="success" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleOpenFeeSlip(r.id)}
                          sx={{ fontWeight: 800, borderRadius: 1.5, textTransform: 'none' }}
                        >
                          Download Fee Slip
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pending Fee Installment Breakdown */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: '#475569' }}>
            Pending Fee Installments & Dues
          </Typography>
          {fees.pendingDues?.length === 0 ? (
            <Alert severity="success">
              All fees for current session are fully cleared! No pending dues.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Fee Head</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Installment</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Due Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Balance Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fees.pendingDues?.map((d, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{d.headName}</TableCell>
                      <TableCell>{d.installment}</TableCell>
                      <TableCell>{d.dueDate ? String(d.dueDate).split('T')[0] : '—'}</TableCell>
                      <TableCell align="right">₹ {Number(d.amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#ef4444' }}>
                        ₹ {Number(d.balance).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* TAB 5: NOTICES & CIRCULARS */}
      {activeTab === 5 && (
        <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
          <Typography variant="h6" fontWeight={800} color={primaryColor} sx={{ mb: 2 }}>
            Official School Notices, Circulars & Announcements
          </Typography>
          {notices.length === 0 ? (
            <Alert severity="info">
              No recent notifications on the school portal.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {notices.map((n) => (
                <Paper key={n.id} sx={{ p: 2.5, bgcolor: isDarkMode ? '#334155' : '#f8fafc', borderRadius: 2, borderLeft: `5px solid ${primaryColor}` }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {n.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: isDarkMode ? '#e2e8f0' : '#334155', lineHeight: 1.6 }}>
                    {n.message}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1.5, display: 'block', fontWeight: 600 }}>
                    Announced On: {new Date(n.sentAt).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      {/* TAB 6: NCERT BOOK READER */}
      {activeTab === 6 && (
        <StudentNcertReaderTab studentClassName={student?.className} />
      )}

      {/* TAB 7: AI STUDY BUDDY */}
      {activeTab === 7 && (
        <StudentAiChatTab student={student} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: OFFICIAL REPORT CARD VIEW & DOWNLOAD / PRINT DIALOG */}
      {/* ========================================================================= */}
      <Dialog
        open={reportCardDialog.open}
        onClose={handleCloseReportCard}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: { xs: 1, sm: 2 },
            bgcolor: '#ffffff',
            '@media print': {
              boxShadow: 'none',
              p: 0,
              m: 0,
              width: '100% !important',
              maxWidth: '100% !important'
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={900} color={primaryColor}>
              {reportCardDialog.title || 'Official Academic Report Card'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Student: {student?.fullName} ({student?.admissionNo}) • Session: {activeAcademicYearName || '2026-27'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              startIcon={downloadingReport ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadReportPdf}
              disabled={downloadingReport || !reportCardDialog.data}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              {downloadingReport ? 'Downloading...' : 'Download PDF'}
            </Button>
            <IconButton onClick={handleCloseReportCard} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 1, sm: 2 } }}>
          {reportCardDialog.loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                Generating official student performance progress card...
              </Typography>
            </Box>
          ) : !reportCardDialog.data ? (
            <Alert severity="warning" sx={{ my: 3 }}>
              Report card data could not be compiled for this examination yet. Please ensure marks are recorded and results are released.
            </Alert>
          ) : reportCardDialog.isCce ? (
            /* Full CCE Cumulative Report Card */
            <div id="report-card-print-page">
              <CceProgressReportCardSlip data={reportCardDialog.data} />
            </div>
          ) : (
            /* Single Exam Progress Card */
            <div id="report-card-print-page">
              <SingleExamReportCardSlip data={reportCardDialog.data} primaryColor={primaryColor} />
            </div>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseReportCard} sx={{ fontWeight: 700 }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={downloadingReport ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadReportPdf}
            disabled={downloadingReport || !reportCardDialog.data}
            sx={{ fontWeight: 800 }}
          >
            {downloadingReport ? 'Downloading...' : 'Download PDF'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: OFFICIAL FEE RECEIPT SLIP PRINT / VIEW DIALOG */}
      {/* ========================================================================= */}
      <Dialog
        open={feeSlipDialog.open}
        onClose={handleCloseFeeSlip}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: { xs: 1, sm: 2 },
            bgcolor: '#ffffff',
            '@media print': {
              boxShadow: 'none',
              p: 0,
              m: 0,
              width: '100% !important',
              maxWidth: '100% !important'
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={900} color={primaryColor}>
              Official Fee Receipt Slip
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Receipt No: {feeSlipDialog.data?.receiptNo || '—'} • Student: {student?.fullName} ({student?.admissionNo})
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              startIcon={downloadingFeeSlip ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadFeeSlipPdf}
              disabled={downloadingFeeSlip || !feeSlipDialog.data}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              {downloadingFeeSlip ? 'Downloading...' : 'Download Fee Slip'}
            </Button>
            <IconButton onClick={handleCloseFeeSlip} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 1, sm: 2 } }}>
          {feeSlipDialog.loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                Loading official school fee slip...
              </Typography>
            </Box>
          ) : !feeSlipDialog.data ? (
            <Alert severity="warning" sx={{ my: 3 }}>
              Fee receipt slip details not available.
            </Alert>
          ) : (
            <div id="fee-receipt-print-area">
              <FeeReceiptSlip data={feeSlipDialog.data} />
            </div>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseFeeSlip} sx={{ fontWeight: 700 }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={downloadingFeeSlip ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadFeeSlipPdf}
            disabled={downloadingFeeSlip || !feeSlipDialog.data}
            sx={{ fontWeight: 800 }}
          >
            {downloadingFeeSlip ? 'Downloading...' : 'Download Fee Slip'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/**
 * Single Exam Report Card Slip sub-component
 */
const SingleExamReportCardSlip = ({ data = {}, primaryColor = '#0a387c' }) => {
  const {
    schoolName = 'DELHI PUBLIC SCHOOL',
    affiliationNo = 'CBSE/AFF/2026/0912',
    address = 'Knowledge Park, Sector 62, Noida, UP',
    examName = 'Terminal Examination',
    academicYear = '2026-27',
    student = {},
    scholasticSubjects = [],
    totalMaxMarks = 100,
    totalObtainedMarks = 0,
    percentage = 0,
    overallGrade = 'A',
    result = 'Passed',
    coScholastic = [],
    attendance = {},
    remarks = {}
  } = data;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        bgcolor: '#ffffff',
        border: '2px solid #0f2b48',
        borderRadius: 2,
        maxWidth: 850,
        margin: '0 auto',
        fontFamily: '"Segoe UI", Roboto, Arial, sans-serif'
      }}
    >
      {/* School Header */}
      <Box sx={{ textAlign: 'center', borderBottom: '2px solid #0f2b48', pb: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight={900} sx={{ color: primaryColor, letterSpacing: '0.05em' }}>
          {schoolName.toUpperCase()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {address} • Affiliation No: {affiliationNo}
        </Typography>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 1, textTransform: 'uppercase', color: '#b45309' }}>
          OFFICIAL PERFORMANCE REPORT — {examName.toUpperCase()} ({academicYear})
        </Typography>
      </Box>

      {/* Student Details Grid */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
        <Grid container spacing={1.5} fontSize="0.88rem">
          <Grid item xs={6} sm={4}>
            <span style={{ color: '#64748b' }}>Admission No: </span>
            <strong>{student.admissionNo || '—'}</strong>
          </Grid>
          <Grid item xs={6} sm={4}>
            <span style={{ color: '#64748b' }}>Student Name: </span>
            <strong>{student.fullName || '—'}</strong>
          </Grid>
          <Grid item xs={6} sm={4}>
            <span style={{ color: '#64748b' }}>Class & Sec: </span>
            <strong>{student.className} - {student.sectionName}</strong>
          </Grid>
          <Grid item xs={6} sm={4}>
            <span style={{ color: '#64748b' }}>Roll No: </span>
            <strong>{student.rollNo || '—'}</strong>
          </Grid>
          <Grid item xs={6} sm={4}>
            <span style={{ color: '#64748b' }}>Date of Birth: </span>
            <strong>{student.dob || '—'}</strong>
          </Grid>
          <Grid item xs={6} sm={4}>
            <span style={{ color: '#64748b' }}>Father's Name: </span>
            <strong>{student.fatherName || '—'}</strong>
          </Grid>
        </Grid>
      </Paper>

      {/* Scholastic Table */}
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: primaryColor }}>
        Part 1: Scholastic Academic Areas
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2.5 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Max Marks</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Pass Marks</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Marks Scored</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Grade</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scholasticSubjects.map((sub, idx) => (
              <TableRow key={idx}>
                <TableCell sx={{ fontWeight: 700 }}>{sub.subjectName}</TableCell>
                <TableCell align="center">{sub.maxMarks}</TableCell>
                <TableCell align="center">{sub.passMarks}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: primaryColor }}>
                  {sub.marksObtained}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>{sub.grade}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 900 }}>GRAND TOTAL</TableCell>
              <TableCell align="center" sx={{ fontWeight: 900 }}>{totalMaxMarks}</TableCell>
              <TableCell align="center">—</TableCell>
              <TableCell align="center" sx={{ fontWeight: 900, color: '#10b981' }}>
                {totalObtainedMarks}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 900 }}>{overallGrade}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Result Metrics */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={4}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f0fdf4' }}>
            <Typography variant="caption" color="text.secondary">Percentage</Typography>
            <Typography variant="h6" fontWeight={900} color="#166534">{percentage}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: '#eff6ff' }}>
            <Typography variant="caption" color="text.secondary">Overall Grade</Typography>
            <Typography variant="h6" fontWeight={900} color="#1d4ed8">{overallGrade}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fefce8' }}>
            <Typography variant="caption" color="text.secondary">Final Result</Typography>
            <Typography variant="h6" fontWeight={900} color="#854d0e">{result}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Co-Scholastic & Remarks */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: primaryColor }}>
            Part 2: Co-Scholastic Activities
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Activity</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Grade</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coScholastic.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.activityName}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>{c.grade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: primaryColor }}>
            Remarks & Attendance
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, minHeight: 120, fontSize: '0.85rem' }}>
            <Box sx={{ mb: 1 }}>
              <span style={{ color: '#64748b' }}>Attendance: </span>
              <strong>{attendance.daysPresent || 198} / {attendance.totalWorkingDays || 210} Days ({attendance.percentage || 94.3}%)</strong>
            </Box>
            <Box sx={{ mb: 1 }}>
              <span style={{ color: '#64748b' }}>Class Teacher: </span>
              <span>{remarks.teacherRemarks || 'Punctual, obedient and shows consistent performance.'}</span>
            </Box>
            <Box>
              <span style={{ color: '#64748b' }}>Principal: </span>
              <span>{remarks.principalRemarks || 'Promoted to next class. Keep up the good work.'}</span>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Signature Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 4, px: 2, textAlign: 'center' }}>
        <Box>
          <Box sx={{ borderBottom: '1px solid #000', width: 140, mb: 0.5 }} />
          <Typography variant="caption" fontWeight={700}>Class Teacher</Typography>
        </Box>
        <Box>
          <Box sx={{ borderBottom: '1px solid #000', width: 140, mb: 0.5 }} />
          <Typography variant="caption" fontWeight={700}>Exam Incharge</Typography>
        </Box>
        <Box>
          <Box sx={{ borderBottom: '1px solid #000', width: 140, mb: 0.5 }} />
          <Typography variant="caption" fontWeight={700}>Principal</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default StudentPortalDashboardPage;
