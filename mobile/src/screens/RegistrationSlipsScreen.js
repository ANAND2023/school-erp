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
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { registrationApi, classApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';

export default function RegistrationSlipsScreen({ navigation }) {
  const { user, activeAcademicYearName, activeAcademicYearId } = useContext(AuthContext);
  const { hasPermission, isSuperAdmin } = usePermission();
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canAddSlip = isSuperAdmin || hasPermission('Admissions', 'Add');
  const canConvert = isSuperAdmin || hasPermission(['Admissions', 'Students'], 'Add');

  const [slips, setSlips] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL'); // ALL, Paid, Partial, Unpaid

  // Issue Slip Modal
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [savingSlip, setSavingSlip] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [feeAmount, setFeeAmount] = useState('500');
  const [initialPayment, setInitialPayment] = useState('500');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');

  // Collect Payment Modal
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeAcademicYearId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classRes, slipsRes] = await Promise.all([
        classApi.getClasses().catch(() => ({ data: [] })),
        registrationApi.getSlips({ academicYearId: activeAcademicYearId }).catch(() => ({ data: { data: [] } })),
      ]);

      setClasses(classRes.data?.data || classRes.data || []);
      const slipList = slipsRes.data?.data?.items || slipsRes.data?.data || slipsRes.data || [];
      setSlips(Array.isArray(slipList) ? slipList : []);
    } catch (err) {
      console.warn('Load slips error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await registrationApi.getSlips({
        academicYearId: activeAcademicYearId,
        classId: selectedClassId || undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
      });
      const slipList = res.data?.data?.items || res.data?.data || res.data || [];
      setSlips(Array.isArray(slipList) ? slipList : []);
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Submit Issue New Registration Slip
  const handleIssueSlip = async () => {
    if (!studentName.trim()) {
      Alert.alert('Required Field', 'Please enter student name.');
      return;
    }
    if (!formClassId) {
      Alert.alert('Required Field', 'Please select a class.');
      return;
    }
    if (!contactNumber.trim()) {
      Alert.alert('Required Field', 'Please enter parent/student contact number.');
      return;
    }

    setSavingSlip(true);
    try {
      const payload = {
        studentName: studentName.trim(),
        parentName: parentName.trim(),
        contactNumber: contactNumber.trim(),
        classId: Number(formClassId),
        academicYearId: activeAcademicYearId,
        feeAmount: Number(feeAmount) || 500,
        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMode,
        remarks: remarks.trim(),
      };

      const res = await registrationApi.createIndividualSlip(payload);
      const createdSlip = res.data?.data || res.data;

      Alert.alert(
        'Slip Issued!',
        `Registration Slip #${createdSlip?.slipNumber || ''} created successfully!`,
        [
          {
            text: 'Share WhatsApp',
            onPress: () => {
              if (createdSlip) handleShareWhatsApp(createdSlip);
            },
          },
          { text: 'OK' },
        ]
      );

      setIssueModalVisible(false);
      resetIssueForm();
      loadData();
    } catch (err) {
      console.warn('Issue slip error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to issue registration slip.');
    } finally {
      setSavingSlip(false);
    }
  };

  const resetIssueForm = () => {
    setStudentName('');
    setParentName('');
    setContactNumber('');
    setFormClassId('');
    setFeeAmount('500');
    setInitialPayment('500');
    setPaymentMode('Cash');
    setRemarks('');
  };

  // Collect Remaining Payment
  const handleOpenPayModal = (slip) => {
    setSelectedSlip(slip);
    setPayAmount(String(slip.balanceAmount || ''));
    setPayMode('Cash');
    setPayRef('');
    setPayModalVisible(true);
  };

  const handleCollectPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    setSavingPay(true);
    try {
      await registrationApi.collectPayment({
        registrationSlipId: selectedSlip.id,
        amount: Number(payAmount),
        paymentMode: payMode,
        transactionReference: payRef.trim(),
      });

      Alert.alert('Payment Recorded', 'Fee payment successfully recorded!');
      setPayModalVisible(false);
      loadData();
    } catch (err) {
      console.warn('Payment collect error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSavingPay(false);
    }
  };

  // Convert / Admit to School
  const handleAdmitStudent = (slip) => {
    navigation.navigate('NewAdmission', {
      registrationSlipId: slip.id,
      registrationSlipNo: slip.slipNumber,
      prefill: {
        firstName: slip.studentName?.split(' ')[0] || '',
        lastName: slip.studentName?.split(' ').slice(1).join(' ') || '',
        fatherName: slip.parentName || '',
        mobile: slip.contactNumber || '',
        classId: slip.classId,
      },
    });
  };

  // WhatsApp Share Slip
  const handleShareWhatsApp = (slip) => {
    if (!slip.contactNumber) {
      Alert.alert('Missing Contact', 'No contact mobile registered for this slip.');
      return;
    }
    const cleanNumber = String(slip.contactNumber).replace(/\D/g, '');
    const phone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

    const message = `*STUDENT REGISTRATION SLIP*\n\nDear Parent/Student,\nRegistration details for *${slip.studentName}*:\n\n📋 *Slip No:* ${slip.slipNumber || 'N/A'}\n🏫 *Class:* ${slip.className || 'General'}\n💰 *Registration Fee:* ₹${slip.feeAmount || 500}\n✅ *Paid Amount:* ₹${slip.paidAmount || 0}\n⚠️ *Balance Due:* ₹${slip.balanceAmount || 0}\n📌 *Status:* ${slip.paymentStatus || 'Pending'}\n\n_Thank you for registering with us!_`;

    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp Not Installed', 'Unable to launch WhatsApp on this device.');
        }
      })
      .catch(() => Alert.alert('Error', 'Unable to launch WhatsApp'));
  };

  // Filtered Slips
  const filteredSlips = useMemo(() => {
    return slips.filter((item) => {
      if (selectedClassId && String(item.classId) !== String(selectedClassId)) return false;
      if (paymentStatusFilter !== 'ALL') {
        const status = (item.paymentStatus || '').toUpperCase();
        if (paymentStatusFilter.toUpperCase() !== status) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const sName = (item.studentName || '').toLowerCase();
        const pName = (item.parentName || '').toLowerCase();
        const sNo = (item.slipNumber || '').toLowerCase();
        const ph = (item.contactNumber || '').toLowerCase();
        if (!sName.includes(q) && !pName.includes(q) && !sNo.includes(q) && !ph.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [slips, selectedClassId, paymentStatusFilter, search]);

  // Summary Metrics
  const summary = useMemo(() => {
    let total = slips.length;
    let paid = 0;
    let due = 0;
    let admitted = 0;
    slips.forEach((s) => {
      if ((s.paymentStatus || '').toLowerCase() === 'paid') paid++;
      if (Number(s.balanceAmount) > 0) due++;
      if (s.admissionStatus === 'Admitted' || s.isAdmitted) admitted++;
    });
    return { total, paid, due, admitted };
  }, [slips]);

  const renderSlipCard = ({ item }) => {
    const isPaid = (item.paymentStatus || '').toLowerCase() === 'paid';
    const isPartial = (item.paymentStatus || '').toLowerCase() === 'partial';
    const isAdmitted = item.admissionStatus === 'Admitted' || item.isAdmitted;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.slipNoBadge}>
            <Ionicons name="document-text" size={13} color="#0284c7" />
            <Text style={styles.slipNoText}>{item.slipNumber || 'SLIP-NEW'}</Text>
          </View>

          <View style={styles.cardBadgesRow}>
            {isAdmitted ? (
              <View style={styles.admittedBadge}>
                <Ionicons name="school" size={11} color="#059669" />
                <Text style={styles.admittedBadgeText}>Admitted</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.payBadge,
                isPaid ? styles.payBadgePaid : isPartial ? styles.payBadgePartial : styles.payBadgeUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.payBadgeText,
                  isPaid ? styles.payBadgePaidText : isPartial ? styles.payBadgePartialText : styles.payBadgeUnpaidText,
                ]}
              >
                {item.paymentStatus || 'Unpaid'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.studentName}>{item.studentName}</Text>
        <Text style={styles.parentName}>Parent: {item.parentName || 'N/A'}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Class:</Text>
            <Text style={styles.metaVal}>{item.className || 'General'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Mobile:</Text>
            <Text style={styles.metaVal}>{item.contactNumber || 'N/A'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Fee / Paid:</Text>
            <Text style={styles.metaVal}>₹{item.feeAmount || 500} / ₹{item.paidAmount || 0}</Text>
          </View>
        </View>

        {Number(item.balanceAmount) > 0 && (
          <View style={styles.dueBanner}>
            <Ionicons name="alert-circle" size={13} color="#d97706" />
            <Text style={styles.dueBannerText}>Pending Balance: ₹{item.balanceAmount}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.actionBtnShare}
            onPress={() => handleShareWhatsApp(item)}
          >
            <FontAwesome5 name="whatsapp" size={14} color="#16a34a" />
            <Text style={styles.actionBtnShareText}>WhatsApp</Text>
          </TouchableOpacity>

          {Number(item.balanceAmount) > 0 && (
            <TouchableOpacity
              style={styles.actionBtnPay}
              onPress={() => handleOpenPayModal(item)}
            >
              <Ionicons name="card" size={14} color="#0284c7" />
              <Text style={styles.actionBtnPayText}>Pay</Text>
            </TouchableOpacity>
          )}

          {canConvert && !isAdmitted && (
            <TouchableOpacity
              style={styles.actionBtnAdmit}
              onPress={() => handleAdmitStudent(item)}
            >
              <Ionicons name="person-add" size={14} color="#ffffff" />
              <Text style={styles.actionBtnAdmitText}>Admit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Registration Slips</Text>
          <Text style={styles.headerSubtitle}>
            {activeAcademicYearName || 'Current Session'} • ₹500 Token Slips & Register
          </Text>
        </View>
        {canAddSlip && (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => {
              resetIssueForm();
              setIssueModalVisible(true);
            }}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Issue Slip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* KPI Cards Row */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: '#0284c7' }]}>
          <Text style={styles.kpiVal}>{summary.total}</Text>
          <Text style={styles.kpiLabel}>Total Slips</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#16a34a' }]}>
          <Text style={[styles.kpiVal, { color: '#16a34a' }]}>{summary.paid}</Text>
          <Text style={styles.kpiLabel}>Fully Paid</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#d97706' }]}>
          <Text style={[styles.kpiVal, { color: '#d97706' }]}>{summary.due}</Text>
          <Text style={styles.kpiLabel}>Due Balance</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}>
          <Text style={[styles.kpiVal, { color: '#8b5cf6' }]}>{summary.admitted}</Text>
          <Text style={styles.kpiLabel}>Admitted</Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student, slip #, parent, phone..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
        >
          {['ALL', 'Paid', 'Partial', 'Unpaid'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.filterPill, paymentStatusFilter === st && styles.filterPillActive]}
              onPress={() => setPaymentStatusFilter(st)}
            >
              <Text
                style={[styles.filterPillText, paymentStatusFilter === st && styles.filterPillTextActive]}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </Text>
            </TouchableOpacity>
          ))}
          {classes.map((cls) => {
            const isSel = String(cls.id) === String(selectedClassId);
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.filterPill, isSel && styles.filterPillActive]}
                onPress={() => setSelectedClassId(isSel ? null : cls.id)}
              >
                <Text style={[styles.filterPillText, isSel && styles.filterPillTextActive]}>
                  {cls.className || cls.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading registration slips...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSlips}
          keyExtractor={(item) => String(item.id || item.slipNumber)}
          renderItem={renderSlipCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={56} color={colors.cardBorder} />
              <Text style={styles.emptyTitle}>No Registration Slips Found</Text>
              <Text style={styles.emptySub}>
                Tap "+ Issue Slip" to create a new session registration slip.
              </Text>
            </View>
          }
        />
      )}

      {/* Issue Slip Modal */}
      <Modal
        visible={issueModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Issue Registration Slip</Text>
                <Text style={styles.modalSub}>Pre-admission registration record</Text>
              </View>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>STUDENT FULL NAME *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.textSecondary}
                value={studentName}
                onChangeText={setStudentName}
              />

              <Text style={styles.formLabel}>FATHER / GUARDIAN NAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Suresh Sharma"
                placeholderTextColor={colors.textSecondary}
                value={parentName}
                onChangeText={setParentName}
              />

              <Text style={styles.formLabel}>CONTACT MOBILE NUMBER *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={contactNumber}
                onChangeText={setContactNumber}
              />

              <Text style={styles.formLabel}>SELECT CLASS *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {classes.map((cls) => {
                  const isSel = String(cls.id) === String(formClassId);
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      style={[styles.formChip, isSel && styles.formChipActive]}
                      onPress={() => setFormClassId(cls.id)}
                    >
                      <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                        {cls.className || cls.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>FEE AMOUNT (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="500"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={feeAmount}
                    onChangeText={setFeeAmount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>AMOUNT PAID NOW (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="500"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={initialPayment}
                    onChangeText={setInitialPayment}
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>PAYMENT MODE</Text>
              <View style={styles.paymentModeRow}>
                {['Cash', 'UPI', 'Card', 'Cheque'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeBtn, paymentMode === mode && styles.modeBtnActive]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text style={[styles.modeBtnText, paymentMode === mode && styles.modeBtnTextActive]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>REMARKS (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Special notes, previous school, etc."
                placeholderTextColor={colors.textSecondary}
                value={remarks}
                onChangeText={setRemarks}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIssueModalVisible(false)}
                disabled={savingSlip}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleIssueSlip}
                disabled={savingSlip}
              >
                {savingSlip ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Generate Slip</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal
        visible={payModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPayModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Balance Payment</Text>
                <Text style={styles.modalSub}>
                  {selectedSlip?.studentName} • Slip #{selectedSlip?.slipNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>PAYMENT AMOUNT (₹) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />

              <Text style={styles.formLabel}>PAYMENT MODE</Text>
              <View style={styles.paymentModeRow}>
                {['Cash', 'UPI', 'Card', 'Cheque'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeBtn, payMode === mode && styles.modeBtnActive]}
                    onPress={() => setPayMode(mode)}
                  >
                    <Text style={[styles.modeBtnText, payMode === mode && styles.modeBtnTextActive]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>TRANSACTION REFERENCE (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="UPI UTR / Cheque No."
                placeholderTextColor={colors.textSecondary}
                value={payRef}
                onChangeText={setPayRef}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPayModalVisible(false)}
                disabled={savingPay}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCollectPayment}
                disabled={savingPay}
              >
                {savingPay ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Record Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#059669',
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
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    kpiLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
    },
    searchSection: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingBottom: 4,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 6,
      paddingHorizontal: 12,
      height: 38,
      borderRadius: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
    },
    filterScroll: {
      marginBottom: 4,
    },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginRight: 6,
    },
    filterPillActive: {
      backgroundColor: '#059669',
    },
    filterPillText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    filterPillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    listContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    slipNoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#082f49' : '#e0f2fe',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    slipNoText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    cardBadgesRow: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    admittedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? '#064e3b' : '#d1fae5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    admittedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#059669',
    },
    payBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    payBadgePaid: {
      backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    },
    payBadgePaidText: {
      color: '#16a34a',
      fontSize: 11,
      fontWeight: '700',
    },
    payBadgePartial: {
      backgroundColor: isDark ? '#451a03' : '#fef3c7',
    },
    payBadgePartialText: {
      color: '#d97706',
      fontSize: 11,
      fontWeight: '700',
    },
    payBadgeUnpaid: {
      backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    },
    payBadgeUnpaidText: {
      color: '#ef4444',
      fontSize: 11,
      fontWeight: '700',
    },
    studentName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    parentName: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 8,
    },
    metaCol: {
      alignItems: 'center',
    },
    metaLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    metaVal: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 1,
    },
    dueBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? '#451a03' : '#fffbeb',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
    },
    dueBannerText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#d97706',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 4,
    },
    actionBtnShare: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#064e3b' : '#dcfce7',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionBtnShareText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#16a34a',
    },
    actionBtnPay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#082f49' : '#e0f2fe',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionBtnPayText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    actionBtnAdmit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#059669',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionBtnAdmitText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
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
      paddingHorizontal: 32,
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
    formChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginRight: 6,
    },
    formChipActive: {
      backgroundColor: '#059669',
    },
    formChipText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    formChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    formRow: {
      flexDirection: 'row',
    },
    paymentModeRow: {
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
      backgroundColor: '#059669',
      borderColor: '#059669',
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
      backgroundColor: '#059669',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
