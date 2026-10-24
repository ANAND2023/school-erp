import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { attendanceApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function LeaveManagementScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'holidays'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Holidays state
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  // Apply Leave Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicantType, setApplicantType] = useState('Employee');
  const [leaveType, setLeaveType] = useState('Casual');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const res = await attendanceApi.getLeaveRequests();
      const list = res.data?.data || res.data || [];
      setLeaveRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Error loading leave requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await attendanceApi.getHolidays();
      const list = res.data?.data || res.data || [];
      setHolidays(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Error loading holidays:', err);
    } finally {
      setLoadingHolidays(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      loadLeaveRequests();
    } else {
      loadHolidays();
    }
  }, [activeTab]);

  const handleActionLeave = (id, newStatus) => {
    Alert.alert(
      `${newStatus === 'Approved' ? 'Approve' : 'Reject'} Leave`,
      `Are you sure you want to mark this request as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'Approved' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await attendanceApi.actionLeave(id, {
                status: newStatus === 'Approved' ? 2 : 3,
                actionRemarks: 'Actioned via Mobile App',
              });
              Alert.alert('Updated', `Leave marked as ${newStatus}.`);
              loadLeaveRequests();
            } catch (err) {
              const msg = err.response?.data?.message || 'Unable to update leave status.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const handleApplyLeave = async () => {
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please describe the reason for leave.');
      return;
    }

    try {
      setSubmitting(true);
      const leaveTypeMap = {
        Casual: 1,
        Sick: 2,
        Emergency: 1,
        Vacation: 3,
      };

      const payload = {
        applicantType: applicantType,
        leaveType: leaveTypeMap[leaveType] || 1,
        fromDate: fromDate,
        toDate: toDate,
        reason: reason.trim(),
      };

      await attendanceApi.applyLeave(payload);
      Alert.alert('Submitted', 'Your leave request has been submitted for approval.');
      setModalVisible(false);
      setReason('');
      loadLeaveRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit leave request.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = leaveRequests.filter((item) => {
    if (statusFilter === 'ALL') return true;
    const st = String(item.status || '').toUpperCase();
    return st === statusFilter;
  });

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('APPROV') || s === '1') {
      return { bg: '#dcfce7', text: '#15803d', label: 'Approved' };
    }
    if (s.includes('REJECT') || s === '2') {
      return { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' };
    }
    return { bg: '#fef3c7', text: '#b45309', label: 'Pending' };
  };

  const renderLeaveCard = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const isPending = badge.label === 'Pending';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.applicantName}>{item.applicantName || item.employeeName || item.studentName || 'Requester'}</Text>
            <Text style={styles.typeSub}>
              {item.applicantType || 'Staff'} • {item.leaveType} Leave
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.dateBanner}>
          <Ionicons name="calendar-outline" size={15} color="#0284c7" />
          <Text style={styles.dateBannerText}>
            {item.fromDate ? new Date(item.fromDate).toLocaleDateString() : 'N/A'} - {item.toDate ? new Date(item.toDate).toLocaleDateString() : 'N/A'}
          </Text>
          <View style={styles.daysBadge}>
            <Text style={styles.daysBadgeText}>{item.totalDays || 1} day(s)</Text>
          </View>
        </View>

        {item.reason ? (
          <Text style={styles.reasonText}>"{item.reason}"</Text>
        ) : null}

        {isPending && (
          <View style={styles.actionBtnsRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleActionLeave(item.id, 'Rejected')}
            >
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleActionLeave(item.id, 'Approved')}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#15803d" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'requests' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={activeTab === 'requests' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.topTabText, activeTab === 'requests' && styles.topTabTextActive]}>
            Leave Applications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'holidays' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('holidays')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={activeTab === 'holidays' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.topTabText, activeTab === 'holidays' && styles.topTabTextActive]}>
            Holiday Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: LEAVE REQUESTS */}
      {activeTab === 'requests' && (
        <View style={{ flex: 1 }}>
          {/* Action & Filter Bar */}
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.chip, statusFilter === st && styles.chipActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text style={[styles.chipText, statusFilter === st && styles.chipTextActive]}>
                    {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={{ marginTop: 10, color: '#64748b' }}>Loading Leaves...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRequests}
              keyExtractor={(item, idx) => String(item.id || idx)}
              renderItem={renderLeaveCard}
              contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadLeaveRequests();
                  }}
                  colors={['#0284c7']}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={44} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No Leave Applications</Text>
                  <Text style={styles.emptySub}>
                    {statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} leaves found.` : 'Tap "+ Apply" to submit a leave request.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* TAB 2: HOLIDAY CALENDAR */}
      {activeTab === 'holidays' && (
        <View style={{ flex: 1 }}>
          {loadingHolidays ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={{ marginTop: 10, color: '#64748b' }}>Loading Holidays...</Text>
            </View>
          ) : (
            <FlatList
              data={holidays}
              keyExtractor={(item, idx) => String(item.id || idx)}
              contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadHolidays();
                  }}
                  colors={['#0284c7']}
                />
              }
              renderItem={({ item }) => (
                <View style={styles.holidayCard}>
                  <View style={styles.holidayDateBox}>
                    <Text style={styles.holidayMonth}>
                      {item.date ? new Date(item.date).toLocaleString('default', { month: 'short' }).toUpperCase() : 'HOL'}
                    </Text>
                    <Text style={styles.holidayDay}>
                      {item.date ? new Date(item.date).getDate() : '--'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.holidayTitle}>{item.title || item.name || 'School Holiday'}</Text>
                    <Text style={styles.holidayDesc}>{item.description || 'Official non-working day'}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="sunny-outline" size={44} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No Upcoming Holidays</Text>
                  <Text style={styles.emptySub}>Holiday calendar has not been uploaded yet.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Apply Leave Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.inputLabel}>Applicant Role</Text>
              <View style={styles.typeSelectorRow}>
                {['Employee', 'Student'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, applicantType === t && styles.typeBtnActive]}
                    onPress={() => setApplicantType(t)}
                  >
                    <Text style={[styles.typeBtnText, applicantType === t && styles.typeBtnTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Leave Type</Text>
              <View style={styles.typeSelectorRow}>
                {['Casual', 'Sick', 'Emergency', 'Vacation'].map((lt) => (
                  <TouchableOpacity
                    key={lt}
                    style={[styles.smallLeaveTypeChip, leaveType === lt && styles.smallLeaveTypeChipActive]}
                    onPress={() => setLeaveType(lt)}
                  >
                    <Text style={[styles.smallLeaveTypeChipText, leaveType === lt && styles.smallLeaveTypeChipTextActive]}>
                      {lt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>From Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="2026-10-24"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>To Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={toDate}
                onChangeText={setToDate}
                placeholder="2026-10-25"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Reason for Leave *</Text>
              <TextInput
                style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Mention why you require leave..."
                multiline
                value={reason}
                onChangeText={setReason}
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleApplyLeave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitBtnText}>Submit Leave Application</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  topTabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabBtnActive: {
    borderBottomColor: colors.primary,
  },
  topTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  topTabTextActive: {
    color: colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  applicantName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  typeSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1e293b' : '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    gap: 6,
  },
  dateBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#38bdf8' : '#0369a1',
    flex: 1,
  },
  daysBadge: {
    backgroundColor: isDark ? '#0284c7' : '#bae6fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#0284c7',
  },
  reasonText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 10,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? '#991b1b' : '#fca5a5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  rejectBtnText: {
    color: isDark ? '#f87171' : '#dc2626',
    fontWeight: '600',
    fontSize: 12,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
    borderWidth: 1,
    borderColor: isDark ? '#166534' : '#86efac',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  approveBtnText: {
    color: isDark ? '#4ade80' : '#15803d',
    fontWeight: '600',
    fontSize: 12,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  holidayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  holidayDateBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#bfdbfe',
  },
  holidayMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  holidayDay: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#0369a1',
  },
  holidayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  holidayDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  smallLeaveTypeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  smallLeaveTypeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallLeaveTypeChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  smallLeaveTypeChipTextActive: {
    color: '#ffffff',
  },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
