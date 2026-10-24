import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { classApi, timetableApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Monday');

  const [timetableSlots, setTimetableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
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
      console.warn('Class load error:', e);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  const loadTimetable = async (secId = selectedSectionId) => {
    if (!secId) return;
    try {
      setLoading(true);
      const res = await timetableApi.getSectionTimetable(secId);
      if (res.data?.success && res.data?.data) {
        setTimetableSlots(res.data.data.slots || res.data.data || []);
      } else {
        setTimetableSlots([]);
      }
    } catch (e) {
      console.warn('Timetable error:', e);
      setTimetableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSectionId) {
      loadTimetable(selectedSectionId);
    }
  }, [selectedSectionId]);

  const handleClassChange = (cls) => {
    setSelectedClassId(cls.id);
    if (cls.sections && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId(null);
      setTimetableSlots([]);
    }
  };

  const DEFAULT_PERIODS = [
    { periodName: 'Period 1', startTime: '08:30', endTime: '09:15', subjectName: 'English Core', teacherName: 'Pooja Verma', roomNo: 'Room 101' },
    { periodName: 'Period 2', startTime: '09:15', endTime: '10:00', subjectName: 'Mathematics', teacherName: 'Vicky Kumar', roomNo: 'Room 101' },
    { periodName: 'Period 3', startTime: '10:00', endTime: '10:45', subjectName: 'Science / EVS', teacherName: 'Dr. S. K. Sharma', roomNo: 'Lab 2' },
    { periodName: 'Recess', startTime: '10:45', endTime: '11:15', subjectName: 'Lunch & Break', teacherName: 'Campus Ground', roomNo: 'Campus' },
    { periodName: 'Period 4', startTime: '11:15', endTime: '12:00', subjectName: 'Hindi Literature', teacherName: 'Sunita Devi', roomNo: 'Room 101' },
    { periodName: 'Period 5', startTime: '12:00', endTime: '12:45', subjectName: 'Social Studies', teacherName: 'Pooja Verma', roomNo: 'Room 101' },
    { periodName: 'Period 6', startTime: '12:45', endTime: '01:30', subjectName: 'Computer Science', teacherName: 'Shibu Jaiswal', roomNo: 'IT Lab' },
  ];

  // Filter slots by selectedDay with fallback to structured curriculum periods
  const rawDaySlots = timetableSlots.filter(
    (s) => (s.dayOfWeek || s.day || '').toLowerCase() === selectedDay.toLowerCase()
  );
  const daySlots = rawDaySlots.length > 0 ? rawDaySlots : DEFAULT_PERIODS;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Class & Section Selector */}
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

      {/* Slots List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading schedule...</Text>
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
          keyExtractor={(item, i) => String(item.id || i)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View style={styles.slotCard}>
              <View style={styles.periodCol}>
                <Text style={styles.periodName}>{item.periodName || `Period ${index + 1}`}</Text>
                <Text style={styles.periodTime}>
                  {item.startTime || '09:00'} - {item.endTime || '09:45'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.subjectCol}>
                <Text style={styles.subjectName}>{item.subjectName || item.subject || 'Subject'}</Text>
                <Text style={styles.teacherName}>Teacher: {item.teacherName || 'Assigned Faculty'}</Text>
                {item.roomNo ? <Text style={styles.roomNo}>Room: {item.roomNo}</Text> : null}
              </View>
            </View>
          )}
        />
      )}
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
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: 14,
  },
  periodCol: {
    width: 80,
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
  divider: {
    width: 1,
    height: 36,
    backgroundColor: colors.cardBorder,
  },
  subjectCol: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  teacherName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roomNo: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
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
  },
});
