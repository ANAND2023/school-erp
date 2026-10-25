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
import { tcApi, classApi, studentApi, academicYearApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
import AppDatePicker from '../components/AppDatePicker';

export default function PromotionTcScreen() {
  const { isDark, colors } = useTheme();
  const { hasPermission, isSuperAdmin } = usePermission();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canIssueTc = isSuperAdmin || hasPermission('TransferCertificates', 'Add');
  const canPrintTc = isSuperAdmin || hasPermission('TransferCertificates', 'Print');
  const canPromote = isSuperAdmin || hasPermission('Promotion', 'Edit') || hasPermission('Promotion', 'Add');

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
  const [tcIssueDate, setTcIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [tcReason, setTcReason] = useState('Transfer of Parent');
  const [conduct, setConduct] = useState('Good');
  const [issuingTc, setIssuingTc] = useState(false);

  // Promotion State
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [fromAyId, setFromAyId] = useState(null);
  const [toAyId, setToAyId] = useState(null);
  const [fromClassId, setFromClassId] = useState(null);
  const [fromSectionId, setFromSectionId] = useState(null);
  const [toClassId, setToClassId] = useState(null);
  const [toSectionId, setToSectionId] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState({});
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoStudentSearch, setPromoStudentSearch] = useState('');

  const getDisplayName = (s) =>
    s?.fullName || s?.studentName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || 'Student';

  const loadData = async () => {
    try {
      setLoading(true);
      const [tcRes, classRes, ayRes] = await Promise.all([
        tcApi.getTransferCertificates().catch(() => ({ data: [] })),
        classApi.getClasses().catch(() => ({ data: [] })),
        academicYearApi.getAcademicYears().catch(() => ({ data: [] })),
      ]);

      const tcs = tcRes.data?.data?.items || tcRes.data?.items || tcRes.data?.data || tcRes.data || [];
      setTcList(Array.isArray(tcs) ? tcs : []);

      const cl = classRes.data?.data || classRes.data || [];
      const validClasses = Array.isArray(cl) ? cl : [];
      setClasses(validClasses);

      if (validClasses.length >= 2) {
        setFromClassId(validClasses[0].id);
        setToClassId(validClasses[1].id);
        if (validClasses[0].sections?.length > 0) setFromSectionId(validClasses[0].sections[0].id);
        if (validClasses[1].sections?.length > 0) setToSectionId(validClasses[1].sections[0].id);
      } else if (validClasses.length === 1) {
        setFromClassId(validClasses[0].id);
        if (validClasses[0].sections?.length > 0) setFromSectionId(validClasses[0].sections[0].id);
      }

      const ays = ayRes.data?.data || ayRes.data || [];
      const validAys = Array.isArray(ays) ? ays : [];
      setAcademicYears(validAys);
      if (validAys.length >= 2) {
        setFromAyId(validAys[0].id);
        setToAyId(validAys[1].id);
      } else if (validAys.length === 1) {
        setFromAyId(validAys[0].id);
        setToAyId(validAys[0].id);
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

  const handleFromClassChange = (classId) => {
    setFromClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls?.sections?.length > 0) {
      setFromSectionId(cls.sections[0].id);
    } else {
      setFromSectionId(null);
    }

    // Auto suggest next class
    const curIdx = classes.findIndex((c) => c.id === classId);
    if (curIdx >= 0 && curIdx + 1 < classes.length) {
      const nextCls = classes[curIdx + 1];
      setToClassId(nextCls.id);
      if (nextCls.sections?.length > 0) {
        setToSectionId(nextCls.sections[0].id);
      } else {
        setToSectionId(null);
      }
    }
  };

  // Search Students for TC
  const handleSearchStudents = async (query) => {
    setStudentSearch(query);
    if (!query || !query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingStudents(true);
      // academicYearId: 0 allows searching across active student records
      const res = await studentApi.getStudents({ search: query.trim(), pageSize: 20, academicYearId: 0 });
      const items = res.data?.data?.items || res.data?.items || res.data?.data || [];
      setSearchResults(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn('Error searching students for TC:', err);
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
      const todayStr = tcIssueDate || new Date().toISOString().split('T')[0];
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
      Alert.alert('TC Issued Successfully! 📜', `Transfer certificate issued for ${getDisplayName(selectedStudent)}!`);
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
      const params = {
        classId: Number(fromClassId),
      };
      if (fromSectionId) {
        params.sectionId = Number(fromSectionId);
      }
      if (fromAyId) {
        params.academicYearId = Number(fromAyId);
      }

      const res = await tcApi.getEligiblePromotion(params);
      const items = res.data?.data?.students || res.data?.data || [];
      const list = Array.isArray(items) ? items : [];
      setEligibleStudents(list);

      // Select all by default
      const initialMap = {};
      list.forEach((s) => {
        initialMap[s.id || s.studentId] = true;
      });
      setSelectedStudentIds(initialMap);

      if (list.length === 0) {
        Alert.alert('Notice', 'No active students found in this class / section.');
      }
    } catch (err) {
      console.warn('Error fetching eligible students:', err);
      Alert.alert('Notice', 'No eligible promotion records found for this class / section.');
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
              const fromSecId = fromSectionId || currentClassObj?.sections?.[0]?.id || 1;
              const toSecId = toSectionId || toClassObj?.sections?.[0]?.id || 1;

              const payload = {
                fromAcademicYearId: Number(fromAyId || 1),
                toAcademicYearId: Number(toAyId || fromAyId || 1),
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
      (item.tcNumber && item.tcNumber.toLowerCase().includes(q)) ||
      (item.studentName && item.studentName.toLowerCase().includes(q)) ||
      (item.className && item.className.toLowerCase().includes(q)) ||
      (item.admissionNo && item.admissionNo.toLowerCase().includes(q))
    );
  });

  const filteredEligibleStudents = useMemo(() => {
    if (!promoStudentSearch.trim()) return eligibleStudents;
    const q = promoStudentSearch.toLowerCase();
    return eligibleStudents.filter((st) => {
      const name = (st.fullName || st.studentName || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
      const adm = String(st.admissionNo || '').toLowerCase();
      const roll = String(st.rollNo || '').toLowerCase();
      return name.includes(q) || adm.includes(q) || roll.includes(q);
    });
  }, [eligibleStudents, promoStudentSearch]);

  const currentFromClassObj = classes.find((c) => c.id === fromClassId);
  const currentToClassObj = classes.find((c) => c.id === toClassId);

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

            {canIssueTc && (
              <TouchableOpacity
                style={styles.issueBtn}
                onPress={() => setModalTcVisible(true)}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.issueBtnText}>Issue TC</Text>
              </TouchableOpacity>
            )}
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

            {/* Academic Years Selector */}
            {academicYears.length > 0 && (
              <>
                <Text style={styles.promoLabel}>Current Academic Year (Promote From):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {academicYears.map((ay) => (
                    <TouchableOpacity
                      key={ay.id}
                      style={[styles.classChip, fromAyId === ay.id && styles.classChipActive]}
                      onPress={() => setFromAyId(ay.id)}
                    >
                      <Text style={[styles.classChipText, fromAyId === ay.id && styles.classChipTextActive]}>
                        {ay.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* From Class & Section */}
            <Text style={[styles.promoLabel, { marginTop: 6 }]}>Current Class (Promote From):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.classChip, fromClassId === c.id && styles.classChipActive]}
                  onPress={() => handleFromClassChange(c.id)}
                >
                  <Text style={[styles.classChipText, fromClassId === c.id && styles.classChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {currentFromClassObj?.sections?.length > 0 && (
              <>
                <Text style={[styles.promoLabel, { marginTop: 4 }]}>Current Section:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  <TouchableOpacity
                    style={[styles.classChip, !fromSectionId && styles.classChipActive]}
                    onPress={() => setFromSectionId(null)}
                  >
                    <Text style={[styles.classChipText, !fromSectionId && styles.classChipTextActive]}>
                      All Sections
                    </Text>
                  </TouchableOpacity>
                  {currentFromClassObj.sections.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.classChip, fromSectionId === s.id && styles.classChipActive]}
                      onPress={() => setFromSectionId(s.id)}
                    >
                      <Text style={[styles.classChipText, fromSectionId === s.id && styles.classChipTextActive]}>
                        Section {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* To Academic Year */}
            {academicYears.length > 0 && (
              <>
                <Text style={[styles.promoLabel, { marginTop: 12 }]}>Target Academic Year (Promote To):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {academicYears.map((ay) => (
                    <TouchableOpacity
                      key={ay.id}
                      style={[styles.classChip, toAyId === ay.id && styles.classChipActiveNext]}
                      onPress={() => setToAyId(ay.id)}
                    >
                      <Text style={[styles.classChipText, toAyId === ay.id && styles.classChipTextActive]}>
                        {ay.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* To Class & Section */}
            <Text style={[styles.promoLabel, { marginTop: 6 }]}>Target Class (Promote To):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.classChip, toClassId === c.id && styles.classChipActiveNext]}
                  onPress={() => {
                    setToClassId(c.id);
                    if (c.sections?.length > 0) setToSectionId(c.sections[0].id);
                    else setToSectionId(null);
                  }}
                >
                  <Text style={[styles.classChipText, toClassId === c.id && styles.classChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {currentToClassObj?.sections?.length > 0 && (
              <>
                <Text style={[styles.promoLabel, { marginTop: 4 }]}>Target Section:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {currentToClassObj.sections.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.classChip, toSectionId === s.id && styles.classChipActiveNext]}
                      onPress={() => setToSectionId(s.id)}
                    >
                      <Text style={[styles.classChipText, toSectionId === s.id && styles.classChipTextActive]}>
                        Section {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={styles.loadEligibleBtn}
              onPress={loadEligibleForPromotion}
              disabled={loadingEligible}
            >
              {loadingEligible ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="search" size={16} color="#ffffff" />
                  <Text style={styles.loadEligibleBtnText}>Fetch Eligible Students</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Eligible Students List */}
          {loadingEligible ? (
            <ActivityIndicator color="#0284c7" style={{ marginVertical: 20 }} />
          ) : eligibleStudents.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              {/* Promotion Student Search Filter */}
              <View style={styles.promoSearchBox}>
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  style={styles.promoSearchInput}
                  placeholder="Search student by name, roll no, adm no..."
                  placeholderTextColor="#94a3b8"
                  value={promoStudentSearch}
                  onChangeText={setPromoStudentSearch}
                />
                {promoStudentSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPromoStudentSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                <Text style={styles.cardHeading}>
                  Eligible Students ({filteredEligibleStudents.length}{promoStudentSearch ? ` of ${eligibleStudents.length}` : ''})
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const allSelected = filteredEligibleStudents.every((s) => selectedStudentIds[s.id || s.studentId]);
                    const newMap = { ...selectedStudentIds };
                    filteredEligibleStudents.forEach((s) => {
                      newMap[s.id || s.studentId] = !allSelected;
                    });
                    setSelectedStudentIds(newMap);
                  }}
                >
                  <Text style={styles.toggleAllText}>Select/Deselect All</Text>
                </TouchableOpacity>
              </View>

              {filteredEligibleStudents.map((st, idx) => {
                const sId = st.id || st.studentId;
                const isChecked = !!selectedStudentIds[sId];
                const name = getDisplayName(st);
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
                      <Text style={styles.promoStudentName}>{name}</Text>
                      <Text style={styles.promoStudentRoll}>
                        Roll: {st.rollNo ?? (idx + 1)} • Adm: {st.admissionNo || sId} • Class {st.className || ''} {st.sectionName ? `(${st.sectionName})` : ''}
                      </Text>
                      {st.pendingDues > 0 && (
                        <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '600', marginTop: 2 }}>
                          Pending Dues: ₹{st.pendingDues}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {canPromote ? (
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
                      <Text style={styles.promoteBtnText}>
                        Promote Selected ({Object.values(selectedStudentIds).filter(Boolean).length}) Students
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                    View-only mode: You do not have permission to execute student promotions.
                  </Text>
                </View>
              )}
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
              <View style={styles.modalSearchBox}>
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Type student name or admission no..."
                  value={studentSearch}
                  onChangeText={handleSearchStudents}
                  placeholderTextColor="#94a3b8"
                />
                {studentSearch.length > 0 && (
                  <TouchableOpacity onPress={() => { setStudentSearch(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {searchingStudents && <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 6 }} />}

              {searchResults.length > 0 && !selectedStudent && (
                <View style={styles.searchResultsBox}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {searchResults.map((s) => {
                      const name = getDisplayName(s);
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.searchResultItem}
                          onPress={() => {
                            setSelectedStudent(s);
                            setStudentSearch(`${name} (${s.admissionNo})`);
                            setSearchResults([]);
                          }}
                        >
                          <Text style={styles.searchResultText}>{name}</Text>
                          <Text style={styles.searchResultSub}>
                            Adm #{s.admissionNo} • Class {s.className || 'N/A'} {s.sectionName ? `(${s.sectionName})` : ''}
                            {s.guardianName ? ` • Guardian: ${s.guardianName}` : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {selectedStudent && (
                <View style={styles.selectedStudentBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.selectedStudentText}>
                      Selected: {getDisplayName(selectedStudent)}
                    </Text>
                    <Text style={styles.selectedStudentSub}>
                      Adm #{selectedStudent.admissionNo} • Class {selectedStudent.className || 'N/A'} {selectedStudent.sectionName ? `(${selectedStudent.sectionName})` : ''}
                      {selectedStudent.guardianName ? ` • Guardian: ${selectedStudent.guardianName}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedStudent(null);
                      setStudentSearch('');
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}

              <AppDatePicker
                label="TC Issue Date"
                value={tcIssueDate}
                onChange={setTcIssueDate}
                required
              />

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
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  searchResultsBox: {
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 4,
    maxHeight: 180,
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
    marginTop: 2,
  },
  selectedStudentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: isDark ? '#047857' : '#86efac',
  },
  selectedStudentText: {
    color: isDark ? '#6ee7b7' : '#15803d',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedStudentSub: {
    fontSize: 11,
    color: isDark ? '#a7f3d0' : '#166534',
    marginTop: 2,
  },
  promoSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 6,
  },
  promoSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
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
