import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { gatePassApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

const FILTER_TABS = [
  { label: 'All', value: 'All' },
  { label: 'Out / Departed', value: 'Departed' },
  { label: 'Returned', value: 'Returned' },
  { label: 'Cancelled', value: 'Cancelled' },
];

export default function GatePassListScreen({ route, navigation }) {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const initialFilter = route.params?.filterStatus || 'All';

  const [activeTab, setActiveTab] = useState(initialFilter);
  const [searchText, setSearchText] = useState('');
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPasses = async (targetPage = 1, shouldAppend = false) => {
    try {
      if (targetPage === 1) setLoading(true);

      const params = {
        pageNo: targetPage,
        pageSize: 20,
      };

      if (searchText.trim()) {
        params.search = searchText.trim();
      }

      if (activeTab !== 'All') {
        params.status = activeTab;
      }

      const res = await gatePassApi.getGatePasses(params);
      if (res.data?.success && res.data?.data) {
        const { items, totalPages } = res.data.data;
        if (shouldAppend) {
          setPasses((prev) => [...prev, ...items]);
        } else {
          setPasses(items || []);
        }
        setHasMore(targetPage < totalPages);
        setPage(targetPage);
      }
    } catch (e) {
      console.warn('Failed to fetch gate passes from API, checking local storage:', e);
      try {
        const raw = await AsyncStorage.getItem('@offline_gate_passes');
        let local = raw ? JSON.parse(raw) : [];
        if (activeTab !== 'All') {
          local = local.filter((p) => (p.status || '').toLowerCase() === activeTab.toLowerCase());
        }
        if (searchText.trim()) {
          const q = searchText.trim().toLowerCase();
          local = local.filter((p) =>
            (p.studentName && p.studentName.toLowerCase().includes(q)) ||
            (p.gatePassNo && p.gatePassNo.toLowerCase().includes(q)) ||
            (p.admissionNo && p.admissionNo.toLowerCase().includes(q))
          );
        }
        setPasses(local);
      } catch (localErr) {
        console.warn('Local read error:', localErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPasses(1, false);
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPasses(1, false);
  }, [activeTab, searchText]);

  const handleSearchSubmit = () => {
    fetchPasses(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPasses(page + 1, true);
    }
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'returned') return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    if (s === 'departed' || s === 'issued') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    if (s === 'cancelled') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  const renderItem = ({ item }) => {
    const statusStyle = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('GatePassDetail', { passId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.gatePassNo}>{item.gatePassNo}</Text>
            <Text style={styles.cardDate}>
              {item.passDate ? new Date(item.passDate).toLocaleDateString() : 'Today'}
            </Text>
          </View>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: statusStyle.bg,
                borderColor: statusStyle.border,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.statusChipText, { color: statusStyle.text }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Student & Escort Details */}
        <View style={styles.cardBody}>
          {item.receiverPhotoUrl ? (
            <Image source={{ uri: item.receiverPhotoUrl }} style={styles.escortPhoto} />
          ) : (
            <View style={styles.escortPhotoPlaceholder}>
              <MaterialIcons name="person" size={24} color="#0284c7" />
            </View>
          )}

          <View style={styles.detailsCol}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={styles.metaText}>
              Class: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{item.className || 'N/A'}{item.sectionName ? ` (${item.sectionName})` : ''}</Text>
            </Text>
            <Text style={[styles.metaText, { color: '#0284c7', fontWeight: '600', marginTop: 1 }]}>
              Adm No: #{item.admissionNo || '—'}
            </Text>
            <View style={styles.escortRow}>
              <MaterialIcons name="verified-user" size={14} color="#64748b" />
              <Text style={styles.escortText}>
                Escort: <Text style={styles.boldText}>{item.receiverName}</Text> ({item.receiverRelation})
              </Text>
            </View>
            {item.receiverContact ? (
              <View style={styles.escortRow}>
                <MaterialIcons name="phone" size={14} color="#64748b" />
                <Text style={styles.escortText}>{item.receiverContact}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Time and Reason Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.timeTag}>
            <MaterialIcons name="access-time" size={14} color="#0369a1" />
            <Text style={styles.timeTagText}>Out: {item.outTime || 'N/A'}</Text>
          </View>

          {item.expectedReturnTime ? (
            <View style={[styles.timeTag, { backgroundColor: '#f0fdf4' }]}>
              <MaterialIcons name="update" size={14} color="#15803d" />
              <Text style={[styles.timeTagText, { color: '#15803d' }]}>
                Expected: {item.expectedReturnTime}
              </Text>
            </View>
          ) : null}

          {item.actualReturnTime ? (
            <View style={[styles.timeTag, { backgroundColor: '#ecfdf5' }]}>
              <MaterialIcons name="done-all" size={14} color="#047857" />
              <Text style={[styles.timeTagText, { color: '#047857' }]}>
                In: {item.actualReturnTime}
              </Text>
            </View>
          ) : null}
        </View>

        {item.reason ? (
          <View style={styles.reasonRow}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText} numberOfLines={1}>
              {item.reason}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by student, admission, escort..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                fetchPasses(1, false);
              }}
            >
              <MaterialIcons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => {
            const isActive = activeTab === item.value;
            return (
              <TouchableOpacity
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(item.value)}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List Content */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.centerLoadingText}>Loading gate passes...</Text>
        </View>
      ) : passes.length === 0 ? (
        <View style={styles.centerEmpty}>
          <MaterialIcons name="receipt-long" size={60} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Gate Passes Found</Text>
          <Text style={styles.emptyDesc}>
            {searchText
              ? 'Try adjusting your search criteria'
              : 'Issue a new student gate pass using the button below'}
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => navigation.navigate('IssueGatePass')}
          >
            <MaterialIcons name="add" size={18} color="#ffffff" />
            <Text style={styles.emptyActionBtnText}>Issue Gate Pass</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={passes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('IssueGatePass')}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBarContainer: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  tabsWrapper: {
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  centerLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  centerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gatePassNo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
  },
  escortPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.cardBorder,
  },
  escortPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCol: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  escortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  escortText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#082f49' : '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#38bdf8' : '#0369a1',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
