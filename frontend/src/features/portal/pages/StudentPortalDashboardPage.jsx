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
  PictureAsPdf as PdfIcon,
  DirectionsBus as BusIcon,
  Badge as BadgeIcon,
  Print as PrintIcon,
  Info as InfoIcon,
  Discount as DiscountIcon,
  WarningAmber as WarningIcon,
  ContactPhone as ContactPhoneIcon,
  Assignment as HomeworkIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { useAcademicYear } from '../../../hooks/useAcademicYear';
import { downloadElementAsPdf, printWithTitle } from '../../../utils/printUtils';
import { portalApi } from '../api';
import { StudentAiChatTab } from '../components/StudentAiChatTab';
import { StudentNcertReaderTab } from '../components/StudentNcertReaderTab';
import { StudentHomeworkTab } from '../components/StudentHomeworkTab';
import { CceProgressReportCardSlip } from '../../exams/components/CceProgressReportCardSlip';
import FeeReceiptSlip from '../../fees/components/FeeReceiptSlip';
import { SingleDemandSlip } from '../../fees/components/DemandBillSlip';

export const StudentPortalDashboardPage = () => {
  const { user } = useAuthStore();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const primaryColor = currentColorHex || '#0a387c';
  const { activeAcademicYearId, activeAcademicYearName } = useAcademicYear();

  const [wards, setWards] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);

  // Safety guard: prevent accidental browser back out of portal to login
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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

  // Demand Slip Modal state
  const [demandSlipDialog, setDemandSlipDialog] = useState({
    open: false,
    loading: false,
    data: null
  });

  // ID Card Modal / Download state
  const [downloadingIdCard, setDownloadingIdCard] = useState(false);
  const [downloadingDemandSlip, setDownloadingDemandSlip] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const resolveTab = (param) => {
    if (!param) return 0;
    switch (param) {
      case 'attendance': return 1;
      case 'timetable': return 2;
      case 'homework': return 3;
      case 'exams': return 4;
      case 'fees': return 5;
      case 'id-card': return 6;
      case 'notices': return 7;
      case 'ncert': return 8;
      case 'ai-tutor': return 9;
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
    const tabKeys = ['overview', 'attendance', 'timetable', 'homework', 'exams', 'fees', 'id-card', 'notices', 'ncert', 'ai-tutor'];
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

  // When activeTab changes to Exams (4), fetch exams data if not loaded
  useEffect(() => {
    if (activeTab === 4 && selectedStudentId) {
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

  const handleDownloadDemandSlipPdf = async () => {
    try {
      setDownloadingDemandSlip(true);
      const fileName = `Demand_Slip_${student?.admissionNo || 'Bill'}`;
      await downloadElementAsPdf('demand-slip-print-area', fileName);
    } catch (err) {
      console.error('Error downloading demand slip PDF:', err);
    } finally {
      setDownloadingDemandSlip(false);
    }
  };

  const handleDownloadIdCardPdf = async () => {
    try {
      setDownloadingIdCard(true);
      const fileName = `ID_Card_${student?.fullName || 'Student'}_${student?.admissionNo || ''}`;
      await downloadElementAsPdf('id-card-print-container', fileName);
    } catch (err) {
      console.error('Error downloading ID Card PDF:', err);
    } finally {
      setDownloadingIdCard(false);
    }
  };

  const handleOpenDemandSlip = () => {
    const slipData = {
      demandBillNo: `DB-${activeAcademicYearName || '2026'}-${student?.admissionNo || student?.id || '101'}`,
      billDate: new Date().toISOString(),
      dueDate: fees?.pendingDues?.[0]?.dueDate || new Date(Date.now() + 10 * 86400000).toISOString(),
      studentName: student?.fullName || '',
      admissionNo: student?.admissionNo || '',
      rollNo: student?.rollNo || '-',
      className: student?.className || '',
      sectionName: student?.sectionName || '',
      fatherName: student?.fatherName || '',
      guardianMobile: student?.guardianPhone || student?.emergencyContact || '',
      installmentNames: fees?.pendingDues?.map(d => d.installment) || ['Term Fee Installment'],
      items: fees?.pendingDues?.map(d => ({
        feeHeadName: d.headName,
        amount: d.amount,
        balance: d.balance
      })) || [],
      grossAmount: fees?.totalFee || 0,
      concessionAmount: fees?.totalConcession || 0,
      fineAmount: fees?.fineRules?.[0]?.lateFineAmount || 0,
      netDemandAmount: fees?.totalPending || 0,
      balanceAmount: fees?.totalPending || 0,
      schoolName: portalData?.schoolInfo?.schoolName,
      address: portalData?.schoolInfo?.address,
      schoolPhone: portalData?.schoolInfo?.phone,
      schoolEmail: portalData?.schoolInfo?.email,
      logoUrl: portalData?.schoolInfo?.logoUrl
    };
    setDemandSlipDialog({ open: true, loading: false, data: slipData });
  };

  const student = portalData?.student || {};
  const schoolInfo = portalData?.schoolInfo || {};
  const classTeacher = portalData?.classTeacher || null;
  const transport = portalData?.transport || null;
  const holidays = portalData?.holidays || [];
  const attendance = portalData?.attendance || { percentage: 0, totalMarked: 0, present: 0, absent: 0, leave: 0, monthlyBreakdown: [] };
  const fees = portalData?.fees || { totalFee: 0, totalPaid: 0, totalPending: 0, totalConcession: 0, concessions: [], fineRules: [], pendingDues: [], recentReceipts: [] };
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
          <Tab icon={<HomeworkIcon fontSize="small" />} iconPosition="start" label="Class Homework" />
          <Tab icon={<ExamIcon fontSize="small" />} iconPosition="start" label="Exams & Report Cards" />
          <Tab icon={<FeesIcon fontSize="small" />} iconPosition="start" label="Fees & Receipts" />
          <Tab icon={<BadgeIcon fontSize="small" />} iconPosition="start" label="Student ID Card" />
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

            {/* Class Homework Summary Widget */}
            <Paper sx={{ mt: 3, p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HomeworkIcon fontSize="small" /> Class Homework & Worksheets
                </Typography>
                <Button
                  size="small"
                  onClick={() => handleTabChange(null, 3)}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', color: primaryColor }}
                >
                  View All &rarr;
                </Button>
              </Box>

              {(!portalData?.recentHomework || portalData.recentHomework.length === 0) ? (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  No pending homework due right now! Great job!
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  {portalData.recentHomework.map((hw) => (
                    <Box
                      key={hw.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isDarkMode ? '#334155' : '#f8fafc',
                        border: '1px solid',
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1
                      }}
                    >
                      <Box sx={{ minWidth: 180, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip size="small" label={hw.subject || 'General'} color="primary" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            Due: {hw.dueDate}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          {hw.title}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {hw.attachmentUrl && (
                          <Chip
                            size="small"
                            icon={hw.isPdf ? <PdfIcon sx={{ fontSize: '14px !important', color: '#ef4444' }} /> : <ImageIcon sx={{ fontSize: '14px !important', color: '#3b82f6' }} />}
                            label={hw.isPdf ? 'PDF' : 'Photo'}
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                          />
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleTabChange(null, 3)}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 1.5 }}
                        >
                          View Task
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Stack>
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
                    <span style={{ color: '#64748b' }}>Father's Name:</span>
                    <strong>{student?.fatherName || '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Address:</span>
                    <strong style={{ textAlign: 'right' }}>{student?.address ? `${student.address}, ${student.city || ''}` : 'On School Record'}</strong>
                  </Box>
                </Box>
              </Paper>

              {/* Class Teacher Details Widget (Item 8) */}
              <Paper sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', borderLeft: `5px solid #10b981` }}>
                <Typography variant="subtitle1" fontWeight={800} color="#10b981" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ContactPhoneIcon fontSize="small" /> Class Teacher Details
                </Typography>
                {classTeacher ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.88rem' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Name:</span>
                      <strong>{classTeacher.name}</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Contact No:</span>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: '#10b981' }} />
                        <strong>
                          {classTeacher.phone ? (
                            <a href={`tel:${classTeacher.phone}`} style={{ color: '#10b981', textDecoration: 'none' }}>
                              {classTeacher.phone}
                            </a>
                          ) : 'Not Provided'}
                        </strong>
                      </Box>
                    </Box>
                    {classTeacher.email && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Email:</span>
                        <strong>{classTeacher.email}</strong>
                      </Box>
                    )}
                    <Chip label="Class Incharge" size="small" color="success" sx={{ alignSelf: 'flex-start', mt: 0.5, fontWeight: 700 }} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Class teacher has not been assigned for this class yet.
                  </Typography>
                )}
              </Paper>

              {/* Transport & Driver Details Widget (Item 7) */}
              <Paper sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', borderLeft: `5px solid #f59e0b` }}>
                <Typography variant="subtitle1" fontWeight={800} color="#f59e0b" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusIcon fontSize="small" /> School Transport & Route Details
                </Typography>
                {transport && transport.hasTransport ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.88rem' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Route:</span>
                      <strong>{transport.routeName}</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Pickup / Drop Stop:</span>
                      <strong>{transport.stopName}</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Timings:</span>
                      <strong>Pickup: {transport.pickUpTime || '—'} | Drop: {transport.dropTime || '—'}</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Vehicle:</span>
                      <strong>{transport.vehicleNo} ({transport.vehicleType})</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Driver Name & Mobile:</span>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                        <strong>
                          {transport.driverName} {transport.driverPhone ? `(${transport.driverPhone})` : ''}
                        </strong>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Monthly Transport Fare:</span>
                      <strong style={{ color: '#10b981' }}>₹ {Number(transport.monthlyFare || 0).toLocaleString('en-IN')}/mo</strong>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      No school transport bus service allocated for this student.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Mode: Self / Parent Commute
                    </Typography>
                  </Box>
                )}
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
          
          {/* Monthly KPI Cards */}
          <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
            {attendance.monthlyBreakdown?.map((m, idx) => (
              <Grid item xs={12} sm={4} md={2} key={idx}>
                <Card sx={{ p: 2, textAlign: 'center', borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: isDarkMode ? '#1e293b' : '#fafafa' }}>
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

          {/* Detailed Monthly Attendance Report Table (Item 2) */}
          <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttendanceIcon fontSize="small" /> Month-wise Attendance Register
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Month & Year</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Total Working Days</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Days Present</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Days Absent</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Attendance %</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Eligibility Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!attendance.monthlyBreakdown || attendance.monthlyBreakdown.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No attendance log records found for current session.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.monthlyBreakdown.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{row.month}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{row.total}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#10b981' }}>{row.present}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#ef4444' }}>{row.absent}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 900, color: row.percentage >= 75 ? '#10b981' : '#ef4444' }}>
                        {row.percentage}%
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={row.percentage >= 75 ? "Eligible" : "Shortage"}
                          color={row.percentage >= 75 ? "success" : "error"}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Holiday Calendar List / Table (Item 1) */}
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon fontSize="small" /> Official School Holiday Calendar ({activeAcademicYearName || '2026-27'})
              </Typography>
              <Chip label={`${holidays.length} Declared Holidays`} size="small" color="primary" sx={{ fontWeight: 700 }} />
            </Stack>

            {holidays.length === 0 ? (
              <Alert severity="info">
                No official declared holidays scheduled in the academic calendar for this session.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {holidays.map((h, i) => {
                  const hDate = new Date(h.holidayDate);
                  const isUpcoming = hDate >= new Date();
                  return (
                    <Grid item xs={12} sm={6} md={4} key={h.id || i}>
                      <Card
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          borderColor: isUpcoming ? `${primaryColor}44` : '#e2e8f0',
                          bgcolor: isUpcoming ? (isDarkMode ? '#1e293b' : '#f0fdf4') : (isDarkMode ? '#0f172a' : '#f8fafc'),
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: isUpcoming ? '#10b981' : '#94a3b8',
                            color: '#ffffff',
                            width: 48,
                            height: 48,
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}
                        >
                          {hDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800} color={isUpcoming ? primaryColor : 'text.primary'}>
                            {h.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {hDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </Typography>
                          {h.description && (
                            <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                              {h.description}
                            </Typography>
                          )}
                        </Box>
                        {isUpcoming && (
                          <Chip label="Upcoming" size="small" color="success" sx={{ fontSize: '0.7rem', height: 20 }} />
                        )}
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
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

      {/* TAB 3: CLASS HOMEWORK & ASSIGNMENTS */}
      {activeTab === 3 && (
        <StudentHomeworkTab studentId={selectedStudentId} primaryColor={primaryColor} />
      )}

      {/* TAB 4: EXAMINATIONS & REPORT CARDS */}
      {activeTab === 4 && (
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

      {/* TAB 5: FEES RECEIPTS & DUES */}
      {activeTab === 5 && (
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

          {/* Quick Actions Bar with Demand Slip Button (Item 4) */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: isDarkMode ? '#1e293b' : '#f0f9ff',
              borderColor: '#bae6fd',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2
            }}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color={primaryColor}>
                Official School Fee Demand Bill Notice / Slip
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Generate, view, and print official fee demand bill note with detailed fee head breakups, concessions, and due dates.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ReceiptIcon />}
              onClick={handleOpenDemandSlip}
              sx={{ fontWeight: 800, px: 2.5, borderRadius: 2 }}
            >
              View & Print Demand Slip
            </Button>
          </Paper>

          {/* Late Fine Rules Alert / Box (Item 5) */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon fontSize="small" sx={{ color: '#f59e0b' }} /> Late Fine Policies & Applicable Dates
            </Typography>
            {(!fees.fineRules || fees.fineRules.length === 0) ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Standard Grace Period: 5 to 7 days after installment due date. No active custom fine rule penalties applied for current period.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {fees.fineRules.map((rule, idx) => {
                  const dueDateStr = rule.dueDate && rule.dueDate !== '0001-01-01T00:00:00'
                    ? new Date(rule.dueDate).toLocaleDateString('en-IN')
                    : 'End of Term';
                  const fineFromStr = rule.fineApplicableFrom && rule.fineApplicableFrom !== '0001-01-01T00:00:00'
                    ? new Date(rule.fineApplicableFrom).toLocaleDateString('en-IN')
                    : 'Due Date + Grace Days';

                  return (
                    <Grid item xs={12} sm={6} md={4} key={rule.id || idx}>
                      <Card
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          borderColor: '#fde68a',
                          bgcolor: isDarkMode ? '#1e293b' : '#fffbeb'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800} color="#92400e">
                            {rule.installmentName}
                          </Typography>
                          <Chip label={`Grace: ${rule.graceDays || 0} Days`} size="small" color="warning" sx={{ fontWeight: 700 }} />
                        </Stack>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', mb: 0.5 }}>
                          Due Date: <strong>{dueDateStr}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', mb: 0.5, color: '#b45309' }}>
                          Late Fine Starts From: <strong>{fineFromStr}</strong>
                        </Typography>
                        <Typography variant="caption" fontWeight={800} sx={{ color: '#b91c1c' }}>
                          Penalty Charge: ₹ {Number(rule.lateFineAmount || 0).toLocaleString('en-IN')} ({rule.fineType || 'Flat'})
                        </Typography>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>

          {/* Student Fee Concessions (Item 6) */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
                <DiscountIcon fontSize="small" sx={{ color: '#10b981' }} /> Approved Student Fee Concessions & Scholarships
              </Typography>
              {fees.totalConcession > 0 && (
                <Chip label={`Total Saved: ₹ ${Number(fees.totalConcession).toLocaleString('en-IN')}`} color="success" size="small" sx={{ fontWeight: 800 }} />
              )}
            </Stack>

            {(!fees.concessions || fees.concessions.length === 0) ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No active fee concessions or fee waivers mapped to this student profile for current academic session.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Fee Head</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Concession Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Value</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Calculated Discount</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Remarks / Approval Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fees.concessions.map((c, idx) => (
                      <TableRow key={c.id || idx} hover>
                        <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{c.feeHead}</TableCell>
                        <TableCell>
                          <Chip label={c.type} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {c.type === 'Percentage' ? `${c.value}%` : `₹ ${c.value}`}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: '#10b981' }}>
                          ₹ {Number(c.calculatedAmount || c.value || 0).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{c.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

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

      {/* TAB 6: STUDENT ID CARD */}
      {activeTab === 6 && (
        <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color={primaryColor} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BadgeIcon /> Official Student Identity Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View, download, or print official student digital ID card issued for session {activeAcademicYearName || '2026-27'}.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => printWithTitle('id-card-print-container', `ID_Card_${student?.fullName || 'Student'}`)}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                Print ID Card
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={downloadingIdCard ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownloadIdCardPdf}
                disabled={downloadingIdCard}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                {downloadingIdCard ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </Stack>
          </Stack>

          <Box
            id="id-card-print-container"
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
              p: { xs: 1, sm: 4 },
              bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9',
              borderRadius: 3
            }}
          >
            {/* FRONT SIDE OF ID CARD */}
            <Card
              sx={{
                width: 320,
                height: 480,
                borderRadius: 3,
                boxShadow: 4,
                bgcolor: '#ffffff',
                border: `2px solid ${primaryColor}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {/* Card Header */}
              <Box
                sx={{
                  bgcolor: primaryColor,
                  color: '#ffffff',
                  p: 2,
                  textAlign: 'center',
                  borderBottom: '3px solid #ffb000'
                }}
              >
                {schoolInfo?.logoUrl ? (
                  <img src={schoolInfo.logoUrl} alt="Logo" style={{ height: 38, objectFit: 'contain', marginBottom: 4 }} />
                ) : (
                  <StudentIcon sx={{ fontSize: 32, mb: 0.5, color: '#ffd47e' }} />
                )}
                <Typography variant="subtitle2" fontWeight={900} sx={{ letterSpacing: '0.04em', lineHeight: 1.2, textTransform: 'uppercase' }}>
                  {schoolInfo?.schoolName || 'DIGITAL VIDYA SARTHI PUBLIC SCHOOL'}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9, display: 'block' }}>
                  {schoolInfo?.address || 'Main Campus Road'}
                </Typography>
              </Box>

              {/* Card Body */}
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <Avatar
                  src={student?.photoUrl}
                  sx={{
                    width: 90,
                    height: 90,
                    mb: 1.5,
                    border: `3px solid ${primaryColor}`,
                    boxShadow: 2,
                    bgcolor: '#e2e8f0',
                    color: primaryColor,
                    fontSize: '2rem',
                    fontWeight: 900
                  }}
                >
                  {student?.fullName?.charAt(0) || 'S'}
                </Avatar>

                <Typography variant="subtitle1" fontWeight={900} color={primaryColor} sx={{ textAlign: 'center', lineHeight: 1.2 }}>
                  {student?.fullName || 'STUDENT NAME'}
                </Typography>
                <Chip
                  label={`CLASS: ${student?.className || '—'} (${student?.sectionName || 'A'})`}
                  size="small"
                  sx={{ bgcolor: '#eff6ff', color: primaryColor, fontWeight: 800, mt: 0.5, mb: 1.5 }}
                />

                <Box sx={{ width: '100%', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 0.6, px: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Adm No:</span>
                    <strong>{student?.admissionNo || '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Roll No:</span>
                    <strong>{student?.rollNo || '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Father:</span>
                    <strong>{student?.fatherName || '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>DOB:</span>
                    <strong>{student?.dateOfBirth ? String(student.dateOfBirth).split('T')[0] : '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Blood Group:</span>
                    <strong style={{ color: '#dc2626' }}>{student?.bloodGroup || '—'}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Emergency Contact:</span>
                    <strong>{student?.guardianPhone || student?.emergencyContact || '—'}</strong>
                  </Box>
                </Box>
              </Box>

              {/* Card Footer Badge */}
              <Box sx={{ bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', p: 1, textAlign: 'center' }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  SESSION: {activeAcademicYearName || '2026-27'} • STUDENT ID CARD
                </Typography>
              </Box>
            </Card>

            {/* BACK SIDE OF ID CARD */}
            <Card
              sx={{
                width: 320,
                height: 480,
                borderRadius: 3,
                boxShadow: 4,
                bgcolor: '#ffffff',
                border: `2px solid ${primaryColor}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: 2.5
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight={900} color={primaryColor} sx={{ textAlign: 'center', mb: 1, textTransform: 'uppercase' }}>
                  Terms & General Instructions
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1, lineHeight: 1.4 }}>
                  1. This card is valid only for student tenure during Academic Session {activeAcademicYearName || '2026-27'}.
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1, lineHeight: 1.4 }}>
                  2. Student must wear this ID card daily inside school campus, during bus transit, and examination days.
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1, lineHeight: 1.4 }}>
                  3. If lost or damaged, immediately report to the school office for issuance of a duplicate card.
                </Typography>

                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block' }}>
                    RESIDENTIAL ADDRESS:
                  </Typography>
                  <Typography variant="caption" fontWeight={800} color="text.primary">
                    {student?.address ? `${student.address}, ${student.city || ''} - ${student.pincode || ''}` : 'On Permanent School Register'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', px: 1 }}>
                  <Box>
                    <Box sx={{ borderBottom: '1px solid #94a3b8', width: 90, mb: 0.5 }} />
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Card Holder</Typography>
                  </Box>
                  <Box>
                    <Box sx={{ borderBottom: '1px solid #0f2b48', width: 90, mb: 0.5 }} />
                    <Typography variant="caption" fontWeight={800} color={primaryColor}>Principal</Typography>
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', mt: 2 }}>
                  Emergency Helpline: {schoolInfo?.phone || 'School Office'}
                </Typography>
              </Box>
            </Card>
          </Box>
        </Paper>
      )}

      {/* TAB 7: NOTICES & CIRCULARS */}
      {activeTab === 7 && (
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

      {/* TAB 8: NCERT BOOK READER */}
      {activeTab === 8 && (
        <StudentNcertReaderTab studentClassName={student?.className} />
      )}

      {/* TAB 9: AI STUDY BUDDY */}
      {activeTab === 9 && (
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

      {/* ========================================================================= */}
      {/* MODAL 3: OFFICIAL DEMAND SLIP PRINT / VIEW DIALOG (Item 4) */}
      {/* ========================================================================= */}
      <Dialog
        open={demandSlipDialog.open}
        onClose={() => setDemandSlipDialog({ open: false, loading: false, data: null })}
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
              Official Fee Demand Bill Notice / Slip
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Student: {student?.fullName} ({student?.admissionNo}) • Academic Session: {activeAcademicYearName || '2026-27'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => printWithTitle('demand-slip-print-area', `Demand_Slip_${student?.admissionNo || 'Bill'}`)}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              Print
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={downloadingDemandSlip ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadDemandSlipPdf}
              disabled={downloadingDemandSlip || !demandSlipDialog.data}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              {downloadingDemandSlip ? 'Downloading...' : 'Download PDF'}
            </Button>
            <IconButton onClick={() => setDemandSlipDialog({ open: false, loading: false, data: null })} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 1, sm: 2 } }}>
          {demandSlipDialog.loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                Compiling official demand slip notice...
              </Typography>
            </Box>
          ) : !demandSlipDialog.data ? (
            <Alert severity="warning" sx={{ my: 3 }}>
              Demand slip details could not be generated.
            </Alert>
          ) : (
            <div id="demand-slip-print-area">
              <SingleDemandSlip
                data={demandSlipDialog.data}
                copyTitle="STUDENT / PARENT FEE DEMAND COPY"
                schoolInfo={schoolInfo}
              />
            </div>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDemandSlipDialog({ open: false, loading: false, data: null })} sx={{ fontWeight: 700 }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={downloadingDemandSlip ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadDemandSlipPdf}
            disabled={downloadingDemandSlip || !demandSlipDialog.data}
            sx={{ fontWeight: 800 }}
          >
            {downloadingDemandSlip ? 'Downloading...' : 'Download PDF'}
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
