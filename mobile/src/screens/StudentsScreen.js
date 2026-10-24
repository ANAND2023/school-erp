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
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { studentApi, classApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateAdmissionSlipHtml, executePrint, executeSharePdf } from '../utils/printTemplates';
import WhatsAppModal from '../components/WhatsAppModal';

export default function StudentsScreen({ navigation }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [classes, setClasses] = useState([]);
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

  // WhatsApp Dialog State (Matching webapp WhatsAppDialog)
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
    loadClasses();
    classApi.getBranch().then((res) => {
      if (res.data?.success && res.data?.data) {
        setBranchInfo(res.data.data);
      }
    }).catch(() => {});
  }, []);

  const loadClasses = async () => {
    try {
      const res = await classApi.getClasses();
      if (res.data?.success && res.data?.data) {
        setClasses(res.data.data);
      }
    } catch (e) {
      console.warn('Error loading classes:', e);
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

  const handlePrintStudentSlip = async () => {
    if (!selectedStudentDetail) return;
    try {
      setPrinting(true);
      const html = generateAdmissionSlipHtml(selectedStudentDetail, {
        user,
        branch: branchInfo,
        activeAcademicYearName,
      });
      await executePrint(html);
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

        {/* Action Buttons Strip (Matching Webapp StudentsPage.jsx) */}
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

          {/* 2. Collect Fee */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => navigation.navigate('Fees', { student: item, studentId: item.id })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="receipt-long" size={15} color="#059669" />
            <Text style={[styles.cardActionBtnText, { color: '#059669' }]}>Fees</Text>
          </TouchableOpacity>

          {/* 3. Official Admission Slip */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => handleOpenAdmissionSlip(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="print" size={15} color="#0284c7" />
            <Text style={[styles.cardActionBtnText, { color: '#0284c7' }]}>Slip</Text>
          </TouchableOpacity>

          {/* 4. Issue Gate Pass */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => navigation.navigate('IssueGatePass', { prefillStudent: item })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="badge" size={15} color="#d97706" />
            <Text style={[styles.cardActionBtnText, { color: '#d97706' }]}>Gate Pass</Text>
          </TouchableOpacity>

          {/* 5. WhatsApp to Parent */}
          {mobile ? (
            <TouchableOpacity
              style={[styles.cardActionIconBtn, { backgroundColor: '#f0fdf4' }]}
              onPress={() => handleOpenWhatsApp(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#16a34a" />
            </TouchableOpacity>
          ) : null}

          {/* 6. Phone Call to Parent */}
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
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

      {/* List */}
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

      {/* Student Profile Modal */}
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
              </ScrollView>
            )}
          </View>
        </View>
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
                    await executePrint(html);
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

      {/* WhatsApp Dialog Modal (Matching webapp WhatsAppDialog) */}
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterBox: {
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterChips: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 2,
    elevation: 1,
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
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: colors.textSecondary,
    marginTop: 2,
  },
  fatherText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 6,
    flexWrap: 'wrap',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalScroll: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  profileHero: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  heroAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  heroClass: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  guardianItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    fontWeight: '400',
    color: colors.textSecondary,
  },
  guardianPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrintRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalPrintBtn: {
    flex: 1,
    backgroundColor: '#065f46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalPrintBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#065f46',
    backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
  },
  modalShareBtnText: {
    color: isDark ? '#34d399' : '#065f46',
    fontSize: 12,
    fontWeight: '700',
  },
  modalWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  modalWaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
