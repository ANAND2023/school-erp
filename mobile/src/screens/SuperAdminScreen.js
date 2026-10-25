import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { superAdminApi } from '../api/client';

export default function SuperAdminScreen({ navigation }) {
  const { user, isSuperAdmin, logout } = useContext(AuthContext);
  const { isDark, colors } = useTheme();

  const [activeTab, setActiveTab] = useState('schools'); // 'schools' | 'plans' | 'audit' | 'settings'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // KPIs
  const [kpis, setKpis] = useState({
    totalSchools: 0,
    activeSchools: 0,
    totalStudents: 0,
    activeStudents: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
  });

  // Schools list
  const [schools, setSchools] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Plans list
  const [plans, setPlans] = useState([]);

  // Audit logs list
  const [auditLogs, setAuditLogs] = useState([]);

  // Onboard School Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    branchName: 'Main Campus',
    code: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    adminUsername: 'admin',
    adminPassword: '',
    planId: null,
  });
  const [submittingOnboard, setSubmittingOnboard] = useState(false);

  // Reset Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Edit School Profile Modal State
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [submittingEditSchool, setSubmittingEditSchool] = useState(false);
  const [editSchoolForm, setEditSchoolForm] = useState({
    name: '',
    code: '',
    slug: '',
    affiliationNumber: '',
    contactNumber: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    status: 'Active',
    isActive: true,
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.allSettled([
        fetchKpis(),
        fetchSchools(),
        fetchPlans(),
        fetchAuditLogs(),
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
  };

  const fetchKpis = async () => {
    try {
      const res = await superAdminApi.getDashboardKpis();
      const payload = res.data?.data || res.data || res;
      if (payload && (res.data?.success || res?.success || payload.totalSchools !== undefined || res.status === 200)) {
        setKpis(payload);
      }
    } catch (e) {
      console.warn('SuperAdmin KPIs fetch error:', e);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await superAdminApi.getTenants({ page: 1, limit: 100 });
      const payload = res.data?.data || res.data || res;
      const list = Array.isArray(payload) ? payload : (payload.items || []);
      if (list) {
        setSchools(list);
      }
    } catch (e) {
      console.warn('SuperAdmin schools fetch error:', e);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await superAdminApi.getPlans();
      const payload = res.data?.data || res.data || res;
      const list = Array.isArray(payload) ? payload : (payload.items || []);
      if (list) {
        setPlans(list);
      }
    } catch (e) {
      console.warn('SuperAdmin plans fetch error:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await superAdminApi.getAuditLogs({ limit: 50 });
      const payload = res.data?.data || res.data || res;
      const list = Array.isArray(payload) ? payload : (payload.items || []);
      if (list) {
        setAuditLogs(list);
      }
    } catch (e) {
      console.warn('SuperAdmin audit logs fetch error:', e);
    }
  };

  const handleOnboardSchool = async () => {
    if (!onboardForm.name.trim()) {
      Alert.alert('Validation Error', 'School Name is required.');
      return;
    }
    if (!onboardForm.adminPassword || onboardForm.adminPassword.length < 6) {
      Alert.alert('Validation Error', 'Admin Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmittingOnboard(true);
      const res = await superAdminApi.createTenant(onboardForm);
      const isSuccess = res.data?.success || res?.success || res.status === 200;
      if (isSuccess) {
        Alert.alert('Success', `School "${onboardForm.name}" onboarded successfully!`);
        setShowOnboardModal(false);
        setOnboardForm({
          name: '',
          branchName: 'Main Campus',
          code: '',
          email: '',
          phone: '',
          city: '',
          address: '',
          adminUsername: 'admin',
          adminPassword: '',
          planId: null,
        });
        await fetchSchools();
        await fetchKpis();
      } else {
        Alert.alert('Error', res.data?.message || res?.message || 'Failed to onboard school.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Network error.');
    } finally {
      setSubmittingOnboard(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmittingPassword(true);
      const res = await superAdminApi.resetAdminPassword(selectedSchool.id, newAdminPassword);
      const isSuccess = res.data?.success || res?.success || res.status === 200;
      if (isSuccess) {
        Alert.alert('Success', `Admin password for "${selectedSchool.name}" has been updated.`);
        setShowPasswordModal(false);
        setNewAdminPassword('');
      } else {
        Alert.alert('Error', res.data?.message || res?.message || 'Failed to reset password.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleOpenEditSchool = (sch) => {
    setEditingSchool(sch);
    setEditSchoolForm({
      name: sch.name || '',
      code: sch.code || '',
      slug: sch.slug || (sch.code || sch.name || 'school').toLowerCase().replace(/\s+/g, '-'),
      affiliationNumber: sch.affiliationNumber || '',
      contactNumber: sch.contactNumber || sch.phone || '',
      email: sch.email || '',
      website: sch.website || '',
      address: sch.address || '',
      city: sch.city || '',
      state: sch.state || '',
      pincode: sch.pincode || '',
      status: sch.status || (sch.isActive !== false ? 'Active' : 'Suspended'),
      isActive: sch.isActive !== false,
    });
    setShowEditSchoolModal(true);
  };

  const handleUpdateSchool = async () => {
    if (!editSchoolForm.name.trim()) {
      Alert.alert('Validation Error', 'School Name is required.');
      return;
    }
    if (!editSchoolForm.code.trim()) {
      Alert.alert('Validation Error', 'School Code is required.');
      return;
    }

    try {
      setSubmittingEditSchool(true);
      const res = await superAdminApi.updateTenant(editingSchool.id, editSchoolForm);
      const isSuccess = res.data?.success || res?.success || res.status === 200;
      if (isSuccess) {
        Alert.alert('Success', `School "${editSchoolForm.name}" updated successfully.`);
        setShowEditSchoolModal(false);
        fetchSchools();
      } else {
        Alert.alert('Error', res.data?.message || res?.message || 'Failed to update school.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Network error.');
    } finally {
      setSubmittingEditSchool(false);
    }
  };

  const handleToggleSchoolStatus = (sch) => {
    const isCurrentlyActive = sch.isActive !== false && sch.status !== 'Suspended';
    const newStatus = isCurrentlyActive ? 'Suspended' : 'Active';
    Alert.alert(
      `${isCurrentlyActive ? 'Suspend / Deactivate' : 'Activate'} School`,
      `Are you sure you want to ${isCurrentlyActive ? 'suspend' : 'activate'} "${sch.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCurrentlyActive ? 'Suspend' : 'Activate',
          style: isCurrentlyActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await superAdminApi.updateTenant(sch.id, {
                ...sch,
                slug: sch.slug || (sch.code || sch.name || 'sch').toLowerCase().replace(/\s+/g, '-'),
                status: newStatus,
                isActive: !isCurrentlyActive,
              });
              Alert.alert('Success', `School "${sch.name}" is now ${newStatus}.`);
              fetchSchools();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to change status.');
            }
          },
        },
      ]
    );
  };

  const filteredSchools = useMemo(() => {
    if (!searchQuery.trim()) return schools;
    const q = searchQuery.toLowerCase();
    return schools.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q))
    );
  }, [schools, searchQuery]);

  const isEffectiveSuperAdmin =
    isSuperAdmin ||
    user?.userType === 'SuperAdmin' ||
    user?.userType === 1 ||
    user?.userType === '1' ||
    String(user?.userType).toLowerCase() === 'superadmin' ||
    user?.roleName?.toLowerCase()?.includes('super') ||
    user?.username?.toLowerCase() === 'superadmin';

  if (!isEffectiveSuperAdmin) {
    return (
      <View style={[styles.deniedContainer, { backgroundColor: colors.bg }]}>
        <Ionicons name="shield-outline" size={64} color="#ef4444" />
        <Text style={[styles.deniedTitle, { color: colors.textPrimary }]}>
          Super Admin Access Required
        </Text>
        <Text style={[styles.deniedSubtitle, { color: colors.textSecondary }]}>
          This portal is reserved strictly for Global Super Administrators.
        </Text>
        <TouchableOpacity
          style={[styles.deniedBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.deniedBtnText}>Return to Campus Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Super Admin Identity Banner */}
      <View style={[styles.topBanner, { backgroundColor: isDark ? '#1e1b4b' : '#312e81' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.shieldIconBox}>
              <Ionicons name="shield-checkmark" size={22} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.bannerTitle}>Super Admin Portal</Text>
              <Text style={styles.bannerSubtitle}>
                Global System Owner • Multi-Tenant SaaS
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.homeReturnBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="school" size={14} color="#ffffff" />
            <Text style={styles.homeReturnBtnText}>Campus ERP</Text>
          </TouchableOpacity>
        </View>

        {/* Top 4 Global KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ONBOARDED SCHOOLS</Text>
            <Text style={styles.kpiVal}>{kpis.totalSchools || schools.length || 0}</Text>
            <Text style={styles.kpiSub}>Active: {kpis.activeSchools || schools.length || 0}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL STUDENTS</Text>
            <Text style={styles.kpiVal}>{(kpis.totalStudents || 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.kpiSub}>Across all schools</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>FACULTY & STAFF</Text>
            <Text style={styles.kpiVal}>{(kpis.totalStaff || 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.kpiSub}>Active platform users</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>SUBSCRIPTIONS</Text>
            <Text style={styles.kpiVal}>{kpis.activeSubscriptions || schools.length || 0}</Text>
            <Text style={styles.kpiSub}>Live SaaS plans</Text>
          </View>
        </View>
      </View>

      {/* Navigation Sub-Tabs */}
      <View style={[styles.subTabRow, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
        {[
          { id: 'schools', label: `Schools (${schools.length})`, icon: 'business' },
          { id: 'plans', label: `Plans (${plans.length})`, icon: 'card' },
          { id: 'audit', label: 'Global Audit', icon: 'time' },
          { id: 'settings', label: 'System & APIs', icon: 'construct' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.subTabBtn,
                active && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.subTabText,
                  { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '800' : '600' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* ======================================================== */}
        {/* TAB 1: SCHOOLS & TENANTS DIRECTORY                       */}
        {/* ======================================================== */}
        {activeTab === 'schools' && (
          <View style={{ gap: 12 }}>
            {/* Search & Onboard Bar */}
            <View style={styles.searchRow}>
              <View
                style={[
                  styles.searchBox,
                  { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                ]}
              >
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search school name, code, or city..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.onboardBtn, { backgroundColor: '#10b981' }]}
                onPress={() => setShowOnboardModal(true)}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.onboardBtnText}>Onboard</Text>
              </TouchableOpacity>
            </View>

            {/* Schools Cards List */}
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
            ) : filteredSchools.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="school-outline" size={40} color="#94a3b8" />
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                  No schools found matching your search.
                </Text>
              </View>
            ) : (
              filteredSchools.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.schoolCard,
                    { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                  ]}
                >
                  <View style={styles.schoolHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={styles.schoolAvatar}>
                        <Text style={styles.schoolAvatarText}>{(s.name || 'S')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.schoolName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text style={[styles.schoolSub, { color: colors.textSecondary }]}>
                          Code: {s.code || 'SCH'} • {s.city || 'Campus'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: s.isActive !== false ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: s.isActive !== false ? '#15803d' : '#b91c1c' }}>
                        {s.isActive !== false ? 'ACTIVE' : 'SUSPENDED'}
                      </Text>
                    </View>
                  </View>

                  {/* School Metrics Row */}
                  <View style={[styles.schoolMetricsRow, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <View style={styles.schoolMetricItem}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>STUDENTS</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
                        {s.studentCount || s.totalStudents || 0}
                      </Text>
                    </View>
                    <View style={styles.schoolMetricItem}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>STAFF</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
                        {s.staffCount || s.totalStaff || 0}
                      </Text>
                    </View>
                    <View style={styles.schoolMetricItem}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>PLAN</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#6366f1' }}>
                        {s.planName || 'Standard'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.schoolActionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Alert.alert(
                          'Switch to Campus',
                          `Open ${s.name} campus ERP dashboard?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Open Campus',
                              onPress: () => navigation.navigate('Home'),
                            },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="enter-outline" size={14} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Open Campus</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnSecondary, { borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                      onPress={() => handleOpenEditSchool(s)}
                    >
                      <Ionicons name="create-outline" size={13} color={colors.primary} />
                      <Text style={[styles.actionBtnSecondaryText, { color: colors.primary }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnSecondary, { borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                      onPress={() => {
                        setSelectedSchool(s);
                        setShowPasswordModal(true);
                      }}
                    >
                      <Ionicons name="key-outline" size={13} color={colors.textPrimary} />
                      <Text style={[styles.actionBtnSecondaryText, { color: colors.textPrimary }]}>
                        Password
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtnSecondary,
                        {
                          borderColor: s.isActive !== false ? (isDark ? '#7f1d1d' : '#fecaca') : (isDark ? '#064e3b' : '#bbf7d0'),
                          backgroundColor: s.isActive !== false ? (isDark ? '#450a0a' : '#fef2f2') : (isDark ? '#022c22' : '#f0fdf4'),
                        },
                      ]}
                      onPress={() => handleToggleSchoolStatus(s)}
                    >
                      <Ionicons
                        name={s.isActive !== false ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={13}
                        color={s.isActive !== false ? '#ef4444' : '#10b981'}
                      />
                      <Text
                        style={[
                          styles.actionBtnSecondaryText,
                          { color: s.isActive !== false ? '#ef4444' : '#10b981' },
                        ]}
                      >
                        {s.isActive !== false ? 'Suspend' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SUBSCRIPTION PLANS                                */}
        {/* ======================================================== */}
        {activeTab === 'plans' && (
          <View style={{ gap: 12 }}>
            {plans.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="card-outline" size={40} color="#94a3b8" />
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                  Standard SaaS Subscription Plans Active
                </Text>
              </View>
            ) : (
              plans.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.planCard,
                    { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{p.name}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#10b981' }}>
                      ₹ {Number(p.price || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 4 }}>
                    Max Students: {p.maxStudents ? p.maxStudents.toLocaleString('en-IN') : 'Unlimited'} • Duration: {p.durationDays || 365} Days
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>
                    {p.description || 'Full academic, finance, and attendance modules included.'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: GLOBAL AUDIT TRAIL                                */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <View style={{ gap: 8 }}>
            {auditLogs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="time-outline" size={40} color="#94a3b8" />
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                  No recent global audit log entries found.
                </Text>
              </View>
            ) : (
              auditLogs.map((log, idx) => (
                <View
                  key={log.id || idx}
                  style={[
                    styles.auditItemCard,
                    { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.auditAction, { color: colors.primary }]}>{log.action || 'System Action'}</Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Recent'}
                    </Text>
                  </View>
                  <Text style={[styles.auditDetails, { color: colors.textPrimary }]}>
                    {log.details || log.description || log.entityName || 'Administrative modification'}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                    User: {log.userName || log.userEmail || 'superadmin'} • IP: {log.ipAddress || '127.0.0.1'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SYSTEM & APIS                                     */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <View style={{ gap: 10 }}>
            <View style={[styles.systemStatusCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <View>
                  <Text style={[styles.systemTitle, { color: colors.textPrimary }]}>Core Backend API</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>ASP.NET Core 8.0 • Status: Healthy</Text>
                </View>
              </View>
            </View>

            <View style={[styles.systemStatusCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                <View>
                  <Text style={[styles.systemTitle, { color: colors.textPrimary }]}>WhatsApp Gateway</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Templates Active • Direct Messaging Ready</Text>
                </View>
              </View>
            </View>

            <View style={[styles.systemStatusCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="card" size={24} color="#6366f1" />
                <View>
                  <Text style={[styles.systemTitle, { color: colors.textPrimary }]}>Payment Gateways</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Razorpay / Cash / UPI Counter Enabled</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* MODAL 1: ONBOARD NEW SCHOOL WIZARD                       */}
      {/* ======================================================== */}
      <Modal
        visible={showOnboardModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOnboardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Onboard New School</Text>
              <TouchableOpacity onPress={() => setShowOnboardModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
              <View>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>School Name *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="e.g. St. Xavier's High School"
                  placeholderTextColor={colors.textSecondary}
                  value={onboardForm.name}
                  onChangeText={(v) => setOnboardForm((p) => ({ ...p, name: v }))}
                />
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>School Code / Prefix</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="e.g. SXHS"
                  placeholderTextColor={colors.textSecondary}
                  value={onboardForm.code}
                  onChangeText={(v) => setOnboardForm((p) => ({ ...p, code: v }))}
                />
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>City & State</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="e.g. New Delhi, Delhi"
                  placeholderTextColor={colors.textSecondary}
                  value={onboardForm.city}
                  onChangeText={(v) => setOnboardForm((p) => ({ ...p, city: v }))}
                />
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>School Admin Email</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="e.g. admin@school.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  value={onboardForm.email}
                  onChangeText={(v) => setOnboardForm((p) => ({ ...p, email: v }))}
                />
              </View>

              <View>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Admin Initial Password *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={true}
                  value={onboardForm.adminPassword}
                  onChangeText={(v) => setOnboardForm((p) => ({ ...p, adminPassword: v }))}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#10b981' }]}
              onPress={handleOnboardSchool}
              disabled={submittingOnboard}
            >
              {submittingOnboard ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Create School & Admin</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: RESET ADMIN PASSWORD                            */}
      {/* ======================================================== */}
      <Modal
        visible={showPasswordModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Reset Admin Password
              </Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
              Resetting admin login password for {selectedSchool?.name}.
            </Text>

            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>New Password</Text>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                placeholder="Enter new admin password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={true}
                value={newAdminPassword}
                onChangeText={setNewAdminPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleResetPassword}
              disabled={submittingPassword}
            >
              {submittingPassword ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: EDIT SCHOOL PROFILE                             */}
      {/* ======================================================== */}
      <Modal
        visible={showEditSchoolModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditSchoolModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Edit School Profile
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  Update tenant profile and institutional credentials
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditSchoolModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 10 }} keyboardShouldPersistTaps="handled">
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>School Name *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="School Name"
                  placeholderTextColor={colors.textSecondary}
                  value={editSchoolForm.name}
                  onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, name: v }))}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Code *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                    placeholder="e.g. DPS"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                    value={editSchoolForm.code}
                    onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, code: v.toUpperCase() }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Affiliation No.</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                    placeholder="e.g. CBSE 12345"
                    placeholderTextColor={colors.textSecondary}
                    value={editSchoolForm.affiliationNumber}
                    onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, affiliationNumber: v }))}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Contact Phone</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                    placeholder="e.g. +91 9876543210"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    value={editSchoolForm.contactNumber}
                    onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, contactNumber: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Official Email</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                    placeholder="e.g. info@school.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={editSchoolForm.email}
                    onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, email: v }))}
                  />
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Website</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="e.g. https://www.school.com"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  value={editSchoolForm.website}
                  onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, website: v }))}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Address</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                  placeholder="Campus Address"
                  placeholderTextColor={colors.textSecondary}
                  value={editSchoolForm.address}
                  onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, address: v }))}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>City</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}
                    placeholder="City"
                    placeholderTextColor={colors.textSecondary}
                    value={editSchoolForm.city}
                    onChangeText={(v) => setEditSchoolForm((p) => ({ ...p, city: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Status</Text>
                  <TouchableOpacity
                    style={[
                      styles.formInput,
                      {
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: editSchoolForm.isActive ? (isDark ? '#064e3b' : '#dcfce7') : (isDark ? '#450a0a' : '#fee2e2'),
                        borderColor: editSchoolForm.isActive ? '#10b981' : '#ef4444',
                      },
                    ]}
                    onPress={() => {
                      const newActive = !editSchoolForm.isActive;
                      setEditSchoolForm((p) => ({
                        ...p,
                        isActive: newActive,
                        status: newActive ? 'Active' : 'Suspended',
                      }));
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: editSchoolForm.isActive ? '#15803d' : '#b91c1c' }}>
                      {editSchoolForm.isActive ? 'ACTIVE' : 'SUSPENDED'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpdateSchool}
                disabled={submittingEditSchool}
              >
                {submittingEditSchool ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save School Profile</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBanner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: 10.5,
    color: '#c7d2fe',
    marginTop: 1,
  },
  homeReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  homeReturnBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 8,
  },
  kpiLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#c7d2fe',
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 8.5,
    color: '#e0e7ff',
    marginTop: 1,
  },
  subTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
  },
  subTabText: {
    fontSize: 11.5,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    paddingVertical: 0,
  },
  onboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
  },
  onboardBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  schoolCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  schoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schoolAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  schoolName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  schoolSub: {
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  schoolMetricsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  schoolMetricItem: {
    alignItems: 'center',
  },
  schoolActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  planCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  auditItemCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  auditAction: {
    fontSize: 11,
    fontWeight: '800',
  },
  auditDetails: {
    fontSize: 12,
    fontWeight: '600',
  },
  systemStatusCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  systemTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
  },
  submitBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  deniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  deniedSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  deniedBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  deniedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
