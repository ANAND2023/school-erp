import React, { useState, useEffect, useContext, useMemo } from 'react';
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
  SafeAreaView,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { accountsApi, expenseApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';

const TABS = [
  { id: 'daybook', label: 'Day Book', icon: 'book' },
  { id: 'collections', label: 'Collections', icon: 'wallet' },
  { id: 'expenses', label: 'Expenses', icon: 'receipt' },
  { id: 'profitloss', label: 'Profit & Loss', icon: 'trending-up' },
  { id: 'defaulters', label: 'Dues / Defaulters', icon: 'alert-circle' },
];

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'session', label: 'Full Session' },
];

export default function AccountsScreen({ navigation }) {
  const { user, activeAcademicYearName, activeAcademicYearId } = useContext(AuthContext);
  const { hasPermission, isSuperAdmin } = usePermission();
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canAddExpense = isSuperAdmin || hasPermission('Expenses', 'Add');

  const [activeTab, setActiveTab] = useState('daybook');
  const [preset, setPreset] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Financial Data
  const [summary, setSummary] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    netSurplus: 0,
    totalPendingDues: 0,
  });
  const [dayBookEntries, setDayBookEntries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [defaulters, setDefaulters] = useState([]);

  // Add Voucher Modal
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [voucherType, setVoucherType] = useState('Expense'); // Expense or Income
  const [voucherTitle, setVoucherTitle] = useState('');
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherMode, setVoucherMode] = useState('Cash');
  const [voucherRemarks, setVoucherRemarks] = useState('');
  const [savingVoucher, setSavingVoucher] = useState(false);

  useEffect(() => {
    loadAccountsData();
  }, [activeAcademicYearId, preset]);

  const getDateRange = (p) => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = end;

    if (p === 'today') {
      start = end;
    } else if (p === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (p === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      start = d.toISOString().split('T')[0];
    } else if (p === 'session') {
      const d = new Date(now.getFullYear(), 3, 1); // April 1st
      start = d.toISOString().split('T')[0];
    }
    return { startDate: start, endDate: end };
  };

  const loadAccountsData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(preset);
      const params = {
        academicYearId: activeAcademicYearId,
        startDate,
        endDate,
      };

      const [sumRes, daybookRes, expenseRes, duesRes] = await Promise.all([
        accountsApi.getSummary(params).catch(() => ({ data: {} })),
        accountsApi.getDayBook(params).catch(() => ({ data: { entries: [] } })),
        accountsApi.getExpenses(params).catch(() => ({ data: [] })),
        accountsApi.getDefaulters(params).catch(() => ({ data: [] })),
      ]);

      const sumData = sumRes.data?.data || sumRes.data || {};
      const entries = daybookRes.data?.data?.entries || daybookRes.data?.entries || [];
      const expList = expenseRes.data?.data?.items || expenseRes.data?.data || expenseRes.data || [];
      const dueList = duesRes.data?.data || duesRes.data || [];

      setSummary({
        totalInflow: Number(sumData.totalInflow || sumData.totalIncome || 0),
        totalOutflow: Number(sumData.totalOutflow || sumData.totalExpenses || 0),
        netSurplus:
          Number(sumData.netSurplus || sumData.netProfit || 0) ||
          Number(sumData.totalInflow || sumData.totalIncome || 0) -
            Number(sumData.totalOutflow || sumData.totalExpenses || 0),
        totalPendingDues: Number(sumData.totalPendingDues || sumData.outstandingFees || 0),
      });

      setDayBookEntries(Array.isArray(entries) ? entries : []);
      setExpenses(Array.isArray(expList) ? expList : []);
      setDefaulters(Array.isArray(dueList) ? dueList : []);

      // Extract fee collections from daybook or direct
      const feeItems = entries.filter((e) => (e.category || '').toLowerCase().includes('fee') || e.inflow > 0);
      setCollections(feeItems);
    } catch (err) {
      console.warn('Accounts load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccountsData();
    setRefreshing(false);
  };

  // Quick Add Expense Voucher
  const handleSaveVoucher = async () => {
    if (!voucherTitle.trim()) {
      Alert.alert('Required Field', 'Please enter title/head.');
      return;
    }
    if (!voucherAmount || Number(voucherAmount) <= 0) {
      Alert.alert('Required Field', 'Please enter valid amount.');
      return;
    }

    setSavingVoucher(true);
    try {
      await expenseApi.saveExpense({
        title: voucherTitle.trim(),
        amount: Number(voucherAmount),
        paymentMode: voucherMode,
        expenseDate: new Date().toISOString().split('T')[0],
        academicYearId: activeAcademicYearId,
        remarks: voucherRemarks.trim(),
      });

      Alert.alert('Voucher Saved', 'Expense transaction posted to Day Book.');
      setVoucherModalVisible(false);
      resetVoucherForm();
      loadAccountsData();
    } catch (err) {
      console.warn('Save expense voucher error:', err);
      Alert.alert('Error', 'Failed to save voucher.');
    } finally {
      setSavingVoucher(false);
    }
  };

  const resetVoucherForm = () => {
    setVoucherTitle('');
    setVoucherAmount('');
    setVoucherMode('Cash');
    setVoucherRemarks('');
  };

  // Export PDF Statement
  const handleExportStatement = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; color: #0284c7; }
            .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
            .kpi-row { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 6px; }
            .kpi-box { text-align: center; }
            .kpi-val { font-size: 16px; font-weight: bold; }
            .kpi-lbl { font-size: 11px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #e0f2fe; color: #0369a1; text-align: left; padding: 8px; border: 1px solid #cbd5e1; }
            td { padding: 8px; border: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">SCHOOL ACCOUNTS & FINANCE STATEMENT</div>
            <div class="sub">Academic Session: ${activeAcademicYearName || '2026-2027'} • Period: ${preset.toUpperCase()}</div>
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-val" style="color: #16a34a;">₹${summary.totalInflow.toLocaleString()}</div>
              <div class="kpi-lbl">Total Collections</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-val" style="color: #ef4444;">₹${summary.totalOutflow.toLocaleString()}</div>
              <div class="kpi-lbl">Total Outflows</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-val" style="color: ${summary.netSurplus >= 0 ? '#16a34a' : '#ef4444'};">
                ₹${summary.netSurplus.toLocaleString()}
              </div>
              <div class="kpi-lbl">Net Surplus</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-val" style="color: #d97706;">₹${summary.totalPendingDues.toLocaleString()}</div>
              <div class="kpi-lbl">Pending Dues</div>
            </div>
          </div>

          <h3>Day Book Transactions (${dayBookEntries.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Ref / Voucher</th>
                <th>Description</th>
                <th>Mode</th>
                <th>Inflow (₹)</th>
                <th>Outflow (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${dayBookEntries
                .slice(0, 50)
                .map(
                  (r) => `
                <tr>
                  <td>${r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td>${r.refNo || '—'}</td>
                  <td>${r.particulars || r.category || 'Entry'}</td>
                  <td>${r.paymentMode || 'Cash'}</td>
                  <td style="color: #16a34a; font-weight: bold;">${r.inflow ? `₹${Number(r.inflow).toLocaleString()}` : '—'}</td>
                  <td style="color: #ef4444; font-weight: bold;">${r.outflow ? `₹${Number(r.outflow).toLocaleString()}` : '—'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Statement Ready', 'Accounts statement generated.');
      }
    } catch (err) {
      console.warn('Export accounts statement error:', err);
      Alert.alert('Error', 'Unable to generate statement.');
    }
  };

  const renderDayBookItem = ({ item }) => {
    const isInflow = Number(item.inflow || 0) > 0;
    const isOutflow = Number(item.outflow || 0) > 0;
    const amount = isInflow ? item.inflow : item.outflow;

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryLeft}>
          <View
            style={[
              styles.entryIconBox,
              { backgroundColor: isInflow ? (isDark ? '#064e3b' : '#dcfce7') : (isDark ? '#450a0a' : '#fee2e2') },
            ]}
          >
            <Ionicons
              name={isInflow ? 'arrow-down' : 'arrow-up'}
              size={16}
              color={isInflow ? '#16a34a' : '#ef4444'}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.entryTitle} numberOfLines={1}>
              {item.particulars || item.category || 'Transaction'}
            </Text>
            <Text style={styles.entrySub}>
              {item.refNo ? `Ref: ${item.refNo} • ` : ''}
              {item.paymentMode || 'Cash'} •{' '}
              {item.date ? new Date(item.date).toLocaleDateString() : 'Today'}
            </Text>
          </View>
        </View>

        <View style={styles.entryRight}>
          <Text
            style={[
              styles.entryAmount,
              { color: isInflow ? '#16a34a' : '#ef4444' },
            ]}
          >
            {isInflow ? '+' : '-'}₹{Number(amount || 0).toLocaleString()}
          </Text>
          <Text style={styles.entryCategory}>{item.category || (isInflow ? 'Receipt' : 'Payment')}</Text>
        </View>
      </View>
    );
  };

  const renderDefaulterItem = ({ item }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryLeft}>
        <View style={[styles.entryIconBox, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
          <Ionicons name="warning" size={16} color="#d97706" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.entryTitle}>{item.studentName || item.fullName || 'Student'}</Text>
          <Text style={styles.entrySub}>
            Class: {item.className || item.classSection || 'N/A'} • Adm: {item.admissionNo || '—'}
          </Text>
          {item.guardianMobile ? (
            <Text style={styles.entryContact}>Parent: {item.guardianMobile}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.entryRight}>
        <Text style={[styles.entryAmount, { color: '#ef4444' }]}>
          ₹{Number(item.remainingDue || item.totalDue || 0).toLocaleString()}
        </Text>
        <Text style={styles.entryCategory}>Dues</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Accounts & Finance</Text>
          <Text style={styles.headerSubtitle}>
            Cash Book, Day Book & Financial Position
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportStatement}
          >
            <Ionicons name="print-outline" size={16} color="#0284c7" />
          </TouchableOpacity>
          {canAddExpense && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetVoucherForm();
                setVoucherModalVisible(true);
              }}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Voucher</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* KPI Cards Row */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: '#16a34a' }]}>
          <Text style={[styles.kpiVal, { color: '#16a34a' }]}>₹{summary.totalInflow.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>Inflow (Receipts)</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}>
          <Text style={[styles.kpiVal, { color: '#ef4444' }]}>₹{summary.totalOutflow.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>Outflow (Expenses)</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: summary.netSurplus >= 0 ? '#059669' : '#dc2626' }]}>
          <Text
            style={[
              styles.kpiVal,
              { color: summary.netSurplus >= 0 ? '#059669' : '#dc2626' },
            ]}
          >
            ₹{summary.netSurplus.toLocaleString()}
          </Text>
          <Text style={styles.kpiLabel}>Net Balance</Text>
        </View>
      </View>

      {/* Period Filter Row */}
      <View style={styles.presetRow}>
        {PRESETS.map((p) => {
          const isSel = preset === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.presetChip, isSel && styles.presetChipActive]}
              onPress={() => setPreset(p.id)}
            >
              <Text style={[styles.presetChipText, isSel && styles.presetChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tabs */}
      <View style={styles.tabsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6 }}
        >
          {TABS.map((t) => {
            const isSel = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabBtn, isSel && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.id)}
              >
                <Ionicons
                  name={t.icon}
                  size={13}
                  color={isSel ? '#ffffff' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabBtnText, isSel && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading accounts data...</Text>
        </View>
      ) : activeTab === 'profitloss' ? (
        /* P&L Breakdown View */
        <ScrollView style={styles.plContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.plSection}>
            <Text style={styles.plSectionTitle}>OPERATING REVENUES (INFLOW)</Text>
            <View style={styles.plRow}>
              <Text style={styles.plLabel}>Fee Collections (Tuition & Session)</Text>
              <Text style={[styles.plVal, { color: '#16a34a' }]}>
                ₹{summary.totalInflow.toLocaleString()}
              </Text>
            </View>
            <View style={styles.plDivider} />
            <View style={styles.plTotalRow}>
              <Text style={styles.plTotalLabel}>Total Operating Revenue</Text>
              <Text style={[styles.plTotalVal, { color: '#16a34a' }]}>
                ₹{summary.totalInflow.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.plSection}>
            <Text style={styles.plSectionTitle}>OPERATING EXPENSES (OUTFLOW)</Text>
            <View style={styles.plRow}>
              <Text style={styles.plLabel}>School Expenses & Vouchers</Text>
              <Text style={[styles.plVal, { color: '#ef4444' }]}>
                ₹{summary.totalOutflow.toLocaleString()}
              </Text>
            </View>
            <View style={styles.plDivider} />
            <View style={styles.plTotalRow}>
              <Text style={styles.plTotalLabel}>Total Operating Outflow</Text>
              <Text style={[styles.plTotalVal, { color: '#ef4444' }]}>
                ₹{summary.totalOutflow.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={[styles.plSummaryCard, { borderColor: summary.netSurplus >= 0 ? '#16a34a' : '#ef4444' }]}>
            <Text style={styles.plSummaryTitle}>NET OPERATING RESULT</Text>
            <Text
              style={[
                styles.plSummaryAmount,
                { color: summary.netSurplus >= 0 ? '#16a34a' : '#ef4444' },
              ]}
            >
              {summary.netSurplus >= 0 ? 'SURPLUS: +' : 'DEFICIT: -'}₹
              {Math.abs(summary.netSurplus).toLocaleString()}
            </Text>
            <Text style={styles.plSummarySub}>
              {summary.netSurplus >= 0
                ? 'Healthy financial operating balance in current period.'
                : 'Expenses exceeded collections in this duration.'}
            </Text>
          </View>
        </ScrollView>
      ) : activeTab === 'defaulters' ? (
        /* Defaulters List */
        <FlatList
          data={defaulters}
          keyExtractor={(item, idx) => String(item.id || idx)}
          renderItem={renderDefaulterItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={56} color="#16a34a" />
              <Text style={styles.emptyTitle}>No Pending Dues</Text>
              <Text style={styles.emptySub}>All student fee balances are clear!</Text>
            </View>
          }
        />
      ) : (
        /* Day Book / Collections / Expenses entries list */
        <FlatList
          data={
            activeTab === 'collections'
              ? collections
              : activeTab === 'expenses'
              ? dayBookEntries.filter((e) => Number(e.outflow) > 0)
              : dayBookEntries
          }
          keyExtractor={(item, idx) => String(item.id || idx)}
          renderItem={renderDayBookItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={56} color={colors.cardBorder} />
              <Text style={styles.emptyTitle}>No Entries Found</Text>
              <Text style={styles.emptySub}>
                No financial transactions recorded for this duration.
              </Text>
            </View>
          }
        />
      )}

      {/* Add Voucher Modal */}
      <Modal
        visible={voucherModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVoucherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Financial Voucher</Text>
                <Text style={styles.modalSub}>Record school expense or payment</Text>
              </View>
              <TouchableOpacity onPress={() => setVoucherModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>TITLE / HEAD *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Electric Bill, Lab Equipment, Stationary"
                placeholderTextColor={colors.textSecondary}
                value={voucherTitle}
                onChangeText={setVoucherTitle}
              />

              <Text style={styles.formLabel}>AMOUNT (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter voucher amount"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={voucherAmount}
                onChangeText={setVoucherAmount}
              />

              <Text style={styles.formLabel}>PAYMENT MODE</Text>
              <View style={styles.modeRow}>
                {['Cash', 'UPI', 'Bank', 'Cheque'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeBtn, voucherMode === m && styles.modeBtnActive]}
                    onPress={() => setVoucherMode(m)}
                  >
                    <Text style={[styles.modeBtnText, voucherMode === m && styles.modeBtnTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>REMARKS / VENDOR (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Vendor name or voucher notes"
                placeholderTextColor={colors.textSecondary}
                value={voucherRemarks}
                onChangeText={setVoucherRemarks}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setVoucherModalVisible(false)}
                disabled={savingVoucher}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveVoucher}
                disabled={savingVoucher}
              >
                {savingVoucher ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="save" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Post Voucher</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.cardBg,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    exportBtn: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#0284c7',
      backgroundColor: isDark ? '#082f49' : '#e0f2fe',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0284c7',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      gap: 4,
    },
    addButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    kpiRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 8,
      borderLeftWidth: 3,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    kpiVal: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    kpiLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    presetRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 6,
      gap: 6,
    },
    presetChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    presetChipActive: {
      backgroundColor: '#0284c7',
    },
    presetChipText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    presetChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    tabsSection: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginRight: 6,
    },
    tabBtnActive: {
      backgroundColor: '#0284c7',
    },
    tabBtnText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    tabBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    listContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    entryCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    entryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    entryIconBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    entrySub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    entryContact: {
      fontSize: 11,
      color: '#0284c7',
      fontWeight: '600',
      marginTop: 1,
    },
    entryRight: {
      alignItems: 'flex-end',
    },
    entryAmount: {
      fontSize: 14,
      fontWeight: '800',
    },
    entryCategory: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    plContainer: {
      padding: 16,
    },
    plSection: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    plSectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    plRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    plLabel: {
      fontSize: 13,
      color: colors.textPrimary,
    },
    plVal: {
      fontSize: 13,
      fontWeight: '700',
    },
    plDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 6,
    },
    plTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    plTotalLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    plTotalVal: {
      fontSize: 14,
      fontWeight: '800',
    },
    plSummaryCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 2,
      marginTop: 4,
    },
    plSummaryTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    plSummaryAmount: {
      fontSize: 22,
      fontWeight: '900',
      marginVertical: 6,
    },
    plSummarySub: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 12,
    },
    emptySub: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
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
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalBody: {
      padding: 16,
    },
    formLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 10,
    },
    textInput: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    modeBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    },
    modeBtnActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    modeBtnText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    modeBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    submitBtn: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
