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
  Image,
  ImageBackground,
  Switch,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { studentApi, classApi, feesApi, branchApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
import {
  executePrint,
  executeSharePdf,
  generateIdCardPrintHtml,
  createDefaultTemplate,
  createDefaultBackTemplate,
} from '../utils/printTemplates';

export default function StudentOperationsScreen({ navigation, route }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const { hasPermission, isSuperAdmin } = usePermission();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const initialTab = route?.params?.tab || 'roll';
  const [activeTab, setActiveTab] = useState(initialTab); // 'roll' | 'section' | 'idcard' | 'fee-structure' | 'bulk'

  // ID Card Sub-view: 'print' | 'design'
  const [idSubTab, setIdSubTab] = useState('print');

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingRoll, setSavingRoll] = useState(false);

  // Section Change state
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState(null);
  const [transferReason, setTransferReason] = useState('Academic realignment');
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // ID Card Bulk/Single selection
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [printingIdCard, setPrintingIdCard] = useState(false);
  const [sharingIdCard, setSharingIdCard] = useState(false);

  // ID Card Design & Format Templates (Synced from Web App Backend)
  const [frontConfig, setFrontConfig] = useState(null);
  const [backConfig, setBackConfig] = useState(null);
  const [printSide, setPrintSide] = useState('front'); // 'front' | 'back' | 'both'
  const [previewSide, setPreviewSide] = useState('front'); // 'front' | 'back'
  const [syncingTemplate, setSyncingTemplate] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // Fetch ID Card Template from Backend (Created & Saved on Web App)
  const fetchIdCardTemplate = async (showToast = false) => {
    try {
      setSyncingTemplate(true);
      const res = await branchApi.getIdCardTemplate();
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        let front = null;
        let back = null;

        if (data.frontConfig) {
          try {
            front = typeof data.frontConfig === 'string' ? JSON.parse(data.frontConfig) : data.frontConfig;
          } catch (e) {}
        }
        if (data.backConfig) {
          try {
            back = typeof data.backConfig === 'string' ? JSON.parse(data.backConfig) : data.backConfig;
          } catch (e) {}
        }

        if (!front) {
          front = createDefaultTemplate(data || user);
        }
        if (!back) {
          back = createDefaultBackTemplate(data || user);
        }

        setFrontConfig(front);
        setBackConfig(back);

        const now = new Date();
        const timeStr = `${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        setLastSyncedTime(timeStr);

        await AsyncStorage.setItem('@school_erp_id_card_front', JSON.stringify(front));
        await AsyncStorage.setItem('@school_erp_id_card_back', JSON.stringify(back));
        await AsyncStorage.setItem('@school_erp_id_card_synced_at', timeStr);

        if (showToast) {
          Alert.alert('Synced with Web App! 🔄', 'The latest ID Card template format designed on the Web App has been updated.');
        }
      }
    } catch (e) {
      console.warn('Failed to fetch ID card template:', e);
      try {
        const cachedF = await AsyncStorage.getItem('@school_erp_id_card_front');
        const cachedB = await AsyncStorage.getItem('@school_erp_id_card_back');
        const cachedT = await AsyncStorage.getItem('@school_erp_id_card_synced_at');
        if (cachedF) setFrontConfig(JSON.parse(cachedF));
        else setFrontConfig(createDefaultTemplate(user));
        if (cachedB) setBackConfig(JSON.parse(cachedB));
        else setBackConfig(createDefaultBackTemplate(user));
        if (cachedT) setLastSyncedTime(cachedT);
      } catch (err) {
        setFrontConfig(createDefaultTemplate(user));
        setBackConfig(createDefaultBackTemplate(user));
      }
      if (showToast) {
        Alert.alert('Notice', 'Unable to reach server. Using cached ID card template.');
      }
    } finally {
      setSyncingTemplate(false);
    }
  };

  // Load Classes & Web Template on mount
  useEffect(() => {
    classApi.getClasses().then((res) => {
      if (res.data?.success && res.data?.data) {
        const clsList = res.data.data;
        setClasses(clsList);
        if (clsList.length > 0 && !selectedClassId) {
          setSelectedClassId(clsList[0].id);
          if (clsList[0].sections && clsList[0].sections.length > 0) {
            setSelectedSectionId(clsList[0].sections[0].id);
          }
        }
      }
    }).catch(() => {});

    fetchIdCardTemplate(false);
  }, []);

  const activeClass = classes.find((c) => c.id === selectedClassId);
  const sections = activeClass?.sections || [];

  // Fetch Students for selected class & section
  const fetchStudents = async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      const params = { classId: selectedClassId, pageSize: 150 };
      if (selectedSectionId) params.sectionId = selectedSectionId;

      const res = await studentApi.getStudents(params);
      if (res.data?.success && res.data?.data) {
        const list = res.data.data.items || res.data.data || [];
        setStudents(list);
        setSelectedStudentIds(list.map((s) => s.id));
        if (list.length > 0) {
          setPreviewStudent(list[0]);
        } else {
          setPreviewStudent(null);
        }
      }
    } catch (e) {
      console.warn('Error fetching students:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId, selectedSectionId]);

  // Handle Class Switch
  const handleSelectClass = (cls) => {
    setSelectedClassId(cls.id);
    if (cls.sections && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId(null);
    }
  };

  // Roll Number changes in memory
  const handleRollNumberChange = (index, val) => {
    const updated = [...students];
    updated[index].rollNo = val;
    setStudents(updated);
  };

  // Handle Auto-Assign Alphabetical Roll Numbers
  const handleAutoAssignAlphabetical = () => {
    if (students.length === 0) {
      Alert.alert('Notice', 'No students in this class roster.');
      return;
    }

    const sorted = [...students].sort((a, b) =>
      (a.fullName || a.firstName || '').localeCompare(b.fullName || b.firstName || '', undefined, { sensitivity: 'base' })
    );

    const renumbered = sorted.map((s, idx) => ({
      ...s,
      rollNo: idx + 1,
    }));

    setStudents(renumbered);
    Alert.alert(
      'Roll Numbers Generated ✨',
      `Assigned 1 to ${renumbered.length} alphabetically. Tap "Save to Database" to apply.`
    );
  };

  // Save Roll Numbers to Backend DB
  const handleSaveRollNumbersToDb = async () => {
    if (students.length === 0) return;

    // Check duplicates
    const rollCounts = {};
    students.forEach((s) => {
      if (s.rollNo !== '' && s.rollNo !== null && s.rollNo !== undefined) {
        rollCounts[s.rollNo] = (rollCounts[s.rollNo] || 0) + 1;
      }
    });
    const duplicates = Object.keys(rollCounts).filter((r) => rollCounts[r] > 1);
    if (duplicates.length > 0) {
      Alert.alert(
        'Duplicate Roll Numbers',
        `Roll number(s) ${duplicates.join(', ')} are assigned to multiple students. Please fix before saving.`
      );
      return;
    }

    const assignments = students
      .filter((s) => s.rollNo !== '' && s.rollNo !== null && s.rollNo !== undefined && !isNaN(s.rollNo))
      .map((s) => ({
        studentId: s.id || s.studentId,
        rollNo: Number(s.rollNo),
      }));

    if (assignments.length === 0) {
      Alert.alert('Notice', 'No roll numbers to save.');
      return;
    }

    try {
      setSavingRoll(true);
      const res = await studentApi.assignRollNumbers({
        classId: Number(selectedClassId),
        sectionId: selectedSectionId ? Number(selectedSectionId) : null,
        assignments,
      });

      if (res.data?.success) {
        Alert.alert('Saved Successfully! ✅', `Roll numbers persisted for ${assignments.length} students.`);
        fetchStudents(); // Refresh to ensure DB sync
      } else {
        Alert.alert('Save Failed', res.data?.message || 'Could not save roll numbers.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to persist roll numbers to database.');
    } finally {
      setSavingRoll(false);
    }
  };

  // Handle Real Section Transfer via Backend API
  const handleConfirmTransferSection = async () => {
    if (!selectedStudentForTransfer || !targetSectionId) {
      Alert.alert('Validation', 'Please select a student and target section.');
      return;
    }

    try {
      setTransferring(true);
      const payload = {
        studentId: Number(selectedStudentForTransfer.id || selectedStudentForTransfer.studentId),
        toSectionId: Number(targetSectionId),
        reason: transferReason.trim() || 'Administrative shift',
      };

      const res = await studentApi.changeSection(payload);
      if (res.data?.success) {
        Alert.alert('Section Changed! 🎯', 'Student section transfer has been recorded in database.');
        setTransferModalVisible(false);
        fetchStudents();
      } else {
        Alert.alert('Transfer Failed', res.data?.message || 'Could not shift section.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change section.');
    } finally {
      setTransferring(false);
    }
  };

  // Toggle Single Student for ID Card
  const toggleSelectStudent = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((x) => x !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // Toggle All Students for ID Card
  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.admissionNo || '').toLowerCase().includes(q) ||
        String(s.rollNo || '').includes(q)
    );
  }, [students, studentSearch]);

  // Helper to get students to print/share
  const getSelectedStudentsForIdCards = () => {
    let list = students.filter((s) => selectedStudentIds.includes(s.id));
    if (list.length === 0 && previewStudent) {
      list = [previewStudent];
    }
    return list;
  };

  // Generate HTML for Single or Bulk ID Cards matching Web A4 Print 100%
  const handlePrintIdCards = async () => {
    const listToPrint = getSelectedStudentsForIdCards();

    if (listToPrint.length === 0) {
      Alert.alert('Notice', 'Please select at least one student to print ID cards.');
      return;
    }

    try {
      setPrintingIdCard(true);
      const schoolName = user?.schoolName || 'School ERP';
      const className = activeClass?.name || 'Class';
      const secName = activeClass?.sections?.find((s) => s.id === selectedSectionId)?.name || '';
      const classLabel = secName ? `${className} - ${secName}` : className;

      const fullHtml = generateIdCardPrintHtml({
        students: listToPrint,
        frontConfig: frontConfig || createDefaultTemplate(user),
        backConfig: backConfig || createDefaultBackTemplate(user),
        printSide: printSide,
        schoolInfo: {
          schoolName,
          className: classLabel,
        },
      });

      const count = listToPrint.length;
      const fileName = count === 1
        ? `ID_Card_${(listToPrint[0]?.fullName || 'Student').replace(/\s+/g, '_')}_${listToPrint[0]?.admissionNo || ''}.pdf`
        : `ID_Cards_${className.replace(/\s+/g, '_')}${secName ? `_Sec_${secName}` : ''}_(${count}_Cards).pdf`;

      const isHorizontal = ((printSide === 'front' ? frontConfig?.orientation : backConfig?.orientation) || 'horizontal') === 'horizontal';
      const a4Options = {
        width: isHorizontal ? 595 : 842,
        height: isHorizontal ? 842 : 595,
      };

      await executePrint(fullHtml, fileName, a4Options);
    } catch (err) {
      console.warn('Print error:', err);
      try {
        await executeSharePdf(fullHtml, fileName);
      } catch (_) {
        Alert.alert('Notice', 'Could not open print or document share sheet.');
      }
    } finally {
      setPrintingIdCard(false);
    }
  };

  // Generate PDF and Download/Share via Android Share Sheet / File Manager
  const handleShareIdCards = async () => {
    const listToPrint = getSelectedStudentsForIdCards();

    if (listToPrint.length === 0) {
      Alert.alert('Notice', 'Please select at least one student to download or share ID cards.');
      return;
    }

    try {
      setSharingIdCard(true);
      const schoolName = user?.schoolName || 'School ERP';
      const className = activeClass?.name || 'Class';
      const secName = activeClass?.sections?.find((s) => s.id === selectedSectionId)?.name || '';
      const classLabel = secName ? `${className} - ${secName}` : className;

      const fullHtml = generateIdCardPrintHtml({
        students: listToPrint,
        frontConfig: frontConfig || createDefaultTemplate(user),
        backConfig: backConfig || createDefaultBackTemplate(user),
        printSide: printSide,
        schoolInfo: {
          schoolName,
          className: classLabel,
        },
      });

      const count = listToPrint.length;
      const fileName = count === 1
        ? `ID_Card_${(listToPrint[0]?.fullName || 'Student').replace(/\s+/g, '_')}_${listToPrint[0]?.admissionNo || ''}.pdf`
        : `ID_Cards_${className.replace(/\s+/g, '_')}${secName ? `_Sec_${secName}` : ''}_(${count}_Cards).pdf`;

      const isHorizontal = ((printSide === 'front' ? frontConfig?.orientation : backConfig?.orientation) || 'horizontal') === 'horizontal';
      const a4Options = {
        width: isHorizontal ? 595 : 842,
        height: isHorizontal ? 842 : 595,
      };

      await executeSharePdf(fullHtml, fileName, a4Options);
    } catch (err) {
      console.warn('Share error:', err);
      Alert.alert('Notice', 'Could not open document share sheet.');
    } finally {
      setSharingIdCard(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Module Navigation Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          {[
            { id: 'roll', label: 'Roll Numbers', icon: 'list-circle' },
            { id: 'section', label: 'Section Shift', icon: 'swap-horizontal' },
            { id: 'idcard', label: 'ID Card Studio', icon: 'card' },
            { id: 'fee-structure', label: 'Class Fees', icon: 'layers' },
            { id: 'bulk', label: 'Bulk Upload', icon: 'cloud-upload' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={active ? '#ffffff' : colors.textSecondary}
                />
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Class & Section Selector Bar (Used across Roll No, Section Change & ID Cards) */}
      {['roll', 'section', 'idcard'].includes(activeTab) && (
        <View style={styles.selectorBar}>
          <Text style={styles.barLabel}>Select Grade & Class:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {classes.map((cls) => {
              const active = cls.id === selectedClassId;
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.classChip, active && styles.classChipActive]}
                  onPress={() => handleSelectClass(cls)}
                >
                  <Text style={[styles.classChipText, active && styles.classChipTextActive]}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Section Chips */}
          {sections.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              <Text style={styles.barLabelSmall}>Section:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {sections.map((sec) => {
                  const active = sec.id === selectedSectionId;
                  return (
                    <TouchableOpacity
                      key={sec.id}
                      style={[styles.secChip, active && styles.secChipActive]}
                      onPress={() => setSelectedSectionId(sec.id)}
                    >
                      <Text style={[styles.secChipText, active && styles.secChipTextActive]}>
                        Sec {sec.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading student roster...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* ======================================================== */}
          {/* TAB 1: ROLL NUMBERS                                       */}
          {/* ======================================================== */}
          {activeTab === 'roll' && (
            <View style={{ flex: 1, padding: 14 }}>
              {/* Action Toolbar */}
              <View style={styles.actionToolbar}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toolbarTitle, { color: colors.textPrimary }]}>
                    Students in {activeClass?.name || 'Class'} ({students.length})
                  </Text>
                  <Text style={[styles.toolbarSub, { color: colors.textSecondary }]}>
                    Auto-number or type directly, then tap Save
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={handleAutoAssignAlphabetical}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={14} color="#0284c7" />
                    <Text style={styles.btnSecondaryText}>Auto (A-Z)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnPrimary, savingRoll && { opacity: 0.7 }]}
                    onPress={handleSaveRollNumbersToDb}
                    disabled={savingRoll}
                    activeOpacity={0.8}
                  >
                    {savingRoll ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="save" size={14} color="#ffffff" />
                        <Text style={styles.btnPrimaryText}>Save to DB</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {students.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="people-outline" size={44} color="#94a3b8" />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No students in this class/section</Text>
                </View>
              ) : (
                <FlatList
                  data={students}
                  keyExtractor={(item) => String(item.id || item.studentId)}
                  contentContainerStyle={{ paddingBottom: 50 }}
                  renderItem={({ item, index }) => (
                    <View
                      style={[
                        styles.studentRowCard,
                        { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                      ]}
                    >
                      <View style={styles.rollIndexCircle}>
                        <Text style={styles.rollIndexText}>{item.rollNo || index + 1}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.studentCardName, { color: colors.textPrimary }]}>
                          {item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim()}
                        </Text>
                        <Text style={[styles.studentCardAdm, { color: colors.textSecondary }]}>
                          Adm: {item.admissionNo || 'N/A'} • Sec: {item.sectionName || 'A'}
                        </Text>
                      </View>

                      <View style={styles.rollInputGroup}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700' }}>Roll #</Text>
                        <TextInput
                          style={[
                            styles.rollNumberInput,
                            { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary },
                          ]}
                          value={String(item.rollNo ?? '')}
                          onChangeText={(txt) => handleRollNumberChange(index, txt)}
                          keyboardType="numeric"
                          placeholder="—"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SECTION CHANGE                                     */}
          {/* ======================================================== */}
          {activeTab === 'section' && (
            <View style={{ flex: 1, padding: 14 }}>
              <View style={styles.actionToolbar}>
                <View>
                  <Text style={[styles.toolbarTitle, { color: colors.textPrimary }]}>
                    Section Transfer Suite
                  </Text>
                  <Text style={[styles.toolbarSub, { color: colors.textSecondary }]}>
                    Tap any student to reassign their section with audit trail
                  </Text>
                </View>
              </View>

              <FlatList
                data={students}
                keyExtractor={(item) => String(item.id || item.studentId)}
                contentContainerStyle={{ paddingBottom: 50 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.studentRowCard,
                      { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                    ]}
                    onPress={() => {
                      setSelectedStudentForTransfer(item);
                      setTargetSectionId(null);
                      setTransferModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentCardName, { color: colors.textPrimary }]}>
                        {item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim()}
                      </Text>
                      <Text style={[styles.studentCardAdm, { color: colors.textSecondary }]}>
                        Current: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Section {item.sectionName || 'A'}</Text> • Adm: #{item.admissionNo}
                      </Text>
                    </View>

                    <View style={styles.transferPill}>
                      <Text style={styles.transferPillText}>Shift Section →</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ID CARD STUDIO (PRINT & DESIGN)                    */}
          {/* ======================================================== */}
          {activeTab === 'idcard' && (
            <View style={{ flex: 1 }}>
              {/* Studio Sub-Tab Switcher */}
              <View style={styles.subTabHeader}>
                <TouchableOpacity
                  style={[styles.subTabBtn, idSubTab === 'print' && styles.subTabBtnActive]}
                  onPress={() => setIdSubTab('print')}
                >
                  <Ionicons name="print-outline" size={15} color={idSubTab === 'print' ? '#ffffff' : colors.textSecondary} />
                  <Text style={[styles.subTabBtnText, idSubTab === 'print' && styles.subTabBtnTextActive]}>
                    Print ID Cards (Single / Bulk)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.subTabBtn, idSubTab === 'design' && styles.subTabBtnActive]}
                  onPress={() => setIdSubTab('design')}
                >
                  <Ionicons name="color-palette-outline" size={15} color={idSubTab === 'design' ? '#ffffff' : colors.textSecondary} />
                  <Text style={[styles.subTabBtnText, idSubTab === 'design' && styles.subTabBtnTextActive]}>
                    Web Template & Sync
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 3A. PRINT SUB-TAB */}
              {idSubTab === 'print' && (
                <View style={{ flex: 1, padding: 14 }}>
                  {/* Print Sides Selector: Front / Back / Both */}
                  <View style={styles.printSideContainer}>
                    <Text style={[styles.miniBarLabel, { color: colors.textSecondary }]}>Print Sides:</Text>
                    <View style={styles.printSideRow}>
                      {[
                        { id: 'front', label: 'Front Only' },
                        { id: 'back', label: 'Back Only' },
                        { id: 'both', label: 'Both (Dual Sided)' },
                      ].map((side) => {
                        const isActive = printSide === side.id;
                        return (
                          <TouchableOpacity
                            key={side.id}
                            style={[
                              styles.sidePill,
                              isActive && styles.sidePillActive,
                              { backgroundColor: isActive ? '#0284c7' : colors.cardBg, borderColor: isActive ? '#0284c7' : isDark ? colors.cardBorder : '#cbd5e1' },
                            ]}
                            onPress={() => setPrintSide(side.id)}
                          >
                            <Text style={[styles.sidePillText, isActive && styles.sidePillTextActive, { color: isActive ? '#ffffff' : colors.textPrimary }]}>
                              {side.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Selection & Search Bar */}
                  <View style={styles.searchAndSelectionRow}>
                    <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#cbd5e1' }]}>
                      <Ionicons name="search" size={16} color="#94a3b8" />
                      <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Search student by name or adm #..."
                        placeholderTextColor="#94a3b8"
                        value={studentSearch}
                        onChangeText={setStudentSearch}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.selectAllBtn}
                      onPress={toggleSelectAllStudents}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? 'checkbox' : 'square-outline'}
                        size={18}
                        color="#0284c7"
                      />
                      <Text style={styles.selectAllText}>
                        Select All ({selectedStudentIds.length}/{filteredStudents.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action Bar (Print & Share PDF) */}
                  {(() => {
                    const activeCount = selectedStudentIds.length > 0
                      ? selectedStudentIds.length
                      : (previewStudent ? 1 : 0);
                    return (
                      <View style={styles.printActionRow}>
                        <TouchableOpacity
                          style={[styles.printMainBtn, (printingIdCard || sharingIdCard) && { opacity: 0.7 }]}
                          onPress={handlePrintIdCards}
                          disabled={printingIdCard || sharingIdCard}
                          activeOpacity={0.8}
                        >
                          {printingIdCard ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Ionicons name="print" size={17} color="#ffffff" />
                              <Text style={styles.printMainBtnText}>
                                Print ({activeCount})
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.shareMainBtn, (printingIdCard || sharingIdCard) && { opacity: 0.7 }]}
                          onPress={handleShareIdCards}
                          disabled={printingIdCard || sharingIdCard}
                          activeOpacity={0.8}
                        >
                          {sharingIdCard ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Ionicons name="share-social" size={17} color="#ffffff" />
                              <Text style={styles.shareMainBtnText}>
                                Share PDF ({activeCount})
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  {/* Student Checklist */}
                  <FlatList
                    data={filteredStudents}
                    keyExtractor={(item) => String(item.id || item.studentId)}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    renderItem={({ item }) => {
                      const isSelected = selectedStudentIds.includes(item.id);
                      const isPreview = previewStudent?.id === item.id;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.idChecklistRow,
                            { backgroundColor: colors.cardBg, borderColor: isPreview ? '#0284c7' : isDark ? colors.cardBorder : '#e2e8f0' },
                            isPreview && { borderWidth: 1.5 },
                          ]}
                          onPress={() => setPreviewStudent(item)}
                          activeOpacity={0.8}
                        >
                          <TouchableOpacity
                            onPress={() => toggleSelectStudent(item.id)}
                            style={{ padding: 4 }}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={isSelected ? '#0284c7' : '#94a3b8'}
                            />
                          </TouchableOpacity>

                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.studentCardName, { color: colors.textPrimary }]}>
                              {item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim()}
                            </Text>
                            <Text style={[styles.studentCardAdm, { color: colors.textSecondary }]}>
                              Adm #{item.admissionNo} • Roll: {item.rollNo || '—'} • Sec {item.sectionName || 'A'}
                            </Text>
                          </View>

                          {isPreview && (
                            <View style={styles.previewTag}>
                              <Text style={styles.previewTagText}>Previewing</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}

              {/* 3B. DESIGN / WEB PREVIEW SUB-TAB */}
              {idSubTab === 'design' && (
                <ScrollView contentContainerStyle={{ padding: 14 }}>
                  {/* Web Sync Status Banner */}
                  <View style={[styles.syncBanner, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <View style={styles.syncStatusRow}>
                        <View style={styles.syncBadge} />
                        <Text style={[styles.syncTitle, { color: colors.textPrimary }]}>
                          Synced with Web App Template
                        </Text>
                      </View>
                      <Text style={[styles.syncSub, { color: colors.textSecondary }]}>
                        {lastSyncedTime ? `Last updated: ${lastSyncedTime}` : 'Official branch template active'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.syncBtn, syncingTemplate && { opacity: 0.6 }]}
                      onPress={() => fetchIdCardTemplate(true)}
                      disabled={syncingTemplate}
                    >
                      {syncingTemplate ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="sync" size={13} color="#ffffff" />
                          <Text style={styles.syncBtnText}>Sync from Web</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Front / Back Side Switcher */}
                  <View style={styles.previewSideRow}>
                    <TouchableOpacity
                      style={[
                        styles.previewSideBtn,
                        previewSide === 'front' && styles.previewSideBtnActive,
                        { backgroundColor: previewSide === 'front' ? '#0284c7' : colors.cardBg, borderColor: previewSide === 'front' ? '#0284c7' : isDark ? colors.cardBorder : '#cbd5e1' },
                      ]}
                      onPress={() => setPreviewSide('front')}
                    >
                      <Text style={[styles.previewSideBtnText, previewSide === 'front' && styles.previewSideBtnTextActive, { color: previewSide === 'front' ? '#ffffff' : colors.textPrimary }]}>
                        Front Side Preview
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.previewSideBtn,
                        previewSide === 'back' && styles.previewSideBtnActive,
                        { backgroundColor: previewSide === 'back' ? '#0284c7' : colors.cardBg, borderColor: previewSide === 'back' ? '#0284c7' : isDark ? colors.cardBorder : '#cbd5e1' },
                      ]}
                      onPress={() => setPreviewSide('back')}
                    >
                      <Text style={[styles.previewSideBtnText, previewSide === 'back' && styles.previewSideBtnTextActive, { color: previewSide === 'back' ? '#ffffff' : colors.textPrimary }]}>
                        Back Side Preview
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* WYSIWYG Live Card Render from Web Template */}
                  {(() => {
                    const activeConfig = previewSide === 'front'
                      ? (frontConfig || createDefaultTemplate(user))
                      : (backConfig || createDefaultBackTemplate(user));
                    const isHorizontal = activeConfig?.orientation === 'horizontal';
                    const baseW = isHorizontal ? 330 : 210;
                    const baseH = isHorizontal ? 210 : 330;
                    const cardW = isHorizontal ? 320 : 230;
                    const cardH = isHorizontal ? 204 : 360;

                    return (
                      <View style={styles.previewBoxWrapper}>
                        <View
                          style={[
                            styles.liveCardPreview,
                            {
                              width: cardW,
                              height: cardH,
                              borderColor: '#cbd5e1',
                              borderWidth: 1,
                              backgroundColor: '#ffffff',
                              position: 'relative',
                              overflow: 'hidden',
                            },
                          ]}
                        >
                          {activeConfig?.bgImage ? (
                            <ImageBackground
                              source={{ uri: activeConfig.bgImage }}
                              style={{ width: '100%', height: '100%', position: 'absolute' }}
                              resizeMode="cover"
                            />
                          ) : null}

                          {(activeConfig?.elements || []).map((el) => {
                            const posX = (el.x / baseW) * cardW;
                            const posY = (el.y / baseH) * cardH;
                            const fontSize = Math.max(7, Math.round(((el.fontSize || 10) / baseW) * cardW));
                            const colorHex = String(el.color || '000000').startsWith('#') ? el.color : `#${el.color}`;

                            if (el.isPhoto) {
                              const pW = ((el.width || 60) / baseW) * cardW;
                              const pH = ((el.height || 75) / baseH) * cardH;
                              return (
                                <View
                                  key={el.id}
                                  style={{
                                    position: 'absolute',
                                    left: posX,
                                    top: posY,
                                    width: pW,
                                    height: pH,
                                    borderRadius: 4,
                                    borderWidth: 1,
                                    borderColor: '#cbd5e1',
                                    overflow: 'hidden',
                                    backgroundColor: '#f8fafc',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {previewStudent?.photoUrl ? (
                                    <Image
                                      source={{ uri: previewStudent.photoUrl }}
                                      style={{ width: '100%', height: '100%' }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <MaterialIcons name="person" size={28} color="#94a3b8" />
                                  )}
                                </View>
                              );
                            }

                            let textVal = el.text || '';
                            if (el.field === 'studentName') {
                              textVal = previewStudent?.fullName || `${previewStudent?.firstName || ''} ${previewStudent?.lastName || ''}`.trim() || 'Student Name';
                            }
                            if (el.field === 'classSection') {
                              textVal = `${previewStudent?.className || activeClass?.name || 'Class'} - ${previewStudent?.sectionName || 'A'}`;
                            }
                            if (el.field === 'fatherName') {
                              textVal = previewStudent?.fatherName || previewStudent?.guardianName || 'Guardian';
                            }
                            if (el.field === 'motherName') {
                              textVal = previewStudent?.motherName || 'Mother';
                            }
                            if (el.field === 'phone') {
                              textVal = previewStudent?.phone || previewStudent?.guardianMobile || previewStudent?.emergencyContact || '9876543210';
                            }
                            if (el.field === 'dob') {
                              textVal = previewStudent?.dateOfBirth
                                ? typeof previewStudent.dateOfBirth === 'string' && previewStudent.dateOfBirth.includes('/')
                                  ? previewStudent.dateOfBirth
                                  : new Date(previewStudent.dateOfBirth).toLocaleDateString('en-IN')
                                : '15/05/2018';
                            }
                            if (el.field === 'address') {
                              textVal = previewStudent?.address || 'Campus Ward';
                            }
                            if (el.field === 'admissionNo') {
                              textVal = previewStudent?.admissionNo || '2026-001';
                            }

                            return (
                              <View
                                key={el.id}
                                style={{
                                  position: 'absolute',
                                  left: posX,
                                  top: posY,
                                  maxWidth: el.width ? (el.width / baseW) * cardW : undefined,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: fontSize,
                                    color: colorHex,
                                    fontWeight: el.fontWeight === 'bold' ? '700' : '400',
                                    lineHeight: fontSize * 1.25,
                                  }}
                                  numberOfLines={2}
                                >
                                  {el.prefix ? <Text style={{ fontWeight: '700' }}>{el.prefix} </Text> : null}
                                  {textVal}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Template Details & Web-Sync Guidance */}
                  <View style={[styles.templateSpecCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
                    <Text style={[styles.specTitle, { color: colors.textPrimary }]}>Template Specifications</Text>
                    <View style={styles.specGrid}>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Layout</Text>
                        <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                          {((previewSide === 'front' ? frontConfig : backConfig)?.orientation || 'vertical').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Background</Text>
                        <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                          {(previewSide === 'front' ? frontConfig : backConfig)?.bgImage ? 'Graphic' : 'White'}
                        </Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Elements</Text>
                        <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                          {(previewSide === 'front' ? frontConfig : backConfig)?.elements?.length || 0} Fields
                        </Text>
                      </View>
                    </View>

                    <View style={styles.specNoticeBox}>
                      <Ionicons name="information-circle" size={16} color="#0284c7" />
                      <Text style={styles.specNoticeText}>
                        Web App Auto-Sync: ID card layout, colors, field positioning, and background image are designed in the Web App ("Students → ID Card Designer"). Changes made on the Web App reflect here immediately.
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.printFromPreviewBtn, { flex: 1 }, (printingIdCard || sharingIdCard) && { opacity: 0.7 }]}
                        onPress={() => handlePrintIdCards(false)}
                        disabled={printingIdCard || sharingIdCard}
                      >
                        <Ionicons name="print" size={15} color="#ffffff" />
                        <Text style={styles.printFromPreviewText}>Print Card</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.shareFromPreviewBtn, { flex: 1 }, (printingIdCard || sharingIdCard) && { opacity: 0.7 }]}
                        onPress={() => handleShareIdCards(false)}
                        disabled={printingIdCard || sharingIdCard}
                      >
                        {sharingIdCard ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="download" size={15} color="#ffffff" />
                            <Text style={styles.shareFromPreviewText}>Download / Share</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CLASS FEE STRUCTURE                                */}
          {/* ======================================================== */}
          {activeTab === 'fee-structure' && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.actionToolbar}>
                <View>
                  <Text style={[styles.toolbarTitle, { color: colors.textPrimary }]}>
                    Prescribed Fee Heads: {activeClass?.name || 'Class'}
                  </Text>
                  <Text style={[styles.toolbarSub, { color: colors.textSecondary }]}>
                    Standard fees charged across all cohorts in current session
                  </Text>
                </View>
              </View>

              <View style={[styles.feeCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
                {[
                  { head: 'Tuition Fee', freq: 'Monthly', amount: '₹1,500' },
                  { head: 'Annual Development', freq: 'Yearly', amount: '₹3,000' },
                  { head: 'Examination Fee', freq: 'Termly (x2)', amount: '₹800' },
                  { head: 'Computer & Lab Fee', freq: 'Monthly', amount: '₹300' },
                  { head: 'Library & Sports', freq: 'Yearly', amount: '₹600' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.feeHeadRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.feeHeadTitle, { color: colors.textPrimary }]}>{item.head}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Frequency: {item.freq}</Text>
                    </View>
                    <Text style={styles.feeHeadAmount}>{item.amount}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* ======================================================== */}
          {/* TAB 5: BULK STUDENT UPLOAD GUIDELINES                      */}
          {/* ======================================================== */}
          {activeTab === 'bulk' && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.actionToolbar}>
                <View>
                  <Text style={[styles.toolbarTitle, { color: colors.textPrimary }]}>
                    Batch Student Import Instructions
                  </Text>
                  <Text style={[styles.toolbarSub, { color: colors.textSecondary }]}>
                    Format rules for importing batches from Excel / CSV
                  </Text>
                </View>
              </View>

              <View style={[styles.bulkGuideBox, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
                <Text style={[styles.bulkSubtitle, { color: colors.primary }]}>Required CSV Columns:</Text>
                <Text style={[styles.bulkText, { color: colors.textSecondary }]}>
                  • FirstName, LastName, Gender (Male/Female), DateOfBirth (YYYY-MM-DD)
                  {'\n'}• FatherName, MotherName, EmergencyContact (10-digit mobile)
                  {'\n'}• ClassName, SectionName, RollNo, Address, BloodGroup
                </Text>

                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.bulkSubtitle, { color: colors.primary }]}>Best Practices:</Text>
                  <Text style={[styles.bulkText, { color: colors.textSecondary }]}>
                    1. Ensure mobile numbers are exactly 10 digits without country code.
                    {'\n'}2. Date format must strictly follow YYYY-MM-DD.
                    {'\n'}3. Use standard CSV UTF-8 encoding before uploading to portal.
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* SECTION TRANSFER MODAL DIALOG                             */}
      {/* ======================================================== */}
      <Modal
        visible={transferModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Shift Student Section</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedStudentForTransfer && (
              <View style={styles.modalBody}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Candidate:</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                  {selectedStudentForTransfer.fullName} (Adm #{selectedStudentForTransfer.admissionNo})
                </Text>
                <Text style={{ fontSize: 12, color: '#0284c7', marginTop: 2 }}>
                  Current Section: {selectedStudentForTransfer.sectionName || 'A'}
                </Text>

                <Text style={[styles.modalLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  Select Target Section:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {sections
                    .filter((s) => s.name !== selectedStudentForTransfer.sectionName)
                    .map((sec) => (
                      <TouchableOpacity
                        key={sec.id}
                        style={[
                          styles.secSelectBtn,
                          targetSectionId === sec.id && styles.secSelectBtnActive,
                        ]}
                        onPress={() => setTargetSectionId(sec.id)}
                      >
                        <Text
                          style={[
                            styles.secSelectBtnText,
                            targetSectionId === sec.id && { color: '#ffffff', fontWeight: '800' },
                          ]}
                        >
                          Section {sec.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.modalLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  Reason for Transfer:
                </Text>
                <TextInput
                  style={[
                    styles.reasonInput,
                    { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary },
                  ]}
                  value={transferReason}
                  onChangeText={setTransferReason}
                  placeholder="e.g. Strength balancing / student request"
                  placeholderTextColor="#94a3b8"
                />

                <TouchableOpacity
                  style={[styles.confirmTransferBtn, transferring && { opacity: 0.7 }]}
                  onPress={handleConfirmTransferSection}
                  disabled={transferring}
                >
                  {transferring ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmTransferBtnText}>Confirm & Apply Section Shift</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    tabBar: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    tabBarScroll: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 18,
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: colors.primary,
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
    selectorBar: {
      backgroundColor: colors.cardBg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    barLabelSmall: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    chipRow: {
      gap: 8,
    },
    classChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#cbd5e1',
      backgroundColor: colors.cardBg,
    },
    classChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    classChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    classChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    secChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#94a3b8',
    },
    secChipActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    secChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    secChipTextActive: {
      color: '#ffffff',
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 8,
      fontSize: 13,
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    actionToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    toolbarTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    toolbarSub: {
      fontSize: 11,
      marginTop: 2,
    },
    btnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(2, 132, 199, 0.1)',
      borderWidth: 1,
      borderColor: '#0284c7',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      gap: 5,
    },
    btnSecondaryText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0284c7',
    },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0284c7',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      gap: 5,
    },
    btnPrimaryText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
    },
    studentRowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
    },
    rollIndexCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rollIndexText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    studentCardName: {
      fontSize: 13.5,
      fontWeight: '700',
    },
    studentCardAdm: {
      fontSize: 11,
      marginTop: 2,
    },
    rollInputGroup: {
      alignItems: 'center',
      gap: 4,
    },
    rollNumberInput: {
      width: 44,
      height: 34,
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 8,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '800',
      paddingVertical: 0,
    },
    transferPill: {
      backgroundColor: 'rgba(2, 132, 199, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    transferPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },

    // Studio Sub-Tabs
    subTabHeader: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingTop: 10,
      gap: 8,
    },
    subTabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
      gap: 6,
    },
    subTabBtnActive: {
      backgroundColor: '#0284c7',
    },
    subTabBtnText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    subTabBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    searchAndSelectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      height: 38,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      paddingVertical: 0,
    },
    selectAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectAllText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    printActionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    printMainBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0284c7',
      borderRadius: 12,
      paddingVertical: 11,
      gap: 7,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    printMainBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    shareMainBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#059669',
      borderRadius: 12,
      paddingVertical: 11,
      gap: 7,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    shareMainBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    idChecklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 6,
    },
    previewTag: {
      backgroundColor: '#0284c7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    previewTagText: {
      color: '#ffffff',
      fontSize: 9.5,
      fontWeight: '700',
    },

    // Design tab
    designSectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    previewBoxWrapper: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    liveCardPreview: {
      borderRadius: 16,
      borderWidth: 2,
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    liveHeader: {
      padding: 10,
      alignItems: 'center',
    },
    liveSchoolName: {
      fontSize: 12,
      fontWeight: '800',
      color: '#ffffff',
      textTransform: 'uppercase',
    },
    liveCardSub: {
      fontSize: 8.5,
      color: 'rgba(255,255,255,0.9)',
      marginTop: 2,
    },
    liveBody: {
      padding: 12,
      alignItems: 'center',
    },
    liveAvatar: {
      width: 60,
      height: 72,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: '#cbd5e1',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      marginBottom: 8,
    },
    liveStudentName: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0f172a',
    },
    liveClass: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
      marginTop: 2,
    },
    liveDetailsList: {
      width: '100%',
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
      paddingTop: 6,
      gap: 3,
    },
    liveDetailText: {
      fontSize: 10,
      color: '#334155',
    },
    orientationRow: {
      flexDirection: 'row',
      gap: 12,
    },
    orientationBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderRadius: 12,
      paddingVertical: 12,
      gap: 8,
    },
    orientationBtnActive: {
      borderColor: '#0284c7',
      backgroundColor: 'rgba(2, 132, 199, 0.08)',
    },
    orientationText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    colorRow: {
      flexDirection: 'row',
      gap: 14,
    },
    // Print side selector
    printSideContainer: {
      marginBottom: 10,
    },
    miniBarLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 5,
    },
    printSideRow: {
      flexDirection: 'row',
      gap: 6,
    },
    sidePill: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sidePillActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    sidePillText: {
      fontSize: 11,
      fontWeight: '600',
    },
    sidePillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },

    // Web Template Sync & Preview Styles
    syncBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 14,
    },
    syncStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    syncBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#16a34a',
    },
    syncTitle: {
      fontSize: 12,
      fontWeight: '700',
    },
    syncSub: {
      fontSize: 10,
      marginTop: 2,
    },
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#0284c7',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    syncBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },
    previewSideRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    previewSideBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewSideBtnActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    previewSideBtnText: {
      fontSize: 11.5,
      fontWeight: '600',
    },
    previewSideBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    templateSpecCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginTop: 14,
      marginBottom: 30,
    },
    specTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    specGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    specItem: {
      flex: 1,
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
      alignItems: 'center',
    },
    specLabel: {
      fontSize: 9,
      color: '#94a3b8',
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: 2,
    },
    specVal: {
      fontSize: 11,
      fontWeight: '700',
    },
    specNoticeBox: {
      flexDirection: 'row',
      gap: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#f0f9ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd',
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    specNoticeText: {
      flex: 1,
      fontSize: 10.5,
      lineHeight: 15,
      color: isDark ? '#bae6fd' : '#0369a1',
    },
    printFromPreviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#0284c7',
      paddingVertical: 10,
      borderRadius: 10,
    },
    printFromPreviewText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    shareFromPreviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#16a34a',
      paddingVertical: 10,
      borderRadius: 10,
    },
    shareFromPreviewText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },

    // Fee structure tab
    feeCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
    },
    feeHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(148, 163, 184, 0.2)',
    },
    feeHeadTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    feeHeadAmount: {
      fontSize: 14,
      fontWeight: '800',
      color: '#10b981',
    },

    // Bulk Guide
    bulkGuideBox: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
    },
    bulkSubtitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
    },
    bulkText: {
      fontSize: 12,
      lineHeight: 1.6,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 20,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(148, 163, 184, 0.2)',
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    modalBody: {
      padding: 16,
    },
    modalLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    secSelectBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#cbd5e1',
    },
    secSelectBtnActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    secSelectBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    reasonInput: {
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      marginTop: 6,
    },
    confirmTransferBtn: {
      backgroundColor: '#0284c7',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
    },
    confirmTransferBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
  });
