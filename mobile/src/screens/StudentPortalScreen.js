import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { portalApi, classApi } from '../api/client';
import {
  generateFeeReceiptHtml,
  executePrint,
  executeSharePdf,
} from '../utils/printTemplates';

export default function StudentPortalScreen({ navigation }) {
  const { user, logout, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const isParent = user?.userType === 6;

  // Wards state (for parent login)
  const [wards, setWards] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Portal Dashboard Data state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);

  // Active feature tab: 'overview' | 'attendance' | 'timetable' | 'fees' | 'exams' | 'idcard' | 'notices' | 'transport'
  const [activeTab, setActiveTab] = useState('overview');

  // Attendance tab state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Timetable tab state
  const [timetableData, setTimetableData] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Fees tab state
  const [feesData, setFeesData] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState(false);

  // Exams tab state
  const [examsData, setExamsData] = useState(null);
  const [examsLoading, setExamsLoading] = useState(false);

  useEffect(() => {
    initPortal();
    classApi.getBranch().then((res) => {
      if (res.data?.success && res.data?.data) {
        setBranchInfo(res.data.data);
      }
    }).catch(() => {});
  }, []);

  const initPortal = async () => {
    try {
      setLoading(true);
      if (isParent) {
        const res = await portalApi.getWards();
        const wardList = res.data?.data || [];
        setWards(wardList);
        const initialId = wardList.length > 0 ? wardList[0].id : null;
        setSelectedStudentId(initialId);
        if (initialId) {
          await loadDashboard(initialId);
        } else {
          await loadDashboard(null);
        }
      } else {
        await loadDashboard(null);
      }
    } catch (err) {
      console.warn('Init portal error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDashboard = async (sId) => {
    try {
      const res = await portalApi.getDashboard(sId);
      if (res.data?.success && res.data?.data) {
        setDashboardData(res.data.data);
        if (!selectedStudentId && res.data.data.student?.id) {
          setSelectedStudentId(res.data.data.student.id);
        }
      }
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    }
  };

  const handleSelectWard = async (wardId) => {
    setSelectedStudentId(wardId);
    setLoading(true);
    await loadDashboard(wardId);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard(selectedStudentId);
    setRefreshing(false);
  }, [selectedStudentId]);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  // Lazy tab loaders
  useEffect(() => {
    if (activeTab === 'attendance' && selectedStudentId) {
      loadAttendance(selectedStudentId, selectedMonth);
    } else if (activeTab === 'timetable' && selectedStudentId) {
      loadTimetable(selectedStudentId);
    } else if (activeTab === 'fees' && selectedStudentId) {
      loadFees(selectedStudentId);
    } else if (activeTab === 'exams' && selectedStudentId) {
      loadExams(selectedStudentId);
    }
  }, [activeTab, selectedStudentId]);

  const loadAttendance = async (sId, month) => {
    try {
      setAttendanceLoading(true);
      const res = await portalApi.getAttendance({ studentId: sId, month, year: new Date().getFullYear() });
      if (res.data?.success && res.data?.data) {
        setAttendanceData(res.data.data);
      }
    } catch (e) {
      console.warn('Attendance load error:', e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadTimetable = async (sId) => {
    try {
      const res = await portalApi.getTimetable(sId);
      if (res.data?.success && res.data?.data) {
        setTimetableData(res.data.data);
      }
    } catch (e) {
      console.warn('Timetable load error:', e);
    }
  };

  const loadFees = async (sId) => {
    try {
      setFeesLoading(true);
      const res = await portalApi.getFees(sId);
      if (res.data?.success && res.data?.data) {
        setFeesData(res.data.data);
      }
    } catch (e) {
      console.warn('Fees load error:', e);
    } finally {
      setFeesLoading(false);
    }
  };

  const loadExams = async (sId) => {
    try {
      setExamsLoading(true);
      const res = await portalApi.getExams(sId);
      if (res.data?.success && res.data?.data) {
        setExamsData(res.data.data);
      }
    } catch (e) {
      console.warn('Exams load error:', e);
    } finally {
      setExamsLoading(false);
    }
  };

  const handlePrintReceipt = async (receiptId) => {
    try {
      setPrintingReceipt(true);
      const res = await portalApi.getReceiptPrint(receiptId, selectedStudentId);
      const receiptData = res.data?.data;
      if (!receiptData) {
        Alert.alert('Notice', 'Unable to fetch receipt print slip.');
        return;
      }
      const html = generateFeeReceiptHtml(receiptData, { user, branch: branchInfo, activeAcademicYearName });
      const fileName = `Fee_Receipt_${receiptData?.studentName || 'Student'}_${receiptData?.receiptNo || receiptId}.pdf`;
      await executePrint(html, fileName);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate receipt slip.');
    } finally {
      setPrintingReceipt(false);
    }
  };

  const handleShareReceiptPdf = async (receiptId, receiptNo) => {
    try {
      setPrintingReceipt(true);
      const res = await portalApi.getReceiptPrint(receiptId, selectedStudentId);
      const receiptData = res.data?.data;
      if (!receiptData) {
        Alert.alert('Notice', 'Unable to fetch receipt print slip.');
        return;
      }
      const html = generateFeeReceiptHtml(receiptData, { user, branch: branchInfo, activeAcademicYearName });
      const fileName = `Fee_Receipt_${receiptNo || receiptId}.pdf`;
      await executeSharePdf(html, fileName);
    } catch (e) {
      Alert.alert('Error', 'Failed to share receipt PDF.');
    } finally {
      setPrintingReceipt(false);
    }
  };

  const student = dashboardData?.student || {};
  const attSummary = dashboardData?.attendanceSummary || {};
  const feeSummary = dashboardData?.feeSummary || {};
  const upcomingExams = dashboardData?.upcomingExams || [];
  const notices = dashboardData?.notices || [];
  const transport = dashboardData?.transport || null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/dvs-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerBrand}>DVS ERP</Text>
              <View style={styles.portalRolePill}>
                <Text style={styles.portalRolePillText}>
                  {isParent ? '👨‍👩‍👧 Parent Portal' : '🎓 Student Portal'}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSchoolName} numberOfLines={1}>
              {branchInfo?.schoolName || user?.schoolName || 'Delhi Public School'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityLabel="Toggle Dark / Light Theme"
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={17}
              color={isDark ? '#fbbf24' : '#ffffff'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ward Switcher Bar (For Parents with multiple children) */}
      {isParent && wards.length > 1 && (
        <View style={styles.wardBar}>
          <Text style={styles.wardBarLabel}>Select Child:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wardScroll}>
            {wards.map((w) => {
              const active = w.id === selectedStudentId;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.wardChip, active && styles.wardChipActive]}
                  onPress={() => handleSelectWard(w.id)}
                >
                  <MaterialIcons
                    name="face"
                    size={16}
                    color={active ? '#ffffff' : '#0284c7'}
                  />
                  <Text style={[styles.wardChipText, active && styles.wardChipTextActive]}>
                    {w.fullName || w.firstName} ({w.className || 'Class'})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Student Profile Identity Strip */}
      <View style={styles.profileStrip}>
        {student.photoUrl ? (
          <Image source={{ uri: student.photoUrl }} style={styles.studentAvatar} />
        ) : (
          <View style={styles.studentAvatarPlaceholder}>
            <MaterialIcons name="school" size={28} color="#0284c7" />
          </View>
        )}

        <View style={styles.studentInfoCol}>
          <Text style={styles.studentNameText} numberOfLines={1}>
            {student.fullName || student.firstName || user?.fullName || 'Student'}
          </Text>
          <Text style={styles.studentMetaText}>
            Class: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{student.className || 'Class'}</Text>{' '}
            {student.sectionName ? `(${student.sectionName})` : ''} • Adm: {student.admissionNo || 'N/A'}
          </Text>
          {student.rollNo ? (
            <Text style={styles.studentRollText}>Roll No: {student.rollNo}</Text>
          ) : null}
        </View>
      </View>

      {/* Module Navigation Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: 'overview', label: 'Overview', icon: 'grid-view' },
            { key: 'attendance', label: 'Attendance', icon: 'event-available' },
            { key: 'timetable', label: 'Timetable', icon: 'schedule' },
            { key: 'fees', label: 'Fees & Receipts', icon: 'receipt-long' },
            { key: 'exams', label: 'Exams & Results', icon: 'menu-book' },
            { key: 'idcard', label: 'Digital ID Card', icon: 'badge' },
            { key: 'notices', label: 'Notices', icon: 'campaign' },
            { key: 'transport', label: 'Bus Transport', icon: 'directions-bus' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <MaterialIcons
                  name={t.icon}
                  size={15}
                  color={active ? '#ffffff' : '#64748b'}
                />
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.mainScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Loading your academic records...</Text>
          </View>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <View>
                {/* 3 Metric Summary Cards */}
                <View style={styles.metricRow}>
                  {/* Attendance Card */}
                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setActiveTab('attendance')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
                      <MaterialIcons name="event-available" size={20} color="#16a34a" />
                    </View>
                    <Text style={styles.metricVal}>
                      {attSummary.percentage ?? 95}%
                    </Text>
                    <Text style={styles.metricLabel}>Attendance</Text>
                    <Text style={styles.metricSub}>
                      {attSummary.presentCount || 0} Present / {attSummary.totalMarked || 0} Days
                    </Text>
                  </TouchableOpacity>

                  {/* Fee Balance Card */}
                  <TouchableOpacity
                    style={styles.metricCard}
                    onPress={() => setActiveTab('fees')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.metricIconBox, { backgroundColor: '#fee2e2' }]}>
                      <MaterialIcons name="account-balance-wallet" size={20} color="#dc2626" />
                    </View>
                    <Text style={[styles.metricVal, { color: '#dc2626' }]}>
                      ₹{Number(feeSummary.totalPending || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.metricLabel}>Pending Dues</Text>
                    <Text style={styles.metricSub}>
                      Paid: ₹{Number(feeSummary.totalPaid || 0).toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Important Notices Box */}
                {notices.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>LATEST SCHOOL NOTICES</Text>
                      <TouchableOpacity onPress={() => setActiveTab('notices')}>
                        <Text style={styles.sectionLink}>View All ({notices.length})</Text>
                      </TouchableOpacity>
                    </View>
                    {notices.slice(0, 3).map((n, i) => (
                      <View key={n.id || i} style={styles.noticeCard}>
                        <MaterialIcons name="campaign" size={18} color="#0284c7" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noticeTitle}>{n.title || n.message}</Text>
                          <Text style={styles.noticeDate}>
                            {n.sentAt ? new Date(n.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Notice'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Upcoming Exams Banner */}
                {upcomingExams.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>UPCOMING EXAMINATIONS</Text>
                      <TouchableOpacity onPress={() => setActiveTab('exams')}>
                        <Text style={styles.sectionLink}>Full Schedule</Text>
                      </TouchableOpacity>
                    </View>
                    {upcomingExams.slice(0, 2).map((ex, i) => (
                      <View key={ex.id || i} style={styles.examItemCard}>
                        <View style={styles.examDateBox}>
                          <Text style={styles.examDateDay}>
                            {ex.examDate ? new Date(ex.examDate).toLocaleDateString('en-IN', { day: '2-digit' }) : '15'}
                          </Text>
                          <Text style={styles.examDateMon}>
                            {ex.examDate ? new Date(ex.examDate).toLocaleDateString('en-IN', { month: 'short' }) : 'OCT'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.examSubjectName}>{ex.subjectName || 'Exam'}</Text>
                          <Text style={styles.examMeta}>
                            {ex.examName} • Max: {ex.maxMarks} • {ex.startTime || '9:00 AM'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Quick Shortcuts Grid */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>QUICK SERVICES</Text>
                  <View style={styles.shortcutsGrid}>
                    <TouchableOpacity style={styles.shortcutBtn} onPress={() => setActiveTab('timetable')}>
                      <View style={[styles.shortcutIcon, { backgroundColor: '#e0f2fe' }]}>
                        <MaterialIcons name="schedule" size={22} color="#0284c7" />
                      </View>
                      <Text style={styles.shortcutText}>Timetable</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.shortcutBtn} onPress={() => setActiveTab('fees')}>
                      <View style={[styles.shortcutIcon, { backgroundColor: '#f0fdf4' }]}>
                        <MaterialIcons name="receipt" size={22} color="#16a34a" />
                      </View>
                      <Text style={styles.shortcutText}>Receipts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.shortcutBtn} onPress={() => setActiveTab('idcard')}>
                      <View style={[styles.shortcutIcon, { backgroundColor: '#fef3c7' }]}>
                        <MaterialIcons name="badge" size={22} color="#d97706" />
                      </View>
                      <Text style={styles.shortcutText}>ID Card</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.shortcutBtn} onPress={() => setActiveTab('transport')}>
                      <View style={[styles.shortcutIcon, { backgroundColor: '#ede9fe' }]}>
                        <MaterialIcons name="directions-bus" size={22} color="#7c3aed" />
                      </View>
                      <Text style={styles.shortcutText}>Bus Route</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: MY ATTENDANCE */}
            {activeTab === 'attendance' && (
              <View>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>Monthly Attendance Log</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    {attSummary.percentage ?? 95}% Overall Attendance this Academic Year
                  </Text>
                </View>

                {/* Month Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthPillsScroll}>
                  {[
                    { m: 4, name: 'Apr' },
                    { m: 5, name: 'May' },
                    { m: 7, name: 'Jul' },
                    { m: 8, name: 'Aug' },
                    { m: 9, name: 'Sep' },
                    { m: 10, name: 'Oct' },
                    { m: 11, name: 'Nov' },
                    { m: 12, name: 'Dec' },
                    { m: 1, name: 'Jan' },
                    { m: 2, name: 'Feb' },
                    { m: 3, name: 'Mar' },
                  ].map((mo) => {
                    const sel = selectedMonth === mo.m;
                    return (
                      <TouchableOpacity
                        key={mo.m}
                        style={[styles.monthPill, sel && styles.monthPillActive]}
                        onPress={() => {
                          setSelectedMonth(mo.m);
                          loadAttendance(selectedStudentId, mo.m);
                        }}
                      >
                        <Text style={[styles.monthPillText, sel && styles.monthPillTextActive]}>
                          {mo.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {attendanceLoading ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={styles.loadingText}>Fetching attendance records...</Text>
                  </View>
                ) : (
                  <View style={styles.recordsBox}>
                    {Array.isArray(attendanceData) && attendanceData.length > 0 ? (
                      attendanceData.map((rec, i) => {
                        const isPresent = rec.status === 1 || rec.status === 'Present';
                        const isAbsent = rec.status === 2 || rec.status === 'Absent';
                        const isLate = rec.status === 3 || rec.status === 'Late';
                        return (
                          <View key={rec.id || i} style={styles.attRecordRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.attRecordDate}>
                                {rec.attendanceDate ? new Date(rec.attendanceDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : `Day ${i + 1}`}
                              </Text>
                              {rec.remarks ? <Text style={styles.attRecordRemarks}>{rec.remarks}</Text> : null}
                            </View>
                            <View
                              style={[
                                styles.attStatusBadge,
                                {
                                  backgroundColor: isPresent ? '#dcfce7' : isAbsent ? '#fee2e2' : isLate ? '#fef3c7' : '#f1f5f9',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.attStatusText,
                                  {
                                    color: isPresent ? '#15803d' : isAbsent ? '#b91c1c' : isLate ? '#b45309' : '#64748b',
                                  },
                                ]}
                              >
                                {isPresent ? 'PRESENT' : isAbsent ? 'ABSENT' : isLate ? 'LATE' : 'LEAVE'}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="event-busy" size={40} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No attendance records marked for this month.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* TAB 3: TIMETABLE */}
            {activeTab === 'timetable' && (
              <View>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>Weekly Class Timetable</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Class {student.className} {student.sectionName ? `(${student.sectionName})` : ''} Period Schedule
                  </Text>
                </View>

                {/* Day Selector */}
                <View style={styles.daySelectorRow}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => {
                    const sel = selectedDay === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayChip, sel && styles.dayChipActive]}
                        onPress={() => setSelectedDay(d)}
                      >
                        <Text style={[styles.dayChipText, sel && styles.dayChipTextActive]}>
                          {d.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.timetableList}>
                  {Array.isArray(timetableData) && timetableData.length > 0 ? (
                    timetableData
                      .filter((p) => !p.dayOfWeek || p.dayOfWeek === selectedDay)
                      .map((period, i) => (
                        <View key={period.id || i} style={styles.periodCard}>
                          <View style={styles.periodTimeCol}>
                            <Text style={styles.periodNum}>P{period.periodNumber || i + 1}</Text>
                            <Text style={styles.periodTime}>
                              {period.startTime ? period.startTime.slice(0, 5) : '09:00'}
                            </Text>
                          </View>
                          <View style={styles.periodDivider} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.periodSubject}>{period.subjectName || 'General Studies'}</Text>
                            <Text style={styles.periodTeacher}>
                              Teacher: {period.teacherName || 'Faculty Member'} {period.roomNo ? `• Room ${period.roomNo}` : ''}
                            </Text>
                          </View>
                        </View>
                      ))
                  ) : (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="schedule" size={40} color="#cbd5e1" />
                      <Text style={styles.emptyText}>No scheduled periods for {selectedDay}.</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* TAB 4: FEES & RECEIPTS */}
            {activeTab === 'fees' && (
              <View>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>Student Fee Ledger</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Academic Year {activeAcademicYearName || '2026-27'} Fees & Official Receipts
                  </Text>
                </View>

                {/* Fee Balances Overview */}
                <View style={styles.feeHighlightBox}>
                  <View style={styles.feeHighlightCol}>
                    <Text style={styles.feeHighlightLabel}>Total Fee</Text>
                    <Text style={styles.feeHighlightVal}>
                      ₹{Number(feeSummary.totalFee || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.feeHighlightDivider} />
                  <View style={styles.feeHighlightCol}>
                    <Text style={styles.feeHighlightLabel}>Total Paid</Text>
                    <Text style={[styles.feeHighlightVal, { color: '#16a34a' }]}>
                      ₹{Number(feeSummary.totalPaid || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.feeHighlightDivider} />
                  <View style={styles.feeHighlightCol}>
                    <Text style={styles.feeHighlightLabel}>Balance Due</Text>
                    <Text style={[styles.feeHighlightVal, { color: '#dc2626' }]}>
                      ₹{Number(feeSummary.totalPending || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Paid Receipts List */}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>PAID FEE RECEIPTS (DUAL COPY AVAILABLE)</Text>
                {Array.isArray(feeSummary.recentReceipts) && feeSummary.recentReceipts.length > 0 ? (
                  feeSummary.recentReceipts.map((r) => (
                    <View key={r.id} style={styles.receiptCard}>
                      <View style={styles.receiptCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.receiptNoText}>{r.receiptNo || `REC-${r.id}`}</Text>
                          <Text style={styles.receiptDateText}>
                            {r.receiptDate ? new Date(r.receiptDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Paid'}
                          </Text>
                        </View>
                        <Text style={styles.receiptPaidAmt}>
                          ₹{Number(r.totalPaid || r.amount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View style={styles.receiptActions}>
                        <TouchableOpacity
                          style={styles.receiptPrintBtn}
                          onPress={() => handlePrintReceipt(r.id)}
                          disabled={printingReceipt}
                        >
                          <Ionicons name="print" size={14} color="#0284c7" />
                          <Text style={styles.receiptPrintBtnText}>Print Dual Slip</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.receiptShareBtn}
                          onPress={() => handleShareReceiptPdf(r.id, r.receiptNo)}
                          disabled={printingReceipt}
                        >
                          <Ionicons name="share-social-outline" size={14} color="#059669" />
                          <Text style={styles.receiptShareBtnText}>Share PDF</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="receipt" size={36} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No payment receipts recorded yet.</Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB 5: EXAMS & REPORT CARDS */}
            {activeTab === 'exams' && (
              <View>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>Exams & Performance</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Marks obtained and terminal examination evaluations
                  </Text>
                </View>

                {examsLoading ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={styles.loadingText}>Loading exam evaluations...</Text>
                  </View>
                ) : Array.isArray(examsData) && examsData.length > 0 ? (
                  examsData.map((ex, i) => (
                    <View key={ex.examId || i} style={styles.examCard}>
                      <View style={styles.examHeader}>
                        <Text style={styles.examTitle}>{ex.examName || 'Term Examination'}</Text>
                        <View style={styles.examStatusBadge}>
                          <Text style={styles.examStatusText}>PUBLISHED</Text>
                        </View>
                      </View>

                      {/* Subject Marks Table */}
                      <View style={styles.marksTable}>
                        <View style={styles.marksTableHeader}>
                          <Text style={[styles.marksColHead, { flex: 2 }]}>Subject</Text>
                          <Text style={styles.marksColHead}>Max</Text>
                          <Text style={styles.marksColHead}>Scored</Text>
                          <Text style={styles.marksColHead}>Grade</Text>
                        </View>
                        {(ex.subjects || ex.marks || []).map((sb, j) => {
                          const pct = sb.maxMarks ? Math.round(((sb.marksObtained || 0) / sb.maxMarks) * 100) : 0;
                          const grade = pct >= 90 ? 'A1' : pct >= 80 ? 'A2' : pct >= 70 ? 'B1' : pct >= 60 ? 'B2' : pct >= 50 ? 'C1' : 'C2';
                          return (
                            <View key={j} style={styles.marksTableRow}>
                              <Text style={[styles.marksCell, { flex: 2, fontWeight: '700' }]}>
                                {sb.subjectName || sb.subject || 'Subject'}
                              </Text>
                              <Text style={styles.marksCell}>{sb.maxMarks || 100}</Text>
                              <Text style={[styles.marksCell, { color: '#0284c7', fontWeight: '800' }]}>
                                {sb.marksObtained ?? '-'}
                              </Text>
                              <Text style={[styles.marksCell, { fontWeight: '700', color: '#16a34a' }]}>
                                {grade}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="menu-book" size={40} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No exam results published yet for this session.</Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB 6: DIGITAL ID CARD */}
            {activeTab === 'idcard' && (
              <View>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>Digital Student Identity Card</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Official School Identity Verification Pass
                  </Text>
                </View>

                {/* ID Card Graphic Replica */}
                <View style={styles.idCardContainer}>
                  {/* ID Header */}
                  <View style={styles.idCardHeader}>
                    <Image
                      source={require('../../assets/dvs-logo.png')}
                      style={styles.idCardLogo}
                      resizeMode="contain"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.idCardSchoolTitle} numberOfLines={1}>
                        {branchInfo?.schoolName || user?.schoolName || 'DELHI PUBLIC SCHOOL'}
                      </Text>
                      <Text style={styles.idCardAffiliation}>
                        CBSE Affiliation No: {branchInfo?.affiliationNumber || '2130892'}
                      </Text>
                    </View>
                  </View>

                  {/* ID Body */}
                  <View style={styles.idCardBody}>
                    {student.photoUrl ? (
                      <Image source={{ uri: student.photoUrl }} style={styles.idCardPhoto} />
                    ) : (
                      <View style={styles.idCardPhotoPlaceholder}>
                        <MaterialIcons name="person" size={40} color="#0284c7" />
                      </View>
                    )}

                    <View style={styles.idCardDetails}>
                      <Text style={styles.idCardStudentName}>{student.fullName || 'Student'}</Text>
                      <Text style={styles.idCardDetailRow}>
                        <Text style={styles.idCardDetailLabel}>Class: </Text>
                        <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                          {student.className} {student.sectionName ? `(${student.sectionName})` : ''}
                        </Text>
                      </Text>
                      <Text style={styles.idCardDetailRow}>
                        <Text style={styles.idCardDetailLabel}>Adm No: </Text>
                        <Text style={{ fontWeight: '700' }}>{student.admissionNo || 'N/A'}</Text>
                      </Text>
                      <Text style={styles.idCardDetailRow}>
                        <Text style={styles.idCardDetailLabel}>Roll No: </Text>
                        <Text style={{ fontWeight: '700' }}>{student.rollNo || '-'}</Text>
                      </Text>
                      <Text style={styles.idCardDetailRow}>
                        <Text style={styles.idCardDetailLabel}>Parent: </Text>
                        <Text>{student.fatherName || student.guardianName || 'Guardian'}</Text>
                      </Text>
                      <Text style={styles.idCardDetailRow}>
                        <Text style={styles.idCardDetailLabel}>Session: </Text>
                        <Text style={{ fontWeight: '700', color: '#0284c7' }}>
                          {activeAcademicYearName || '2026-27'}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {/* ID Footer */}
                  <View style={styles.idCardFooter}>
                    <View style={styles.idCardBarcodeBox}>
                      <FontAwesome5 name="barcode" size={24} color="#0f172a" />
                      <Text style={styles.idCardBarcodeText}>{student.admissionNo || 'ID-PASS'}</Text>
                    </View>
                    <View style={styles.idCardSignatureBox}>
                      <View style={styles.idCardSignatureLine} />
                      <Text style={styles.idCardSignatureText}>Principal Signatory</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 7: NOTICES */}
            {activeTab === 'notices' && (
              <View>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>School Circulars & Notices</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Official notifications, events and holiday schedules
                  </Text>
                </View>

                {notices.length > 0 ? (
                  notices.map((n, i) => (
                    <View key={n.id || i} style={styles.fullNoticeCard}>
                      <View style={styles.fullNoticeHeader}>
                        <MaterialIcons name="campaign" size={20} color="#0284c7" />
                        <Text style={styles.fullNoticeDate}>
                          {n.sentAt ? new Date(n.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Notice'}
                        </Text>
                      </View>
                      <Text style={styles.fullNoticeTitle}>{n.title || 'Official Announcement'}</Text>
                      <Text style={styles.fullNoticeBody}>{n.message || n.content}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="campaign" size={40} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No circulars posted at this time.</Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB 8: BUS TRANSPORT */}
            {activeTab === 'transport' && (
              <View>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>School Bus & Route Info</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Transport allocation, pickup/drop timings and emergency contact
                  </Text>
                </View>

                {transport ? (
                  <View style={styles.transportCard}>
                    <View style={styles.transportHeaderRow}>
                      <MaterialIcons name="directions-bus" size={28} color="#0284c7" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.transportRouteName}>{transport.routeName || 'School Bus Route'}</Text>
                        <Text style={styles.transportVehicleNo}>
                          Vehicle No: {transport.vehicleNumber || 'UP-16-AB-1234'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.transportDivider} />

                    <View style={styles.transportDetailRow}>
                      <MaterialIcons name="location-on" size={18} color="#0284c7" />
                      <Text style={styles.transportDetailLabel}>Pickup Stop:</Text>
                      <Text style={styles.transportDetailVal}>{transport.stopName || 'Designated Bus Stop'}</Text>
                    </View>

                    <View style={styles.transportDetailRow}>
                      <MaterialIcons name="schedule" size={18} color="#0284c7" />
                      <Text style={styles.transportDetailLabel}>Timing:</Text>
                      <Text style={styles.transportDetailVal}>{transport.pickupTime || '07:30 AM'} (Morning)</Text>
                    </View>

                    <View style={styles.transportDetailRow}>
                      <MaterialIcons name="person" size={18} color="#0284c7" />
                      <Text style={styles.transportDetailLabel}>Driver:</Text>
                      <Text style={styles.transportDetailVal}>{transport.driverName || 'Authorized Driver'}</Text>
                    </View>

                    {transport.driverPhone ? (
                      <TouchableOpacity
                        style={styles.driverCallBtn}
                        onPress={() => Linking.openURL(`tel:${transport.driverPhone}`)}
                      >
                        <MaterialIcons name="phone" size={16} color="#ffffff" />
                        <Text style={styles.driverCallBtnText}>Call Driver ({transport.driverPhone})</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="directions-bus" size={40} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No bus transport currently allocated for this student.</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDark ? colors.cardBg : '#0284c7',
  },
  header: {
    backgroundColor: isDark ? colors.cardBg : '#0284c7',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    padding: 2,
  },
  headerBrand: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  portalRolePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  portalRolePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerSchoolName: {
    fontSize: 12,
    color: isDark ? '#38bdf8' : '#bae6fd',
    marginTop: 1,
  },
  themeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: isDark ? '#334155' : 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wardBar: {
    backgroundColor: isDark ? '#1e293b' : '#0369a1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wardBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#bae6fd',
  },
  wardScroll: {
    gap: 6,
  },
  wardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  wardChipActive: {
    backgroundColor: '#0284c7',
  },
  wardChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  wardChipTextActive: {
    color: '#ffffff',
  },
  profileStrip: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardBorder,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  studentAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  studentInfoCol: {
    flex: 1,
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  studentMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  studentRollText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  tabBar: {
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  mainScroll: {
    padding: 14,
    backgroundColor: colors.bg,
    minHeight: '100%',
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803d',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  sectionLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  noticeDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  examItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    gap: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  examDateBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examDateDay: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284c7',
  },
  examDateMon: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369a1',
  },
  examSubjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  examMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  shortcutBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  cardHeaderStrip: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  monthPillsScroll: {
    gap: 6,
    marginBottom: 12,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  monthPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  monthPillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  recordsBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  attRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  attRecordDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  attRecordRemarks: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  attStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  daySelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: '#0284c7',
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  dayChipTextActive: {
    color: '#ffffff',
  },
  timetableList: {
    gap: 8,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodTimeCol: {
    width: 60,
    alignItems: 'center',
  },
  periodNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284c7',
  },
  periodTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  periodDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  periodSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  periodTeacher: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  feeHighlightBox: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  feeHighlightCol: {
    flex: 1,
    alignItems: 'center',
  },
  feeHighlightDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e2e8f0',
  },
  feeHighlightLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  feeHighlightVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  receiptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  receiptCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptNoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  receiptDateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  receiptPaidAmt: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16a34a',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  receiptPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  receiptPrintBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  receiptShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  receiptShareBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  examCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  examTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  examStatusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  examStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  marksTable: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  marksTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  marksColHead: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  marksTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  marksCell: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
  },
  idCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0284c7',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  idCardHeader: {
    backgroundColor: '#0284c7',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idCardLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 2,
  },
  idCardSchoolTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  idCardAffiliation: {
    fontSize: 10,
    color: '#e0f2fe',
    marginTop: 1,
  },
  idCardBody: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  idCardPhoto: {
    width: 80,
    height: 96,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  idCardPhotoPlaceholder: {
    width: 80,
    height: 96,
    borderRadius: 6,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  idCardDetails: {
    flex: 1,
  },
  idCardStudentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  idCardDetailRow: {
    fontSize: 11.5,
    color: '#475569',
    marginBottom: 2,
  },
  idCardDetailLabel: {
    fontWeight: '700',
    color: '#64748b',
  },
  idCardFooter: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idCardBarcodeBox: {
    alignItems: 'flex-start',
  },
  idCardBarcodeText: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 1,
  },
  idCardSignatureBox: {
    alignItems: 'center',
  },
  idCardSignatureLine: {
    width: 90,
    height: 1,
    backgroundColor: '#94a3b8',
    marginBottom: 3,
  },
  idCardSignatureText: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },
  fullNoticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fullNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fullNoticeDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  fullNoticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  fullNoticeBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  transportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportRouteName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  transportVehicleNo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transportDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  transportDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  transportDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    width: 80,
  },
  transportDetailVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
  },
  driverCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    gap: 6,
  },
  driverCallBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
