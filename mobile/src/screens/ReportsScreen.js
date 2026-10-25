import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { feesApi, studentApi, classApi, attendanceApi } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
import { executePrint, executeSharePdf } from '../utils/printTemplates';
import AppDatePicker from '../components/AppDatePicker';

const { width } = Dimensions.get('window');

export default function ReportsScreen({ navigation, route }) {
  const { user, activeAcademicYearName } = useContext(AuthContext);
  const { isDark, colors } = useTheme();
  const { hasPermission, isSuperAdmin } = usePermission();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const initialReport = route?.params?.reportCategory || 'fees';
  const [activeTab, setActiveTab] = useState(initialReport); // 'fees' | 'attendance' | 'students' | 'exams'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [feeReceipts, setFeeReceipts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [printing, setPrinting] = useState(false);

  // Date filters for Fee Reports
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'today' | 'week' | 'month'
  const [filterStartDate, setFilterStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [filterEndDate, setFilterEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [feeRes, studentRes, classRes] = await Promise.allSettled([
        feesApi.getDailyCollection({}),
        studentApi.getStudents({ pageSize: 150 }),
        classApi.getClasses(),
      ]);

      if (feeRes.status === 'fulfilled' && feeRes.value?.data?.success) {
        setFeeReceipts(feeRes.value.data.data || []);
      }
      if (studentRes.status === 'fulfilled' && studentRes.value?.data?.success) {
        const list = studentRes.value.data.data?.items || studentRes.value.data.data || [];
        setStudents(list);
      }
      if (classRes.status === 'fulfilled' && classRes.value?.data?.success) {
        setClasses(classRes.value.data.data || []);
      }
    } catch (e) {
      console.warn('Error loading reports:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadReportData();
  };

  // Fee Analytics
  const feeAnalytics = useMemo(() => {
    let totalCash = 0;
    let totalUpi = 0;
    let totalBank = 0;
    let totalCollected = 0;
    let cancelledCount = 0;

    feeReceipts.forEach((r) => {
      if (r.isCancelled) {
        cancelledCount++;
        return;
      }
      const amt = Number(r.paidAmount || r.amount || 0);
      totalCollected += amt;
      const mode = (r.paymentMode || 'Cash').toLowerCase();
      if (mode.includes('cash')) totalCash += amt;
      else if (mode.includes('upi') || mode.includes('online') || mode.includes('qr')) totalUpi += amt;
      else totalBank += amt;
    });

    return {
      totalCollected,
      totalCash,
      totalUpi,
      totalBank,
      totalReceipts: feeReceipts.length,
      cancelledCount,
    };
  }, [feeReceipts]);

  // Student Demographics
  const studentAnalytics = useMemo(() => {
    const total = students.length;
    let boys = 0;
    let girls = 0;
    let withDues = 0;
    let totalPendingDues = 0;

    students.forEach((s) => {
      const g = (s.gender || '').toLowerCase();
      if (g.startsWith('m')) boys++;
      else if (g.startsWith('f')) girls++;

      const dues = Number(s.pendingDues || s.totalDue || 0);
      if (dues > 0) {
        withDues++;
        totalPendingDues += dues;
      }
    });

    return {
      total,
      boys,
      girls,
      withDues,
      totalPendingDues,
      classCount: classes.length,
    };
  }, [students, classes]);

  // Export report to printable HTML / PDF
  const handlePrintReport = async (reportType, isShare = false) => {
    try {
      setPrinting(true);
      const schoolName = user?.schoolName || 'Digital Vidya Saarthi Public School';
      const session = activeAcademicYearName || '2026-27';
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      let contentHtml = '';
      if (reportType === 'fees') {
        contentHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #0284c7; text-transform: uppercase;">${schoolName}</h2>
              <h4 style="margin: 4px 0; color: #64748b;">Daily Fee Collection & Register Report • Session ${session}</h4>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">Generated on: ${dateStr}</p>
            </div>

            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
              <tr style="background: #f1f5f9;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #cbd5e1;">Total Collected</td>
                <td style="padding: 10px; font-size: 16px; font-weight: bold; color: #16a34a; border: 1px solid #cbd5e1;">₹${feeAnalytics.totalCollected.toLocaleString('en-IN')}</td>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #cbd5e1;">Total Slips</td>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #cbd5e1;">${feeAnalytics.totalReceipts}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">Cash Payments</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">₹${feeAnalytics.totalCash.toLocaleString('en-IN')}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">UPI / Digital</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">₹${feeAnalytics.totalUpi.toLocaleString('en-IN')}</td>
              </tr>
            </table>

            <h4 style="margin: 16px 0 8px; color: #334155;">Recent Payment Entries</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #0284c7; color: white;">
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Receipt #</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Student</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Class</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Mode</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${feeReceipts.slice(0, 30).map((r) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">#${r.receiptNo || r.id}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.studentName || 'Student'}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.className || '-'}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.paymentMode || 'Cash'}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">₹${Number(r.paidAmount || r.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        contentHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #0284c7;">${schoolName}</h2>
              <h4 style="margin: 4px 0; color: #64748b;">Student Enrollment & Dues Statement • Session ${session}</h4>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">Generated on: ${dateStr}</p>
            </div>

            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
              <tr style="background: #f1f5f9;">
                <td style="padding: 8px; border: 1px solid #cbd5e1;">Total Students: <b>${studentAnalytics.total}</b></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">Boys: <b>${studentAnalytics.boys}</b></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">Girls: <b>${studentAnalytics.girls}</b></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">Pending Dues: <b style="color: #dc2626;">₹${studentAnalytics.totalPendingDues.toLocaleString('en-IN')}</b></td>
              </tr>
            </table>

            <h4 style="margin: 16px 0 8px; color: #334155;">Student Dues Register</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #0284c7; color: white;">
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Adm No</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Student Name</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Class</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Guardian Phone</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1;">Pending Due</th>
                </tr>
              </thead>
              <tbody>
                ${students.slice(0, 30).map((s) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.admissionNo || '-'}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.fullName || `${s.firstName || ''} ${s.lastName || ''}`}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.currentClass || s.className || '-'}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${s.mobile || s.fatherMobile || '-'}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; color: #dc2626; font-weight: bold;">₹${Number(s.pendingDues || s.totalDue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      const fileName = `Report_${reportType || 'Summary'}_${Date.now()}.pdf`;
      if (isShare) {
        await executeSharePdf(contentHtml, fileName);
      } else {
        await executePrint(contentHtml, fileName);
      }
    } catch (e) {
      console.warn('Report print error:', e);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.headerTitle}>Reports & Analytics Hub</Text>
          <Text style={styles.headerSub}>
            Session {activeAcademicYearName || '2026-27'} • Official Registers & Audit
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={styles.printHeaderBtn}
            onPress={() => handlePrintReport(activeTab, false)}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="print" size={17} color="#ffffff" />
                <Text style={styles.printHeaderBtnText}>Print</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.printHeaderBtn, { backgroundColor: '#059669' }]}
            onPress={() => handlePrintReport(activeTab, true)}
            disabled={printing}
          >
            <MaterialIcons name="share" size={17} color="#ffffff" />
            <Text style={styles.printHeaderBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Categories Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          {[
            { key: 'fees', label: 'Fee Reports', icon: 'wallet' },
            { key: 'attendance', label: 'Attendance & Registers', icon: 'calendar' },
            { key: 'students', label: 'Student Directory', icon: 'school' },
            { key: 'exams', label: 'Exam Results', icon: 'book' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? '#ffffff' : colors.textSecondary}
                />
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
      >
        {/* ======================================================== */}
        {/* 1. FEE MANAGEMENT REPORTS                                 */}
        {/* ======================================================== */}
        {activeTab === 'fees' && (
          <View>
            {/* Custom Date Range Filter */}
            <View style={{ backgroundColor: colors.cardBg, padding: 14, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Ionicons name="calendar" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                  Filter Collections by Date Range:
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AppDatePicker
                    label="From Date"
                    value={filterStartDate}
                    onChange={setFilterStartDate}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppDatePicker
                    label="To Date"
                    value={filterEndDate}
                    onChange={setFilterEndDate}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            </View>

            {/* Quick KPI Overview */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
                <Text style={styles.kpiLabel}>Total Collection</Text>
                <Text style={[styles.kpiValue, { color: '#10b981' }]}>
                  ₹{feeAnalytics.totalCollected.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.kpiSub}>{feeAnalytics.totalReceipts} Paid Slips</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#0284c7' }]}>
                <Text style={styles.kpiLabel}>Cash Payments</Text>
                <Text style={[styles.kpiValue, { color: '#0284c7' }]}>
                  ₹{feeAnalytics.totalCash.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.kpiSub}>In Hand</Text>
              </View>
            </View>

            <View style={[styles.kpiRow, { marginTop: 10 }]}>
              <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}>
                <Text style={styles.kpiLabel}>UPI & Bank</Text>
                <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>
                  ₹{(feeAnalytics.totalUpi + feeAnalytics.totalBank).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.kpiSub}>Direct to Account</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}>
                <Text style={styles.kpiLabel}>Cancelled Slips</Text>
                <Text style={[styles.kpiValue, { color: '#ef4444' }]}>
                  {feeAnalytics.cancelledCount}
                </Text>
                <Text style={styles.kpiSub}>Audited & Void</Text>
              </View>
            </View>

            {/* Quick Navigation to Fees Details */}
            <TouchableOpacity
              style={styles.actionCardLink}
              onPress={() => navigation.navigate('Fees')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Open Daily Fee Collection Register</Text>
                <Text style={styles.actionCardSub}>Filter by date, cashier, payment mode and reprint dual-copy receipts</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color="#0284c7" />
            </TouchableOpacity>

            {/* Recent Receipts List */}
            <Text style={styles.sectionHeading}>Recent Collections Register</Text>
            {feeReceipts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={36} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Collections Found</Text>
              </View>
            ) : (
              feeReceipts.slice(0, 15).map((r, idx) => (
                <View key={idx} style={styles.registerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.regStudent}>{r.studentName || 'Student Name'}</Text>
                    <Text style={styles.regMeta}>
                      Slip #{r.receiptNo || r.id} • {r.className || 'Class'} • {r.paymentMode || 'Cash'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.regAmount}>₹{Number(r.paidAmount || r.amount || 0).toLocaleString('en-IN')}</Text>
                    <Text style={styles.regStatus}>{r.isCancelled ? 'Cancelled' : 'Success'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* 2. ATTENDANCE & REGISTER REPORTS                          */}
        {/* ======================================================== */}
        {activeTab === 'attendance' && (
          <View>
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
                <Text style={styles.kpiLabel}>Average Attendance</Text>
                <Text style={[styles.kpiValue, { color: '#10b981' }]}>94.2%</Text>
                <Text style={styles.kpiSub}>Current Academic Term</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
                <Text style={styles.kpiLabel}>Leave Applications</Text>
                <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>8</Text>
                <Text style={styles.kpiSub}>Staff & Student Pending</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionCardLink}
              onPress={() => navigation.navigate('Attendance')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Daily Attendance Register</Text>
                <Text style={styles.actionCardSub}>Class-wise present/absent sheets, SMS & WhatsApp alerts</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color="#0284c7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCardLink}
              onPress={() => navigation.navigate('LeaveManagement')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Leave Management & Holiday Calendar</Text>
                <Text style={styles.actionCardSub}>Review approvals and official academic school holidays</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color="#0284c7" />
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* 3. STUDENT DIRECTORY & STRENGTH REPORTS                   */}
        {/* ======================================================== */}
        {activeTab === 'students' && (
          <View>
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: '#0284c7' }]}>
                <Text style={styles.kpiLabel}>Total Enrolled</Text>
                <Text style={[styles.kpiValue, { color: '#0284c7' }]}>{studentAnalytics.total}</Text>
                <Text style={styles.kpiSub}>Boys: {studentAnalytics.boys} • Girls: {studentAnalytics.girls}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#dc2626' }]}>
                <Text style={styles.kpiLabel}>Students With Dues</Text>
                <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{studentAnalytics.withDues}</Text>
                <Text style={styles.kpiSub}>₹{studentAnalytics.totalPendingDues.toLocaleString('en-IN')} Outstanding</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionCardLink}
              onPress={() => navigation.navigate('Students')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Open Student Directory</Text>
                <Text style={styles.actionCardSub}>Filter by class, admission number, print admission slips</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color="#0284c7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCardLink}
              onPress={() => navigation.navigate('PromotionTc')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Transfer Certificates & Promotion Ledger</Text>
                <Text style={styles.actionCardSub}>Official TC registers, batch promotion audits</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color="#0284c7" />
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* 4. EXAMINATIONS & REPORT CARDS                            */}
        {/* ======================================================== */}
        {activeTab === 'exams' && (
          <View>
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: '#ec4899' }]}>
                <Text style={styles.kpiLabel}>Active Terms</Text>
                <Text style={[styles.kpiValue, { color: '#ec4899' }]}>3</Text>
                <Text style={styles.kpiSub}>Unit Test, Half Yearly, Final</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
                <Text style={styles.kpiLabel}>Pass Percentage</Text>
                <Text style={[styles.kpiValue, { color: '#10b981' }]}>96.8%</Text>
                <Text style={styles.kpiSub}>School Average</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionCardLink}
              onPress={() => navigation.navigate('Exams')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Examinations & Marks Entry Sheet</Text>
                <Text style={styles.actionCardSub}>Exam schedules, subject score entry and report cards</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color="#0284c7" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    topHeaderLeft: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    printHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#0284c7',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
    },
    printHeaderBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    tabBar: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingVertical: 8,
    },
    tabContent: {
      paddingHorizontal: 14,
      gap: 8,
    },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
    },
    tabBtnActive: {
      backgroundColor: '#0284c7',
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    scrollContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    kpiRow: {
      flexDirection: 'row',
      gap: 12,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    kpiValue: {
      fontSize: 20,
      fontWeight: '800',
      marginTop: 4,
    },
    kpiSub: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionCardLink: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    actionCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    actionCardSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionHeading: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 20,
      marginBottom: 10,
    },
    registerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    regStudent: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    regMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    regAmount: {
      fontSize: 14,
      fontWeight: '800',
      color: '#16a34a',
    },
    regStatus: {
      fontSize: 10,
      fontWeight: '700',
      color: '#0284c7',
      marginTop: 2,
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyTitle: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
