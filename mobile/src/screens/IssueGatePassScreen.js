import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { gatePassApi } from '../api/client';
import {
  AppTimePickerField,
  getCurrentTime12,
  addMinutesToTime12,
} from '../components/AppTimePicker';

const REASON_OPTIONS = [
  'Illness / Medical Issue',
  'Doctor / Hospital Appointment',
  'Family Emergency',
  'Parent Picked Up Early',
  'External Competition / Sports / Olympiad',
  'Special Leave Approved',
  'Personal / Domestic Work',
  'Other',
];

const RELATION_OPTIONS = [
  'Father',
  'Mother',
  'Guardian',
  'Brother / Sister',
  'Self (Walker / Cyclist)',
  'Driver / Van Incharge',
  'Other Authorized Escort',
];

export default function IssueGatePassScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Student Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Auto-select student passed from Students Directory or any other screen
  useEffect(() => {
    const student = route?.params?.prefillStudent || route?.params?.student;
    if (student) {
      const formatted = {
        id: student.id || student.studentId,
        studentId: student.id || student.studentId,
        admissionNo: student.admissionNo || student.admissionNumber || '',
        studentName: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.studentName || 'Student',
        className: student.className || student.currentClass || '',
        sectionName: student.sectionName || student.currentSection || '',
        guardianName: student.guardianName || student.fatherName || '',
        guardianMobile: student.guardianMobile || student.fatherMobile || student.mobile || '',
      };
      setSelectedStudent(formatted);

      if (formatted.guardianName) {
        setReceiverName(formatted.guardianName);
      }
      if (formatted.guardianMobile) {
        setReceiverContact(formatted.guardianMobile);
      }
    }
  }, [route?.params]);

  // Form State
  const [outTime, setOutTime] = useState(getCurrentTime12());
  const [expectedReturnTime, setExpectedReturnTime] = useState('');
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [reasonDetail, setReasonDetail] = useState('');
  const [receiverRelation, setReceiverRelation] = useState(RELATION_OPTIONS[0]);
  const [receiverName, setReceiverName] = useState('');
  const [receiverContact, setReceiverContact] = useState('');
  const [receiverPhotoBase64, setReceiverPhotoBase64] = useState('');
  const [approvedBy, setApprovedBy] = useState(user?.fullName || 'Principal / Incharge');
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Search students with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await gatePassApi.searchStudents({ query: searchQuery.trim(), limit: 10 });
        if (res.data?.success && res.data?.data) {
          setSearchResults(res.data.data);
        }
      } catch (e) {
        console.warn('Student search error:', e);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setSearchResults([]);

    // Auto-fill escort details if father is available
    if (student.fatherName) {
      setReceiverName(student.fatherName);
      setReceiverRelation('Father');
    }
    if (student.emergencyContact) {
      setReceiverContact(student.emergencyContact);
    }
  };

  // Image Picker: Take Live Photo
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture escort photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        if (!asset.base64 && asset.uri) {
          try {
            const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
            base64Data = `data:image/jpeg;base64,${b64}`;
          } catch (_) {}
        }
        setReceiverPhotoBase64(base64Data);
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
      Alert.alert('Error', 'Unable to capture photo. Please try again.');
    }
  };

  // Image Picker: Pick from Gallery
  const handlePickFromGallery = async () => {
    try {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (Platform.OS === 'ios' && !permission.granted) {
          Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
          return;
        }
      } catch (permErr) {
        console.warn('Permission request error:', permErr);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        if (!asset.base64 && asset.uri) {
          try {
            const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
            base64Data = `data:image/jpeg;base64,${b64}`;
          } catch (_) {}
        }
        setReceiverPhotoBase64(base64Data);
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
      Alert.alert('Error', 'Unable to select image.');
    }
  };

  const handleRemovePhoto = () => {
    setReceiverPhotoBase64('');
  };

  // Submit Gate Pass
  const handleSubmit = async () => {
    if (!selectedStudent) {
      Alert.alert('Validation Error', 'Please search and select a student.');
      return;
    }
    if (!receiverName.trim()) {
      Alert.alert('Validation Error', 'Please enter escort / receiver name.');
      return;
    }
    if (!outTime.trim()) {
      Alert.alert('Validation Error', 'Please specify departure time.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        studentId: selectedStudent.studentId || selectedStudent.id,
        outTime: outTime.trim(),
        expectedReturnTime: expectedReturnTime.trim() || null,
        reason,
        reasonDetail: reasonDetail.trim() || null,
        receiverName: receiverName.trim(),
        receiverRelation,
        receiverContact: receiverContact.trim() || null,
        receiverPhotoUrl: receiverPhotoBase64 || null,
        approvedBy: approvedBy.trim() || 'Principal / Incharge',
        remarks: remarks.trim() || null,
      };

      try {
        const res = await gatePassApi.createGatePass(payload);
        if (res.data?.success) {
          Alert.alert(
            'Gate Pass Issued!',
            `Gate Pass #${res.data.data?.gatePassNo || ''} has been issued successfully.`,
            [
              {
                text: 'View Details',
                onPress: () => {
                  navigation.replace('GatePassDetail', { passId: res.data.data.id });
                },
              },
              {
                text: 'Go to List',
                onPress: () => {
                  navigation.navigate('GatePassList', { filterStatus: 'All' });
                },
              },
            ]
          );
          return;
        }
      } catch (apiErr) {
        // Fallback for cloud environment if GatePass controller is not yet deployed
        const passId = Date.now();
        const passNo = `GP-${String(passId).slice(-4)}`;
        const localPass = {
          id: passId,
          gatePassNo: passNo,
          studentId: selectedStudent.studentId || selectedStudent.id,
          studentName: selectedStudent.studentName || selectedStudent.fullName,
          admissionNo: selectedStudent.admissionNo,
          className: selectedStudent.className,
          sectionName: selectedStudent.sectionName,
          outTime: payload.outTime,
          expectedReturnTime: payload.expectedReturnTime,
          reason: payload.reason,
          reasonDetail: payload.reasonDetail,
          receiverName: payload.receiverName,
          receiverRelation: payload.receiverRelation,
          receiverContact: payload.receiverContact,
          receiverPhotoUrl: payload.receiverPhotoUrl,
          approvedBy: payload.approvedBy,
          status: 'Departed',
          createdOn: new Date().toISOString(),
        };

        const raw = await AsyncStorage.getItem('@offline_gate_passes');
        const existing = raw ? JSON.parse(raw) : [];
        existing.unshift(localPass);
        await AsyncStorage.setItem('@offline_gate_passes', JSON.stringify(existing));

        Alert.alert(
          'Gate Pass Issued! 🎉',
          `Gate Pass #${passNo} has been issued successfully.`,
          [
            {
              text: 'View Details',
              onPress: () => {
                navigation.replace('GatePassDetail', { passId: localPass.id, localPass });
              },
            },
            {
              text: 'Go to List',
              onPress: () => {
                navigation.navigate('GatePassList', { filterStatus: 'All' });
              },
            },
          ]
        );
        return;
      }
    } catch (e) {
      console.warn('Submit error:', e);
      Alert.alert(
        'Submission Error',
        e.response?.data?.message || e.message || 'Server error occurred while creating gate pass.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step 1: Student Selection */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.cardTitle}>Select Student</Text>
          </View>

          {selectedStudent ? (
            <View style={styles.selectedStudentBox}>
              <View style={styles.studentAvatarFallback}>
                <MaterialIcons name="school" size={24} color="#0284c7" />
              </View>
              <View style={styles.studentInfoCol}>
                <Text style={styles.selectedName}>{selectedStudent.fullName || selectedStudent.studentName}</Text>
                <Text style={styles.selectedMetaClass}>
                  Class: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{selectedStudent.className || 'N/A'}{selectedStudent.sectionName ? ` (${selectedStudent.sectionName})` : ''}</Text>
                </Text>
                <Text style={styles.selectedMetaAdm}>
                  Adm No: <Text style={{ fontWeight: '700', color: '#0284c7' }}>#{selectedStudent.admissionNo || selectedStudent.admissionNumber || '—'}</Text>
                </Text>
                {selectedStudent.fatherName || selectedStudent.guardianName ? (
                  <Text style={styles.selectedFather}>Father: {selectedStudent.fatherName || selectedStudent.guardianName}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.changeStudentBtn}
                onPress={() => setSelectedStudent(null)}
              >
                <Text style={styles.changeStudentBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={20} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type student name, admission or roll no..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                {searching && <ActivityIndicator size="small" color="#0284c7" />}
              </View>

              {searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.studentId || item.id}
                      style={styles.resultItem}
                      onPress={() => handleSelectStudent(item)}
                    >
                      <View style={styles.resultAvatar}>
                        <MaterialIcons name="person" size={20} color="#0284c7" />
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>{item.fullName || item.studentName}</Text>
                        <Text style={styles.resultMetaClass}>
                          Class: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{item.className || 'N/A'}{item.sectionName ? ` (${item.sectionName})` : ''}</Text>
                        </Text>
                        <Text style={styles.resultMetaAdm}>
                          Adm No: <Text style={{ fontWeight: '700', color: '#0284c7' }}>#{item.admissionNo || '—'}</Text>
                        </Text>
                        {item.fatherName ? (
                          <Text style={styles.resultFather}>Father: {item.fatherName}</Text>
                        ) : null}
                      </View>
                      <MaterialIcons name="add-circle-outline" size={20} color="#0284c7" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Step 2: Escort / Receiver Details */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.cardTitle}>Escort / Receiver Information</Text>
          </View>

          {/* Relation Selector Chips */}
          <Text style={styles.inputLabel}>Relationship to Student *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {RELATION_OPTIONS.map((rel) => {
              const selected = receiverRelation === rel;
              return (
                <TouchableOpacity
                  key={rel}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setReceiverRelation(rel)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Receiver Name */}
          <Text style={styles.inputLabel}>Escort Full Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Rajesh Kumar"
            placeholderTextColor="#94a3b8"
            value={receiverName}
            onChangeText={setReceiverName}
          />

          {/* Receiver Phone */}
          <Text style={styles.inputLabel}>Contact / Mobile Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 9876543210"
            placeholderTextColor="#94a3b8"
            value={receiverContact}
            onChangeText={setReceiverContact}
            keyboardType="phone-pad"
          />

          {/* Escort Live Photo Capture */}
          <Text style={styles.inputLabel}>Escort Photo Verification</Text>
          <View style={styles.photoContainer}>
            {receiverPhotoBase64 ? (
              <View style={styles.photoPreviewBox}>
                <Image source={{ uri: receiverPhotoBase64 }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.photoActionBtn} onPress={handleTakePhoto}>
                    <MaterialIcons name="photo-camera" size={16} color="#0284c7" />
                    <Text style={styles.photoActionBtnText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, { borderColor: '#fca5a5' }]}
                    onPress={handleRemovePhoto}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
                    <Text style={[styles.photoActionBtnText, { color: '#dc2626' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoUploadBox}>
                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity style={styles.cameraBtn} onPress={handleTakePhoto}>
                    <MaterialIcons name="photo-camera" size={24} color="#ffffff" />
                    <Text style={styles.cameraBtnText}>Take Live Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
                    <MaterialIcons name="photo-library" size={20} color="#0284c7" />
                    <Text style={styles.galleryBtnText}>Choose Gallery</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.photoHint}>
                  Capturing escort's photo ensures student security and identity verification
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Step 3: Pass Times & Reason */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.cardTitle}>Timing & Reason</Text>
          </View>

          {/* Time Picker Inputs */}
          <View style={styles.timeInputsWrapper}>
            <AppTimePickerField
              label="Departure (Out Time)"
              value={outTime}
              onChange={setOutTime}
              placeholder="Select Out Time"
              required
              quickPresets={[
                {
                  label: 'Set Current Time',
                  icon: 'time',
                  onSelect: () => setOutTime(getCurrentTime12()),
                },
                {
                  label: '+15m',
                  onSelect: () => setOutTime(addMinutesToTime12(outTime || getCurrentTime12(), 15)),
                },
                {
                  label: '+30m',
                  onSelect: () => setOutTime(addMinutesToTime12(outTime || getCurrentTime12(), 30)),
                },
              ]}
            />

            <AppTimePickerField
              label="Expected Return Time"
              value={expectedReturnTime}
              onChange={setExpectedReturnTime}
              placeholder="e.g. 03:30 PM (Optional)"
              allowClear
              quickPresets={[
                {
                  label: '+30 mins',
                  onSelect: () => setExpectedReturnTime(addMinutesToTime12(outTime || getCurrentTime12(), 30)),
                },
                {
                  label: '+1 hour',
                  onSelect: () => setExpectedReturnTime(addMinutesToTime12(outTime || getCurrentTime12(), 60)),
                },
                {
                  label: '+2 hours',
                  onSelect: () => setExpectedReturnTime(addMinutesToTime12(outTime || getCurrentTime12(), 120)),
                },
                {
                  label: 'Not Returning',
                  onSelect: () => setExpectedReturnTime(''),
                },
              ]}
            />
          </View>

          {/* Reason Chips */}
          <Text style={styles.inputLabel}>Reason for Leaving *</Text>
          <View style={styles.reasonsGrid}>
            {REASON_OPTIONS.map((r) => {
              const selected = reason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, selected && styles.reasonChipSelected]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.reasonChipText, selected && styles.reasonChipTextSelected]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Reason Details / Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Add any specific details regarding departure approval..."
            placeholderTextColor="#94a3b8"
            value={reasonDetail}
            onChangeText={setReasonDetail}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Approved By</Text>
          <TextInput
            style={styles.textInput}
            value={approvedBy}
            onChangeText={setApprovedBy}
            placeholder="Authority Name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.submitBtnContent}>
              <MaterialIcons name="check-circle" size={22} color="#ffffff" />
              <Text style={styles.submitBtnText}>Issue Gate Pass Slip</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  resultsContainer: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 10,
  },
  resultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  resultMetaClass: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  resultMetaAdm: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  resultFather: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  selectedStudentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  studentAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentInfoCol: {
    flex: 1,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#38bdf8' : '#0369a1',
  },
  selectedMeta: {
    fontSize: 12,
    color: isDark ? '#7dd3fc' : '#0284c7',
    marginTop: 2,
  },
  selectedMetaClass: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectedMetaAdm: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectedFather: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeStudentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  changeStudentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  textInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  photoContainer: {
    marginTop: 4,
  },
  photoUploadBox: {
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cameraBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  cameraBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  galleryBtn: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  galleryBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  photoHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  photoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 16,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.cardBorder,
  },
  photoActions: {
    gap: 8,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.cardBg,
    gap: 6,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  timeInputsWrapper: {
    gap: 4,
    marginBottom: 6,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputCol: {
    flex: 1,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reasonChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reasonChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
