import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { studentApi, classApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateEnquirySlipHtml, executePrint, executeSharePdf } from '../utils/printTemplates';
import WhatsAppModal from '../components/WhatsAppModal';

export default function EnquiriesScreen({ navigation }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [enquiries, setEnquiries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState(null);

  // Enquiry Detail Modal state (Matching Student Directory profile modal)
  const [selectedEnquiryDetail, setSelectedEnquiryDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add/Edit Enquiry Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [notes, setNotes] = useState('');
  const [statusVal, setStatusVal] = useState(1);

  // Followup Modal state
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const [followupEnquiry, setFollowupEnquiry] = useState(null);
  const [followupHistory, setFollowupHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [followupResponse, setFollowupResponse] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [nextDateText, setNextDateText] = useState('');
  const [updateStatus, setUpdateStatus] = useState(2); // 1=Open, 2=Follow-up, 3=Converted, 4=Closed
  const [savingFollowup, setSavingFollowup] = useState(false);

  // Print Slip Modal state
  const [slipModalVisible, setSlipModalVisible] = useState(false);
  const [slipEnquiry, setSlipEnquiry] = useState(null);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Date Picker Modal State
  const [calendarTarget, setCalendarTarget] = useState(null); // 'followup' | 'enquiry' | null
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const getRelativeDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${day}`;
  };

  const handleSelectCalendarDay = (day) => {
    const mo = String(calendarMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const selectedFormatted = `${calendarYear}-${mo}-${d}`;

    if (calendarTarget === 'followup') {
      setNextDateText(selectedFormatted);
    }
    setCalendarTarget(null);
  };

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState({
    visible: false,
    recipientName: '',
    recipientPhone: '',
    recipientRole: '',
    moduleKey: 'enquiry',
    moduleTitle: 'Enquiry Acknowledgement (WhatsApp)',
    templateData: {},
  });

  const handleOpenWhatsApp = (enquiry) => {
    if (!enquiry) return;
    setWhatsAppModal({
      visible: true,
      recipientName: enquiry.guardianName || enquiry.studentName || 'Parent',
      recipientPhone: enquiry.mobile || '',
      recipientRole: `Parent of ${enquiry.studentName || 'Student'}`,
      moduleKey: 'enquiry',
      moduleTitle: 'Enquiry Acknowledgement (WhatsApp)',
      templateData: {
        ParentName: enquiry.guardianName || 'Parent',
        StudentName: enquiry.studentName || 'Student',
        ClassName: enquiry.className || 'Class Seeking Admission',
        EnquiryNo: enquiry.enquiryNo || `ENQ-${enquiry.id}`,
        SchoolName: branchInfo?.schoolName || user?.schoolName || 'School',
        SchoolPhone: branchInfo?.phone || user?.schoolPhone || user?.mobile || '',
      },
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [enqRes, classRes, branchRes] = await Promise.all([
        studentApi.getEnquiries({ pageSize: 100 }),
        classApi.getClasses().catch(() => ({ data: [] })),
        classApi.getBranch().catch(() => ({ data: null })),
      ]);

      const enqList = enqRes.data?.data?.items || enqRes.data?.items || enqRes.data?.data || enqRes.data || [];
      setEnquiries(Array.isArray(enqList) ? enqList : []);

      const clList = classRes.data?.data || classRes.data || [];
      setClasses(Array.isArray(clList) ? clList : []);

      const br = branchRes.data?.data || branchRes.data || null;
      setBranchInfo(br);
    } catch (err) {
      console.warn('Error loading enquiries:', err);
      Alert.alert('Notice', 'Unable to load live enquiries. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNew = () => {
    setEditingEnquiry(null);
    setStudentName('');
    setGuardianName('');
    setMobile('');
    setEmail('');
    setFormClassId('');
    setSource('Walk-in');
    setNotes('');
    setStatusVal(1);
    setModalVisible(true);
  };

  const handleOpenEdit = (enquiry) => {
    setEditingEnquiry(enquiry);
    setStudentName(enquiry.studentName || '');
    setGuardianName(enquiry.guardianName || '');
    setMobile(enquiry.mobile || '');
    setEmail(enquiry.email || '');
    setFormClassId(enquiry.classId ? String(enquiry.classId) : '');
    setSource(enquiry.source || 'Walk-in');
    setNotes(enquiry.notes || enquiry.remarks || '');
    setStatusVal(Number(enquiry.status) || 1);
    setModalVisible(true);
  };

  const handleSaveEnquiry = async () => {
    if (!studentName.trim() || !guardianName.trim() || !mobile.trim()) {
      Alert.alert('Validation Error', 'Student Name, Guardian Name, and Mobile Number are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        studentName: studentName.trim(),
        guardianName: guardianName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || null,
        classId: formClassId ? Number(formClassId) : null,
        source: source.trim() || 'Walk-in',
        notes: notes.trim() || null,
        status: Number(statusVal),
      };

      let res;
      if (editingEnquiry) {
        res = await studentApi.updateEnquiry(editingEnquiry.id, payload);
      } else {
        res = await studentApi.createEnquiry(payload);
      }

      const created = res.data?.data || res.data || {};
      const matchedClass = classes.find((c) => String(c.id) === String(formClassId));

      const fullEnquiryForSlip = {
        ...payload,
        id: created.id || editingEnquiry?.id,
        enquiryNo: created.enquiryNo || editingEnquiry?.enquiryNo || `ENQ-${new Date().getFullYear()}-${String(created.id || 1).padStart(4, '0')}`,
        className: created.className || matchedClass?.name || 'General Enquiry',
        createdOn: created.createdOn || new Date().toISOString(),
      };

      setModalVisible(false);
      setStudentName('');
      setGuardianName('');
      setMobile('');
      setEmail('');
      setNotes('');
      loadData();

      if (!editingEnquiry) {
        setSlipEnquiry(fullEnquiryForSlip);
        setIsNewlyCreated(true);
        setSlipModalVisible(true);
      } else {
        Alert.alert('Success', 'Enquiry updated successfully!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to save enquiry.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFollowup = async (enquiry) => {
    setFollowupEnquiry(enquiry);
    setFollowupResponse('');
    setFollowupNotes('');
    setNextDateText('');
    setUpdateStatus(Number(enquiry.status) || 2);
    setFollowupHistory([]);
    setFollowupModalVisible(true);

    try {
      setLoadingHistory(true);
      const res = await studentApi.getEnquiry(enquiry.id);
      if (res.data?.success && res.data?.data) {
        const full = res.data.data;
        const list = full.followups || full.followUpList || [];
        setFollowupHistory(list);
      }
    } catch (e) {
      console.warn('Failed to load follow-up history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveFollowup = async () => {
    if (!followupResponse.trim()) {
      Alert.alert('Required', 'Please enter a follow-up response or outcome summary.');
      return;
    }

    try {
      setSavingFollowup(true);
      const payload = {
        response: followupResponse.trim(),
        notes: followupNotes.trim() || null,
        nextFollowupDate: nextDateText.trim() ? new Date(nextDateText.trim()).toISOString() : null,
        updateStatus: Number(updateStatus),
      };

      await studentApi.addFollowup(followupEnquiry.id, payload);
      Alert.alert('Success', 'Follow-up logged successfully!');
      setFollowupModalVisible(false);
      loadData();
    } catch (e) {
      console.warn('Error adding followup:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save follow-up.');
    } finally {
      setSavingFollowup(false);
    }
  };

  const handleOpenSlip = (enquiry) => {
    setSlipEnquiry(enquiry);
    setIsNewlyCreated(false);
    setSlipModalVisible(true);
  };

  const handlePrintSlip = async () => {
    if (!slipEnquiry) return;
    try {
      setPrinting(true);
      const html = generateEnquirySlipHtml(slipEnquiry, { user, branch: branchInfo, activeAcademicYearName });
      await executePrint(html);
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    if (!slipEnquiry) return;
    try {
      setPrinting(true);
      const html = generateEnquirySlipHtml(slipEnquiry, { user, branch: branchInfo, activeAcademicYearName });
      const fileName = `Enquiry_Slip_${slipEnquiry.studentName || 'Student'}.pdf`;
      await executeSharePdf(html, fileName);
    } finally {
      setPrinting(false);
    }
  };

  const openEnquiryDetail = async (enquiry) => {
    setSelectedEnquiryDetail(enquiry);
    try {
      setDetailLoading(true);
      const res = await studentApi.getEnquiry(enquiry.id);
      if (res.data?.success && res.data?.data) {
        setSelectedEnquiryDetail(res.data.data);
      }
    } catch (e) {
      console.warn('Enquiry detail fetch notice:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === '3' || s.includes('CONVERT')) {
      return { code: 'CONVERTED', bg: '#dcfce7', text: '#15803d', label: 'Converted' };
    }
    if (s === '2' || s.includes('PROGRESS') || s.includes('FOLLOW')) {
      return { code: 'INPROGRESS', bg: '#fef3c7', text: '#b45309', label: 'In Progress' };
    }
    if (s === '4' || s.includes('CLOSE')) {
      return { code: 'CLOSED', bg: '#f1f5f9', text: '#64748b', label: 'Closed' };
    }
    return { code: 'OPEN', bg: '#e0f2fe', text: '#0284c7', label: 'Open' };
  };

  // Filtered Enquiries (by Search, Status, and Class)
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((item) => {
      // 1. Search filter
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const matchName = (item.studentName || '').toLowerCase().includes(s);
        const matchGuardian = (item.guardianName || '').toLowerCase().includes(s);
        const matchMobile = (item.mobile || '').includes(s);
        const matchNo = (item.enquiryNo || '').toLowerCase().includes(s);
        if (!matchName && !matchGuardian && !matchMobile && !matchNo) {
          return false;
        }
      }

      // 2. Status filter
      if (selectedStatus !== 'ALL') {
        const info = getStatusInfo(item.status);
        if (info.code !== selectedStatus) return false;
      }

      // 3. Class filter (matching StudentsScreen)
      if (selectedClassId !== null) {
        if (String(item.classId) !== String(selectedClassId)) {
          return false;
        }
      }

      return true;
    });
  }, [enquiries, search, selectedStatus, selectedClassId]);

  // Card Render (100% Matching Student Directory StudentsScreen.js)
  const renderEnquiryCard = ({ item }) => {
    const badge = getStatusInfo(item.status);
    const initial = (item.studentName || 'E')[0].toUpperCase();

    return (
      <View style={styles.card}>
        {/* Card Header & Profile Row (Tap to open detailed profile modal) */}
        <TouchableOpacity
          onPress={() => openEnquiryDetail(item)}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            {/* Student Avatar Icon Placeholder */}
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>

            {/* Information Column */}
            <View style={styles.infoCol}>
              <View style={styles.nameHeaderRow}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {item.studentName}
                </Text>

                {item.className ? (
                  <View style={styles.classPill}>
                    <Text style={styles.classPillText}>{item.className}</Text>
                  </View>
                ) : null}

                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>

              <Text style={styles.enquiryMeta}>
                Enquiry #{item.enquiryNo || item.id} • Source: <Text style={{ color: '#0f172a', fontWeight: '600' }}>{item.source || 'Walk-in'}</Text>
              </Text>

              <Text style={styles.guardianText}>
                Guardian: <Text style={{ color: '#1e293b', fontWeight: '600' }}>{item.guardianName || 'N/A'}</Text>
                {' '}• Mobile: <Text style={{ color: '#1e293b', fontWeight: '600' }}>{item.mobile || 'N/A'}</Text>
              </Text>

              {item.notes ? (
                <View style={styles.notesBubble}>
                  <Text style={styles.notesBubbleText} numberOfLines={2}>
                    "{item.notes}"
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons Strip - Clean single horizontal row matching StudentsScreen */}
        <View style={styles.cardActionsRow}>
          {/* 1. Follow-up Button */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => handleOpenFollowup(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="chat-bubble-outline" size={14} color="#d97706" />
            <Text style={[styles.cardActionBtnText, { color: '#d97706' }]}>Follow-up</Text>
          </TouchableOpacity>

          {/* 2. Admit Button */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => navigation.navigate('NewAdmission', { prefill: item })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="school" size={14} color="#0284c7" />
            <Text style={[styles.cardActionBtnText, { color: '#0284c7' }]}>Admit</Text>
          </TouchableOpacity>

          {/* 3. Slip Button */}
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => handleOpenSlip(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="print" size={14} color="#0f766e" />
            <Text style={[styles.cardActionBtnText, { color: '#0f766e' }]}>Slip</Text>
          </TouchableOpacity>

          {/* 4. Edit Button */}
          <TouchableOpacity
            style={[styles.cardActionIconBtn, { backgroundColor: '#f8fafc' }]}
            onPress={() => handleOpenEdit(item)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={14} color="#64748b" />
          </TouchableOpacity>

          {/* 5. WhatsApp Button */}
          {item.mobile ? (
            <TouchableOpacity
              style={[styles.cardActionIconBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
              onPress={() => handleOpenWhatsApp(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={14} color="#16a34a" />
            </TouchableOpacity>
          ) : null}

          {/* 6. Phone Call Button */}
          {item.mobile ? (
            <TouchableOpacity
              style={[styles.cardActionIconBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
              onPress={() => Linking.openURL(`tel:${item.mobile}`)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="phone" size={14} color="#2563eb" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Search Bar & + New Button (Matching StudentsScreen) */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search student, mobile, enquiry no..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94a3b8"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenNew} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Status Chips Row */}
      <View style={styles.filterBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {[
            { key: 'ALL', label: 'All Status' },
            { key: 'OPEN', label: 'Open' },
            { key: 'INPROGRESS', label: 'In Progress' },
            { key: 'CONVERTED', label: 'Converted' },
            { key: 'CLOSED', label: 'Closed' },
          ].map((st) => {
            const isSel = selectedStatus === st.key;
            return (
              <TouchableOpacity
                key={st.key}
                style={[styles.chip, isSel && styles.chipActive]}
                onPress={() => setSelectedStatus(st.key)}
              >
                <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Class Filter Chips (Matching Student Directory) */}
      {classes.length > 0 && (
        <View style={styles.classFilterBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.classChip, selectedClassId === null && styles.classChipActive]}
              onPress={() => setSelectedClassId(null)}
            >
              <Text style={[styles.classChipText, selectedClassId === null && styles.classChipTextActive]}>
                All Classes
              </Text>
            </TouchableOpacity>

            {classes.map((cls) => {
              const isSel = selectedClassId === cls.id;
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.classChip, isSel && styles.classChipActive]}
                  onPress={() => setSelectedClassId(isSel ? null : cls.id)}
                >
                  <Text style={[styles.classChipText, isSel && styles.classChipTextActive]}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading Enquiries...</Text>
        </View>
      ) : filteredEnquiries.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="person-add" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Enquiries Found</Text>
          <Text style={styles.emptyDesc}>
            {search ? 'Try adjusting your search criteria.' : 'Tap "+ New" to record a new admission enquiry.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEnquiries}
          keyExtractor={(item, idx) => String(item.id || idx)}
          renderItem={renderEnquiryCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#0284c7']} />
          }
        />
      )}

      {/* Floating Add Enquiry Button (Matching Staff & Faculty) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleOpenNew}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* ======================================================== */}
      {/* ENQUIRY PROFILE MODAL (Matching StudentsScreen Profile)   */}
      {/* ======================================================== */}
      <Modal
        visible={!!selectedEnquiryDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEnquiryDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enquiry Profile</Text>
              <TouchableOpacity onPress={() => setSelectedEnquiryDetail(null)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedEnquiryDetail && (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.profileHero}>
                  <View style={styles.heroAvatarPlaceholder}>
                    <Text style={styles.heroAvatarInitial}>
                      {(selectedEnquiryDetail.studentName || 'E')[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.heroName}>{selectedEnquiryDetail.studentName}</Text>
                  <Text style={styles.heroClass}>
                    Class: {selectedEnquiryDetail.className || 'General Enquiry'} • Enquiry #{selectedEnquiryDetail.enquiryNo || selectedEnquiryDetail.id}
                  </Text>
                </View>

                {/* Academic & Inquiry Information */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionHeading}>Enquiry Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Enquiry Date</Text>
                    <Text style={styles.detailVal}>
                      {selectedEnquiryDetail.createdOn ? new Date(selectedEnquiryDetail.createdOn).toLocaleDateString('en-IN') : 'Today'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Lead Source</Text>
                    <Text style={styles.detailVal}>{selectedEnquiryDetail.source || 'Walk-in'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Current Status</Text>
                    <Text style={[styles.detailVal, { color: getStatusInfo(selectedEnquiryDetail.status).text, fontWeight: '800' }]}>
                      {getStatusInfo(selectedEnquiryDetail.status).label}
                    </Text>
                  </View>
                  {selectedEnquiryDetail.nextFollowupDate ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Next Follow-up</Text>
                      <Text style={[styles.detailVal, { color: '#d97706', fontWeight: '700' }]}>
                        {new Date(selectedEnquiryDetail.nextFollowupDate).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Guardian & Contact Info */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionHeading}>Parent / Guardian Contacts</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Guardian Name</Text>
                    <Text style={styles.detailVal}>{selectedEnquiryDetail.guardianName || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile Number</Text>
                    <Text style={styles.detailVal}>{selectedEnquiryDetail.mobile || '—'}</Text>
                  </View>
                  {selectedEnquiryDetail.email ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email Address</Text>
                      <Text style={styles.detailVal}>{selectedEnquiryDetail.email}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Counselor Notes */}
                {selectedEnquiryDetail.notes ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Counselor Discussion Notes</Text>
                    <Text style={{ fontSize: 13, color: '#334155', lineHeight: 18 }}>
                      "{selectedEnquiryDetail.notes}"
                    </Text>
                  </View>
                ) : null}

                {/* Followup History */}
                {Array.isArray(selectedEnquiryDetail.followups) && selectedEnquiryDetail.followups.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Follow-up Logs ({selectedEnquiryDetail.followups.length})</Text>
                    {selectedEnquiryDetail.followups.map((f, i) => (
                      <View key={i} style={styles.historyItemBox}>
                        <Text style={styles.historyDate}>
                          {f.date ? new Date(f.date).toLocaleDateString('en-IN') : `Follow-up #${i + 1}`}
                        </Text>
                        <Text style={styles.historyResponse}>{f.response || f.remarks}</Text>
                        {f.notes ? <Text style={styles.historyNotes}>Note: {f.notes}</Text> : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons inside Profile Modal */}
                <View style={styles.modalProfileActionsRow}>
                  <TouchableOpacity
                    style={styles.modalPrimaryActionBtn}
                    onPress={() => {
                      setSelectedEnquiryDetail(null);
                      handleOpenFollowup(selectedEnquiryDetail);
                    }}
                  >
                    <MaterialIcons name="chat-bubble" size={16} color="#ffffff" />
                    <Text style={styles.modalPrimaryActionBtnText}>Log Follow-up</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalAdmitBtn}
                    onPress={() => {
                      setSelectedEnquiryDetail(null);
                      navigation.navigate('NewAdmission', { prefill: selectedEnquiryDetail });
                    }}
                  >
                    <MaterialIcons name="school" size={16} color="#ffffff" />
                    <Text style={styles.modalAdmitBtnText}>Convert to Admission</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSlipBtn}
                    onPress={() => {
                      setSelectedEnquiryDetail(null);
                      handleOpenSlip(selectedEnquiryDetail);
                    }}
                  >
                    <MaterialIcons name="print" size={16} color="#0f766e" />
                    <Text style={styles.modalSlipBtnText}>Slip</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* NEW / EDIT ENQUIRY MODAL                                 */}
      {/* ======================================================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEnquiry ? 'Edit Admission Enquiry' : 'New Admission Enquiry'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.inputLabel}>Candidate / Student Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Aryan Sharma"
                value={studentName}
                onChangeText={setStudentName}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Parent / Guardian Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Rajesh Sharma"
                value={guardianName}
                onChangeText={setGuardianName}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="10 digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Class Seeking Admission</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classChipsWrap}>
                {classes.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.smallChip, formClassId === String(c.id) && styles.smallChipActive]}
                    onPress={() => setFormClassId(formClassId === String(c.id) ? '' : String(c.id))}
                  >
                    <Text style={[styles.smallChipText, formClassId === String(c.id) && styles.smallChipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Source of Enquiry</Text>
              <View style={styles.sourceGrid}>
                {['Walk-in', 'Website', 'Referral', 'Social Media'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sourceBtn, source === s && styles.sourceBtnActive]}
                    onPress={() => setSource(s)}
                  >
                    <Text style={[styles.sourceBtnText, source === s && styles.sourceBtnTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Counselor Notes / Remarks</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="e.g. Inquired about syllabus, fee structure..."
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveEnquiry}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingEnquiry ? 'Save Changes' : 'Record & Generate Slip'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* FOLLOW-UP LOG MODAL                                      */}
      {/* ======================================================== */}
      <Modal
        visible={followupModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFollowupModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="chat" size={20} color="#d97706" />
                <Text style={styles.modalTitle}>
                  Follow-up: {followupEnquiry?.studentName || 'Student'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFollowupModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Previous Follow-up History */}
              {loadingHistory ? (
                <ActivityIndicator size="small" color="#d97706" style={{ marginVertical: 10 }} />
              ) : followupHistory.length > 0 ? (
                <View style={styles.historyContainer}>
                  <Text style={styles.sectionHeading}>PREVIOUS LOGS ({followupHistory.length})</Text>
                  {followupHistory.map((item, idx) => (
                    <View key={idx} style={styles.historyItemBox}>
                      <Text style={styles.historyDate}>
                        {item.date ? new Date(item.date).toLocaleDateString('en-IN') : `Log #${idx + 1}`}
                      </Text>
                      <Text style={styles.historyResponse}>{item.response || item.remarks}</Text>
                      {item.notes ? <Text style={styles.historyNotes}>Note: {item.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Add New Follow-up Section */}
              <Text style={[styles.sectionHeading, { marginTop: 10 }]}>LOG NEW DISCUSSION</Text>

              <Text style={styles.inputLabel}>Discussion Summary / Outcome *</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="e.g. Parent confirmed appointment for campus visit..."
                multiline
                value={followupResponse}
                onChangeText={setFollowupResponse}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Next Follow-up Date</Text>
              <View style={styles.datePickerInputRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="YYYY-MM-DD"
                  value={nextDateText}
                  onChangeText={setNextDateText}
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  style={styles.calendarTriggerBtn}
                  onPress={() => {
                    const baseDate = nextDateText ? new Date(nextDateText) : new Date();
                    if (!isNaN(baseDate.getTime())) {
                      setCalendarMonth(baseDate.getMonth());
                      setCalendarYear(baseDate.getFullYear());
                    }
                    setCalendarTarget('followup');
                  }}
                >
                  <MaterialIcons name="calendar-today" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Quick Date Presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickDateChipsRow}>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: '+3 Days', days: 3 },
                  { label: '+1 Week', days: 7 },
                  { label: '+15 Days', days: 15 },
                ].map((preset) => {
                  const pDate = getRelativeDate(preset.days);
                  const isSelected = nextDateText === pDate;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.quickDateChip, isSelected && styles.quickDateChipActive]}
                      onPress={() => setNextDateText(pDate)}
                    >
                      <Text style={[styles.quickDateChipText, isSelected && styles.quickDateChipTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Update Status</Text>
              <View style={styles.statusChipsGrid}>
                {[
                  { id: 1, label: 'Open' },
                  { id: 2, label: 'Follow-up' },
                  { id: 3, label: 'Converted' },
                  { id: 4, label: 'Closed' },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.statusChipBtn, updateStatus === st.id && styles.statusChipBtnActive]}
                    onPress={() => setUpdateStatus(st.id)}
                  >
                    <Text style={[styles.statusChipBtnText, updateStatus === st.id && styles.statusChipBtnTextActive]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#d97706' }, savingFollowup && { opacity: 0.7 }]}
                onPress={handleSaveFollowup}
                disabled={savingFollowup}
              >
                {savingFollowup ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Follow-up</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* OFFICIAL ENQUIRY SLIP MODAL                              */}
      {/* ======================================================== */}
      <Modal
        visible={slipModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSlipModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '94%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="receipt-long" size={22} color="#0f766e" />
                <Text style={[styles.modalTitle, { color: '#0f766e' }]}>Admission Enquiry Slip</Text>
              </View>
              <TouchableOpacity onPress={() => setSlipModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {isNewlyCreated ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.successBannerTitle}>
                      Enquiry Saved Ref: {slipEnquiry?.enquiryNo || (slipEnquiry?.id ? `ENQ-${slipEnquiry.id}` : 'ENQ-NEW')}
                    </Text>
                    <Text style={styles.successBannerSub}>
                      Official enquiry acknowledgment slip ready to print or share.
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Paper Preview */}
              <View style={styles.slipCard}>
                <View style={styles.slipHeader}>
                  <Text style={styles.slipSchoolName}>
                    {branchInfo?.schoolName || branchInfo?.name || user?.schoolName || 'DELHI PUBLIC SCHOOL'}
                  </Text>
                  <Text style={styles.slipSchoolMeta}>
                    Affiliated to CBSE, New Delhi • Affiliation No: {branchInfo?.affiliationNumber || branchInfo?.affiliationNo || '2130892'}
                  </Text>
                  <View style={styles.slipBadgeWrap}>
                    <Text style={styles.slipBadgeText}>VISITOR & ADMISSION ENQUIRY SLIP</Text>
                  </View>
                </View>

                {/* Summary Meta */}
                <View style={styles.slipMetaBar}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaColLabel}>REF NO</Text>
                    <Text style={[styles.metaColValue, { color: '#0f766e' }]}>
                      {slipEnquiry?.enquiryNo || `ENQ-${slipEnquiry?.id || 'NEW'}`}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaColLabel}>DATE</Text>
                    <Text style={styles.metaColValue}>
                      {slipEnquiry?.createdOn ? new Date(slipEnquiry.createdOn).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaColLabel}>CLASS</Text>
                    <Text style={[styles.metaColValue, { color: '#0f766e' }]}>{slipEnquiry?.className || 'General'}</Text>
                  </View>
                </View>

                {/* Candidate Info Grid */}
                <View style={styles.slipInfoBox}>
                  <View style={styles.slipInfoRow}>
                    <Text style={styles.slipInfoLabel}>Candidate Name:</Text>
                    <Text style={styles.slipInfoValBold}>{(slipEnquiry?.studentName || '—').toUpperCase()}</Text>
                  </View>
                  <View style={styles.slipInfoRow}>
                    <Text style={styles.slipInfoLabel}>Father / Guardian:</Text>
                    <Text style={styles.slipInfoVal}>{slipEnquiry?.guardianName || '—'}</Text>
                  </View>
                  <View style={styles.slipInfoRow}>
                    <Text style={styles.slipInfoLabel}>Contact Mobile:</Text>
                    <Text style={styles.slipInfoValBold}>{slipEnquiry?.mobile || '—'}</Text>
                  </View>
                  <View style={styles.slipInfoRow}>
                    <Text style={styles.slipInfoLabel}>Lead Source:</Text>
                    <Text style={styles.slipInfoVal}>{slipEnquiry?.source || 'Walk-in'}</Text>
                  </View>
                  {slipEnquiry?.notes ? (
                    <View style={styles.slipNotesBox}>
                      <Text style={styles.slipInfoLabel}>Discussion Notes:</Text>
                      <Text style={styles.slipNotesText}>"{slipEnquiry.notes}"</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Spacious Multi-tier Actions Row */}
              <View style={styles.slipActionsContainer}>
                <TouchableOpacity
                  style={[styles.printPrimaryBtn, printing && { opacity: 0.7 }]}
                  onPress={handlePrintSlip}
                  disabled={printing}
                  activeOpacity={0.8}
                >
                  {printing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <MaterialIcons name="print" size={20} color="#ffffff" />
                      <Text style={styles.printPrimaryBtnText}>Print Official Slip</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.slipSecondaryRow}>
                  <TouchableOpacity
                    style={[styles.sharePdfBtn, printing && { opacity: 0.7 }]}
                    onPress={handleSharePdf}
                    disabled={printing}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={17} color="#0f766e" />
                    <Text style={styles.sharePdfBtnText}>Share PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.waActionBtn, printing && { opacity: 0.7 }]}
                    onPress={() => handleOpenWhatsApp(slipEnquiry)}
                    disabled={printing}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={17} color="#ffffff" />
                    <Text style={styles.waActionBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Calendar Date Picker Modal */}
      <Modal
        visible={!!calendarTarget}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCalendarTarget(null)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calNavBtn}
                onPress={() => {
                  if (calendarMonth === 0) {
                    setCalendarMonth(11);
                    setCalendarYear((y) => y - 1);
                  } else {
                    setCalendarMonth((m) => m - 1);
                  }
                }}
              >
                <MaterialIcons name="chevron-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.calendarMonthTitle}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calendarMonth]} {calendarYear}
              </Text>

              <TouchableOpacity
                style={styles.calNavBtn}
                onPress={() => {
                  if (calendarMonth === 11) {
                    setCalendarMonth(0);
                    setCalendarYear((y) => y + 1);
                  } else {
                    setCalendarMonth((m) => m + 1);
                  }
                }}
              >
                <MaterialIcons name="chevron-right" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Day of Week Labels */}
            <View style={styles.calWeekRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <Text key={i} style={styles.calWeekDayText}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calDaysGrid}>
              {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calDayBoxEmpty} />
              ))}
              {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, i) => {
                const dayNum = i + 1;
                const moStr = String(calendarMonth + 1).padStart(2, '0');
                const dStr = String(dayNum).padStart(2, '0');
                const fullStr = `${calendarYear}-${moStr}-${dStr}`;
                const isSelected = nextDateText === fullStr;

                return (
                  <TouchableOpacity
                    key={dayNum}
                    style={[styles.calDayBox, isSelected && styles.calDayBoxSelected]}
                    onPress={() => handleSelectCalendarDay(dayNum)}
                  >
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.calCloseBtn}
              onPress={() => setCalendarTarget(null)}
            >
              <Text style={styles.calCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
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

  // Top Search & New Bar (Matching StudentsScreen)
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: colors.cardBg,
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Filter Chips (Status)
  filterBox: {
    backgroundColor: colors.cardBg,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  classFilterBox: {
    backgroundColor: colors.cardBg,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterChipsRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Class Filter Chips (Matching StudentsScreen)
  classChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  classChipActive: {
    backgroundColor: '#0f766e',
    borderColor: isDark ? '#14b8a6' : '#0f766e',
  },
  classChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  classChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  listContent: {
    padding: 14,
    paddingBottom: 40,
  },

  // Student Directory Card (Matching StudentsScreen.js)
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#0284c7',
  },
  infoCol: {
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  studentName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  classPill: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  classPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  enquiryMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  guardianText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notesBubble: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesBubbleText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Action Buttons Strip (Matching StudentsScreen.js)
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 6,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  // Center / Empty States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalScroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  profileHero: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: isDark ? '#38bdf8' : '#0284c7',
  },
  heroName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 8,
  },
  heroClass: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
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
  historyItemBox: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  historyResponse: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  historyNotes: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },

  modalProfileActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modalPrimaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  modalPrimaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalAdmitBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  modalAdmitBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#042f2e' : '#f0fdfa',
    borderWidth: 1,
    borderColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 4,
  },
  modalSlipBtnText: {
    color: isDark ? '#2dd4bf' : '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },

  // Form Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
    fontSize: 13,
    color: colors.textPrimary,
  },
  classChipsWrap: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 6,
  },
  smallChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  smallChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  sourceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sourceBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sourceBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sourceBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Follow-up status grid
  historyContainer: {
    marginBottom: 10,
  },
  statusChipsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statusChipBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  statusChipBtnActive: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  statusChipBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusChipBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Slip Modal Preview
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? '#052e16' : '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#166534' : '#86efac',
  },
  successBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#4ade80' : '#15803d',
  },
  successBannerSub: {
    fontSize: 11,
    color: isDark ? '#86efac' : '#166534',
  },
  slipCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: '#0f766e',
    borderRadius: 10,
    padding: 14,
  },
  slipHeader: {
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f766e',
    paddingBottom: 8,
    marginBottom: 10,
  },
  slipSchoolName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f766e',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  slipSchoolMeta: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  slipBadgeWrap: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  slipBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  slipMetaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#042f2e' : '#f0fdfa',
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  metaCol: {
    alignItems: 'center',
  },
  metaColLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  metaColValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  slipInfoBox: {
    gap: 5,
  },
  slipInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingVertical: 3,
  },
  slipInfoLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  slipInfoVal: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  slipInfoValBold: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  slipNotesBox: {
    marginTop: 4,
    padding: 6,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0f766e',
  },
  slipNotesText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Slip Modal Actions Bar (Spacious 2-tier layout)
  slipActionsContainer: {
    marginTop: 14,
    gap: 8,
  },
  printPrimaryBtn: {
    backgroundColor: '#0f766e',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  printPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  slipSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sharePdfBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0f766e',
    backgroundColor: isDark ? '#042f2e' : '#f0fdfa',
  },
  sharePdfBtnText: {
    color: isDark ? '#2dd4bf' : '#0f766e',
    fontSize: 13,
    fontWeight: '700',
  },
  waActionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  waActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Floating Add (+) Button (Matching Staff & Faculty)
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
    zIndex: 99,
  },

  // Date Picker Components
  datePickerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  calendarTriggerBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickDateChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  quickDateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickDateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickDateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickDateChipTextActive: {
    color: '#ffffff',
  },

  // Interactive Calendar Modal
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 6,
  },
  calWeekDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 36,
    textAlign: 'center',
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayBoxEmpty: {
    width: '14.28%',
    height: 38,
  },
  calDayBox: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calDayBoxSelected: {
    backgroundColor: colors.primary,
  },
  calDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calDayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  calCloseBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.inputBg,
  },
  calCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
