import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';

export default function ModulesHubScreen({ navigation }) {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { hasPermission, isSuperAdmin } = usePermission();
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    'Masters': true,
    'Students & Admission': true,
    'Fees Management': true,
    'Attendance & Timetable': true,
    'Examinations': true,
    'Inventory & Stock': true,
  });

  const toggleSection = (title) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const modules = [
    {
      title: 'Auth & Access',
      icon: 'shield-checkmark',
      color: '#6366f1',
      items: [
        { label: 'Users', route: 'Users', menuKey: 'Users', sub: 'User accounts, credentials & active status' },
        { label: 'Roles & Permissions', route: 'Users', menuKey: 'Roles', sub: 'Role mappings, privileges & system access' },
        { label: 'Audit Logs', route: 'Reports', params: { reportCategory: 'audit' }, menuKey: 'AuditLogs', sub: 'Executive audit trail & activity history' },
      ],
    },
    {
      title: 'Masters',
      icon: 'construct',
      color: '#0284c7',
      items: [
        { label: 'School & Branch', route: 'Masters', params: { tab: 'branch' }, menuKey: 'Branch', sub: 'Campus profile, affiliations & address' },
        { label: 'Academic Years', route: 'Masters', params: { tab: 'academic' }, menuKey: 'AcademicYears', sub: 'Active academic session & term dates' },
        { label: 'Classes & Sections', route: 'Masters', params: { tab: 'classes' }, menuKey: 'Classes', sub: 'Class list, section capacities & streams' },
        { label: 'Subjects', route: 'Masters', params: { tab: 'subjects' }, menuKey: 'Subjects', sub: 'Curriculum subjects, codes & theory/practical' },
        { label: 'Class-Subject Mapping', route: 'Masters', params: { tab: 'mapping' }, menuKey: 'ClassSubjects', sub: 'Curriculum mapping by grade and section' },
        { label: 'Fee Discount Master', route: 'FeeOperations', params: { tab: 'discount-master' }, menuKey: 'FeeDiscountMaster', sub: 'Pre-configured concession policies' },
        { label: 'Bulk Student Upload', route: 'StudentOperations', params: { tab: 'bulk' }, menuKey: 'BulkStudentUpload', sub: 'Batch import students via standard CSV' },
      ],
    },
    {
      title: 'Students & Admission',
      icon: 'school',
      color: '#0ea5e9',
      items: [
        { label: 'Enquiries', route: 'Enquiries', menuKey: 'Enquiries', sub: 'Admission leads, calls, status & follow-ups' },
        { label: 'Class Fee Structure', route: 'StudentOperations', params: { tab: 'fee-structure' }, menuKey: ['Enquiries', 'Students', 'Fees', 'FeeStructure'], sub: 'Prescribed fee heads class-wise' },
        { label: 'New Admission', route: 'NewAdmission', menuKey: ['Admissions', 'Students'], sub: 'Multi-tab student enrollment & guardian details' },
        { label: 'Student Directory', route: 'Students', menuKey: 'Students', sub: 'Class-wise student roster & full profiles' },
        { label: 'Roll Numbers', route: 'StudentOperations', params: { tab: 'roll' }, menuKey: 'RollNumbers', sub: 'Auto-assign & manage class roll numbers' },
        { label: 'Section Change', route: 'StudentOperations', params: { tab: 'section' }, menuKey: 'SectionChange', sub: 'Transfer students between sections' },
        { label: 'ID Card Settings', route: 'StudentOperations', params: { tab: 'idcard' }, menuKey: 'IDCardSettings', sub: 'Digital ID card styling & rules' },
        { label: 'Print ID Cards', route: 'StudentOperations', params: { tab: 'idcard' }, menuKey: 'PrintIDCards', sub: 'Generate & print official student ID cards' },
        { label: 'Student Gate Pass', route: 'GatePassList', menuKey: 'Students', sub: 'Digital exit slips, photo capture & OTP verification' },
      ],
    },
    {
      title: 'Staff & HR',
      icon: 'people',
      color: '#8b5cf6',
      items: [
        { label: 'Staff Directory', route: 'Staff', menuKey: 'Staff', sub: 'Faculty profiles, WhatsApp chat & direct calling' },
        { label: 'Teacher Allocation', route: 'Timetable', params: { tab: 'allocation' }, menuKey: 'TeacherAllocation', sub: 'Subject and class teacher assignments' },
      ],
    },
    {
      title: 'Fees Management',
      icon: 'wallet',
      color: '#10b981',
      items: [
        { label: 'Fee Structure', route: 'FeeOperations', params: { tab: 'structure' }, menuKey: 'FeeStructure', sub: 'Fee head master & frequencies' },
        { label: 'Class Fee Structure', route: 'StudentOperations', params: { tab: 'fee-structure' }, menuKey: ['Fees', 'FeeStructure', 'Enquiries'], sub: 'Tuition and annual class fee setups' },
        { label: 'Fee Assignment', route: 'FeeOperations', params: { tab: 'assignment' }, menuKey: 'FeeAssignment', sub: 'Assign fee structures to student cohorts' },
        { label: 'Fee Collection', route: 'Fees', menuKey: 'FeeCollection', sub: 'Cash, UPI, Cheque breakdown, dues & receipts' },
        { label: 'Fee Discount Master', route: 'FeeOperations', params: { tab: 'discount-master' }, menuKey: 'FeeDiscountMaster', sub: 'Sibling, merit & staff concession rules' },
        { label: 'Demand Bill', route: 'FeeOperations', params: { tab: 'demand-bill' }, menuKey: 'DemandBill', sub: 'Calculate dues notices & late fine rules' },
        { label: 'Fee Concessions', route: 'FeeOperations', params: { tab: 'concessions' }, menuKey: 'FeeConcessions', sub: 'Special scholarships & fee waivers' },
        { label: 'Fee Reports', route: 'Reports', params: { reportCategory: 'fees' }, menuKey: 'FeeReports', sub: 'Daily collection register & head-wise totals' },
      ],
    },
    {
      title: 'Attendance & Timetable',
      icon: 'calendar',
      color: '#f59e0b',
      items: [
        { label: 'Student Attendance', route: 'Attendance', menuKey: 'StudentAttendance', sub: 'Present, Absent, Late & HalfDay marking' },
        { label: 'Staff Attendance', route: 'Attendance', params: { mode: 'staff' }, menuKey: 'StaffAttendance', sub: 'Daily faculty & employee register' },
        { label: 'Leave Management', route: 'LeaveManagement', menuKey: 'LeaveManagement', sub: 'Staff & student leaves with 1-tap approval' },
        { label: 'Attendance Reports', route: 'Reports', params: { reportCategory: 'attendance' }, menuKey: 'AttendanceReports', sub: 'Monthly registers & absentee logs' },
        { label: 'Holiday Calendar', route: 'LeaveManagement', params: { tab: 'holidays' }, menuKey: ['HolidayCalendar', 'StudentAttendance'], sub: 'Official school holidays & breaks' },
        { label: 'Class Timetable', route: 'Timetable', params: { tab: 'class' }, menuKey: 'ClassTimetable', sub: 'Period schedule, teachers & room numbers' },
        { label: 'Teacher Timetable', route: 'Timetable', params: { tab: 'teacher' }, menuKey: 'TeacherTimetable', sub: 'Master weekly teacher schedule' },
        { label: 'Substitutions', route: 'Timetable', params: { tab: 'substitution' }, menuKey: 'Substitutions', sub: 'Teacher leave substitute management' },
      ],
    },
    {
      title: 'Examinations',
      icon: 'book',
      color: '#ec4899',
      items: [
        { label: 'Exam Schedules', route: 'Exams', params: { tab: 'schedules' }, menuKey: 'ExamSchedules', sub: 'Term examinations & timetable dates' },
        { label: 'Marks Entry', route: 'Exams', params: { tab: 'marks' }, menuKey: 'MarksEntry', sub: 'Enter student scores & absent tracking' },
        { label: 'Report Cards', route: 'Reports', params: { reportCategory: 'exams' }, menuKey: 'ReportCards', sub: 'Term result processing & marks cards' },
      ],
    },
    {
      title: 'Transport',
      icon: 'bus',
      color: '#f97316',
      items: [
        { label: 'Vehicles', route: 'Transport', params: { tab: 'vehicles' }, menuKey: 'Vehicles', sub: 'Buses, vans, drivers & direct phone calls' },
        { label: 'Routes & Stops', route: 'Transport', params: { tab: 'routes' }, menuKey: 'RoutesStops', sub: 'Pickup routes, morning/evening timings' },
        { label: 'Student Allocations', route: 'Transport', params: { tab: 'allocations' }, menuKey: 'TransportAllocations', sub: 'Student bus stop mapping & passes' },
      ],
    },
    {
      title: 'Promotion & TC',
      icon: 'arrow-up-circle',
      color: '#14b8a6',
      items: [
        { label: 'Promote Students', route: 'PromotionTc', params: { tab: 'promotion' }, menuKey: 'Promotion', sub: 'Batch students promotion to next academic class' },
        { label: 'Transfer Certificates', route: 'PromotionTc', params: { tab: 'tc' }, menuKey: 'TransferCertificates', sub: 'Issue official school leaving certificates' },
      ],
    },
    {
      title: 'Inventory & Stock',
      icon: 'cube',
      color: '#64748b',
      items: [
        { label: 'Inventory Overview', route: 'Inventory', params: { tab: 'overview' }, menuKey: 'InventoryOverview', sub: 'Stock levels, catalog & low stock warnings' },
        { label: 'Store & Slip Setup', route: 'Inventory', params: { tab: 'store-setup' }, menuKey: 'InventoryOverview', sub: 'Department stores & slip printing setup' },
        { label: 'Items Master', route: 'Inventory', params: { tab: 'items' }, menuKey: 'ItemsMaster', sub: 'Items list, prices & reorder limits' },
        { label: 'Item Categories', route: 'Inventory', params: { tab: 'categories' }, menuKey: 'ItemCategories', sub: 'Stock category classification' },
        { label: 'Suppliers / Vendors', route: 'Inventory', params: { tab: 'suppliers' }, menuKey: 'Suppliers', sub: 'Vendor contacts, GST & supply records' },
        { label: 'Manufactures', route: 'Inventory', params: { tab: 'manufactures' }, menuKey: 'Manufactures', sub: 'Brand manufacturers & OEM details' },
        { label: 'Stock Inward (Purchase)', route: 'Inventory', params: { tab: 'inward' }, menuKey: 'StockInward', sub: 'Record received inventory purchases' },
        { label: 'Stock Issue (Outward)', route: 'Inventory', params: { tab: 'issue' }, menuKey: 'StockIssue', sub: 'Issue items to staff, labs & students' },
        { label: 'Item Return (Sale Return)', route: 'Inventory', params: { tab: 'return' }, menuKey: 'StockIssue', sub: 'Return issued items back to inventory' },
        { label: 'Stock Movement Ledger', route: 'Inventory', params: { tab: 'ledger' }, menuKey: 'StockLedger', sub: 'Transaction history & audit ledger' },
      ],
    },
    {
      title: 'Expenses',
      icon: 'receipt',
      color: '#ef4444',
      items: [
        { label: 'Expenses', route: 'Expenses', menuKey: 'Expenses', sub: 'Expense tracking, receipts & Add Voucher' },
      ],
    },
    {
      title: 'Reports',
      icon: 'bar-chart',
      color: '#3b82f6',
      items: [
        { label: 'Reports Hub', route: 'Reports', menuKey: 'Reports', sub: 'Fee, Attendance, Exam & Student registers' },
      ],
    },
    {
      title: 'Student & Parent AI Portal',
      icon: 'sparkles',
      color: '#ec4899',
      items: [
        { label: 'Student Portal Dashboard', route: 'StudentPortal', isPortal: true, sub: 'Timetable, attendance, homework & fee receipts' },
        { label: 'AI Study Assistant & NCERT', route: 'StudentPortal', isPortal: true, sub: 'AI doubt resolution & digital textbooks' },
      ],
    },
  ];

  // Filter modules by role permissions first, matching web app MainLayout.jsx logic
  const permittedModules = useMemo(() => {
    return modules
      .map((mod) => {
        const allowedItems = mod.items.filter((item) => {
          if (isSuperAdmin) return true;
          if (item.isPortal) return true;
          if (!item.menuKey) return true;
          return hasPermission(item.menuKey, 'View');
        });
        return {
          ...mod,
          items: allowedItems,
        };
      })
      .filter((mod) => mod.items.length > 0);
  }, [modules, hasPermission, isSuperAdmin]);

  const filteredModules = permittedModules
    .map((mod) => {
      const q = search.toLowerCase();
      const matchesTitle = mod.title.toLowerCase().includes(q);
      const matchedItems = mod.items.filter(
        (it) => it.label.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q)
      );

      if (matchesTitle) return mod;
      if (matchedItems.length > 0) return { ...mod, items: matchedItems };
      return null;
    })
    .filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search all ERP modules & features..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#94a3b8"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredModules.map((mod, idx) => {
          const isExpanded = search ? true : expandedSections[mod.title] !== false;

          return (
            <View key={idx} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(mod.title)}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionIconSquircle, { backgroundColor: mod.color }]}>
                  <Ionicons name={mod.icon} size={18} color="#ffffff" />
                </View>
                <Text style={styles.sectionTitle}>{mod.title}</Text>
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>{mod.items.length}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.itemsList}>
                  {mod.items.map((item, itemIdx) => (
                    <TouchableOpacity
                      key={itemIdx}
                      style={[
                        styles.moduleItem,
                        itemIdx === mod.items.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => navigation.navigate(item.route, item.params || {})}
                    >
                      <View style={[styles.itemIconBadge, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                        <Ionicons name={item.icon || mod.icon} size={18} color={mod.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemLabel}>{item.label}</Text>
                        <Text style={styles.itemSub}>{item.sub}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  sectionIconSquircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemCountBadge: {
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  itemIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
