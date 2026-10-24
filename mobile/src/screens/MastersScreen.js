import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { classApi, academicYearApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function MastersScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { activeAcademicYearId, activeAcademicYearName, switchAcademicYear } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'subjects' | 'years' | 'branch'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);

  // Class Create / Edit Modal State
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [classOrderInput, setClassOrderInput] = useState('1');
  const [savingClass, setSavingClass] = useState(false);

  // Section Create / Edit Modal State
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [targetClass, setTargetClass] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionNameInput, setSectionNameInput] = useState('A');
  const [sectionCapacityInput, setSectionCapacityInput] = useState('40');
  const [savingSection, setSavingSection] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classRes, subRes, ayRes, branchRes] = await Promise.all([
        classApi.getClasses().catch(() => ({ data: [] })),
        classApi.getSubjects().catch(() => ({ data: [] })),
        classApi.getAcademicYears().catch(() => ({ data: [] })),
        classApi.getBranch().catch(() => ({ data: null })),
      ]);

      const cl = classRes.data?.data || classRes.data || [];
      setClasses(Array.isArray(cl) ? cl : []);

      const sb = subRes.data?.data || subRes.data || [];
      setSubjects(Array.isArray(sb) ? sb : []);

      const ay = ayRes.data?.data || ayRes.data || [];
      setAcademicYears(Array.isArray(ay) ? ay : []);

      const br = branchRes.data?.data || branchRes.data || null;
      setBranchInfo(br);
    } catch (err) {
      console.warn('Error loading masters:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Class CRUD handlers
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassNameInput('');
    setClassOrderInput(String(classes.length + 1));
    setClassModalVisible(true);
  };

  const handleOpenEditClass = (cls) => {
    setEditingClass(cls);
    setClassNameInput(cls.name || '');
    setClassOrderInput(String(cls.displayOrder || cls.orderIndex || 1));
    setClassModalVisible(true);
  };

  const handleSaveClass = async () => {
    if (!classNameInput.trim()) {
      Alert.alert('Required', 'Please enter a valid class name (e.g. Class 10, Grade 5).');
      return;
    }

    try {
      setSavingClass(true);
      const payload = {
        name: classNameInput.trim(),
        displayOrder: Number(classOrderInput) || 1,
      };

      if (editingClass) {
        await classApi.updateClass(editingClass.id, payload);
        Alert.alert('Success', `Class "${classNameInput}" updated successfully!`);
      } else {
        await classApi.createClass(payload);
        Alert.alert('Success', `Class "${classNameInput}" created successfully!`);
      }
      setClassModalVisible(false);
      loadData();
    } catch (e) {
      console.warn('Save class error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save class.');
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = (cls) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${cls.name}" and its sections?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await classApi.deleteClass(cls.id);
              Alert.alert('Deleted', `Class "${cls.name}" was removed.`);
              loadData();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete class.');
            }
          },
        },
      ]
    );
  };

  // Section CRUD handlers
  const handleOpenAddSection = (cls) => {
    setTargetClass(cls);
    setEditingSection(null);
    const existing = cls.sections || [];
    const nextChar = String.fromCharCode(65 + existing.length);
    setSectionNameInput(nextChar);
    setSectionCapacityInput('40');
    setSectionModalVisible(true);
  };

  const handleOpenEditSection = (cls, sec) => {
    setTargetClass(cls);
    setEditingSection(sec);
    setSectionNameInput(sec.name || '');
    setSectionCapacityInput(String(sec.capacity || 40));
    setSectionModalVisible(true);
  };

  const handleSaveSection = async () => {
    if (!sectionNameInput.trim()) {
      Alert.alert('Required', 'Please enter section name (e.g. A, B, Rose).');
      return;
    }

    try {
      setSavingSection(true);
      const payload = {
        name: sectionNameInput.trim(),
        capacity: Number(sectionCapacityInput) || 40,
      };

      if (editingSection) {
        await classApi.updateSection(editingSection.id, {
          ...payload,
          classId: targetClass.id,
        });
        Alert.alert('Success', `Section "${sectionNameInput}" updated!`);
      } else {
        await classApi.addSection(targetClass.id, payload);
        Alert.alert('Success', `Section "${sectionNameInput}" added to ${targetClass.name}!`);
      }
      setSectionModalVisible(false);
      loadData();
    } catch (e) {
      console.warn('Save section error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save section.');
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = (sec) => {
    Alert.alert(
      'Delete Section',
      `Are you sure you want to delete Section "${sec.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await classApi.deleteSection(sec.id);
              Alert.alert('Deleted', `Section "${sec.name}" removed.`);
              loadData();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete section.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Scrollable Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'classes', label: 'Classes & Sections', icon: 'school-outline' },
            { key: 'subjects', label: 'Subjects Master', icon: 'book-outline' },
            { key: 'years', label: 'Academic Years', icon: 'calendar-outline' },
            { key: 'branch', label: 'School Profile', icon: 'business-outline' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? '#ffffff' : '#64748b'}
              />
              <Text style={[styles.tabChipText, activeTab === tab.key && styles.tabChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={{ marginTop: 10, color: '#64748b' }}>Loading ERP Masters...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
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
        >
          {/* TAB 1: CLASSES & SECTIONS */}
          {activeTab === 'classes' && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>Configured Classes ({classes.length})</Text>
                <TouchableOpacity
                  style={styles.addClassHeaderBtn}
                  onPress={handleOpenAddClass}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={16} color="#ffffff" />
                  <Text style={styles.addClassHeaderBtnText}>Add Class</Text>
                </TouchableOpacity>
              </View>

              {classes.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyNote}>No classes configured in master.</Text>
                  <TouchableOpacity
                    style={[styles.addClassHeaderBtn, { marginTop: 10 }]}
                    onPress={handleOpenAddClass}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" />
                    <Text style={styles.addClassHeaderBtnText}>Create First Class</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                classes.map((cls, idx) => (
                  <View key={cls.id || idx} style={styles.masterCard}>
                    <View style={styles.masterCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.masterTitle}>{cls.name}</Text>
                        <Text style={styles.masterSub}>Display Order: {cls.displayOrder || cls.orderIndex || idx + 1}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => handleOpenEditClass(cls)}
                        >
                          <Ionicons name="pencil" size={15} color="#0284c7" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.iconActionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                          onPress={() => handleDeleteClass(cls)}
                        >
                          <Ionicons name="trash-outline" size={15} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Sections Container */}
                    <View style={styles.sectionsWrapper}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.sectionsTitle}>
                          SECTIONS ({(cls.sections || []).length})
                        </Text>
                        <TouchableOpacity
                          style={styles.addSecBtn}
                          onPress={() => handleOpenAddSection(cls)}
                        >
                          <Ionicons name="add" size={13} color="#0284c7" />
                          <Text style={styles.addSecBtnText}>Add Section</Text>
                        </TouchableOpacity>
                      </View>

                      {cls.sections && cls.sections.length > 0 ? (
                        <View style={styles.sectionsPillsRow}>
                          {cls.sections.map((sec) => (
                            <View key={sec.id} style={styles.secPill}>
                              <View>
                                <Text style={styles.secPillText}>Section {sec.name}</Text>
                                <Text style={styles.capacityText}>Cap: {sec.capacity || 40}</Text>
                              </View>
                              <View style={styles.secPillActions}>
                                <TouchableOpacity
                                  onPress={() => handleOpenEditSection(cls, sec)}
                                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                >
                                  <Ionicons name="pencil" size={12} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleDeleteSection(sec)}
                                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                >
                                  <Ionicons name="close-circle" size={13} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noSectionsText}>No sections assigned yet. Tap "+ Add Section".</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 2: SUBJECTS */}
          {activeTab === 'subjects' && (
            <View>
              <Text style={styles.sectionHeader}>Curriculum Subjects ({subjects.length})</Text>
              {subjects.length === 0 ? (
                <Text style={styles.emptyNote}>No subjects registered.</Text>
              ) : (
                subjects.map((sub, idx) => (
                  <View key={sub.id || idx} style={styles.masterCard}>
                    <View style={styles.masterCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.masterTitle}>{sub.name}</Text>
                        <Text style={styles.masterSub}>Code: {sub.code || 'N/A'}</Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{sub.type || 'Theory'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: ACADEMIC YEARS */}
          {activeTab === 'years' && (
            <View>
              <Text style={styles.sectionHeader}>Academic Sessions ({academicYears.length})</Text>
              {academicYears.length === 0 ? (
                <Text style={styles.emptyNote}>No academic sessions found.</Text>
              ) : (
                academicYears.map((ay, idx) => {
                  const isCurrentActive =
                    Number(ay.id) === Number(activeAcademicYearId) ||
                    ay.name === activeAcademicYearName;
                  return (
                    <View key={ay.id || idx} style={[styles.masterCard, isCurrentActive && { borderColor: '#0284c7', backgroundColor: '#f0f9ff' }]}>
                      <View style={styles.masterCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.masterTitle, isCurrentActive && { color: '#0284c7' }]}>
                              Session {ay.name || ay.title}
                            </Text>
                            {isCurrentActive && (
                              <View style={styles.activePill}>
                                <Text style={styles.activePillText}>Active in App</Text>
                              </View>
                            )}
                            {ay.isCurrent && (
                              <View style={styles.currentYearBadge}>
                                <Ionicons name="checkmark-circle" size={12} color="#15803d" />
                                <Text style={styles.currentYearBadgeText}>DEFAULT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.masterSub}>
                            {ay.startDate ? new Date(ay.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} to{' '}
                            {ay.endDate ? new Date(ay.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.ayActionRow}>
                        {!isCurrentActive ? (
                          <TouchableOpacity
                            style={styles.switchAyBtn}
                            onPress={async () => {
                              await switchAcademicYear(ay.id, ay.name);
                              Alert.alert('Session Switched', `Active academic session is now ${ay.name}.`);
                            }}
                          >
                            <Ionicons name="swap-horizontal" size={14} color="#ffffff" />
                            <Text style={styles.switchAyBtnText}>Switch to this Session</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.currentActiveRow}>
                            <Ionicons name="checkmark-done" size={16} color="#0284c7" />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>
                              Currently Active
                            </Text>
                          </View>
                        )}

                        {!ay.isCurrent ? (
                          <TouchableOpacity
                            style={styles.setDefaultAyBtn}
                            onPress={async () => {
                              try {
                                const res = await academicYearApi.setCurrent(ay.id);
                                if (res.data?.success) {
                                  await switchAcademicYear(ay.id, ay.name);
                                  loadData();
                                  Alert.alert('Default Updated', `Session ${ay.name} is now school-wide default.`);
                                } else {
                                  Alert.alert('Notice', res.data?.message || 'Could not update.');
                                }
                              } catch (e) {
                                Alert.alert('Error', 'Failed to set as default session.');
                              }
                            }}
                          >
                            <Ionicons name="star-outline" size={13} color="#64748b" />
                            <Text style={styles.setDefaultAyBtnText}>Make Default</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 4: SCHOOL & BRANCH */}
          {activeTab === 'branch' && (
            <View style={styles.branchCard}>
              <View style={styles.schoolIconCircle}>
                <Ionicons name="school" size={32} color="#0284c7" />
              </View>

              <Text style={styles.schoolName}>
                {branchInfo?.schoolName || branchInfo?.name || 'School ERP Campus'}
              </Text>
              <Text style={styles.branchCode}>Branch Code: {branchInfo?.code || 'MAIN'}</Text>

              <View style={styles.divider} />

              <View style={styles.branchRow}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <Text style={styles.branchLabel}>Address:</Text>
                <Text style={styles.branchValue}>
                  {branchInfo?.address ? `${branchInfo.address}, ${branchInfo.city || ''} ${branchInfo.pincode ? `(${branchInfo.pincode})` : ''}`.trim() : 'Main Campus'}
                </Text>
              </View>

              <View style={styles.branchRow}>
                <Ionicons name="call-outline" size={16} color="#64748b" />
                <Text style={styles.branchLabel}>Phone:</Text>
                <Text style={styles.branchValue}>{branchInfo?.phone || branchInfo?.mobile || '+91 9876543210'}</Text>
              </View>

              <View style={styles.branchRow}>
                <Ionicons name="mail-outline" size={16} color="#64748b" />
                <Text style={styles.branchLabel}>Email:</Text>
                <Text style={styles.branchValue}>{branchInfo?.email || 'admin@schoolerp.in'}</Text>
              </View>

              <View style={styles.branchRow}>
                <Ionicons name="ribbon-outline" size={16} color="#64748b" />
                <Text style={styles.branchLabel}>Affiliation:</Text>
                <Text style={styles.branchValue}>{branchInfo?.affiliationNumber || branchInfo?.affiliationNo || 'CBSE Board Affiliated'}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Class Modal (Create / Edit) */}
      <Modal
        visible={classModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setClassModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClass ? `Edit Class: ${editingClass.name}` : 'Create New Class'}
              </Text>
              <TouchableOpacity onPress={() => setClassModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={styles.inputLabel}>Class Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Class 10, Nursery, Grade 1"
                placeholderTextColor="#94a3b8"
                value={classNameInput}
                onChangeText={setClassNameInput}
              />

              <Text style={styles.inputLabel}>Numeric Display Order</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1, 2, 10"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={classOrderInput}
                onChangeText={setClassOrderInput}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingClass && { opacity: 0.7 }]}
                onPress={handleSaveClass}
                disabled={savingClass}
              >
                {savingClass ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>
                      {editingClass ? 'Update Class' : 'Create Class'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Section Modal (Create / Edit) */}
      <Modal
        visible={sectionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSectionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSection
                  ? `Edit Section: ${editingSection.name}`
                  : `Add Section to ${targetClass?.name}`}
              </Text>
              <TouchableOpacity onPress={() => setSectionModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={styles.inputLabel}>Section Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. A, B, C, Rose, Lotus"
                placeholderTextColor="#94a3b8"
                value={sectionNameInput}
                onChangeText={setSectionNameInput}
              />

              <Text style={styles.inputLabel}>Student Capacity (Max Seats)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 40"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={sectionCapacityInput}
                onChangeText={setSectionCapacityInput}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingSection && { opacity: 0.7 }]}
                onPress={handleSaveSection}
                disabled={savingSection}
              >
                {savingSection ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>
                      {editingSection ? 'Update Section' : 'Save Section'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
  tabContainer: {
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  masterCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  masterCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  masterSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionsCountBadge: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sectionsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#0284c7',
  },
  sectionsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  secPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  secPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  capacityText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  typeBadge: {
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  currentYearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  currentYearBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#6ee7b7' : '#15803d',
  },
  activePill: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#0284c7',
  },
  ayActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 8,
  },
  switchAyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  switchAyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  currentActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setDefaultAyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  setDefaultAyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  branchCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  schoolIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  branchCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  branchLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    width: 80,
  },
  branchValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  emptyNote: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addClassHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addClassHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f0f9ff',
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionsWrapper: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  sectionsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  addSecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: isDark ? '#1e293b' : '#f0f9ff',
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
    gap: 2,
  },
  addSecBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  secPillActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: colors.cardBorder,
  },
  noSectionsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
    marginBottom: 8,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
