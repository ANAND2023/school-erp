import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { gatePassApi, classApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateGatePassSlipHtml, executePrint, executeSharePdf } from '../utils/printTemplates';

export default function GatePassDetailScreen({ route, navigation }) {
  const { passId, localPass } = route.params;
  const { user } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [pass, setPass] = useState(localPass || null);
  const [loading, setLoading] = useState(!localPass);
  const [updating, setUpdating] = useState(false);
  const [branchInfo, setBranchInfo] = useState(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    classApi.getBranch().then((res) => {
      if (res.data?.success && res.data?.data) {
        setBranchInfo(res.data.data);
      }
    }).catch(() => {});
  }, []);

  const handlePrintPass = async () => {
    if (!pass) return;
    try {
      setPrinting(true);
      const html = generateGatePassSlipHtml(pass, { user, branch: branchInfo });
      await executePrint(html);
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePassPdf = async () => {
    if (!pass) return;
    try {
      setPrinting(true);
      const html = generateGatePassSlipHtml(pass, { user, branch: branchInfo });
      const fileName = `GatePass_${pass.gatePassNo || 'GP'}_${pass.studentName || 'Student'}.pdf`;
      await executeSharePdf(html, fileName);
    } finally {
      setPrinting(false);
    }
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await gatePassApi.getGatePass(passId);
      if (res.data?.success && res.data?.data) {
        setPass(res.data.data);
      } else {
        throw new Error('Not found via API');
      }
    } catch (e) {
      console.warn('Fetch detail error, checking local passes:', e);
      try {
        const raw = await AsyncStorage.getItem('@offline_gate_passes');
        const list = raw ? JSON.parse(raw) : [];
        const found = list.find((p) => String(p.id) === String(passId));
        if (found) {
          setPass(found);
        } else if (!pass) {
          Alert.alert('Notice', 'Gate pass record not found.');
        }
      } catch (storageErr) {
        Alert.alert('Error', 'Unable to load gate pass details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localPass) {
      fetchDetail();
    }
  }, [passId]);

  const handleUpdateStatus = async (newStatus) => {
    Alert.alert(
      `Confirm Action`,
      `Are you sure you want to mark this pass as "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setUpdating(true);
              const payload = {
                status: newStatus,
              };
              if (newStatus === 'Returned') {
                const now = new Date();
                let hours = now.getHours();
                const minutes = now.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                const strMinutes = minutes < 10 ? '0' + minutes : minutes;
                payload.actualReturnTime = `${hours}:${strMinutes} ${ampm}`;
              }

              try {
                const res = await gatePassApi.updateStatus(passId, payload);
                if (res.data?.success) {
                  Alert.alert('Status Updated', `Gate pass marked as ${newStatus}.`);
                  fetchDetail();
                  return;
                }
              } catch (apiErr) {
                // Update local storage pass
                const raw = await AsyncStorage.getItem('@offline_gate_passes');
                const list = raw ? JSON.parse(raw) : [];
                const updated = list.map((p) =>
                  String(p.id) === String(passId) ? { ...p, status: newStatus, ...payload } : p
                );
                await AsyncStorage.setItem('@offline_gate_passes', JSON.stringify(updated));
                setPass((prev) => ({ ...prev, status: newStatus, ...payload }));
                Alert.alert('Status Updated', `Gate pass marked as ${newStatus}.`);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to update status.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading Gate Pass...</Text>
      </SafeAreaView>
    );
  }

  if (!pass) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <Text style={styles.emptyTitle}>Gate Pass Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'returned') return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    if (s === 'departed' || s === 'issued') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    if (s === 'cancelled') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  const statusStyle = getStatusColor(pass.status);
  const isIssued = (pass.status || '').toLowerCase() === 'issued';
  const isDeparted = (pass.status || '').toLowerCase() === 'departed';
  const isReturned = (pass.status || '').toLowerCase() === 'returned';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Pass Top Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View>
              <Text style={styles.bannerPassNo}>{pass.gatePassNo}</Text>
              <Text style={styles.bannerDate}>
                {pass.passDate ? new Date(pass.passDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusStyle.bg,
                  borderColor: statusStyle.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                {pass.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Print & Share Bar */}
        <View style={styles.printActionBar}>
          <TouchableOpacity
            style={[styles.printMainBtn, printing && { opacity: 0.7 }]}
            onPress={handlePrintPass}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="print" size={18} color="#ffffff" />
                <Text style={styles.printMainBtnText}>Print Pass (2 Copies)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sharePassBtn, printing && { opacity: 0.7 }]}
            onPress={handleSharePassPdf}
            disabled={printing}
          >
            <Ionicons name="share-social-outline" size={18} color="#0284c7" />
            <Text style={styles.sharePassBtnText}>Share PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Student Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="school" size={20} color="#0284c7" />
            <Text style={styles.sectionTitle}>Student Details</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValueBold}>{pass.studentName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Class & Section</Text>
            <Text style={styles.detailValue}>
              {pass.className || 'N/A'} {pass.sectionName ? `(${pass.sectionName})` : ''}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Admission No / Roll</Text>
            <Text style={styles.detailValue}>
              {pass.admissionNo || 'N/A'} {pass.rollNo ? `(Roll: ${pass.rollNo})` : ''}
            </Text>
          </View>

          {pass.fatherName ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Father Name</Text>
              <Text style={styles.detailValue}>{pass.fatherName}</Text>
            </View>
          ) : null}

          {pass.emergencyContact ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Emergency Contact</Text>
              <TouchableOpacity onPress={() => handleCall(pass.emergencyContact)} style={styles.callRow}>
                <MaterialIcons name="phone" size={14} color="#0284c7" />
                <Text style={styles.callText}>{pass.emergencyContact}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Escort / Receiver Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="verified-user" size={20} color="#0284c7" />
            <Text style={styles.sectionTitle}>Escort / Receiver Information</Text>
          </View>
          <View style={styles.divider} />

          {/* Photo & Name Row */}
          <View style={styles.escortHeaderRow}>
            {pass.receiverPhotoUrl ? (
              <Image source={{ uri: pass.receiverPhotoUrl }} style={styles.escortPhotoLarge} />
            ) : (
              <View style={styles.escortPhotoFallback}>
                <MaterialIcons name="person" size={36} color="#0284c7" />
                <Text style={styles.noPhotoText}>No Photo</Text>
              </View>
            )}

            <View style={styles.escortTextCol}>
              <Text style={styles.escortName}>{pass.receiverName}</Text>
              <View style={styles.relationChip}>
                <Text style={styles.relationChipText}>{pass.receiverRelation || 'Escort'}</Text>
              </View>

              {pass.receiverContact ? (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(pass.receiverContact)}
                >
                  <MaterialIcons name="phone" size={14} color="#ffffff" />
                  <Text style={styles.callButtonText}>Call {pass.receiverContact}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Timing & Movement Details */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="schedule" size={20} color="#0284c7" />
            <Text style={styles.sectionTitle}>Departure & Return Timing</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.timeGrid}>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Out Time</Text>
              <Text style={styles.timeBoxVal}>{pass.outTime || 'N/A'}</Text>
            </View>

            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Expected Return</Text>
              <Text style={styles.timeBoxVal}>{pass.expectedReturnTime || 'Not Specified'}</Text>
            </View>

            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Actual Return</Text>
              <Text style={[styles.timeBoxVal, pass.actualReturnTime && { color: '#059669' }]}>
                {pass.actualReturnTime || 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reason</Text>
            <Text style={styles.detailValueBold}>{pass.reason}</Text>
          </View>

          {pass.reasonDetail ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reason Notes</Text>
              <Text style={styles.detailValue}>{pass.reasonDetail}</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Approved By</Text>
            <Text style={styles.detailValue}>{pass.approvedBy || 'Incharge'}</Text>
          </View>

          {pass.remarks ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Remarks</Text>
              <Text style={styles.detailValue}>{pass.remarks}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {isIssued && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#f59e0b' }]}
              onPress={() => handleUpdateStatus('Departed')}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.btnRow}>
                  <MaterialIcons name="directions-walk" size={20} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>Mark as Departed (Campus Exit)</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {(isDeparted || isIssued) && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#10b981' }]}
              onPress={() => handleUpdateStatus('Returned')}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.btnRow}>
                  <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>Mark as Returned (Back to School)</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {!isReturned && pass.status !== 'Cancelled' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleUpdateStatus('Cancelled')}
              disabled={updating}
            >
              <MaterialIcons name="cancel" size={18} color="#dc2626" />
              <Text style={styles.cancelBtnText}>Cancel Gate Pass</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  bannerCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  printActionBar: {
    flexDirection: 'row',
    gap: 10,
  },
  printMainBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 2,
  },
  printMainBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sharePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: isDark ? '#082f49' : '#f0f9ff',
  },
  sharePassBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerPassNo: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  bannerDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  detailValueBold: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  escortHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  escortPhotoLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBorder,
  },
  escortPhotoFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    fontSize: 9,
    color: colors.primary,
    marginTop: 2,
  },
  escortTextCol: {
    flex: 1,
  },
  escortName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  relationChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  relationChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  timeBox: {
    flex: 1,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeBoxLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeBoxVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionContainer: {
    gap: 10,
    marginTop: 8,
  },
  primaryActionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    gap: 6,
  },
  cancelBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
