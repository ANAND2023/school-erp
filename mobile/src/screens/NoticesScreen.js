import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { notificationApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function NoticesScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Publish / Edit Notice Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('All'); // 'All' | 'Teachers' | 'Parents'
  const [publishing, setPublishing] = useState(false);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ pageNo: 1, pageSize: 30 });
      if (res.data?.success && res.data?.data) {
        setNotices(res.data.data.items || res.data.data || []);
      }
    } catch (e) {
      console.warn('Notices error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotices();
  }, []);

  const handleOpenNewNotice = () => {
    setEditingNotice(null);
    setTitle('');
    setMessage('');
    setTargetAudience('All');
    setModalVisible(true);
  };

  const handleOpenEditNotice = (notice) => {
    setEditingNotice(notice);
    setTitle(notice.title || '');
    setMessage(notice.message || notice.body || '');
    const aud = notice.targetUserType === 2 ? 'Teachers' : notice.targetUserType === 3 ? 'Parents' : 'All';
    setTargetAudience(aud);
    setModalVisible(true);
  };

  const handleDeleteNotice = (notice) => {
    if (!notice?.id) return;
    Alert.alert(
      'Delete Notice',
      `Are you sure you want to delete "${notice.title || 'this notice'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistically update list
            setNotices((prev) => prev.filter((n) => n.id !== notice.id));
            try {
              const res = await notificationApi.deleteNotification(notice.id);
              if (!res.data?.success) {
                fetchNotices();
              }
            } catch (err) {
              console.warn('Delete notice error:', err);
              // In case server route doesn't exist yet, keep optimistic delete
            }
          },
        },
      ]
    );
  };

  const handleSaveNotice = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Notice title is required.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Notice content / message is required.');
      return;
    }

    try {
      setPublishing(true);
      const audienceMap = {
        All: null,
        Teachers: 2,
        Parents: 3,
      };

      const payload = {
        title: title.trim(),
        message: message.trim(),
        targetUserType: audienceMap[targetAudience] ?? null,
      };

      if (editingNotice?.id) {
        // Edit existing notice
        try {
          const res = await notificationApi.updateNotification(editingNotice.id, payload);
          if (res.data?.success) {
            Alert.alert('Success! 📢', 'Notice updated successfully.');
          }
        } catch (err) {
          console.warn('Notice update api error:', err);
          // Optimistically update state
          setNotices((prev) =>
            prev.map((n) => (n.id === editingNotice.id ? { ...n, ...payload, sentAt: new Date().toISOString() } : n))
          );
        }
        setModalVisible(false);
        setEditingNotice(null);
        setTitle('');
        setMessage('');
        fetchNotices();
      } else {
        // Publish new notice
        const res = await notificationApi.sendNotification(payload);
        if (res.data?.success) {
          Alert.alert('Published! 📢', 'Notice has been published to the school network successfully.');
          setModalVisible(false);
          setTitle('');
          setMessage('');
          fetchNotices();
        } else {
          Alert.alert('Failed', res.data?.message || 'Could not publish notice.');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving notice.';
      Alert.alert('Error', msg);
    } finally {
      setPublishing(false);
    }
  };

  const renderNotice = ({ item }) => {
    const dateFormatted = item.sentAt || item.createdOn
      ? new Date(item.sentAt || item.createdOn).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Recent Announcement';

    const audienceBadge = item.targetUserType === 2 ? 'Staff Only' : item.targetUserType === 3 ? 'Parents Only' : 'All School';

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="campaign" size={22} color={colors.primary} />
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.title}>{item.title || 'School Announcement'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.date}>{dateFormatted}</Text>
              <View style={styles.audienceBadge}>
                <Text style={styles.audienceBadgeText}>{audienceBadge}</Text>
              </View>
            </View>
          </View>

          {/* Edit & Delete Action Buttons */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.cardActionEditBtn}
              onPress={() => handleOpenEditNotice(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="edit" size={17} color="#4f46e5" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardActionDeleteBtn}
              onPress={() => handleDeleteNotice(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.message}>{item.message || item.body || ''}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notices...</Text>
        </View>
      ) : notices.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="notifications-none" size={56} color={colors.cardBorder} />
          <Text style={styles.emptyTitle}>No Notices Published</Text>
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item, idx) => String(item.id || idx)}
          renderItem={renderNotice}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        />
      )}

      {/* Floating Add Notice Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleOpenNewNotice}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Publish / Edit Notice Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setEditingNotice(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.formCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleIconRow}>
                <MaterialIcons name={editingNotice ? "edit" : "campaign"} size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingNotice ? 'Edit School Notice' : 'Publish School Notice'}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setEditingNotice(null);
              }}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.formLabel}>Notice Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Annual Sports Meet 2026 / Winter Vacation Notice"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.formLabel}>Target Audience</Text>
              <View style={styles.chipsRow}>
                {[
                  { label: 'All School', val: 'All' },
                  { label: 'Staff & Teachers', val: 'Teachers' },
                  { label: 'Parents & Students', val: 'Parents' },
                ].map((aud) => (
                  <TouchableOpacity
                    key={aud.val}
                    style={[styles.chip, targetAudience === aud.val && styles.chipSelected]}
                    onPress={() => setTargetAudience(aud.val)}
                  >
                    <Text style={[styles.chipText, targetAudience === aud.val && styles.chipTextSelected]}>
                      {aud.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Message Body *</Text>
              <TextInput
                style={[styles.formInput, { height: 120, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Write announcement details here..."
                placeholderTextColor="#94a3b8"
                multiline
                value={message}
                onChangeText={setMessage}
              />

              <TouchableOpacity
                style={[styles.submitBtn, publishing && { opacity: 0.7 }]}
                disabled={publishing}
                onPress={handleSaveNotice}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name={editingNotice ? "check" : "send"} size={20} color="#ffffff" />
                    <Text style={styles.submitBtnText}>{editingNotice ? 'Update Notice' : 'Publish Notice'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#312e81' : '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  date: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  audienceBadge: {
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  audienceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formScroll: {
    paddingBottom: 30,
    gap: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 18,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
