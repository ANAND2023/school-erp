import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Alert,
  Platform,
  Image,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardApi, academicYearApi } from '../api/client';

const QUICK_MODULES = [
  {
    id: 'students',
    title: 'Students',
    screen: 'Students',
    icon: 'school',
    color: '#f59e0b',
    shadowColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'fees',
    title: 'Fees',
    screen: 'Fees',
    icon: 'receipt',
    color: '#8b5cf6',
    shadowColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    screen: 'Attendance',
    icon: 'calendar',
    color: '#10b981',
    shadowColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'enquiries',
    title: 'Enquiries',
    screen: 'Enquiries',
    icon: 'chatbubbles',
    color: '#0284c7',
    shadowColor: 'rgba(2, 132, 199, 0.4)',
  },
  {
    id: 'new-admission',
    title: 'Admission',
    screen: 'NewAdmission',
    icon: 'person-add',
    color: '#0f766e',
    shadowColor: 'rgba(15, 118, 110, 0.4)',
  },
  {
    id: 'gate-pass',
    title: 'Gate Pass',
    screen: 'GatePassList',
    icon: 'shield-checkmark',
    color: '#f43f5e',
    shadowColor: 'rgba(244, 63, 94, 0.4)',
  },
  {
    id: 'exams',
    title: 'Exams',
    screen: 'Exams',
    icon: 'document-text',
    color: '#ea580c',
    shadowColor: 'rgba(234, 88, 12, 0.4)',
  },
  {
    id: 'staff',
    title: 'Staff',
    screen: 'Staff',
    icon: 'people',
    color: '#6366f1',
    shadowColor: 'rgba(99, 102, 241, 0.4)',
  },
  {
    id: 'expense',
    title: 'Expenses',
    screen: 'Expenses',
    icon: 'wallet',
    color: '#16a34a',
    shadowColor: 'rgba(22, 163, 74, 0.4)',
  },
  {
    id: 'transport',
    title: 'Transport',
    screen: 'Transport',
    icon: 'bus',
    color: '#eab308',
    shadowColor: 'rgba(234, 179, 8, 0.4)',
  },
  {
    id: 'timetable',
    title: 'Timetable',
    screen: 'Timetable',
    icon: 'time',
    color: '#0284c7',
    shadowColor: 'rgba(2, 132, 199, 0.4)',
  },
  {
    id: 'notices',
    title: 'Notices',
    screen: 'Notices',
    icon: 'megaphone',
    color: '#ef4444',
    shadowColor: 'rgba(239, 68, 68, 0.4)',
  },
];

export default function HomeScreen({ navigation }) {
  const {
    user,
    logout,
    activeAcademicYearId,
    activeAcademicYearName,
    switchAcademicYear,
    fetchAcademicYears,
  } = useContext(AuthContext);

  const { theme, isDark, toggleTheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  ) + 8;

  // Draggable Floating Settings Button State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          isDragging.current = true;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (!isDragging.current || (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6)) {
          setShowSettingsModal(true);
        }
      },
    })
  ).current;

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalClasses: 0,
    totalSections: 0,
    todayAttendance: { totalMarked: 0, present: 0, absent: 0, percentage: 0 },
    feeSummary: { totalCollected: 0, totalPending: 0, totalFeeDue: 0 },
    enquiries: { total: 0, converted: 0, open: 0 },
    academicYearName: '2026-27',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Session Switch Modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionList, setSessionList] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await dashboardApi.getStats();
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
    fetchAcademicYears();
    loadSessions();
  }, [activeAcademicYearId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
    loadSessions();
  }, [activeAcademicYearId]);

  const handleOpenSessionModal = () => {
    loadSessions();
    setShowSessionModal(true);
  };

  const handleSwitchSession = async (session) => {
    try {
      await switchAcademicYear(session.id, session.name);
      setShowSessionModal(false);
      setLoading(true);
      fetchDashboardData();
      Alert.alert('Session Switched', `Active academic session is now ${session.name}.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to switch academic session.');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const displaySessionName = activeAcademicYearName || stats.academicYearName || user?.academicYearName || '2026-27';

  // Live date string
  const todayDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={isDark ? colors.cardBg : '#0284c7'}
      />

      {/* Modern Top Executive Header with Status Bar Safe Area Padding */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.cardBg : '#0284c7', paddingTop: safeTopPadding }]}>
        <View style={styles.headerLeftRow}>
          <Image
            source={require('../../assets/dvs-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerLeft}>
            <View style={styles.headerBrandRow}>
              <Text style={styles.headerBrandName} numberOfLines={1}>
                {user?.schoolName ? user.schoolName : 'Delhi Public School'}
              </Text>
              {user?.branchName ? (
                <View style={styles.branchPill}>
                  <Text style={styles.branchPillText}>{user.branchName}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.headerUserName} numberOfLines={1}>
              {user?.fullName || user?.username || 'Super Administrator'}
            </Text>

            <View style={styles.metaRow}>
              <View style={[styles.roleBadge, isDark && { backgroundColor: '#334155' }]}>
                <Text style={styles.roleBadgeText}>{user?.roleName || 'SUPER ADMIN'}</Text>
              </View>
              <View style={styles.sessionBadge}>
                <MaterialIcons name="event" size={11} color="#ffffff" />
                <Text style={styles.sessionBadgeText}>{displaySessionName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Header Actions (Theme Toggle + Quick Settings + Session) */}
        <View style={styles.headerRightActions}>
          {/* Dark / Light Mode Toggle Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, isDark && { backgroundColor: '#334155' }]}
            onPress={toggleTheme}
            activeOpacity={0.8}
            title="Toggle Dark / Light Theme"
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={17}
              color={isDark ? '#fbbf24' : '#ffffff'}
            />
          </TouchableOpacity>

          {/* Quick Settings & Control Center Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, isDark && { backgroundColor: '#334155' }]}
            onPress={() => setShowSettingsModal(true)}
            activeOpacity={0.8}
            title="Quick Controls"
          >
            <Ionicons name="settings-sharp" size={17} color="#ffffff" />
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

        {/* Operational Metrics Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Campus Overview ({displaySessionName})
          </Text>
          <TouchableOpacity onPress={handleOpenSessionModal} style={styles.changeSessionBtn}>
            <MaterialIcons name="swap-horiz" size={16} color={colors.primary} />
            <Text style={[styles.changeSessionLink, { color: colors.primary }]}>Change Session</Text>
          </TouchableOpacity>
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
            {/* ROW 1: Students & Faculty */}
            <View style={styles.statsRow}>
              {/* Card 1: Total Students */}
              <TouchableOpacity
                style={[
                  styles.statCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
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

              {/* Card 2: Faculty & Staff */}
              <TouchableOpacity
                style={[
                  styles.statCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                onPress={() => navigation.navigate('Staff')}
                activeOpacity={0.8}
              >
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Staff & Faculty</Text>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#052e16' : '#dcfce7' }]}>
                    <MaterialIcons name="groups" size={18} color="#059669" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {Number(stats.totalStaff || stats.activeStaff || 0).toLocaleString('en-IN')}
                </Text>
                <View style={styles.statSubRow}>
                  <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                    Active: {Number(stats.activeStaff || stats.totalStaff || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ROW 2: Attendance & Fee Pending */}
            <View style={styles.statsRow}>
              {/* Card 3: Attendance */}
              <TouchableOpacity
                style={[
                  styles.statCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.8}
              >
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Attendance</Text>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
                    <MaterialIcons name="event-available" size={18} color="#d97706" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: '#d97706' }]}>
                  {stats.todayAttendance?.percentage != null && stats.todayAttendance.percentage > 0
                    ? `${stats.todayAttendance.percentage}%`
                    : 'Daily'}
                </Text>
                <View style={styles.statSubRow}>
                  <MaterialIcons name="check-circle" size={12} color="#10b981" />
                  <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                    {stats.todayAttendance?.present > 0
                      ? `${stats.todayAttendance.present} Present`
                      : 'Mark Today →'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Card 4: Fee Summary */}
              <TouchableOpacity
                style={[
                  styles.statCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                onPress={() => navigation.navigate('Fees')}
                activeOpacity={0.8}
              >
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Fee Pending</Text>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#2e1065' : '#ede9fe' }]}>
                    <MaterialIcons name="account-balance-wallet" size={18} color="#7c3aed" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: isDark ? '#c084fc' : '#6d28d9', fontSize: 17 }]} numberOfLines={1}>
                  {formatCurrency(stats.feeSummary?.totalPending)}
                </Text>
                <View style={styles.statSubRow}>
                  <Text style={[styles.statSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                    Coll: {formatCurrency(stats.feeSummary?.totalCollected)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ROW 3: Enquiries & Classes */}
            <View style={styles.statsRow}>
              {/* Card 5: Enquiries */}
              <TouchableOpacity
                style={[
                  styles.statCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
                onPress={() => navigation.navigate('Enquiries')}
                activeOpacity={0.8}
              >
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Admission Leads</Text>
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? '#042f2e' : '#f0fdfa' }]}>
                    <MaterialIcons name="person-add-alt" size={18} color="#0f766e" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {Number(stats.enquiries?.total || 0).toLocaleString('en-IN')}
                </Text>
                <View style={styles.statSubRow}>
                  <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
                    Converted: {stats.enquiries?.converted || 0}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Card 6: Classes */}
              <TouchableOpacity
                style={[
                  styles.statCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
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
          </View>
        )}

        {/* Modules Grid Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Modules & Services</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ModulesHub')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Modules Hub →</Text>
          </TouchableOpacity>
        </View>

        {/* Smartphone App Launcher 4-Column Grid (Like Native Phone App Drawer) */}
        <View style={[styles.launcherContainer, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
          <View style={styles.launcherGrid}>
            {QUICK_MODULES.map((mod) => (
              <TouchableOpacity
                key={mod.id}
                style={styles.launcherItem}
                onPress={() => navigation.navigate(mod.screen)}
                activeOpacity={0.72}
              >
                {/* Native App Squircle Icon (54x54) */}
                <View style={[styles.launcherIconSquircle, { backgroundColor: mod.color, shadowColor: mod.shadowColor }]}>
                  <View style={styles.launcherGlassShine} />
                  <Ionicons name={mod.icon} size={27} color="#ffffff" />
                </View>

                {/* Clean Single-line App Name */}
                <Text
                  style={[styles.launcherLabel, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {mod.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* ACADEMIC SESSION SWITCH MODAL                            */}
      {/* ======================================================== */}
      <Modal
        visible={showSessionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSessionModal(false)}
      >
        <View style={styles.sessionModalOverlay}>
          <View style={[styles.sessionModalBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.sessionModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="date-range" size={22} color={colors.primary} />
                <Text style={[styles.sessionModalTitle, { color: colors.textPrimary }]}>
                  Select Academic Session
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSessionModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sessionModalSubtitle, { color: colors.textSecondary }]}>
              Switching session updates all student rosters, fee demands, and academic reports.
            </Text>

            {sessionLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={sessionList}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
                renderItem={({ item }) => {
                  const isCurrentActive =
                    String(item.id) === String(activeAcademicYearId) ||
                    item.name === activeAcademicYearName;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.sessionItem,
                        { backgroundColor: colors.bg, borderColor: colors.cardBorder },
                        isCurrentActive && { borderColor: colors.primary, borderWidth: 2, backgroundColor: isDark ? '#082f49' : '#f0f9ff' },
                      ]}
                      onPress={() => handleSwitchSession(item)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={[
                              styles.sessionItemName,
                              { color: colors.textPrimary },
                              isCurrentActive && { color: colors.primary, fontWeight: '800' },
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.isCurrent ? (
                            <View style={styles.defaultPill}>
                              <Text style={styles.defaultPillText}>System Default</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={[styles.sessionItemDates, { color: colors.textSecondary }]}>
                          {item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN') : 'Start'} —{' '}
                          {item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN') : 'End'}
                        </Text>
                      </View>

                      {isCurrentActive ? (
                        <MaterialIcons name="check-circle" size={22} color={colors.primary} />
                      ) : (
                        <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* DRAGGABLE FLOATING SETTINGS BUTTON (MOVE ANYWHERE)       */}
      {/* ======================================================== */}
      <Animated.View
        style={[
          styles.draggableFab,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setShowSettingsModal(true)}
          style={[styles.fabCircle, isDark ? { backgroundColor: '#2563eb' } : { backgroundColor: '#0284c7' }]}
        >
          <Ionicons name="settings" size={24} color="#ffffff" />
          <View style={styles.fabPulseBadge} />
        </TouchableOpacity>
      </Animated.View>

      {/* ======================================================== */}
      {/* QUICK SETTINGS & CONTROL CENTER MODAL                    */}
      {/* ======================================================== */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.controlModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setShowSettingsModal(false)}
          />
          <View style={[styles.controlSheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {/* Top Sheet Drag Indicator */}
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />

            <View style={styles.controlSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.controlSheetIconWrap, { backgroundColor: isDark ? '#082f49' : '#e0f2fe' }]}>
                  <Ionicons name="options-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.controlSheetTitle, { color: colors.textPrimary }]}>
                    Executive Controls
                  </Text>
                  <Text style={[styles.controlSheetSub, { color: colors.textSecondary }]}>
                    Quick Settings & Session Controls
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={[styles.controlCloseBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* User Profile Card */}
            <View style={[styles.controlProfileCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder }]}>
              <Image
                source={require('../../assets/dvs-logo.png')}
                style={styles.controlAvatar}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.controlSchoolName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {user?.schoolName || 'Delhi Public School'}
                </Text>
                <Text style={[styles.controlUserName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {user?.fullName || user?.username || 'Super Administrator'}
                </Text>
                <View style={styles.controlBadgeRow}>
                  <View style={styles.controlRoleBadge}>
                    <Text style={styles.controlRoleBadgeText}>{user?.roleName || 'SUPER ADMIN'}</Text>
                  </View>
                  <View style={styles.controlStatusBadge}>
                    <View style={styles.controlOnlineDot} />
                    <Text style={styles.controlStatusText}>{user?.branchName || 'Main Campus'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Control Options List */}
            <View style={styles.controlOptionsList}>
              {/* Option 1: Dark / Light Mode Switch */}
              <TouchableOpacity
                style={[styles.controlOptionRow, { borderColor: colors.cardBorder }]}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#312e81' : '#fef3c7' }]}>
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={20}
                    color={isDark ? '#a5b4fc' : '#d97706'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    Theme Mode
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Currently {isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
                  </Text>
                </View>
                <View style={[styles.themePill, { backgroundColor: isDark ? '#4338ca' : '#0284c7' }]}>
                  <Text style={styles.themePillText}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Academic Session Switch */}
              <TouchableOpacity
                style={[styles.controlOptionRow, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowSessionModal(true), 250);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#064e3b' : '#dcfce7' }]}>
                  <Ionicons name="calendar" size={20} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    Academic Session
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Active: {displaySessionName}
                  </Text>
                </View>
                <View style={styles.sessionChangePill}>
                  <Text style={styles.sessionChangePillText}>Change 📅</Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Refresh Campus Metrics */}
              <TouchableOpacity
                style={[styles.controlOptionRow, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  setShowSettingsModal(false);
                  onRefresh();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#0c4a6e' : '#e0f2fe' }]}>
                  <Ionicons name="refresh" size={20} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    Refresh Metrics
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Sync fees, attendance & leads
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Logout Action Button */}
            <TouchableOpacity
              style={styles.controlLogoutBtn}
              onPress={() => {
                setShowSettingsModal(false);
                Alert.alert(
                  'Confirm Logout',
                  'Are you sure you want to log out from School ERP?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: handleLogout },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={19} color="#ef4444" />
              <Text style={styles.controlLogoutText}>Logout from School ERP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrandName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  branchPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  branchPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e0f2fe',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sessionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Header Right Actions
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heroLeft: {
    flex: 1,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  heroDateText: {
    fontSize: 11.5,
    color: '#e0f2fe',
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 11.5,
    color: '#bae6fd',
    marginBottom: 14,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  heroActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  changeSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeSessionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },

  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },

  // Stats Grid
  statsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statSubText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 4-Column Smartphone App Launcher Grid (Like Android / iOS App Drawer)
  launcherContainer: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  launcherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },
  launcherItem: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  launcherIconSquircle: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    position: 'relative',
    overflow: 'hidden',
  },
  launcherGlassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  launcherLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.1,
  },

  // Draggable Floating Action Button
  draggableFab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 9999,
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  fabPulseBadge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },

  // Quick Controls & Settings Modal
  controlModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  controlSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  controlSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlSheetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  controlSheetSub: {
    fontSize: 12,
    marginTop: 1,
  },
  controlCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  controlAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  controlSchoolName: {
    fontSize: 15,
    fontWeight: '800',
  },
  controlUserName: {
    fontSize: 12.5,
    marginTop: 1,
  },
  controlBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  controlRoleBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  controlRoleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  controlStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  controlOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  controlStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  controlOptionsList: {
    gap: 10,
    marginBottom: 16,
  },
  controlOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  sessionChangePill: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sessionChangePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  controlLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  controlLogoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Session Modal
  sessionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sessionModalBox: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  sessionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sessionModalSubtitle: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sessionItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionItemDates: {
    fontSize: 11,
    marginTop: 2,
  },
  defaultPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803d',
  },
});
