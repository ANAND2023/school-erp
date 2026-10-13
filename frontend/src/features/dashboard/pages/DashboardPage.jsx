import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  School as StudentIcon,
  People as StaffIcon,
  AccountBalanceWallet as FeesIcon,
  EventAvailable as AttendanceIcon,
  PersonAdd as PersonAddIcon,
  ContactSupport as EnquiriesIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Inventory as InventoryIcon,
  MenuBook as AcademicIcon,
  ReceiptLong as ReceiptLongIcon,
  Dashboard as DashboardIcon,
  AssignmentTurnedIn as ExamIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Cake as CakeIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Chart } from 'primereact/chart';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { usePermission } from '../../../hooks/usePermission';
import { dashboardApi } from '../api';
import InventoryDashboardPage from '../../inventory/pages/InventoryDashboardPage';
import StudentPortalDashboardPage from '../../portal/pages/StudentPortalDashboardPage';
import WhatsAppDialog from '../../communication/components/WhatsAppDialog';

export const DashboardPage = () => {
  const { user, activeAcademicYearId, activeAcademicYearName, academicYears } = useAuthStore();
  const { isDarkMode, currentColorHex } = useThemeStore();
  const themeColor = currentColorHex || '#ec4899';
  const { hasPermission } = usePermission();
  const navigate = useNavigate();

  // If logged in as Parent (6) or Student (7), render dedicated Student/Parent Portal Dashboard
  if (user?.userType === 6 || user?.userType === 7) {
    return <StudentPortalDashboardPage />;
  }

  // Role detection
  const isSuperAdmin = user?.userType === 1;
  const isSchoolAdmin = user?.userType === 2;
  const isPrincipal = user?.userType === 3;
  const isTeacher = user?.userType === 4 || /teacher|faculty|educator/i.test(user?.roleName || '');
  const isAccountant = user?.userType === 5 || /account|cashier|fee/i.test(user?.roleName || '');
  const isFrontDesk = /clerk|enquir|reception|counsel|admission/i.test(user?.roleName || '');
  const isAdmin = isSuperAdmin || isSchoolAdmin || isPrincipal || /admin|principal/i.test(user?.roleName || '');

  // Default view based on role
  const defaultRoleView = isAdmin ? 'all' : isAccountant ? 'accounts' : isTeacher ? 'teacher' : isFrontDesk ? 'admissions' : 'all';
  const [activeRoleView, setActiveRoleView] = useState(defaultRoleView);
  const [birthdayFilter, setBirthdayFilter] = useState('all'); // 'all' | 'students' | 'staff'

  const currentAY = academicYears.find((y) => y.id === activeAcademicYearId) || academicYears[0];
  const activeYearLabel = activeAcademicYearName || (currentAY ? (currentAY.rawName || currentAY.name.replace('Session: ', '').replace(' (Current)', '')) : (user?.academicYearName || '2026-27'));

  const {
    data: statsRes,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dashboard-stats', activeAcademicYearId],
    queryFn: () => dashboardApi.getStats({ academicYearId: activeAcademicYearId }),
  });

  const stats = statsRes?.data?.data || {
    totalStudents: 0,
    activeStudents: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalClasses: 0,
    totalSections: 0,
    todayAttendance: { totalMarked: 0, present: 0, absent: 0, halfDay: 0, leave: 0, percentage: 0 },
    feeSummary: { totalCollected: 0, totalPending: 0, totalFeeDue: 0 },
    enquiries: { total: 0, converted: 0, open: 0 },
    recentAdmissions: [],
    recentFeeReceipts: [],
    classWiseEnrollment: [],
    monthlyFeeCollection: [],
    genderDistribution: { male: 0, female: 0, other: 0 },
    birthdays: { todayBirthdays: [], upcomingBirthdays: [], totalThisMonth: 0 },
  };

  // Birthday list helpers
  const allBirthdaysList = useMemo(() => {
    const today = stats.birthdays?.todayBirthdays || [];
    const upcoming = stats.birthdays?.upcomingBirthdays || [];
    return [...today, ...upcoming];
  }, [stats.birthdays]);

  const allBirthdaysCount = useMemo(() => {
    const students = allBirthdaysList.filter((b) => b.roleType === 'Student').length;
    const staff = allBirthdaysList.filter((b) => b.roleType === 'Staff').length;
    return { all: allBirthdaysList.length, students, staff };
  }, [allBirthdaysList]);

  const [whatsAppModal, setWhatsAppModal] = useState({
    open: false,
    recipientName: '',
    recipientMobile: '',
    variables: {},
  });

  const displayedBirthdays = useMemo(() => {
    if (birthdayFilter === 'students') return allBirthdaysList.filter((b) => b.roleType === 'Student');
    if (birthdayFilter === 'staff') return allBirthdaysList.filter((b) => b.roleType === 'Staff');
    return allBirthdaysList;
  }, [allBirthdaysList, birthdayFilter]);

  const handleWishBirthday = (person) => {
    setWhatsAppModal({
      open: true,
      recipientName: person.fullName,
      recipientMobile: person.mobile || '',
      variables: {
        StudentName: person.fullName,
        StaffName: person.fullName,
        Name: person.fullName,
        Age: person.age != null ? String(person.age) : '',
        SchoolName: 'Our School',
        Date: dayjs().format('DD/MM/YYYY'),
      },
    });
  };

  // Fee recovery percentage
  const totalFeeDue = stats.feeSummary.totalCollected + stats.feeSummary.totalPending;
  const recoveryPercentage = totalFeeDue > 0 ? Math.round((stats.feeSummary.totalCollected / totalFeeDue) * 100) : 0;

  // 1. Core All Cards (Executive Admin)
  const coreCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents.toLocaleString('en-IN'),
      subtitle: `${stats.activeStudents.toLocaleString('en-IN')} Active Enrolled`,
      icon: <StudentIcon sx={{ fontSize: 34, color: '#1976d2' }} />,
      color: '#e3f2fd',
      onClick: () => navigate('/students'),
    },
    {
      title: 'Total Staff',
      value: stats.totalStaff.toLocaleString('en-IN'),
      subtitle: `${stats.activeStaff.toLocaleString('en-IN')} Active Employees`,
      icon: <StaffIcon sx={{ fontSize: 34, color: '#2e7d32' }} />,
      color: '#e8f5e9',
      onClick: () => navigate('/staff'),
    },
    {
      title: "Today's Attendance",
      value: `${stats.todayAttendance.percentage}%`,
      subtitle:
        stats.todayAttendance.totalMarked > 0
          ? `${stats.todayAttendance.present} Present / ${stats.todayAttendance.absent} Absent`
          : 'Attendance Not Marked Today',
      icon: <AttendanceIcon sx={{ fontSize: 34, color: '#ed6c02' }} />,
      color: '#fff3e0',
      onClick: () => navigate('/attendance/student'),
    },
    {
      title: 'Fee Collection (AY)',
      value: `₹ ${stats.feeSummary.totalCollected.toLocaleString('en-IN')}`,
      subtitle: `Pending: ₹ ${stats.feeSummary.totalPending.toLocaleString('en-IN')}`,
      icon: <FeesIcon sx={{ fontSize: 34, color: '#9c27b0' }} />,
      color: '#f3e5f5',
      onClick: () => navigate('/fees/collection'),
    },
  ];

  // 2. Accounts Role Cards
  const accountsCards = [
    {
      title: 'Total Fee Collected',
      value: `₹ ${stats.feeSummary.totalCollected.toLocaleString('en-IN')}`,
      subtitle: `Session: ${activeYearLabel}`,
      icon: <FeesIcon sx={{ fontSize: 34, color: '#10B981' }} />,
      color: '#ecfdf5',
      onClick: () => navigate('/fees/collection'),
    },
    {
      title: 'Outstanding Dues',
      value: `₹ ${stats.feeSummary.totalPending.toLocaleString('en-IN')}`,
      subtitle: `Pending student balances`,
      icon: <PendingIcon sx={{ fontSize: 34, color: '#F59E0B' }} />,
      color: '#fffbeb',
      onClick: () => navigate('/fees/reports'),
    },
    {
      title: 'Fee Recovery Rate',
      value: `${recoveryPercentage}%`,
      subtitle: `Target: 100% of assessed dues`,
      icon: <CheckIcon sx={{ fontSize: 34, color: '#3B82F6' }} />,
      color: '#eff6ff',
      onClick: () => navigate('/fees/structure'),
    },
    {
      title: 'Recent Receipts',
      value: `${stats.recentFeeReceipts?.length || 0}`,
      subtitle: `Latest receipts processed`,
      icon: <ReceiptLongIcon sx={{ fontSize: 34, color: '#8B5CF6' }} />,
      color: '#f5f3ff',
      onClick: () => navigate('/fees/reports'),
    },
  ];

  // 3. Teacher Role Cards
  const teacherCards = [
    {
      title: "Today's Attendance",
      value: `${stats.todayAttendance.percentage}%`,
      subtitle: `${stats.todayAttendance.present} Present / ${stats.todayAttendance.absent} Absent`,
      icon: <AttendanceIcon sx={{ fontSize: 34, color: '#ed6c02' }} />,
      color: '#fff3e0',
      onClick: () => navigate('/attendance/student'),
    },
    {
      title: 'Enrolled Students',
      value: stats.totalStudents.toLocaleString('en-IN'),
      subtitle: `${stats.activeStudents.toLocaleString('en-IN')} Active Learners`,
      icon: <StudentIcon sx={{ fontSize: 34, color: '#1976d2' }} />,
      color: '#e3f2fd',
      onClick: () => navigate('/students'),
    },
    {
      title: 'Classes & Sections',
      value: `${stats.totalClasses} Classes`,
      subtitle: `${stats.totalSections} Standard Sections`,
      icon: <AcademicIcon sx={{ fontSize: 34, color: '#2e7d32' }} />,
      color: '#e8f5e9',
      onClick: () => navigate('/timetable/class'),
    },
    {
      title: 'Teaching Staff',
      value: `${stats.activeStaff}`,
      subtitle: `Colleagues & Faculty`,
      icon: <StaffIcon sx={{ fontSize: 34, color: '#9c27b0' }} />,
      color: '#f3e5f5',
      onClick: () => navigate('/staff'),
    },
  ];

  // 4. Admissions / Front Desk Cards
  const admissionsCards = [
    {
      title: 'Total Enquiries',
      value: `${stats.enquiries.total}`,
      subtitle: `Session ${activeYearLabel} leads`,
      icon: <EnquiriesIcon sx={{ fontSize: 34, color: '#0284C7' }} />,
      color: '#f0f9ff',
      onClick: () => navigate('/enquiries'),
    },
    {
      title: 'Open Follow-ups',
      value: `${stats.enquiries.open}`,
      subtitle: `Leads awaiting contact`,
      icon: <PendingIcon sx={{ fontSize: 34, color: '#F59E0B' }} />,
      color: '#fffbeb',
      onClick: () => navigate('/enquiries'),
    },
    {
      title: 'Converted Admissions',
      value: `${stats.enquiries.converted}`,
      subtitle: `Successfully enrolled`,
      icon: <CheckIcon sx={{ fontSize: 34, color: '#10B981' }} />,
      color: '#ecfdf5',
      onClick: () => navigate('/enquiries'),
    },
    {
      title: 'Active Students',
      value: stats.activeStudents.toLocaleString('en-IN'),
      subtitle: `Total registered pupils`,
      icon: <StudentIcon sx={{ fontSize: 34, color: '#8B5CF6' }} />,
      color: '#f5f3ff',
      onClick: () => navigate('/students'),
    },
  ];

  // 5. Inventory Role Cards
  const inventoryCards = [
    {
      title: 'Total Stock Value',
      value: `₹ ${(984500).toLocaleString('en-IN')}`,
      subtitle: `Overall Inventory Valuation`,
      icon: <InventoryIcon sx={{ fontSize: 34, color: '#3B82F6' }} />,
      color: '#eff6ff',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Low Stock Alerts',
      value: `12`,
      subtitle: `Items need reordering`,
      icon: <PendingIcon sx={{ fontSize: 34, color: '#F59E0B' }} />,
      color: '#fffbeb',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Purchases This Month',
      value: `24`,
      subtitle: `Inward GRN receipts`,
      icon: <ReceiptLongIcon sx={{ fontSize: 34, color: '#10B981' }} />,
      color: '#ecfdf5',
      onClick: () => navigate('/inventory/purchases'),
    },
    {
      title: 'Issues This Month',
      value: `85`,
      subtitle: `Outward stock issues`,
      icon: <TrendingUpIcon sx={{ fontSize: 34, color: '#8B5CF6' }} />,
      color: '#f5f3ff',
      onClick: () => navigate('/inventory/issues'),
    },
  ];

  // Active cards based on role view
  const displayCards =
    activeRoleView === 'accounts'
      ? accountsCards
      : activeRoleView === 'teacher'
      ? teacherCards
      : activeRoleView === 'admissions'
      ? admissionsCards
      : activeRoleView === 'inventory'
      ? []
      : coreCards;

  // 1. Monthly Fee Collection Trend Chart Data
  const monthlyFeeChartData = useMemo(() => {
    const months = stats.monthlyFeeCollection?.map((m) => m.month) || ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const amounts = stats.monthlyFeeCollection?.map((m) => m.collectedAmount) || [0, 0, 0, 0, 0, 0];

    return {
      labels: months,
      datasets: [
        {
          label: 'Fee Collected (₹)',
          data: amounts,
          backgroundColor: currentColorHex ? `${currentColorHex}B3` : 'rgba(59, 130, 246, 0.7)',
          borderColor: currentColorHex || '#3B82F6',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [stats.monthlyFeeCollection, currentColorHex]);

  const monthlyFeeChartOptions = useMemo(() => {
    const textColor = isDarkMode ? '#cbd5e1' : '#475569';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

    return {
      maintainAspectRatio: false,
      aspectRatio: 1.8,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: textColor, font: { weight: '600', size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (context) => ` Collected: ₹ ${Number(context.raw || 0).toLocaleString('en-IN')}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { weight: '600', size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: (val) => `₹${val >= 1000 ? val / 1000 + 'k' : val}`,
          },
          grid: { color: gridColor },
        },
      },
    };
  }, [isDarkMode]);

  // 2. Fee Collection vs Pending Breakdown (Doughnut)
  const feeDoughnutData = useMemo(() => {
    return {
      labels: ['Collected Amount', 'Pending Dues'],
      datasets: [
        {
          data: [stats.feeSummary.totalCollected || 0, stats.feeSummary.totalPending || 0],
          backgroundColor: ['#10B981', '#F59E0B'],
          hoverBackgroundColor: ['#059669', '#D97706'],
          borderWidth: isDarkMode ? 0 : 2,
        },
      ],
    };
  }, [stats.feeSummary, isDarkMode]);

  const feeDoughnutOptions = useMemo(() => {
    const textColor = isDarkMode ? '#cbd5e1' : '#334155';
    return {
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { weight: '600', size: 11 }, padding: 14 },
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ₹ ${Number(context.raw || 0).toLocaleString('en-IN')}`,
          },
        },
      },
    };
  }, [isDarkMode]);

  // 3. Class-wise Enrollment & Capacity Bar Chart
  const classEnrollmentChartData = useMemo(() => {
    const classes = stats.classWiseEnrollment || [];
    return {
      labels: classes.map((c) => c.className),
      datasets: [
        {
          label: 'Enrolled Students',
          data: classes.map((c) => c.studentCount),
          backgroundColor: '#3B82F6',
          borderRadius: 4,
        },
        {
          label: 'Class Capacity',
          data: classes.map((c) => c.capacity),
          backgroundColor: '#94A3B8',
          borderRadius: 4,
        },
      ],
    };
  }, [stats.classWiseEnrollment]);

  const classEnrollmentChartOptions = useMemo(() => {
    const textColor = isDarkMode ? '#cbd5e1' : '#475569';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

    return {
      maintainAspectRatio: false,
      aspectRatio: 1.6,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: textColor, font: { weight: '600', size: 11 } },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { color: gridColor },
        },
      },
    };
  }, [isDarkMode]);

  // 4. Today's Attendance Breakdown (Doughnut)
  const attendanceChartData = useMemo(() => {
    const att = stats.todayAttendance;
    const hasData = att.totalMarked > 0;
    return {
      labels: hasData ? ['Present', 'Absent', 'Half-Day', 'Leave'] : ['Not Marked Yet'],
      datasets: [
        {
          data: hasData ? [att.present, att.absent, att.halfDay, att.leave] : [1],
          backgroundColor: hasData ? ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'] : ['#E2E8F0'],
          hoverBackgroundColor: hasData ? ['#059669', '#DC2626', '#D97706', '#2563EB'] : ['#CBD5E1'],
          borderWidth: 0,
        },
      ],
    };
  }, [stats.todayAttendance]);

  const attendanceChartOptions = useMemo(() => {
    const textColor = isDarkMode ? '#cbd5e1' : '#334155';
    return {
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { weight: '600', size: 11 }, padding: 12 },
        },
      },
    };
  }, [isDarkMode]);

  // 5. Gender Ratio Pie Chart
  const genderChartData = useMemo(() => {
    const g = stats.genderDistribution || { male: 0, female: 0, other: 0 };
    return {
      labels: ['Boys', 'Girls', 'Other'],
      datasets: [
        {
          data: [g.male || 0, g.female || 0, g.other || 0],
          backgroundColor: ['#0284C7', '#EC4899', '#8B5CF6'],
          hoverBackgroundColor: ['#0369A1', '#DB2777', '#7C3AED'],
          borderWidth: 0,
        },
      ],
    };
  }, [stats.genderDistribution]);

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Banner */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="h4" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#1e293b', fontSize: { xs: '1.4rem', sm: '1.75rem' } }}>
              Welcome back, {user?.fullName || user?.username || 'Administrator'}!
            </Typography>
            <Chip
              label={user?.roleName || 'Administrator'}
              color="primary"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Real-time operational metrics for <strong>{user?.branchName || 'Main Campus'}</strong> &bull; Session {activeYearLabel}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Refresh live statistics">
            <IconButton onClick={() => refetch()} disabled={isFetching} sx={{ bgcolor: isDarkMode ? '#1e293b' : '#ffffff', boxShadow: 1 }}>
              <RefreshIcon sx={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
          {(isAdmin || hasPermission?.('Admissions', 'Add')) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={() => navigate('/admissions/new')}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              New Admission
            </Button>
          )}
        </Stack>
      </Box>

      {/* Admin Role Perspective Switcher Bar (Visible for Admins to view specialized views) */}
      {isAdmin && (
        <Paper
          sx={{
            p: 1.2,
            mb: 3,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            border: '1px solid',
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <DashboardIcon sx={{ color: currentColorHex || '#3B82F6', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={800} color={isDarkMode ? '#f1f5f9' : '#1e293b'}>
              Dashboard Perspective:
            </Typography>
          </Stack>

          <ToggleButtonGroup
            value={activeRoleView}
            exclusive
            onChange={(_, val) => val && setActiveRoleView(val)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 2,
                py: 0.5,
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
                borderRadius: '8px !important',
                mx: 0.3,
                border: 'none',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                '&.Mui-selected': {
                  bgcolor: currentColorHex || '#3B82F6',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: currentColorHex || '#2563EB',
                  },
                },
              },
            }}
          >
            <ToggleButton value="all">
              🌟 Full Executive (All)
            </ToggleButton>
            <ToggleButton value="accounts">
              💰 Accounts & Fees
            </ToggleButton>
            <ToggleButton value="teacher">
              🎓 Academics & Teaching
            </ToggleButton>
            <ToggleButton value="admissions">
              📋 Admissions & Leads
            </ToggleButton>
            <ToggleButton value="inventory">
              📦 Inventory & Stock
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      )}

      {isLoading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

      {activeRoleView === 'inventory' ? (
        <Box sx={{ mt: -2, mx: -2 }}>
          <InventoryDashboardPage />
        </Box>
      ) : (
        <>
          {/* 4 Top KPI Metric Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {displayCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card
              sx={{
                borderRadius: 2.5,
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                },
              }}
              onClick={card.onClick}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {card.title}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ my: 0.5, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {card.subtitle}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {card.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Action Shortcuts */}
      <Card sx={{ mb: 3, borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.72rem' }}>
              Quick Actions:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(activeRoleView === 'all' || activeRoleView === 'admissions') && (
                <>
                  <Button size="small" variant="outlined" startIcon={<PersonAddIcon />} onClick={() => navigate('/admissions/new')}>
                    Admit Student
                  </Button>
                  <Button size="small" variant="outlined" color="info" startIcon={<EnquiriesIcon />} onClick={() => navigate('/enquiries')}>
                    Lead Enquiries ({stats.enquiries.open} Open)
                  </Button>
                </>
              )}

              {(activeRoleView === 'all' || activeRoleView === 'teacher') && (
                <>
                  <Button size="small" variant="outlined" color="warning" startIcon={<AttendanceIcon />} onClick={() => navigate('/attendance/student')}>
                    Student Attendance
                  </Button>
                  <Button size="small" variant="outlined" color="primary" startIcon={<AcademicIcon />} onClick={() => navigate('/timetable/class')}>
                    Class Timetable
                  </Button>
                  <Button size="small" variant="outlined" color="secondary" startIcon={<ExamIcon />} onClick={() => navigate('/exams/marks-entry')}>
                    Marks Entry
                  </Button>
                </>
              )}

              {(activeRoleView === 'all' || activeRoleView === 'accounts') && (
                <>
                  <Button size="small" variant="outlined" color="secondary" startIcon={<PaymentIcon />} onClick={() => navigate('/fees/collection')}>
                    Collect Fees Counter
                  </Button>
                  <Button size="small" variant="outlined" color="warning" startIcon={<ReceiptLongIcon />} onClick={() => navigate('/fees/demand-bills')}>
                    Fee Demand Bills
                  </Button>
                  <Button size="small" variant="outlined" color="success" startIcon={<ReceiptLongIcon />} onClick={() => navigate('/fees/reports')}>
                    Fee Register & Receipts
                  </Button>
                </>
              )}

              {activeRoleView === 'all' && (
                <Button size="small" variant="outlined" color="success" startIcon={<InventoryIcon />} onClick={() => navigate('/inventory')}>
                  Inventory & Stock
                </Button>
              )}

              <Button size="small" variant="outlined" color="inherit" startIcon={<StudentIcon />} onClick={() => navigate('/students')}>
                Student Directory
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 🎉 TODAY'S BIRTHDAY CELEBRATIONS BANNER */}
      {stats.birthdays?.todayBirthdays?.length > 0 && (
        <Card
          sx={{
            mb: 3,
            borderRadius: 2.5,
            background: isDarkMode
              ? 'linear-gradient(135deg, #831843 0%, #701a75 50%, #4a044e 100%)'
              : `linear-gradient(135deg, ${themeColor}18 0%, #fdf2f8 50%, #fff1f2 100%)`,
            border: '1.5px solid',
            borderColor: isDarkMode ? '#be185d' : `${themeColor}40`,
            boxShadow: '0 4px 18px rgba(236, 72, 153, 0.12)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: `${themeColor}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}
                >
                  🎂
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      color: isDarkMode ? '#fdf2f8' : '#831843',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    Today's Birthday Celebrations! 🎉
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: isDarkMode ? '#fbcfe8' : '#9d174d', fontWeight: 600 }}
                  >
                    Wishing our wonderful students and staff a very Happy Birthday today!
                  </Typography>
                </Box>
              </Box>

              <Tag
                value={`${stats.birthdays.todayBirthdays.length} Celebrating Today`}
                severity="success"
                style={{ fontSize: '11px', fontWeight: 700 }}
              />
            </Stack>

            <Grid container spacing={2}>
              {stats.birthdays.todayBirthdays.map((person) => (
                <Grid item xs={12} sm={6} md={4} key={`today-${person.roleType}-${person.id}`}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: person.roleType === 'Staff' ? '#a855f7' : '#ec4899',
                      bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      transition: 'transform 0.15s ease',
                      '&:hover': { transform: 'translateY(-2px)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar
                          src={person.photoUrl}
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: person.roleType === 'Staff' ? '#9333ea' : '#db2777',
                            fontWeight: 700,
                            fontSize: '1rem',
                            border: '2px solid #ffffff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                        >
                          {person.fullName ? person.fullName[0] : '🎂'}
                        </Avatar>
                        <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '13px' }}>
                          🎂
                        </span>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                          {person.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {person.detail}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#db2777', fontWeight: 700 }}>
                          Turned {person.age} today! 🎈
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleWishBirthday(person)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        py: 0.5,
                        px: 1.2,
                        minWidth: 'auto',
                        whiteSpace: 'nowrap',
                      }}
                      startIcon={<WhatsAppIcon sx={{ fontSize: 15 }} />}
                    >
                      Wish
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 📊 INTERACTIVE EXECUTIVE CHARTS & ANALYTICS SECTION                      */}
      {/* ========================================================================= */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* 1. Monthly Fee Collection Trend Bar Chart (All or Accounts View) */}
        {(activeRoleView === 'all' || activeRoleView === 'accounts') && (
          <Grid item xs={12} lg={activeRoleView === 'accounts' ? 7 : 8}>
            <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                      <TrendingUpIcon color="primary" sx={{ fontSize: 20 }} />
                      Fee Collection Trend (Past 6 Months)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Monthly fee collection progression for Session {activeYearLabel}
                    </Typography>
                  </Box>
                  <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/fees/reports')}>
                    Fee Reports
                  </Button>
                </Stack>

                <Box sx={{ height: 260, position: 'relative' }}>
                  <Chart type="bar" data={monthlyFeeChartData} options={monthlyFeeChartOptions} style={{ height: '100%' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 2. Fee Collection vs Pending Dues Doughnut Chart (All or Accounts View) */}
        {(activeRoleView === 'all' || activeRoleView === 'accounts') && (
          <Grid item xs={12} lg={activeRoleView === 'accounts' ? 5 : 4}>
            <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                  <PieChartIcon sx={{ color: '#10B981', fontSize: 20 }} />
                  Fee Recovery Ratio
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Collected vs Outstanding student dues
                </Typography>

                <Box sx={{ height: 210, position: 'relative' }}>
                  <Chart type="doughnut" data={feeDoughnutData} options={feeDoughnutOptions} style={{ height: '100%' }} />
                </Box>

                <Stack direction="row" justifyContent="space-between" sx={{ pt: 1.5, borderTop: '1px solid', borderColor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Collected</Typography>
                    <Typography variant="body2" fontWeight={800} color="success.main">
                      ₹ {stats.feeSummary.totalCollected.toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Pending</Typography>
                    <Typography variant="body2" fontWeight={800} color="warning.main">
                      ₹ {stats.feeSummary.totalPending.toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 3. Class-wise Enrollment & Capacity Bar Chart (All, Teacher, or Admissions View) */}
        {(activeRoleView === 'all' || activeRoleView === 'teacher' || activeRoleView === 'admissions') && (
          <Grid item xs={12} lg={activeRoleView === 'all' ? 6 : 7}>
            <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                      <BarChartIcon color="primary" sx={{ fontSize: 20 }} />
                      Class-wise Enrollment & Capacity
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Active student count vs total seat capacity per class
                    </Typography>
                  </Box>
                  <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/masters/classes')}>
                    Classes
                  </Button>
                </Stack>

                <Box sx={{ height: 250, position: 'relative' }}>
                  <Chart type="bar" data={classEnrollmentChartData} options={classEnrollmentChartOptions} style={{ height: '100%' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 4. Today's Attendance & Gender Ratio Side-by-Side Charts (All, Teacher, or Admissions View) */}
        {(activeRoleView === 'all' || activeRoleView === 'teacher' || activeRoleView === 'admissions') && (
          <Grid item xs={12} lg={activeRoleView === 'all' ? 6 : 5}>
            <Grid container spacing={2} sx={{ height: '100%' }}>
              {/* Attendance Doughnut (All or Teacher) */}
              {(activeRoleView === 'all' || activeRoleView === 'teacher') && (
                <Grid item xs={12} sm={activeRoleView === 'all' ? 6 : 12}>
                  <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0', height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                        <AttendanceIcon sx={{ color: '#ed6c02', fontSize: 18 }} />
                        Today's Attendance
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {stats.todayAttendance.percentage}% Overall Present
                      </Typography>

                      <Box sx={{ height: 185, position: 'relative' }}>
                        <Chart type="doughnut" data={attendanceChartData} options={attendanceChartOptions} style={{ height: '100%' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Gender Ratio Doughnut (All, Teacher, or Admissions) */}
              {(activeRoleView === 'all' || activeRoleView === 'admissions') && (
                <Grid item xs={12} sm={activeRoleView === 'all' ? 6 : 12}>
                  <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0', height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                        <StudentIcon sx={{ color: '#0284C7', fontSize: 18 }} />
                        Student Gender Ratio
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {stats.genderDistribution.male} Boys &bull; {stats.genderDistribution.female} Girls
                      </Typography>

                      <Box sx={{ height: 185, position: 'relative' }}>
                        <Chart type="doughnut" data={genderChartData} options={attendanceChartOptions} style={{ height: '100%' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Grid>
        )}
      </Grid>

      {/* Detailed Operational Data Grid: Admissions & Fee Receipts */}
      <Grid container spacing={2.5}>
        {/* Left Column: Recent Student Admissions (All, Teacher, or Admissions View) */}
        {(activeRoleView === 'all' || activeRoleView === 'teacher' || activeRoleView === 'admissions') && (
          <Grid item xs={12} md={activeRoleView === 'all' ? 7 : 12}>
            <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800} color={isDarkMode ? '#f8fafc' : '#1e293b'}>
                      Recent Pupil Admissions
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Latest student registrations for Session {activeYearLabel}
                    </Typography>
                  </Box>
                  <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/students')}>
                    View All
                  </Button>
                </Stack>

                {stats.recentAdmissions && stats.recentAdmissions.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: isDarkMode ? '#1e293b' : '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Admission No</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Class & Sec</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.recentAdmissions.map((adm) => (
                          <TableRow
                            key={adm.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/students/profile/${adm.id}`)}
                          >
                            <TableCell>
                              <Stack direction="row" spacing={1.2} alignItems="center">
                                <Avatar src={adm.photoUrl} sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1976d2' }}>
                                  {adm.fullName ? adm.fullName[0] : 'S'}
                                </Avatar>
                                <Typography variant="body2" fontWeight={600}>
                                  {adm.fullName}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" fontWeight={700} color="primary">
                                {adm.admissionNo}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {adm.className} - {adm.sectionName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(adm.admissionDate).format('DD MMM YYYY')}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={adm.status === 1 ? 'Active' : 'Inactive'}
                                color={adm.status === 1 ? 'success' : 'default'}
                                size="small"
                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                    No recent admissions found. Click "New Admission" to register pupils.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Right Column: Recent Fee Transactions (All or Accounts View) */}
        {(activeRoleView === 'all' || activeRoleView === 'accounts') && (
          <Grid item xs={12} md={activeRoleView === 'all' ? 5 : 12}>
            <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800} color={isDarkMode ? '#f8fafc' : '#1e293b'}>
                      Recent Fee Receipts
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Latest collections recorded for Session {activeYearLabel}
                    </Typography>
                  </Box>
                  <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/fees/collection')}>
                    Fee Register
                  </Button>
                </Stack>

                {stats.recentFeeReceipts && stats.recentFeeReceipts.length > 0 ? (
                  <Stack spacing={1}>
                    {stats.recentFeeReceipts.map((rcpt) => (
                      <Paper
                        key={rcpt.id}
                        variant="outlined"
                        sx={{ p: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: isDarkMode ? '#1e293b' : '#fafafa' }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {rcpt.studentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rcpt.receiptNo} &bull; {rcpt.className} &bull; {rcpt.paymentMode}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" fontWeight={800} color="success.main">
                            ₹ {rcpt.amount.toLocaleString('en-IN')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(rcpt.receiptDate).format('DD MMM')}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ py: 2, textAlign: 'center' }}>
                    No fee receipts recorded for this session yet.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 🎂 STUDENT & STAFF BIRTHDAYS WIDGET */}
      <Card
        sx={{
          mt: 3,
          borderRadius: 2.5,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
            sx={{ mb: 2.5 }}
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: isDarkMode ? '#f8fafc' : '#1e293b',
                }}
              >
                <span>🎂</span>
                <span>Student & Staff Birthdays</span>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Birthdays happening today and upcoming within the next 14 days (Session {activeYearLabel})
              </Typography>
            </Box>

            {/* Filter Tabs: All, Students, Staff */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <button
                type="button"
                onClick={() => setBirthdayFilter('all')}
                style={{
                  height: '30px',
                  borderRadius: '6px',
                  border: birthdayFilter === 'all' ? `1.5px solid ${themeColor}` : isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
                  backgroundColor: birthdayFilter === 'all' ? `${themeColor}20` : 'transparent',
                  color: birthdayFilter === 'all' ? themeColor : isDarkMode ? '#94a3b8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>All</span>
                <span
                  style={{
                    backgroundColor: birthdayFilter === 'all' ? themeColor : isDarkMode ? '#334155' : '#e2e8f0',
                    color: birthdayFilter === 'all' ? '#ffffff' : isDarkMode ? '#e2e8f0' : '#475569',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontSize: '10px',
                  }}
                >
                  {allBirthdaysCount.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBirthdayFilter('students')}
                style={{
                  height: '30px',
                  borderRadius: '6px',
                  border: birthdayFilter === 'students' ? '1.5px solid #0284c7' : isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
                  backgroundColor: birthdayFilter === 'students' ? (isDarkMode ? 'rgba(2, 132, 199, 0.2)' : '#f0f9ff') : 'transparent',
                  color: birthdayFilter === 'students' ? '#0284c7' : isDarkMode ? '#94a3b8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Students</span>
                <span
                  style={{
                    backgroundColor: birthdayFilter === 'students' ? '#0284c7' : isDarkMode ? '#334155' : '#e2e8f0',
                    color: birthdayFilter === 'students' ? '#ffffff' : isDarkMode ? '#e2e8f0' : '#475569',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontSize: '10px',
                  }}
                >
                  {allBirthdaysCount.students}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBirthdayFilter('staff')}
                style={{
                  height: '30px',
                  borderRadius: '6px',
                  border: birthdayFilter === 'staff' ? '1.5px solid #9333ea' : isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
                  backgroundColor: birthdayFilter === 'staff' ? (isDarkMode ? 'rgba(147, 51, 234, 0.2)' : '#faf5ff') : 'transparent',
                  color: birthdayFilter === 'staff' ? '#9333ea' : isDarkMode ? '#94a3b8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Staff</span>
                <span
                  style={{
                    backgroundColor: birthdayFilter === 'staff' ? '#9333ea' : isDarkMode ? '#334155' : '#e2e8f0',
                    color: birthdayFilter === 'staff' ? '#ffffff' : isDarkMode ? '#e2e8f0' : '#475569',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontSize: '10px',
                  }}
                >
                  {allBirthdaysCount.staff}
                </span>
              </button>
            </Stack>
          </Stack>

          {/* Birthday Cards Grid */}
          {displayedBirthdays.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, bgcolor: isDarkMode ? '#1e293b' : '#fafafa', borderRadius: 2 }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🎈</span>
              <Typography variant="body2" fontWeight={700} color="text.secondary">
                No birthdays found for the selected filter in the next 14 days.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Birthdays within the next 14 days will appear here automatically.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {displayedBirthdays.map((person) => {
                const isToday = person.isToday;
                const isStaff = person.roleType === 'Staff';
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={`${person.roleType}-${person.id}`}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: isToday ? '2px solid #ec4899' : '1px solid #e2e8f0',
                        bgcolor: isToday
                          ? isDarkMode ? 'rgba(236, 72, 153, 0.12)' : '#fdf2f8'
                          : isDarkMode ? '#1e293b' : '#ffffff',
                        boxShadow: isToday ? '0 4px 14px rgba(236, 72, 153, 0.15)' : 'none',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        },
                      }}
                    >
                      <div>
                        {/* Header: Date Badge & Role Tag */}
                        <div className="flex align-items-center justify-content-between mb-2">
                          <span
                            className="inline-flex align-items-center gap-1 font-bold px-2 py-0.5 border-round text-xs"
                            style={{
                              backgroundColor: isToday ? '#ec4899' : isDarkMode ? '#334155' : '#f1f5f9',
                              color: isToday ? '#ffffff' : isDarkMode ? '#e2e8f0' : '#475569',
                              fontSize: '11px',
                            }}
                          >
                            {isToday ? '🎂 Today!' : person.daysUntil === 1 ? 'Tomorrow' : dayjs(person.dateOfBirth).format('DD MMM')}
                          </span>

                          <Tag
                            value={person.roleType}
                            severity={isStaff ? 'secondary' : 'info'}
                            style={{ fontSize: '10px' }}
                          />
                        </div>

                        {/* Person Details */}
                        <div className="flex align-items-center gap-2 mb-2">
                          <Avatar
                            src={person.photoUrl}
                            sx={{
                              width: 38,
                              height: 38,
                              fontSize: 14,
                              fontWeight: 700,
                              bgcolor: isStaff ? '#9333ea' : '#0284c7',
                            }}
                          >
                            {person.fullName ? person.fullName[0] : '🎂'}
                          </Avatar>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              className="font-bold text-xs line-clamp-1"
                              style={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                            >
                              {person.fullName}
                            </div>
                            <div
                              className="text-xs line-clamp-1"
                              style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#64748b' }}
                            >
                              {person.detail}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Age & Wish Button */}
                      <div
                        className="flex align-items-center justify-content-between pt-2 mt-1"
                        style={{ borderTop: `1px solid ${isDarkMode ? '#334155' : '#f1f5f9'}` }}
                      >
                        <span
                          className="text-xs font-semibold"
                          style={{ color: isToday ? '#ec4899' : isDarkMode ? '#cbd5e1' : '#64748b' }}
                        >
                          {isToday ? `Turned ${person.age} 🎉` : `Turning ${person.age}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleWishBirthday(person)}
                          style={{
                            height: '26px',
                            padding: '0 8px',
                            borderRadius: '5px',
                            border: '1px solid #10b981',
                            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                            color: isDarkMode ? '#34d399' : '#059669',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          className="hover:shadow-1 transition-all"
                        >
                          <i className="pi pi-whatsapp" style={{ fontSize: '11px' }} />
                          <span>Wish</span>
                        </button>
                      </div>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        open={whatsAppModal.open}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, open: false }))}
        moduleKey="birthday"
        recipientName={whatsAppModal.recipientName}
        recipientMobile={whatsAppModal.recipientMobile}
        variables={whatsAppModal.variables}
      />
    </Box>
  );
};

export default DashboardPage;
