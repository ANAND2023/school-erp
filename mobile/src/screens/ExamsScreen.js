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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examsApi, classApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';

export default function ExamsScreen() {
  const { isDark, colors } = useTheme();
  const { hasPermission, isSuperAdmin } = usePermission();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canEnterMarks = isSuperAdmin || hasPermission('MarksEntry', 'Add') || hasPermission('MarksEntry', 'Edit');

  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'marks'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Exams & Schedules
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Marks Entry State
  const [classes, setClasses] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(1);
  const [marksSheet, setMarksSheet] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({}); // { [studentId]: { marks: '85', isAbsent: false } }
  const [savingMarks, setSavingMarks] = useState(false);
  const [loadingMarksSheet, setLoadingMarksSheet] = useState(false);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [examsRes, classesRes] = await Promise.all([
        examsApi.getExams().catch(() => ({ data: [] })),
        classApi.getClasses().catch(() => ({ data: [] })),
      ]);

      const examList = examsRes.data?.data || examsRes.data || [];
      const validExams = Array.isArray(examList) ? examList : [];
      setExams(validExams);

      if (validExams.length > 0) {
        setSelectedExamId(validExams[0].id);
        fetchExamSchedules(validExams[0].id);
      }

      const clsList = classesRes.data?.data || classesRes.data || [];
      const validClasses = Array.isArray(clsList) ? clsList : [];
      setClasses(validClasses);

      if (validClasses.length > 0 && validClasses[0].sections?.length > 0) {
        setSelectedSectionId(validClasses[0].sections[0].id);
      }
    } catch (err) {
      console.warn('Error loading exam data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchExamSchedules = async (examId) => {
    if (!examId) return;
    try {
      setLoadingSchedules(true);
      const res = await examsApi.getSchedules(examId);
      const list = res.data?.data || res.data || [];
      const validList = Array.isArray(list) ? list : [];
      setSchedules(validList);
      if (validList.length > 0) {
        setSelectedScheduleId(validList[0].id);
      }
    } catch (err) {
      console.warn('Error loading schedules:', err);
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectExam = (id) => {
    setSelectedExamId(id);
    fetchExamSchedules(id);
  };

  // Load Marks Entry Sheet from API
  const handleLoadMarksSheet = async () => {
    if (!selectedScheduleId || !selectedSectionId) {
      Alert.alert('Notice', 'Please select an Exam Schedule and Section.');
      return;
    }

    try {
      setLoadingMarksSheet(true);
      const res = await examsApi.getMarksForEntry(selectedScheduleId, selectedSectionId);
      if (res.data?.success && res.data?.data) {
        const sheet = res.data.data;
        setMarksSheet(sheet);
        const stList = sheet.students || [];
        setStudents(stList);

        const initialMap = {};
        stList.forEach((st) => {
          initialMap[st.studentId] = {
            marks: st.marksObtained !== null && st.marksObtained !== undefined ? String(st.marksObtained) : '',
            isAbsent: st.isAbsent || false,
          };
        });
        setMarksData(initialMap);
      } else {
        Alert.alert('Notice', res.data?.message || 'Could not load marks sheet.');
        setStudents([]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to load marks sheet for this schedule.';
      Alert.alert('Notice', msg);
      setStudents([]);
    } finally {
      setLoadingMarksSheet(false);
    }
  };

  const updateStudentMark = (studentId, val) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: val,
      },
    }));
  };

  const toggleStudentAbsent = (studentId) => {
    setMarksData((prev) => {
      const current = prev[studentId] || { marks: '', isAbsent: false };
      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent: !current.isAbsent,
          marks: !current.isAbsent ? '0' : current.marks,
        },
      };
    });
  };

  const handleSaveMarks = async () => {
    if (!selectedScheduleId || students.length === 0) {
      Alert.alert('Notice', 'No student marks to save.');
      return;
    }

    try {
      setSavingMarks(true);
      const entries = students.map((st) => {
        const item = marksData[st.studentId] || { marks: '', isAbsent: false };
        const parsed = parseFloat(item.marks || '0');
        return {
          studentId: st.studentId,
          marksObtained: item.isAbsent ? null : isNaN(parsed) ? 0 : parsed,
          isAbsent: item.isAbsent,
          remarks: item.isAbsent ? 'Absent' : 'Entered via Mobile App',
        };
      });

      const payload = {
        scheduleId: Number(selectedScheduleId),
        entries: entries,
      };

      const res = await examsApi.saveMarksBulk(payload);
      if (res.data?.success) {
        Alert.alert('Success! 🎉', 'Marks recorded and saved successfully!');
      } else {
        Alert.alert('Failed', res.data?.message || 'Unable to save marks.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save marks.';
      Alert.alert('Error', msg);
    } finally {
      setSavingMarks(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'schedules' && styles.tabBtnActive]}
          onPress={() => setActiveTab('schedules')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === 'schedules' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'schedules' && styles.tabBtnTextActive]}>
            Exam Schedules
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'marks' && styles.tabBtnActive]}
          onPress={() => setActiveTab('marks')}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={activeTab === 'marks' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'marks' && styles.tabBtnTextActive]}>
            Marks Entry
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: EXAM SCHEDULES */}
      {activeTab === 'schedules' && (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadInitialData();
              }}
              colors={['#0284c7']}
            />
          }
        >
          {/* Exam Picker Chips */}
          <Text style={styles.sectionHeading}>Select Examination</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            {exams.length === 0 ? (
              <View style={styles.noExamsNotice}>
                <Text style={styles.noExamsNoticeText}>No examinations registered yet.</Text>
              </View>
            ) : (
              exams.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.examChip, selectedExamId === ex.id && styles.examChipActive]}
                  onPress={() => handleSelectExam(ex.id)}
                >
                  <Text style={[styles.examChipText, selectedExamId === ex.id && styles.examChipTextActive]}>
                    {ex.name || ex.title}
                  </Text>
                  {ex.termName ? (
                    <Text style={[styles.termSub, selectedExamId === ex.id && { color: '#e0f2fe' }]}>
                      {ex.termName}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Schedule List */}
          <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Timetable & Schedule</Text>
          {loadingSchedules ? (
            <ActivityIndicator color="#0284c7" style={{ marginVertical: 20 }} />
          ) : schedules.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={38} color="#94a3b8" />
              <Text style={styles.emptyCardTitle}>No Schedules Posted</Text>
              <Text style={styles.emptyCardSub}>Exam timetable has not been published yet.</Text>
            </View>
          ) : (
            schedules.map((item, idx) => (
              <View key={item.id || idx} style={styles.scheduleCard}>
                <View style={styles.scheduleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleSubject}>{item.subjectName || item.subject?.name || 'Subject'}</Text>
                    <Text style={styles.scheduleClass}>Code: {item.subjectCode || 'GEN'} • Room: {item.roomNo || 'Main Hall'}</Text>
                  </View>
                  <View style={styles.marksBadge}>
                    <Text style={styles.marksBadgeText}>Max: {item.maxMarks || 100} | Pass: {item.passMarks || 33}</Text>
                  </View>
                </View>

                <View style={styles.scheduleDetails}>
                  <View style={styles.scheduleDetailRow}>
                    <Ionicons name="calendar-clear-outline" size={14} color="#64748b" />
                    <Text style={styles.scheduleDetailText}>
                      {item.examDate ? new Date(item.examDate).toLocaleDateString() : 'TBD'}
                    </Text>
                  </View>
                  <View style={styles.scheduleDetailRow}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.scheduleDetailText}>
                      {item.startTime ? `${item.startTime} - ${item.endTime || ''}` : 'Standard Hours'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB 2: MARKS ENTRY */}
      {activeTab === 'marks' && (
        <View style={{ flex: 1 }}>
          {/* Filters Bar */}
          <View style={styles.marksFilterBar}>
            <Text style={styles.filterTitle}>1. Select Exam</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {exams.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.smallFilterChip, selectedExamId === ex.id && styles.smallFilterChipActive]}
                  onPress={() => handleSelectExam(ex.id)}
                >
                  <Text style={[styles.smallFilterChipText, selectedExamId === ex.id && styles.smallFilterChipTextActive]}>
                    {ex.name || ex.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.filterTitle, { marginTop: 6 }]}>2. Select Subject Schedule</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {schedules.map((sc) => (
                <TouchableOpacity
                  key={sc.id}
                  style={[styles.smallFilterChip, selectedScheduleId === sc.id && styles.smallFilterChipActive]}
                  onPress={() => setSelectedScheduleId(sc.id)}
                >
                  <Text style={[styles.smallFilterChipText, selectedScheduleId === sc.id && styles.smallFilterChipTextActive]}>
                    {sc.subjectName || sc.subjectCode} (Max: {sc.maxMarks})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.filterTitle, { marginTop: 6 }]}>3. Select Section</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {classes.flatMap((c) => c.sections || []).map((sec) => (
                <TouchableOpacity
                  key={sec.id}
                  style={[styles.smallFilterChip, selectedSectionId === sec.id && styles.smallFilterChipActive]}
                  onPress={() => setSelectedSectionId(sec.id)}
                >
                  <Text style={[styles.smallFilterChipText, selectedSectionId === sec.id && styles.smallFilterChipTextActive]}>
                    Sec {sec.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.loadStudentsBtn}
              onPress={handleLoadMarksSheet}
            >
              <Ionicons name="people" size={16} color="#ffffff" />
              <Text style={styles.loadStudentsBtnText}>Load Marks Sheet</Text>
            </TouchableOpacity>
          </View>

          {/* Marks Sheet */}
          {loadingMarksSheet ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={{ marginTop: 10, color: '#64748b' }}>Loading Marks Sheet...</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Ready to Enter Marks</Text>
              <Text style={styles.emptySub}>Select Exam, Subject, and Section above, then tap "Load Marks Sheet".</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {marksSheet && (
                <View style={styles.sheetHeaderBanner}>
                  <Text style={styles.sheetBannerText}>
                    Subject: {marksSheet.subjectName} • Max: {marksSheet.maxMarks} • Pass: {marksSheet.passMarks}
                  </Text>
                </View>
              )}

              <FlatList
                data={students}
                keyExtractor={(item) => String(item.studentId)}
                contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
                renderItem={({ item, index }) => {
                  const state = marksData[item.studentId] || { marks: '', isAbsent: false };
                  const roll = item.rollNo || index + 1;
                  return (
                    <View style={styles.markRow}>
                      <View style={styles.rollCircle}>
                        <Text style={styles.rollText}>{roll}</Text>
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 8 }}>
                        <Text style={styles.studentMarkName}>
                          {item.fullName}
                        </Text>
                        <Text style={styles.admissionNo}>Adm: {item.admissionNo || item.studentId}</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.absentBtn, state.isAbsent && styles.absentBtnActive]}
                        onPress={() => toggleStudentAbsent(item.studentId)}
                      >
                        <Text style={[styles.absentBtnText, state.isAbsent && styles.absentBtnTextActive]}>
                          {state.isAbsent ? 'ABSENT' : 'Present'}
                        </Text>
                      </TouchableOpacity>

                      <TextInput
                        style={[styles.markInput, state.isAbsent && styles.markInputDisabled]}
                        placeholder="Marks"
                        keyboardType="numeric"
                        editable={!state.isAbsent}
                        value={state.marks}
                        onChangeText={(val) => updateStudentMark(item.studentId, val)}
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  );
                }}
              />

              {/* Floating Save Button */}
              <View style={styles.saveBottomBar}>
                {canEnterMarks ? (
                  <TouchableOpacity
                    style={[styles.saveAllBtn, savingMarks && { opacity: 0.7 }]}
                    onPress={handleSaveMarks}
                    disabled={savingMarks}
                  >
                    {savingMarks ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={18} color="#ffffff" />
                        <Text style={styles.saveAllBtnText}>Save All Marks ({students.length})</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', width: '100%' }}>
                    <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                      View-only mode: You do not have permission to enter or edit marks.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  examChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  examChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  examChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  examChipTextActive: {
    color: '#ffffff',
  },
  termSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noExamsNotice: {
    padding: 12,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
  },
  noExamsNoticeText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  scheduleCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scheduleClass: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  marksBadge: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  marksBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#0284c7',
  },
  scheduleDetails: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 16,
  },
  scheduleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  marksFilterBar: {
    backgroundColor: colors.cardBg,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  smallFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  smallFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallFilterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  smallFilterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loadStudentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  loadStudentsBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  sheetHeaderBanner: {
    backgroundColor: isDark ? '#082f49' : '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#0369a1' : '#bae6fd',
  },
  sheetBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#38bdf8' : '#0369a1',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
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
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rollCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  studentMarkName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  admissionNo: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  absentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  absentBtnActive: {
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    borderColor: isDark ? '#ef4444' : '#ef4444',
  },
  absentBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  absentBtnTextActive: {
    color: '#dc2626',
    fontWeight: '700',
  },
  markInput: {
    width: 65,
    height: 36,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
  },
  markInputDisabled: {
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    color: colors.textSecondary,
  },
  saveBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBg,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  saveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  saveAllBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
