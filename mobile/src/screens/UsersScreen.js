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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function UsersScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        authApi.getUsers({ pageSize: 50 }).catch(() => ({ data: [] })),
        authApi.getRoles().catch(() => ({ data: [] })),
      ]);

      const uList = usersRes.data?.data?.items || usersRes.data?.items || usersRes.data?.data || usersRes.data || [];
      setUsers(Array.isArray(uList) ? uList : []);

      const rList = rolesRes.data?.data || rolesRes.data || [];
      setRoles(Array.isArray(rList) ? rList : []);
    } catch (err) {
      console.warn('Error loading users:', err);
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
              // update local list
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

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
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

  return (
    <View style={styles.container}>
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
          <Text style={{ marginTop: 10, color: '#64748b' }}>Loading User Directory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item, idx) => String(item.id || idx)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#0284c7']}
            />
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
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 12,
    margin: 12,
    marginBottom: 8,
    borderRadius: 8,
    height: 42,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
  },
});
