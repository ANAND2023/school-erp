import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to format Date to 'YYYY-MM-DD'
export const formatDateToISO = (d) => {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper to format Date to 'DD MMM YYYY' (e.g. 15 Oct 2019)
export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'Select Date';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
      return `${d} ${MONTH_SHORT[m]} ${y}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * AppDatePickerModal
 * Standalone modal for picking Date, Month, and Year easily.
 */
export function AppDatePickerModal({
  visible,
  onClose,
  onSelect,
  value,
  title = 'Select Date',
  minYear = 1950,
  maxYear = 2035,
  isDob = false,
}) {
  const { colors, isDark } = useTheme();

  // Parse initial date
  const parsedDate = useMemo(() => {
    if (value) {
      const parts = String(value).split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [value, visible]);

  const [selectedYear, setSelectedYear] = useState(parsedDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(parsedDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsedDate.getDate());

  // Active view: 'days' | 'months' | 'years'
  const [activeTab, setActiveTab] = useState('days');

  useEffect(() => {
    if (visible) {
      setSelectedYear(parsedDate.getFullYear());
      setSelectedMonth(parsedDate.getMonth());
      setSelectedDay(parsedDate.getDate());
      setActiveTab('days');
    }
  }, [visible, parsedDate]);

  // Generate Year List (reversed if DOB so recent birth years appear first)
  const yearsList = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // First day of selected month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => Math.max(minYear, prev - 1));
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => Math.min(maxYear, prev + 1));
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
  };

  const handleApply = () => {
    const validDay = Math.min(selectedDay, daysInMonth);
    const mStr = String(selectedMonth + 1).padStart(2, '0');
    const dStr = String(validDay).padStart(2, '0');
    const isoDate = `${selectedYear}-${mStr}-${dStr}`;
    onSelect(isoDate);
    onClose();
  };

  const handleSelectToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setSelectedDay(now.getDate());
    setActiveTab('days');
  };

  const handleSelectAgePreset = (ageYears) => {
    const currentYear = new Date().getFullYear();
    const targetYear = currentYear - ageYears;
    setSelectedYear(targetYear);
    setActiveTab('days');
  };

  // Format header preview string
  const previewFormatted = useMemo(() => {
    const validDay = Math.min(selectedDay, daysInMonth);
    const d = new Date(selectedYear, selectedMonth, validDay);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return `${dayName}, ${validDay} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  }, [selectedYear, selectedMonth, selectedDay, daysInMonth]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.cardBg,
              borderColor: isDark ? colors.cardBorder : '#cbd5e1',
            },
          ]}
        >
          {/* Header Preview Banner */}
          <View
            style={[
              styles.headerBanner,
              { backgroundColor: isDark ? '#1e293b' : '#0284c7' },
            ]}
          >
            <View style={styles.headerTopRow}>
              <Text style={styles.headerSubtitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.headerDateBig}>{previewFormatted}</Text>

            {/* Quick Navigation Tabs: Date / Month / Year */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'days' && styles.tabBtnActive]}
                onPress={() => setActiveTab('days')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={13} color={activeTab === 'days' ? '#0284c7' : '#ffffff'} />
                <Text style={[styles.tabBtnText, activeTab === 'days' && styles.tabBtnTextActive]}>
                  {selectedDay} {MONTH_SHORT[selectedMonth]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'months' && styles.tabBtnActive]}
                onPress={() => setActiveTab('months')}
                activeOpacity={0.8}
              >
                <Ionicons name="apps-outline" size={13} color={activeTab === 'months' ? '#0284c7' : '#ffffff'} />
                <Text style={[styles.tabBtnText, activeTab === 'months' && styles.tabBtnTextActive]}>
                  {MONTH_SHORT[selectedMonth]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'years' && styles.tabBtnActive]}
                onPress={() => setActiveTab('years')}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={13} color={activeTab === 'years' ? '#0284c7' : '#ffffff'} />
                <Text style={[styles.tabBtnText, activeTab === 'years' && styles.tabBtnTextActive]}>
                  Year: {selectedYear}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.bodyContainer}>
            {/* 1. DAYS / CALENDAR VIEW */}
            {activeTab === 'days' && (
              <View style={styles.daysViewContainer}>
                {/* Month & Year Bar with Arrows */}
                <View style={styles.monthNavRow}>
                  <TouchableOpacity
                    style={[styles.monthNavBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                    onPress={handlePrevMonth}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.monthTitleBox}>
                    <TouchableOpacity onPress={() => setActiveTab('months')} activeOpacity={0.7}>
                      <Text style={[styles.monthTitleText, { color: colors.textPrimary }]}>
                        {MONTH_NAMES[selectedMonth]}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('years')} activeOpacity={0.7}>
                      <Text style={[styles.yearTitleBadge, { color: colors.primary, backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}>
                        {selectedYear} ▾
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.monthNavBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                    onPress={handleNextMonth}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Weekday Labels (Su, Mo, Tu, We, Th, Fr, Sa) */}
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((w, idx) => (
                    <Text
                      key={idx}
                      style={[
                        styles.weekdayText,
                        idx === 0 && { color: '#ef4444' }, // Sunday red
                        { color: idx === 0 ? '#ef4444' : colors.textSecondary },
                      ]}
                    >
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <View key={`empty-${idx}`} style={styles.dayCellEmpty} />
                  ))}

                  {/* Day numbers */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const isSelected = day === selectedDay;
                    const isToday =
                      day === new Date().getDate() &&
                      selectedMonth === new Date().getMonth() &&
                      selectedYear === new Date().getFullYear();

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                          !isSelected && isToday && { borderWidth: 1, borderColor: colors.primary },
                        ]}
                        onPress={() => handleSelectDay(day)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            { color: isSelected ? '#ffffff' : colors.textPrimary },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 2. MONTHS GRID VIEW */}
            {activeTab === 'months' && (
              <View style={styles.monthsGridContainer}>
                <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                  Select Month for {selectedYear}
                </Text>
                <View style={styles.monthsGrid}>
                  {MONTH_NAMES.map((name, idx) => {
                    const isSelected = idx === selectedMonth;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.monthTile,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark ? '#1e293b' : '#f8fafc',
                            borderColor: isSelected
                              ? colors.primary
                              : isDark ? '#334155' : '#e2e8f0',
                          },
                        ]}
                        onPress={() => {
                          setSelectedMonth(idx);
                          setActiveTab('days');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.monthTileText,
                            { color: isSelected ? '#ffffff' : colors.textPrimary, fontWeight: isSelected ? '700' : '600' },
                          ]}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 3. YEARS GRID VIEW */}
            {activeTab === 'years' && (
              <View style={styles.yearsGridContainer}>
                <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                  Select Year ({minYear} - {maxYear})
                </Text>
                <FlatList
                  data={yearsList}
                  keyExtractor={(item) => String(item)}
                  numColumns={4}
                  showsVerticalScrollIndicator={true}
                  style={styles.yearsFlatList}
                  contentContainerStyle={styles.yearsGridContent}
                  initialNumToRender={24}
                  renderItem={({ item: yr }) => {
                    const isSelected = yr === selectedYear;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.yearTile,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark ? '#1e293b' : '#f8fafc',
                            borderColor: isSelected
                              ? colors.primary
                              : isDark ? '#334155' : '#e2e8f0',
                          },
                        ]}
                        onPress={() => {
                          setSelectedYear(yr);
                          setActiveTab('days');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.yearTileText,
                            { color: isSelected ? '#ffffff' : colors.textPrimary, fontWeight: isSelected ? '700' : '600' },
                          ]}
                        >
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            {/* Quick Action Chips (Today / DOB age shortcuts) */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={[styles.shortcutChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                onPress={handleSelectToday}
              >
                <Ionicons name="today-outline" size={12} color={colors.primary} />
                <Text style={[styles.shortcutChipText, { color: colors.primary }]}>Today</Text>
              </TouchableOpacity>

              {isDob && (
                <>
                  <TouchableOpacity
                    style={[styles.shortcutChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                    onPress={() => handleSelectAgePreset(5)}
                  >
                    <Text style={[styles.shortcutChipText, { color: colors.textPrimary }]}>Age 5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shortcutChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                    onPress={() => handleSelectAgePreset(10)}
                  >
                    <Text style={[styles.shortcutChipText, { color: colors.textPrimary }]}>Age 10</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shortcutChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                    onPress={() => handleSelectAgePreset(15)}
                  >
                    <Text style={[styles.shortcutChipText, { color: colors.textPrimary }]}>Age 15</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Action Footer Buttons */}
          <View style={[styles.modalFooter, { borderTopColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: isDark ? '#475569' : '#cbd5e1' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
            >
              <Ionicons name="checkmark-sharp" size={17} color="#ffffff" />
              <Text style={styles.applyBtnText}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * AppDatePicker
 * The primary reusable Date Picker field component for all forms.
 */
export default function AppDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select Date',
  minYear = 1950,
  maxYear = 2035,
  isDob = false,
  containerStyle,
  required = false,
  disabled = false,
}) {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const displayValue = useMemo(() => {
    return formatDateDisplay(value);
  }, [value]);

  const hasValue = !!value && value.trim() !== '';

  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      {label && (
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {label} {required && <Text style={{ color: '#ef4444' }}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.fieldTouchBox,
          {
            backgroundColor: isDark ? colors.cardBg : '#ffffff',
            borderColor: hasValue ? colors.primary : isDark ? colors.cardBorder : '#cbd5e1',
          },
          disabled && { opacity: 0.6 },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.fieldLeft}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={hasValue ? colors.primary : colors.textSecondary}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.fieldText,
              {
                color: hasValue ? colors.textPrimary : colors.textSecondary,
                fontWeight: hasValue ? '600' : '400',
              },
            ]}
          >
            {hasValue ? displayValue : placeholder}
          </Text>
        </View>

        <View style={styles.fieldRight}>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <AppDatePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={(iso) => onChange(iso)}
        value={value}
        title={label || 'Select Date'}
        minYear={minYear}
        maxYear={maxYear}
        isDob={isDob}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Input Field Box
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  fieldTouchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  fieldText: {
    fontSize: 13.5,
    flex: 1,
  },
  fieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Modal Container
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Modal Header Banner
  headerBanner: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bae6fd',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerDateBig: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 9,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  tabBtnTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },

  // Body
  bodyContainer: {
    padding: 16,
  },
  daysViewContainer: {},
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  yearTitleBadge: {
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 4,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Months Grid View
  monthsGridContainer: {
    minHeight: 220,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  monthTile: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTileText: {
    fontSize: 13,
  },

  // Years Grid View
  yearsGridContainer: {
    height: 240,
  },
  yearsFlatList: {
    flex: 1,
  },
  yearsGridContent: {
    paddingVertical: 4,
    rowGap: 8,
  },
  yearTile: {
    flex: 1,
    margin: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearTileText: {
    fontSize: 13,
  },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shortcutChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
