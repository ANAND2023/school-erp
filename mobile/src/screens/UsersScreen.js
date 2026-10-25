import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { authApi, roleApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export const ALL_MENUS = [
  // Dashboard
  { key: 'Dashboard', label: 'Dashboard', group: 'Dashboard' },

  // Auth & Access
  { key: 'Users', label: 'User Management', group: 'Auth & Access' },
  { key: 'Roles', label: 'Roles & Permissions', group: 'Auth & Access' },
  { key: 'AuditLogs', label: 'Audit Logs', group: 'Auth & Access' },

  // Masters
  { key: 'Branch', label: 'School & Branch Master', group: 'Masters' },
  { key: 'AcademicYears', label: 'Academic Years', group: 'Masters' },
  { key: 'Classes', label: 'Classes & Sections', group: 'Masters' },
  { key: 'Subjects', label: 'Subjects', group: 'Masters' },
  { key: 'ClassSubjects', label: 'Class-Subject Mapping', group: 'Masters' },
  { key: 'SimpleMasters', label: 'Simple Masters', group: 'Masters' },
  { key: 'NumberingSeries', label: 'Numbering Series', group: 'Masters' },
  { key: 'BulkStudentUpload', label: 'Bulk Student Upload', group: 'Masters' },

  // Students & Admission
  { key: 'Enquiries', label: 'Enquiry Management', group: 'Students & Admission' },
  { key: 'Admissions', label: 'Student Admissions', group: 'Students & Admission' },
  { key: 'Students', label: 'Student Directory', group: 'Students & Admission' },
  { key: 'RollNumbers', label: 'Roll Number Assignment', group: 'Students & Admission' },
  { key: 'SectionChange', label: 'Section Change', group: 'Students & Admission' },
  { key: 'IDCardSettings', label: 'ID Card Settings', group: 'Students & Admission' },
  { key: 'PrintIDCards', label: 'Print ID Cards', group: 'Students & Admission' },

  // Staff & HR
  { key: 'Staff', label: 'Staff Directory', group: 'Staff & HR' },
  { key: 'TeacherAllocation', label: 'Teacher Allocation', group: 'Staff & HR' },

  // Fees Management
  { key: 'FeeStructure', label: 'Fee Structure', group: 'Fees Management' },
  { key: 'FeeAssignment', label: 'Fee Assignment', group: 'Fees Management' },
  { key: 'FeeCollection', label: 'Fee Collection', group: 'Fees Management' },
  { key: 'DemandBill', label: 'Demand Bill', group: 'Fees Management' },
  { key: 'FeeConcessions', label: 'Fee Concessions', group: 'Fees Management' },
  { key: 'FeeReports', label: 'Fee Reports', group: 'Fees Management' },

  // Attendance & Timetable
  { key: 'StudentAttendance', label: 'Student Attendance', group: 'Attendance & Timetable' },
  { key: 'StaffAttendance', label: 'Staff Attendance', group: 'Attendance & Timetable' },
  { key: 'LeaveManagement', label: 'Leave Management', group: 'Attendance & Timetable' },
  { key: 'AttendanceReports', label: 'Attendance Reports', group: 'Attendance & Timetable' },
  { key: 'HolidayCalendar', label: 'Holiday Calendar', group: 'Attendance & Timetable' },
  { key: 'ClassTimetable', label: 'Class Timetable', group: 'Attendance & Timetable' },
  { key: 'TeacherTimetable', label: 'Teacher Timetable', group: 'Attendance & Timetable' },
  { key: 'Substitutions', label: 'Substitutions', group: 'Attendance & Timetable' },

  // Examinations
  { key: 'ExamSchedules', label: 'Exam Schedules', group: 'Examinations' },
  { key: 'MarksEntry', label: 'Marks Entry', group: 'Examinations' },
  { key: 'ReportCards', label: 'Report Cards', group: 'Examinations' },

  // Transport
  { key: 'Vehicles', label: 'Vehicles', group: 'Transport' },
  { key: 'RoutesStops', label: 'Routes & Stops', group: 'Transport' },
  { key: 'TransportAllocations', label: 'Student Allocations', group: 'Transport' },

  // Promotion & TC
  { key: 'Promotion', label: 'Student Promotion', group: 'Promotion & TC' },
  { key: 'TransferCertificates', label: 'Transfer Certificates (TC)', group: 'Promotion & TC' },

  // Inventory & Stock
  { key: 'InventoryOverview', label: 'Inventory Overview', group: 'Inventory & Stock' },
  { key: 'ItemsMaster', label: 'Items Master', group: 'Inventory & Stock' },
  { key: 'ItemCategories', label: 'Item Categories', group: 'Inventory & Stock' },
  { key: 'Suppliers', label: 'Suppliers / Vendors', group: 'Inventory & Stock' },
  { key: 'Manufactures', label: 'Manufactures', group: 'Inventory & Stock' },
  { key: 'StockInward', label: 'Stock Inward (Purchase)', group: 'Inventory & Stock' },
  { key: 'StockIssue', label: 'Stock Issue (Outward)', group: 'Inventory & Stock' },
  { key: 'StockLedger', label: 'Stock Movement Ledger', group: 'Inventory & Stock' },

  // Expenses
  { key: 'Expenses', label: 'Expense Management', group: 'Expenses' },

  // Reports
  { key: 'Reports', label: 'General Reports', group: 'Reports' },
];

export const MENU_GROUPS = [
  'All Modules',
  'Dashboard',
  'Auth & Access',
  'Masters',
  'Students & Admission',
  'Staff & HR',
  'Fees Management',
  'Attendance & Timetable',
  'Examinations',
  'Transport',
  'Promotion & TC',
  'Inventory & Stock',
  'Expenses',
  'Reports',
];

export const ACTIONS = [
  { key: 'canView', label: 'View', icon: 'eye-outline', color: '#0284c7' },
  { key: 'canAdd', label: 'Add', icon: 'add-circle-outline', color: '#10b981' },
  { key: 'canEdit', label: 'Edit', icon: 'pencil-outline', color: '#f59e0b' },
  { key: 'canDelete', label: 'Delete', icon: 'trash-outline', color: '#ef4444' },
  { key: 'canPrint', label: 'Print', icon: 'print-outline', color: '#6366f1' },
  { key: 'canExport', label: 'Export', icon: 'download-outline', color: '#8b5cf6' },
];

export default function UsersScreen({ route }) {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const initialTab = route?.params?.initialTab || 'users';
  const [activeTab, setActiveTab] = useState(initialTab); // 'users' | 'roles'

  // Users State
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Roles State
  const [roleSearch, setRoleSearch] = useState('');
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);

  // Matrix Modal State
  const [matrixModalVisible, setMatrixModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Modules');
  const [permissionsMap, setPermissionsMap] = useState({});
  const [savingMatrix, setSavingMatrix] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        authApi.getUsers({ pageSize: 50 }).catch(() => ({ data: [] })),
        (roleApi.getRoles || authApi.getRoles)().catch(() => ({ data: [] })),
      ]);

      const uList = usersRes.data?.data?.items || usersRes.data?.items || usersRes.data?.data || usersRes.data || [];
      setUsers(Array.isArray(uList) ? uList : []);

      const rList = rolesRes.data?.data || rolesRes.data || [];
      setRoles(Array.isArray(rList) ? rList : []);
    } catch (err) {
      console.warn('Error loading users & roles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (item) => {
    const nextState = !item.isActive;
    Alert.alert(
      `${nextState ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${nextState ? 'activate' : 'deactivate'} ${item.fullName || item.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await authApi.toggleUserStatus(item.id);
              setUsers((prev) =>
                prev.map((u) => (u.id === item.id ? { ...u, isActive: nextState } : u))
              );
            } catch (err) {
              const msg = err.response?.data?.message || 'Failed to update user status.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  // Helper to initialize permissions map
  const initPermissionsMap = (existing = []) => {
    const map = {};
    ALL_MENUS.forEach((menu) => {
      const match = existing.find((p) => p.menu && p.menu.toLowerCase() === menu.key.toLowerCase());
      map[menu.key] = {
        canView: match ? !!match.canView : false,
        canAdd: match ? !!match.canAdd : false,
        canEdit: match ? !!match.canEdit : false,
        canDelete: match ? !!match.canDelete : false,
        canPrint: match ? !!match.canPrint : false,
        canExport: match ? !!match.canExport : false,
      };
    });
    return map;
  };

  // Open Add Role Modal
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setSelectedGroup('All Modules');
    setPermissionsMap(initPermissionsMap([]));
    setMatrixModalVisible(true);
  };

  // Open Edit Permissions Matrix Modal
  const handleOpenEditRole = async (role) => {
    try {
      setLoadingRoleDetails(true);
      const res = await (roleApi.getRole || authApi.getRole)(role.id);
      const fullRole = res.data?.data || res.data || role;
      setEditingRole(fullRole);
      setRoleName(fullRole.name || '');
      setRoleDesc(fullRole.description || '');
      setSelectedGroup('All Modules');
      setPermissionsMap(initPermissionsMap(fullRole.permissions || []));
      setMatrixModalVisible(true);
    } catch (err) {
      console.warn('Error loading role details:', err);
      // Fallback with empty permissions
      setEditingRole(role);
      setRoleName(role.name || '');
      setRoleDesc(role.description || '');
      setPermissionsMap(initPermissionsMap([]));
      setMatrixModalVisible(true);
    } finally {
      setLoadingRoleDetails(false);
    }
  };

  // Toggle single permission chip
  const handlePermissionToggle = (menuKey, actionKey) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        [actionKey]: !prev[menuKey]?.[actionKey],
      },
    }));
  };

  // Toggle ALL 6 actions for a single menu row
  const handleMenuRowToggleAll = (menuKey) => {
    const current = permissionsMap[menuKey] || {};
    const allChecked = ACTIONS.every((act) => current[act.key]);
    const nextState = !allChecked;

    setPermissionsMap((prev) => ({
      ...prev,
      [menuKey]: ACTIONS.reduce((acc, act) => ({ ...acc, [act.key]: nextState }), {}),
    }));
  };

  // Filtered menus based on selected module group
  const visibleMenus = useMemo(() => {
    if (selectedGroup === 'All Modules') return ALL_MENUS;
    return ALL_MENUS.filter((m) => m.group === selectedGroup);
  }, [selectedGroup]);

  // Bulk action: Select / Clear All for visible menus
  const handleGlobalToggle = (enableAll) => {
    setPermissionsMap((prev) => {
      const updated = { ...prev };
      visibleMenus.forEach((menu) => {
        updated[menu.key] = ACTIONS.reduce((acc, act) => ({ ...acc, [act.key]: enableAll }), {});
      });
      return updated;
    });
  };

  // Bulk action: Toggle single column (e.g. + View or + Add) for all visible menus
  const handleColumnToggle = (actionKey) => {
    const allChecked = visibleMenus.every((m) => permissionsMap[m.key]?.[actionKey]);
    const nextState = !allChecked;

    setPermissionsMap((prev) => {
      const updated = { ...prev };
      visibleMenus.forEach((menu) => {
        updated[menu.key] = {
          ...updated[menu.key],
          [actionKey]: nextState,
        };
      });
      return updated;
    });
  };

  // Save Role and Permissions Matrix
  const handleSaveMatrix = async () => {
    if (!roleName.trim()) {
      Alert.alert('Validation Error', 'Role Name is required.');
      return;
    }

    try {
      setSavingMatrix(true);

      const permissions = ALL_MENUS.map((m) => ({
        menu: m.key,
        canView: !!permissionsMap[m.key]?.canView,
        canAdd: !!permissionsMap[m.key]?.canAdd,
        canEdit: !!permissionsMap[m.key]?.canEdit,
        canDelete: !!permissionsMap[m.key]?.canDelete,
        canPrint: !!permissionsMap[m.key]?.canPrint,
        canExport: !!permissionsMap[m.key]?.canExport,
      }));

      const payload = {
        name: roleName.trim(),
        description: roleDesc.trim() || null,
        permissions,
      };

      if (editingRole) {
        await (roleApi.updateRole || authApi.updateRole)(editingRole.id, payload);
        Alert.alert('Success! 🎉', `Role "${payload.name}" and permissions matrix updated successfully.`);
      } else {
        await (roleApi.createRole || authApi.createRole)(payload);
        Alert.alert('Success! 🎉', `New role "${payload.name}" created with permissions matrix.`);
      }

      setMatrixModalVisible(false);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save role and permissions.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSavingMatrix(false);
    }
  };

  // Delete Custom Role
  const handleDeleteRole = (item) => {
    if (item.isSystemRole) {
      Alert.alert('Protected Role', 'System roles are core to system operations and cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete role "${item.name}"?\n\nUsers mapped to this role may lose their access permissions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Role',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await (roleApi.deleteRole || authApi.deleteRole)(item.id);
              Alert.alert('Deleted', `Role "${item.name}" deleted.`);
              loadData();
            } catch (err) {
              const msg = err.response?.data?.message || 'Cannot delete this role as active users may be linked to it.';
              Alert.alert('Delete Failed', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Filtered lists
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const uName = u.username || u.userName || '';
      const matchesSearch =
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        uName.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.mobile && u.mobile.includes(q));

      if (!matchesSearch) return false;
      if (selectedRole === 'ALL') return true;
      const rName = (u.roleName || u.role || '').toLowerCase();
      return rName.includes(selectedRole.toLowerCase());
    });
  }, [users, search, selectedRole]);

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase().trim();
    return roles.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, roleSearch]);

  return (
    <View style={styles.container}>
      {/* Top Main Navigation Tabs */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'users' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === 'users' ? '#ffffff' : colors.textSecondary}
          />
          <Text style={[styles.topTabBtnText, activeTab === 'users' && styles.topTabBtnTextActive]}>
            User Accounts ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'roles' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('roles')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={activeTab === 'roles' ? '#ffffff' : colors.textSecondary}
          />
          <Text style={[styles.topTabBtnText, activeTab === 'roles' && styles.topTabBtnTextActive]}>
            Roles & Permissions ({roles.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* TAB 1: USERS DIRECTORY                                   */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
          {/* Top Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              placeholder="Search name, username, email..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor="#94a3b8"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Role Filter Chips */}
          <View style={styles.rolesRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {['ALL', ...(roles.length > 0 ? roles.map((r) => r.name) : ['School Admin', 'Teacher', 'Accountant', 'Principal', 'Driver'])].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Users List */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading User Directory...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item, idx) => String(item.id || idx)}
              contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#0284c7']} />
              }
              renderItem={({ item }) => {
                const uName = item.username || item.userName || 'user';
                return (
                  <View style={styles.userCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {(item.fullName || uName).charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.fullName}>{item.fullName || uName}</Text>
                        <Text style={styles.userName}>@{uName}</Text>
                      </View>

                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{item.roleName || item.role || 'User'}</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={14} color="#64748b" />
                      <Text style={styles.infoText}>{item.email || 'No email provided'}</Text>
                    </View>

                    {item.mobile ? (
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={14} color="#64748b" />
                        <Text style={styles.infoText}>{item.mobile}</Text>
                      </View>
                    ) : null}

                    <View style={styles.statusFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: item.isActive !== false ? '#22c55e' : '#94a3b8' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: item.isActive !== false ? '#15803d' : '#64748b' },
                          ]}
                        >
                          {item.isActive !== false ? 'Active Account' : 'Inactive / Disabled'}
                        </Text>
                      </View>

                      <Switch
                        value={item.isActive !== false}
                        onValueChange={() => handleToggleStatus(item)}
                        trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                        thumbColor={item.isActive !== false ? '#0284c7' : '#f1f5f9'}
                      />
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={44} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No Users Found</Text>
                  <Text style={styles.emptySub}>Try searching with a different name or role.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ROLES & PERMISSIONS MATRIX                        */}
      {/* ======================================================== */}
      {activeTab === 'roles' && (
        <View style={{ flex: 1 }}>
          {/* Section Heading & Add Role Button */}
          <View style={styles.roleHeaderContainer}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.sectionHeading}>Roles & Permissions Matrix</Text>
              <Text style={styles.sectionSub}>
                Configure role-based access control (RBAC) across all ERP modules
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addRoleBtn}
              onPress={handleOpenAddRole}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.addRoleBtnText}>Add Role</Text>
            </TouchableOpacity>
          </View>

          {/* Role Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              placeholder="Search roles by name or description..."
              value={roleSearch}
              onChangeText={setRoleSearch}
              style={styles.searchInput}
              placeholderTextColor="#94a3b8"
            />
            {roleSearch ? (
              <TouchableOpacity onPress={() => setRoleSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Roles List */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading Roles Matrix...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRoles}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#0284c7']} />
              }
              renderItem={({ item }) => (
                <View style={styles.roleCard}>
                  <View style={styles.roleCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={styles.roleTitle}>{item.name}</Text>
                        <View
                          style={[
                            styles.roleTypeBadge,
                            item.isSystemRole ? styles.systemBadge : styles.customBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleTypeBadgeText,
                              item.isSystemRole ? styles.systemBadgeText : styles.customBadgeText,
                            ]}
                          >
                            {item.isSystemRole ? 'System Role' : 'Custom Role'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.roleDesc}>
                        {item.description || 'Pre-configured institutional access policy and permissions.'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.roleActionsRow}>
                    <TouchableOpacity
                      style={styles.editMatrixBtn}
                      onPress={() => handleOpenEditRole(item)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="key-outline" size={15} color="#ffffff" />
                      <Text style={styles.editMatrixBtnText}>Edit Permissions Matrix</Text>
                    </TouchableOpacity>

                    {!item.isSystemRole && (
                      <TouchableOpacity
                        style={styles.deleteRoleBtn}
                        onPress={() => handleDeleteRole(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={15} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="shield-outline" size={44} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No Roles Found</Text>
                  <Text style={styles.emptySub}>Tap "+ Add Role" to create a new custom role.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* EDIT ROLE & PERMISSIONS MATRIX MODAL                     */}
      {/* ======================================================== */}
      <Modal
        visible={matrixModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMatrixModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.matrixModalBox}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={styles.matrixShieldIcon}>
                  <Ionicons name="shield-checkmark" size={18} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {editingRole ? `Edit Matrix: ${roleName || editingRole.name}` : 'New Role & Permissions'}
                  </Text>
                  <Text style={styles.modalSub}>
                    {editingRole?.isSystemRole ? 'System Role • Matrix Editable' : 'Custom Role Permissions'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setMatrixModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Matrix Body */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20 }}
            >
              {/* Role Details Inputs */}
              <Text style={styles.inputLabel}>Role Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Academic Coordinator, Transport Manager"
                placeholderTextColor="#94a3b8"
                value={roleName}
                onChangeText={setRoleName}
                editable={!editingRole?.isSystemRole}
              />
              {editingRole?.isSystemRole && (
                <Text style={styles.helperText}>System role names are standardized and protected.</Text>
              )}

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Role Description</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Brief summary of duties and responsibilities..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                value={roleDesc}
                onChangeText={setRoleDesc}
              />

              <View style={styles.divider} />

              {/* Module Groups Filter Pills */}
              <Text style={styles.sectionHeadingMini}>Filter by Module Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingVertical: 6 }}
              >
                {MENU_GROUPS.map((grp) => {
                  const active = selectedGroup === grp;
                  return (
                    <TouchableOpacity
                      key={grp}
                      style={[styles.groupPill, active && styles.groupPillActive]}
                      onPress={() => setSelectedGroup(grp)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.groupPillText, active && styles.groupPillTextActive]}>
                        {grp}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Batch Action Toolbar */}
              <View style={styles.batchToolbar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.batchTitle}>
                    Batch Quick Actions ({visibleMenus.length} modules)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.batchPillBtn}
                      onPress={() => handleGlobalToggle(true)}
                    >
                      <Ionicons name="checkmark-done" size={13} color="#15803d" />
                      <Text style={[styles.batchPillBtnText, { color: '#15803d' }]}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.batchPillBtn}
                      onPress={() => handleGlobalToggle(false)}
                    >
                      <Ionicons name="close-circle-outline" size={13} color="#b91c1c" />
                      <Text style={[styles.batchPillBtnText, { color: '#b91c1c' }]}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Column quick actions */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {ACTIONS.map((act) => (
                    <TouchableOpacity
                      key={act.key}
                      style={[styles.colToggleBtn, { borderColor: act.color }]}
                      onPress={() => handleColumnToggle(act.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={act.icon} size={12} color={act.color} />
                      <Text style={[styles.colToggleBtnText, { color: act.color }]}>
                        Toggle All {act.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Permissions Matrix Cards */}
              <View style={{ marginTop: 10, gap: 10 }}>
                {visibleMenus.map((menu) => {
                  const currentPerms = permissionsMap[menu.key] || {};
                  const allActive = ACTIONS.every((act) => currentPerms[act.key]);

                  return (
                    <View key={menu.key} style={styles.menuMatrixCard}>
                      <View style={styles.menuMatrixTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.menuTitleText}>{menu.label}</Text>
                          <Text style={styles.menuGroupText}>{menu.group}</Text>
                        </View>

                        {/* Row All Toggle */}
                        <TouchableOpacity
                          style={[styles.rowAllBtn, allActive && styles.rowAllBtnActive]}
                          onPress={() => handleMenuRowToggleAll(menu.key)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={allActive ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={14}
                            color={allActive ? '#ffffff' : colors.textSecondary}
                          />
                          <Text style={[styles.rowAllBtnText, allActive && styles.rowAllBtnTextActive]}>
                            {allActive ? 'All Active' : 'Select All'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Action Chips Grid (3x2) */}
                      <View style={styles.actionGrid}>
                        {ACTIONS.map((act) => {
                          const isChecked = !!currentPerms[act.key];
                          return (
                            <TouchableOpacity
                              key={act.key}
                              style={[
                                styles.actionChip,
                                isChecked && { backgroundColor: act.color, borderColor: act.color },
                              ]}
                              onPress={() => handlePermissionToggle(menu.key, act.key)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={isChecked ? 'checkmark-circle' : act.icon}
                                size={14}
                                color={isChecked ? '#ffffff' : colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.actionChipText,
                                  isChecked && styles.actionChipTextActive,
                                ]}
                              >
                                {act.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Bottom Sticky Actions */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setMatrixModalVisible(false)}
                disabled={savingMatrix}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, savingMatrix && { opacity: 0.7 }]}
                onPress={handleSaveMatrix}
                disabled={savingMatrix}
                activeOpacity={0.85}
              >
                {savingMatrix ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
                    <Text style={styles.modalSaveBtnText}>Save Role & Permissions Matrix</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
  },
  topTabBtnActive: {
    backgroundColor: colors.primary,
  },
  topTabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  topTabBtnTextActive: {
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    height: 40,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  rolesRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#ffffff',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#0284c7',
  },
  fullName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  roleBadge: {
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Roles Tab Styles
  roleHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSub: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addRoleBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  roleCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  roleCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  roleTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  systemBadge: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
  },
  systemBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  customBadge: {
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
  },
  customBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  roleDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  roleActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editMatrixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  editMatrixBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteRoleBtn: {
    padding: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
  },

  // Matrix Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  matrixModalBox: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  matrixShieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 11,
    color: '#0284c7',
    marginTop: 4,
  },
  sectionHeadingMini: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  groupPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  groupPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  groupPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  batchToolbar: {
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  batchTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  batchPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  batchPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  colToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
  },
  colToggleBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  menuMatrixCard: {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  menuMatrixTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuGroupText: {
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  rowAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowAllBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  rowAllBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rowAllBtnTextActive: {
    color: '#ffffff',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: '31%',
    justifyContent: 'center',
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
