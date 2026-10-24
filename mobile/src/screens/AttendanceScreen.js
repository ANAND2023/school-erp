import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { classApi, attendanceApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import WhatsAppModal from '../components/WhatsAppModal';

export default function AttendanceScreen() {
  const { user } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState([]);
  const [sheetInfo, setSheetInfo] = useState(null);

  // WhatsApp Absent Alert Dialog
  const [whatsAppModal, setWhatsAppModal] = useState({
    visible: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'attendance',
    moduleTitle: 'Student Absence Alert (WhatsApp)',
    templateData: {},
  });

  const handleOpenAbsentAlert = (student) => {
    if (!student) return;
    const phone = student.guardianMobile || student.emergencyContactNumber || student.mobile || '';
    setWhatsAppModal({
      visible: true,
      recipientName: student.guardianName || student.fullName || student.studentName || 'Parent',
      recipientPhone: phone,
      recipientRole: `Parent of ${student.fullName || student.studentName || 'Student'}`,
      moduleKey: 'attendance',
      moduleTitle: 'Student Absence Alert (WhatsApp)',
      templateData: {
        ParentName: student.guardianName || 'Parent',
        StudentName: student.fullName || student.studentName || 'Student',
        ClassName: selectedClass?.name || 'Class',
        Date: date,
        SchoolName: user?.schoolName || 'School',
      },
    });
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const res = await classApi.getClasses();
      if (res.data?.success && res.data?.data) {
        const clsList = res.data.data;
        setClasses(clsList);
        if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id);
          if (clsList[0].sections && clsList[0].sections.length > 0) {
            setSelectedSectionId(clsList[0].sections[0].id);
          }
        }
      }
    } catch (e) {
      console.warn('Error loading classes:', e);
      Alert.alert('Error', 'Unable to load classes list.');
    } finally {
      setLoadingClasses(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  const loadAttendanceSheet = async (secId = selectedSectionId) => {
    if (!secId) return;
    try {
      setLoadingSheet(true);
      const res = await attendanceApi.getStudentAttendance(secId, date);
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setSheetInfo(data);
        setStudents(data.students || []);
      } else {
        Alert.alert('Notice', res.data?.message || 'Could not load attendance.');
        setStudents([]);
      }
    } catch (e) {
      console.warn('Attendance load error:', e);
      Alert.alert('Notice', e.response?.data?.message || 'Unable to load attendance sheet.');
      setStudents([]);
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    if (selectedSectionId) {
      loadAttendanceSheet(selectedSectionId);
    }
  }, [selectedSectionId, date]);

  const handleClassChange = (cls) => {
    setSelectedClassId(cls.id);
    if (cls.sections && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId(null);
      setStudents([]);
    }
  };

  const handleStatusChange = (studentId, newStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status: newStatus } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 1 })));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSectionId) {
      Alert.alert('Validation', 'Please select class and section.');
      return;
    }
    if (students.length === 0) {
      Alert.alert('Validation', 'No students found in this section.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sectionId: selectedSectionId,
        date,
        attendances: students.map((s) => ({
          studentId: s.studentId,
          enrollmentId: s.enrollmentId || 0,
          status: s.status,
          remarks: s.remarks || null,
        })),
      };

      const res = await attendanceApi.saveStudentAttendanceBulk(payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Attendance saved successfully!');
        loadAttendanceSheet(selectedSectionId);
      } else {
        Alert.alert('Failed', res.data?.message || 'Unable to save attendance.');
      }
    } catch (e) {
      console.warn('Save attendance error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Server error while saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Status map (1: Present, 2: Absent, 3: Late, 4: HalfDay)
  const getStatusBadge = (status) => {
    if (status === 1 || status === 'Present') return { label: 'Present', color: '#10b981', bg: isDark ? '#052e16' : '#ecfdf5' };
    if (status === 2 || status === 'Absent') return { label: 'Absent', color: '#ef4444', bg: isDark ? '#450a0a' : '#fef2f2' };
    if (status === 3 || status === 'Late') return { label: 'Late', color: '#f59e0b', bg: isDark ? '#451a03' : '#fffbeb' };
    if (status === 4 || status === 'HalfDay') return { label: 'Half Day', color: '#6366f1', bg: isDark ? '#1e1b4b' : '#e0e7ff' };
    return { label: 'Present', color: '#10b981', bg: isDark ? '#052e16' : '#ecfdf5' };
  };

  const presentCount = students.filter((s) => s.status === 1 || s.status === 'Present').length;
  const absentCount = students.filter((s) => s.status === 2 || s.status === 'Absent').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Filter Header: Class & Section selector */}
      <View style={styles.topSelectorBox}>
        <Text style={styles.selectorLabel}>Select Class:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classChips}>
          {classes.map((cls) => {
            const active = cls.id === selectedClassId;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classChip, active && styles.classChipActive]}
                onPress={() => handleClassChange(cls)}
              >
                <Text style={[styles.classChipText, active && styles.classChipTextActive]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {sections.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.selectorLabel}>Section:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionChips}>
              {sections.map((sec) => {
                const active = sec.id === selectedSectionId;
                return (
                  <TouchableOpacity
                    key={sec.id}
                    style={[styles.sectionChip, active && styles.sectionChipActive]}
                    onPress={() => setSelectedSectionId(sec.id)}
                  >
                    <Text style={[styles.sectionChipText, active && styles.sectionChipTextActive]}>
                      {sec.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Stats bar & Quick Mark Button */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryTotalText}>Total: {students.length}</Text>
          <Text style={styles.summaryPresentText}>Present: {presentCount}</Text>
          <Text style={styles.summaryAbsentText}>Absent: {absentCount}</Text>
        </View>

        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllPresent}>
          <MaterialIcons name="done-all" size={16} color="#0284c7" />
          <Text style={styles.markAllBtnText}>All Present</Text>
        </TouchableOpacity>
      </View>

      {/* Student List */}
      {loadingSheet ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading attendance sheet...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="people-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Students Enrolled</Text>
          <Text style={styles.emptyDesc}>Select another class or section above.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.studentId)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isP = item.status === 1 || item.status === 'Present';
            const isA = item.status === 2 || item.status === 'Absent';
            const isL = item.status === 5 || item.status === 'Late';
            const isH = item.status === 4 || item.status === 'HalfDay';

            return (
              <View style={styles.studentCard}>
                <View style={styles.studentInfoRow}>
                  <View style={styles.rollBadge}>
                    <Text style={styles.rollBadgeText}>{item.rollNo || index + 1}</Text>
                  </View>
                  <View style={styles.nameMetaCol}>
                    <Text style={styles.studentFullName}>{item.fullName}</Text>
                    <Text style={styles.studentAdmText}>Adm: {item.admissionNo || 'N/A'}</Text>
                  </View>
                </View>

                {/* Status Toggle Buttons */}
                <View style={styles.statusButtonsRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, isP && { backgroundColor: '#10b981', borderColor: '#10b981' }]}
                    onPress={() => handleStatusChange(item.studentId, 1)}
                  >
                    <Text style={[styles.toggleBtnText, isP && styles.toggleBtnTextActive]}>P</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtn, isA && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}
                    onPress={() => handleStatusChange(item.studentId, 2)}
                  >
                    <Text style={[styles.toggleBtnText, isA && styles.toggleBtnTextActive]}>A</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtn, isL && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]}
                    onPress={() => handleStatusChange(item.studentId, 5)}
                  >
                    <Text style={[styles.toggleBtnText, isL && styles.toggleBtnTextActive]}>L</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtn, isH && { backgroundColor: '#6366f1', borderColor: '#6366f1' }]}
                    onPress={() => handleStatusChange(item.studentId, 4)}
                  >
                    <Text style={[styles.toggleBtnText, isH && styles.toggleBtnTextActive]}>HD</Text>
                  </TouchableOpacity>

                  {isA && (item.mobile || item.guardianMobile) ? (
                    <TouchableOpacity
                      style={styles.absentWaBtn}
                      onPress={() => handleOpenAbsentAlert(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Save Button */}
      {students.length > 0 && (
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveAttendance}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.saveBtnContent}>
                <MaterialIcons name="check" size={20} color="#ffffff" />
                <Text style={styles.saveBtnText}>Save Attendance</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* WhatsApp Dialog Modal */}
      <WhatsAppModal
        visible={whatsAppModal.visible}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, visible: false }))}
        recipientName={whatsAppModal.recipientName}
        recipientPhone={whatsAppModal.recipientPhone}
        recipientRole={whatsAppModal.recipientRole}
        moduleKey={whatsAppModal.moduleKey}
        moduleTitle={whatsAppModal.moduleTitle}
        templateData={whatsAppModal.templateData}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topSelectorBox: {
    backgroundColor: colors.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  classChips: {
    gap: 8,
    paddingBottom: 6,
  },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  classChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  classChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  classChipTextActive: {
    color: '#ffffff',
  },
  sectionRow: {
    marginTop: 8,
  },
  sectionChips: {
    gap: 8,
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionChipActive: {
    backgroundColor: isDark ? '#0f766e' : '#0f766e',
    borderColor: isDark ? '#14b8a6' : '#0f766e',
  },
  sectionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionChipTextActive: {
    color: '#ffffff',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryTotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryPresentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  summaryAbsentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 4,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 10,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  rollBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rollBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#0284c7',
  },
  nameMetaCol: {
    flex: 1,
  },
  studentFullName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  studentAdmText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  absentWaBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBg,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
