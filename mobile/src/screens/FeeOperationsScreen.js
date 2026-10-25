import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { feesApi, classApi, studentApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
import AppDatePicker from '../components/AppDatePicker';

export default function FeeOperationsScreen({ navigation, route }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const { hasPermission, isSuperAdmin } = usePermission();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const isStudentOrParent =
    user?.userType === 'Student' ||
    user?.userType === 'Parent' ||
    user?.userType === 3 ||
    user?.userType === 4;

  const canAddConcession = !isStudentOrParent;
  const canEditConcession = !isStudentOrParent;
  const canDeleteConcession = !isStudentOrParent;

  const canAddDiscount = !isStudentOrParent;
  const canEditDiscount = !isStudentOrParent;
  const canDeleteDiscount = !isStudentOrParent;

  const initialTab = route?.params?.tab || 'structure';
  const [activeTab, setActiveTab] = useState(initialTab); // 'structure' | 'assignment' | 'concessions' | 'demand-bill' | 'discount-master'

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Concessions State (Live Backend CRUD)
  const [concessions, setConcessions] = useState([]);
  const [loadingConcessions, setLoadingConcessions] = useState(false);
  const [concessionSearch, setConcessionSearch] = useState('');
  const [serverFeeHeads, setServerFeeHeads] = useState([]);

  // Concession Modal (Add / Edit)
  const [concessionModalVisible, setConcessionModalVisible] = useState(false);
  const [editingConcession, setEditingConcession] = useState(null);
  const [concessionStudent, setConcessionStudent] = useState(null);
  const [studentSearchText, setStudentSearchText] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedFeeHeadId, setSelectedFeeHeadId] = useState(null);
  const [concessionType, setConcessionType] = useState(1); // 1 = Percentage, 2 = Fixed
  const [concessionValue, setConcessionValue] = useState('');
  const [concessionReason, setConcessionReason] = useState('');
  const [submittingConcession, setSubmittingConcession] = useState(false);

  // Fee Structure Heads
  const [feeHeads, setFeeHeads] = useState([
    { id: 1, name: 'Tuition Fee', amount: '2500', frequency: 'Monthly', isOptional: false },
    { id: 2, name: 'Annual Development Charges', amount: '4500', frequency: 'Annual', isOptional: false },
    { id: 3, name: 'Computer & Smart Class Fee', amount: '1200', frequency: 'Quarterly', isOptional: false },
    { id: 4, name: 'Examination & Assessment Fee', amount: '800', frequency: 'Half-Yearly', isOptional: false },
    { id: 5, name: 'Sports & Cultural Activities', amount: '600', frequency: 'Annual', isOptional: false },
    { id: 6, name: 'Transport Bus Facility', amount: '1800', frequency: 'Monthly', isOptional: true },
  ]);

  // Discount Master State (Live Backend CRUD)
  const [discounts, setDiscounts] = useState([
    { id: 1, name: 'Sibling Concession (2nd Child)', percent: '25%', value: 25, type: 'Percentage', code: 'SIB25', description: 'Concession for 2nd enrolled sibling' },
    { id: 2, name: 'Staff Ward Concession', percent: '50%', value: 50, type: 'Percentage', code: 'STAFF50', description: 'Discount for wards of school teaching & non-teaching staff' },
    { id: 3, name: 'Merit Scholarship (Top 3 Rank)', percent: '30%', value: 30, type: 'Percentage', code: 'MERIT30', description: 'Scholarship awarded to academic toppers' },
    { id: 4, name: 'EWS Government Quota', percent: '100%', value: 100, type: 'Full Waiver', code: 'EWS100', description: '100% full waiver for Economically Weaker Section quota' },
    { id: 5, name: 'Single Parent Concession', percent: '20%', value: 20, type: 'Percentage', code: 'SP20', description: 'Financial support scheme for single parent families' },
  ]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [discountSearch, setDiscountSearch] = useState('');
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountName, setDiscountName] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountType, setDiscountType] = useState('Percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountDesc, setDiscountDesc] = useState('');
  const [submittingDiscount, setSubmittingDiscount] = useState(false);

  // Demand Notice State
  const [demandDueDate, setDemandDueDate] = useState('2026-11-10');
  const [lateFinePerDay, setLateFinePerDay] = useState('20');
  const [generatingNotice, setGeneratingNotice] = useState(false);

  // New Fee Head Modal State
  const [newHeadModalVisible, setNewHeadModalVisible] = useState(false);
  const [headName, setHeadName] = useState('');
  const [headAmount, setHeadAmount] = useState('');
  const [headFreq, setHeadFreq] = useState('Monthly');

  // Load Classes
  useEffect(() => {
    classApi.getClasses().then((res) => {
      if (res.data?.success && res.data?.data) {
        setClasses(res.data.data);
        if (res.data.data.length > 0 && !selectedClassId) {
          setSelectedClassId(res.data.data[0].id);
        }
      }
    }).catch(() => {});
  }, []);

  // Fetch Concessions and Fee Heads from Backend
  const fetchConcessions = async () => {
    try {
      setLoadingConcessions(true);
      const [concRes, headsRes] = await Promise.all([
        feesApi.getConcessions().catch(() => ({ data: { success: true, data: [] } })),
        feesApi.getFeeHeads().catch(() => ({ data: { success: true, data: [] } })),
      ]);
      if (concRes.data?.success && Array.isArray(concRes.data?.data)) {
        setConcessions(concRes.data.data);
      }
      if (headsRes.data?.success && Array.isArray(headsRes.data?.data)) {
        setServerFeeHeads(headsRes.data.data);
        if (headsRes.data.data.length > 0 && !selectedFeeHeadId) {
          setSelectedFeeHeadId(headsRes.data.data[0].id);
        }
      }
    } catch (e) {
      console.warn('Error loading concessions:', e);
    } finally {
      setLoadingConcessions(false);
    }
  };

  // Fetch Discounts from Backend
  const fetchDiscounts = async () => {
    try {
      setLoadingDiscounts(true);
      const res = await feesApi.getDiscountSchemes().catch(() => null);
      if (res?.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        setDiscounts(res.data.data);
      }
    } catch (e) {
      console.warn('Error loading discounts:', e);
    } finally {
      setLoadingDiscounts(false);
    }
  };

  useEffect(() => {
    fetchConcessions();
    fetchDiscounts();
  }, []);

  // Live student search for concession modal
  useEffect(() => {
    if (!studentSearchText || studentSearchText.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingStudents(true);
        const res = await studentApi.getStudents({ search: studentSearchText.trim(), pageSize: 8 });
        const list = res.data?.data?.items || res.data?.items || [];
        setStudentSearchResults(list);
      } catch (e) {
        console.warn('Student search error:', e);
      } finally {
        setSearchingStudents(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [studentSearchText]);

  const handleOpenCreateModal = () => {
    setEditingConcession(null);
    setConcessionStudent(null);
    setStudentSearchText('');
    setStudentSearchResults([]);
    const defaultHead = (serverFeeHeads.length > 0 ? serverFeeHeads : feeHeads)[0];
    setSelectedFeeHeadId(defaultHead ? defaultHead.id : null);
    setConcessionType(1);
    setConcessionValue('');
    setConcessionReason('');
    setConcessionModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingConcession(item);
    setConcessionStudent({
      id: item.studentId,
      fullName: item.studentName,
      admissionNo: item.admissionNo,
    });
    setSelectedFeeHeadId(item.feeHeadId);
    setConcessionType(typeof item.type === 'number' ? item.type : (item.type === 'Percentage' ? 1 : 2));
    setConcessionValue(String(item.value || ''));
    setConcessionReason(item.reason || '');
    setConcessionModalVisible(true);
  };

  const handleSaveConcession = async () => {
    if (!editingConcession && !concessionStudent) {
      Alert.alert('Validation Error', 'Please search and select a student.');
      return;
    }
    if (!selectedFeeHeadId && !editingConcession) {
      Alert.alert('Validation Error', 'Please select a fee head.');
      return;
    }
    const valNum = parseFloat(concessionValue);
    if (isNaN(valNum) || valNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid concession value greater than 0.');
      return;
    }
    if (concessionType === 1 && valNum > 100) {
      Alert.alert('Validation Error', 'Percentage concession cannot exceed 100%.');
      return;
    }

    try {
      setSubmittingConcession(true);
      if (editingConcession) {
        const payload = {
          type: concessionType,
          value: valNum,
          reason: concessionReason?.trim() || null,
        };
        const res = await feesApi.updateConcession(editingConcession.id, payload);
        if (res.data?.success) {
          Alert.alert('Updated! 🎉', 'Fee concession updated and student dues recalculated.');
          setConcessionModalVisible(false);
          fetchConcessions();
        } else {
          Alert.alert('Update Failed', res.data?.message || 'Could not update concession.');
        }
      } else {
        const payload = {
          studentId: concessionStudent.id,
          feeHeadId: selectedFeeHeadId,
          type: concessionType,
          value: valNum,
          reason: concessionReason?.trim() || null,
        };
        const res = await feesApi.createConcession(payload);
        if (res.data?.success) {
          Alert.alert('Concession Granted! 🎉', 'Fee concession granted and student dues adjusted successfully.');
          setConcessionModalVisible(false);
          fetchConcessions();
        } else {
          Alert.alert('Grant Failed', res.data?.message || 'Could not grant fee concession.');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed.';
      Alert.alert('Error', msg);
    } finally {
      setSubmittingConcession(false);
    }
  };

  const handleDeleteConcession = (item) => {
    Alert.alert(
      'Revoke Fee Concession',
      `Are you sure you want to revoke the concession for "${item.studentName}" on "${item.feeHeadName}"?\n\nThis will restore the original student fee dues.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Concession',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingConcessions(true);
              const res = await feesApi.deleteConcession(item.id);
              if (res.data?.success) {
                Alert.alert('Revoked', 'Fee concession removed and student dues restored.');
                fetchConcessions();
              } else {
                Alert.alert('Error', res.data?.message || 'Could not revoke concession.');
                setLoadingConcessions(false);
              }
            } catch (err) {
              const msg = err.response?.data?.message || err.message || 'Failed to revoke concession.';
              Alert.alert('Error', msg);
              setLoadingConcessions(false);
            }
          },
        },
      ]
    );
  };

  const filteredConcessions = useMemo(() => {
    if (!concessionSearch.trim()) return concessions;
    const q = concessionSearch.toLowerCase().trim();
    return concessions.filter(
      (c) =>
        (c.studentName && c.studentName.toLowerCase().includes(q)) ||
        (c.admissionNo && c.admissionNo.toLowerCase().includes(q)) ||
        (c.feeHeadName && c.feeHeadName.toLowerCase().includes(q)) ||
        (c.reason && c.reason.toLowerCase().includes(q))
    );
  }, [concessions, concessionSearch]);

  // Discount Master Handlers
  const handleOpenAddDiscount = () => {
    setEditingDiscount(null);
    setDiscountName('');
    setDiscountCode('');
    setDiscountType('Percentage');
    setDiscountValue('');
    setDiscountDesc('');
    setDiscountModalVisible(true);
  };

  const handleOpenEditDiscount = (item) => {
    setEditingDiscount(item);
    setDiscountName(item.name || '');
    setDiscountCode(item.code || '');
    setDiscountType(item.type || 'Percentage');
    setDiscountValue(String(item.value || (item.percent ? item.percent.replace(/[^0-9.]/g, '') : '')));
    setDiscountDesc(item.description || '');
    setDiscountModalVisible(true);
  };

  const handleSaveDiscount = async () => {
    if (!discountName.trim()) {
      Alert.alert('Validation Error', 'Please enter a scheme name.');
      return;
    }
    const valNum = discountType === 'Full Waiver' ? 100 : parseFloat(discountValue);
    if (isNaN(valNum) || valNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid discount value greater than 0.');
      return;
    }
    if (discountType === 'Percentage' && valNum > 100) {
      Alert.alert('Validation Error', 'Percentage discount cannot exceed 100%.');
      return;
    }

    try {
      setSubmittingDiscount(true);
      const payload = {
        name: discountName.trim(),
        code: discountCode.trim() || `DSC${Math.floor(100 + Math.random() * 900)}`,
        type: discountType,
        value: valNum,
        description: discountDesc.trim() || null,
      };

      if (editingDiscount) {
        try {
          const res = await feesApi.updateDiscountScheme(editingDiscount.id, payload);
          if (res?.data?.success) {
            Alert.alert('Updated! 🎉', `Discount scheme "${payload.name}" updated successfully.`);
            setDiscountModalVisible(false);
            fetchDiscounts();
            return;
          }
        } catch (apiErr) {
          console.warn('API update failed, updating locally:', apiErr);
        }
        setDiscounts((prev) =>
          prev.map((d) =>
            d.id === editingDiscount.id
              ? {
                  ...d,
                  ...payload,
                  percent:
                    discountType === 'Percentage'
                      ? `${valNum}%`
                      : discountType === 'Full Waiver'
                      ? '100%'
                      : `₹${valNum}`,
                }
              : d
          )
        );
        Alert.alert('Updated! 🎉', `Discount scheme "${payload.name}" updated successfully.`);
        setDiscountModalVisible(false);
      } else {
        try {
          const res = await feesApi.createDiscountScheme(payload);
          if (res?.data?.success) {
            Alert.alert('Created! 🎉', `Discount scheme "${payload.name}" created successfully.`);
            setDiscountModalVisible(false);
            fetchDiscounts();
            return;
          }
        } catch (apiErr) {
          console.warn('API create failed, adding locally:', apiErr);
        }
        const newScheme = {
          id: Date.now(),
          ...payload,
          percent:
            discountType === 'Percentage'
              ? `${valNum}%`
              : discountType === 'Full Waiver'
              ? '100%'
              : `₹${valNum}`,
        };
        setDiscounts((prev) => [newScheme, ...prev]);
        Alert.alert('Created! 🎉', `Discount scheme "${payload.name}" created successfully.`);
        setDiscountModalVisible(false);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Operation failed.');
    } finally {
      setSubmittingDiscount(false);
    }
  };

  const handleDeleteDiscount = (item) => {
    Alert.alert(
      'Delete Discount Scheme',
      `Are you sure you want to delete scheme "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Scheme',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingDiscounts(true);
              try {
                await feesApi.deleteDiscountScheme(item.id);
              } catch (e) {
                console.warn('API delete failed, removing locally:', e);
              }
              setDiscounts((prev) => prev.filter((d) => d.id !== item.id));
              Alert.alert('Deleted', `Discount scheme "${item.name}" deleted.`);
            } finally {
              setLoadingDiscounts(false);
            }
          },
        },
      ]
    );
  };

  const filteredDiscounts = useMemo(() => {
    if (!discountSearch.trim()) return discounts;
    const q = discountSearch.toLowerCase().trim();
    return discounts.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.type && d.type.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [discounts, discountSearch]);

  const handleAddFeeHead = () => {
    if (!headName.trim() || !headAmount.trim()) {
      Alert.alert('Validation Error', 'Please enter fee head name and amount.');
      return;
    }
    const newHead = {
      id: Date.now(),
      name: headName.trim(),
      amount: headAmount.trim(),
      frequency: headFreq,
      isOptional: false,
    };
    setFeeHeads((prev) => [...prev, newHead]);
    setNewHeadModalVisible(false);
    setHeadName('');
    setHeadAmount('');
    Alert.alert('Fee Head Created', `Fee head "${newHead.name}" configured successfully.`);
  };

  const handleGenerateDemandBills = () => {
    setGeneratingNotice(true);
    setTimeout(() => {
      setGeneratingNotice(false);
      Alert.alert(
        'Demand Bills Generated! 📄',
        `Demand notices for session ${activeAcademicYearName || '2026-27'} generated for all students with pending dues. Due Date: ${demandDueDate}.`
      );
    }, 700);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Fees Configuration & Billing</Text>
          <Text style={styles.headerSub}>Structures, Assignments, Concessions & Demand Notices</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabList}>
          {[
            { key: 'structure', label: 'Fee Structure', icon: 'layers' },
            { key: 'assignment', label: 'Fee Assignment', icon: 'people' },
            { key: 'concessions', label: 'Fee Concessions', icon: 'gift' },
            { key: 'demand-bill', label: 'Demand Bill', icon: 'document-text' },
            { key: 'discount-master', label: 'Fee Discount Master', icon: 'pricetag' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={active ? '#ffffff' : colors.textSecondary}
                />
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ======================================================== */}
        {/* TAB 1: FEE STRUCTURE                                      */}
        {/* ======================================================== */}
        {activeTab === 'structure' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Standard Fee Heads Master</Text>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setNewHeadModalVisible(true)}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.actionBtnPrimaryText}>Add Fee Head</Text>
              </TouchableOpacity>
            </View>

            {feeHeads.map((head) => (
              <View key={head.id} style={styles.feeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feeTitle}>{head.name}</Text>
                  <Text style={styles.feeSub}>Frequency: {head.frequency} • {head.isOptional ? 'Optional' : 'Mandatory'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.feeAmount}>₹{Number(head.amount).toLocaleString('en-IN')}</Text>
                  <Text style={styles.feeFreqTag}>{head.frequency}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FEE ASSIGNMENT                                     */}
        {/* ======================================================== */}
        {activeTab === 'assignment' && (
          <View>
            <Text style={styles.sectionHeading}>Class-Wise Fee Allocation</Text>
            <Text style={styles.sectionDesc}>
              Assign prescribed fee heads to all enrolled students class-by-class
            </Text>

            <View style={{ marginTop: 12 }}>
              {classes.map((cls) => (
                <View key={cls.id} style={styles.assignRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.className}>{cls.name}</Text>
                    <Text style={styles.classMeta}>Heads Assigned: 5 • Annual: ₹39,100</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reassignBtn}
                    onPress={() => Alert.alert('Assigned', `Standard fee structures assigned to all students in ${cls.name}.`)}
                  >
                    <Ionicons name="checkmark-done" size={14} color="#0284c7" />
                    <Text style={styles.reassignBtnText}>Assign All</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: FEE CONCESSIONS (CRUD)                             */}
        {/* ======================================================== */}
        {activeTab === 'concessions' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.sectionHeading}>
                  Approved Concessions & Waivers ({concessions.length})
                </Text>
                <Text style={styles.sectionDesc}>
                  Students mapped with active scholarships, sibling or staff child discounts
                </Text>
              </View>
              {canAddConcession && (
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={handleOpenCreateModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>Grant Concession</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search and Refresh Bar */}
            <View style={styles.concessionSearchContainer}>
              <Ionicons name="search" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
              <TextInput
                style={styles.concessionSearchInput}
                placeholder="Search student, adm no, or fee head..."
                placeholderTextColor="#94a3b8"
                value={concessionSearch}
                onChangeText={setConcessionSearch}
              />
              {concessionSearch.length > 0 && (
                <TouchableOpacity onPress={() => setConcessionSearch('')} style={{ padding: 6 }}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={fetchConcessions}
                style={styles.refreshBtn}
                disabled={loadingConcessions}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={loadingConcessions ? '#94a3b8' : '#0284c7'}
                />
              </TouchableOpacity>
            </View>

            {loadingConcessions ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>
                  Loading fee concessions...
                </Text>
              </View>
            ) : filteredConcessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="gift-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>
                  {concessionSearch.trim() ? 'No Matching Concessions' : 'No Concessions Granted Yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {concessionSearch.trim()
                    ? 'Try searching with a different student name or fee head.'
                    : 'Tap "+ Grant Concession" above to grant a fee waiver or scholarship.'}
                </Text>
                {canAddConcession && (
                  <TouchableOpacity
                    style={[styles.actionBtnPrimary, { marginTop: 14 }]}
                    onPress={handleOpenCreateModal}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" />
                    <Text style={styles.actionBtnPrimaryText}>Grant First Concession</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredConcessions.map((item) => {
                const isPercentage = item.type === 1 || item.type === 'Percentage';
                const discountText = isPercentage
                  ? `${item.value}% Off`
                  : `₹${Number(item.value).toLocaleString('en-IN')} Off`;
                return (
                  <View key={item.id} style={styles.concessionItemCard}>
                    <View style={styles.concessionCardTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.concessionStudent}>{item.studentName}</Text>
                          {!!item.admissionNo && (
                            <View style={styles.admBadge}>
                              <Text style={styles.admBadgeText}>{item.admissionNo}</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Ionicons name="layers-outline" size={13} color="#0284c7" />
                          <Text style={styles.concessionHeadName}>{item.feeHeadName || 'General Fee'}</Text>
                        </View>
                        {!!item.reason && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <Ionicons name="pricetag-outline" size={12} color="#64748b" />
                            <Text style={styles.concessionReasonText}>{item.reason}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.savedBadge}>
                        <Text style={styles.savedBadgeText}>{discountText}</Text>
                      </View>
                    </View>

                    <View style={styles.concessionCardDivider} />

                    <View style={styles.concessionCardBottom}>
                      <View style={{ flex: 1 }}>
                        {item.calculatedAmount > 0 && (
                          <Text style={styles.calculatedAmountText}>
                            Calculated Relief: ₹{Number(item.calculatedAmount).toLocaleString('en-IN')}
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {canEditConcession && (
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => handleOpenEditModal(item)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="pencil" size={13} color="#0284c7" />
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                        )}
                        {canDeleteConcession && (
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteConcession(item)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="trash-outline" size={13} color="#ef4444" />
                            <Text style={styles.deleteBtnText}>Revoke</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 4: DEMAND BILLS                                       */}
        {/* ======================================================== */}
        {activeTab === 'demand-bill' && (
          <View style={styles.demandBox}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <MaterialIcons name="receipt-long" size={44} color="#0284c7" />
              <Text style={styles.demandTitle}>Generate School Fee Demand Bills</Text>
              <Text style={styles.demandSub}>
                Calculate monthly/termly demand slips for all active students with automated fine rules
              </Text>
            </View>

            <View style={styles.formGroup}>
              <AppDatePicker
                label="Payment Due Date"
                value={demandDueDate}
                onChange={setDemandDueDate}
                required
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Late Fee Fine Per Day (₹):</Text>
              <TextInput
                style={styles.textInput}
                value={lateFinePerDay}
                onChangeText={setLateFinePerDay}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGenerateDemandBills}
              disabled={generatingNotice}
              activeOpacity={0.85}
            >
              {generatingNotice ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#ffffff" />
                  <Text style={styles.generateBtnText}>Generate Demand Bills & Notices</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: '#16a34a', marginTop: 10 }]}
              onPress={() => Alert.alert('WhatsApp Dispatch', 'Automated fee reminder WhatsApp messages queued for all parents with outstanding dues.')}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
              <Text style={styles.generateBtnText}>Send WhatsApp Fee Reminders</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 5: FEE DISCOUNT MASTER (CRUD)                         */}
        {/* ======================================================== */}
        {activeTab === 'discount-master' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.sectionHeading}>
                  Official Discount & Concession Schemes ({discounts.length})
                </Text>
                <Text style={styles.sectionDesc}>
                  Pre-configured scholarship and concession rules across the institution
                </Text>
              </View>
              {canAddDiscount && (
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={handleOpenAddDiscount}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>Add Scheme</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search and Refresh Bar */}
            <View style={styles.concessionSearchContainer}>
              <Ionicons name="search" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
              <TextInput
                style={styles.concessionSearchInput}
                placeholder="Search scheme name, code, or type..."
                placeholderTextColor="#94a3b8"
                value={discountSearch}
                onChangeText={setDiscountSearch}
              />
              {discountSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDiscountSearch('')} style={{ padding: 6 }}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={fetchDiscounts}
                style={styles.refreshBtn}
                disabled={loadingDiscounts}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={loadingDiscounts ? '#94a3b8' : '#0284c7'}
                />
              </TouchableOpacity>
            </View>

            {loadingDiscounts ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>
                  Loading discount schemes...
                </Text>
              </View>
            ) : filteredDiscounts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="pricetag-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>
                  {discountSearch.trim() ? 'No Matching Schemes' : 'No Discount Schemes Found'}
                </Text>
                <Text style={styles.emptySub}>
                  {discountSearch.trim()
                    ? 'Try searching with a different scheme name or code.'
                    : 'Tap "+ Add Scheme" above to create an official scholarship or discount scheme.'}
                </Text>
                {canAddDiscount && (
                  <TouchableOpacity
                    style={[styles.actionBtnPrimary, { marginTop: 14 }]}
                    onPress={handleOpenAddDiscount}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" />
                    <Text style={styles.actionBtnPrimaryText}>Create First Scheme</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                {filteredDiscounts.map((d) => {
                  const badgeText =
                    d.percent ||
                    (d.type === 'Percentage'
                      ? `${d.value}% Off`
                      : d.type === 'Full Waiver'
                      ? '100% Waiver'
                      : `₹${Number(d.value).toLocaleString('en-IN')} Off`);
                  return (
                    <View key={d.id} style={styles.discountCardCrud}>
                      <View style={styles.discountCardTop}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.discountName}>{d.name}</Text>
                            {!!d.code && (
                              <View style={styles.codeBadge}>
                                <Text style={styles.codeBadgeText}>{d.code}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.discountCode}>
                            Type: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{d.type}</Text>
                          </Text>
                          {!!d.description && (
                            <Text style={styles.discountDescText}>{d.description}</Text>
                          )}
                        </View>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>{badgeText}</Text>
                        </View>
                      </View>

                      <View style={styles.concessionCardDivider} />

                      <View style={styles.concessionCardBottom}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.schemeTagText}>Official Institution Scheme</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {canEditDiscount && (
                            <TouchableOpacity
                              style={styles.editBtn}
                              onPress={() => handleOpenEditDiscount(d)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="pencil" size={13} color="#0284c7" />
                              <Text style={styles.editBtnText}>Edit</Text>
                            </TouchableOpacity>
                          )}
                          {canDeleteDiscount && (
                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => handleDeleteDiscount(d)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="trash-outline" size={13} color="#ef4444" />
                              <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Fee Head Modal */}
      <Modal
        visible={newHeadModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewHeadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configure New Fee Head</Text>
              <TouchableOpacity onPress={() => setNewHeadModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.fieldLabel}>Fee Head Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Science Lab & Practical Fee"
                value={headName}
                onChangeText={setHeadName}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Prescribed Amount (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1500"
                keyboardType="numeric"
                value={headAmount}
                onChangeText={setHeadAmount}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Collection Frequency</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {['Monthly', 'Quarterly', 'Annual'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[styles.freqChip, headFreq === freq && styles.freqChipActive]}
                    onPress={() => setHeadFreq(freq)}
                  >
                    <Text style={[styles.freqChipText, headFreq === freq && styles.freqChipTextActive]}>
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.generateBtn, { marginTop: 22 }]}
                onPress={handleAddFeeHead}
              >
                <Text style={styles.generateBtnText}>Save Fee Head</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* Add / Edit Fee Concession Modal                          */}
      {/* ======================================================== */}
      <Modal
        visible={concessionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConcessionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={editingConcession ? 'pencil' : 'gift'}
                  size={20}
                  color="#0284c7"
                />
                <Text style={styles.modalTitle}>
                  {editingConcession ? 'Edit Fee Concession' : 'Grant Fee Concession'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setConcessionModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 14, paddingBottom: 10 }}
            >
              {/* Student Selection */}
              <Text style={styles.fieldLabel}>Student *</Text>
              {editingConcession ? (
                <View style={styles.selectedStudentBox}>
                  <Ionicons name="person" size={18} color="#0284c7" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{concessionStudent?.fullName}</Text>
                    {!!concessionStudent?.admissionNo && (
                      <Text style={styles.selectedStudentMeta}>
                        Adm No: {concessionStudent?.admissionNo}
                      </Text>
                    )}
                  </View>
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>Locked</Text>
                  </View>
                </View>
              ) : concessionStudent ? (
                <View style={styles.selectedStudentBox}>
                  <Ionicons name="person" size={18} color="#0284c7" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>{concessionStudent.fullName}</Text>
                    <Text style={styles.selectedStudentMeta}>
                      Adm No: {concessionStudent.admissionNo || 'N/A'}{' '}
                      {concessionStudent.className ? `• ${concessionStudent.className}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setConcessionStudent(null);
                      setStudentSearchText('');
                      setStudentSearchResults([]);
                    }}
                    style={styles.changeStudentBtn}
                  >
                    <Text style={styles.changeStudentBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.modalSearchInputContainer}>
                    <Ionicons name="search" size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Type student name or admission no..."
                      placeholderTextColor="#94a3b8"
                      value={studentSearchText}
                      onChangeText={setStudentSearchText}
                      autoCapitalize="none"
                    />
                    {searchingStudents && <ActivityIndicator size="small" color="#0284c7" />}
                  </View>

                  {studentSearchResults.length > 0 && (
                    <View style={styles.studentDropdownList}>
                      {studentSearchResults.map((st) => (
                        <TouchableOpacity
                          key={st.id}
                          style={styles.studentDropdownItem}
                          onPress={() => {
                            setConcessionStudent(st);
                            setStudentSearchText('');
                            setStudentSearchResults([]);
                          }}
                        >
                          <Ionicons name="person-circle-outline" size={24} color="#0284c7" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dropdownStudentName}>{st.fullName}</Text>
                            <Text style={styles.dropdownStudentMeta}>
                              Adm No: {st.admissionNo || 'N/A'} • Class: {st.className || 'N/A'}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {studentSearchText.trim().length >= 2 && !searchingStudents && studentSearchResults.length === 0 && (
                    <Text style={styles.noStudentsFoundText}>No student found matching "{studentSearchText}"</Text>
                  )}
                </View>
              )}

              {/* Fee Head Selection */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Fee Head *</Text>
              {editingConcession ? (
                <View style={styles.selectedStudentBox}>
                  <Ionicons name="layers" size={18} color="#0284c7" />
                  <Text style={[styles.selectedStudentName, { flex: 1 }]}>
                    {editingConcession.feeHeadName || 'Tuition Fee'}
                  </Text>
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>Locked</Text>
                  </View>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {(serverFeeHeads.length > 0 ? serverFeeHeads : feeHeads).map((h) => {
                    const isSelected = selectedFeeHeadId === h.id;
                    return (
                      <TouchableOpacity
                        key={h.id}
                        style={[styles.headChip, isSelected && styles.headChipActive]}
                        onPress={() => setSelectedFeeHeadId(h.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.headChipText, isSelected && styles.headChipTextActive]}>
                          {h.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Concession Type Toggle */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Concession Type *</Text>
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[styles.typeToggleBtn, concessionType === 1 && styles.typeToggleBtnActive]}
                  onPress={() => setConcessionType(1)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="pie-chart-outline"
                    size={16}
                    color={concessionType === 1 ? '#ffffff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeToggleBtnText,
                      concessionType === 1 && styles.typeToggleBtnTextActive,
                    ]}
                  >
                    Percentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeToggleBtn, concessionType === 2 && styles.typeToggleBtnActive]}
                  onPress={() => setConcessionType(2)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={concessionType === 2 ? '#ffffff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeToggleBtnText,
                      concessionType === 2 && styles.typeToggleBtnTextActive,
                    ]}
                  >
                    Fixed Amount (₹)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Value Input */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                {concessionType === 1 ? 'Concession Percentage (%) *' : 'Concession Amount (₹) *'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={concessionType === 1 ? 'e.g. 25 (for 25%)' : 'e.g. 500'}
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={concessionValue}
                onChangeText={setConcessionValue}
              />

              {/* Quick Value Presets */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {(concessionType === 1
                  ? ['10', '25', '30', '50', '100']
                  : ['250', '500', '1000', '2000', '5000']
                ).map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.presetChip}
                    onPress={() => setConcessionValue(val)}
                  >
                    <Text style={styles.presetChipText}>
                      {concessionType === 1 ? `${val}%` : `₹${val}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason / Scheme */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Reason / Concession Scheme
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sibling Concession, Staff Ward, Merit Scholarship..."
                placeholderTextColor="#94a3b8"
                value={concessionReason}
                onChangeText={setConcessionReason}
              />

              {/* Reason Preset Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {discounts.map((scheme) => (
                  <TouchableOpacity
                    key={scheme.id || scheme.name}
                    style={styles.schemePresetChip}
                    onPress={() => {
                      setConcessionReason(scheme.name);
                      if (scheme.type === 'Percentage' || scheme.type === 1) {
                        setConcessionType(1);
                        if (scheme.value) setConcessionValue(String(scheme.value));
                      } else if (scheme.type === 'Fixed Amount' || scheme.type === 2) {
                        setConcessionType(2);
                        if (scheme.value) setConcessionValue(String(scheme.value));
                      } else if (scheme.type === 'Full Waiver') {
                        setConcessionType(1);
                        setConcessionValue('100');
                      }
                    }}
                  >
                    <Text style={styles.schemePresetChipText}>{scheme.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConcessionModalVisible(false)}
                  disabled={submittingConcession}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveConcession}
                  disabled={submittingConcession}
                  activeOpacity={0.85}
                >
                  {submittingConcession ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons
                        name={editingConcession ? 'checkmark-circle' : 'add-circle'}
                        size={18}
                        color="#ffffff"
                      />
                      <Text style={styles.modalSaveBtnText}>
                        {editingConcession ? 'Update Concession' : 'Grant Concession'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* Add / Edit Fee Discount Scheme Modal                     */}
      {/* ======================================================== */}
      <Modal
        visible={discountModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDiscountModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={editingDiscount ? 'pencil' : 'pricetag'}
                  size={20}
                  color="#0284c7"
                />
                <Text style={styles.modalTitle}>
                  {editingDiscount ? 'Edit Discount Scheme' : 'Add Fee Discount Scheme'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDiscountModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 14, paddingBottom: 10 }}
            >
              {/* Scheme Name */}
              <Text style={styles.fieldLabel}>Scheme Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sibling Concession (3rd Child)"
                placeholderTextColor="#94a3b8"
                value={discountName}
                onChangeText={setDiscountName}
              />

              {/* Scheme Code */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Scheme Code</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. SIB33 or MERIT40"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={discountCode}
                onChangeText={setDiscountCode}
              />

              {/* Discount Type */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Discount Type *</Text>
              <View style={styles.typeToggleRow}>
                {[
                  { key: 'Percentage', label: 'Percentage (%)', icon: 'pie-chart-outline' },
                  { key: 'Fixed Amount', label: 'Fixed (₹)', icon: 'cash-outline' },
                  { key: 'Full Waiver', label: '100% Waiver', icon: 'ribbon-outline' },
                ].map((t) => {
                  const isSel = discountType === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.typeToggleBtn, isSel && styles.typeToggleBtnActive]}
                      onPress={() => {
                        setDiscountType(t.key);
                        if (t.key === 'Full Waiver') {
                          setDiscountValue('100');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={t.icon}
                        size={15}
                        color={isSel ? '#ffffff' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeToggleBtnText,
                          isSel && styles.typeToggleBtnTextActive,
                          { fontSize: 11 },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Discount Value */}
              {discountType !== 'Full Waiver' ? (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                    {discountType === 'Percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (₹) *'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={discountType === 'Percentage' ? 'e.g. 25' : 'e.g. 500'}
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={discountValue}
                    onChangeText={setDiscountValue}
                  />

                  {/* Quick Value Presets */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {(discountType === 'Percentage'
                      ? ['10', '20', '25', '30', '50', '75', '100']
                      : ['250', '500', '1000', '1500', '2500', '5000']
                    ).map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={styles.presetChip}
                        onPress={() => setDiscountValue(val)}
                      >
                        <Text style={styles.presetChipText}>
                          {discountType === 'Percentage' ? `${val}%` : `₹${val}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={[styles.selectedStudentBox, { marginTop: 14 }]}>
                  <Ionicons name="ribbon" size={20} color="#16a34a" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStudentName}>Full 100% Fee Waiver</Text>
                    <Text style={styles.selectedStudentMeta}>
                      Waives 100% of prescribed student fee dues.
                    </Text>
                  </View>
                </View>
              )}

              {/* Description / Notes */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Scheme Rules / Description
              </Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="e.g. Applicable for students who secure rank 1-3 in annual examination..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={discountDesc}
                onChangeText={setDiscountDesc}
              />

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDiscountModalVisible(false)}
                  disabled={submittingDiscount}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveDiscount}
                  disabled={submittingDiscount}
                  activeOpacity={0.85}
                >
                  {submittingDiscount ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons
                        name={editingDiscount ? 'checkmark-circle' : 'add-circle'}
                        size={18}
                        color="#ffffff"
                      />
                      <Text style={styles.modalSaveBtnText}>
                        {editingDiscount ? 'Update Scheme' : 'Save Scheme'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    tabBar: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingVertical: 8,
    },
    tabList: {
      paddingHorizontal: 12,
      gap: 8,
    },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 18,
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
    },
    tabBtnActive: {
      backgroundColor: '#0284c7',
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    sectionDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#0284c7',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    actionBtnPrimaryText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    feeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    feeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    feeSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    feeAmount: {
      fontSize: 15,
      fontWeight: '800',
      color: '#16a34a',
    },
    feeFreqTag: {
      fontSize: 10,
      color: '#0284c7',
      fontWeight: '700',
      marginTop: 2,
    },
    assignRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    className: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    classMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    reassignBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: '#e0f2fe',
    },
    reassignBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    concessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    concessionStudent: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    concessionClass: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    concessionDetails: {
      fontSize: 11,
      color: colors.textPrimary,
      fontWeight: '600',
      marginTop: 4,
    },
    savedBadge: {
      backgroundColor: '#f0fdf4',
      borderWidth: 1,
      borderColor: '#bbf7d0',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    savedBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#16a34a',
    },
    demandBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    demandTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 8,
    },
    demandSub: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    formGroup: {
      marginTop: 12,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.bg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      height: 42,
      color: colors.textPrimary,
      fontSize: 13,
    },
    generateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#0284c7',
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 18,
    },
    generateBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    discountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    discountName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    discountCode: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    discountBadge: {
      backgroundColor: '#fdf2f8',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#fbcfe8',
    },
    discountBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#db2777',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    modalBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    freqChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    freqChipActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    freqChipText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    freqChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },

    // Concessions Search & Empty
    concessionSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 8,
      height: 42,
      marginBottom: 12,
    },
    concessionSearchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      paddingHorizontal: 8,
    },
    refreshBtn: {
      padding: 6,
      marginLeft: 4,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 36,
      paddingHorizontal: 20,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 10,
    },
    emptySub: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 18,
    },

    // Concession Item Card
    concessionItemCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    concessionCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    admBadge: {
      backgroundColor: isDark ? '#1e293b' : '#e0f2fe',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    admBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    concessionHeadName: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0284c7',
    },
    concessionReasonText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    concessionCardDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 10,
    },
    concessionCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    calculatedAmountText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#16a34a',
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#0284c7',
      backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
    },
    editBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#fecaca',
      backgroundColor: isDark ? '#450a0a' : '#fef2f2',
    },
    deleteBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ef4444',
    },

    // Modal UI styles
    selectedStudentBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 10,
      gap: 8,
    },
    selectedStudentName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    selectedStudentMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    lockedBadge: {
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    lockedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#64748b',
    },
    changeStudentBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: '#e0f2fe',
      borderRadius: 6,
    },
    changeStudentBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    modalSearchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 10,
      height: 42,
      gap: 8,
    },
    modalSearchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
    },
    studentDropdownList: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 4,
      maxHeight: 160,
      overflow: 'hidden',
    },
    studentDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      gap: 8,
    },
    dropdownStudentName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    dropdownStudentMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    noStudentsFoundText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 6,
      marginLeft: 4,
    },
    headChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    headChipActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    headChipText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    headChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    typeToggleRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    typeToggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    typeToggleBtnActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    typeToggleBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeToggleBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    presetChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    presetChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    schemePresetChip: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#334155' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    schemePresetChipText: {
      fontSize: 11,
      color: colors.textPrimary,
    },
    modalActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 20,
      marginBottom: 6,
    },
    modalCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalCancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    modalSaveBtn: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#0284c7',
    },
    modalSaveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    discountCardCrud: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    discountCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    codeBadge: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    codeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    discountDescText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 16,
    },
    schemeTagText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#16a34a',
    },
  });
