import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { dashboardApi, academicYearApi } from '../api/client';

export default function DashboardScreen({ navigation }) {
  const { user, isSuperAdmin, activeAcademicYearId, activeAcademicYearName, switchAcademicYear } = useContext(AuthContext);
  const { isDark, colors, toggleTheme } = useContext(ThemeContext);
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [stats, setStats] = useState({
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
    academicYearName: '2026-27',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Role Views
  const isAccountantRole = user?.userType === 5 || /account|cashier|fee/i.test(user?.roleName || '');
  const isTeacherRole = user?.userType === 4 || /teacher|faculty|educator/i.test(user?.roleName || '');
  const isFrontDeskRole = /clerk|enquir|reception|counsel|admission/i.test(user?.roleName || '');

  const defaultRoleView = isAccountantRole
    ? 'accounts'
    : isTeacherRole
    ? 'academics'
    : isFrontDeskRole
    ? 'admissions'
    : 'executive';

  const [activeRoleView, setActiveRoleView] = useState(defaultRoleView);
  const [selectedMonthBar, setSelectedMonthBar] = useState(null);
  const [birthdayFilter, setBirthdayFilter] = useState('all');
  const [recentTab, setRecentTab] = useState('receipts');
  const [showAllClasses, setShowAllClasses] = useState(false);

  // Session Switch Modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionList, setSessionList] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  const displaySessionName = activeAcademicYearName || stats.academicYearName || '2026-27';
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '₹ 0';
    return `₹ ${Number(val).toLocaleString('en-IN')}`;
  };

  const recoveryPercentage = useMemo(() => {
    const coll = Number(stats.feeSummary?.totalCollected || 0);
    const pend = Number(stats.feeSummary?.totalPending || 0);
    const total = coll + pend;
    return total > 0 ? Math.round((coll / total) * 100) : 0;
  }, [stats.feeSummary]);

  const fetchDashboardData = async () => {
    try {
      const res = await dashboardApi.getStats({ academicYearId: activeAcademicYearId });
      if (res.data?.success && res.data.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.warn('Dashboard stats fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSessions = async () => {
    try {
      setSessionLoading(true);
      const res = await academicYearApi.getAcademicYears();
      if (res.data?.success && res.data.data) {
        setSessionList(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load academic years:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    loadSessions();
  }, [activeAcademicYearId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
    loadSessions();
  }, [activeAcademicYearId]);

  const handleSwitchSession = async (session) => {
    try {
      setShowSessionModal(false);
      if (switchAcademicYear) {
        await switchAcademicYear(session.id, session.name);
      }
    } catch (e) {
      console.warn('Failed to switch session:', e);
    }
  };

  const handleWishBirthday = (person) => {
    const rawMobile = person.mobile || person.phone || '';
    const cleanMobile = rawMobile.replace(/[^0-9]/g, '');
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const greeting = encodeURIComponent(
      `Dear ${person.fullName}, wishing you a very Happy Birthday! 🎉 May this year bring you joy, good health, and success. - Best wishes from ${user?.schoolName || 'School Management'}`
    );
    if (phone) {
      Linking.openURL(`https://wa.me/${phone}?text=${greeting}`).catch(() => {
        Alert.alert('Notice', 'Unable to open WhatsApp.');
      });
    } else {
      Alert.alert(
        'Birthday Wish',
        `No phone number recorded for ${person.fullName}.\n\nGreeting:\nDear ${person.fullName}, wishing you a very Happy Birthday! 🎉`
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={isDark ? colors.cardBg : '#0284c7'}
      />

      {/* Header Bar */}
      <View style={[styles.topHeader, { backgroundColor: isDark ? colors.cardBg : '#0284c7' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.topHeaderTitle}>Campus Dashboard</Text>
            <Text style={styles.topHeaderSubtitle}>
              {user?.schoolName || 'School ERP'} • Session {displaySessionName}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Executive Hero Banner Card */}
        <View
          style={[
            styles.heroCard,
            isDark
              ? { backgroundColor: '#1e293b', borderColor: '#334155' }
              : { backgroundColor: '#0284c7', borderColor: '#0284c7' },
          ]}
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroDateRow}>
              <Ionicons name="calendar-outline" size={13} color="#bae6fd" />
              <Text style={styles.heroDateText}>{todayDateStr}</Text>
            </View>

            <Text style={styles.heroTitle}>Campus Executive Dashboard</Text>
            <Text style={styles.heroSubtitle}>
              Session {displaySessionName} • Real-time Academic & Fee Operations
            </Text>

            {/* Quick Action Pills */}
            <View style={styles.heroActionRow}>
              {isSuperAdmin && (
                <TouchableOpacity
                  style={[styles.heroActionBtn, { backgroundColor: '#312e81' }]}
                  onPress={() => navigation.navigate('SuperAdmin')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shield-checkmark" size={15} color="#ffffff" />
                  <Text style={[styles.heroActionBtnText, { color: '#ffffff' }]}>Super Admin</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => navigation.navigate('Fees')}
                activeOpacity={0.85}
              >
                <MaterialIcons name="receipt-long" size={15} color="#0284c7" />
                <Text style={styles.heroActionBtnText}>Collect Fee</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.85}
              >
                <MaterialIcons name="event-available" size={15} color="#0284c7" />
                <Text style={styles.heroActionBtnText}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => navigation.navigate('Enquiries')}
                activeOpacity={0.85}
              >
                <MaterialIcons name="person-add" size={15} color="#0284c7" />
                <Text style={styles.heroActionBtnText}>Enquiries</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dashboard Role Switcher & Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Campus Analytics ({displaySessionName})
          </Text>
          <TouchableOpacity onPress={() => setShowSessionModal(true)} style={styles.changeSessionBtn}>
            <MaterialIcons name="swap-horiz" size={16} color={colors.primary} />
            <Text style={[styles.changeSessionLink, { color: colors.primary }]}>Change Session</Text>
          </TouchableOpacity>
        </View>

        {/* Role-Based Dashboard View Tabs */}
        <View style={styles.roleTabRow}>
          {[
            { id: 'executive', label: 'Executive', icon: 'business' },
            { id: 'accounts', label: 'Accounts', icon: 'wallet' },
            { id: 'academics', label: 'Academics', icon: 'school' },
            { id: 'admissions', label: 'Admissions', icon: 'person-add' },
          ].map((tab) => {
            const active = activeRoleView === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.roleTabBtn,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                ]}
                onPress={() => setActiveRoleView(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={active ? '#ffffff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    { color: active ? '#ffffff' : colors.textPrimary, fontWeight: active ? '800' : '600' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading live campus metrics...
            </Text>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            {/* VIEW 1: EXECUTIVE */}
            {activeRoleView === 'executive' && (
              <>
                <View style={styles.statsRow}>
                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Students')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Students</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#082f49' : '#e0f2fe' }]}>
                        <MaterialIcons name="school" size={18} color="#0284c7" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {Number(stats.totalStudents || stats.activeStudents || 0).toLocaleString('en-IN')}
                    </Text>
                    <View style={styles.statSubRow}>
                      <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Active: {Number(stats.activeStudents || stats.totalStudents || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Staff')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Staff</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#2e1065' : '#ede9fe' }]}>
                        <MaterialIcons name="people" size={18} color="#8b5cf6" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {stats.totalStaff || stats.activeStaff || 0}
                    </Text>
                    <View style={styles.statSubRow}>
                      <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Active: {stats.activeStaff || stats.totalStaff || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Attendance')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's Attendance</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#052e16' : '#dcfce7' }]}>
                        <MaterialIcons name="check-circle" size={18} color="#10b981" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: '#10b981' }]}>
                      {stats.todayAttendance?.percentage || 0}%
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        {stats.todayAttendance?.present || 0} Present / {stats.todayAttendance?.absent || 0} Absent
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Masters')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Classes & Sections</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#1e1b4b' : '#e0e7ff' }]}>
                        <MaterialIcons name="meeting-room" size={18} color="#4338ca" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {stats.totalClasses || 0}
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Sections: {stats.totalSections || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* VIEW 2: ACCOUNTS */}
            {activeRoleView === 'accounts' && (
              <>
                <View style={styles.statsRow}>
                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Fees')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Fee Collected (AY)</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#052e16' : '#dcfce7' }]}>
                        <MaterialIcons name="account-balance-wallet" size={18} color="#10b981" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: '#10b981', fontSize: 18 }]} numberOfLines={1}>
                      {formatCurrency(stats.feeSummary?.totalCollected)}
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Session: {displaySessionName}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Reports', { reportCategory: 'fees' })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Outstanding Dues</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
                        <MaterialIcons name="hourglass-empty" size={18} color="#d97706" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: '#d97706', fontSize: 18 }]} numberOfLines={1}>
                      {formatCurrency(stats.feeSummary?.totalPending)}
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Pending pupil balances
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('FeeOperations', { tab: 'structure' })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Fee Recovery Rate</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#082f49' : '#e0f2fe' }]}>
                        <MaterialIcons name="check-circle" size={18} color="#0284c7" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: '#0284c7' }]}>
                      {recoveryPercentage}%
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Of assessed fees collected
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Fees')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recent Receipts</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#2e1065' : '#ede9fe' }]}>
                        <MaterialIcons name="receipt-long" size={18} color="#8b5cf6" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {stats.recentFeeReceipts?.length || 0}
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Recent fee vouchers
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* VIEW 3: ACADEMICS */}
            {activeRoleView === 'academics' && (
              <>
                <View style={styles.statsRow}>
                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Attendance')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's Attendance</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
                        <MaterialIcons name="event-available" size={18} color="#d97706" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: '#d97706' }]}>
                      {stats.todayAttendance?.percentage || 0}%
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        {stats.todayAttendance?.present || 0} Present / {stats.todayAttendance?.absent || 0} Absent
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Students')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Enrolled Learners</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#082f49' : '#e0f2fe' }]}>
                        <MaterialIcons name="school" size={18} color="#0284c7" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {Number(stats.totalStudents || stats.activeStudents || 0).toLocaleString('en-IN')}
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        {stats.activeStudents || 0} Active Learners
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* VIEW 4: ADMISSIONS */}
            {activeRoleView === 'admissions' && (
              <>
                <View style={styles.statsRow}>
                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Enquiries')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Enquiries</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#082f49' : '#e0f2fe' }]}>
                        <MaterialIcons name="contact-support" size={18} color="#0284c7" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {Number(stats.enquiries?.total || 0).toLocaleString('en-IN')}
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Session leads registered
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('Enquiries')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statHeaderRow}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open Follow-ups</Text>
                      <View style={[styles.statIconBox, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
                        <MaterialIcons name="pending-actions" size={18} color="#d97706" />
                      </View>
                    </View>
                    <Text style={[styles.statValue, { color: '#d97706' }]}>
                      {stats.enquiries?.open || 0}
                    </Text>
                    <View style={styles.statSubRow}>
                      <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                        Leads awaiting call/contact
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* COMPREHENSIVE VISUAL CHARTS & ANALYTICS SECTION          */}
        {/* ======================================================== */}
        <View style={styles.analyticsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="stats-chart" size={17} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Campus Analytics & Insights
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>
              Real-time Trends
            </Text>
          </View>

          {/* CHART 1: MONTHLY FEE COLLECTION BAR CHART */}
          <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
            <View style={styles.chartHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.chartIconBadge, { backgroundColor: isDark ? '#082f49' : '#e0f2fe' }]}>
                  <Ionicons name="bar-chart" size={16} color="#0284c7" />
                </View>
                <View>
                  <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Monthly Fee Collection</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Past 6 months collection trend</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981' }}>
                ₹ {(stats.monthlyFeeCollection || []).reduce((acc, m) => acc + (m.collectedAmount || 0), 0).toLocaleString('en-IN')}
              </Text>
            </View>

            {selectedMonthBar ? (
              <View style={[styles.chartTooltipPill, { backgroundColor: isDark ? '#1e293b' : '#f0fdf4', borderColor: '#10b981' }]}>
                <Ionicons name="calendar-outline" size={13} color="#10b981" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>
                  {selectedMonthBar.monthName}: ₹ {selectedMonthBar.collectedAmount?.toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null}

            <View style={styles.barChartContainer}>
              {(() => {
                const list = stats.monthlyFeeCollection || [];
                const maxVal = Math.max(...list.map((m) => m.collectedAmount || 0), 10000);

                return list.map((item, idx) => {
                  const amt = item.collectedAmount || 0;
                  const ratio = Math.min(1, Math.max(0.06, amt / maxVal));
                  const barH = Math.round(ratio * 95);
                  const isSelected = selectedMonthBar?.monthName === item.monthName;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.barColumn}
                      onPress={() => setSelectedMonthBar(isSelected ? null : item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: barH,
                              backgroundColor: isSelected
                                ? '#0284c7'
                                : (colors.primary || '#0284c7'),
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.barXLabel,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                          isSelected && { fontWeight: '800' },
                        ]}
                      >
                        {(item.monthName || '').substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          </View>

          {/* CHART 2: TODAY'S ATTENDANCE BREAKDOWN */}
          <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
            <View style={styles.chartHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.chartIconBadge, { backgroundColor: isDark ? '#052e16' : '#dcfce7' }]}>
                  <Ionicons name="people" size={16} color="#10b981" />
                </View>
                <View>
                  <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Live Campus Attendance</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Daily student headcount</Text>
                </View>
              </View>
              <View style={[styles.pillBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>
                  {stats.todayAttendance?.percentage || 0}% Present
                </Text>
              </View>
            </View>

            <View style={styles.attendanceGrid}>
              <View style={[styles.attPill, { backgroundColor: isDark ? '#052e16' : '#ecfdf5' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>PRESENT</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#10b981' }}>{stats.todayAttendance?.present || 0}</Text>
              </View>
              <View style={[styles.attPill, { backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#dc2626' }}>ABSENT</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ef4444' }}>{stats.todayAttendance?.absent || 0}</Text>
              </View>
              <View style={[styles.attPill, { backgroundColor: isDark ? '#451a03' : '#fffbeb' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>HALF-DAY</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#f59e0b' }}>{stats.todayAttendance?.halfDay || 0}</Text>
              </View>
              <View style={[styles.attPill, { backgroundColor: isDark ? '#082f49' : '#f0f9ff' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7' }}>LEAVE</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0284c7' }}>{stats.todayAttendance?.leave || 0}</Text>
              </View>
            </View>
          </View>

          {/* CHART 3: BIRTHDAYS & CELEBRATIONS */}
          <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
            <View style={styles.chartHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.chartIconBadge, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
                  <Ionicons name="gift" size={16} color="#f59e0b" />
                </View>
                <View>
                  <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>🎂 Birthdays & Celebrations</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Send greetings in 1 tap!</Text>
                </View>
              </View>
            </View>

            {(() => {
              const today = stats.birthdays?.todayBirthdays || [];
              const upcoming = stats.birthdays?.upcomingBirthdays || [];
              const all = [...today, ...upcoming];
              const displayed = all.filter((b) => {
                if (birthdayFilter === 'students') return b.roleType === 'Student';
                if (birthdayFilter === 'staff') return b.roleType === 'Staff';
                return true;
              });

              return (
                <View style={{ gap: 10, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { id: 'all', label: `All (${all.length})` },
                      { id: 'students', label: `Students (${all.filter((b) => b.roleType === 'Student').length})` },
                      { id: 'staff', label: `Staff (${all.filter((b) => b.roleType === 'Staff').length})` },
                    ].map((f) => {
                      const active = birthdayFilter === f.id;
                      return (
                        <TouchableOpacity
                          key={f.id}
                          style={[
                            styles.bdayFilterChip,
                            active
                              ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }
                              : { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' },
                          ]}
                          onPress={() => setBirthdayFilter(f.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#ffffff' : colors.textPrimary }}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {displayed.length === 0 ? (
                    <View style={styles.emptyBdayBox}>
                      <Ionicons name="balloon-outline" size={24} color="#94a3b8" />
                      <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
                        No upcoming birthdays in the next 14 days.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {displayed.slice(0, 4).map((person, idx) => {
                        const isToday = (stats.birthdays?.todayBirthdays || []).some((b) => b.fullName === person.fullName);
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.bdayPersonCard,
                              isToday
                                ? { backgroundColor: isDark ? '#3b2505' : '#fefce8', borderColor: '#eab308' }
                                : { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={[styles.bdayAvatar, { backgroundColor: isToday ? '#eab308' : colors.primary }]}>
                                <Text style={styles.bdayAvatarText}>{(person.fullName || '?')[0].toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.bdayName, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {person.fullName}
                                  </Text>
                                  {isToday && (
                                    <View style={styles.todayBdayBadge}>
                                      <Text style={styles.todayBdayBadgeText}>🎉 TODAY</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[styles.bdayRoleText, { color: colors.textSecondary }]}>
                                  {person.roleType} • {person.className || person.designation || 'Campus'}
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={styles.whatsAppWishBtn}
                              onPress={() => handleWishBirthday(person)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                              <Text style={styles.whatsAppWishBtnText}>Wish</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* CHART 4: RECENT ACTIVITY QUICK FEED */}
          <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
            <View style={styles.chartHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.chartIconBadge, { backgroundColor: isDark ? '#042f2e' : '#ccfbf1' }]}>
                  <Ionicons name="flash" size={16} color="#0f766e" />
                </View>
                <View>
                  <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Recent Activity Feed</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Live transactions and admissions</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
              <TouchableOpacity
                style={[
                  styles.recentTabBtn,
                  recentTab === 'receipts'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' },
                ]}
                onPress={() => setRecentTab('receipts')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: recentTab === 'receipts' ? '#ffffff' : colors.textPrimary }}>
                  Recent Receipts ({stats.recentFeeReceipts?.length || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.recentTabBtn,
                  recentTab === 'admissions'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' },
                ]}
                onPress={() => setRecentTab('admissions')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: recentTab === 'admissions' ? '#ffffff' : colors.textPrimary }}>
                  New Admissions ({stats.recentAdmissions?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {recentTab === 'receipts' ? (
              (stats.recentFeeReceipts || []).length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary, paddingVertical: 12, textAlign: 'center' }}>
                  No recent fee receipts recorded.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {(stats.recentFeeReceipts || []).slice(0, 5).map((r, idx) => (
                    <View key={r.id || idx} style={[styles.recentItemRow, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recentItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {r.studentName} • {r.className}
                        </Text>
                        <Text style={[styles.recentItemSub, { color: colors.textSecondary }]}>
                          Receipt #{r.receiptNo} • {r.paymentMode || 'Cash'}
                        </Text>
                      </View>
                      <Text style={styles.recentItemAmt}>
                        ₹ {Number(r.amountPaid || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            ) : (
              (stats.recentAdmissions || []).length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary, paddingVertical: 12, textAlign: 'center' }}>
                  No recent admissions recorded.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {(stats.recentAdmissions || []).slice(0, 5).map((a, idx) => (
                    <View key={a.id || idx} style={[styles.recentItemRow, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recentItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {a.fullName}
                        </Text>
                        <Text style={[styles.recentItemSub, { color: colors.textSecondary }]}>
                          Adm #{a.admissionNo} • Class {a.className} {a.sectionName ? `(${a.sectionName})` : ''}
                        </Text>
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: '#dcfce7' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#16a34a' }}>Enrolled</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* Academic Year Switcher Modal */}
      <Modal
        visible={showSessionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSessionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.sessionModalContent, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.sessionModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="event" size={20} color={colors.primary} />
                <Text style={[styles.sessionModalTitle, { color: colors.textPrimary }]}>Switch Academic Session</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSessionModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {sessionLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 260 }}>
                {sessionList.map((item) => {
                  const isCurrentActive = String(item.id) === String(activeAcademicYearId);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.sessionItem,
                        { borderColor: isCurrentActive ? colors.primary : colors.cardBorder },
                        isCurrentActive && { backgroundColor: isDark ? '#082f49' : '#e0f2fe' },
                      ]}
                      onPress={() => handleSwitchSession(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sessionItemName, { color: colors.textPrimary }, isCurrentActive && { color: colors.primary, fontWeight: '800' }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.sessionItemDates, { color: colors.textSecondary }]}>
                          {item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN') : 'Start'} — {item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN') : 'End'}
                        </Text>
                      </View>
                      {isCurrentActive && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      padding: 4,
    },
    topHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
    },
    topHeaderSubtitle: {
      fontSize: 11,
      color: '#e0f2fe',
    },
    themeToggleBtn: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    scrollContent: {
      paddingBottom: 40,
    },
    heroCard: {
      marginHorizontal: 14,
      marginTop: 12,
      marginBottom: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    heroLeft: {
      gap: 4,
    },
    heroDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    heroDateText: {
      fontSize: 11,
      color: '#bae6fd',
      fontWeight: '600',
    },
    heroTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#ffffff',
    },
    heroSubtitle: {
      fontSize: 11,
      color: '#e0f2fe',
      marginBottom: 6,
    },
    heroActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    heroActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#ffffff',
    },
    heroActionBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0284c7',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginTop: 10,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    changeSessionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    changeSessionLink: {
      fontSize: 12,
      fontWeight: '700',
    },
    roleTabRow: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      gap: 6,
      marginBottom: 10,
    },
    roleTabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
    },
    roleTabText: {
      fontSize: 11,
    },
    loadingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 24,
    },
    loadingText: {
      fontSize: 13,
    },
    statsContainer: {
      paddingHorizontal: 14,
      gap: 10,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 4,
    },
    statHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    statIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      marginVertical: 2,
    },
    statSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statSubText: {
      fontSize: 10,
    },
    analyticsSection: {
      marginTop: 14,
      paddingHorizontal: 14,
      gap: 10,
    },
    chartCard: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 10,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chartIconBadge: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    chartSubtitle: {
      fontSize: 10,
    },
    chartTooltipPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    barChartContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: 125,
      paddingTop: 10,
    },
    barColumn: {
      alignItems: 'center',
      flex: 1,
    },
    barTrack: {
      width: 22,
      height: 95,
      justifyContent: 'flex-end',
      borderRadius: 6,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: 6,
    },
    barXLabel: {
      fontSize: 10,
      marginTop: 4,
    },
    pillBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    attendanceGrid: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    attPill: {
      flex: 1,
      padding: 8,
      borderRadius: 8,
      alignItems: 'center',
      gap: 2,
    },
    bdayFilterChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
    },
    emptyBdayBox: {
      alignItems: 'center',
      paddingVertical: 14,
      gap: 6,
    },
    bdayPersonCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    bdayAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bdayAvatarText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    bdayName: {
      fontSize: 12,
      fontWeight: '700',
    },
    todayBdayBadge: {
      backgroundColor: '#fef08a',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    todayBdayBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#854d0e',
    },
    bdayRoleText: {
      fontSize: 10,
    },
    whatsAppWishBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#22c55e',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    whatsAppWishBtnText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '700',
    },
    recentTabBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
    },
    recentItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    recentItemTitle: {
      fontSize: 12,
      fontWeight: '700',
    },
    recentItemSub: {
      fontSize: 10,
      marginTop: 2,
    },
    recentItemAmt: {
      fontSize: 13,
      fontWeight: '800',
      color: '#10b981',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    sessionModalContent: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    sessionModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sessionModalTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
    },
    sessionItemName: {
      fontSize: 13,
      fontWeight: '700',
    },
    sessionItemDates: {
      fontSize: 10,
      marginTop: 2,
    },
  });
