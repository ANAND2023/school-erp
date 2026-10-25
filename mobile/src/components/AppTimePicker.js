import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Parses time string to { hour: 1-12, minute: 0-59, ampm: 'AM'|'PM' }
 */
export const parseTimeString = (timeStr) => {
  if (!timeStr) {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return { hour: h, minute: m, ampm };
  }

  const match12 = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    let ampm = match12[3] ? match12[3].toUpperCase() : null;

    if (!ampm) {
      if (hour >= 12) {
        ampm = 'PM';
        if (hour > 12) hour -= 12;
      } else {
        ampm = 'AM';
        if (hour === 0) hour = 12;
      }
    } else {
      if (hour > 12) hour = hour % 12 || 12;
      if (hour === 0) hour = 12;
    }
    return { hour, minute: Math.min(59, Math.max(0, minute)), ampm };
  }

  return { hour: 12, minute: 0, ampm: 'PM' };
};

/**
 * Formats hour, minute, ampm to "hh:mm AM/PM"
 */
export const formatTime12 = (hour, minute, ampm) => {
  const hStr = String(hour).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  return `${hStr}:${mStr} ${ampm}`;
};

/**
 * Returns current time formatted as "hh:mm AM/PM"
 */
export const getCurrentTime12 = () => {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return formatTime12(h, m, ampm);
};

/**
 * Adds minutes to a given 12-hour time string
 */
export const addMinutesToTime12 = (timeStr, minutesToAdd = 30) => {
  const parsed = parseTimeString(timeStr || getCurrentTime12());
  let totalMinutes = (parsed.hour % 12) * 60 + parsed.minute;
  if (parsed.ampm === 'PM') totalMinutes += 12 * 60;

  totalMinutes += minutesToAdd;
  totalMinutes = (totalMinutes + 24 * 60) % (24 * 60);

  let h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  h12 = h12 ? h12 : 12;

  return formatTime12(h12, m, ampm);
};

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_INTERVALS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/**
 * AppTimePickerModal
 * Modern, tactile, intuitive time picker dialog.
 */
export function AppTimePickerModal({
  visible,
  onClose,
  onSelect,
  value,
  title = 'Select Time',
  allowClear = false,
}) {
  const { colors, isDark } = useTheme();

  const parsed = useMemo(() => parseTimeString(value), [value, visible]);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState(parsed.ampm);
  const [tab, setTab] = useState('hour'); // 'hour' | 'minute'

  useEffect(() => {
    if (visible) {
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setAmpm(parsed.ampm);
      setTab('hour');
    }
  }, [visible, parsed]);

  const handleSetNow = () => {
    const cur = parseTimeString(getCurrentTime12());
    setHour(cur.hour);
    setMinute(cur.minute);
    setAmpm(cur.ampm);
  };

  const handleAddMinutes = (mins) => {
    const curFormatted = formatTime12(hour, minute, ampm);
    const newFormatted = addMinutesToTime12(curFormatted, mins);
    const p = parseTimeString(newFormatted);
    setHour(p.hour);
    setMinute(p.minute);
    setAmpm(p.ampm);
  };

  const handleStepMinute = (delta) => {
    let next = (minute + delta + 60) % 60;
    setMinute(next);
  };

  const handleConfirm = () => {
    const formatted = formatTime12(hour, minute, ampm);
    onSelect(formatted);
    onClose();
  };

  const handleClear = () => {
    onSelect('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.dialog, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={modalStyles.headerTitleCol}>
              <Text style={[modalStyles.title, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
                Tap hour & minute to set time
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Big Digital Clock Display */}
          <View style={modalStyles.clockDisplayRow}>
            <TouchableOpacity
              style={[
                modalStyles.clockUnitBox,
                tab === 'hour' && modalStyles.clockUnitBoxActive,
                { backgroundColor: tab === 'hour' ? (isDark ? '#0369a1' : '#e0f2fe') : (isDark ? '#1e293b' : '#f1f5f9') },
              ]}
              onPress={() => setTab('hour')}
              activeOpacity={0.8}
            >
              <Text style={[modalStyles.clockDigits, { color: tab === 'hour' ? '#0284c7' : colors.textPrimary }]}>
                {String(hour).padStart(2, '0')}
              </Text>
              <Text style={[modalStyles.clockUnitLabel, { color: tab === 'hour' ? '#0284c7' : colors.textSecondary }]}>
                HOUR
              </Text>
            </TouchableOpacity>

            <Text style={[modalStyles.clockColon, { color: colors.textPrimary }]}>:</Text>

            <TouchableOpacity
              style={[
                modalStyles.clockUnitBox,
                tab === 'minute' && modalStyles.clockUnitBoxActive,
                { backgroundColor: tab === 'minute' ? (isDark ? '#0369a1' : '#e0f2fe') : (isDark ? '#1e293b' : '#f1f5f9') },
              ]}
              onPress={() => setTab('minute')}
              activeOpacity={0.8}
            >
              <Text style={[modalStyles.clockDigits, { color: tab === 'minute' ? '#0284c7' : colors.textPrimary }]}>
                {String(minute).padStart(2, '0')}
              </Text>
              <Text style={[modalStyles.clockUnitLabel, { color: tab === 'minute' ? '#0284c7' : colors.textSecondary }]}>
                MIN
              </Text>
            </TouchableOpacity>

            {/* AM / PM Toggle */}
            <View style={modalStyles.ampmCol}>
              <TouchableOpacity
                style={[
                  modalStyles.ampmBtn,
                  ampm === 'AM' && modalStyles.ampmBtnActive,
                  { backgroundColor: ampm === 'AM' ? '#0284c7' : (isDark ? '#1e293b' : '#f1f5f9') },
                ]}
                onPress={() => setAmpm('AM')}
                activeOpacity={0.8}
              >
                <Text style={[modalStyles.ampmText, ampm === 'AM' && modalStyles.ampmTextActive, { color: ampm === 'AM' ? '#ffffff' : colors.textPrimary }]}>
                  AM
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modalStyles.ampmBtn,
                  ampm === 'PM' && modalStyles.ampmBtnActive,
                  { backgroundColor: ampm === 'PM' ? '#0284c7' : (isDark ? '#1e293b' : '#f1f5f9') },
                ]}
                onPress={() => setAmpm('PM')}
                activeOpacity={0.8}
              >
                <Text style={[modalStyles.ampmText, ampm === 'PM' && modalStyles.ampmTextActive, { color: ampm === 'PM' ? '#ffffff' : colors.textPrimary }]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Switcher: Hour vs Minute */}
          <View style={modalStyles.tabSwitchRow}>
            <TouchableOpacity
              style={[
                modalStyles.tabSwitchBtn,
                tab === 'hour' && modalStyles.tabSwitchBtnActive,
                { backgroundColor: tab === 'hour' ? '#0284c7' : (isDark ? '#1e293b' : '#f8fafc') },
              ]}
              onPress={() => setTab('hour')}
            >
              <Text style={[modalStyles.tabSwitchText, tab === 'hour' && modalStyles.tabSwitchTextActive, { color: tab === 'hour' ? '#ffffff' : colors.textSecondary }]}>
                Hours (1 - 12)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                modalStyles.tabSwitchBtn,
                tab === 'minute' && modalStyles.tabSwitchBtnActive,
                { backgroundColor: tab === 'minute' ? '#0284c7' : (isDark ? '#1e293b' : '#f8fafc') },
              ]}
              onPress={() => setTab('minute')}
            >
              <Text style={[modalStyles.tabSwitchText, tab === 'minute' && modalStyles.tabSwitchTextActive, { color: tab === 'minute' ? '#ffffff' : colors.textSecondary }]}>
                Minutes (:00 - :55)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Grid Selection */}
          {tab === 'hour' ? (
            <View style={modalStyles.gridContainer}>
              {HOURS.map((h) => {
                const isSelected = hour === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[
                      modalStyles.gridCell,
                      isSelected && modalStyles.gridCellActive,
                      { backgroundColor: isSelected ? '#0284c7' : (isDark ? '#334155' : '#f1f5f9') },
                    ]}
                    onPress={() => {
                      setHour(h);
                      setTab('minute'); // Auto switch to minutes for smooth UX!
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[modalStyles.gridCellText, isSelected && modalStyles.gridCellTextActive, { color: isSelected ? '#ffffff' : colors.textPrimary }]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View>
              <View style={modalStyles.gridContainer}>
                {MINUTES_INTERVALS.map((m) => {
                  const isSelected = minute === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        modalStyles.gridCell,
                        isSelected && modalStyles.gridCellActive,
                        { backgroundColor: isSelected ? '#0284c7' : (isDark ? '#334155' : '#f1f5f9') },
                      ]}
                      onPress={() => setMinute(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[modalStyles.gridCellText, isSelected && modalStyles.gridCellTextActive, { color: isSelected ? '#ffffff' : colors.textPrimary }]}>
                        :{String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fine-tune +/- 1 min Stepper */}
              <View style={modalStyles.stepperRow}>
                <Text style={[modalStyles.stepperLabel, { color: colors.textSecondary }]}>Fine Adjust:</Text>
                <TouchableOpacity
                  style={[modalStyles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                  onPress={() => handleStepMinute(-1)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="remove" size={18} color={colors.textPrimary} />
                  <Text style={[modalStyles.stepperBtnText, { color: colors.textPrimary }]}>-1 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                  onPress={() => handleStepMinute(1)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add" size={18} color={colors.textPrimary} />
                  <Text style={[modalStyles.stepperBtnText, { color: colors.textPrimary }]}>+1 min</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Presets Row */}
          <View style={modalStyles.presetsRow}>
            <TouchableOpacity
              style={[modalStyles.presetPill, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={handleSetNow}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={12} color="#0284c7" />
              <Text style={modalStyles.presetPillText}>Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modalStyles.presetPill, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={() => handleAddMinutes(15)}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.presetPillText}>+15m</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modalStyles.presetPill, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={() => handleAddMinutes(30)}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.presetPillText}>+30m</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modalStyles.presetPill, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={() => handleAddMinutes(60)}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.presetPillText}>+1 hr</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={modalStyles.actionsRow}>
            {allowClear && (
              <TouchableOpacity
                style={[modalStyles.clearBtn, { borderColor: '#fca5a5' }]}
                onPress={handleClear}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.clearBtnText}>Clear Time</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[modalStyles.confirmBtn, { flex: allowClear ? 1.5 : 1 }]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={modalStyles.confirmBtnText}>Set Time ({formatTime12(hour, minute, ampm)})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * AppTimePickerField
 * Form field with clock icon, clear display, quick preset pills, and modal trigger.
 */
export function AppTimePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select Time',
  required = false,
  allowClear = false,
  quickPresets = [],
  style,
}) {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={[fieldStyles.container, style]}>
      {label ? (
        <View style={fieldStyles.labelRow}>
          <Text style={[fieldStyles.label, { color: colors.textPrimary }]}>
            {label} {required ? <Text style={{ color: '#ef4444' }}>*</Text> : null}
          </Text>
        </View>
      ) : null}

      {/* Main Touch Field */}
      <TouchableOpacity
        style={[
          fieldStyles.inputBox,
          {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : '#cbd5e1',
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="time-outline" size={18} color="#0284c7" />
        <Text
          style={[
            fieldStyles.inputText,
            { color: value ? colors.textPrimary : '#94a3b8', fontWeight: value ? '700' : '400' },
          ]}
        >
          {value || placeholder}
        </Text>

        {value && allowClear ? (
          <TouchableOpacity
            style={fieldStyles.clearIconBtn}
            onPress={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        )}
      </TouchableOpacity>

      {/* Quick Presets Underneath */}
      {quickPresets && quickPresets.length > 0 ? (
        <View style={fieldStyles.presetsRow}>
          {quickPresets.map((preset, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                fieldStyles.presetPill,
                { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#f0f9ff', borderColor: isDark ? '#0369a1' : '#bae6fd' },
              ]}
              onPress={() => preset.onSelect()}
              activeOpacity={0.7}
            >
              {preset.icon ? <Ionicons name={preset.icon} size={11} color="#0284c7" /> : null}
              <Text style={fieldStyles.presetText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Time Picker Modal */}
      <AppTimePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={(time) => onChange(time)}
        value={value}
        title={label || 'Select Time'}
        allowClear={allowClear}
      />
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleCol: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  clockDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  clockUnitBox: {
    width: 76,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  clockUnitBoxActive: {
    borderColor: '#0284c7',
  },
  clockDigits: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  clockUnitLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  clockColon: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: -8,
  },
  ampmCol: {
    gap: 6,
    marginLeft: 6,
  },
  ampmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  ampmBtnActive: {
    backgroundColor: '#0284c7',
  },
  ampmText: {
    fontSize: 12,
    fontWeight: '800',
  },
  ampmTextActive: {
    color: '#ffffff',
  },
  tabSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabSwitchBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitchBtnActive: {
    backgroundColor: '#0284c7',
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabSwitchTextActive: {
    color: '#ffffff',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridCell: {
    width: '22%',
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellActive: {
    backgroundColor: '#0284c7',
  },
  gridCellText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gridCellTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  stepperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stepperBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    marginTop: 4,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 11,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    marginBottom: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 13,
  },
  clearIconBtn: {
    padding: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284c7',
  },
});
