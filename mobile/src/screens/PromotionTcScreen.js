import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tcApi, classApi, studentApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function PromotionTcScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [activeTab, setActiveTab] = useState('tc'); // 'tc' | 'promotion'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // TC List
  const [tcList, setTcList] = useState([]);
  const [searchTc, setSearchTc] = useState('');

  // Issue TC Modal
  const [modalTcVisible, setModalTcVisible] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [tcReason, setTcReason] = useState('Transfer of Parent');
  const [conduct, setConduct] = useState('Good');
  const [issuingTc, setIssuingTc] = useState(false);

  // Promotion State
  const [classes, setClasses] = useState([]);
  const [fromClassId, setFromClassId] = useState(null);
  const [toClassId, setToClassId] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState({});
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tcRes, classRes] = await Promise.all([
        tcApi.getTransferCertificates().catch(() => ({ data: [] })),
        classApi.getClasses().catch(() => ({ data: [] })),
      ]);

      const tcs = tcRes.data?.data?.items || tcRes.data?.items || tcRes.data?.data || tcRes.data || [];
      setTcList(Array.isArray(tcs) ? tcs : []);

      const cl = classRes.data?.data || classRes.data || [];
      const validClasses = Array.isArray(cl) ? cl : [];
      setClasses(validClasses);

      if (validClasses.length >= 2) {
        setFromClassId(validClasses[0].id);
        setToClassId(validClasses[1].id);
      } else if (validClasses.length === 1) {
        setFromClassId(validClasses[0].id);
      }
    } catch (err) {
      console.warn('Error loading TC/Promotion data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Search Students for TC
  const handleSearchStudents = async (query) => {
    setStudentSearch(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingStudents(true);
      const res = await studentApi.getStudents({ search: query, pageSize: 10 });
      const items = res.data?.data?.items || res.data?.items || res.data?.data || [];
      setSearchResults(Array.isArray(items) ? items : []);
    } catch (err) {
      // ignore
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleIssueTc = async () => {
    if (!selectedStudent) {
      Alert.alert('Required', 'Please select a student.');
      return;
    }

    try {
      setIssuingTc(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        studentId: Number(selectedStudent.id || selectedStudent.studentId),
        applicationDate: todayStr,
        issueDate: todayStr,
        lastClassStudied: selectedStudent.className || 'Class Record',
        qualifiedForPromotion: true,
        reasonForLeaving: tcReason,
        conduct: conduct,
        adminOverrideDues: true,
        remarks: 'Issued via Mobile App',
      };

      await tcApi.issueTc(payload);
      Alert.alert('TC Issued Successfully! 📜', `Transfer certificate issued for ${selectedStudent.firstName || selectedStudent.fullName}!`);
      setModalTcVisible(false);
      setSelectedStudent(null);
      setStudentSearch('');
      setSearchResults([]);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to issue TC.';
      Alert.alert('Error', msg);
    } finally {
      setIssuingTc(false);
    }
  };

  // Load Promotion Eligible Students
  const loadEligibleForPromotion = async () => {
    if (!fromClassId) {
      Alert.alert('Notice', 'Please select Current Class.');
      return;
    }

    try {
      setLoadingEligible(true);
      const currentClassObj = classes.find((c) => c.id === fromClassId);
      const firstSecId = currentClassObj?.sections?.[0]?.id || 1;

      const res = await tcApi.getEligiblePromotion({
        classId: Number(fromClassId),
        sectionId: Number(firstSecId),
        academicYearId: 1,
      });
      const items = res.data?.data?.students || res.data?.data || [];
      const list = Array.isArray(items) ? items : [];
      setEligibleStudents(list);

      // Select all by default
      const initialMap = {};
      list.forEach((s) => {
        initialMap[s.id || s.studentId] = true;
      });
      setSelectedStudentIds(initialMap);
    } catch (err) {
      console.warn('Error fetching eligible students:', err);
      Alert.alert('Notice', 'No eligible promotion records found for this class.');
      setEligibleStudents([]);
    } finally {
      setLoadingEligible(false);
    }
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleBulkPromote = async () => {
    const selectedIds = Object.keys(selectedStudentIds).filter((id) => selectedStudentIds[id]);
    if (selectedIds.length === 0) {
      Alert.alert('Notice', 'Please select at least one student to promote.');
      return;
    }
    if (!toClassId) {
      Alert.alert('Notice', 'Please select Next Class to promote to.');
      return;
    }

    Alert.alert(
      'Confirm Promotion',
      `Promote ${selectedIds.length} student(s) to the next class?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              setPromoting(true);
              const currentClassObj = classes.find((c) => c.id === fromClassId);
              const toClassObj = classes.find((c) => c.id === toClassId);
              const fromSecId = currentClassObj?.sections?.[0]?.id || 1;
              const toSecId = toClassObj?.sections?.[0]?.id || 1;

              const payload = {
                fromAcademicYearId: 1,
                toAcademicYearId: 1,
                fromClassId: Number(fromClassId),
                fromSectionId: Number(fromSecId),
                toClassId: Number(toClassId),
                toSectionId: Number(toSecId),
                carryForwardDues: true,
                students: selectedIds.map((id) => ({
                  studentId: Number(id),
                  result: 1,
                })),
              };
              await tcApi.promoteBulk(payload);
              Alert.alert('Promotion Completed! 🎉', `${selectedIds.length} students promoted successfully.`);
              setEligibleStudents([]);
              setSelectedStudentIds({});
            } catch (err) {
              const msg = err.response?.data?.message || 'Failed to complete promotion.';
              Alert.alert('Error', msg);
            } finally {
              setPromoting(false);
            }
          },
        },
      ]
    );
  };

  const filteredTc = tcList.filter((item) => {
    const q = searchTc.toLowerCase();
    return (
      (item.tcNo && item.tcNo.toLowerCase().includes(q)) ||
      (item.studentName && item.studentName.toLowerCase().includes(q)) ||
      (item.className && item.className.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'tc' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('tc')}
        >
          <Ionicons
            name="document-attach-outline"
            size={18}
            color={activeTab === 'tc' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.topTabText, activeTab === 'tc' && styles.topTabTextActive]}>
            Transfer Certificates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'promotion' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('promotion')}
        >
          <Ionicons
            name="trending-up"
            size={18}
            color={activeTab === 'promotion' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.topTabText, activeTab === 'promotion' && styles.topTabTextActive]}>
            Student Promotion
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: TRANSFER CERTIFICATES */}
      {activeTab === 'tc' && (
        <View style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                placeholder="Search TC No, student..."
                value={searchTc}
                onChangeText={setSearchTc}
                style={styles.searchInput}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity
              style={styles.issueBtn}
              onPress={() => setModalTcVisible(true)}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.issueBtnText}>Issue TC</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={{ marginTop: 10, color: '#64748b' }}>Loading TC Records...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTc}
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
              renderItem={({ item }) => (
                <View style={styles.tcCard}>
                  <View style={styles.tcHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tcStudentName}>{item.studentName || 'Student Name'}</Text>
                      <Text style={styles.tcNo}>TC #{item.tcNumber || item.tcNo || item.id}</Text>
                    </View>
                    <View style={styles.tcBadge}>
                      <Text style={styles.tcBadgeText}>{item.className || 'Class'}</Text>
                    </View>
                  </View>

                  <View style={styles.tcDivider} />

                  <View style={styles.tcRow}>
                    <Ionicons name="calendar-outline" size={14} color="#64748b" />
                    <Text style={styles.tcLabel}>Issue Date:</Text>
                    <Text style={styles.tcVal}>
                      {item.issueDate ? new Date(item.issueDate).toLocaleDateString() : 'Issued'}
                    </Text>
                  </View>

                  <View style={styles.tcRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#64748b" />
                    <Text style={styles.tcLabel}>Reason:</Text>
                    <Text style={styles.tcVal}>{item.reason || 'Completed Course'}</Text>
                  </View>

                  <View style={styles.tcRow}>
                    <Ionicons name="ribbon-outline" size={14} color="#64748b" />
                    <Text style={styles.tcLabel}>Conduct:</Text>
                    <Text style={[styles.tcVal, { color: '#16a34a', fontWeight: '700' }]}>
                      {item.conduct || 'Good'}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={44} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No Transfer Certificates</Text>
                  <Text style={styles.emptySub}>Tap "+ Issue TC" to generate a school leaving certificate.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* TAB 2: PROMOTION */}
      {activeTab === 'promotion' && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
          <View style={styles.promoSelectorCard}>
            <Text style={styles.cardHeading}>Select Class Transition</Text>

            <Text style={styles.promoLabel}>Current Class (Promote From):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.classChip, fromClassId === c.id && styles.classChipActive]}
                  onPress={() => setFromClassId(c.id)}
                >
                  <Text style={[styles.classChipText, fromClassId === c.id && styles.classChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.promoLabel, { marginTop: 12 }]}>Next Class (Promote To):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.classChip, toClassId === c.id && styles.classChipActiveNext]}
                  onPress={() => setToClassId(c.id)}
                >
                  <Text style={[styles.classChipText, toClassId === c.id && styles.classChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.loadEligibleBtn}
              onPress={loadEligibleForPromotion}
            >
              <Ionicons name="search" size={16} color="#ffffff" />
              <Text style={styles.loadEligibleBtnText}>Fetch Eligible Students</Text>
            </TouchableOpacity>
          </View>

          {/* Eligible Students List */}
          {loadingEligible ? (
            <ActivityIndicator color="#0284c7" style={{ marginVertical: 20 }} />
          ) : eligibleStudents.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardHeading}>Eligible Students ({eligibleStudents.length})</Text>
                <TouchableOpacity
                  onPress={() => {
                    const allSelected = eligibleStudents.every((s) => selectedStudentIds[s.id || s.studentId]);
                    const newMap = {};
                    eligibleStudents.forEach((s) => {
                      newMap[s.id || s.studentId] = !allSelected;
                    });
                    setSelectedStudentIds(newMap);
                  }}
                >
                  <Text style={styles.toggleAllText}>Select/Deselect All</Text>
                </TouchableOpacity>
              </View>

              {eligibleStudents.map((st, idx) => {
                const sId = st.id || st.studentId;
                const isChecked = !!selectedStudentIds[sId];
                return (
                  <TouchableOpacity
                    key={sId || idx}
                    style={[styles.studentSelectRow, isChecked && styles.studentSelectRowActive]}
                    onPress={() => toggleSelectStudent(sId)}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isChecked ? '#0284c7' : '#94a3b8'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.promoStudentName}>
                        {st.studentName || `${st.firstName || ''} ${st.lastName || ''}`}
                      </Text>
                      <Text style={styles.promoStudentRoll}>Roll: {st.rollNo || idx + 1} • Adm: {st.admissionNo || sId}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.promoteBtn, promoting && { opacity: 0.7 }]}
                onPress={handleBulkPromote}
                disabled={promoting}
              >
                {promoting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text style={styles.promoteBtnText}>Promote Selected Students</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* ISSUE TC MODAL */}
      <Modal
        visible={modalTcVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalTcVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Transfer Certificate</Text>
              <TouchableOpacity onPress={() => setModalTcVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.modalLabel}>Search & Select Student *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type student name or admission no..."
                value={studentSearch}
                onChangeText={handleSearchStudents}
                placeholderTextColor="#94a3b8"
              />

              {searchingStudents && <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 6 }} />}

              {searchResults.length > 0 && !selectedStudent && (
                <View style={styles.searchResultsBox}>
                  {searchResults.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setSelectedStudent(s);
                        setStudentSearch(`${s.firstName} ${s.lastName || ''} (${s.admissionNo})`);
                        setSearchResults([]);
                      }}
                    >
                      <Text style={styles.searchResultText}>{s.firstName} {s.lastName}</Text>
                      <Text style={styles.searchResultSub}>Adm #{s.admissionNo} • Class {s.className}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedStudent && (
                <View style={styles.selectedStudentBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                  <Text style={styles.selectedStudentText}>
                    Selected: {selectedStudent.firstName} {selectedStudent.lastName}
                  </Text>
                </View>
              )}

              <Text style={styles.modalLabel}>Reason for Leaving</Text>
              <View style={styles.reasonsGrid}>
                {['Transfer of Parent', 'Higher Education', 'Relocation', 'Personal Reasons'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, tcReason === r && styles.reasonChipActive]}
                    onPress={() => setTcReason(r)}
                  >
                    <Text style={[styles.reasonChipText, tcReason === r && styles.reasonChipTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Student Conduct / Character</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
                {['Excellent', 'Good', 'Satisfactory'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.reasonChip, conduct === c && styles.reasonChipActive, { flex: 1, alignItems: 'center' }]}
                    onPress={() => setConduct(c)}
                  >
                    <Text style={[styles.reasonChipText, conduct === c && styles.reasonChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitTcBtn, issuingTc && { opacity: 0.7 }]}
                onPress={handleIssueTc}
                disabled={issuingTc}
              >
                {issuingTc ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="document-text" size={18} color="#ffffff" />
                    <Text style={styles.submitTcBtnText}>Generate Transfer Certificate</Text>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  issueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
    gap: 4,
  },
  issueBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tcCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tcHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tcStudentName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tcNo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tcBadge: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tcBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#0284c7',
  },
  tcDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 10,
  },
  tcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  tcLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 70,
  },
  tcVal: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
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
  promoSelectorCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  promoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
  },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  classChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  classChipActiveNext: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  classChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  classChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loadEligibleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  loadEligibleBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  studentSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  studentSelectRowActive: {
    borderColor: colors.primary,
    backgroundColor: isDark ? '#1e293b' : '#f0f9ff',
  },
  promoStudentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  promoStudentRoll: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  promoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 14,
    gap: 6,
  },
  promoteBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
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
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
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
  searchResultsBox: {
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 4,
    maxHeight: 140,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchResultText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  searchResultSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  selectedStudentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    gap: 6,
  },
  selectedStudentText: {
    color: isDark ? '#6ee7b7' : '#15803d',
    fontSize: 13,
    fontWeight: '600',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reasonChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reasonChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  submitTcBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
    gap: 6,
  },
  submitTcBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
