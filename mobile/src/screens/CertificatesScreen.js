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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { certificateApi, classApi, studentApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';

const CERT_TYPES = [
  { id: 'all', label: 'All Types', icon: 'ribbon-outline' },
  { id: 'bonafide', label: 'Bonafide', icon: 'shield-checkmark', color: '#0284c7' },
  { id: 'birth', label: 'Birth Proof', icon: 'calendar', color: '#059669' },
  { id: 'age', label: 'Age Certificate', icon: 'time', color: '#b45309' },
  { id: 'character', label: 'Character', icon: 'star', color: '#7c3aed' },
  { id: 'ret', label: 'RET Academic', icon: 'document-text', color: '#581c87' },
];

export default function CertificatesScreen({ navigation }) {
  const { user, activeAcademicYearName, activeAcademicYearId } = useContext(AuthContext);
  const { hasPermission, isSuperAdmin } = usePermission();
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canIssue = isSuperAdmin || hasPermission(['Students', 'TransferCertificates'], 'Add');
  const canCancel = isSuperAdmin || hasPermission(['Students', 'TransferCertificates'], 'Delete');

  const [activeTab, setActiveTab] = useState('all');
  const [certificates, setCertificates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(null);

  // Issue Certificate Modal
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formCertType, setFormCertType] = useState('bonafide');
  const [formClassId, setFormClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [purpose, setPurpose] = useState('Higher Studies / Bank Account');
  const [refNo, setRefNo] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  // Stats
  const [stats, setStats] = useState({ totalIssued: 0, issuedToday: 0 });

  useEffect(() => {
    loadInitial();
  }, [activeAcademicYearId, activeTab]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [classRes, statsRes] = await Promise.all([
        classApi.getClasses().catch(() => ({ data: [] })),
        certificateApi.getStats({ certificateType: activeTab !== 'all' ? activeTab : undefined }).catch(() => ({ data: {} })),
      ]);

      setClasses(classRes.data?.data || classRes.data || []);
      setStats(statsRes.data?.data || { totalIssued: 0, issuedToday: 0 });
      await loadCertificates();
    } catch (err) {
      console.warn('Certificate load initial error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async () => {
    try {
      const params = {};
      if (activeTab !== 'all') params.certificateType = activeTab;
      if (selectedClassId) params.classId = selectedClassId;
      if (search.trim()) params.search = search.trim();

      const res = await certificateApi.getCertificates(params);
      const list = res.data?.data?.items || res.data?.data || res.data || [];
      setCertificates(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Load certs error:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCertificates();
    setRefreshing(false);
  };

  // When class changes in issue modal, load students
  const handleFormClassChange = async (clsId) => {
    setFormClassId(clsId);
    setSelectedStudentId('');
    try {
      const res = await studentApi.getStudents({ classId: clsId, academicYearId: activeAcademicYearId });
      const list = res.data?.data?.items || res.data?.data || res.data || [];
      setStudents(list);
    } catch (err) {
      console.warn('Load students for cert error:', err);
    }
  };

  // Submit Issue Certificate
  const handleIssueCertificate = async () => {
    if (!selectedStudentId) {
      Alert.alert('Required Field', 'Please select a student.');
      return;
    }
    if (!purpose.trim()) {
      Alert.alert('Required Field', 'Please enter certificate purpose.');
      return;
    }

    setSaving(true);
    try {
      const studentObj = students.find((s) => String(s.id) === String(selectedStudentId));
      const payload = {
        studentId: Number(selectedStudentId),
        certificateType: formCertType,
        certificateNo: refNo.trim() || `CERT-${Date.now().toString().slice(-6)}`,
        issueDate: new Date(issueDate).toISOString(),
        purpose: purpose.trim(),
        issuedBy: user?.name || 'Principal / Authorized Signatory',
        optionsJson: JSON.stringify({
          studentName: studentObj?.firstName ? `${studentObj.firstName} ${studentObj.lastName || ''}`.trim() : studentObj?.name,
          fatherName: studentObj?.fatherName,
          motherName: studentObj?.motherName,
          dob: studentObj?.dob,
          rollNumber: studentObj?.rollNumber,
          admissionNumber: studentObj?.admissionNumber,
          className: studentObj?.className,
          remarks: remarks.trim(),
        }),
      };

      const res = await certificateApi.createCertificate(payload);
      Alert.alert('Certificate Issued', 'Official student certificate generated successfully!');
      setIssueModalVisible(false);
      resetIssueForm();
      loadCertificates();
    } catch (err) {
      console.warn('Issue cert error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to issue certificate.');
    } finally {
      setSaving(false);
    }
  };

  const resetIssueForm = () => {
    setFormCertType('bonafide');
    setFormClassId('');
    setSelectedStudentId('');
    setPurpose('Higher Studies / Bank Account');
    setRefNo('');
    setRemarks('');
  };

  // Cancel Certificate
  const handleCancelCertificate = (cert) => {
    Alert.alert(
      'Cancel Certificate',
      `Are you sure you want to cancel certificate ${cert.certificateNo || 'this certificate'}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await certificateApi.deleteCertificate(cert.id);
              Alert.alert('Cancelled', 'Certificate cancelled successfully.');
              loadCertificates();
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel certificate.');
            }
          },
        },
      ]
    );
  };

  // Print & Share Certificate
  const handlePrintCertificate = async (cert) => {
    try {
      const title =
        cert.certificateType === 'bonafide'
          ? 'BONAFIDE CERTIFICATE'
          : cert.certificateType === 'birth'
          ? 'BIRTH VERIFICATION CERTIFICATE'
          : cert.certificateType === 'age'
          ? 'AGE PROOF CERTIFICATE'
          : cert.certificateType === 'character'
          ? 'CHARACTER CERTIFICATE'
          : 'RECORD OF EDUCATION & RETENTION CERTIFICATE';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
            .cert-box { border: 4px double #0284c7; padding: 25px; border-radius: 8px; text-align: center; }
            .header-title { font-size: 24px; font-weight: bold; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
            .header-sub { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            .cert-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
            .body-text { font-size: 15px; line-height: 26px; text-align: justify; margin: 25px 0; }
            .highlight { font-weight: bold; color: #0f172a; text-decoration: underline; }
            .footer-row { margin-top: 60px; display: flex; justify-content: space-between; font-size: 13px; }
            .sign-box { border-top: 1px solid #94a3b8; width: 180px; padding-top: 5px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <div class="header-title">SCHOOL ERP INSTITUTION</div>
            <div class="header-sub">Affiliated to State / Central Education Board • Session ${activeAcademicYearName || '2026-2027'}</div>
            
            <div class="cert-badge">${title}</div>

            <div style="text-align: right; font-size: 12px; margin-bottom: 15px;">
              <strong>Ref / Cert No:</strong> ${cert.certificateNo || 'N/A'}<br/>
              <strong>Date:</strong> ${cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : new Date().toLocaleDateString()}
            </div>

            <div class="body-text">
              This is to officially certify that <span class="highlight">${cert.studentName || 'The Student'}</span>, 
              ${cert.fatherName ? `son/daughter of Shri <span class="highlight">${cert.fatherName}</span>, ` : ''}
              is a bonafide student of this institution studying in Class <span class="highlight">${cert.className || 'N/A'}</span>
              ${cert.rollNumber ? `bearing Roll No. <span class="highlight">${cert.rollNumber}</span>` : ''} 
              ${cert.admissionNumber ? `and Admission No. <span class="highlight">${cert.admissionNumber}</span>` : ''}.
              <br/><br/>
              As per official school records, ${cert.dob ? `his/her date of birth is <span class="highlight">${new Date(cert.dob).toLocaleDateString()}</span>. ` : ''}
              He/She bears a good moral character and conduct during his/her tenure at this institution.
              <br/><br/>
              This certificate is issued on request of the parent/guardian for the purpose of: <strong>${cert.purpose || 'Official Documentation'}</strong>.
            </div>

            <div class="footer-row">
              <div class="sign-box">Prepared By</div>
              <div class="sign-box">Verified By</div>
              <div class="sign-box">Principal / Seal</div>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Success', 'Certificate PDF generated.');
      }
    } catch (err) {
      console.warn('Print certificate error:', err);
      Alert.alert('Error', 'Unable to generate certificate print.');
    }
  };

  // WhatsApp share certificate ref
  const handleShareWhatsApp = (cert) => {
    const title = (cert.certificateType || 'Bonafide').toUpperCase();
    const student = cert.studentName || 'Student';
    const ref = cert.certificateNo || 'N/A';
    const date = cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '';

    const message = `🎓 *OFFICIAL SCHOOL CERTIFICATE ISSUED*\n\n*Type:* ${title} CERTIFICATE\n*Student:* ${student}\n*Class:* ${cert.className || 'General'}\n*Certificate Ref No:* ${ref}\n*Issue Date:* ${date}\n*Purpose:* ${cert.purpose || 'Official'}\n\n_This verified document is recorded in the institutional register._`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert('WhatsApp Not Available', 'Please install WhatsApp.');
      })
      .catch(() => Alert.alert('Error', 'Unable to launch WhatsApp'));
  };

  const renderCertCard = ({ item }) => {
    const isCancelled = item.status === 'Cancelled';
    const formattedDate = item.issueDate ? new Date(item.issueDate).toLocaleDateString() : 'Recent';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.refBadge}>
            <Ionicons name="ribbon" size={13} color="#0284c7" />
            <Text style={styles.refBadgeText}>{item.certificateNo || 'CERT-REF'}</Text>
          </View>

          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={styles.typeBadgeText}>{(item.certificateType || 'bonafide').toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.studentName}>{item.studentName || 'Student Name'}</Text>
        <Text style={styles.cardSub}>
          Class: {item.className || 'General'}
          {item.fatherName ? ` • Father: ${item.fatherName}` : ''}
        </Text>

        <View style={styles.purposeBox}>
          <Text style={styles.purposeLabel}>Purpose:</Text>
          <Text style={styles.purposeText} numberOfLines={2}>
            {item.purpose || 'Official verification'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateMeta}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.dateMetaText}>Issued: {formattedDate}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtnWhatsApp}
              onPress={() => handleShareWhatsApp(item)}
            >
              <FontAwesome5 name="whatsapp" size={14} color="#16a34a" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnPrint}
              onPress={() => handlePrintCertificate(item)}
            >
              <Ionicons name="print-outline" size={15} color="#0284c7" />
              <Text style={styles.actionBtnPrintText}>Print / PDF</Text>
            </TouchableOpacity>

            {canCancel && !isCancelled && (
              <TouchableOpacity
                style={styles.actionBtnCancel}
                onPress={() => handleCancelCertificate(item)}
              >
                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Student Certificates</Text>
          <Text style={styles.headerSubtitle}>
            Bonafide, Birth, Age, Character & RET Hub
          </Text>
        </View>
        {canIssue && (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => {
              resetIssueForm();
              setIssueModalVisible(true);
            }}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Issue Cert</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.totalIssued || certificates.length}</Text>
          <Text style={styles.statLabel}>Total Issued</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#059669' }]}>{stats.issuedToday || 0}</Text>
          <Text style={styles.statLabel}>Issued Today</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#0284c7' }]}>{classes.length}</Text>
          <Text style={styles.statLabel}>Active Classes</Text>
        </View>
      </View>

      {/* Certificate Type Scroll Tabs */}
      <View style={styles.tabsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6 }}
        >
          {CERT_TYPES.map((t) => {
            const isSel = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeTab, isSel && styles.typeTabActive]}
                onPress={() => setActiveTab(t.id)}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={isSel ? '#ffffff' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.typeTabText, isSel && styles.typeTabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student, ref #, roll number..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={(txt) => {
              setSearch(txt);
              if (!txt) loadCertificates();
            }}
            onSubmitEditing={loadCertificates}
          />
        </View>
      </View>

      {/* Certificates List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading certificates records...</Text>
        </View>
      ) : (
        <FlatList
          data={certificates}
          keyExtractor={(item) => String(item.id || item.certificateNo)}
          renderItem={renderCertCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ribbon-outline" size={56} color={colors.cardBorder} />
              <Text style={styles.emptyTitle}>No Certificates Issued</Text>
              <Text style={styles.emptySub}>
                Tap "+ Issue Cert" to generate an official Bonafide, Birth, Age, Character, or RET Certificate.
              </Text>
            </View>
          }
        />
      )}

      {/* Issue Certificate Modal */}
      <Modal
        visible={issueModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Issue Student Certificate</Text>
                <Text style={styles.modalSub}>Officially verified institutional record</Text>
              </View>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Certificate Type */}
              <Text style={styles.formLabel}>CERTIFICATE TYPE *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {CERT_TYPES.filter((t) => t.id !== 'all').map((t) => {
                  const isSel = formCertType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.formChip, isSel && styles.formChipActive]}
                      onPress={() => setFormCertType(t.id)}
                    >
                      <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Class Selection */}
              <Text style={styles.formLabel}>SELECT CLASS *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {classes.map((cls) => {
                  const isSel = String(cls.id) === String(formClassId);
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      style={[styles.formChip, isSel && styles.formChipActive]}
                      onPress={() => handleFormClassChange(cls.id)}
                    >
                      <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                        {cls.className || cls.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Student Selection */}
              {formClassId ? (
                <>
                  <Text style={styles.formLabel}>SELECT STUDENT *</Text>
                  {students.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                      No active students found in this class.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      {students.map((st) => {
                        const isSel = String(st.id) === String(selectedStudentId);
                        const name = st.firstName ? `${st.firstName} ${st.lastName || ''}`.trim() : st.name;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            style={[styles.formChip, isSel && styles.formChipActive]}
                            onPress={() => setSelectedStudentId(st.id)}
                          >
                            <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                              {name} {st.rollNumber ? `(#${st.rollNumber})` : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </>
              ) : null}

              {/* Purpose */}
              <Text style={styles.formLabel}>PURPOSE / REASON *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Bank Account, Passport Application, Higher Studies"
                placeholderTextColor={colors.textSecondary}
                value={purpose}
                onChangeText={setPurpose}
              />

              {/* Ref Number */}
              <Text style={styles.formLabel}>CERTIFICATE REFERENCE # (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Leave blank for auto-generation"
                placeholderTextColor={colors.textSecondary}
                value={refNo}
                onChangeText={setRefNo}
              />

              {/* Remarks */}
              <Text style={styles.formLabel}>ADDITIONAL REMARKS (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Any special remarks or verified conduct"
                placeholderTextColor={colors.textSecondary}
                value={remarks}
                onChangeText={setRemarks}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIssueModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleIssueCertificate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Issue Certificate</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.cardBg,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0284c7',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      gap: 4,
    },
    addButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 10,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.cardBg,
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statVal: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
    },
    tabsSection: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    typeTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginRight: 6,
    },
    typeTabActive: {
      backgroundColor: '#0284c7',
    },
    typeTabText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    typeTabTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    searchSection: {
      backgroundColor: colors.cardBg,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginHorizontal: 16,
      marginVertical: 4,
      paddingHorizontal: 12,
      height: 38,
      borderRadius: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
    },
    listContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    refBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#082f49' : '#e0f2fe',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    refBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    studentName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    cardSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    purposeBox: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      padding: 8,
      borderRadius: 6,
      marginBottom: 8,
    },
    purposeLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    purposeText: {
      fontSize: 12,
      color: colors.textPrimary,
      lineHeight: 16,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 8,
    },
    dateMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dateMetaText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionBtnWhatsApp: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    },
    actionBtnPrint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#082f49' : '#e0f2fe',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    actionBtnPrintText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    actionBtnCancel: {
      padding: 4,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 12,
    },
    emptySub: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      paddingHorizontal: 32,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
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
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalBody: {
      padding: 16,
    },
    formLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 10,
    },
    formChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginRight: 6,
    },
    formChipActive: {
      backgroundColor: '#0284c7',
    },
    formChipText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    formChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    textInput: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    submitBtn: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
