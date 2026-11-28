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
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { homeworkApi, classApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
import AppDatePicker from '../components/AppDatePicker';

export default function HomeworkScreen({ navigation }) {
  const { user, activeAcademicYearName, activeAcademicYearId } = useContext(AuthContext);
  const { hasPermission, isSuperAdmin } = usePermission();
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const canAddHomework = isSuperAdmin || hasPermission(['Homework', 'Academics'], 'Add');
  const canDeleteHomework = isSuperAdmin || hasPermission(['Homework', 'Academics'], 'Delete');

  const [homeworkList, setHomeworkList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, COMPLETED

  // Assign Homework Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formClassId, setFormClassId] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [homeworkDate, setHomeworkDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedImage, setSelectedImage] = useState(null);

  // Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, [activeAcademicYearId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [metaRes, classRes] = await Promise.all([
        homeworkApi.getHomeworkMeta().catch(() => ({ data: { classes: [], subjects: [] } })),
        classApi.getClasses().catch(() => ({ data: [] })),
      ]);

      const classList = classRes.data?.data || classRes.data || [];
      setClasses(classList);

      if (metaRes.data?.subjects) {
        setSubjects(metaRes.data.subjects);
      }

      await loadHomework(null, null);
    } catch (err) {
      console.warn('Initial load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHomework = async (classId = selectedClassId, sectionId = selectedSectionId) => {
    try {
      const params = {};
      if (classId) params.classId = classId;
      if (sectionId) params.sectionId = sectionId;
      if (activeAcademicYearId) params.academicYearId = activeAcademicYearId;

      const res = await homeworkApi.getHomeworkList(params);
      const list = res.data?.data || res.data || [];
      setHomeworkList(list);
    } catch (err) {
      console.warn('Load homework error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomework();
    setRefreshing(false);
  };

  // Image selection for homework attachment
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to pick image attachment');
    }
  };

  const handleCaptureImage = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture assignment photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to take photo');
    }
  };

  // Create Homework Submit
  const handleSaveHomework = async () => {
    if (!formClassId) {
      Alert.alert('Missing Field', 'Please select a Class.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a Homework Title.');
      return;
    }
    if (!dueDate) {
      Alert.alert('Missing Field', 'Please select a Due Date.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('classId', String(formClassId));
      if (formSectionId) formData.append('sectionId', String(formSectionId));
      if (formSubjectId) formData.append('subjectId', String(formSubjectId));
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('instructions', instructions.trim());
      formData.append('homeworkDate', homeworkDate);
      formData.append('dueDate', dueDate);
      formData.append('status', 'Active');
      if (activeAcademicYearId) {
        formData.append('academicYearId', String(activeAcademicYearId));
      }

      if (selectedImage) {
        const uriParts = selectedImage.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('attachment', {
          uri: selectedImage.uri,
          name: `homework_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      await homeworkApi.createHomework(formData);
      Alert.alert('Success', 'Homework assigned successfully!');
      setModalVisible(false);
      resetForm();
      loadHomework();
    } catch (err) {
      console.warn('Save homework error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to assign homework.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormClassId('');
    setFormSectionId('');
    setFormSubjectId('');
    setTitle('');
    setDescription('');
    setInstructions('');
    setHomeworkDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setSelectedImage(null);
  };

  // Delete Homework
  const handleDeleteHomework = (item) => {
    Alert.alert(
      'Delete Homework',
      `Are you sure you want to delete "${item.title || 'this homework'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await homeworkApi.deleteHomework(item.id);
              Alert.alert('Deleted', 'Homework removed successfully.');
              if (detailModalVisible) setDetailModalVisible(false);
              loadHomework();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete homework.');
            }
          },
        },
      ]
    );
  };

  // WhatsApp Share homework to parents / class
  const handleShareWhatsApp = (item) => {
    const className = item.className || 'Class';
    const sectionName = item.sectionName ? ` - ${item.sectionName}` : '';
    const subjectName = item.subjectName ? ` | ${item.subjectName}` : '';
    const titleText = item.title || 'Daily Assignment';
    const dueText = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Tomorrow';
    const desc = item.description ? `\n\n📌 Details:\n${item.description}` : '';
    const inst = item.instructions ? `\n\n💡 Instructions:\n${item.instructions}` : '';

    const message = `📚 *CLASS HOMEWORK ASSIGNMENT*\n*${className}${sectionName}${subjectName}*\n\n📝 *Topic:* ${titleText}${desc}${inst}\n\n🗓️ *Due Date:* ${dueText}\n\n_Please ensure completion and review with student._`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to share assignments.');
        }
      })
      .catch(() => Alert.alert('Error', 'Unable to launch WhatsApp'));
  };

  // Filtered Homework
  const filteredList = useMemo(() => {
    return homeworkList.filter((item) => {
      if (selectedClassId && String(item.classId) !== String(selectedClassId)) return false;
      if (selectedSectionId && String(item.sectionId) !== String(selectedSectionId)) return false;
      if (selectedSubjectId && String(item.subjectId) !== String(selectedSubjectId)) return false;
      if (statusFilter !== 'ALL') {
        const itemStatus = (item.status || 'Active').toUpperCase();
        if (statusFilter === 'ACTIVE' && itemStatus !== 'ACTIVE') return false;
        if (statusFilter === 'COMPLETED' && itemStatus !== 'COMPLETED') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const t = (item.title || '').toLowerCase();
        const d = (item.description || '').toLowerCase();
        const c = (item.className || '').toLowerCase();
        const s = (item.subjectName || '').toLowerCase();
        if (!t.includes(q) && !d.includes(q) && !c.includes(q) && !s.includes(q)) return false;
      }
      return true;
    });
  }, [homeworkList, selectedClassId, selectedSectionId, selectedSubjectId, statusFilter, search]);

  const selectedClassObj = classes.find((c) => String(c.id) === String(formClassId));
  const availableSections = selectedClassObj?.sections || [];

  const renderHomeworkCard = ({ item }) => {
    const isDueOverdue = item.dueDate && new Date(item.dueDate) < new Date();
    const formattedDue = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A';
    const formattedAssigned = item.homeworkDate ? new Date(item.homeworkDate).toLocaleDateString() : '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedHomework(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>
                {item.className || 'Class'}
                {item.sectionName ? ` - ${item.sectionName}` : ''}
              </Text>
            </View>
            {item.subjectName ? (
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>{item.subjectName}</Text>
              </View>
            ) : null}
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === 'Completed' ? styles.statusCompleted : styles.statusActive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                item.status === 'Completed' ? styles.statusCompletedText : styles.statusActiveText,
              ]}
            >
              {item.status || 'Active'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>Given: {formattedAssigned || 'Recent'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={13}
              color={isDueOverdue ? '#ef4444' : colors.textSecondary}
            />
            <Text style={[styles.metaText, isDueOverdue ? { color: '#ef4444', fontWeight: '700' } : null]}>
              Due: {formattedDue}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {item.attachmentUrl || item.attachment ? (
            <View style={styles.attachmentChip}>
              <Ionicons name="attach" size={14} color="#0284c7" />
              <Text style={styles.attachmentChipText}>Attached Worksheet</Text>
            </View>
          ) : (
            <View />
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtnShare}
              onPress={() => handleShareWhatsApp(item)}
            >
              <FontAwesome5 name="whatsapp" size={14} color="#16a34a" />
              <Text style={styles.actionBtnShareText}>Share</Text>
            </TouchableOpacity>

            {canDeleteHomework && (
              <TouchableOpacity
                style={styles.actionBtnDelete}
                onPress={() => handleDeleteHomework(item)}
              >
                <Ionicons name="trash-outline" size={15} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Class Homework</Text>
          <Text style={styles.headerSubtitle}>
            {activeAcademicYearName || 'Current Session'} • Assignments & Tasks
          </Text>
        </View>
        {canAddHomework && (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Assign</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search homework by title, subject..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick Class Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.classPillsScroll}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 4 }}
        >
          <TouchableOpacity
            style={[styles.pill, !selectedClassId && styles.pillActive]}
            onPress={() => setSelectedClassId(null)}
          >
            <Text style={[styles.pillText, !selectedClassId && styles.pillTextActive]}>All Classes</Text>
          </TouchableOpacity>
          {classes.map((cls) => {
            const isSelected = String(cls.id) === String(selectedClassId);
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setSelectedClassId(isSelected ? null : cls.id)}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {cls.className || cls.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Chips */}
      <View style={styles.statusRow}>
        {['ALL', 'ACTIVE', 'COMPLETED'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.statusChip, statusFilter === st && styles.statusChipActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text
              style={[
                styles.statusChipText,
                statusFilter === st && styles.statusChipTextActive,
              ]}
            >
              {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Homework List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading homework records...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderHomeworkCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={56} color={colors.cardBorder} />
              <Text style={styles.emptyTitle}>No Homework Found</Text>
              <Text style={styles.emptySub}>
                {selectedClassId
                  ? 'No homework recorded for this class yet.'
                  : 'Tap "+ Assign" to give homework to your students.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Assign Homework Modal */}
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
              <View>
                <Text style={styles.modalTitle}>Assign Class Homework</Text>
                <Text style={styles.modalSub}>Post homework & worksheets to class</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Class Selection */}
              <Text style={styles.formLabel}>SELECT CLASS *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {classes.map((cls) => {
                  const isSel = String(cls.id) === String(formClassId);
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      style={[styles.formChip, isSel && styles.formChipActive]}
                      onPress={() => {
                        setFormClassId(cls.id);
                        setFormSectionId('');
                      }}
                    >
                      <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                        {cls.className || cls.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Section Selection */}
              {availableSections.length > 0 && (
                <>
                  <Text style={styles.formLabel}>SELECT SECTION (OPTIONAL)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    <TouchableOpacity
                      style={[styles.formChip, !formSectionId && styles.formChipActive]}
                      onPress={() => setFormSectionId('')}
                    >
                      <Text style={[styles.formChipText, !formSectionId && styles.formChipTextActive]}>
                        All Sections
                      </Text>
                    </TouchableOpacity>
                    {availableSections.map((sec) => {
                      const isSel = String(sec.id) === String(formSectionId);
                      return (
                        <TouchableOpacity
                          key={sec.id}
                          style={[styles.formChip, isSel && styles.formChipActive]}
                          onPress={() => setFormSectionId(sec.id)}
                        >
                          <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                            Sec {sec.sectionName || sec.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Subject Selection */}
              {subjects.length > 0 && (
                <>
                  <Text style={styles.formLabel}>SUBJECT (OPTIONAL)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {subjects.map((sub) => {
                      const isSel = String(sub.id) === String(formSubjectId);
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          style={[styles.formChip, isSel && styles.formChipActive]}
                          onPress={() => setFormSubjectId(isSel ? '' : sub.id)}
                        >
                          <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                            {sub.subjectName || sub.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Title */}
              <Text style={styles.formLabel}>HOMEWORK TITLE *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Chapter 4 Exercise Questions"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              {/* Due Date */}
              <Text style={styles.formLabel}>DUE DATE *</Text>
              <AppDatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select Due Date"
              />

              {/* Description / Problem Set */}
              <Text style={styles.formLabel}>DESCRIPTION / QUESTIONS</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter homework exercises, page numbers, or questions..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* Instructions */}
              <Text style={styles.formLabel}>SPECIAL INSTRUCTIONS</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Write in fair notebook, bring tomorrow"
                placeholderTextColor={colors.textSecondary}
                value={instructions}
                onChangeText={setInstructions}
              />

              {/* Worksheet / Photo Attachment */}
              <Text style={styles.formLabel}>ATTACH WORKSHEET / PHOTO</Text>
              {selectedImage ? (
                <View style={styles.imagePreviewBox}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="trash" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoActionRow}>
                  <TouchableOpacity style={styles.photoBtn} onPress={handleCaptureImage}>
                    <Ionicons name="camera" size={18} color="#0284c7" />
                    <Text style={styles.photoBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
                    <Ionicons name="images" size={18} color="#0284c7" />
                    <Text style={styles.photoBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveHomework}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Post Homework</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Homework Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedHomework?.title}
                </Text>
                <Text style={styles.modalSub}>
                  {selectedHomework?.className}
                  {selectedHomework?.sectionName ? ` - ${selectedHomework?.sectionName}` : ''}
                  {selectedHomework?.subjectName ? ` | ${selectedHomework?.subjectName}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Assigned Date:</Text>
                <Text style={styles.detailVal}>
                  {selectedHomework?.homeworkDate
                    ? new Date(selectedHomework.homeworkDate).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Due Date:</Text>
                <Text style={[styles.detailVal, { color: '#ef4444', fontWeight: '700' }]}>
                  {selectedHomework?.dueDate
                    ? new Date(selectedHomework.dueDate).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={styles.detailVal}>{selectedHomework?.status || 'Active'}</Text>
              </View>

              {selectedHomework?.description ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description & Questions:</Text>
                  <Text style={styles.detailBodyText}>{selectedHomework.description}</Text>
                </View>
              ) : null}

              {selectedHomework?.instructions ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Special Instructions:</Text>
                  <Text style={styles.detailBodyText}>{selectedHomework.instructions}</Text>
                </View>
              ) : null}

              {selectedHomework?.attachmentUrl ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Attachment:</Text>
                  <Image
                    source={{ uri: selectedHomework.attachmentUrl }}
                    style={styles.detailAttachmentImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.actionBtnShareFull}
                onPress={() => {
                  if (selectedHomework) handleShareWhatsApp(selectedHomework);
                }}
              >
                <FontAwesome5 name="whatsapp" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnShareFullText}>Share on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      gap: 4,
    },
    addButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    searchSection: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingBottom: 4,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 6,
      paddingHorizontal: 12,
      height: 38,
      borderRadius: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
    },
    classPillsScroll: {
      marginBottom: 4,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      marginRight: 6,
    },
    pillActive: {
      backgroundColor: '#0284c7',
    },
    pillText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    pillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    statusRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    statusChip: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
    },
    statusChipActive: {
      backgroundColor: '#0f766e',
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    statusChipTextActive: {
      color: '#ffffff',
      fontWeight: '700',
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
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
    },
    classBadge: {
      backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    classBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0284c7',
    },
    subjectBadge: {
      backgroundColor: isDark ? '#312e81' : '#ede9fe',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    subjectBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#8b5cf6',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusActive: {
      backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    },
    statusActiveText: {
      color: '#16a34a',
      fontSize: 11,
      fontWeight: '700',
    },
    statusCompleted: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    statusCompletedText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    cardDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    cardMeta: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 10,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 8,
    },
    attachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#082f49' : '#f0f9ff',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    attachmentChipText: {
      fontSize: 11,
      color: '#0284c7',
      fontWeight: '600',
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionBtnShare: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? '#064e3b' : '#dcfce7',
    },
    actionBtnShareText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#16a34a',
    },
    actionBtnDelete: {
      padding: 4,
      borderRadius: 6,
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
    chipsScroll: {
      marginBottom: 6,
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
    textArea: {
      height: 70,
      textAlignVertical: 'top',
    },
    photoActionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
      marginBottom: 16,
    },
    photoBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: '#0284c7',
      borderRadius: 8,
      paddingVertical: 10,
      backgroundColor: isDark ? '#082f49' : '#f0f9ff',
    },
    photoBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#0284c7',
    },
    imagePreviewBox: {
      position: 'relative',
      marginVertical: 8,
      borderRadius: 8,
      overflow: 'hidden',
      height: 120,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    removeImageBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: '#ef4444',
      padding: 6,
      borderRadius: 16,
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
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    detailVal: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    detailSection: {
      marginTop: 14,
    },
    detailSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    detailBodyText: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    detailAttachmentImage: {
      width: '100%',
      height: 180,
      borderRadius: 8,
      marginTop: 8,
    },
    actionBtnShareFull: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#16a34a',
      paddingVertical: 12,
      borderRadius: 8,
    },
    actionBtnShareFullText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
    },
  });
