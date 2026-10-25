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
import { classApi, academicYearApi, subjectApi, branchApi, schoolApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function MastersScreen({ route }) {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { user, isSuperAdmin, activeAcademicYearId, activeAcademicYearName, switchAcademicYear } = useContext(AuthContext);

  const getInitialTab = () => {
    const t = route?.params?.tab;
    if (t === 'academic') return 'years';
    if (t === 'subjects' || t === 'branch' || t === 'years' || t === 'classes') return t;
    return 'classes';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab); // 'classes' | 'subjects' | 'years' | 'branch'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route?.params?.tab) {
      const t = route.params.tab;
      setActiveTab(t === 'academic' ? 'years' : t);
    }
  }, [route?.params?.tab]);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);
  const [allBranches, setAllBranches] = useState([]);

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

  // Subject Create / Edit Modal State
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectNameInput, setSubjectNameInput] = useState('');
  const [subjectCodeInput, setSubjectCodeInput] = useState('');
  const [subjectTypeInput, setSubjectTypeInput] = useState(1); // 1 = Scholastic, 2 = CoScholastic
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('ALL'); // 'ALL' | '1' | '2'

  // School & Branch Profile Edit Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    schoolName: '',
    name: '',
    code: '',
    affiliationNumber: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    printHeader: '',
  });

  // Additional Branch Create Modal State
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [savingNewBranch, setSavingNewBranch] = useState(false);
  const [newBranchForm, setNewBranchForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    printHeader: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [classRes, subRes, ayRes, branchRes, branchesRes] = await Promise.all([
        classApi.getClasses().catch(() => ({ data: [] })),
        classApi.getSubjects().catch(() => ({ data: [] })),
        classApi.getAcademicYears().catch(() => ({ data: [] })),
        classApi.getBranch().catch(() => ({ data: null })),
        branchApi.getBranches().catch(() => ({ data: [] })),
      ]);

      const cl = classRes.data?.data || classRes.data || [];
      setClasses(Array.isArray(cl) ? cl : []);

      const sb = subRes.data?.data || subRes.data || [];
      setSubjects(Array.isArray(sb) ? sb : []);

      const ay = ayRes.data?.data || ayRes.data || [];
      setAcademicYears(Array.isArray(ay) ? ay : []);

      const br = branchRes.data?.data || branchRes.data || null;
      setBranchInfo(br);

      const brList = branchesRes.data?.data || branchesRes.data || [];
      setAllBranches(Array.isArray(brList) ? brList : []);
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

  // Subject CRUD handlers
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectNameInput('');
    setSubjectCodeInput('');
    setSubjectTypeInput(1);
    setSubjectModalVisible(true);
  };

  const handleOpenEditSubject = (sub) => {
    setEditingSubject(sub);
    setSubjectNameInput(sub.name || '');
    setSubjectCodeInput(sub.code || '');
    const isCo = sub.type === 2 || sub.type === 'CoScholastic' || sub.type === '2';
    setSubjectTypeInput(isCo ? 2 : 1);
    setSubjectModalVisible(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectNameInput.trim()) {
      Alert.alert('Required', 'Please enter a Subject Name (e.g. Mathematics, English, Art).');
      return;
    }
    if (!subjectCodeInput.trim()) {
      Alert.alert('Required', 'Please enter a Subject Code (e.g. MATH, ENG, ART).');
      return;
    }

    try {
      setSavingSubject(true);
      const payload = {
        name: subjectNameInput.trim(),
        code: subjectCodeInput.trim().toUpperCase(),
        type: Number(subjectTypeInput) || 1,
      };

      if (editingSubject) {
        await subjectApi.updateSubject(editingSubject.id, payload);
        Alert.alert('Success', `Subject "${payload.name}" updated successfully!`);
      } else {
        await subjectApi.createSubject(payload);
        Alert.alert('Success', `Subject "${payload.name}" created successfully!`);
      }
      setSubjectModalVisible(false);
      loadData();
    } catch (e) {
      console.warn('Save subject error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save subject.');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = (sub) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${sub.name}" (${sub.code})? This will also remove any class-subject mappings for this subject.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await subjectApi.deleteSubject(sub.id);
              Alert.alert('Deleted', `Subject "${sub.name}" has been removed.`);
              loadData();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete subject.');
            }
          },
        },
      ]
    );
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      const isCo = sub.type === 2 || sub.type === 'CoScholastic' || sub.type === '2';
      const subTypeNum = isCo ? 2 : 1;
      if (subjectTypeFilter === '1' && subTypeNum !== 1) return false;
      if (subjectTypeFilter === '2' && subTypeNum !== 2) return false;

      if (subjectSearch.trim()) {
        const q = subjectSearch.toLowerCase().trim();
        const matchName = (sub.name || '').toLowerCase().includes(q);
        const matchCode = (sub.code || '').toLowerCase().includes(q);
        return matchName || matchCode;
      }
      return true;
    });
  }, [subjects, subjectSearch, subjectTypeFilter]);

  const scholasticCount = useMemo(() => {
    return subjects.filter((s) => !(s.type === 2 || s.type === 'CoScholastic' || s.type === '2')).length;
  }, [subjects]);

  const coScholasticCount = useMemo(() => {
    return subjects.filter((s) => s.type === 2 || s.type === 'CoScholastic' || s.type === '2').length;
  }, [subjects]);

  // School & Branch Profile CRUD handlers
  const handleOpenEditProfile = (targetBranch = null) => {
    const br = targetBranch || branchInfo;
    if (!br) return;
    setEditingBranchId(br.id);
    setProfileForm({
      schoolName: br.schoolName || branchInfo?.schoolName || '',
      name: br.name || '',
      code: br.code || '',
      affiliationNumber: br.affiliationNumber || branchInfo?.affiliationNumber || '',
      phone: br.phone || '',
      email: br.email || '',
      website: br.website || branchInfo?.website || '',
      address: br.address || '',
      city: br.city || '',
      state: br.state || '',
      pincode: br.pincode || '',
      printHeader: br.printHeader || '',
    });
    setProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      Alert.alert('Required', 'Branch / Campus Name is required.');
      return;
    }
    if (!profileForm.code.trim()) {
      Alert.alert('Required', 'Branch Code is required.');
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        name: profileForm.name.trim(),
        code: profileForm.code.trim().toUpperCase(),
        schoolName: profileForm.schoolName.trim(),
        affiliationNumber: profileForm.affiliationNumber.trim(),
        website: profileForm.website.trim(),
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        pincode: profileForm.pincode.trim(),
        printHeader: profileForm.printHeader.trim() || `${profileForm.schoolName} - ${profileForm.name}`.trim(),
      };

      const targetId = editingBranchId || branchInfo?.id;
      if (targetId) {
        await branchApi.updateBranch(targetId, payload);
      }

      // Also attempt direct school update if schoolId is present
      if (branchInfo?.schoolId) {
        try {
          await schoolApi.updateSchool(branchInfo.schoolId, {
            name: profileForm.schoolName.trim() || branchInfo.schoolName,
            code: branchInfo.code || profileForm.code.trim(),
            affiliationNumber: profileForm.affiliationNumber.trim(),
            contactNumber: profileForm.phone.trim(),
            email: profileForm.email.trim(),
            website: profileForm.website.trim(),
            address: profileForm.address.trim(),
            isActive: true,
          });
        } catch (schErr) {
          // Handled smoothly
        }
      }

      Alert.alert('Success', 'School & Branch profile updated successfully!');
      setProfileModalVisible(false);
      loadData();
    } catch (err) {
      console.warn('Update profile error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update school profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenAddBranch = () => {
    setNewBranchForm({
      name: '',
      code: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      printHeader: '',
    });
    setBranchModalVisible(true);
  };

  const handleSaveNewBranch = async () => {
    if (!newBranchForm.name.trim() || !newBranchForm.code.trim()) {
      Alert.alert('Required', 'Branch Name and Code are required.');
      return;
    }

    try {
      setSavingNewBranch(true);
      await branchApi.createBranch({
        schoolId: branchInfo?.schoolId || 1,
        name: newBranchForm.name.trim(),
        code: newBranchForm.code.trim().toUpperCase(),
        phone: newBranchForm.phone.trim(),
        email: newBranchForm.email.trim(),
        address: newBranchForm.address.trim(),
        city: newBranchForm.city.trim(),
        state: newBranchForm.state.trim(),
        pincode: newBranchForm.pincode.trim(),
        printHeader: newBranchForm.printHeader.trim() || `${branchInfo?.schoolName || 'School'} - ${newBranchForm.name}`.trim(),
      });

      Alert.alert('Success', `Branch "${newBranchForm.name}" created successfully!`);
      setBranchModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create branch.');
    } finally {
      setSavingNewBranch(false);
    }
  };

  const handleDeleteBranch = (br) => {
    Alert.alert(
      'Deactivate Branch',
      `Are you sure you want to deactivate Branch "${br.name}" (${br.code})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await branchApi.deleteBranch(br.id);
              Alert.alert('Success', `Branch "${br.name}" has been deactivated.`);
              loadData();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to deactivate branch.');
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
              {/* Header with Title and Add Button */}
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeader}>Curriculum Subjects ({subjects.length})</Text>
                  <Text style={styles.sectionSubHeader}>Scholastic & Co-Scholastic curriculum master</Text>
                </View>
                <TouchableOpacity
                  style={styles.addClassHeaderBtn}
                  onPress={handleOpenAddSubject}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={16} color="#ffffff" />
                  <Text style={styles.addClassHeaderBtnText}>+ Add Subject</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.subjectSearchBox}>
                <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.subjectSearchInput}
                  placeholder="Search by name or code (e.g. MATH)..."
                  placeholderTextColor="#94a3b8"
                  value={subjectSearch}
                  onChangeText={setSubjectSearch}
                  clearButtonMode="while-editing"
                />
                {subjectSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setSubjectSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Pills */}
              <View style={styles.subjectFilterRow}>
                <TouchableOpacity
                  style={[styles.subFilterChip, subjectTypeFilter === 'ALL' && styles.subFilterChipActive]}
                  onPress={() => setSubjectTypeFilter('ALL')}
                >
                  <Text style={[styles.subFilterChipText, subjectTypeFilter === 'ALL' && styles.subFilterChipTextActive]}>
                    All ({subjects.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subFilterChip, subjectTypeFilter === '1' && styles.subFilterChipActive]}
                  onPress={() => setSubjectTypeFilter('1')}
                >
                  <Text style={[styles.subFilterChipText, subjectTypeFilter === '1' && styles.subFilterChipTextActive]}>
                    Scholastic ({scholasticCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subFilterChip, subjectTypeFilter === '2' && styles.subFilterChipActive]}
                  onPress={() => setSubjectTypeFilter('2')}
                >
                  <Text style={[styles.subFilterChipText, subjectTypeFilter === '2' && styles.subFilterChipTextActive]}>
                    Co-Scholastic ({coScholasticCount})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* List or Empty State */}
              {filteredSubjects.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="book-outline" size={44} color="#94a3b8" />
                  <Text style={[styles.emptyNote, { marginTop: 8 }]}>
                    {subjects.length === 0
                      ? 'No curriculum subjects registered yet.'
                      : 'No subjects match your search or filter.'}
                  </Text>
                  {subjects.length === 0 && (
                    <TouchableOpacity
                      style={[styles.addClassHeaderBtn, { marginTop: 12 }]}
                      onPress={handleOpenAddSubject}
                    >
                      <Ionicons name="add-circle" size={16} color="#ffffff" />
                      <Text style={styles.addClassHeaderBtnText}>Add First Subject</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredSubjects.map((sub, idx) => {
                  const isCo = sub.type === 2 || sub.type === 'CoScholastic' || sub.type === '2';
                  return (
                    <View key={sub.id || idx} style={styles.subjectCard}>
                      <View style={styles.subjectCardMain}>
                        <View style={[styles.subjectIconBox, isCo ? styles.coScholasticIconBox : styles.scholasticIconBox]}>
                          <Ionicons
                            name={isCo ? 'color-palette-outline' : 'school-outline'}
                            size={20}
                            color={isCo ? '#d97706' : '#0284c7'}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.subjectCardTitle}>{sub.name}</Text>
                            <View style={styles.subjectCodePill}>
                              <Text style={styles.subjectCodeText}>{sub.code || 'N/A'}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                            <View style={[styles.typeBadgeCustom, isCo ? styles.coScholasticBadge : styles.scholasticBadge]}>
                              <Text style={[styles.typeBadgeCustomText, isCo ? styles.coScholasticBadgeText : styles.scholasticBadgeText]}>
                                {isCo ? 'Co-Scholastic (Activity)' : 'Scholastic (Academic)'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {/* Action Buttons: Edit and Delete */}
                        <View style={styles.subjectActionsRow}>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleOpenEditSubject(sub)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.iconActionBtn,
                              {
                                borderColor: isDark ? '#7f1d1d' : '#fecaca',
                                backgroundColor: isDark ? '#450a0a' : '#fef2f2',
                              },
                            ]}
                            onPress={() => handleDeleteSubject(sub)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
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
            <View>
              {/* Header with Title and Edit Profile Button */}
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeader}>School & Campus Profile</Text>
                  <Text style={styles.sectionSubHeader}>Institutional setup, affiliation & receipt printing headers</Text>
                </View>
                <TouchableOpacity
                  style={styles.addClassHeaderBtn}
                  onPress={() => handleOpenEditProfile(branchInfo)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color="#ffffff" />
                  <Text style={styles.addClassHeaderBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>

              {/* School Main Profile Card */}
              <View style={styles.branchCard}>
                <View style={styles.schoolIconCircle}>
                  <Ionicons name="school" size={32} color="#0284c7" />
                </View>

                <Text style={styles.schoolName}>
                  {branchInfo?.schoolName || branchInfo?.name || 'School ERP Campus'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <View style={styles.branchCodeBadge}>
                    <Text style={styles.branchCodeBadgeText}>
                      Branch: {branchInfo?.name || 'Main Campus'} ({branchInfo?.code || 'MAIN'})
                    </Text>
                  </View>
                  {branchInfo?.affiliationNumber ? (
                    <View style={styles.affiliationBadge}>
                      <Ionicons name="ribbon-outline" size={12} color="#15803d" />
                      <Text style={styles.affiliationBadgeText}>Affil: {branchInfo.affiliationNumber}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.divider} />

                {/* Profile Details List */}
                <View style={styles.profileSectionTitleRow}>
                  <Ionicons name="business-outline" size={15} color={colors.primary} />
                  <Text style={styles.profileSectionTitle}>CAMPUS DETAILS</Text>
                </View>

                <View style={styles.branchRow}>
                  <Ionicons name="location-outline" size={16} color="#64748b" />
                  <Text style={styles.branchLabel}>Address:</Text>
                  <Text style={styles.branchValue}>
                    {branchInfo?.address ? `${branchInfo.address}, ${branchInfo.city || ''} ${branchInfo.pincode ? `(${branchInfo.pincode})` : ''}`.trim() : 'Campus Address Not Configured'}
                  </Text>
                </View>

                <View style={styles.branchRow}>
                  <Ionicons name="call-outline" size={16} color="#64748b" />
                  <Text style={styles.branchLabel}>Phone:</Text>
                  <Text style={styles.branchValue}>{branchInfo?.phone || branchInfo?.mobile || '+91 Not Configured'}</Text>
                </View>

                <View style={styles.branchRow}>
                  <Ionicons name="mail-outline" size={16} color="#64748b" />
                  <Text style={styles.branchLabel}>Email:</Text>
                  <Text style={styles.branchValue}>{branchInfo?.email || 'admin@schoolerp.in'}</Text>
                </View>

                {branchInfo?.website ? (
                  <View style={styles.branchRow}>
                    <Ionicons name="globe-outline" size={16} color="#64748b" />
                    <Text style={styles.branchLabel}>Website:</Text>
                    <Text style={styles.branchValue}>{branchInfo.website}</Text>
                  </View>
                ) : null}

                {/* Print & Receipt Header */}
                <View style={[styles.profileSectionTitleRow, { marginTop: 14 }]}>
                  <Ionicons name="receipt-outline" size={15} color={colors.primary} />
                  <Text style={styles.profileSectionTitle}>PRINT & RECEIPT HEADER</Text>
                </View>

                <View style={styles.printHeaderPreviewBox}>
                  <Text style={styles.printHeaderPreviewText}>
                    {branchInfo?.printHeader || `${branchInfo?.schoolName || 'SCHOOL ERP'} - ${branchInfo?.name || 'CAMPUS'}`}
                  </Text>
                  <Text style={styles.printHeaderHintText}>Appears atop fee receipts, report cards and gate passes</Text>
                </View>

                <TouchableOpacity
                  style={[styles.editProfileBtnOutline, { marginTop: 16 }]}
                  onPress={() => handleOpenEditProfile(branchInfo)}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={styles.editProfileBtnOutlineText}>Update School & Branch Profile</Text>
                </TouchableOpacity>
              </View>

              {/* Multi-Branch Management Section */}
              <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeader}>All Campus Branches ({allBranches.length || 1})</Text>
                  <Text style={styles.sectionSubHeader}>Manage school branch network and campuses</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addClassHeaderBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleOpenAddBranch}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={16} color="#ffffff" />
                  <Text style={styles.addClassHeaderBtnText}>+ Add Branch</Text>
                </TouchableOpacity>
              </View>

              {allBranches.length === 0 ? (
                <View style={styles.masterCard}>
                  <View style={styles.masterCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.masterTitle}>{branchInfo?.name || 'Main Campus'}</Text>
                      <Text style={styles.masterSub}>Code: {branchInfo?.code || 'MAIN'} • Active Campus</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => handleOpenEditProfile(branchInfo)}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                allBranches.map((br, idx) => (
                  <View key={br.id || idx} style={styles.masterCard}>
                    <View style={styles.masterCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.masterTitle}>{br.name}</Text>
                          <View style={styles.subjectCodePill}>
                            <Text style={styles.subjectCodeText}>{br.code || 'MAIN'}</Text>
                          </View>
                          {br.id === branchInfo?.id ? (
                            <View style={styles.activePill}>
                              <Text style={styles.activePillText}>Current</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.masterSub}>
                          {br.city ? `${br.city}, ` : ''}{br.phone || br.email || 'No contact configured'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => handleOpenEditProfile(br)}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        {allBranches.length > 1 && br.id !== branchInfo?.id ? (
                          <TouchableOpacity
                            style={[
                              styles.iconActionBtn,
                              {
                                borderColor: isDark ? '#7f1d1d' : '#fecaca',
                                backgroundColor: isDark ? '#450a0a' : '#fef2f2',
                              },
                            ]}
                            onPress={() => handleDeleteBranch(br)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))
              )}
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

      {/* Subject Modal (Create / Edit) */}
      <Modal
        visible={subjectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSubjectModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Create New Subject'}
              </Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Subject Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Mathematics, English, Art, Science"
                placeholderTextColor="#94a3b8"
                value={subjectNameInput}
                onChangeText={setSubjectNameInput}
              />

              <Text style={styles.inputLabel}>Subject Code *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. MATH, ENG, ART, SCI"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={subjectCodeInput}
                onChangeText={(text) => setSubjectCodeInput(text.toUpperCase())}
              />

              <Text style={styles.inputLabel}>Subject Type / Classification *</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorOption,
                    subjectTypeInput === 1 && styles.typeSelectorOptionActive,
                  ]}
                  onPress={() => setSubjectTypeInput(1)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons
                      name={subjectTypeInput === 1 ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={subjectTypeInput === 1 ? colors.primary : '#94a3b8'}
                    />
                    <Text style={[styles.typeOptionTitle, subjectTypeInput === 1 && { color: colors.primary }]}>
                      Scholastic (Academic)
                    </Text>
                  </View>
                  <Text style={styles.typeOptionDesc}>
                    Core academic syllabus (Math, Science, Social Studies, Languages, etc.)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSelectorOption,
                    subjectTypeInput === 2 && styles.typeSelectorOptionActiveAmber,
                  ]}
                  onPress={() => setSubjectTypeInput(2)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons
                      name={subjectTypeInput === 2 ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={subjectTypeInput === 2 ? '#d97706' : '#94a3b8'}
                    />
                    <Text style={[styles.typeOptionTitle, subjectTypeInput === 2 && { color: '#d97706' }]}>
                      Co-Scholastic (Activity / Arts / Sports)
                    </Text>
                  </View>
                  <Text style={styles.typeOptionDesc}>
                    Extracurricular, Physical Education, Visual/Performing Arts, Life Skills
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingSubject && { opacity: 0.7 }]}
                onPress={handleSaveSubject}
                disabled={savingSubject}
              >
                {savingSubject ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>
                      {editingSubject ? 'Update Subject' : 'Create Subject'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* School & Branch Profile Edit Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit School & Branch Profile</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Institutional details and receipt header</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>School Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. St. Xavier's High School"
                placeholderTextColor="#94a3b8"
                value={profileForm.schoolName}
                onChangeText={(text) => setProfileForm({ ...profileForm, schoolName: text })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Branch Campus Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Main Campus, North Wing"
                    placeholderTextColor="#94a3b8"
                    value={profileForm.name}
                    onChangeText={(text) => setProfileForm({ ...profileForm, name: text })}
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.inputLabel}>Branch Code *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. MAIN"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    value={profileForm.code}
                    onChangeText={(text) => setProfileForm({ ...profileForm, code: text.toUpperCase() })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Affiliation / Board Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. CBSE Affiliation No: 2130123"
                placeholderTextColor="#94a3b8"
                value={profileForm.affiliationNumber}
                onChangeText={(text) => setProfileForm({ ...profileForm, affiliationNumber: text })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Official Contact Phone</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. +91 9876543210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={profileForm.phone}
                    onChangeText={(text) => setProfileForm({ ...profileForm, phone: text })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Official Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. admin@school.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={profileForm.email}
                    onChangeText={(text) => setProfileForm({ ...profileForm, email: text })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>School Website</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. https://www.schoolerp.in"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                value={profileForm.website}
                onChangeText={(text) => setProfileForm({ ...profileForm, website: text })}
              />

              <Text style={styles.inputLabel}>Campus Street Address</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="e.g. Sector 12, Urban Estate, Civil Lines"
                placeholderTextColor="#94a3b8"
                multiline
                value={profileForm.address}
                onChangeText={(text) => setProfileForm({ ...profileForm, address: text })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. New Delhi"
                    placeholderTextColor="#94a3b8"
                    value={profileForm.city}
                    onChangeText={(text) => setProfileForm({ ...profileForm, city: text })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Delhi"
                    placeholderTextColor="#94a3b8"
                    value={profileForm.state}
                    onChangeText={(text) => setProfileForm({ ...profileForm, state: text })}
                  />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={styles.inputLabel}>Pincode</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 110001"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={profileForm.pincode}
                    onChangeText={(text) => setProfileForm({ ...profileForm, pincode: text })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Print Header (Receipts & Reports)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. ST. XAVIER'S HIGH SCHOOL - MAIN CAMPUS"
                placeholderTextColor="#94a3b8"
                value={profileForm.printHeader}
                onChangeText={(text) => setProfileForm({ ...profileForm, printHeader: text })}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>Save School Profile</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Branch Modal */}
      <Modal
        visible={branchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add Campus Branch</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Register a new campus under this school</Text>
              </View>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Branch / Campus Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. West Campus, Junior Wing"
                placeholderTextColor="#94a3b8"
                value={newBranchForm.name}
                onChangeText={(text) => setNewBranchForm({ ...newBranchForm, name: text })}
              />

              <Text style={styles.inputLabel}>Branch Code *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. WEST, JRWING"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={newBranchForm.code}
                onChangeText={(text) => setNewBranchForm({ ...newBranchForm, code: text.toUpperCase() })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. +91 9876543210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={newBranchForm.phone}
                    onChangeText={(text) => setNewBranchForm({ ...newBranchForm, phone: text })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. branch@school.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newBranchForm.email}
                    onChangeText={(text) => setNewBranchForm({ ...newBranchForm, email: text })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Campus Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Ring Road, Sector 5"
                placeholderTextColor="#94a3b8"
                value={newBranchForm.address}
                onChangeText={(text) => setNewBranchForm({ ...newBranchForm, address: text })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. New Delhi"
                    placeholderTextColor="#94a3b8"
                    value={newBranchForm.city}
                    onChangeText={(text) => setNewBranchForm({ ...newBranchForm, city: text })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Delhi"
                    placeholderTextColor="#94a3b8"
                    value={newBranchForm.state}
                    onChangeText={(text) => setNewBranchForm({ ...newBranchForm, state: text })}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#10b981' }, savingNewBranch && { opacity: 0.7 }]}
                onPress={handleSaveNewBranch}
                disabled={savingNewBranch}
              >
                {savingNewBranch ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>Create Branch Campus</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
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
  sectionSubHeader: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 4,
  },
  subjectSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  subjectSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  subjectFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  subFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subFilterChipActive: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    borderColor: colors.primary,
  },
  subFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subFilterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  subjectCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subjectCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scholasticIconBox: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
  },
  coScholasticIconBox: {
    backgroundColor: isDark ? '#451a03' : '#fef3c7',
  },
  subjectCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subjectCodePill: {
    backgroundColor: isDark ? '#334155' : '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeBadgeCustom: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scholasticBadge: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
  },
  scholasticBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#0284c7',
  },
  coScholasticBadge: {
    backgroundColor: isDark ? '#451a03' : '#fef3c7',
  },
  coScholasticBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#fcd34d' : '#d97706',
  },
  subjectActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  typeSelectorRow: {
    gap: 8,
    marginBottom: 10,
  },
  typeSelectorOption: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.inputBg,
  },
  typeSelectorOptionActive: {
    borderColor: colors.primary,
    backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
  },
  typeSelectorOptionActiveAmber: {
    borderColor: '#d97706',
    backgroundColor: isDark ? '#1a1309' : '#fffbeb',
  },
  typeOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  typeOptionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 24,
  },
  branchCodeBadge: {
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  branchCodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  affiliationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  affiliationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#6ee7b7' : '#15803d',
  },
  profileSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 8,
    marginTop: 4,
  },
  profileSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  printHeaderPreviewBox: {
    width: '100%',
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  printHeaderPreviewText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  printHeaderHintText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  editProfileBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
  },
  editProfileBtnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
