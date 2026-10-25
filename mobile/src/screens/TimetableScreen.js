import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { classApi, timetableApi, teacherAllocationApi, staffApi, subjectApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_MAP = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const INDEX_TO_DAY = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export default function TimetableScreen({ route }) {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const initialMode = route?.params?.tab || 'class';
  const [timetableMode, setTimetableMode] = useState(
    ['teacher', 'allocation', 'substitution'].includes(initialMode) ? initialMode : 'class'
  );

  // Common Masters
  const [classes, setClasses] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  // Class Timetable states
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetablePeriods, setTimetablePeriods] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [refreshingTimetable, setRefreshingTimetable] = useState(false);

  // Slot Edit Modal state
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [editingSlotData, setEditingSlotData] = useState(null);
  const [selectedSlotSubjectId, setSelectedSlotSubjectId] = useState('');
  const [selectedSlotTeacherId, setSelectedSlotTeacherId] = useState('');
  const [selectedSlotRoomNo, setSelectedSlotRoomNo] = useState('');
  const [savingSlot, setSavingSlot] = useState(false);

  // Teacher Timetable states
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [teacherTimetableSlots, setTeacherTimetableSlots] = useState([]);
  const [loadingTeacherTimetable, setLoadingTeacherTimetable] = useState(false);

  // Teacher Allocation states
  const [allocSubTab, setAllocSubTab] = useState('class'); // 'class' or 'subject'
  const [allocClassId, setAllocClassId] = useState(null);
  const [allocSearch, setAllocSearch] = useState('');
  const [allocOnlyUnassigned, setAllocOnlyUnassigned] = useState(false);
  const [classTeachers, setClassTeachers] = useState([]);
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [loadingAlloc, setLoadingAlloc] = useState(false);
  const [refreshingAlloc, setRefreshingAlloc] = useState(false);

  // Allocation Picker Modal states
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [selectedAllocRow, setSelectedAllocRow] = useState(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [savingAlloc, setSavingAlloc] = useState(false);

  // Load Classes, Staff & Subjects once
  useEffect(() => {
    loadInitialMasters();
  }, []);

  const loadInitialMasters = async () => {
    try {
      const [clsRes, staffRes, subRes] = await Promise.all([
        classApi.getClasses().catch(() => ({ data: { data: [] } })),
        staffApi.getEmployees({ pageSize: 250, status: 1 }).catch(() => ({ data: { data: { items: [] } } })),
        classApi.getSubjects().catch(() => ({ data: { data: [] } })),
      ]);

      if (clsRes.data?.success && clsRes.data?.data) {
        const clsList = clsRes.data.data;
        setClasses(clsList);
        if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id);
          if (clsList[0].sections && clsList[0].sections.length > 0) {
            setSelectedSectionId(clsList[0].sections[0].id);
          }
        }
      }

      const staffList = staffRes.data?.data?.items || staffRes.data?.data || [];
      setAllStaff(staffList);
      if (staffList.length > 0) {
        setSelectedTeacherId(staffList[0].id);
      }

      const subs = subRes.data?.data || [];
      setAllSubjects(subs);
    } catch (e) {
      console.warn('Initial masters load error:', e);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  // -------------------------------------------------------------
  // Class Timetable Loading & Handlers
  // -------------------------------------------------------------
  const loadTimetable = useCallback(async (secId = selectedSectionId, isRefresh = false) => {
    if (!secId) return;
    try {
      if (isRefresh) {
        setRefreshingTimetable(true);
      } else {
        setLoadingTimetable(true);
      }
      const res = await timetableApi.getSectionTimetable(secId);
      if (res.data?.success && res.data?.data) {
        setTimetablePeriods(res.data.data.periods || []);
        setTimetableSlots(res.data.data.slots || []);
      } else {
        setTimetablePeriods([]);
        setTimetableSlots([]);
      }
    } catch (e) {
      console.warn('Timetable error:', e);
      setTimetablePeriods([]);
      setTimetableSlots([]);
    } finally {
      setLoadingTimetable(false);
      setRefreshingTimetable(false);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (timetableMode === 'class' && selectedSectionId) {
      loadTimetable(selectedSectionId);
    }
  }, [selectedSectionId, timetableMode, loadTimetable]);

  const handleClassChange = (cls) => {
    setSelectedClassId(cls.id);
    if (cls.sections && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId(null);
      setTimetablePeriods([]);
      setTimetableSlots([]);
    }
  };

  // Safe day filtering for Class Timetable
  const selectedDayNum = DAY_MAP[selectedDay.toLowerCase()] || 1;

  const daySlots = useMemo(() => {
    if (timetablePeriods && timetablePeriods.length > 0) {
      const sortedPeriods = [...timetablePeriods].sort(
        (a, b) => (a.displayOrder || a.periodNumber || 0) - (b.displayOrder || b.periodNumber || 0)
      );

      return sortedPeriods.map((period, idx) => {
        const slot = timetableSlots.find((s) => {
          const slotDay =
            typeof s.dayOfWeek === 'number'
              ? s.dayOfWeek
              : (DAY_MAP[String(s.dayOfWeek || s.day || '').toLowerCase()] || 0);
          return slotDay === selectedDayNum && s.periodId === period.id;
        });

        const isBreak = period.isBreak || slot?.isBreak || false;
        const isAssigned = Boolean(slot && slot.subjectId);

        return {
          id: slot?.id || null,
          slotId: slot?.id || null,
          periodId: period.id,
          periodNumber: period.periodNumber || idx + 1,
          periodName: period.name || `Period ${idx + 1}`,
          startTime: (period.startTime || '09:00').substring(0, 5),
          endTime: (period.endTime || '09:45').substring(0, 5),
          isBreak: isBreak,
          subjectId: slot?.subjectId || null,
          subjectName: slot?.subjectName || (isBreak ? 'Break / Recess' : 'Not Assigned'),
          employeeId: slot?.employeeId || null,
          teacherName: slot?.employeeName || slot?.teacherName || (isBreak ? 'Recess' : 'Unassigned'),
          roomNo: slot?.roomNo || '',
          isAssigned: isAssigned,
        };
      });
    }

    // Fallback if no periods defined
    const filtered = timetableSlots.filter((s) => {
      const slotDay =
        typeof s.dayOfWeek === 'number'
          ? s.dayOfWeek
          : (DAY_MAP[String(s.dayOfWeek || s.day || '').toLowerCase()] || 0);
      return slotDay === selectedDayNum;
    });

    if (filtered.length > 0) {
      return filtered.map((s, idx) => ({
        id: s.id || null,
        slotId: s.id || null,
        periodId: s.periodId || idx + 1,
        periodNumber: s.periodNumber || idx + 1,
        periodName: s.periodName || `Period ${s.periodNumber || idx + 1}`,
        startTime: (s.startTime || '09:00').substring(0, 5),
        endTime: (s.endTime || '09:45').substring(0, 5),
        isBreak: Boolean(s.isBreak),
        subjectId: s.subjectId || null,
        subjectName: s.subjectName || (s.isBreak ? 'Break / Recess' : 'Not Assigned'),
        employeeId: s.employeeId || null,
        teacherName: s.employeeName || s.teacherName || (s.isBreak ? 'Recess' : 'Unassigned'),
        roomNo: s.roomNo || '',
        isAssigned: Boolean(s.subjectId),
      }));
    }

    return [
      { periodName: 'Period 1', startTime: '08:30', endTime: '09:15', subjectName: 'English Core', teacherName: 'Pooja Verma', roomNo: 'Room 101', isAssigned: true },
      { periodName: 'Period 2', startTime: '09:15', endTime: '10:00', subjectName: 'Mathematics', teacherName: 'Vicky Kumar', roomNo: 'Room 101', isAssigned: true },
      { periodName: 'Period 3', startTime: '10:00', endTime: '10:45', subjectName: 'Science / EVS', teacherName: 'Dr. S. K. Sharma', roomNo: 'Lab 2', isAssigned: true },
      { periodName: 'Recess', startTime: '10:45', endTime: '11:15', subjectName: 'Break / Recess', teacherName: 'Campus Ground', roomNo: 'Campus', isBreak: true },
      { periodName: 'Period 4', startTime: '11:15', endTime: '12:00', subjectName: 'Hindi Literature', teacherName: 'Sunita Devi', roomNo: 'Room 101', isAssigned: true },
      { periodName: 'Period 5', startTime: '12:00', endTime: '12:45', subjectName: 'Social Studies', teacherName: 'Pooja Verma', roomNo: 'Room 101', isAssigned: true },
      { periodName: 'Period 6', startTime: '12:45', endTime: '01:30', subjectName: 'Computer Science', teacherName: 'Shibu Jaiswal', roomNo: 'IT Lab', isAssigned: true },
    ];
  }, [timetablePeriods, timetableSlots, selectedDayNum]);

  // Open Slot Edit Dialog
  const handleOpenEditSlot = (slotItem) => {
    if (slotItem.isBreak) return;
    setEditingSlotData(slotItem);
    setSelectedSlotSubjectId(slotItem.subjectId ? String(slotItem.subjectId) : '');
    setSelectedSlotTeacherId(slotItem.employeeId ? String(slotItem.employeeId) : '');
    setSelectedSlotRoomNo(slotItem.roomNo || '');
    setSlotModalVisible(true);
  };

  const handleSaveSlot = async () => {
    if (!editingSlotData || !selectedSectionId) return;
    try {
      setSavingSlot(true);
      const payload = {
        sectionId: selectedSectionId,
        dayOfWeek: selectedDayNum,
        periodId: editingSlotData.periodId,
        subjectId: selectedSlotSubjectId ? Number(selectedSlotSubjectId) : null,
        employeeId: selectedSlotTeacherId ? Number(selectedSlotTeacherId) : null,
        roomNo: selectedSlotRoomNo ? selectedSlotRoomNo.trim() : null,
      };

      const res = await timetableApi.saveSlot(payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Timetable period slot updated successfully.');
        setSlotModalVisible(false);
        loadTimetable(selectedSectionId);
      }
    } catch (e) {
      console.warn('Save slot error:', e);
      const msg = e.response?.data?.message || 'Failed to save timetable slot.';
      Alert.alert('Error', msg);
    } finally {
      setSavingSlot(false);
    }
  };

  const handleClearSlot = async () => {
    if (!editingSlotData) return;
    try {
      setSavingSlot(true);
      if (editingSlotData.slotId) {
        await timetableApi.deleteSlot(editingSlotData.slotId);
      } else {
        const payload = {
          sectionId: selectedSectionId,
          dayOfWeek: selectedDayNum,
          periodId: editingSlotData.periodId,
          subjectId: null,
          employeeId: null,
          roomNo: null,
        };
        await timetableApi.saveSlot(payload);
      }
      Alert.alert('Success', 'Period slot cleared.');
      setSlotModalVisible(false);
      loadTimetable(selectedSectionId);
    } catch (e) {
      console.warn('Clear slot error:', e);
      Alert.alert('Error', 'Failed to clear slot.');
    } finally {
      setSavingSlot(false);
    }
  };

  // -------------------------------------------------------------
  // Teacher Timetable Loading & Handlers
  // -------------------------------------------------------------
  const loadTeacherTimetable = useCallback(async (empId = selectedTeacherId) => {
    if (!empId) return;
    try {
      setLoadingTeacherTimetable(true);
      const res = await timetableApi.getTeacherTimetable(empId);
      if (res.data?.success && res.data?.data) {
        setTeacherTimetableSlots(res.data.data.slots || []);
      } else {
        setTeacherTimetableSlots([]);
      }
    } catch (e) {
      console.warn('Teacher timetable error:', e);
      setTeacherTimetableSlots([]);
    } finally {
      setLoadingTeacherTimetable(false);
    }
  }, [selectedTeacherId]);

  useEffect(() => {
    if (timetableMode === 'teacher' && selectedTeacherId) {
      loadTeacherTimetable(selectedTeacherId);
    }
  }, [selectedTeacherId, timetableMode, loadTeacherTimetable]);

  const teacherDaySlots = useMemo(() => {
    return teacherTimetableSlots.filter((s) => {
      const slotDay =
        typeof s.dayOfWeek === 'number'
          ? s.dayOfWeek
          : (DAY_MAP[String(s.dayOfWeek || s.day || '').toLowerCase()] || 0);
      return slotDay === selectedDayNum;
    });
  }, [teacherTimetableSlots, selectedDayNum]);

  // -------------------------------------------------------------
  // Teacher Allocation Data Loading & Handlers
  // -------------------------------------------------------------
  const loadAllocations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingAlloc(true);
      } else {
        setLoadingAlloc(true);
      }

      const [ctRes, stRes, staffRes] = await Promise.all([
        teacherAllocationApi.getClassTeachers(),
        teacherAllocationApi.getSubjectTeachers(),
        staffApi.getEmployees({ pageSize: 250, status: 1 }).catch(() => ({ data: { data: { items: [] } } })),
      ]);

      if (ctRes.data?.success && ctRes.data?.data) {
        setClassTeachers(ctRes.data.data);
      }
      if (stRes.data?.success && stRes.data?.data) {
        setSubjectTeachers(stRes.data.data);
      }
      const staffList = staffRes.data?.data?.items || staffRes.data?.data || [];
      setAllStaff(staffList);
    } catch (err) {
      console.warn('Failed to load allocations:', err);
      Alert.alert('Error', 'Failed to load teacher allocations. Please check server connection.');
    } finally {
      setLoadingAlloc(false);
      setRefreshingAlloc(false);
    }
  }, []);

  useEffect(() => {
    if (timetableMode === 'allocation') {
      loadAllocations();
    }
  }, [timetableMode, loadAllocations]);

  const handleOpenPicker = (row) => {
    setSelectedAllocRow(row);
    setStaffSearch('');
    setPickerModalVisible(true);
  };

  const handleSaveTeacher = async (staffMember) => {
    if (!selectedAllocRow) return;
    const isUnassign = !staffMember;
    const employeeId = isUnassign ? null : staffMember.id;

    try {
      setSavingAlloc(true);
      if (allocSubTab === 'class') {
        const payload = {
          classId: selectedAllocRow.classId,
          sectionId: selectedAllocRow.sectionId,
          employeeId: employeeId,
        };
        const res = await teacherAllocationApi.saveClassTeacher(payload);
        if (res.data?.success) {
          Alert.alert('Success', isUnassign ? 'Class teacher unassigned.' : `Assigned ${staffMember.fullName} as Class Teacher.`);
        }
      } else {
        const payload = {
          classId: selectedAllocRow.classId,
          sectionId: selectedAllocRow.sectionId,
          subjectId: selectedAllocRow.subjectId,
          employeeId: employeeId,
        };
        const res = await teacherAllocationApi.saveSubjectTeacher(payload);
        if (res.data?.success) {
          Alert.alert('Success', isUnassign ? 'Subject teacher unassigned.' : `Assigned ${staffMember.fullName} as Subject Teacher.`);
        }
      }

      setPickerModalVisible(false);
      setSelectedAllocRow(null);
      await loadAllocations();
    } catch (e) {
      console.warn('Save allocation error:', e);
      const msg = e.response?.data?.message || 'Failed to save allocation.';
      Alert.alert('Error', msg);
    } finally {
      setSavingAlloc(false);
    }
  };

  // Filtered Allocations
  const filteredClassTeachers = useMemo(() => {
    return classTeachers.filter((row) => {
      if (allocClassId && row.classId !== allocClassId) return false;
      if (allocOnlyUnassigned && (row.employeeId || row.teacherName || row.employeeName)) return false;
      if (!allocSearch.trim()) return true;
      const term = allocSearch.toLowerCase().trim();
      const matchClass = (row.className || '').toLowerCase().includes(term);
      const matchSection = (row.sectionName || '').toLowerCase().includes(term);
      const teacher = (row.teacherName || row.employeeName || '').toLowerCase();
      const code = (row.teacherCode || row.employeeCode || '').toLowerCase();
      return matchClass || matchSection || teacher.includes(term) || code.includes(term);
    });
  }, [classTeachers, allocClassId, allocOnlyUnassigned, allocSearch]);

  const filteredSubjectTeachers = useMemo(() => {
    return subjectTeachers.filter((row) => {
      if (allocClassId && row.classId !== allocClassId) return false;
      if (allocOnlyUnassigned && (row.employeeId || row.teacherName || row.employeeName)) return false;
      if (!allocSearch.trim()) return true;
      const term = allocSearch.toLowerCase().trim();
      const matchClass = (row.className || '').toLowerCase().includes(term);
      const matchSection = (row.sectionName || '').toLowerCase().includes(term);
      const matchSub = (row.subjectName || '').toLowerCase().includes(term) || (row.subjectCode || '').toLowerCase().includes(term);
      const teacher = (row.teacherName || row.employeeName || '').toLowerCase();
      const code = (row.teacherCode || row.employeeCode || '').toLowerCase();
      return matchClass || matchSection || matchSub || teacher.includes(term) || code.includes(term);
    });
  }, [subjectTeachers, allocClassId, allocOnlyUnassigned, allocSearch]);

  const classKpi = useMemo(() => {
    const total = classTeachers.length;
    const assigned = classTeachers.filter((r) => Boolean(r.employeeId || r.teacherName || r.employeeName)).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [classTeachers]);

  const subjectKpi = useMemo(() => {
    const total = subjectTeachers.length;
    const assigned = subjectTeachers.filter((r) => Boolean(r.employeeId || r.teacherName || r.employeeName)).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [subjectTeachers]);

  const filteredStaffList = useMemo(() => {
    if (!staffSearch.trim()) return allStaff;
    const term = staffSearch.toLowerCase().trim();
    return allStaff.filter((s) => {
      const name = (s.fullName || s.name || '').toLowerCase();
      const code = (s.employeeCode || s.code || '').toLowerCase();
      const desig = (s.designationName || '').toLowerCase();
      const dept = (s.departmentName || '').toLowerCase();
      return name.includes(term) || code.includes(term) || desig.includes(term) || dept.includes(term);
    });
  }, [allStaff, staffSearch]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Module Subtabs */}
      <View style={{ backgroundColor: colors.cardBg, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {[
            { key: 'class', label: 'Class Timetable', icon: 'schedule' },
            { key: 'teacher', label: 'Teacher Timetable', icon: 'person' },
            { key: 'allocation', label: 'Teacher Allocation', icon: 'assignment-ind' },
            { key: 'substitution', label: 'Substitutions', icon: 'swap-horiz' },
          ].map((t) => {
            const active = timetableMode === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 16,
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                  },
                  active && { backgroundColor: '#0284c7' },
                ]}
                onPress={() => setTimetableMode(t.key)}
              >
                <MaterialIcons name={t.icon} size={15} color={active ? '#ffffff' : colors.textSecondary} />
                <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }, active && { color: '#ffffff', fontWeight: '700' }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* =========================================================================
          MODE 1: CLASS TIMETABLE VIEW
         ========================================================================= */}
      {timetableMode === 'class' && (
        <View style={{ flex: 1 }}>
          {/* Class & Section Selector Bar */}
          <View style={styles.topSelectorBox}>
            <Text style={styles.selectorLabel}>Class & Section:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsRow, { marginTop: 8 }]}>
                {sections.map((sec) => {
                  const active = sec.id === selectedSectionId;
                  return (
                    <TouchableOpacity
                      key={sec.id}
                      style={[styles.secChip, active && styles.secChipActive]}
                      onPress={() => setSelectedSectionId(sec.id)}
                    >
                      <Text style={[styles.secChipText, active && styles.secChipTextActive]}>
                        Sec: {sec.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Day Tabs */}
          <View style={styles.daysTabBox}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
              {DAYS.map((d) => {
                const active = selectedDay === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayTab, active && styles.dayTabActive]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Schedule Status Header Banner */}
          <View style={styles.scheduleInfoBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="event-note" size={16} color="#0284c7" />
              <Text style={styles.scheduleInfoText}>
                {selectedClass?.name || 'Class'} - Section {sections.find((s) => s.id === selectedSectionId)?.name || 'A'} • {selectedDay}
              </Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>
              {daySlots.filter((s) => s.isAssigned).length} of {daySlots.filter((s) => !s.isBreak).length} Periods Mapped
            </Text>
          </View>

          {/* Period Slots List */}
          {loadingTimetable && !refreshingTimetable ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loadingText}>Loading class schedule...</Text>
            </View>
          ) : daySlots.length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialIcons name="event-busy" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
              <Text style={styles.emptyDesc}>No period slots mapped for {selectedDay}.</Text>
            </View>
          ) : (
            <FlatList
              data={daySlots}
              keyExtractor={(item, i) => String(item.id || item.periodId || i)}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshingTimetable} onRefresh={() => loadTimetable(selectedSectionId, true)} colors={['#0284c7']} />
              }
              renderItem={({ item, index }) => {
                const isBreak = item.isBreak;
                const isAssigned = item.isAssigned;

                return (
                  <TouchableOpacity
                    activeOpacity={isBreak ? 1 : 0.75}
                    style={[
                      styles.slotCard,
                      isBreak && { backgroundColor: isDark ? '#451a0320' : '#fffbeb', borderColor: '#fde68a' },
                      isAssigned && !isBreak && { borderLeftColor: '#10b981', borderLeftWidth: 4 },
                      !isAssigned && !isBreak && { borderLeftColor: '#f59e0b', borderLeftWidth: 4 },
                    ]}
                    onPress={() => !isBreak && handleOpenEditSlot(item)}
                  >
                    <View style={styles.periodCol}>
                      <Text style={[styles.periodName, isBreak && { color: '#d97706' }]}>
                        {item.periodName || `Period ${index + 1}`}
                      </Text>
                      <Text style={styles.periodTime}>
                        {item.startTime} - {item.endTime}
                      </Text>
                      {isBreak && (
                        <View style={styles.breakPill}>
                          <Text style={styles.breakPillText}>RECESS</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.subjectCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text
                          style={[
                            styles.subjectName,
                            isBreak && { color: '#b45309' },
                            !isAssigned && !isBreak && { color: colors.textSecondary, fontStyle: 'italic' },
                          ]}
                        >
                          {item.subjectName}
                        </Text>
                        {!isBreak && (
                          <View
                            style={[
                              styles.miniStatusChip,
                              { backgroundColor: isAssigned ? '#ecfdf5' : '#fffbeb' },
                            ]}
                          >
                            <Text style={[styles.miniStatusChipText, { color: isAssigned ? '#059669' : '#d97706' }]}>
                              {isAssigned ? 'Assigned' : 'Unassigned'}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <MaterialIcons
                          name={isBreak ? 'restaurant' : 'person'}
                          size={13}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.teacherName,
                            !isAssigned && !isBreak && { fontStyle: 'italic' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.teacherName}
                        </Text>
                      </View>

                      {item.roomNo ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <MaterialIcons name="meeting-room" size={12} color={colors.textSecondary} />
                          <Text style={styles.roomNo}>Room: {item.roomNo}</Text>
                        </View>
                      ) : null}
                    </View>

                    {!isBreak && (
                      <MaterialIcons name="edit" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* EDIT PERIOD SLOT MODAL */}
          <Modal
            visible={slotModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSlotModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Assign Period Slot</Text>
                    {editingSlotData && (
                      <Text style={styles.modalSubtitle}>
                        {editingSlotData.periodName} ({editingSlotData.startTime} - {editingSlotData.endTime}) • {selectedDay}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setSlotModalVisible(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                  {/* Subject Picker */}
                  <Text style={styles.inputLabel}>Subject:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[styles.pickerChip, selectedSlotSubjectId === '' && styles.pickerChipActive]}
                      onPress={() => setSelectedSlotSubjectId('')}
                    >
                      <Text style={[styles.pickerChipText, selectedSlotSubjectId === '' && styles.pickerChipTextActive]}>
                        -- None / Free --
                      </Text>
                    </TouchableOpacity>
                    {allSubjects.map((sub) => {
                      const active = String(sub.id) === selectedSlotSubjectId;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          style={[styles.pickerChip, active && styles.pickerChipActive]}
                          onPress={() => setSelectedSlotSubjectId(String(sub.id))}
                        >
                          <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>
                            {sub.name} ({sub.code || 'SUB'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Teacher Picker */}
                  <Text style={styles.inputLabel}>Teacher / Instructor:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={[styles.pickerChip, selectedSlotTeacherId === '' && styles.pickerChipActive]}
                      onPress={() => setSelectedSlotTeacherId('')}
                    >
                      <Text style={[styles.pickerChipText, selectedSlotTeacherId === '' && styles.pickerChipTextActive]}>
                        -- Unassigned --
                      </Text>
                    </TouchableOpacity>
                    {allStaff.map((t) => {
                      const active = String(t.id) === selectedSlotTeacherId;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.pickerChip, active && styles.pickerChipActive]}
                          onPress={() => setSelectedSlotTeacherId(String(t.id))}
                        >
                          <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>
                            {t.fullName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Room No Input */}
                  <Text style={styles.inputLabel}>Room / Lab Number:</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                    placeholder="e.g. Room 101, Lab 2"
                    placeholderTextColor={colors.textSecondary}
                    value={selectedSlotRoomNo}
                    onChangeText={setSelectedSlotRoomNo}
                  />

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 28 }}>
                    {editingSlotData?.isAssigned && (
                      <TouchableOpacity
                        style={[styles.btnSecondary, { flex: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}
                        onPress={handleClearSlot}
                        disabled={savingSlot}
                      >
                        <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>Clear Slot</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.btnPrimary, { flex: 2 }]}
                      onPress={handleSaveSlot}
                      disabled={savingSlot}
                    >
                      {savingSlot ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <MaterialIcons name="check" size={16} color="#ffffff" />
                          <Text style={styles.btnPrimaryText}>Save Schedule</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* =========================================================================
          MODE 2: TEACHER TIMETABLE VIEW
         ========================================================================= */}
      {timetableMode === 'teacher' && (
        <View style={{ flex: 1 }}>
          {/* Teacher Selector Bar */}
          <View style={styles.topSelectorBox}>
            <Text style={styles.selectorLabel}>Select Faculty / Teacher:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {allStaff.map((t) => {
                const active = t.id === selectedTeacherId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.classChip, active && styles.classChipActive]}
                    onPress={() => setSelectedTeacherId(t.id)}
                  >
                    <Text style={[styles.classChipText, active && styles.classChipTextActive]}>
                      {t.fullName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Day Tabs */}
          <View style={styles.daysTabBox}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
              {DAYS.map((d) => {
                const active = selectedDay === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayTab, active && styles.dayTabActive]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Teacher Slots List */}
          {loadingTeacherTimetable ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loadingText}>Loading teacher schedule...</Text>
            </View>
          ) : teacherDaySlots.length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialIcons name="free-breakfast" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Free / No Classes</Text>
              <Text style={styles.emptyDesc}>This faculty has no teaching periods scheduled on {selectedDay}.</Text>
            </View>
          ) : (
            <FlatList
              data={teacherDaySlots}
              keyExtractor={(item, i) => String(item.id || i)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={[styles.slotCard, { borderLeftColor: '#0284c7', borderLeftWidth: 4 }]}>
                  <View style={styles.periodCol}>
                    <Text style={styles.periodName}>{item.periodName || 'Period'}</Text>
                    <Text style={styles.periodTime}>{item.timeRange || '09:00 - 09:45'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.subjectCol}>
                    <Text style={styles.subjectName}>{item.subjectName || 'Subject'}</Text>
                    <Text style={styles.teacherName}>
                      {item.className} - Section {item.sectionName}
                    </Text>
                    {item.roomNo ? <Text style={styles.roomNo}>Room: {item.roomNo}</Text> : null}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* =========================================================================
          MODE 3: TEACHER ALLOCATION VIEW
         ========================================================================= */}
      {timetableMode === 'allocation' && (
        <View style={{ flex: 1 }}>
          {/* Subtabs: Class Teachers vs Subject Teachers */}
          <View style={styles.allocSubTabBar}>
            <TouchableOpacity
              style={[styles.allocSubTabBtn, allocSubTab === 'class' && styles.allocSubTabBtnActive]}
              onPress={() => setAllocSubTab('class')}
            >
              <MaterialIcons name="badge" size={16} color={allocSubTab === 'class' ? '#0284c7' : colors.textSecondary} />
              <Text style={[styles.allocSubTabBtnText, allocSubTab === 'class' && styles.allocSubTabBtnTextActive]}>
                Class Teachers ({classTeachers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.allocSubTabBtn, allocSubTab === 'subject' && styles.allocSubTabBtnActive]}
              onPress={() => setAllocSubTab('subject')}
            >
              <MaterialIcons name="menu-book" size={16} color={allocSubTab === 'subject' ? '#0284c7' : colors.textSecondary} />
              <Text style={[styles.allocSubTabBtnText, allocSubTab === 'subject' && styles.allocSubTabBtnTextActive]}>
                Subject Teachers ({subjectTeachers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* KPI Summary Cards */}
          <View style={styles.kpiContainer}>
            <View style={[styles.kpiCard, { borderColor: '#e2e8f0' }]}>
              <Text style={styles.kpiLabel}>Total</Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {allocSubTab === 'class' ? classKpi.total : subjectKpi.total}
              </Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: '#bbf7d0', backgroundColor: isDark ? '#064e3b20' : '#f0fdf4' }]}>
              <Text style={[styles.kpiLabel, { color: '#16a34a' }]}>Assigned</Text>
              <Text style={[styles.kpiValue, { color: '#16a34a' }]}>
                {allocSubTab === 'class' ? classKpi.assigned : subjectKpi.assigned}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setAllocOnlyUnassigned((p) => !p)}
              style={[
                styles.kpiCard,
                {
                  borderColor: allocOnlyUnassigned ? '#f59e0b' : '#fed7aa',
                  backgroundColor: allocOnlyUnassigned ? (isDark ? '#78350f40' : '#fffbeb') : (isDark ? '#451a0320' : '#fff7ed'),
                  borderWidth: allocOnlyUnassigned ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: '#d97706' }]}>Unassigned</Text>
              <Text style={[styles.kpiValue, { color: '#d97706' }]}>
                {allocSubTab === 'class' ? classKpi.unassigned : subjectKpi.unassigned}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search & Class Filter */}
          <View style={styles.allocFilterBox}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search class, section, subject, teacher..."
                placeholderTextColor={colors.textSecondary}
                value={allocSearch}
                onChangeText={setAllocSearch}
              />
              {allocSearch.length > 0 && (
                <TouchableOpacity onPress={() => setAllocSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.classChip, allocClassId === null && styles.classChipActive]}
                onPress={() => setAllocClassId(null)}
              >
                <Text style={[styles.classChipText, allocClassId === null && styles.classChipTextActive]}>
                  All Classes
                </Text>
              </TouchableOpacity>
              {classes.map((cls) => {
                const active = allocClassId === cls.id;
                return (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.classChip, active && styles.classChipActive]}
                    onPress={() => setAllocClassId(active ? null : cls.id)}
                  >
                    <Text style={[styles.classChipText, active && styles.classChipTextActive]}>
                      {cls.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Allocation List */}
          {loadingAlloc && !refreshingAlloc ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loadingText}>Loading allocations...</Text>
            </View>
          ) : (allocSubTab === 'class' ? filteredClassTeachers : filteredSubjectTeachers).length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialIcons name="assignment-late" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Allocations Found</Text>
              <Text style={styles.emptyDesc}>Try clearing filters or changing the class filter.</Text>
            </View>
          ) : (
            <FlatList
              data={allocSubTab === 'class' ? filteredClassTeachers : filteredSubjectTeachers}
              keyExtractor={(item, idx) =>
                allocSubTab === 'class'
                  ? `ct-${item.classId}-${item.sectionId}-${idx}`
                  : `st-${item.classId}-${item.sectionId}-${item.subjectId}-${idx}`
              }
              contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={refreshingAlloc} onRefresh={() => loadAllocations(true)} colors={['#0284c7']} />
              }
              renderItem={({ item }) => {
                const teacherName = item.teacherName || item.employeeName;
                const teacherCode = item.teacherCode || item.employeeCode;
                const isAssigned = Boolean(item.employeeId || teacherName);

                return (
                  <View style={[styles.allocCard, { borderLeftColor: isAssigned ? '#10b981' : '#f59e0b', borderLeftWidth: 4 }]}>
                    <View style={styles.allocCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.allocCardClass}>{item.className}</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>Sec {item.sectionName}</Text>
                        </View>
                        {item.capacity ? (
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>• {item.capacity} Seats</Text>
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isAssigned ? '#ecfdf5' : '#fffbeb', borderColor: isAssigned ? '#a7f3d0' : '#fde68a' },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: isAssigned ? '#059669' : '#d97706' }]}>
                          {isAssigned ? 'Assigned' : 'Unassigned'}
                        </Text>
                      </View>
                    </View>

                    {allocSubTab === 'subject' && (
                      <View style={styles.allocSubjectRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.allocSubjectName}>{item.subjectName}</Text>
                          {item.subjectCode ? (
                            <Text style={styles.allocSubjectCode}>Code: {item.subjectCode}</Text>
                          ) : null}
                        </View>
                        <View style={styles.subjectTypeBadge}>
                          <Text style={styles.subjectTypeBadgeText}>
                            {item.subjectType === 1 ? 'Scholastic' : 'Co-Scholastic'}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.allocTeacherRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.teacherAvatar, { backgroundColor: isAssigned ? '#e0f2fe' : '#f1f5f9' }]}>
                          <MaterialIcons
                            name={isAssigned ? 'person' : 'person-outline'}
                            size={18}
                            color={isAssigned ? '#0284c7' : '#94a3b8'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.teacherNameText,
                              { color: isAssigned ? colors.textPrimary : colors.textSecondary, fontStyle: isAssigned ? 'normal' : 'italic' },
                            ]}
                            numberOfLines={1}
                          >
                            {isAssigned ? teacherName : 'No Teacher Assigned'}
                          </Text>
                          {isAssigned && teacherCode ? (
                            <Text style={styles.teacherCodeText}>ID: {teacherCode}</Text>
                          ) : null}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.allocActionBtn,
                          { backgroundColor: isAssigned ? (isDark ? '#334155' : '#f1f5f9') : '#0284c7' },
                        ]}
                        onPress={() => handleOpenPicker(item)}
                      >
                        <MaterialIcons
                          name={isAssigned ? 'edit' : 'add'}
                          size={14}
                          color={isAssigned ? colors.textPrimary : '#ffffff'}
                        />
                        <Text style={[styles.allocActionBtnText, { color: isAssigned ? colors.textPrimary : '#ffffff' }]}>
                          {isAssigned ? 'Change' : 'Assign'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* TEACHER PICKER MODAL */}
          <Modal
            visible={pickerModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setPickerModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {allocSubTab === 'class' ? 'Assign Class Teacher' : 'Assign Subject Teacher'}
                    </Text>
                    {selectedAllocRow && (
                      <Text style={styles.modalSubtitle}>
                        {selectedAllocRow.className} - Section {selectedAllocRow.sectionName}
                        {allocSubTab === 'subject' && selectedAllocRow.subjectName ? ` • ${selectedAllocRow.subjectName}` : ''}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setPickerModalVisible(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.searchBar, { marginHorizontal: 16, marginTop: 12, marginBottom: 8 }]}>
                  <Ionicons name="search" size={16} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search by teacher name or code..."
                    placeholderTextColor={colors.textSecondary}
                    value={staffSearch}
                    onChangeText={setStaffSearch}
                  />
                  {staffSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setStaffSearch('')}>
                      <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {selectedAllocRow && (selectedAllocRow.employeeId || selectedAllocRow.teacherName || selectedAllocRow.employeeName) && (
                  <TouchableOpacity
                    style={styles.unassignBtn}
                    onPress={() => handleSaveTeacher(null)}
                    disabled={savingAlloc}
                  >
                    <MaterialIcons name="person-remove" size={16} color="#ef4444" />
                    <Text style={styles.unassignBtnText}>Unassign Current Teacher</Text>
                  </TouchableOpacity>
                )}

                {savingAlloc ? (
                  <View style={[styles.centerContainer, { minHeight: 200 }]}>
                    <ActivityIndicator size="large" color="#0284c7" />
                    <Text style={styles.loadingText}>Saving allocation...</Text>
                  </View>
                ) : filteredStaffList.length === 0 ? (
                  <View style={[styles.centerContainer, { minHeight: 180 }]}>
                    <Text style={styles.emptyDesc}>No staff members found.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredStaffList}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    renderItem={({ item }) => {
                      const isCurrentlyAssigned =
                        selectedAllocRow &&
                        (selectedAllocRow.employeeId === item.id ||
                          (selectedAllocRow.teacherName &&
                            selectedAllocRow.teacherName.toLowerCase() === (item.fullName || '').toLowerCase()));

                      return (
                        <TouchableOpacity
                          style={[
                            styles.staffRow,
                            isCurrentlyAssigned && { backgroundColor: isDark ? '#0369a130' : '#f0f9ff', borderColor: '#0284c7' },
                          ]}
                          onPress={() => handleSaveTeacher(item)}
                        >
                          <View style={styles.staffAvatar}>
                            <Text style={styles.staffAvatarText}>
                              {(item.fullName || 'T').substring(0, 2).toUpperCase()}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.staffName}>{item.fullName}</Text>
                              {isCurrentlyAssigned && (
                                <View style={styles.currentBadge}>
                                  <Text style={styles.currentBadgeText}>Current</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.staffSub}>
                              ID: {item.employeeCode || 'N/A'} • {item.designationName || item.departmentName || 'Faculty'}
                            </Text>
                          </View>

                          <MaterialIcons
                            name={isCurrentlyAssigned ? 'check-circle' : 'chevron-right'}
                            size={20}
                            color={isCurrentlyAssigned ? '#0284c7' : colors.textSecondary}
                          />
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* =========================================================================
          MODE 4: SUBSTITUTIONS VIEW
         ========================================================================= */}
      {timetableMode === 'substitution' && (
        <View style={styles.centerContainer}>
          <FontAwesome5 name="exchange-alt" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Teacher Substitutions</Text>
          <Text style={styles.emptyDesc}>
            Automated free teacher substitutions and period swaps for faculty on leave.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
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
    chipsRow: {
      gap: 8,
    },
    classChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
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
    secChip: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 14,
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    secChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    secChipTextActive: {
      color: '#ffffff',
    },
    daysTabBox: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    daysRow: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    dayTab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    dayTabActive: {
      backgroundColor: colors.primary,
    },
    dayTabText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    dayTabTextActive: {
      color: '#ffffff',
    },
    scheduleInfoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#0369a120' : '#f0f9ff',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#0369a140' : '#e0f2fe',
    },
    scheduleInfoText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    listContent: {
      padding: 14,
      gap: 10,
      paddingBottom: 40,
    },
    slotCard: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      gap: 12,
    },
    periodCol: {
      width: 85,
    },
    periodName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
    },
    periodTime: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    breakPill: {
      backgroundColor: '#fef3c7',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 3,
    },
    breakPillText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#d97706',
    },
    divider: {
      width: 1,
      height: 40,
      backgroundColor: colors.cardBorder,
    },
    subjectCol: {
      flex: 1,
    },
    subjectName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    miniStatusChip: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 6,
    },
    miniStatusChipText: {
      fontSize: 9,
      fontWeight: '700',
    },
    teacherName: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    roomNo: {
      fontSize: 10,
      color: colors.textSecondary,
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

    // -------------------------------------------------------------
    // Allocation Specific Styles
    // -------------------------------------------------------------
    allocSubTabBar: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      padding: 4,
      marginHorizontal: 12,
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 4,
    },
    allocSubTabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    allocSubTabBtnActive: {
      backgroundColor: isDark ? '#0284c725' : '#e0f2fe',
    },
    allocSubTabBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    allocSubTabBtnTextActive: {
      color: '#0284c7',
      fontWeight: '700',
    },
    kpiContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      marginTop: 10,
      gap: 8,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    kpiValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    allocFilterBox: {
      backgroundColor: colors.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 36,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      paddingVertical: 0,
    },
    allocCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 8,
    },
    allocCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    allocCardClass: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    sectionBadge: {
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    sectionBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    allocSubjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      marginTop: 2,
    },
    allocSubjectName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    allocSubjectCode: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    subjectTypeBadge: {
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    subjectTypeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    allocTeacherRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    teacherAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teacherNameText: {
      fontSize: 13,
      fontWeight: '700',
    },
    teacherCodeText: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    allocActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    allocActionBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      paddingTop: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    pickerChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pickerChipActive: {
      backgroundColor: '#0284c7',
      borderColor: '#0284c7',
    },
    pickerChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    pickerChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    textInput: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      fontSize: 13,
    },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0284c7',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    btnPrimaryText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    btnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
    },
    unassignBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    unassignBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ef4444',
    },
    staffRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 8,
      gap: 10,
    },
    staffAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#0284c715',
      alignItems: 'center',
      justifyContent: 'center',
    },
    staffAvatarText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#0284c7',
    },
    staffName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    staffSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    currentBadge: {
      backgroundColor: '#e0f2fe',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    currentBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#0284c7',
    },
  });
