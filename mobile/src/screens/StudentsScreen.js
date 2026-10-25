import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Modal,
  ScrollView,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { studentApi, classApi, masterApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
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

export default function StudentsScreen({ navigation }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { hasPermission, isSuperAdmin } = usePermission();
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canAdd = isSuperAdmin || hasPermission(['Admissions', 'Students'], 'Add');
  const canEdit = isSuperAdmin || hasPermission('Students', 'Edit');
  const canPrint = isSuperAdmin || hasPermission('Students', 'Print');

  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [religions, setReligions] = useState(DEFAULT_RELIGIONS);
  const [selectedClassId, setSelectedClassId] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Detail Modal & Print
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [branchInfo, setBranchInfo] = useState(null);
  const [printing, setPrinting] = useState(false);

  // Direct Admission Slip Modal State
  const [slipModalVisible, setSlipModalVisible] = useState(false);
  const [slipStudent, setSlipStudent] = useState(null);

  // =========================================================================
  // COMPLETE STUDENT EDIT MODAL STATE (MATCHING WEB APP STUDENT PROFILE EDIT)
  // =========================================================================
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editActiveTab, setEditActiveTab] = useState(0); // 0: Identity, 1: Personal, 2: Family

  // Tab 1: Identity & Class
  const [editStudentId, setEditStudentId] = useState(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editAdmissionNo, setEditAdmissionNo] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editClassId, setEditClassId] = useState(null);
  const [editSectionId, setEditSectionId] = useState(null);
  const [editRollNo, setEditRollNo] = useState('');
  const [editStatus, setEditStatus] = useState(1);

  // Tab 2: Personal & Demographics
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editAadhaarNo, setEditAadhaarNo] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editReligionId, setEditReligionId] = useState(null);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');

  // Tab 3: Parents & Family
  const [editFatherPhoto, setEditFatherPhoto] = useState(null);
  const [editFatherName, setEditFatherName] = useState('');
  const [editFatherMobile, setEditFatherMobile] = useState('');
  const [editFatherEmail, setEditFatherEmail] = useState('');
  const [editFatherOccupation, setEditFatherOccupation] = useState('');

  const [editMotherPhoto, setEditMotherPhoto] = useState(null);
  const [editMotherName, setEditMotherName] = useState('');
  const [editMotherMobile, setEditMotherMobile] = useState('');
  const [editMotherOccupation, setEditMotherOccupation] = useState('');

  const [editGuardianPhoto, setEditGuardianPhoto] = useState(null);
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianMobile, setEditGuardianMobile] = useState('');
  const [editGuardianRelation, setEditGuardianRelation] = useState('Guardian');

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    visible: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'admission',
    moduleTitle: 'Student Admission Confirmation (WhatsApp)',
    templateData: {},
  });

  const handleOpenWhatsApp = (student) => {
    if (!student) return;
    const phone = student.guardianMobile || student.emergencyContactNumber || student.mobile || '';
    setWhatsAppModal({
      visible: true,
      recipientName: student.guardianName || student.fullName || student.firstName || 'Guardian',
      recipientPhone: phone,
      recipientRole: `Parent of ${student.fullName || student.firstName || 'Student'}`,
      moduleKey: 'admission',
      moduleTitle: 'Student Notification (WhatsApp)',
      templateData: {
        ParentName: student.guardianName || 'Parent',
        StudentName: student.fullName || student.firstName || 'Student',
        ClassName: student.className || 'Class',
        Section: student.sectionName || 'A',
        AdmissionNo: student.admissionNo || student.admissionNumber || `ADM-${student.id}`,
        SchoolName: user?.schoolName || branchInfo?.schoolName || 'School',
        SchoolPhone: user?.schoolPhone || user?.mobile || branchInfo?.phone || '',
      },
    });
  };

  const handleOpenAdmissionSlip = async (student) => {
    try {
      setDetailLoading(true);
      const res = await studentApi.getStudentDetail(student.id);
      const full = res.data?.data || student;
      setSlipStudent(full);
      setSlipModalVisible(true);
    } catch (e) {
      setSlipStudent(student);
      setSlipModalVisible(true);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [cRes, catRes, relRes, bRes] = await Promise.allSettled([
        classApi.getClasses(),
        masterApi.getCategories(),
        masterApi.getReligions(),
        classApi.getBranch(),
      ]);

      if (cRes.status === 'fulfilled' && cRes.value.data?.data) {
        setClasses(cRes.value.data.data);
      }
      if (catRes.status === 'fulfilled' && catRes.value.data?.data?.length > 0) {
        setCategories(catRes.value.data.data);
      }
      if (relRes.status === 'fulfilled' && relRes.value.data?.data?.length > 0) {
        setReligions(relRes.value.data.data);
      }
      if (bRes.status === 'fulfilled' && bRes.value.data?.data) {
        setBranchInfo(bRes.value.data.data);
      }
    } catch (e) {
      console.warn('Initial data load error:', e);
    }
  };

  const fetchStudents = async (targetPage = 1, append = false) => {
    try {
      if (targetPage === 1) setLoading(true);

      const params = {
        pageNo: targetPage,
        pageSize: 20,
      };

      if (searchText.trim()) {
        params.search = searchText.trim();
      }

      if (selectedClassId) {
        params.classId = selectedClassId;
      }

      const res = await studentApi.getStudents(params);
      if (res.data?.success && res.data?.data) {
        const { items, totalPages } = res.data.data;
        if (append) {
          setStudents((prev) => [...prev, ...items]);
        } else {
          setStudents(items || []);
        }
        setHasMore(targetPage < totalPages);
        setPage(targetPage);
      }
    } catch (e) {
      console.warn('Student list fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents(1, false);
  }, [selectedClassId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStudents(1, false);
  }, [selectedClassId, searchText]);

  const handleSearch = () => {
    fetchStudents(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchStudents(page + 1, true);
    }
  };

  const openStudentDetail = async (studentId) => {
    try {
      setDetailLoading(true);
      const res = await studentApi.getStudentDetail(studentId);
      if (res.data?.success && res.data?.data) {
        setSelectedStudentDetail(res.data.data);
      } else {
        Alert.alert('Error', 'Unable to load profile.');
      }
    } catch (e) {
      console.warn('Detail error:', e);
      Alert.alert('Error', 'Failed to fetch student details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // =========================================================================
  // OPEN EDIT STUDENT MODAL WITH COMPLETE PRE-FILLED DATA
  // =========================================================================
  const handleOpenEditStudent = async (student) => {
    if (!student?.id) return;
    try {
      setEditLoading(true);
      setEditModalVisible(true);
      setEditActiveTab(0);

      // Fetch full detailed profile from server
      const res = await studentApi.getStudentDetail(student.id);
      const detail = res.data?.data || student;

      const father = detail.guardians?.find((g) => g.relation?.toLowerCase() === 'father');
      const mother = detail.guardians?.find((g) => g.relation?.toLowerCase() === 'mother');
      const otherGuardian =
        detail.guardians?.find((g) => g.relation?.toLowerCase() !== 'father' && g.relation?.toLowerCase() !== 'mother') ||
        detail.guardians?.find((g) => g.isPrimary) ||
        null;

      const fatherDoc = detail.documents?.find((d) => d.title?.toLowerCase().includes('father'));
      const motherDoc = detail.documents?.find((d) => d.title?.toLowerCase().includes('mother'));
      const guardianDoc = detail.documents?.find((d) => d.title?.toLowerCase().includes('guardian'));

      const clsId = detail.currentEnrollment?.classId || detail.classId || (classes.length > 0 ? classes[0].id : null);
      const secId = detail.currentEnrollment?.sectionId || detail.sectionId || null;

      setEditStudentId(detail.id);
      setEditPhotoUrl(detail.photoUrl || null);
      setEditFirstName(detail.firstName || '');
      setEditLastName(detail.lastName || '');
      setEditAdmissionNo(detail.admissionNo || '');
      setEditDob((detail.dateOfBirth || detail.dob || '2019-05-15').split('T')[0]);
      setEditGender(detail.gender || 'Male');
      setEditClassId(clsId);
      setEditSectionId(secId);
      setEditRollNo(
        detail.currentEnrollment?.rollNo != null
          ? String(detail.currentEnrollment.rollNo)
          : detail.rollNo != null
          ? String(detail.rollNo)
          : ''
      );
      setEditStatus(detail.status ?? 1);

      // Tab 2
      setEditBloodGroup(detail.bloodGroup || 'B+');
      setEditAadhaarNo(detail.aadhaarNo || '');
      setEditCategoryId(detail.categoryId || null);
      setEditReligionId(detail.religionId || null);
      setEditAddress(detail.address || '');
      setEditCity(detail.city || '');
      setEditState(detail.state || '');
      setEditPincode(detail.pincode || '');
      setEditEmergencyContact(detail.emergencyContact || '');

      // Tab 3
      setEditFatherName(father?.name || detail.fatherName || detail.guardianName || '');
      setEditFatherMobile(father?.mobile || detail.fatherMobile || detail.guardianMobile || '');
      setEditFatherEmail(father?.email || detail.fatherEmail || '');
      setEditFatherOccupation(father?.occupation || detail.fatherOccupation || '');
      setEditFatherPhoto(fatherDoc?.filePath || null);

      setEditMotherName(mother?.name || detail.motherName || '');
      setEditMotherMobile(mother?.mobile || detail.motherMobile || '');
      setEditMotherOccupation(mother?.occupation || detail.motherOccupation || '');
      setEditMotherPhoto(motherDoc?.filePath || null);

      setEditGuardianName(otherGuardian?.name || '');
      setEditGuardianMobile(otherGuardian?.mobile || '');
      setEditGuardianRelation(otherGuardian?.relation || 'Guardian');
      setEditGuardianPhoto(guardianDoc?.filePath || null);
    } catch (e) {
      console.warn('Error loading student edit detail:', e);
      Alert.alert('Error', 'Unable to fetch student details for editing.');
    } finally {
      setEditLoading(false);
    }
  };

  // Photo handlers for Edit
  const handleEditCapture = async (setter) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setter(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
      }
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  const handleEditPick = async (setter) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Gallery permission is required.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setter(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
      }
    } catch (e) {
      console.warn('Gallery error:', e);
    }
  };

  // =========================================================================
  // SAVE EDITED STUDENT (MATCHING WEB APP UpdateStudentRequestDto)
  // =========================================================================
  const handleSaveEditStudent = async () => {
    if (!editFirstName.trim()) {
      Alert.alert('Validation Error', 'Student First Name is required.');
      setEditActiveTab(0);
      return;
    }
    if (!editDob.trim()) {
      Alert.alert('Validation Error', 'Date of Birth (DOB) is required.');
      setEditActiveTab(0);
      return;
    }

    try {
      setEditSaving(true);

      const guardiansPayload = [];
      if (editFatherName.trim() || editFatherMobile.trim()) {
        guardiansPayload.push({
          relation: 'Father',
          name: editFatherName.trim().toUpperCase(),
          mobile: editFatherMobile.trim() || editEmergencyContact.trim() || '—',
          email: editFatherEmail.trim() || null,
          occupation: editFatherOccupation.trim() || null,
          isPrimary: true,
        });
      }

      if (editMotherName.trim() || editMotherMobile.trim()) {
        guardiansPayload.push({
          relation: 'Mother',
          name: editMotherName.trim().toUpperCase(),
          mobile: editMotherMobile.trim() || editFatherMobile.trim() || '—',
          occupation: editMotherOccupation.trim() || null,
          isPrimary: guardiansPayload.length === 0,
        });
      }

      if (
        editGuardianName.trim() &&
        editGuardianName.trim().toUpperCase() !== editFatherName.trim().toUpperCase() &&
        editGuardianName.trim().toUpperCase() !== editMotherName.trim().toUpperCase()
      ) {
        guardiansPayload.push({
          relation: editGuardianRelation.trim() || 'Guardian',
          name: editGuardianName.trim().toUpperCase(),
          mobile: editGuardianMobile.trim() || editFatherMobile.trim() || '—',
          isPrimary: guardiansPayload.length === 0,
        });
      }

      const payload = {
        firstName: editFirstName.trim().toUpperCase(),
        lastName: editLastName.trim() ? editLastName.trim().toUpperCase() : '',
        admissionNo: editAdmissionNo.trim() || null,
        dateOfBirth: editDob ? new Date(editDob).toISOString() : new Date().toISOString(),
        gender: editGender || 'Male',
        categoryId: editCategoryId ? Number(editCategoryId) : null,
        religionId: editReligionId ? Number(editReligionId) : null,
        bloodGroup: editBloodGroup || null,
        aadhaarNo: editAadhaarNo.trim() || null,
        status: Number(editStatus),
        classId: editClassId ? Number(editClassId) : null,
        sectionId: editSectionId ? Number(editSectionId) : null,
        rollNo: editRollNo !== '' ? parseInt(editRollNo, 10) : null,
        address: editAddress.trim() || null,
        city: editCity.trim() || null,
        state: editState.trim() || null,
        pincode: editPincode.trim() || null,
        emergencyContact: editEmergencyContact.trim() || null,
        photoUrl: editPhotoUrl || null,
        fatherPhotoUrl: editFatherPhoto || null,
        motherPhotoUrl: editMotherPhoto || null,
        guardianPhotoUrl: editGuardianPhoto || null,
        guardians: guardiansPayload,
      };

      const res = await studentApi.updateStudent(editStudentId, payload);
      Alert.alert('Success', res.data?.message || 'Student profile updated successfully!');
      setEditModalVisible(false);

      // Refresh directory and profile modal if opened
      fetchStudents(page, false);
      if (selectedStudentDetail && selectedStudentDetail.id === editStudentId) {
        openStudentDetail(editStudentId);
      }
    } catch (e) {
      console.warn('Update error:', e);
      const msg = e.response?.data?.message || 'Failed to update student profile. Please check inputs.';
      Alert.alert('Update Failed', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handlePrintStudentSlip = async () => {
    if (!selectedStudentDetail) return;
    try {
      setPrinting(true);
      const html = generateAdmissionSlipHtml(selectedStudentDetail, {
        user,
        branch: branchInfo,
        activeAcademicYearName,
      });
      const fileName = `Admission_Slip_${selectedStudentDetail.fullName || 'Student'}_${selectedStudentDetail.admissionNo || 'ADM'}.pdf`;
      await executePrint(html, fileName);
    } finally {
      setPrinting(false);
    }
  };

  const handleShareStudentSlip = async () => {
    if (!selectedStudentDetail) return;
    try {
      setPrinting(true);
      const html = generateAdmissionSlipHtml(selectedStudentDetail, {
        user,
        branch: branchInfo,
        activeAcademicYearName,
      });
      const fileName = `Admission_Slip_${selectedStudentDetail.fullName || 'Student'}_${selectedStudentDetail.admissionNo || 'ADM'}.pdf`;
      await executeSharePdf(html, fileName);
    } finally {
      setPrinting(false);
    }
  };

  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Error', 'Unable to place call.');
    });
  };

  // Selected edit class object to populate its sections
  const editSelectedClassObj = classes.find((c) => c.id === editClassId);
  const editSectionsList = editSelectedClassObj?.sections || [];

  const renderStudent = ({ item }) => {
    const guardianName = item.guardianName || item.guardians?.[0]?.name || '';
    const mobile = item.guardianMobile || item.guardians?.[0]?.mobile || item.emergencyContact;
    const clsName = item.className || item.currentClass || 'N/A';
    const secName = item.sectionName || item.currentSection;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => openStudentDetail(item.id)}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={24} color="#0284c7" />
              </View>
            )}

            <View style={styles.infoCol}>
              <Text style={styles.studentName}>
                {item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim()}
              </Text>
              <Text style={styles.classText}>
                Class: {clsName} {secName ? `(${secName})` : ''} • Adm: {item.admissionNo}
              </Text>
              {guardianName ? (
                <Text style={styles.fatherText}>Guardian: {guardianName}</Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons Strip */}
        <View style={styles.cardActionsRow}>
          {/* 1. View Profile */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => openStudentDetail(item.id)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="visibility" size={15} color="#2563eb" />
            <Text style={[styles.cardActionBtnText, { color: '#2563eb' }]}>Profile</Text>
          </TouchableOpacity>

          {/* 2. EDIT STUDENT (Full Edit Mode) */}
          {canEdit && (
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => handleOpenEditStudent(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={15} color="#ea580c" />
              <Text style={[styles.cardActionBtnText, { color: '#ea580c' }]}>Edit</Text>
            </TouchableOpacity>
          )}

          {/* 3. Collect Fee */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => navigation.navigate('Fees', { student: item, studentId: item.id })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="receipt-long" size={15} color="#059669" />
            <Text style={[styles.cardActionBtnText, { color: '#059669' }]}>Fees</Text>
          </TouchableOpacity>

          {/* 4. Official Admission Slip */}
          {canPrint && (
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => handleOpenAdmissionSlip(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="print" size={15} color="#0284c7" />
              <Text style={[styles.cardActionBtnText, { color: '#0284c7' }]}>Slip</Text>
            </TouchableOpacity>
          )}

          {/* 5. Issue Gate Pass */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => navigation.navigate('IssueGatePass', { prefillStudent: item })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="badge" size={15} color="#d97706" />
            <Text style={[styles.cardActionBtnText, { color: '#d97706' }]}>Gate Pass</Text>
          </TouchableOpacity>

          {/* 6. WhatsApp to Parent */}
          {mobile ? (
            <TouchableOpacity
              style={[styles.cardActionIconBtn, { backgroundColor: '#f0fdf4' }]}
              onPress={() => handleOpenWhatsApp(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#16a34a" />
            </TouchableOpacity>
          ) : null}

          {/* 7. Phone Call to Parent */}
          {mobile ? (
            <TouchableOpacity
              style={[styles.cardActionIconBtn, { backgroundColor: '#eff6ff' }]}
              onPress={() => handleCall(mobile)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="phone" size={15} color="#2563eb" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar & New Admission Button */}
      <View style={styles.searchContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.searchBox, { flex: 1 }]}>
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student name or admission no..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchText(''); fetchStudents(1, false); }}>
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          {canAdd && (
            <TouchableOpacity
              style={styles.addStudentBtn}
              onPress={() => navigation.navigate('NewAdmission')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="person-add" size={18} color="#ffffff" />
              <Text style={styles.addStudentBtnText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Class Filter Chips */}
      <View style={styles.filterBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          <TouchableOpacity
            style={[styles.chip, selectedClassId === null && styles.chipActive]}
            onPress={() => setSelectedClassId(null)}
          >
            <Text style={[styles.chipText, selectedClassId === null && styles.chipTextActive]}>
              All Classes
            </Text>
          </TouchableOpacity>
          {classes.map((cls) => {
            const active = cls.id === selectedClassId;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedClassId(cls.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Student List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="school" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Students Found</Text>
          <Text style={styles.emptyDesc}>Try adjusting your search criteria</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* ========================================================================= */}
      {/* STUDENT PROFILE VIEW MODAL                                               */}
      {/* ========================================================================= */}
      <Modal
        visible={!!selectedStudentDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedStudentDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Profile</Text>
              <TouchableOpacity onPress={() => setSelectedStudentDetail(null)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedStudentDetail && (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.profileHero}>
                  {selectedStudentDetail.photoUrl ? (
                    <Image source={{ uri: selectedStudentDetail.photoUrl }} style={styles.heroAvatar} />
                  ) : (
                    <View style={styles.heroAvatarPlaceholder}>
                      <MaterialIcons name="person" size={40} color="#0284c7" />
                    </View>
                  )}
                  <Text style={styles.heroName}>{selectedStudentDetail.fullName}</Text>
                  <Text style={styles.heroClass}>
                    Class: {selectedStudentDetail.currentClass || 'N/A'} • Adm: {selectedStudentDetail.admissionNo}
                  </Text>

                  {/* Direct Edit Button inside Profile */}
                  {canEdit && (
                    <TouchableOpacity
                      style={styles.heroEditBtn}
                      onPress={() => {
                        const s = selectedStudentDetail;
                        setSelectedStudentDetail(null);
                        handleOpenEditStudent(s);
                      }}
                    >
                      <MaterialIcons name="edit" size={15} color="#ffffff" />
                      <Text style={styles.heroEditBtnText}>Edit Student Profile</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Details Section */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionHeading}>Academic & Personal Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Admission Date</Text>
                    <Text style={styles.detailVal}>
                      {selectedStudentDetail.admissionDate ? new Date(selectedStudentDetail.admissionDate).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date of Birth</Text>
                    <Text style={styles.detailVal}>
                      {selectedStudentDetail.dob ? new Date(selectedStudentDetail.dob).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gender</Text>
                    <Text style={styles.detailVal}>{selectedStudentDetail.gender || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Blood Group</Text>
                    <Text style={styles.detailVal}>{selectedStudentDetail.bloodGroup || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aadhaar Card No</Text>
                    <Text style={styles.detailVal}>{selectedStudentDetail.aadhaarNo || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailVal}>{selectedStudentDetail.address || 'N/A'}</Text>
                  </View>
                </View>

                {/* Guardian Section */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionHeading}>Parent & Guardian Contacts</Text>
                  {selectedStudentDetail.guardians?.map((g, idx) => (
                    <View key={idx} style={styles.guardianItem}>
                      <View style={styles.guardianInfo}>
                        <Text style={styles.guardianName}>
                          {g.name} <Text style={styles.guardianRel}>({g.relation})</Text>
                        </Text>
                        {g.mobile ? <Text style={styles.guardianPhone}>{g.mobile}</Text> : null}
                      </View>
                      {g.mobile ? (
                        <TouchableOpacity style={styles.callIconBtn} onPress={() => handleCall(g.mobile)}>
                          <MaterialIcons name="phone" size={18} color="#ffffff" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Emergency Contact */}
                {selectedStudentDetail.emergencyContact ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Emergency Contact</Text>
                    <View style={styles.guardianItem}>
                      <Text style={styles.guardianPhone}>{selectedStudentDetail.emergencyContact}</Text>
                      <TouchableOpacity
                        style={styles.callIconBtn}
                        onPress={() => handleCall(selectedStudentDetail.emergencyContact)}
                      >
                        <MaterialIcons name="phone" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Print Official Admission Slip Action Bar */}
                {canPrint && (
                  <View style={styles.modalPrintRow}>
                    <TouchableOpacity
                      style={[styles.modalPrintBtn, printing && { opacity: 0.7 }]}
                      onPress={handlePrintStudentSlip}
                      disabled={printing}
                    >
                      {printing ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="print" size={18} color="#ffffff" />
                          <Text style={styles.modalPrintBtnText}>Print Official Admission Slip</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalShareBtn, printing && { opacity: 0.7 }]}
                      onPress={handleShareStudentSlip}
                      disabled={printing}
                    >
                      <Ionicons name="share-social-outline" size={18} color="#065f46" />
                      <Text style={styles.modalShareBtnText}>Share PDF</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* COMPLETE STUDENT EDIT MODAL (ALL FIELDS FROM WEB APP INCLUDED)            */}
      {/* ========================================================================= */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="edit" size={20} color="#ea580c" />
                <Text style={styles.modalTitle}>Edit Student Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {editLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Loading student details...</Text>
              </View>
            ) : (
              <>
                {/* Tabs Ribbon */}
                <View style={styles.editTabsRow}>
                  {[
                    { id: 0, label: '1. Identity & Class' },
                    { id: 1, label: '2. Personal' },
                    { id: 2, label: '3. Parents & Family' },
                  ].map((tab) => {
                    const active = editActiveTab === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={[styles.editTabBtn, active && styles.editTabBtnActive]}
                        onPress={() => setEditActiveTab(tab.id)}
                      >
                        <Text style={[styles.editTabBtnText, active && styles.editTabBtnTextActive]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                  {/* ============================================================= */}
                  {/* TAB 0: IDENTITY & CLASS                                       */}
                  {/* ============================================================= */}
                  {editActiveTab === 0 && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeading}>Student Identity & Photograph</Text>

                      {/* Photo Capture / Select */}
                      <View style={styles.editPhotoContainer}>
                        {editPhotoUrl ? (
                          <View style={styles.editPhotoPreviewBox}>
                            <Image source={{ uri: editPhotoUrl }} style={styles.editPhotoImg} />
                            <View style={{ flex: 1, gap: 6 }}>
                              <TouchableOpacity style={styles.editPhotoBtn} onPress={() => handleEditCapture(setEditPhotoUrl)}>
                                <MaterialIcons name="photo-camera" size={15} color="#0284c7" />
                                <Text style={styles.editPhotoBtnText}>Retake Camera</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.editPhotoBtn} onPress={() => handleEditPick(setEditPhotoUrl)}>
                                <MaterialIcons name="photo-library" size={15} color="#0284c7" />
                                <Text style={styles.editPhotoBtnText}>Choose Gallery</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.editPhotoBtn, { backgroundColor: '#fee2e2' }]} onPress={() => setEditPhotoUrl(null)}>
                                <MaterialIcons name="delete-outline" size={15} color="#dc2626" />
                                <Text style={[styles.editPhotoBtnText, { color: '#dc2626' }]}>Remove</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.editPhotoUploadBox}>
                            <TouchableOpacity style={styles.editPhotoActionBtn} onPress={() => handleEditCapture(setEditPhotoUrl)}>
                              <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
                              <Text style={styles.editPhotoActionBtnText}>Take Live Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.editPhotoActionBtn, { backgroundColor: '#e0f2fe' }]} onPress={() => handleEditPick(setEditPhotoUrl)}>
                              <MaterialIcons name="photo-library" size={18} color="#0284c7" />
                              <Text style={[styles.editPhotoActionBtnText, { color: '#0284c7' }]}>Gallery</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* Name Fields */}
                      <View style={styles.fieldRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>First Name *</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editFirstName}
                            onChangeText={setEditFirstName}
                            autoCapitalize="characters"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Last Name</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editLastName}
                            onChangeText={setEditLastName}
                            autoCapitalize="characters"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>

                      <View style={styles.fieldRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Admission Number</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editAdmissionNo}
                            onChangeText={setEditAdmissionNo}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppDatePicker
                            label="Date of Birth"
                            value={editDob}
                            onChange={setEditDob}
                            required
                            isDob={true}
                            minYear={1995}
                            maxYear={2026}
                            placeholder="Select Birth Date"
                          />
                        </View>
                      </View>

                      {/* Gender */}
                      <Text style={styles.editLabel}>Gender</Text>
                      <View style={styles.genderRowCompact}>
                        {['Male', 'Female', 'Other'].map((g) => (
                          <TouchableOpacity
                            key={g}
                            style={[styles.genderChip, editGender === g && styles.genderChipActive]}
                            onPress={() => setEditGender(g)}
                          >
                            <Text style={[styles.genderChipText, editGender === g && styles.genderChipTextActive]}>
                              {g}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Class Selection */}
                      <Text style={[styles.editLabel, { marginTop: 10 }]}>Class / Grade *</Text>
                      <View style={styles.chipsWrap}>
                        {classes.map((c) => {
                          const active = editClassId === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.smallChip, active && styles.smallChipActive]}
                              onPress={() => {
                                setEditClassId(c.id);
                                if (c.sections && c.sections.length > 0) {
                                  setEditSectionId(c.sections[0].id);
                                } else {
                                  setEditSectionId(null);
                                }
                              }}
                            >
                              <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Section Selection */}
                      {editSectionsList.length > 0 && (
                        <>
                          <Text style={[styles.editLabel, { marginTop: 10 }]}>Section *</Text>
                          <View style={styles.chipsWrap}>
                            {editSectionsList.map((sec) => {
                              const active = editSectionId === sec.id;
                              return (
                                <TouchableOpacity
                                  key={sec.id}
                                  style={[styles.smallChip, active && styles.smallChipActive]}
                                  onPress={() => setEditSectionId(sec.id)}
                                >
                                  <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                                    Section {sec.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </>
                      )}

                      <View style={styles.fieldRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.editLabel, { marginTop: 10 }]}>Roll Number</Text>
                          <TextInput
                            style={styles.editInput}
                            placeholder="Optional"
                            keyboardType="numeric"
                            value={editRollNo}
                            onChangeText={setEditRollNo}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.editLabel, { marginTop: 10 }]}>Enrollment Status</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                            {[
                              { label: 'Active', val: 1 },
                              { label: 'Inactive', val: 0 },
                            ].map((st) => (
                              <TouchableOpacity
                                key={st.val}
                                style={[styles.smallChip, editStatus === st.val && styles.smallChipActive]}
                                onPress={() => setEditStatus(st.val)}
                              >
                                <Text style={[styles.smallChipText, editStatus === st.val && styles.smallChipTextActive]}>
                                  {st.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* ============================================================= */}
                  {/* TAB 1: PERSONAL & DEMOGRAPHICS                                */}
                  {/* ============================================================= */}
                  {editActiveTab === 1 && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeading}>Personal Identification & Demographics</Text>

                      <View style={styles.fieldRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Aadhaar Card No</Text>
                          <TextInput
                            style={styles.editInput}
                            placeholder="12 digit Aadhaar"
                            keyboardType="numeric"
                            maxLength={12}
                            value={editAadhaarNo}
                            onChangeText={setEditAadhaarNo}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Blood Group</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                              <TouchableOpacity
                                key={bg}
                                style={[styles.smallChip, editBloodGroup === bg && styles.smallChipActive]}
                                onPress={() => setEditBloodGroup(bg)}
                              >
                                <Text style={[styles.smallChipText, editBloodGroup === bg && styles.smallChipTextActive]}>
                                  {bg}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>

                      {/* Categories */}
                      <Text style={[styles.editLabel, { marginTop: 10 }]}>Student Category</Text>
                      <View style={styles.chipsWrap}>
                        {categories.map((cat) => {
                          const active = editCategoryId === cat.id;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              style={[styles.smallChip, active && styles.smallChipActive]}
                              onPress={() => setEditCategoryId(active ? null : cat.id)}
                            >
                              <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Religions */}
                      <Text style={[styles.editLabel, { marginTop: 10 }]}>Religion</Text>
                      <View style={styles.chipsWrap}>
                        {religions.map((rel) => {
                          const active = editReligionId === rel.id;
                          return (
                            <TouchableOpacity
                              key={rel.id}
                              style={[styles.smallChip, active && styles.smallChipActive]}
                              onPress={() => setEditReligionId(active ? null : rel.id)}
                            >
                              <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                                {rel.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Address */}
                      <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Residential Address</Text>
                      <Text style={styles.editLabel}>Street / House / Landmark</Text>
                      <TextInput
                        style={[styles.editInput, { height: 60, textAlignVertical: 'top' }]}
                        multiline
                        value={editAddress}
                        onChangeText={setEditAddress}
                        placeholderTextColor="#94a3b8"
                      />

                      <View style={styles.fieldRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>City</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editCity}
                            onChangeText={setEditCity}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>State</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editState}
                            onChangeText={setEditState}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>

                      <View style={styles.fieldRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Pincode</Text>
                          <TextInput
                            style={styles.editInput}
                            keyboardType="numeric"
                            maxLength={6}
                            value={editPincode}
                            onChangeText={setEditPincode}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Emergency Contact</Text>
                          <TextInput
                            style={styles.editInput}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={editEmergencyContact}
                            onChangeText={setEditEmergencyContact}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* ============================================================= */}
                  {/* TAB 2: PARENTS & FAMILY                                       */}
                  {/* ============================================================= */}
                  {editActiveTab === 2 && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeading}>Father Details & Photo</Text>
                      <View style={styles.editFamilyPhotoRow}>
                        {editFatherPhoto ? (
                          <View style={{ position: 'relative' }}>
                            <Image source={{ uri: editFatherPhoto }} style={styles.editFamilyPhotoImg} />
                            <TouchableOpacity onPress={() => setEditFatherPhoto(null)} style={styles.removeCircleBtn}>
                              <MaterialIcons name="close" size={13} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ width: 85, gap: 5 }}>
                            <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleEditCapture(setEditFatherPhoto)}>
                              <MaterialIcons name="photo-camera" size={15} color="#0284c7" />
                              <Text style={styles.photoMiniBtnText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleEditPick(setEditFatherPhoto)}>
                              <MaterialIcons name="photo-library" size={15} color="#64748b" />
                              <Text style={styles.photoMiniBtnText}>Gallery</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Father Name</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editFatherName}
                            onChangeText={setEditFatherName}
                            autoCapitalize="characters"
                            placeholderTextColor="#94a3b8"
                          />
                          <Text style={[styles.editLabel, { marginTop: 6 }]}>Primary Mobile</Text>
                          <TextInput
                            style={styles.editInput}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={editFatherMobile}
                            onChangeText={setEditFatherMobile}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>

                      <View style={styles.fieldRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Father Email</Text>
                          <TextInput
                            style={styles.editInput}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={editFatherEmail}
                            onChangeText={setEditFatherEmail}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Father Occupation</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editFatherOccupation}
                            onChangeText={setEditFatherOccupation}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>

                      {/* Mother Details */}
                      <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Mother Details & Photo</Text>
                      <View style={styles.editFamilyPhotoRow}>
                        {editMotherPhoto ? (
                          <View style={{ position: 'relative' }}>
                            <Image source={{ uri: editMotherPhoto }} style={styles.editFamilyPhotoImg} />
                            <TouchableOpacity onPress={() => setEditMotherPhoto(null)} style={styles.removeCircleBtn}>
                              <MaterialIcons name="close" size={13} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ width: 85, gap: 5 }}>
                            <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleEditCapture(setEditMotherPhoto)}>
                              <MaterialIcons name="photo-camera" size={15} color="#0284c7" />
                              <Text style={styles.photoMiniBtnText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleEditPick(setEditMotherPhoto)}>
                              <MaterialIcons name="photo-library" size={15} color="#64748b" />
                              <Text style={styles.photoMiniBtnText}>Gallery</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Mother Name</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editMotherName}
                            onChangeText={setEditMotherName}
                            autoCapitalize="characters"
                            placeholderTextColor="#94a3b8"
                          />
                          <Text style={[styles.editLabel, { marginTop: 6 }]}>Mother Mobile</Text>
                          <TextInput
                            style={styles.editInput}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={editMotherMobile}
                            onChangeText={setEditMotherMobile}
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>

                      <Text style={styles.editLabel}>Mother Occupation</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editMotherOccupation}
                        onChangeText={setEditMotherOccupation}
                        placeholderTextColor="#94a3b8"
                      />

                      {/* Guardian Details */}
                      <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Local Guardian Details (Optional)</Text>
                      <View style={styles.editFamilyPhotoRow}>
                        {editGuardianPhoto ? (
                          <View style={{ position: 'relative' }}>
                            <Image source={{ uri: editGuardianPhoto }} style={styles.editFamilyPhotoImg} />
                            <TouchableOpacity onPress={() => setEditGuardianPhoto(null)} style={styles.removeCircleBtn}>
                              <MaterialIcons name="close" size={13} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ width: 85, gap: 5 }}>
                            <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleEditCapture(setEditGuardianPhoto)}>
                              <MaterialIcons name="photo-camera" size={15} color="#0284c7" />
                              <Text style={styles.photoMiniBtnText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoMiniBtn} onPress={() => handleEditPick(setEditGuardianPhoto)}>
                              <MaterialIcons name="photo-library" size={15} color="#64748b" />
                              <Text style={styles.photoMiniBtnText}>Gallery</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Guardian Name</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editGuardianName}
                            onChangeText={setEditGuardianName}
                            placeholderTextColor="#94a3b8"
                          />
                          <View style={styles.fieldRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.editLabel, { marginTop: 6 }]}>Relation</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editGuardianRelation}
                                onChangeText={setEditGuardianRelation}
                                placeholderTextColor="#94a3b8"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.editLabel, { marginTop: 6 }]}>Mobile</Text>
                              <TextInput
                                style={styles.editInput}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={editGuardianMobile}
                                onChangeText={setEditGuardianMobile}
                                placeholderTextColor="#94a3b8"
                              />
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Footer Actions */}
                <View style={styles.editFooterRow}>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => setEditModalVisible(false)}
                    disabled={editSaving}
                  >
                    <Text style={styles.editCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.editSaveBtn}
                    onPress={handleSaveEditStudent}
                    disabled={editSaving}
                    activeOpacity={0.8}
                  >
                    {editSaving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={18} color="#ffffff" />
                        <Text style={styles.editSaveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 1-Tap Official Admission Slip Modal */}
      <Modal
        visible={slipModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSlipModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%', padding: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={styles.modalTitle}>Official Admission Slip</Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  {slipStudent?.fullName || slipStudent?.studentName} • Adm: {slipStudent?.admissionNo}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSlipModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              Generate, print, or share the official school admission registration slip (identical to the web application) with student demographics, parent details, and signature blocks.
            </Text>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalPrintBtn, printing && { opacity: 0.7 }]}
                onPress={async () => {
                  try {
                    setPrinting(true);
                    const html = generateAdmissionSlipHtml(slipStudent, { user, branch: branchInfo, activeAcademicYearName });
                    const fileName = `Admission_Slip_${slipStudent?.admissionNo || 'Student'}.pdf`;
                    await executePrint(html, fileName);
                  } finally {
                    setPrinting(false);
                  }
                }}
                disabled={printing}
              >
                <Ionicons name="print" size={18} color="#ffffff" />
                <Text style={styles.modalPrintBtnText}>Print Official Slip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalShareBtn, printing && { opacity: 0.7 }]}
                onPress={async () => {
                  try {
                    setPrinting(true);
                    const html = generateAdmissionSlipHtml(slipStudent, { user, branch: branchInfo, activeAcademicYearName });
                    const fileName = `Admission_Slip_${slipStudent?.admissionNo || 'Student'}.pdf`;
                    await executeSharePdf(html, fileName);
                  } finally {
                    setPrinting(false);
                  }
                }}
                disabled={printing}
              >
                <Ionicons name="share-social-outline" size={18} color="#065f46" />
                <Text style={styles.modalShareBtnText}>Share PDF Document</Text>
              </TouchableOpacity>

              {slipStudent?.mobile || slipStudent?.guardianMobile ? (
                <TouchableOpacity
                  style={[styles.modalWaBtn, printing && { opacity: 0.7 }]}
                  onPress={() => handleOpenWhatsApp(slipStudent)}
                  disabled={printing}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  <Text style={styles.modalWaBtnText}>WhatsApp Slip</Text>
                </TouchableOpacity>
              ) : null}
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
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchContainer: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  addStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addStudentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterBox: {
    backgroundColor: colors.cardBg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.inputBg,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  classText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  fatherText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    flexWrap: 'wrap',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  // Modal Overlay & Content
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalScroll: {
    padding: 16,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
  },
  heroAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroClass: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  heroEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  heroEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  sectionCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  guardianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  guardianRel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'normal',
  },
  guardianPhone: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
  },
  callIconBtn: {
    backgroundColor: '#0284c7',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrintRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modalPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 11,
    borderRadius: 8,
  },
  modalPrintBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
  },
  modalShareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 11,
    borderRadius: 8,
  },
  modalWaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Edit Modal Tabs & Fields
  editTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
  },
  editTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  editTabBtnActive: {
    borderBottomColor: '#ea580c',
  },
  editTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  editTabBtnTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  editLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  editInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderRowCompact: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
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
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
  },
  smallChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  smallChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Edit Photos
  editPhotoContainer: {
    marginBottom: 12,
  },
  editPhotoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBg,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  editPhotoImg: {
    width: 64,
    height: 78,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
  },
  editPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  editPhotoUploadBox: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  editPhotoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: 8,
  },
  editPhotoActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  editFamilyPhotoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  editFamilyPhotoImg: {
    width: 65,
    height: 78,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  removeCircleBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
  },
  photoMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Edit Footer
  editFooterRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
  },
  editCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  editSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 8,
  },
  editSaveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
