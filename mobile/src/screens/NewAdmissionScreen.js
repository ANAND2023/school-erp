import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { studentApi, classApi, masterApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateAdmissionSlipHtml, executePrint, executeSharePdf } from '../utils/printTemplates';
import WhatsAppModal from '../components/WhatsAppModal';
import AppDatePicker from '../components/AppDatePicker';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'General' },
  { id: 2, name: 'OBC' },
  { id: 3, name: 'SC' },
  { id: 4, name: 'ST' },
  { id: 5, name: 'EWS' },
];

const DEFAULT_RELIGIONS = [
  { id: 1, name: 'Hindu' },
  { id: 2, name: 'Muslim' },
  { id: 3, name: 'Sikh' },
  { id: 4, name: 'Christian' },
  { id: 5, name: 'Jain' },
  { id: 6, name: 'Other' },
];

export default function NewAdmissionScreen({ route, navigation }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const prefill = route?.params?.prefill;

  const [currentStep, setCurrentStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [religions, setReligions] = useState(DEFAULT_RELIGIONS);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branchInfo, setBranchInfo] = useState(null);

  // Admission Slip Print Modal State
  const [admissionModalVisible, setAdmissionModalVisible] = useState(false);
  const [admittedStudentData, setAdmittedStudentData] = useState(null);
  const [printing, setPrinting] = useState(false);

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    visible: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'admission',
    moduleTitle: 'Admission Confirmation (WhatsApp)',
    templateData: {},
  });

  // STEP 1: ESSENTIAL DETAILS (MANDATORY & QUICK SAVE)
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('2019-05-15');
  const [gender, setGender] = useState('Male');
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [rollNo, setRollNo] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [motherName, setMotherName] = useState('');

  // STEP 2: PERSONAL & ADDRESS (OPTIONAL)
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedReligionId, setSelectedReligionId] = useState(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [pincode, setPincode] = useState('110001');
  const [emergencyContact, setEmergencyContact] = useState('');

  // STEP 3: PARENTS & FAMILY (OPTIONAL)
  const [fatherPhoto, setFatherPhoto] = useState(null);
  const [fatherEmail, setFatherEmail] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [motherPhoto, setMotherPhoto] = useState(null);
  const [motherMobile, setMotherMobile] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');
  const [guardianPhoto, setGuardianPhoto] = useState(null);
  const [guardianName, setGuardianName] = useState('');
  const [guardianMobile, setGuardianMobile] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Guardian');

  // Photo Helpers
  const handleCaptureImage = async (setter) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setter(data);
      }
    } catch (e) {
      console.warn('Camera error:', e);
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const handlePickImage = async (setter) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery permission is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setter(data);
      }
    } catch (e) {
      console.warn('Gallery error:', e);
      Alert.alert('Error', 'Unable to select image.');
    }
  };

  useEffect(() => {
    if (prefill) {
      if (prefill.studentName) {
        const parts = prefill.studentName.trim().split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
      if (prefill.guardianName) setFatherName(prefill.guardianName);
      if (prefill.mobile) setMobile(prefill.mobile);
      if (prefill.email) setFatherEmail(prefill.email);
      if (prefill.classId) setSelectedClassId(prefill.classId);
    }
  }, [prefill]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingClasses(true);
        const [cRes, catRes, relRes] = await Promise.allSettled([
          classApi.getClasses(),
          masterApi.getCategories(),
          masterApi.getReligions(),
        ]);

        if (cRes.status === 'fulfilled') {
          const data = cRes.value.data?.data || cRes.value.data || [];
          setClasses(Array.isArray(data) ? data : []);
          if (data.length > 0 && !selectedClassId) {
            setSelectedClassId(data[0].id);
            if (data[0].sections && data[0].sections.length > 0) {
              setSelectedSectionId(data[0].sections[0].id);
            }
          }
        }
        if (catRes.status === 'fulfilled' && catRes.value.data?.data?.length > 0) {
          setCategories(catRes.value.data.data);
        }
        if (relRes.status === 'fulfilled' && relRes.value.data?.data?.length > 0) {
          setReligions(relRes.value.data.data);
        }
      } catch (err) {
        console.warn('Error loading masters:', err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadData();
    classApi.getBranch().then((res) => {
      if (res.data?.success && res.data?.data) {
        setBranchInfo(res.data.data);
      }
    }).catch(() => {});
  }, []);

  const currentClassObj = classes.find((c) => c.id === selectedClassId);
  const sectionsList = currentClassObj?.sections || [];

  const handleClassSelect = (cls) => {
    setSelectedClassId(cls.id);
    if (cls.sections && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId(null);
    }
  };

  const validateEssential = () => {
    if (!firstName.trim()) {
      Alert.alert('Required Field', 'Please enter Student First Name.');
      return false;
    }
    if (!dob.trim()) {
      Alert.alert('Required Field', 'Please enter Date of Birth (YYYY-MM-DD).');
      return false;
    }
    if (!selectedClassId) {
      Alert.alert('Required Field', 'Please select a Class.');
      return false;
    }
    if (!selectedSectionId && sectionsList.length > 0) {
      setSelectedSectionId(sectionsList[0].id);
    }
    if (!fatherName.trim()) {
      Alert.alert('Required Field', 'Please enter Father / Guardian Name.');
      return false;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit Primary Mobile Number.');
      return false;
    }
    return true;
  };

  const handleQuickAdmit = () => {
    if (!validateEssential()) return;
    handleSubmitAdmission();
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateEssential()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleSubmitAdmission = async () => {
    if (!validateEssential()) return;

    try {
      setSubmitting(true);
      const guardians = [
        {
          relation: 'Father',
          name: fatherName.trim().toUpperCase(),
          mobile: mobile.trim(),
          email: fatherEmail.trim() || null,
          occupation: fatherOccupation.trim() || null,
          isPrimary: true,
        },
      ];

      if (motherName.trim()) {
        guardians.push({
          relation: 'Mother',
          name: motherName.trim().toUpperCase(),
          mobile: motherMobile.trim() || mobile.trim(),
          occupation: motherOccupation.trim() || null,
          isPrimary: false,
        });
      }

      if (guardianName.trim() && guardianName.trim().toUpperCase() !== fatherName.trim().toUpperCase()) {
        guardians.push({
          relation: guardianRelation || 'Guardian',
          name: guardianName.trim().toUpperCase(),
          mobile: guardianMobile.trim() || mobile.trim(),
          isPrimary: false,
        });
      }

      const payload = {
        firstName: firstName.trim().toUpperCase(),
        lastName: lastName.trim() ? lastName.trim().toUpperCase() : '.',
        dateOfBirth: dob ? new Date(dob).toISOString() : new Date('2019-05-15').toISOString(),
        gender: gender,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
        religionId: selectedReligionId ? Number(selectedReligionId) : null,
        bloodGroup: bloodGroup || null,
        aadhaarNo: aadhaarNo.trim() || null,
        classId: Number(selectedClassId),
        sectionId: Number(selectedSectionId || sectionsList[0]?.id || 1),
        rollNo: rollNo ? parseInt(rollNo, 10) : null,
        photoUrl: studentPhoto || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        emergencyContact: emergencyContact.trim() || mobile.trim() || null,
        guardians,
        enquiryId: prefill?.id || null,
      };

      const res = await studentApi.admitStudent(payload);
      const admData = res.data?.data || res.data;
      const admNo = admData?.admissionNo || `ADM-${Date.now().toString().slice(-4)}`;

      // Post family photos as documents if available
      if (admData?.id) {
        if (fatherPhoto) studentApi.addDocument?.(admData.id, { title: 'Father Photo', filePath: fatherPhoto }).catch(() => {});
        if (motherPhoto) studentApi.addDocument?.(admData.id, { title: 'Mother Photo', filePath: motherPhoto }).catch(() => {});
        if (guardianPhoto) studentApi.addDocument?.(admData.id, { title: 'Guardian Photo', filePath: guardianPhoto }).catch(() => {});
      }

      const secName = sectionsList.find((s) => s.id === selectedSectionId)?.name || 'A';
      const admittedStudent = {
        id: admData?.id,
        admissionNo: admNo,
        fullName: `${firstName.trim().toUpperCase()} ${lastName.trim().toUpperCase()}`.trim(),
        firstName: firstName.trim().toUpperCase(),
        lastName: lastName.trim().toUpperCase(),
        dob: dob,
        dateOfBirth: dob,
        gender: gender,
        bloodGroup: bloodGroup,
        aadhaarNo: aadhaarNo,
        categoryName: categories.find((c) => c.id === selectedCategoryId)?.name || 'General',
        religionName: religions.find((r) => r.id === selectedReligionId)?.name || 'Hindu',
        photoUrl: studentPhoto || null,
        fatherPhotoUrl: fatherPhoto || null,
        motherPhotoUrl: motherPhoto || null,
        guardianPhotoUrl: guardianPhoto || null,
        className: currentClassObj?.name || 'Assigned Class',
        sectionName: secName,
        rollNo: rollNo || '—',
        admissionDate: new Date().toISOString(),
        academicYearName: activeAcademicYearName || '2026-27',
        guardianName: fatherName.trim().toUpperCase(),
        guardianMobile: mobile.trim(),
        guardians,
        fatherName: fatherName.trim().toUpperCase(),
        fatherMobile: mobile.trim(),
        fatherOccupation: fatherOccupation?.trim() || '—',
        motherName: motherName?.trim().toUpperCase() || '—',
        motherMobile: motherMobile?.trim() || '—',
        motherOccupation: motherOccupation?.trim() || '—',
        emergencyContact: emergencyContact?.trim() || mobile.trim() || '—',
        address: address ? `${address}`.trim() : city || '—',
        city,
        state,
        pincode,
      };

      setAdmittedStudentData(admittedStudent);
      setAdmissionModalVisible(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to complete admission. Please check required fields.';
      Alert.alert('Admission Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintAdmissionSlip = async () => {
    if (!admittedStudentData) return;
    try {
      setPrinting(true);
      const html = generateAdmissionSlipHtml(admittedStudentData, {
        user,
        branch: branchInfo,
        activeAcademicYearName,
      });
      const fileName = `Admission_Slip_${admittedStudentData.fullName || 'Student'}_${admittedStudentData.admissionNo || 'ADM'}.pdf`;
      await executePrint(html, fileName);
    } finally {
      setPrinting(false);
    }
  };

  const handleShareAdmissionPdf = async () => {
    if (!admittedStudentData) return;
    try {
      setPrinting(true);
      const html = generateAdmissionSlipHtml(admittedStudentData, {
        user,
        branch: branchInfo,
        activeAcademicYearName,
      });
      const fileName = `Admission_Slip_${admittedStudentData.fullName || 'Student'}_${admittedStudentData.admissionNo || 'ADM'}.pdf`;
      await executeSharePdf(html, fileName);
    } finally {
      setPrinting(false);
    }
  };

  const handleResetForNewAdmission = () => {
    setAdmissionModalVisible(false);
    setFirstName('');
    setLastName('');
    setDob('2019-05-15');
    setGender('Male');
    setRollNo('');
    setFatherName('');
    setMobile('');
    setMotherName('');
    setAadhaarNo('');
    setAddress('');
    setStudentPhoto(null);
    setFatherPhoto(null);
    setMotherPhoto(null);
    setGuardianPhoto(null);
    setCurrentStep(1);
  };

  const handleOpenWhatsAppAdmission = (student) => {
    if (!student) return;
    const p = student.guardianMobile || student.mobile || '';
    setWhatsAppModal({
      visible: true,
      recipientName: student.guardianName || student.fullName || 'Parent',
      recipientPhone: p,
      recipientRole: `Parent of ${student.fullName || 'Student'}`,
      moduleKey: 'admission',
      moduleTitle: 'Admission Confirmation (WhatsApp)',
      templateData: {
        ParentName: student.guardianName || 'Parent',
        StudentName: student.fullName || student.firstName || 'Student',
        ClassName: student.className || 'Class',
        Section: student.sectionName || 'A',
        AdmissionNo: student.admissionNo || `ADM-${student.id || ''}`,
        SchoolName: user?.schoolName || branchInfo?.schoolName || 'School',
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Header & Quick Save Bar */}
      <View style={styles.quickSaveBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickSaveTitle}>Student Admission</Text>
          <Text style={styles.quickSaveSub}>
            {currentStep === 1
              ? 'Step 1: Essential Details (Mandatory) *'
              : currentStep === 2
              ? 'Step 2: Personal & Address (Optional)'
              : 'Step 3: Parents & Family (Optional)'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.quickSaveBtn}
          onPress={handleQuickAdmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="flash" size={15} color="#ffffff" />
              <Text style={styles.quickSaveBtnText}>Quick Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Stepper Tabs */}
      <View style={styles.stepperContainer}>
        {[
          { step: 1, label: '1. Essential *' },
          { step: 2, label: '2. Personal' },
          { step: 3, label: '3. Parents' },
        ].map((item, idx) => {
          const isActive = currentStep === item.step;
          const isDone = currentStep > item.step;
          return (
            <React.Fragment key={item.step}>
              {idx > 0 && (
                <View style={[styles.stepLine, currentStep >= item.step && styles.stepLineActive]} />
              )}
              <TouchableOpacity
                style={styles.stepItem}
                onPress={() => {
                  if (item.step < currentStep) setCurrentStep(item.step);
                }}
              >
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isDone && styles.stepCircleDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNum,
                      (isActive || isDone) && styles.stepNumActive,
                    ]}
                  >
                    {isDone ? '✓' : item.step}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isDone && styles.stepLabelDone,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ========================================================================= */}
        {/* STEP 1: ESSENTIAL DETAILS (WEB APP 1ST PAGE - REQUIRED & QUICK SAVE)     */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderBox}>
              <View style={styles.cardHeaderLeft}>
                <MaterialIcons name="star" size={18} color="#e11d48" />
                <Text style={styles.cardTitle}>Essential Details (Required for Admission)</Text>
              </View>
              <View style={styles.badgeMandatory}>
                <Text style={styles.badgeMandatoryText}>Page 1 of 3</Text>
              </View>
            </View>

            <Text style={styles.sectionNotice}>
              ⚡ Fill these required fields and tap <Text style={{ fontWeight: '800', color: '#059669' }}>Quick Save</Text> to admit student instantly, or continue to add optional details.
            </Text>

            {/* 1. Student Photo */}
            <Text style={styles.subSectionTitle}>1. STUDENT PHOTOGRAPH</Text>
            <View style={styles.photoContainer}>
              {studentPhoto ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: studentPhoto }} style={styles.photoPreview} />
                  <View style={styles.photoActionCol}>
                    <TouchableOpacity style={styles.photoRetakeBtn} onPress={() => handleCaptureImage(setStudentPhoto)}>
                      <MaterialIcons name="photo-camera" size={16} color="#0284c7" />
                      <Text style={styles.photoRetakeBtnText}>Live Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoGalleryBtn} onPress={() => handlePickImage(setStudentPhoto)}>
                      <MaterialIcons name="photo-library" size={16} color="#0284c7" />
                      <Text style={styles.photoRetakeBtnText}>Choose Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setStudentPhoto(null)}>
                      <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
                      <Text style={styles.photoRemoveBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoUploadBox}>
                  <View style={styles.photoButtonsRow}>
                    <TouchableOpacity style={styles.cameraBtn} onPress={() => handleCaptureImage(setStudentPhoto)}>
                      <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
                      <Text style={styles.cameraBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.galleryBtn} onPress={() => handlePickImage(setStudentPhoto)}>
                      <MaterialIcons name="photo-library" size={18} color="#0284c7" />
                      <Text style={styles.galleryBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.photoHint}>Passport size photo for identity & admission slip</Text>
                </View>
              )}
            </View>

            {/* 2. Student Identity */}
            <Text style={styles.subSectionTitle}>2. STUDENT IDENTITY</Text>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. AARAV"
                  value={firstName}
                  onChangeText={(text) => setFirstName(text.toUpperCase())}
                  autoCapitalize="characters"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. SHARMA"
                  value={lastName}
                  onChangeText={(text) => setLastName(text.toUpperCase())}
                  autoCapitalize="characters"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <AppDatePicker
                  label="Date of Birth"
                  value={dob}
                  onChange={setDob}
                  required
                  isDob={true}
                  minYear={1995}
                  maxYear={2026}
                  placeholder="Select Birth Date"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Gender *</Text>
                <View style={styles.genderRowCompact}>
                  {['Male', 'Female', 'Other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderChip, gender === g && styles.genderChipActive]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* 3. Class Allotment */}
            <Text style={styles.subSectionTitle}>3. CLASS ALLOTMENT</Text>
            {loadingClasses ? (
              <ActivityIndicator color="#0284c7" style={{ marginVertical: 12 }} />
            ) : (
              <>
                <Text style={styles.label}>Select Class / Grade *</Text>
                <View style={styles.chipsWrap}>
                  {classes.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.classChip, selectedClassId === c.id && styles.classChipActive]}
                      onPress={() => handleClassSelect(c)}
                    >
                      <Text style={[styles.classChipText, selectedClassId === c.id && styles.classChipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {sectionsList.length > 0 && (
                  <>
                    <Text style={[styles.label, { marginTop: 10 }]}>Select Section *</Text>
                    <View style={styles.chipsWrap}>
                      {sectionsList.map((sec) => (
                        <TouchableOpacity
                          key={sec.id}
                          style={[styles.classChip, selectedSectionId === sec.id && styles.classChipActive]}
                          onPress={() => setSelectedSectionId(sec.id)}
                        >
                          <Text style={[styles.classChipText, selectedSectionId === sec.id && styles.classChipTextActive]}>
                            Section {sec.name} {sec.capacity ? `(${sec.capacity})` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[styles.label, { marginTop: 10 }]}>Roll Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1"
                  keyboardType="numeric"
                  value={rollNo}
                  onChangeText={setRollNo}
                  placeholderTextColor="#94a3b8"
                />
              </>
            )}

            {/* 4. Parent / Guardian Contact */}
            <Text style={styles.subSectionTitle}>4. PRIMARY PARENT CONTACT</Text>
            <Text style={styles.label}>Father / Guardian Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. RAJESH SHARMA"
              value={fatherName}
              onChangeText={(text) => setFatherName(text.toUpperCase())}
              autoCapitalize="characters"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Primary Mobile No (10-Digit) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10 digit mobile"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Mother Full Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. SUNITA SHARMA"
                  value={motherName}
                  onChangeText={(text) => setMotherName(text.toUpperCase())}
                  autoCapitalize="characters"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Action Bar on Step 1 */}
            <View style={styles.step1ActionsRow}>
              <TouchableOpacity
                style={styles.directSaveBtn}
                onPress={handleQuickAdmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#ffffff" />
                    <Text style={styles.directSaveBtnText}>Quick Save & Admit</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextStepBtn}
                onPress={handleNext}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.nextStepBtnText}>Next: Personal &rarr;</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PERSONAL & ADDRESS (WEB APP 2ND PAGE - NON-REQUIRED / DETAILED)  */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderBox}>
              <View style={styles.cardHeaderLeft}>
                <MaterialIcons name="person-outline" size={18} color="#0284c7" />
                <Text style={styles.cardTitle}>Personal & Address (Optional)</Text>
              </View>
              <View style={[styles.badgeMandatory, { backgroundColor: '#e0f2fe' }]}>
                <Text style={[styles.badgeMandatoryText, { color: '#0369a1' }]}>Page 2 of 3</Text>
              </View>
            </View>

            {/* Demographics */}
            <Text style={styles.subSectionTitle}>DEMOGRAPHICS & IDENTIFICATION</Text>

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Aadhaar Card No</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12 digit UID"
                  keyboardType="numeric"
                  maxLength={12}
                  value={aadhaarNo}
                  onChangeText={setAadhaarNo}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Blood Group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                    <TouchableOpacity
                      key={bg}
                      style={[styles.smallChip, bloodGroup === bg && styles.smallChipActive]}
                      onPress={() => setBloodGroup(bg)}
                    >
                      <Text style={[styles.smallChipText, bloodGroup === bg && styles.smallChipTextActive]}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Categories */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsWrap}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.smallChip, selectedCategoryId === cat.id && styles.smallChipActive]}
                  onPress={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
                >
                  <Text style={[styles.smallChipText, selectedCategoryId === cat.id && styles.smallChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Religions */}
            <Text style={[styles.label, { marginTop: 10 }]}>Religion</Text>
            <View style={styles.chipsWrap}>
              {religions.map((rel) => (
                <TouchableOpacity
                  key={rel.id}
                  style={[styles.smallChip, selectedReligionId === rel.id && styles.smallChipActive]}
                  onPress={() => setSelectedReligionId(selectedReligionId === rel.id ? null : rel.id)}
                >
                  <Text style={[styles.smallChipText, selectedReligionId === rel.id && styles.smallChipTextActive]}>
                    {rel.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Address */}
            <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>RESIDENTIAL ADDRESS</Text>
            <Text style={styles.label}>House / Street / Area</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Full street address..."
              multiline
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>City / Town</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New Delhi"
                  value={city}
                  onChangeText={setCity}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Delhi"
                  value={state}
                  onChangeText={setState}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  placeholder="110001"
                  keyboardType="numeric"
                  maxLength={6}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Emergency Contact</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10 digit number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Step 2 Action Buttons */}
            <View style={styles.stepActionsRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(1)}>
                <Ionicons name="arrow-back" size={16} color="#64748b" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.directSaveBtn}
                onPress={handleQuickAdmit}
                disabled={submitting}
              >
                <Ionicons name="flash" size={15} color="#ffffff" />
                <Text style={styles.directSaveBtnText}>Quick Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextStepBtn} onPress={handleNext}>
                <Text style={styles.nextStepBtnText}>Next: Parents &rarr;</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: PARENTS & FAMILY (WEB APP 3RD PAGE - FAMILY PHOTOS & OCCUPATION)  */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderBox}>
              <View style={styles.cardHeaderLeft}>
                <MaterialIcons name="family-restroom" size={18} color="#7c3aed" />
                <Text style={styles.cardTitle}>Parents & Family Profile (Optional)</Text>
              </View>
              <View style={[styles.badgeMandatory, { backgroundColor: '#f3e8ff' }]}>
                <Text style={[styles.badgeMandatoryText, { color: '#7c3aed' }]}>Page 3 of 3</Text>
              </View>
            </View>

            {/* Father Details */}
            <Text style={styles.subSectionTitle}>FATHER PROFILE & PHOTO</Text>
            <View style={styles.familyPhotoRow}>
              {fatherPhoto ? (
                <View style={styles.familyPhotoPreviewBox}>
                  <Image source={{ uri: fatherPhoto }} style={styles.familyPhotoPreview} />
                  <TouchableOpacity onPress={() => setFatherPhoto(null)} style={styles.removeCircleBtn}>
                    <MaterialIcons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.familyPhotoButtonsBox}>
                  <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleCaptureImage(setFatherPhoto)}>
                    <MaterialIcons name="photo-camera" size={16} color="#0284c7" />
                    <Text style={styles.photoMiniBtnText}>Father Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handlePickImage(setFatherPhoto)}>
                    <MaterialIcons name="photo-library" size={16} color="#64748b" />
                    <Text style={styles.photoMiniBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Father Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="father@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={fatherEmail}
                  onChangeText={setFatherEmail}
                  placeholderTextColor="#94a3b8"
                />
                <Text style={[styles.label, { marginTop: 6 }]}>Occupation / Business</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Government Service"
                  value={fatherOccupation}
                  onChangeText={setFatherOccupation}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Mother Details */}
            <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>MOTHER PROFILE & PHOTO</Text>
            <View style={styles.familyPhotoRow}>
              {motherPhoto ? (
                <View style={styles.familyPhotoPreviewBox}>
                  <Image source={{ uri: motherPhoto }} style={styles.familyPhotoPreview} />
                  <TouchableOpacity onPress={() => setMotherPhoto(null)} style={styles.removeCircleBtn}>
                    <MaterialIcons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.familyPhotoButtonsBox}>
                  <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleCaptureImage(setMotherPhoto)}>
                    <MaterialIcons name="photo-camera" size={16} color="#0284c7" />
                    <Text style={styles.photoMiniBtnText}>Mother Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handlePickImage(setMotherPhoto)}>
                    <MaterialIcons name="photo-library" size={16} color="#64748b" />
                    <Text style={styles.photoMiniBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Mother Mobile No</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10 digit mobile"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={motherMobile}
                  onChangeText={setMotherMobile}
                  placeholderTextColor="#94a3b8"
                />
                <Text style={[styles.label, { marginTop: 6 }]}>Occupation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Homemaker / Teacher"
                  value={motherOccupation}
                  onChangeText={setMotherOccupation}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Local Guardian Details */}
            <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>LOCAL GUARDIAN (IF APPLICABLE)</Text>
            <View style={styles.familyPhotoRow}>
              {guardianPhoto ? (
                <View style={styles.familyPhotoPreviewBox}>
                  <Image source={{ uri: guardianPhoto }} style={styles.familyPhotoPreview} />
                  <TouchableOpacity onPress={() => setGuardianPhoto(null)} style={styles.removeCircleBtn}>
                    <MaterialIcons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.familyPhotoButtonsBox}>
                  <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleCaptureImage(setGuardianPhoto)}>
                    <MaterialIcons name="photo-camera" size={16} color="#0284c7" />
                    <Text style={styles.photoMiniBtnText}>Guardian Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handlePickImage(setGuardianPhoto)}>
                    <MaterialIcons name="photo-library" size={16} color="#64748b" />
                    <Text style={styles.photoMiniBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Local Guardian Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional guardian name"
                  value={guardianName}
                  onChangeText={(text) => setGuardianName(text.toUpperCase())}
                  autoCapitalize="characters"
                  placeholderTextColor="#94a3b8"
                />
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { marginTop: 6 }]}>Relation</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Uncle"
                      value={guardianRelation}
                      onChangeText={setGuardianRelation}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { marginTop: 6 }]}>Mobile</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10 digit mobile"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={guardianMobile}
                      onChangeText={setGuardianMobile}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Step 3 Action Buttons */}
            <View style={styles.stepActionsRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(2)}>
                <Ionicons name="arrow-back" size={16} color="#64748b" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSubmitBtn}
                onPress={handleSubmitAdmission}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.confirmSubmitBtnText}>Confirm & Admit Student</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* ADMISSION SLIP POPUP MODAL (IDENTICAL TO WEB APP ADMISSION REPORT MODAL) */}
      {/* ========================================================================= */}
      <Modal
        visible={admissionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAdmissionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="verified" size={22} color="#059669" />
                <Text style={styles.modalTitle}>Official Admission Slip</Text>
              </View>
              <TouchableOpacity onPress={() => setAdmissionModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.slipScrollContent}>
              {admittedStudentData && (
                <View style={styles.slipWrapper}>
                  {/* School Header */}
                  <View style={styles.slipSchoolHeader}>
                    <Text style={styles.slipSchoolName}>
                      {user?.schoolName || branchInfo?.schoolName || 'SCHOOL ERP'}
                    </Text>
                    <Text style={styles.slipSchoolSub}>
                      {branchInfo?.address || 'Affiliated Institution'} • Phone: {branchInfo?.phone || user?.mobile || 'N/A'}
                    </Text>
                    <View style={styles.slipBadgeWrap}>
                      <Text style={styles.slipBadgeText}>OFFICIAL STUDENT ADMISSION SLIP</Text>
                    </View>
                  </View>

                  {/* Student Photo & Admission No Hero */}
                  <View style={styles.slipHeroRow}>
                    {admittedStudentData.photoUrl ? (
                      <Image source={{ uri: admittedStudentData.photoUrl }} style={styles.slipPhoto} />
                    ) : (
                      <View style={styles.slipPhotoPlaceholder}>
                        <MaterialIcons name="person" size={44} color="#0284c7" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slipAdmNoLabel}>ADMISSION NUMBER</Text>
                      <Text style={styles.slipAdmNoValue}>{admittedStudentData.admissionNo}</Text>
                      <Text style={styles.slipStudentName}>{admittedStudentData.fullName}</Text>
                      <Text style={styles.slipStudentClass}>
                        {admittedStudentData.className} • Section {admittedStudentData.sectionName}
                        {admittedStudentData.rollNo ? ` • Roll No: ${admittedStudentData.rollNo}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Details Grid */}
                  <View style={styles.slipTable}>
                    <View style={styles.slipRow}>
                      <Text style={styles.slipColLabel}>Date of Admission:</Text>
                      <Text style={styles.slipColVal}>
                        {new Date(admittedStudentData.admissionDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.slipRow}>
                      <Text style={styles.slipColLabel}>Academic Session:</Text>
                      <Text style={styles.slipColVal}>{admittedStudentData.academicYearName}</Text>
                    </View>
                    <View style={styles.slipRow}>
                      <Text style={styles.slipColLabel}>Date of Birth:</Text>
                      <Text style={styles.slipColVal}>{admittedStudentData.dob || '—'}</Text>
                    </View>
                    <View style={styles.slipRow}>
                      <Text style={styles.slipColLabel}>Gender / Blood Group:</Text>
                      <Text style={styles.slipColVal}>
                        {admittedStudentData.gender} • {admittedStudentData.bloodGroup || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.slipRow}>
                      <Text style={styles.slipColLabel}>Father / Guardian:</Text>
                      <Text style={styles.slipColVal}>{admittedStudentData.guardianName || '—'}</Text>
                    </View>
                    <View style={styles.slipRow}>
                      <Text style={styles.slipColLabel}>Primary Mobile:</Text>
                      <Text style={styles.slipColVal}>{admittedStudentData.guardianMobile || '—'}</Text>
                    </View>
                    <View style={styles.slipRow}>
                      <Text style={styles.slipColLabel}>Address:</Text>
                      <Text style={styles.slipColVal}>{admittedStudentData.address || '—'}</Text>
                    </View>
                  </View>

                  {/* Signatures */}
                  <View style={styles.slipSignRow}>
                    <View style={styles.slipSignBox}>
                      <View style={styles.slipSignLine} />
                      <Text style={styles.slipSignLabel}>Parent / Guardian</Text>
                    </View>
                    <View style={styles.slipSignBox}>
                      <View style={styles.slipSignLine} />
                      <Text style={styles.slipSignLabel}>Principal / Admission Officer</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Bar */}
            <View style={styles.modalActionBar}>
              <TouchableOpacity
                style={styles.modalPrintBtn}
                onPress={handlePrintAdmissionSlip}
                disabled={printing}
              >
                <MaterialIcons name="print" size={18} color="#ffffff" />
                <Text style={styles.modalActionText}>Print Slip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalShareBtn}
                onPress={handleShareAdmissionPdf}
                disabled={printing}
              >
                <MaterialIcons name="share" size={18} color="#0284c7" />
                <Text style={[styles.modalActionText, { color: '#0284c7' }]}>PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalWhatsAppBtn}
                onPress={() => handleOpenWhatsAppAdmission(admittedStudentData)}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                <Text style={styles.modalActionText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={handleResetForNewAdmission}
              >
                <Text style={styles.modalDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Modal */}
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
    </KeyboardAvoidingView>
  );
}

function getStyles(colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    quickSaveBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    quickSaveTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    quickSaveSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    quickSaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#059669',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 3,
    },
    quickSaveBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    },

    // Stepper
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    stepCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCircleActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    stepCircleDone: {
      backgroundColor: '#059669',
      borderColor: '#059669',
    },
    stepNum: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    stepNumActive: {
      color: '#ffffff',
    },
    stepLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    stepLabelActive: {
      fontWeight: '800',
      color: colors.primary,
    },
    stepLabelDone: {
      fontWeight: '700',
      color: '#059669',
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 8,
    },
    stepLineActive: {
      backgroundColor: '#059669',
    },

    scrollContent: {
      padding: 14,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeaderBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    badgeMandatory: {
      backgroundColor: '#fee2e2',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    badgeMandatoryText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#dc2626',
    },
    sectionNotice: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 14,
      lineHeight: 17,
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      padding: 8,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#059669',
    },
    subSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      marginTop: 10,
      marginBottom: 8,
      letterSpacing: 0.5,
    },

    // Form inputs
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.text,
      marginBottom: 10,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: 10,
    },

    // Gender
    genderRowCompact: {
      flexDirection: 'row',
      gap: 4,
      marginBottom: 10,
    },
    genderChip: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    genderChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    genderChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    genderChipTextActive: {
      color: '#ffffff',
    },

    // Chips
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    classChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBg,
    },
    classChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    classChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    classChipTextActive: {
      color: '#ffffff',
      fontWeight: '800',
    },
    smallChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBg,
      marginRight: 6,
    },
    smallChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    smallChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
    },
    smallChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },

    // Photos
    photoContainer: {
      marginBottom: 12,
    },
    photoPreviewBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.inputBg,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    photoPreview: {
      width: 74,
      height: 90,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    photoActionCol: {
      flex: 1,
      gap: 6,
    },
    photoRetakeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    },
    photoRetakeBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    photoGalleryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    },
    photoRemoveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    },
    photoRemoveBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#dc2626',
    },
    photoUploadBox: {
      backgroundColor: colors.inputBg,
      borderRadius: 10,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      padding: 12,
      alignItems: 'center',
    },
    photoButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 6,
    },
    cameraBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    cameraBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
    },
    galleryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    galleryBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    photoHint: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // Family Photo Row
    familyPhotoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
    },
    familyPhotoPreviewBox: {
      position: 'relative',
    },
    familyPhotoPreview: {
      width: 70,
      height: 85,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: '#7c3aed',
    },
    removeCircleBtn: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#dc2626',
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    familyPhotoButtonsBox: {
      gap: 6,
      width: 90,
    },
    photoMiniBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      paddingHorizontal: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBg,
    },
    photoMiniBtnText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text,
    },

    // Action Rows
    step1ActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    directSaveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#059669',
      paddingVertical: 12,
      borderRadius: 10,
    },
    directSaveBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    },
    nextStepBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
    },
    nextStepBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    },
    stepActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBg,
    },
    backBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    confirmSubmitBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#059669',
      paddingVertical: 12,
      borderRadius: 10,
    },
    confirmSubmitBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 14,
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      maxHeight: '90%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    slipScrollContent: {
      padding: 14,
    },
    slipWrapper: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#cbd5e1',
      padding: 14,
    },
    slipSchoolHeader: {
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: '#0284c7',
      paddingBottom: 8,
      marginBottom: 10,
    },
    slipSchoolName: {
      fontSize: 16,
      fontWeight: '900',
      color: '#0f172a',
      textAlign: 'center',
    },
    slipSchoolSub: {
      fontSize: 10,
      color: '#64748b',
      textAlign: 'center',
      marginTop: 2,
    },
    slipBadgeWrap: {
      backgroundColor: '#0284c7',
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 12,
      marginTop: 6,
    },
    slipBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    slipHeroRow: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: '#f8fafc',
      padding: 10,
      borderRadius: 8,
      marginBottom: 10,
      alignItems: 'center',
    },
    slipPhoto: {
      width: 60,
      height: 72,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#0284c7',
    },
    slipPhotoPlaceholder: {
      width: 60,
      height: 72,
      borderRadius: 6,
      backgroundColor: '#e0f2fe',
      alignItems: 'center',
      justifyContent: 'center',
    },
    slipAdmNoLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: '#0369a1',
    },
    slipAdmNoValue: {
      fontSize: 15,
      fontWeight: '900',
      color: '#0f172a',
    },
    slipStudentName: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1e293b',
      marginTop: 2,
    },
    slipStudentClass: {
      fontSize: 11,
      fontWeight: '600',
      color: '#475569',
    },
    slipTable: {
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 12,
    },
    slipRow: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    slipColLabel: {
      width: 130,
      fontSize: 11,
      fontWeight: '700',
      color: '#475569',
    },
    slipColVal: {
      flex: 1,
      fontSize: 11,
      fontWeight: '600',
      color: '#0f172a',
    },
    slipSignRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
      paddingHorizontal: 10,
    },
    slipSignBox: {
      alignItems: 'center',
      width: 120,
    },
    slipSignLine: {
      width: '100%',
      height: 1,
      backgroundColor: '#94a3b8',
      marginBottom: 4,
    },
    slipSignLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#64748b',
    },
    modalActionBar: {
      flexDirection: 'row',
      gap: 6,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.cardBg,
    },
    modalPrintBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: '#0284c7',
      paddingVertical: 10,
      borderRadius: 8,
    },
    modalShareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#0284c7',
    },
    modalWhatsAppBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: '#16a34a',
      paddingVertical: 10,
      borderRadius: 8,
    },
    modalDoneBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalDoneBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    modalActionText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
}
