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
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { expenseApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function ExpenseScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Expense Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [spenderName, setSpenderName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expRes, catRes] = await Promise.allSettled([
        expenseApi.getExpenses(),
        expenseApi.getCategories(),
      ]);

      if (expRes.status === 'fulfilled' && expRes.value?.data?.success) {
        setExpenses(expRes.value.data.data || []);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.data?.success) {
        setCategories(catRes.value.data.data || []);
      }
    } catch (e) {
      console.warn('Expense fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const totalExpense = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleCreateExpense = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter expense title.');
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Validation', 'Please enter valid amount.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        amount: amt,
        categoryId: selectedCategoryId || (categories[0]?.id || 1),
        spenderName: spenderName.trim() || 'School Admin',
        description: description.trim() || null,
        expenseDate: new Date().toISOString(),
      };

      const res = await expenseApi.saveExpense(payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Expense recorded successfully!');
        setModalVisible(false);
        setTitle('');
        setAmount('');
        setDescription('');
        setSpenderName('');
        loadData();
      } else {
        Alert.alert('Failed', res.data?.message || 'Could not save expense.');
      }
    } catch (e) {
      console.warn('Save expense error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Error saving expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderExpense = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="receipt" size={20} color="#ea580c" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.expenseTitle}>{item.title}</Text>
            <Text style={styles.expenseMeta}>
              Category: {item.category?.name || 'General'} • By: {item.spenderName || 'Admin'}
            </Text>
            <Text style={styles.expenseDate}>
              {item.expenseDate ? new Date(item.expenseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
            </Text>
          </View>
          <Text style={styles.expenseAmount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Total Banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroLabel}>Total Recorded Expenses</Text>
        <Text style={styles.heroTotal}>₹{totalExpense.toLocaleString('en-IN')}</Text>
        <Text style={styles.heroCount}>{expenses.length} expense vouchers</Text>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="account-balance-wallet" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderExpense}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
        />
      )}

      {/* Floating Add Expense Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record New Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.inputLabel}>Expense Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Science Lab Chemicals, Sports Items"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="₹ 0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                {categories.map((c) => {
                  const sel = selectedCategoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catChip, sel && styles.catChipSelected]}
                      onPress={() => setSelectedCategoryId(c.id)}
                    >
                      <Text style={[styles.catChipText, sel && styles.catChipTextSelected]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Spender / Paid To</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Stationery / Sports Coach"
                placeholderTextColor="#94a3b8"
                value={spenderName}
                onChangeText={setSpenderName}
              />

              <Text style={styles.inputLabel}>Description / Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Additional invoice / voucher details..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleCreateExpense}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Expense Voucher</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  heroBanner: {
    backgroundColor: isDark ? '#1e293b' : '#ea580c',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#ea580c',
  },
  heroLabel: {
    fontSize: 13,
    color: isDark ? '#fdba74' : '#ffedd5',
    fontWeight: '500',
  },
  heroTotal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  heroCount: {
    fontSize: 12,
    color: isDark ? '#94a3b8' : '#fed7aa',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    gap: 10,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: isDark ? '#431407' : '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  expenseMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: isDark ? '#fb923c' : '#ea580c',
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
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: isDark ? '#ea580c' : '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  textInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
  },
  catChips: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catChipSelected: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  catChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  catChipTextSelected: {
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
