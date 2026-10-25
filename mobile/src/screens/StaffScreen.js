import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Linking,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { staffApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
import WhatsAppModal from '../components/WhatsAppModal';
import AppDatePicker from '../components/AppDatePicker';

export default function StaffScreen() {
  const { isDark, colors } = useTheme();
  const { hasPermission, isSuperAdmin } = usePermission();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canAdd = isSuperAdmin || hasPermission('Staff', 'Add');
  const canEdit = isSuperAdmin || hasPermission('Staff', 'Edit');
  const canDelete = isSuperAdmin || hasPermission('Staff', 'Delete');
  const [searchText, setSearchText] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Departments & Designations for forms
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  // Detail Modal
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Add / Edit Staff Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedDesigId, setSelectedDesigId] = useState(null);
  const [joiningDate, setJoiningDate] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [status, setStatus] = useState('Active');
  const [employmentType, setEmploymentType] = useState('FullTime');
  const [salaryBasic, setSalaryBasic] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [panNo, setPanNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  const loadMasters = async () => {
    try {
      const [deptRes, desigRes] = await Promise.allSettled([
        staffApi.getDepartments(),
        staffApi.getDesignations(),
      ]);
      const depts = deptRes.status === 'fulfilled' && deptRes.value.data?.success ? (deptRes.value.data.data || []) : [];
      const desigs = desigRes.status === 'fulfilled' && desigRes.value.data?.success ? (desigRes.value.data.data || []) : [];
      setDepartments(depts);
      setDesignations(desigs);
      return { depts, desigs };
    } catch (e) {
      console.warn('Staff masters error:', e);
      return { depts: [], desigs: [] };
    }
  };

  const handleOpenNew = () => {
    setEditingStaff(null);
    setLoadingDetails(false);
    setEmployeeCode('');
    setFirstName('');
    setLastName('');
    setMobile('');
    setEmail('');
    setGender('Male');
    setSelectedDeptId(departments[0]?.id || null);
    setSelectedDesigId(designations[0]?.id || null);
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setDateOfBirth('');
    setStatus('Active');
    setQualification('');
    setSalaryBasic('');
    setExperienceYears('');
    setAadhaarNo('');
    setPanNo('');
    setBankName('');
    setAccountNo('');
    setIfscCode('');
    setAddModalVisible(true);
  };

  const handleOpenEdit = async (staff) => {
    if (!staff) return;
    setEditingStaff(staff);
    setDetailModalVisible(false);
    setAddModalVisible(true);
    setLoadingDetails(true);

    // Ensure departments and designations are ready
    let currentDepts = departments;
    let currentDesigs = designations;
    if (currentDepts.length === 0 || currentDesigs.length === 0) {
      const masters = await loadMasters();
      if (masters.depts.length > 0) currentDepts = masters.depts;
      if (masters.desigs.length > 0) currentDesigs = masters.desigs;
    }

    // Step 1: Pre-fill immediately from staff object (list item)
    const rawName = (staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`).trim();
    const names = rawName.split(' ');
    setFirstName(staff.firstName || names[0] || '');
    setLastName(staff.lastName || (names.length > 1 ? names.slice(1).join(' ') : ''));
    setEmployeeCode(staff.employeeCode || '');
    setMobile(staff.mobile || '');
    setEmail(staff.email || '');

    let initGender = staff.gender;
    if (initGender === 1 || initGender === '1' || String(initGender).toLowerCase() === 'male') initGender = 'Male';
    else if (initGender === 2 || initGender === '2' || String(initGender).toLowerCase() === 'female') initGender = 'Female';
    else if (initGender === 3 || initGender === '3' || String(initGender).toLowerCase() === 'other') initGender = 'Other';
    else initGender = 'Male';
    setGender(initGender);

    const deptName = (staff.departmentName || staff.department || '').trim().toLowerCase();
    const matchedDept = currentDepts.find(
      (d) => d.id === staff.departmentId || (deptName && d.name?.trim().toLowerCase() === deptName)
    );
    setSelectedDeptId(matchedDept ? matchedDept.id : (staff.departmentId || currentDepts[0]?.id || null));

    const desigName = (staff.designationName || staff.designation || '').trim().toLowerCase();
    const matchedDesig = currentDesigs.find(
      (d) => d.id === staff.designationId || (desigName && d.name?.trim().toLowerCase() === desigName)
    );
    setSelectedDesigId(matchedDesig ? matchedDesig.id : (staff.designationId || currentDesigs[0]?.id || null));

    setQualification(staff.qualification || '');
    setSalaryBasic(staff.salaryBasic != null ? String(staff.salaryBasic) : '');
    setExperienceYears(staff.experienceYears != null ? String(staff.experienceYears) : '');
    setAadhaarNo(staff.aadhaarNo || '');
    setPanNo(staff.panNo || '');
    setBankName(staff.bankName || '');
    setAccountNo(staff.accountNo || '');
    setIfscCode(staff.ifscCode || '');
    setJoiningDate(staff.joiningDate ? String(staff.joiningDate).split('T')[0] : '');
    setDateOfBirth(staff.dateOfBirth ? String(staff.dateOfBirth).split('T')[0] : '');

    let initStatus = 'Active';
    if (staff.status === 1 || staff.status === '1' || staff.status === 'Active') initStatus = 'Active';
    else if (staff.status === 2 || staff.status === '2' || staff.status === 'OnLeave') initStatus = 'OnLeave';
    else if (staff.status === 3 || staff.status === '3' || staff.status === 'Resigned') initStatus = 'Resigned';
    else if (staff.status === 4 || staff.status === '4' || staff.status === 'Terminated') initStatus = 'Terminated';
    setStatus(initStatus);

    // Step 2: Fetch full detail from backend to populate all fields (bank, salary, dates, etc.)
    const staffId = staff.id || staff.employeeId;
    if (staffId) {
      try {
        const fetchMethod = staffApi.getEmployeeDetail || staffApi.getEmployee;
        const res = await fetchMethod(staffId);
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          if (d.firstName) setFirstName(d.firstName);
          if (d.lastName != null) setLastName(d.lastName);
          if (d.employeeCode) setEmployeeCode(d.employeeCode);
          if (d.mobile) setMobile(d.mobile);
          if (d.email != null) setEmail(d.email);

          let g = d.gender;
          if (g === 1 || g === '1' || String(g).toLowerCase() === 'male') g = 'Male';
          else if (g === 2 || g === '2' || String(g).toLowerCase() === 'female') g = 'Female';
          else if (g === 3 || g === '3' || String(g).toLowerCase() === 'other') g = 'Other';
          if (g) setGender(g);

          if (d.departmentId) {
            setSelectedDeptId(Number(d.departmentId));
          } else if (d.departmentName && currentDepts.length > 0) {
            const foundDept = currentDepts.find((x) => x.name?.trim().toLowerCase() === d.departmentName.trim().toLowerCase());
            if (foundDept) setSelectedDeptId(foundDept.id);
          }

          if (d.designationId) {
            setSelectedDesigId(Number(d.designationId));
          } else if (d.designationName && currentDesigs.length > 0) {
            const foundDesig = currentDesigs.find((x) => x.name?.trim().toLowerCase() === d.designationName.trim().toLowerCase());
            if (foundDesig) setSelectedDesigId(foundDesig.id);
          }

          if (d.qualification != null) setQualification(d.qualification);
          if (d.salaryBasic != null) setSalaryBasic(String(d.salaryBasic));
          if (d.experienceYears != null) setExperienceYears(String(d.experienceYears));
          if (d.aadhaarNo != null) setAadhaarNo(d.aadhaarNo);
          if (d.panNo != null) setPanNo(d.panNo);
          if (d.bankName != null) setBankName(d.bankName);
          if (d.accountNo != null) setAccountNo(d.accountNo);
          if (d.ifscCode != null) setIfscCode(d.ifscCode);
          if (d.joiningDate != null) setJoiningDate(String(d.joiningDate).split('T')[0]);
          if (d.dateOfBirth != null) setDateOfBirth(String(d.dateOfBirth).split('T')[0]);

          if (d.status != null) {
            let st = 'Active';
            if (d.status === 1 || d.status === '1' || d.status === 'Active') st = 'Active';
            else if (d.status === 2 || d.status === '2' || d.status === 'OnLeave') st = 'OnLeave';
            else if (d.status === 3 || d.status === '3' || d.status === 'Resigned') st = 'Resigned';
            else if (d.status === 4 || d.status === '4' || d.status === 'Terminated') st = 'Terminated';
            setStatus(st);
          }
        }
      } catch (err) {
        console.warn('Error fetching full staff detail for edit:', err);
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setLoadingDetails(false);
    }
  };

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    visible: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'staff',
    moduleTitle: 'Staff Message (WhatsApp)',
    templateData: {},
  });

  const handleOpenWhatsApp = (item) => {
    if (!item?.mobile) return;
    setWhatsAppModal({
      visible: true,
      recipientName: item.fullName || item.name || 'Staff Member',
      recipientPhone: item.mobile,
      recipientRole: item.designation || item.roleName || 'Faculty / Staff',
      moduleKey: 'staff',
      moduleTitle: 'Staff Direct Message (WhatsApp)',
      templateData: {
        StaffName: item.fullName || item.name || 'Staff Member',
        SchoolName: 'School',
        Message: '',
      },
    });
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchText.trim()) {
        params.search = searchText.trim();
      }
      const res = await staffApi.getEmployees(params);
      if (res.data?.success && res.data?.data) {
        setStaffList(res.data.data.items || res.data.data || []);
      }
    } catch (e) {
      console.warn('Staff fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    loadMasters();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStaff();
  }, [searchText]);

  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call.');
    });
  };

  const handleSaveEmployee = async () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSavingStaff(true);
      const todayStr = new Date().toISOString();
      const statusMap = {
        Active: 1,
        OnLeave: 2,
        Resigned: 3,
        Terminated: 4,
        Retired: 5,
      };

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || null,
        gender: gender,
        departmentId: selectedDeptId || (departments[0]?.id || null),
        designationId: selectedDesigId || (designations[0]?.id || null),
        joiningDate: joiningDate ? `${joiningDate}T00:00:00Z` : (editingStaff?.joiningDate || todayStr),
        dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00Z` : null,
        qualification: qualification.trim() || null,
        salaryBasic: salaryBasic ? parseFloat(salaryBasic) : null,
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : null,
        aadhaarNo: aadhaarNo.trim() || null,
        panNo: panNo.trim() || null,
        bankName: bankName.trim() || null,
        accountNo: accountNo.trim() || null,
        ifscCode: ifscCode.trim() || null,
        status: statusMap[status] || 1,
        photoUrl: editingStaff?.photoUrl || null,
      };

      let res;
      if (editingStaff) {
        res = await staffApi.updateEmployee(editingStaff.id, payload);
      } else {
        res = await staffApi.createEmployee(payload);
      }

      if (res.data?.success) {
        Alert.alert('Success! 🎉', `Staff member ${firstName} ${lastName} ${editingStaff ? 'updated' : 'added'} successfully!`);
        setAddModalVisible(false);
        setEditingStaff(null);
        // Reset form
        setEmployeeCode('');
        setFirstName('');
        setLastName('');
        setMobile('');
        setEmail('');
        setGender('Male');
        setJoiningDate('');
        setDateOfBirth('');
        setStatus('Active');
        setQualification('');
        setSalaryBasic('');
        setExperienceYears('');
        setAadhaarNo('');
        setPanNo('');
        setBankName('');
        setAccountNo('');
        setIfscCode('');
        fetchStaff();
      } else {
        Alert.alert('Failed', res.data?.message || 'Could not save staff member.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving staff member.';
      Alert.alert('Error', msg);
    } finally {
      setSavingStaff(false);
    }
  };

  const renderStaff = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedStaff(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.firstName || item.fullName || 'S').charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.fullName || `${item.firstName} ${item.lastName}`}</Text>
              <View style={[styles.badge, item.status === 'Active' || item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={styles.badgeText}>{item.status || (item.isActive ? 'Active' : 'Inactive')}</Text>
              </View>
            </View>
            <Text style={styles.designation}>
              {item.designation || 'Staff'} • {item.department || 'General'}
            </Text>
            <Text style={styles.meta}>
              Code: {item.employeeCode || 'EMP'} • {item.employmentType || 'Full Time'}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            {canEdit && (
              <TouchableOpacity
                style={styles.editCardBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(item);
                }}
              >
                <MaterialIcons name="edit" size={17} color="#4f46e5" />
              </TouchableOpacity>
            )}

            {item.mobile ? (
              <>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCall(item.mobile);
                  }}
                >
                  <MaterialIcons name="phone" size={17} color="#0284c7" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.waBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleOpenWhatsApp(item);
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={17} color="#15803d" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff by name, department, role..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={fetchStaff}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); fetchStaff(); }}>
              <MaterialIcons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Staff Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          Total Staff Members: <Text style={styles.counterBold}>{staffList.length}</Text>
        </Text>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading staff directory...</Text>
        </View>
      ) : staffList.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="groups" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Staff Members Found</Text>
        </View>
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStaff}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
        />
      )}

      {/* Floating Add Staff Button */}
      {canAdd && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={handleOpenNew}
        >
          <MaterialIcons name="person-add" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Detail Modal */}
      {selectedStaff && (
        <Modal
          visible={detailModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {(selectedStaff.firstName || selectedStaff.fullName || 'S').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={styles.detailName}>{selectedStaff.fullName || `${selectedStaff.firstName} ${selectedStaff.lastName}`}</Text>
                  <Text style={styles.detailSub}>{selectedStaff.designation || 'Staff'} • {selectedStaff.department || 'General'}</Text>
                  <Text style={styles.detailCode}>Code: {selectedStaff.employeeCode || 'EMP'}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Mobile</Text>
                  <Text style={styles.gridVal}>{selectedStaff.mobile || 'N/A'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Email</Text>
                  <Text style={styles.gridVal}>{selectedStaff.email || 'N/A'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Gender</Text>
                  <Text style={styles.gridVal}>{selectedStaff.gender || 'N/A'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Status</Text>
                  <Text style={styles.gridVal}>{selectedStaff.status || (selectedStaff.isActive ? 'Active' : 'Inactive')}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Joining Date</Text>
                  <Text style={styles.gridVal}>
                    {selectedStaff.joiningDate ? new Date(selectedStaff.joiningDate).toLocaleDateString('en-GB') : 'N/A'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Employment</Text>
                  <Text style={styles.gridVal}>{selectedStaff.employmentType || 'Full Time'}</Text>
                </View>
              </View>

              {/* Direct Actions */}
              <View style={styles.detailActionRow}>
                {canEdit && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#4f46e5' }]}
                    onPress={() => handleOpenEdit(selectedStaff)}
                  >
                    <MaterialIcons name="edit" size={18} color="#ffffff" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}

                {selectedStaff.mobile ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.callActionBtn]}
                      onPress={() => handleCall(selectedStaff.mobile)}
                    >
                      <MaterialIcons name="phone" size={18} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.waActionBtn]}
                      onPress={() => {
                        setDetailModalVisible(false);
                        handleOpenWhatsApp(selectedStaff);
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                      <Text style={styles.actionBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Staff Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.formCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleIconRow}>
                <MaterialIcons name={editingStaff ? "edit" : "person-add"} size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loadingDetails && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingBannerText}>Loading complete staff profile...</Text>
              </View>
            )}

            <ScrollView contentContainerStyle={styles.formScroll}>
              {/* Employee Code Badge if Editing */}
              {!!employeeCode && (
                <View style={styles.codeBadgeBanner}>
                  <Ionicons name="id-card-outline" size={18} color="#0284c7" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.codeBadgeBannerText}>
                      Employee ID: <Text style={{ fontWeight: '800' }}>{employeeCode}</Text>
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.formLabel}>First Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Ramesh"
                placeholderTextColor="#94a3b8"
                value={firstName}
                onChangeText={setFirstName}
              />

              <Text style={styles.formLabel}>Last Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Sharma"
                placeholderTextColor="#94a3b8"
                value={lastName}
                onChangeText={setLastName}
              />

              <Text style={styles.formLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
              />

              <Text style={styles.formLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. ramesh@school.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              {/* Gender Selection */}
              <Text style={styles.formLabel}>Gender</Text>
              <View style={styles.chipsRow}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, gender === g && styles.chipSelected]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Department */}
              {departments.length > 0 && (
                <>
                  <Text style={styles.formLabel}>Department</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {departments.map((dept) => {
                      const sel = selectedDeptId === dept.id;
                      return (
                        <TouchableOpacity
                          key={dept.id}
                          style={[styles.chip, sel && styles.chipSelected]}
                          onPress={() => setSelectedDeptId(dept.id)}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{dept.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Designation */}
              {designations.length > 0 && (
                <>
                  <Text style={styles.formLabel}>Designation</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {designations.map((desig) => {
                      const sel = selectedDesigId === desig.id;
                      return (
                        <TouchableOpacity
                          key={desig.id}
                          style={[styles.chip, sel && styles.chipSelected]}
                          onPress={() => setSelectedDesigId(desig.id)}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{desig.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Joining Date & Date of Birth */}
              <View style={{ marginTop: 8, gap: 10 }}>
                <AppDatePicker
                  label="Joining Date"
                  value={joiningDate}
                  onChange={setJoiningDate}
                />

                <AppDatePicker
                  label="Date of Birth"
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  isDob
                />
              </View>

              {/* Staff Status */}
              <Text style={[styles.formLabel, { marginTop: 12 }]}>Staff Status</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: 'Active', label: 'Active' },
                  { key: 'OnLeave', label: 'On Leave' },
                  { key: 'Resigned', label: 'Resigned' },
                  { key: 'Terminated', label: 'Terminated' },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.key}
                    style={[styles.chip, status === st.key && styles.chipSelected]}
                    onPress={() => setStatus(st.key)}
                  >
                    <Text style={[styles.chipText, status === st.key && styles.chipTextSelected]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Qualification</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. B.Ed, M.Sc Mathematics"
                placeholderTextColor="#94a3b8"
                value={qualification}
                onChangeText={setQualification}
              />

              <Text style={styles.formLabel}>Basic Monthly Salary (₹)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 25000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={salaryBasic}
                onChangeText={setSalaryBasic}
              />

              <Text style={styles.formLabel}>Experience (Years)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 5"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={experienceYears}
                onChangeText={setExperienceYears}
              />

              <Text style={styles.formLabel}>Aadhaar Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="12-digit Aadhaar number"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                maxLength={12}
                value={aadhaarNo}
                onChangeText={setAadhaarNo}
              />

              <Text style={styles.formLabel}>PAN Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. ABCDE1234F"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                maxLength={10}
                value={panNo}
                onChangeText={setPanNo}
              />

              <Text style={styles.formLabel}>Bank Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. State Bank of India"
                placeholderTextColor="#94a3b8"
                value={bankName}
                onChangeText={setBankName}
              />

              <Text style={styles.formLabel}>Account Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Bank account number"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={accountNo}
                onChangeText={setAccountNo}
              />

              <Text style={styles.formLabel}>Bank IFSC Code</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                maxLength={11}
                value={ifscCode}
                onChangeText={setIfscCode}
              />

              <TouchableOpacity
                style={[styles.submitBtn, savingStaff && { opacity: 0.7 }]}
                disabled={savingStaff}
                onPress={handleSaveEmployee}
              >
                {savingStaff ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#ffffff" />
                    <Text style={styles.submitBtnText}>{editingStaff ? 'Update Staff Member' : 'Save Staff Member'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  counterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
  },
  counterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  counterBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0284c7',
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: isDark ? '#064e3b' : '#dcfce7',
  },
  badgeInactive: {
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  designation: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editCardBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#312e81' : '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#052e16' : '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? '#0c4a6e' : '#e0f2fe',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#075985' : '#bae6fd',
  },
  loadingBannerText: {
    fontSize: 12,
    color: isDark ? '#38bdf8' : '#0369a1',
    fontWeight: '600',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailSub: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  detailCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    backgroundColor: colors.inputBg,
    padding: 10,
    borderRadius: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  callActionBtn: {
    backgroundColor: '#0284c7',
  },
  waActionBtn: {
    backgroundColor: '#16a34a',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  codeBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? '#1e293b' : '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#bae6fd',
  },
  codeBadgeBannerText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
  },
  formScroll: {
    paddingBottom: 30,
    gap: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 18,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
