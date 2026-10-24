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
import { studentApi, classApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateAdmissionSlipHtml, executePrint, executeSharePdf } from '../utils/printTemplates';
import WhatsAppModal from '../components/WhatsAppModal';

export default function NewAdmissionScreen({ route, navigation }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const prefill = route?.params?.prefill;

  const [currentStep, setCurrentStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branchInfo, setBranchInfo] = useState(null);

  // Admission Slip Print Modal State
  const [admissionModalVisible, setAdmissionModalVisible] = useState(false);
  const [admittedStudentData, setAdmittedStudentData] = useState(null);
  const [printing, setPrinting] = useState(false);

  // WhatsApp Dialog State (Matching webapp WhatsAppDialog)
  const [whatsAppModal, setWhatsAppModal] = useState({
    visible: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'admission',
    moduleTitle: 'Admission Confirmation (WhatsApp)',
    templateData: {},
  });

  const handleOpenWhatsAppAdmission = (student) => {
    if (!student) return;
    const p = student.guardianMobile || student.emergencyContactNumber || student.mobile || '';
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
        AdmissionNo: student.admissionNo || student.admissionNumber || `ADM-${student.id}`,
        SchoolName: user?.schoolName || branchInfo?.schoolName || 'School',
      },
    });
  };

  // Form Fields - Step 1: Student Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('2015-05-10');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [studentPhoto, setStudentPhoto] = useState(null);

  // Step 2: Academic Allocation
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [rollNo, setRollNo] = useState('');

  // Step 3: Parent & Address
  const [guardianName, setGuardianName] = useState('');
  const [relation, setRelation] = useState('Father');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture student photos.');
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
        setStudentPhoto(data);
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
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
        setStudentPhoto(data);
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
      Alert.alert('Error', 'Unable to select image.');
    }
  };

  const handleRemovePhoto = () => {
    setStudentPhoto(null);
  };

  const handleQuickAdmit = () => {
    if (!firstName.trim()) {
      Alert.alert('Quick Admit Required', 'Please enter Student First Name.');
      return;
    }
    if (!selectedClassId) {
      Alert.alert('Quick Admit Required', 'Please select a Class.');
      return;
    }
    const finalGName = guardianName.trim() || 'Parent of ' + firstName.trim();
    const finalMobile = mobile.trim() || '9999999999';
    if (!guardianName.trim()) setGuardianName(finalGName);
    if (!mobile.trim()) setMobile(finalMobile);
    handleSubmitAdmission(finalGName, finalMobile);
  };

  useEffect(() => {
    // Apply prefill from enquiry if passed
    if (prefill) {
      if (prefill.studentName) {
        const parts = prefill.studentName.trim().split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
      if (prefill.guardianName) setGuardianName(prefill.guardianName);
      if (prefill.mobile) setMobile(prefill.mobile);
      if (prefill.email) setEmail(prefill.email);
      if (prefill.classId) setSelectedClassId(prefill.classId);
    }
  }, [prefill]);

  useEffect(() => {
    async function fetchClasses() {
      try {
        setLoadingClasses(true);
        const res = await classApi.getClasses();
        const data = res.data?.data || res.data || [];
        setClasses(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id);
          if (data[0].sections && data[0].sections.length > 0) {
            setSelectedSectionId(data[0].sections[0].id);
          }
        }
      } catch (err) {
        console.warn('Error fetching classes:', err);
      } finally {
        setLoadingClasses(false);
      }
    }
    fetchClasses();
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

  const handleNext = () => {
    if (currentStep === 1) {
      if (!firstName.trim()) {
        Alert.alert('Validation Error', 'Please enter student First Name.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!selectedClassId) {
        Alert.alert('Validation Error', 'Please select a Class.');
        return;
      }
      if (!selectedSectionId && sectionsList.length > 0) {
        setSelectedSectionId(sectionsList[0].id);
      }
      setCurrentStep(3);
    }
  };

  const handleSubmitAdmission = async (overrideGName = null, overrideMobile = null) => {
    const finalGName = overrideGName || guardianName.trim();
    const finalMobile = overrideMobile || mobile.trim();

    if (!finalGName || !finalMobile) {
      Alert.alert('Validation Error', 'Please enter Guardian Name and Mobile Number.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || '.',
        dateOfBirth: dob ? new Date(dob).toISOString() : new Date('2015-01-01').toISOString(),
        gender: gender,
        bloodGroup: bloodGroup,
        aadhaarNo: aadhaarNo.trim() || null,
        classId: Number(selectedClassId),
        sectionId: Number(selectedSectionId || sectionsList[0]?.id || 1),
        rollNo: rollNo ? parseInt(rollNo, 10) : null,
        photoUrl: studentPhoto || null,
        address: address.trim() || null,
        city: city.trim() || null,
        guardians: [
          {
            name: finalGName,
            relation: relation,
            mobile: finalMobile,
            email: email.trim() || null,
            isPrimary: true,
          },
        ],
        enquiryId: prefill?.id || null,
      };

      const res = await studentApi.admitStudent(payload);
      const admData = res.data?.data || res.data;
      const admNo = admData?.admissionNo || `ADM-${Date.now().toString().slice(-4)}`;

      const admittedStudent = {
        admissionNo: admNo,
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob,
        gender: gender,
        bloodGroup: bloodGroup,
        aadhaarNo: aadhaarNo,
        photoUrl: studentPhoto || null,
        className: currentClassObj?.name || 'Assigned Class',
        sectionName: sectionsList.find((s) => s.id === selectedSectionId)?.name || 'A',
        rollNo: rollNo || '—',
        admissionDate: new Date().toISOString(),
        academicYearName: activeAcademicYearName || '2026-27',
        guardians: [
          {
            name: finalGName,
            relation: relation,
            mobile: finalMobile,
            email: email.trim() || null,
          },
        ],
        address: address ? `${address}, ${city}`.trim() : city || '—',
      };

      setAdmittedStudentData(admittedStudent);
      setAdmissionModalVisible(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to complete admission.';
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
      await executePrint(html);
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
    setRollNo('');
    setGuardianName('');
    setMobile('');
    setEmail('');
    setAddress('');
    setCity('');
    setCurrentStep(1);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Quick Save Bar & Stepper Header */}
      <View style={styles.quickSaveBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickSaveTitle}>New Student Enrollment</Text>
          <Text style={styles.quickSaveSub}>Step {currentStep} of 3</Text>
        </View>
        <TouchableOpacity
          style={styles.quickSaveBtn}
          onPress={handleQuickAdmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={15} color="#ffffff" />
          <Text style={styles.quickSaveBtnText}>Quick Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNum, currentStep >= 1 && styles.stepNumActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Student</Text>
        </View>
        <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNum, currentStep >= 2 && styles.stepNumActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Class</Text>
        </View>
        <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, currentStep >= 3 && styles.stepCircleActive]}>
            <Text style={[styles.stepNum, currentStep >= 3 && styles.stepNumActive]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Guardian</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STEP 1: STUDENT DETAILS */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student Personal Details</Text>

            {/* Student Photo Upload Section */}
            <Text style={styles.label}>Student Photograph</Text>
            <View style={styles.photoContainer}>
              {studentPhoto ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: studentPhoto }} style={styles.photoPreview} />
                  <View style={styles.photoActionCol}>
                    <TouchableOpacity style={styles.photoRetakeBtn} onPress={handleTakePhoto}>
                      <MaterialIcons name="photo-camera" size={16} color="#0284c7" />
                      <Text style={styles.photoRetakeBtnText}>Retake Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoGalleryBtn} onPress={handlePickPhoto}>
                      <MaterialIcons name="photo-library" size={16} color="#0284c7" />
                      <Text style={styles.photoRetakeBtnText}>Choose Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoRemoveBtn} onPress={handleRemovePhoto}>
                      <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
                      <Text style={styles.photoRemoveBtnText}>Remove Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoUploadBox}>
                  <View style={styles.photoButtonsRow}>
                    <TouchableOpacity style={styles.cameraBtn} onPress={handleTakePhoto}>
                      <MaterialIcons name="photo-camera" size={20} color="#ffffff" />
                      <Text style={styles.cameraBtnText}>Take Live Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.galleryBtn} onPress={handlePickPhoto}>
                      <MaterialIcons name="photo-library" size={18} color="#0284c7" />
                      <Text style={styles.galleryBtnText}>Choose Gallery</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.photoHint}>
                    Passport photo for ID card, student profile, and official admission slip
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Aarav"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Verma"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Date of Birth (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="2015-05-10"
              value={dob}
              onChangeText={setDob}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Ionicons
                    name={g === 'Male' ? 'male' : g === 'Female' ? 'female' : 'transgender'}
                    size={16}
                    color={gender === g ? '#ffffff' : '#64748b'}
                  />
                  <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

            <Text style={styles.label}>Aadhaar Card No (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="12 digit Aadhaar number"
              keyboardType="numeric"
              maxLength={12}
              value={aadhaarNo}
              onChangeText={setAadhaarNo}
              placeholderTextColor="#94a3b8"
            />
          </View>
        )}

        {/* STEP 2: CLASS ALLOTMENT */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Class & Section Allotment</Text>

            {loadingClasses ? (
              <ActivityIndicator color="#0284c7" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={styles.label}>Select Class *</Text>
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
                    <Text style={[styles.label, { marginTop: 14 }]}>Select Section *</Text>
                    <View style={styles.chipsWrap}>
                      {sectionsList.map((sec) => (
                        <TouchableOpacity
                          key={sec.id}
                          style={[styles.classChip, selectedSectionId === sec.id && styles.classChipActive]}
                          onPress={() => setSelectedSectionId(sec.id)}
                        >
                          <Text style={[styles.classChipText, selectedSectionId === sec.id && styles.classChipTextActive]}>
                            Section {sec.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[styles.label, { marginTop: 14 }]}>Roll Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 15"
                  keyboardType="numeric"
                  value={rollNo}
                  onChangeText={setRollNo}
                  placeholderTextColor="#94a3b8"
                />
              </>
            )}
          </View>
        )}

        {/* STEP 3: GUARDIAN & CONTACT */}
        {currentStep === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parent / Guardian Details</Text>

            <Text style={styles.label}>Guardian Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Suresh Verma"
              value={guardianName}
              onChangeText={setGuardianName}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Relationship</Text>
            <View style={styles.genderRow}>
              {['Father', 'Mother', 'Guardian'].map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[styles.genderBtn, relation === rel && styles.genderBtnActive]}
                  onPress={() => setRelation(rel)}
                >
                  <Text style={[styles.genderBtnText, relation === rel && styles.genderBtnTextActive]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Primary Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10 digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="parent@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Residential Address</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="House/Street/Area"
              multiline
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>City / Town</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lucknow"
              value={city}
              onChangeText={setCity}
              placeholderTextColor="#94a3b8"
            />
          </View>
        )}

        {/* Bottom Navigation Buttons */}
        <View style={styles.bottomButtonsRow}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Ionicons name="arrow-back" size={18} color="#64748b" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep < 3 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmitAdmission}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Confirm Admission</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* OFFICIAL ADMISSION ACKNOWLEDGEMENT MODAL */}
      <Modal
        visible={admissionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAdmissionModalVisible(false)}
      >
        <View style={styles.admModalOverlay}>
          <View style={styles.admModalContent}>
            {/* Header */}
            <View style={styles.admModalHeader}>
              <View style={styles.admModalTitleRow}>
                <Ionicons name="school" size={22} color="#065f46" />
                <View>
                  <Text style={styles.admModalTitle}>Admission Slip & Acknowledgment</Text>
                  <Text style={styles.admModalSub}>Official Enrollment Form (AdmissionSlipDesigner)</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAdmissionModalVisible(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Preview */}
            <ScrollView contentContainerStyle={styles.admScrollContent}>
              <View style={styles.admSuccessBanner}>
                <Ionicons name="checkmark-circle" size={22} color="#065f46" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.admSuccessTitle}>Student Admitted Successfully! 🎉</Text>
                  <Text style={styles.admSuccessSub}>
                    Permanent Admission No: <Text style={{ fontWeight: '800' }}>{admittedStudentData?.admissionNo}</Text>
                  </Text>
                </View>
              </View>

              {admittedStudentData && (
                <View style={styles.admPaperPreview}>
                  <View style={styles.admPaperTop}>
                    <Text style={styles.admSchoolTitle}>
                      {branchInfo?.schoolName || user?.schoolName || 'DELHI PUBLIC SCHOOL'}
                    </Text>
                    <Text style={styles.admSchoolSub}>
                      Affiliated to CBSE, New Delhi • Affiliation No: {branchInfo?.affiliationNo || '2130892'}
                    </Text>
                    <View style={styles.admPaperBadge}>
                      <Text style={styles.admPaperBadgeText}>ADMISSION & REGISTRATION ACKNOWLEDGEMENT</Text>
                    </View>
                  </View>

                  <View style={styles.admDetailsBox}>
                    <View style={styles.admDetailRow}>
                      <Text style={styles.admDetailLabel}>Scholar / Adm No:</Text>
                      <Text style={[styles.admDetailVal, { color: '#065f46', fontWeight: '800' }]}>
                        {admittedStudentData.admissionNo}
                      </Text>
                    </View>
                    <View style={styles.admDetailRow}>
                      <Text style={styles.admDetailLabel}>Student Full Name:</Text>
                      <Text style={[styles.admDetailVal, { fontWeight: '800' }]}>
                        {admittedStudentData.fullName}
                      </Text>
                    </View>
                    <View style={styles.admDetailRow}>
                      <Text style={styles.admDetailLabel}>Class & Section:</Text>
                      <Text style={styles.admDetailVal}>
                        {admittedStudentData.className} - Section {admittedStudentData.sectionName}
                      </Text>
                    </View>
                    <View style={styles.admDetailRow}>
                      <Text style={styles.admDetailLabel}>Assigned Roll No:</Text>
                      <Text style={styles.admDetailVal}>{admittedStudentData.rollNo || 'Pending'}</Text>
                    </View>
                    <View style={styles.admDetailRow}>
                      <Text style={styles.admDetailLabel}>Academic Session:</Text>
                      <Text style={[styles.admDetailVal, { color: '#065f46' }]}>
                        {admittedStudentData.academicYearName}
                      </Text>
                    </View>
                    <View style={styles.admDetailRow}>
                      <Text style={styles.admDetailLabel}>Guardian Name:</Text>
                      <Text style={styles.admDetailVal}>{guardianName || '—'}</Text>
                    </View>
                    <View style={styles.admDetailRow}>
                      <Text style={styles.admDetailLabel}>Contact Phone:</Text>
                      <Text style={styles.admDetailVal}>{mobile || '—'}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions - Fixed 2-tier layout that never squashes */}
            <View style={styles.admModalActions}>
              <TouchableOpacity
                style={[styles.admPrintBtnPrimary, printing && { opacity: 0.7 }]}
                onPress={handlePrintAdmissionSlip}
                disabled={printing}
                activeOpacity={0.8}
              >
                {printing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="print" size={20} color="#ffffff" />
                    <Text style={styles.admPrintBtnPrimaryText}>Print Official Admission Slip</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.admSecondaryRow}>
                <TouchableOpacity
                  style={[styles.admShareBtn, printing && { opacity: 0.7 }]}
                  onPress={handleShareAdmissionPdf}
                  disabled={printing}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={18} color="#065f46" />
                  <Text style={styles.admShareBtnText}>Share PDF</Text>
                </TouchableOpacity>

                {mobile ? (
                  <TouchableOpacity
                    style={[styles.admWaBtn, printing && { opacity: 0.7 }]}
                    onPress={() => handleOpenWhatsAppAdmission(admittedStudentData)}
                    disabled={printing}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                    <Text style={styles.admWaBtnText}>WhatsApp Slip</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.admModalNavRow}>
              <TouchableOpacity
                style={styles.admNavSecondary}
                onPress={handleResetForNewAdmission}
              >
                <Ionicons name="person-add-outline" size={16} color="#0284c7" />
                <Text style={styles.admNavSecondaryText}>Admit Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.admNavPrimary}
                onPress={() => {
                  setAdmissionModalVisible(false);
                  navigation.navigate('Students');
                }}
              >
                <Text style={styles.admNavPrimaryText}>Go to Students List</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? '#334155' : '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepNumActive: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepLine: {
    width: 45,
    height: 2,
    backgroundColor: isDark ? '#334155' : '#e2e8f0',
    marginHorizontal: 8,
    marginBottom: 14,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 6,
  },
  genderBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#ffffff',
  },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  smallChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  smallChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.inputBorder,
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
  bottomButtonsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: 6,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.success,
    gap: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Admission Modal Styles
  admModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  admModalContent: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  admModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
  },
  admModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  admModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: isDark ? '#6ee7b7' : '#065f46',
  },
  admModalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  admScrollContent: {
    padding: 16,
  },
  admSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#059669' : '#86efac',
    marginBottom: 14,
  },
  admSuccessTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: isDark ? '#6ee7b7' : '#15803d',
  },
  admSuccessSub: {
    fontSize: 12,
    color: isDark ? '#a7f3d0' : '#166534',
    marginTop: 2,
  },
  admPaperPreview: {
    borderWidth: 1.5,
    borderColor: isDark ? '#059669' : '#065f46',
    borderRadius: 10,
    padding: 14,
    backgroundColor: colors.cardBg,
  },
  admPaperTop: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: isDark ? '#059669' : '#065f46',
    paddingBottom: 8,
    marginBottom: 10,
  },
  admSchoolTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: isDark ? '#6ee7b7' : '#065f46',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  admSchoolSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  admPaperBadge: {
    backgroundColor: isDark ? '#065f46' : '#065f46',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  admPaperBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  admDetailsBox: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 10,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    gap: 6,
  },
  admDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  admDetailLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  admDetailVal: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  admModalActions: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 10,
    backgroundColor: colors.cardBg,
  },
  admPrintBtnPrimary: {
    backgroundColor: isDark ? '#059669' : '#065f46',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  admPrintBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  admSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  admShareBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#059669' : '#065f46',
    backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
  },
  admShareBtnText: {
    color: isDark ? '#6ee7b7' : '#065f46',
    fontSize: 13,
    fontWeight: '700',
  },
  admWaBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  admWaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Quick Save Bar
  quickSaveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  quickSaveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickSaveSub: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  quickSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  quickSaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Photo Upload Styles
  photoContainer: {
    marginBottom: 16,
  },
  photoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.inputBg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  photoPreview: {
    width: 80,
    height: 96,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  photoActionCol: {
    flex: 1,
    gap: 8,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  photoUploadBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    padding: 14,
    alignItems: 'center',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cameraBtnText: {
    fontSize: 13,
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
    paddingVertical: 10,
    borderRadius: 8,
  },
  galleryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  photoHint: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  admModalNavRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    backgroundColor: colors.cardBg,
  },
  admNavSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: isDark ? '#1e293b' : '#f0f9ff',
    borderWidth: 1,
    borderColor: isDark ? '#0369a1' : '#bae6fd',
  },
  admNavSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  admNavPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  admNavPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
