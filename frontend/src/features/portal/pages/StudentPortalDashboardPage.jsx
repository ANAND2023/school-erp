import React, { useState, useEffect } from 'react';
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
  InputLabel
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
  Print as PrintIcon,
  Person as PersonIcon,
  Call as PhoneIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as AbsentIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { portalApi } from '../api';

export const StudentPortalDashboardPage = () => {
  const { user } = useAuthStore();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const primaryColor = currentColorHex || '#0a387c';

  const [wards, setWards] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const isParent = user?.userType === 6;

  // Load wards (children) for parents, or load self for student
  useEffect(() => {
    loadWards();
  }, []);

  const loadWards = async () => {
    try {
      const res = await portalApi.getWards();
      const list = res.data?.data || [];
      setWards(list);
      if (list.length > 0) {
        setSelectedStudentId(list[0].id);
        loadDashboard(list[0].id);
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

  const handleStudentChange = (e) => {
    const sId = e.target.value;
    setSelectedStudentId(sId);
    loadDashboard(sId);
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
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.01em' }}>
                {student?.fullName || user?.fullName || 'Student Portal'}
              </Typography>
              <Chip
                label={isParent ? "Parent Portal" : "Student Portal"}
                size="small"
                sx={{ bgcolor: 'rgba(255, 176, 0, 0.25)', color: '#ffd47e', fontWeight: 800, border: '1px solid #ffb000' }}
              />
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Adm No: <strong>{student?.admissionNo || '—'}</strong> • Class: <strong>{student?.className} ({student?.sectionName})</strong> • Roll No: <strong>{student?.rollNo || '—'}</strong>
            </Typography>
          </Box>
        </Box>

        {/* Multi-Child Selector for Parents */}
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
                    Pending Fee Dues
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color={fees.totalPending > 0 ? "#f59e0b" : "#10b981"} sx={{ my: 0.5 }}>
                    ₹ {Number(fees.totalPending).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Paid: ₹ {Number(fees.totalPaid).toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fffbeb', color: '#f59e0b', width: 48, height: 48 }}>
                  <FeesIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Next Exam */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid #e2e8f0', bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    Upcoming Date Sheet
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color={primaryColor} sx={{ my: 0.5 }}>
                    {upcomingExams.length > 0 ? upcomingExams[0].subjectName : 'No Active Exams'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {upcomingExams.length > 0 ? `${upcomingExams.length} Subject Exams Scheduled` : 'All exams completed'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 48, height: 48 }}>
                  <ExamIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Timetable count */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: 1, border: '1px solid #e2e8f0', bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    Today's Schedule
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="#8b5cf6" sx={{ my: 0.5 }}>
                    {timetable.length} Periods
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {timetable.length > 0 ? `Starts at ${timetable[0].startTime}` : 'Holiday / Off Day'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f5f3ff', color: '#8b5cf6', width: 48, height: 48 }}>
                  <TimetableIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Navigation for Portal Features */}
      <Paper sx={{ mb: 3, borderRadius: 2, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', boxShadow: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', py: 1.8 }
          }}
        >
          <Tab icon={<StudentIcon />} iconPosition="start" label="Dashboard & Overview" />
          <Tab icon={<AttendanceIcon />} iconPosition="start" label="Attendance Log" />
          <Tab icon={<TimetableIcon />} iconPosition="start" label="Class Timetable" />
          <Tab icon={<ExamIcon />} iconPosition="start" label="Exams & Report Cards" />
          <Tab icon={<FeesIcon />} iconPosition="start" label="Fee Receipts & Dues" />
          <Tab icon={<NoticeIcon />} iconPosition="start" label="Notice Board" />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

      {/* TAB 0: OVERVIEW & TODAY'S TIMETABLE */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Today's Timetable */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
              <Typography variant="subtitle1" fontWeight={800} color={primaryColor} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimetableIcon fontSize="small" /> Today's Class Period Timetable
              </Typography>
              {timetable.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No periods scheduled for today or it is a school weekend/holiday.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Period</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Timing</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Teacher</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timetable.map((t, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 700 }}>Period {t.periodNo || idx + 1}</TableCell>
                          <TableCell>{t.startTime} - {t.endTime}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{t.subject}</TableCell>
                          <TableCell>{t.teacher || 'Assigned Staff'}</TableCell>
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
        <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
          <Typography variant="h6" fontWeight={800} color={primaryColor} sx={{ mb: 2 }}>
            Examinations & Academic Performance
          </Typography>
          
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: '#475569' }}>
            Latest Exam Marks & Performance
          </Typography>
          {recentMarks.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              No official exam marks recorded yet for this session.
            </Alert>
          ) : (
            <TableContainer sx={{ mb: 4 }}>
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
          )}

          {/* Upcoming Date Sheets */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: '#475569' }}>
            Upcoming Date Sheet Schedule
          </Typography>
          {upcomingExams.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No upcoming exams published.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Exam</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Timing</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Room</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingExams.map((ex, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{new Date(ex.examDate).toLocaleDateString()}</TableCell>
                      <TableCell>{ex.examName}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: primaryColor }}>{ex.subjectName}</TableCell>
                      <TableCell>{ex.startTime || '09:00 AM'} - {ex.endTime || '12:00 PM'}</TableCell>
                      <TableCell>{ex.roomNo || 'Room 101'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
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

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, mt: 2, color: '#475569' }}>
            Recent Payment Receipts
          </Typography>
          {fees.recentReceipts?.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              No fee receipts issued yet.
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
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Pending Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fees.pendingDues.map((d, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{d.headName}</TableCell>
                      <TableCell>{d.installment}</TableCell>
                      <TableCell>{d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '—'}</TableCell>
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

      {/* TAB 5: NOTICE BOARD */}
      {activeTab === 5 && (
        <Paper sx={{ p: 3, borderRadius: 2.5, boxShadow: 1, bgcolor: isDarkMode ? '#1e293b' : '#ffffff' }}>
          <Typography variant="h6" fontWeight={800} color={primaryColor} sx={{ mb: 2 }}>
            Official School Notices & Circulars
          </Typography>
          {notices.length === 0 ? (
            <Alert severity="info">
              No circulars or notifications found.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {notices.map((n) => (
                <Paper key={n.id} sx={{ p: 2, bgcolor: isDarkMode ? '#334155' : '#f8fafc', borderRadius: 2, borderLeft: `5px solid ${primaryColor}` }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {n.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#475569' }}>
                    {n.message}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
                    Published on {new Date(n.sentAt).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}

    </Box>
  );
};

export default StudentPortalDashboardPage;
