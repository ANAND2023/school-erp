import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Alert,
  Platform,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  TextInput,
  Linking,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';
import { dashboardApi, academicYearApi } from '../api/client';
import DiwaliGreetingModal from '../components/DiwaliGreetingModal';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Modules', icon: 'apps' },
  { id: 'students', label: 'Students & Leads', icon: 'school' },
  { id: 'fees', label: 'Fees & Finance', icon: 'wallet' },
  { id: 'attendance', label: 'Attendance & HR', icon: 'calendar' },
  { id: 'academics', label: 'Academics & Exams', icon: 'book' },
  { id: 'logistics', label: 'Inventory & Transport', icon: 'cube' },
  { id: 'admin', label: 'Admin & Reports', icon: 'construct' },
];

const QUICK_MODULES = [
  // --- DASHBOARD & ANALYTICS ---
  {
    id: 'dashboard',
    title: 'Dashboard',
    category: 'admin',
    screen: 'Dashboard',
    menuKey: null,
    icon: 'speedometer',
    color: '#0284c7',
    shadowColor: 'rgba(2, 132, 199, 0.4)',
  },
  // --- STUDENTS & ADMISSION ---
  {
    id: 'students',
    title: 'Students',
    category: 'students',
    screen: 'Students',
    menuKey: 'Students',
    icon: 'school',
    color: '#f59e0b',
    shadowColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'new-admission',
    title: 'Admission',
    category: 'students',
    screen: 'NewAdmission',
    menuKey: 'Admissions',
    icon: 'person-add',
    color: '#0f766e',
    shadowColor: 'rgba(15, 118, 110, 0.4)',
  },
  {
    id: 'enquiries',
    title: 'Enquiries',
    category: 'students',
    screen: 'Enquiries',
    menuKey: 'Enquiries',
    icon: 'chatbubbles',
    color: '#0284c7',
    shadowColor: 'rgba(2, 132, 199, 0.4)',
  },
  {
    id: 'roll-numbers',
    title: 'Roll Numbers',
    category: 'students',
    screen: 'StudentOperations',
    params: { tab: 'roll' },
    menuKey: 'RollNumbers',
    icon: 'list-circle',
    color: '#6366f1',
    shadowColor: 'rgba(99, 102, 241, 0.4)',
  },
  {
    id: 'section-change',
    title: 'Section Shift',
    category: 'students',
    screen: 'StudentOperations',
    params: { tab: 'section' },
    menuKey: 'SectionChange',
    icon: 'swap-horizontal',
    color: '#0ea5e9',
    shadowColor: 'rgba(14, 165, 233, 0.4)',
  },
  {
    id: 'id-cards',
    title: 'ID Cards',
    category: 'students',
    screen: 'StudentOperations',
    params: { tab: 'idcard' },
    menuKey: ['IDCardSettings', 'PrintIDCards'],
    icon: 'card',
    color: '#8b5cf6',
    shadowColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'gate-pass',
    title: 'Gate Pass',
    category: 'students',
    screen: 'GatePassList',
    menuKey: 'Students',
    icon: 'shield-checkmark',
    color: '#f43f5e',
    shadowColor: 'rgba(244, 63, 94, 0.4)',
  },
  {
    id: 'bulk-upload',
    title: 'Bulk Upload',
    category: 'students',
    screen: 'StudentOperations',
    params: { tab: 'bulk' },
    menuKey: 'BulkStudentUpload',
    icon: 'cloud-upload',
    color: '#10b981',
    shadowColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'promotion-tc',
    title: 'Promotion & TC',
    category: 'students',
    screen: 'PromotionTc',
    menuKey: 'Promotion',
    icon: 'arrow-up-circle',
    color: '#a855f7',
    shadowColor: 'rgba(168, 85, 247, 0.4)',
  },

  // --- FEES & BILLING ---
  {
    id: 'fees',
    title: 'Fee Collect',
    category: 'fees',
    screen: 'Fees',
    menuKey: ['FeeCollection', 'Fees'],
    icon: 'receipt',
    color: '#8b5cf6',
    shadowColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'fee-structure',
    title: 'Fee Structure',
    category: 'fees',
    screen: 'FeeOperations',
    params: { tab: 'structure' },
    menuKey: 'FeeStructure',
    icon: 'calculator',
    color: '#059669',
    shadowColor: 'rgba(5, 150, 105, 0.4)',
  },
  {
    id: 'class-fee',
    title: 'Class Fees',
    category: 'fees',
    screen: 'StudentOperations',
    params: { tab: 'fee-structure' },
    menuKey: ['Fees', 'FeeStructure', 'Enquiries'],
    icon: 'layers',
    color: '#0284c7',
    shadowColor: 'rgba(2, 132, 199, 0.4)',
  },
  {
    id: 'demand-bill',
    title: 'Demand Bills',
    category: 'fees',
    screen: 'FeeOperations',
    params: { tab: 'demand-bill' },
    menuKey: 'DemandBill',
    icon: 'newspaper',
    color: '#d97706',
    shadowColor: 'rgba(217, 119, 6, 0.4)',
  },
  {
    id: 'fee-discount',
    title: 'Discounts',
    category: 'fees',
    screen: 'FeeOperations',
    params: { tab: 'discount-master' },
    menuKey: 'FeeDiscountMaster',
    icon: 'pricetag',
    color: '#16a34a',
    shadowColor: 'rgba(22, 163, 74, 0.4)',
  },
  {
    id: 'fee-concession',
    title: 'Concessions',
    category: 'fees',
    screen: 'FeeOperations',
    params: { tab: 'concessions' },
    menuKey: 'FeeConcessions',
    icon: 'gift',
    color: '#ec4899',
    shadowColor: 'rgba(236, 72, 153, 0.4)',
  },
  {
    id: 'expense',
    title: 'Expenses',
    category: 'fees',
    screen: 'Expenses',
    menuKey: 'Expenses',
    icon: 'wallet',
    color: '#ef4444',
    shadowColor: 'rgba(239, 68, 68, 0.4)',
  },

  // --- ATTENDANCE & HR ---
  {
    id: 'attendance',
    title: 'Student Attd',
    category: 'attendance',
    screen: 'Attendance',
    params: { mode: 'student' },
    menuKey: 'StudentAttendance',
    icon: 'calendar',
    color: '#10b981',
    shadowColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'staff-attendance',
    title: 'Staff Attd',
    category: 'attendance',
    screen: 'Attendance',
    params: { mode: 'staff' },
    menuKey: 'StaffAttendance',
    icon: 'finger-print',
    color: '#0d9488',
    shadowColor: 'rgba(13, 148, 136, 0.4)',
  },
  {
    id: 'leave',
    title: 'Leave & Off',
    category: 'attendance',
    screen: 'LeaveManagement',
    menuKey: 'LeaveManagement',
    icon: 'calendar-outline',
    color: '#14b8a6',
    shadowColor: 'rgba(20, 184, 166, 0.4)',
  },
  {
    id: 'holidays',
    title: 'Holidays',
    category: 'attendance',
    screen: 'LeaveManagement',
    params: { tab: 'holidays' },
    menuKey: 'HolidayCalendar',
    icon: 'today',
    color: '#f97316',
    shadowColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: 'staff',
    title: 'Staff Directory',
    category: 'attendance',
    screen: 'Staff',
    menuKey: 'Staff',
    icon: 'people',
    color: '#6366f1',
    shadowColor: 'rgba(99, 102, 241, 0.4)',
  },

  // --- ACADEMIC & EXAMS ---
  {
    id: 'timetable',
    title: 'Timetable',
    category: 'academics',
    screen: 'Timetable',
    params: { tab: 'class' },
    menuKey: 'ClassTimetable',
    icon: 'time',
    color: '#0284c7',
    shadowColor: 'rgba(2, 132, 199, 0.4)',
  },
  {
    id: 'teacher-timetable',
    title: 'Teacher Load',
    category: 'academics',
    screen: 'Timetable',
    params: { tab: 'teacher' },
    menuKey: 'TeacherTimetable',
    icon: 'hourglass',
    color: '#8b5cf6',
    shadowColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'substitution',
    title: 'Substitution',
    category: 'academics',
    screen: 'Timetable',
    params: { tab: 'substitution' },
    menuKey: 'Substitutions',
    icon: 'shuffle',
    color: '#d97706',
    shadowColor: 'rgba(217, 119, 6, 0.4)',
  },
  {
    id: 'exams',
    title: 'Exam Routine',
    category: 'academics',
    screen: 'Exams',
    params: { tab: 'schedules' },
    menuKey: 'ExamSchedules',
    icon: 'document-text',
    color: '#ea580c',
    shadowColor: 'rgba(234, 88, 12, 0.4)',
  },
  {
    id: 'marks-entry',
    title: 'Marks Entry',
    category: 'academics',
    screen: 'Exams',
    params: { tab: 'marks' },
    menuKey: 'MarksEntry',
    icon: 'create',
    color: '#e11d48',
    shadowColor: 'rgba(225, 29, 72, 0.4)',
  },
  {
    id: 'notices',
    title: 'Notices',
    category: 'academics',
    screen: 'Notices',
    menuKey: 'Notifications',
    icon: 'megaphone',
    color: '#ef4444',
    shadowColor: 'rgba(239, 68, 68, 0.4)',
  },

  // --- LOGISTICS & INVENTORY ---
  {
    id: 'transport',
    title: 'Transport',
    category: 'logistics',
    screen: 'Transport',
    menuKey: 'Vehicles',
    icon: 'bus',
    color: '#eab308',
    shadowColor: 'rgba(234, 179, 8, 0.4)',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    category: 'logistics',
    screen: 'Inventory',
    params: { tab: 'overview' },
    menuKey: 'InventoryOverview',
    icon: 'cube',
    color: '#0ea5e9',
    shadowColor: 'rgba(14, 165, 233, 0.4)',
  },
  {
    id: 'stock-inward',
    title: 'Stock Inward',
    category: 'logistics',
    screen: 'Inventory',
    params: { tab: 'inward' },
    menuKey: 'StockInward',
    icon: 'cart',
    color: '#059669',
    shadowColor: 'rgba(5, 150, 105, 0.4)',
  },
  {
    id: 'stock-issue',
    title: 'Stock Issue',
    category: 'logistics',
    screen: 'Inventory',
    params: { tab: 'issue' },
    menuKey: 'StockIssue',
    icon: 'log-out',
    color: '#d97706',
    shadowColor: 'rgba(217, 119, 6, 0.4)',
  },

  // --- ADMIN, MASTERS & REPORTS ---
  {
    id: 'reports',
    title: 'Reports Hub',
    category: 'admin',
    screen: 'Reports',
    menuKey: 'Reports',
    icon: 'bar-chart',
    color: '#3b82f6',
    shadowColor: 'rgba(59, 130, 246, 0.4)',
  },
  {
    id: 'masters',
    title: 'Masters',
    category: 'admin',
    screen: 'Masters',
    menuKey: 'Branch',
    icon: 'construct',
    color: '#64748b',
    shadowColor: 'rgba(100, 116, 139, 0.4)',
  },
  {
    id: 'users',
    title: 'User Accounts',
    category: 'admin',
    screen: 'Users',
    menuKey: 'Users',
    icon: 'shield',
    color: '#4f46e5',
    shadowColor: 'rgba(79, 70, 229, 0.4)',
  },
  {
    id: 'roles',
    title: 'Roles & Perms',
    category: 'admin',
    screen: 'Users',
    params: { tab: 'roles' },
    menuKey: 'Roles',
    icon: 'key',
    color: '#7c3aed',
    shadowColor: 'rgba(124, 58, 237, 0.4)',
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    category: 'admin',
    screen: 'Reports',
    params: { reportCategory: 'audit' },
    menuKey: 'AuditLogs',
    superAdminOnly: true,
    icon: 'time-outline',
    color: '#475569',
    shadowColor: 'rgba(71, 85, 105, 0.4)',
  },
  {
    id: 'superadmin',
    title: 'Super Admin',
    category: 'admin',
    screen: 'SuperAdmin',
    superAdminOnly: true,
    icon: 'shield-checkmark',
    color: '#4338ca',
    shadowColor: 'rgba(67, 56, 202, 0.4)',
  },
  {
    id: 'portal',
    title: 'Student Portal',
    category: 'admin',
    screen: 'StudentPortal',
    isPortal: true,
    icon: 'school-outline',
    color: '#ec4899',
    shadowColor: 'rgba(236, 72, 153, 0.4)',
  },
];

const SIDEBAR_MENU_DATA = [
  {
    title: 'Dashboard & Overview',
    icon: 'speedometer',
    color: '#0284c7',
    children: [
      { title: 'Executive Dashboard', route: 'Dashboard' },
    ],
  },
  {
    title: 'Auth & Access',
    icon: 'shield-checkmark',
    color: '#6366f1',
    children: [
      { title: 'Super Admin Portal', route: 'SuperAdmin', superAdminOnly: true },
      { title: 'Users', route: 'Users', menuKey: 'Users' },
      { title: 'Roles & Permissions', route: 'Users', params: { initialTab: 'roles' }, menuKey: 'Roles' },
      { title: 'Audit Logs', route: 'Reports', params: { reportCategory: 'audit' }, menuKey: 'AuditLogs', superAdminOnly: true },
    ],
  },
  {
    title: 'Masters',
    icon: 'construct',
    color: '#0284c7',
    children: [
      { title: 'School & Branch', route: 'Masters', params: { tab: 'branch' }, menuKey: 'Branch' },
      { title: 'Academic Years', route: 'Masters', params: { tab: 'academic' }, menuKey: 'AcademicYears' },
      { title: 'Classes & Sections', route: 'Masters', params: { tab: 'classes' }, menuKey: 'Classes' },
      { title: 'Subjects', route: 'Masters', params: { tab: 'subjects' }, menuKey: 'Subjects' },
      { title: 'Class-Subject Mapping', route: 'Masters', params: { tab: 'mapping' }, menuKey: 'ClassSubjects' },
      { title: 'Fee Discount Master', route: 'FeeOperations', params: { tab: 'discount-master' }, menuKey: 'FeeDiscountMaster' },
      { title: 'Bulk Student Upload', route: 'StudentOperations', params: { tab: 'bulk' }, menuKey: 'BulkStudentUpload' },
    ],
  },
  {
    title: 'Students & Admission',
    icon: 'school',
    color: '#0ea5e9',
    children: [
      { title: 'Enquiries', route: 'Enquiries', menuKey: 'Enquiries' },
      { title: 'Class Fee Structure', route: 'StudentOperations', params: { tab: 'fee-structure' }, menuKey: ['Enquiries', 'Students', 'Fees', 'FeeStructure'] },
      { title: 'New Admission', route: 'NewAdmission', menuKey: 'Admissions' },
      { title: 'Student Directory', route: 'Students', menuKey: 'Students' },
      { title: 'Roll Numbers', route: 'StudentOperations', params: { tab: 'roll' }, menuKey: 'RollNumbers' },
      { title: 'Section Change', route: 'StudentOperations', params: { tab: 'section' }, menuKey: 'SectionChange' },
      { title: 'ID Card Settings', route: 'StudentOperations', params: { tab: 'idcard' }, menuKey: 'IDCardSettings' },
      { title: 'Print ID Cards', route: 'StudentOperations', params: { tab: 'idcard' }, menuKey: 'PrintIDCards' },
      { title: 'Student Gate Pass', route: 'GatePassList', menuKey: 'Students' },
    ],
  },
  {
    title: 'Staff & HR',
    icon: 'people',
    color: '#8b5cf6',
    children: [
      { title: 'Staff Directory', route: 'Staff', menuKey: 'Staff' },
      { title: 'Teacher Allocation', route: 'Timetable', params: { tab: 'allocation' }, menuKey: 'TeacherAllocation' },
    ],
  },
  {
    title: 'Fees Management',
    icon: 'wallet',
    color: '#10b981',
    children: [
      { title: 'Fee Structure', route: 'FeeOperations', params: { tab: 'structure' }, menuKey: 'FeeStructure' },
      { title: 'Class Fee Structure', route: 'StudentOperations', params: { tab: 'fee-structure' }, menuKey: ['Fees', 'FeeStructure', 'Enquiries'] },
      { title: 'Fee Assignment', route: 'FeeOperations', params: { tab: 'assignment' }, menuKey: 'FeeAssignment' },
      { title: 'Fee Collection', route: 'Fees', menuKey: 'FeeCollection' },
      { title: 'Fee Discount Master', route: 'FeeOperations', params: { tab: 'discount-master' }, menuKey: 'FeeDiscountMaster' },
      { title: 'Demand Bill', route: 'FeeOperations', params: { tab: 'demand-bill' }, menuKey: 'DemandBill' },
      { title: 'Fee Concessions', route: 'FeeOperations', params: { tab: 'concessions' }, menuKey: 'FeeConcessions' },
      { title: 'Fee Reports', route: 'Reports', params: { reportCategory: 'fees' }, menuKey: 'FeeReports' },
    ],
  },
  {
    title: 'Attendance & Timetable',
    icon: 'calendar',
    color: '#f59e0b',
    children: [
      { title: 'Student Attendance', route: 'Attendance', menuKey: 'StudentAttendance' },
      { title: 'Staff Attendance', route: 'Attendance', params: { mode: 'staff' }, menuKey: 'StaffAttendance' },
      { title: 'Leave Management', route: 'LeaveManagement', menuKey: 'LeaveManagement' },
      { title: 'Attendance Reports', route: 'Reports', params: { reportCategory: 'attendance' }, menuKey: 'AttendanceReports' },
      { title: 'Holiday Calendar', route: 'LeaveManagement', params: { tab: 'holidays' }, menuKey: 'HolidayCalendar' },
      { title: 'Class Timetable', route: 'Timetable', params: { tab: 'class' }, menuKey: 'ClassTimetable' },
      { title: 'Teacher Timetable', route: 'Timetable', params: { tab: 'teacher' }, menuKey: 'TeacherTimetable' },
      { title: 'Substitutions', route: 'Timetable', params: { tab: 'substitution' }, menuKey: 'Substitutions' },
    ],
  },
  {
    title: 'Examinations',
    icon: 'book',
    color: '#ec4899',
    children: [
      { title: 'Exam Schedules', route: 'Exams', params: { tab: 'schedules' }, menuKey: 'ExamSchedules' },
      { title: 'Marks Entry', route: 'Exams', params: { tab: 'marks' }, menuKey: 'MarksEntry' },
      { title: 'Report Cards', route: 'Reports', params: { reportCategory: 'exams' }, menuKey: 'ReportCards' },
    ],
  },
  {
    title: 'Transport',
    icon: 'bus',
    color: '#f97316',
    children: [
      { title: 'Vehicles', route: 'Transport', params: { tab: 'vehicles' }, menuKey: 'Vehicles' },
      { title: 'Routes & Stops', route: 'Transport', params: { tab: 'routes' }, menuKey: 'RoutesStops' },
      { title: 'Student Allocations', route: 'Transport', params: { tab: 'allocations' }, menuKey: 'TransportAllocations' },
    ],
  },
  {
    title: 'Promotion & TC',
    icon: 'arrow-up-circle',
    color: '#14b8a6',
    children: [
      { title: 'Promote Students', route: 'PromotionTc', params: { tab: 'promotion' }, menuKey: 'Promotion' },
      { title: 'Transfer Certificates', route: 'PromotionTc', params: { tab: 'tc' }, menuKey: 'TransferCertificates' },
    ],
  },
  {
    title: 'Inventory & Stock',
    icon: 'cube',
    color: '#64748b',
    children: [
      { title: 'Inventory Overview', route: 'Inventory', params: { tab: 'overview' }, menuKey: 'InventoryOverview' },
      { title: 'Store & Slip Setup', route: 'Inventory', params: { tab: 'store-setup' }, menuKey: 'InventoryOverview' },
      { title: 'Items Master', route: 'Inventory', params: { tab: 'items' }, menuKey: 'ItemsMaster' },
      { title: 'Item Categories', route: 'Inventory', params: { tab: 'categories' }, menuKey: 'ItemCategories' },
      { title: 'Suppliers / Vendors', route: 'Inventory', params: { tab: 'suppliers' }, menuKey: 'Suppliers' },
      { title: 'Manufactures', route: 'Inventory', params: { tab: 'manufactures' }, menuKey: 'Manufactures' },
      { title: 'Stock Inward (Purchase)', route: 'Inventory', params: { tab: 'inward' }, menuKey: 'StockInward' },
      { title: 'Stock Issue (Outward)', route: 'Inventory', params: { tab: 'issue' }, menuKey: 'StockIssue' },
      { title: 'Item Return (Sale Return)', route: 'Inventory', params: { tab: 'return' }, menuKey: 'StockIssue' },
      { title: 'Stock Movement Ledger', route: 'Inventory', params: { tab: 'ledger' }, menuKey: 'StockLedger' },
    ],
  },
  {
    title: 'Expenses',
    icon: 'receipt',
    color: '#ef4444',
    children: [
      { title: 'Expenses', route: 'Expenses', menuKey: 'Expenses' },
    ],
  },
  {
    title: 'Reports',
    icon: 'bar-chart',
    color: '#3b82f6',
    children: [
      { title: 'Reports Hub', route: 'Reports', menuKey: 'Reports' },
      { title: 'Fee Reports', route: 'Reports', params: { reportCategory: 'fees' }, menuKey: 'FeeReports' },
      { title: 'Attendance Reports', route: 'Reports', params: { reportCategory: 'attendance' }, menuKey: 'AttendanceReports' },
      { title: 'Exam Reports', route: 'Reports', params: { reportCategory: 'exams' }, menuKey: 'ReportCards' },
    ],
  },
];

export default function HomeScreen({ navigation }) {
  const {
    user,
    logout,
    activeAcademicYearId,
    activeAcademicYearName,
    switchAcademicYear,
    fetchAcademicYears,
  } = useContext(AuthContext);

  const { hasPermission, isSuperAdmin } = usePermission();
  const { theme, isDark, toggleTheme, colors } = useTheme();

  // Navigation Drawer State
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState({
    'Masters': true,
    'Students & Admission': true,
    'Fees Management': true,
    'Attendance & Timetable': true,
  });

  const toggleDrawerSection = (title) => {
    setDrawerExpanded((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Launcher Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [launcherSearch, setLauncherSearch] = useState('');
  const [showDiwaliModal, setShowDiwaliModal] = useState(false);

  const permittedModules = useMemo(() => {
    return QUICK_MODULES.filter((mod) => {
      if (mod.superAdminOnly && !isSuperAdmin) return false;
      if (isSuperAdmin) return true;
      if (mod.isPortal) return true;
      if (!mod.menuKey) return true;
      return hasPermission(mod.menuKey, 'View');
    });
  }, [hasPermission, isSuperAdmin]);

  const displayedModules = useMemo(() => {
    return permittedModules.filter((mod) => {
      const matchesCat = selectedCategory === 'all' || mod.category === selectedCategory;
      const q = launcherSearch.trim().toLowerCase();
      const matchesSearch = !q || mod.title.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [permittedModules, selectedCategory, launcherSearch]);
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  ) + 8;

  // Draggable Floating Settings Button State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          isDragging.current = true;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (!isDragging.current || (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6)) {
          setShowSettingsModal(true);
        }
      },
    })
  ).current;

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalClasses: 0,
    totalSections: 0,
    todayAttendance: { totalMarked: 0, present: 0, absent: 0, halfDay: 0, leave: 0, percentage: 0 },
    feeSummary: { totalCollected: 0, totalPending: 0, totalFeeDue: 0 },
    enquiries: { total: 0, converted: 0, open: 0 },
    recentAdmissions: [],
    recentFeeReceipts: [],
    classWiseEnrollment: [],
    monthlyFeeCollection: [],
    genderDistribution: { male: 0, female: 0, other: 0 },
    birthdays: { todayBirthdays: [], upcomingBirthdays: [], totalThisMonth: 0 },
    academicYearName: '2026-27',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Role-Based Dashboard Views
  const isAccountantRole = user?.userType === 5 || /account|cashier|fee/i.test(user?.roleName || '');
  const isTeacherRole = user?.userType === 4 || /teacher|faculty|educator/i.test(user?.roleName || '');
  const isFrontDeskRole = /clerk|enquir|reception|counsel|admission/i.test(user?.roleName || '');

  const defaultRoleView = isAccountantRole
    ? 'accounts'
    : isTeacherRole
    ? 'academics'
    : isFrontDeskRole
    ? 'admissions'
    : 'executive';

  const [activeRoleView, setActiveRoleView] = useState(defaultRoleView);
  const [selectedMonthBar, setSelectedMonthBar] = useState(null);
  const [birthdayFilter, setBirthdayFilter] = useState('all'); // 'all' | 'students' | 'staff'
  const [recentTab, setRecentTab] = useState('receipts'); // 'receipts' | 'admissions'
  const [showAllClasses, setShowAllClasses] = useState(false);

  // Fee Recovery Percentage
  const recoveryPercentage = useMemo(() => {
    const coll = Number(stats.feeSummary?.totalCollected || 0);
    const pend = Number(stats.feeSummary?.totalPending || 0);
    const total = coll + pend;
    return total > 0 ? Math.round((coll / total) * 100) : 0;
  }, [stats.feeSummary]);

  // WhatsApp Birthday Wish Handler
  const handleWishBirthday = (person) => {
    const rawMobile = person.mobile || person.phone || '';
    const cleanMobile = rawMobile.replace(/[^0-9]/g, '');
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const greeting = encodeURIComponent(
      `Dear ${person.fullName}, wishing you a very Happy Birthday! 🎉 May this year bring you joy, good health, and success. - Best wishes from ${user?.schoolName || 'School Management'}`
    );
    if (phone) {
      Linking.openURL(`https://wa.me/${phone}?text=${greeting}`).catch(() => {
        Alert.alert('Notice', 'Unable to open WhatsApp.');
      });
    } else {
      Alert.alert(
        'Birthday Wish',
        `No phone number recorded for ${person.fullName}.\n\nGreeting:\nDear ${person.fullName}, wishing you a very Happy Birthday! 🎉`
      );
    }
  };

  // Session Switch Modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionList, setSessionList] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await dashboardApi.getStats({ academicYearId: activeAcademicYearId });
      if (res.data?.success && res.data.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.warn('Dashboard stats fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSessions = async () => {
    try {
      setSessionLoading(true);
      const res = await academicYearApi.getAcademicYears();
      if (res.data?.success && res.data.data) {
        setSessionList(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load academic years:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAcademicYears();
    loadSessions();
  }, [activeAcademicYearId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
    loadSessions();
  }, [activeAcademicYearId]);

  const handleOpenSessionModal = () => {
    loadSessions();
    setShowSessionModal(true);
  };

  const handleSwitchSession = async (session) => {
    try {
      await switchAcademicYear(session.id, session.name);
      setShowSessionModal(false);
      setLoading(true);
      fetchDashboardData();
      Alert.alert('Session Switched', `Active academic session is now ${session.name}.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to switch academic session.');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const displaySessionName = activeAcademicYearName || stats.academicYearName || user?.academicYearName || '2026-27';

  // Live date string
  const todayDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={isDark ? colors.cardBg : '#0284c7'}
      />

      {/* Modern Top Executive Header with Status Bar Safe Area Padding */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.cardBg : '#0284c7', paddingTop: safeTopPadding }]}>
        <View style={styles.headerLeftRow}>
          {/* Hamburger Sidebar Trigger Button (Matching Web Sidebar ☰) */}
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setDrawerVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            title="Open ERP Navigation Sidebar"
          >
            <Ionicons name="menu" size={26} color="#ffffff" />
          </TouchableOpacity>

          <Image
            source={require('../../assets/dvslogo1.jpeg')}
            style={[styles.headerLogo, { borderRadius: 19 }]}
            resizeMode="contain"
          />
          <View style={styles.headerLeft}>
            <View style={styles.headerBrandRow}>
              <Text style={styles.headerBrandName} numberOfLines={1}>
                {user?.schoolName ? user.schoolName : 'Delhi Public School'}
              </Text>
              {user?.branchName ? (
                <View style={styles.branchPill}>
                  <Text style={styles.branchPillText}>{user.branchName}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.headerUserName} numberOfLines={1}>
              {user?.fullName || user?.username || 'Super Administrator'}
            </Text>

            <View style={styles.metaRow}>
              <View style={[styles.roleBadge, isDark && { backgroundColor: '#334155' }]}>
                <Text style={styles.roleBadgeText}>{user?.roleName || 'SUPER ADMIN'}</Text>
              </View>
              <TouchableOpacity
                style={styles.sessionBadge}
                onPress={handleOpenSessionModal}
                activeOpacity={0.8}
              >
                <MaterialIcons name="event" size={11} color="#ffffff" />
                <Text style={styles.sessionBadgeText}>{displaySessionName}</Text>
                <MaterialIcons name="arrow-drop-down" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Header Actions (SuperAdmin + Theme Toggle + Quick Settings) */}
        <View style={styles.headerRightActions}>
          {/* Super Admin Command Center Portal Button */}
          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: '#4338ca' }]}
              onPress={() => navigation.navigate('SuperAdmin')}
              activeOpacity={0.8}
              title="Open Super Admin Portal"
            >
              <Ionicons name="shield-checkmark" size={17} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Dark / Light Mode Toggle Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, isDark && { backgroundColor: '#334155' }]}
            onPress={toggleTheme}
            activeOpacity={0.8}
            title="Toggle Dark / Light Theme"
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={17}
              color={isDark ? '#fbbf24' : '#ffffff'}
            />
          </TouchableOpacity>

          {/* Diwali Celebration Button */}
          <TouchableOpacity
            style={[
              styles.headerIconBtn,
              { backgroundColor: '#b45309', borderColor: '#fde047', borderWidth: 1 },
            ]}
            onPress={() => setShowDiwaliModal(true)}
            activeOpacity={0.8}
            title="Happy Diwali Wishes"
          >
            <Text style={{ fontSize: 15 }}>🪔</Text>
          </TouchableOpacity>

          {/* Quick Settings & Control Center Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, isDark && { backgroundColor: '#334155' }]}
            onPress={() => setShowSettingsModal(true)}
            activeOpacity={0.8}
            title="Quick Controls"
          >
            <Ionicons name="settings-sharp" size={17} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Festive Diwali Celebration Banner */}
        <TouchableOpacity
          style={[
            styles.diwaliBanner,
            isDark && { backgroundColor: '#1a0b2e', borderColor: '#d97706' },
          ]}
          onPress={() => setShowDiwaliModal(true)}
          activeOpacity={0.88}
        >
          <View style={styles.diwaliBannerGlow} />
          <View style={styles.diwaliBannerLeft}>
            <View style={[styles.diwaliDiyaIconWrap, isDark && { backgroundColor: '#2e1065' }]}>
              <Text style={{ fontSize: 22 }}>🪔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.diwaliBannerTitle, isDark && { color: '#fbbf24' }]}>
                शुभ दीपावली • Happy Diwali! ✨
              </Text>
              <Text
                style={[styles.diwaliBannerSub, isDark && { color: '#cbd5e1' }]}
                numberOfLines={1}
              >
                Warm festive wishes from {user?.schoolName || 'School Campus'}
              </Text>
            </View>
          </View>
          <View style={styles.diwaliBannerPill}>
            <Text style={styles.diwaliBannerPillText}>Wishes 🌟</Text>
          </View>
        </TouchableOpacity>

        {/* Modules Grid Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="grid-outline" size={17} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              All Modules & Services ({displayedModules.length})
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ModulesHub')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Modules Hub →</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Search & Category Filter Section */}
        <View style={styles.launcherFilterSection}>
          {/* Quick Search Input */}
          <View
            style={[
              styles.launcherSearchBox,
              { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.launcherSearchInput, { color: colors.textPrimary }]}
              placeholder="Search module or service (e.g. roll, demand, tc)..."
              placeholderTextColor={colors.textSecondary}
              value={launcherSearch}
              onChangeText={setLauncherSearch}
            />
            {launcherSearch ? (
              <TouchableOpacity onPress={() => setLauncherSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsScroll}
          >
            {CATEGORY_FILTERS.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    active
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={cat.icon}
                    size={12}
                    color={active ? '#ffffff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? '#ffffff' : colors.textPrimary, fontWeight: active ? '700' : '600' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Smartphone App Launcher 4-Column Grid (Like Native Phone App Drawer) */}
        <View style={[styles.launcherContainer, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#e2e8f0' }]}>
          {displayedModules.length === 0 ? (
            <View style={styles.emptyLauncherBox}>
              <Ionicons name="search-outline" size={26} color={colors.textSecondary} />
              <Text style={[styles.emptyLauncherText, { color: colors.textSecondary }]}>
                No modules match "{launcherSearch}".
              </Text>
            </View>
          ) : (
            <View style={styles.launcherGrid}>
              {displayedModules.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.launcherItem}
                  onPress={() => navigation.navigate(mod.screen, mod.params || {})}
                  activeOpacity={0.72}
                >
                  {/* Native App Squircle Icon (54x54) */}
                  <View style={[styles.launcherIconSquircle, { backgroundColor: mod.color, shadowColor: mod.shadowColor }]}>
                    <View style={styles.launcherGlassShine} />
                    <Ionicons name={mod.icon} size={25} color="#ffffff" />
                  </View>

                  {/* Clean Single-line App Name */}
                  <Text
                    style={[styles.launcherLabel, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {mod.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* ACADEMIC SESSION SWITCH MODAL                            */}
      {/* ======================================================== */}
      <Modal
        visible={showSessionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSessionModal(false)}
      >
        <View style={styles.sessionModalOverlay}>
          <View style={[styles.sessionModalBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.sessionModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="date-range" size={22} color={colors.primary} />
                <Text style={[styles.sessionModalTitle, { color: colors.textPrimary }]}>
                  Select Academic Session
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSessionModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sessionModalSubtitle, { color: colors.textSecondary }]}>
              Switching session updates all student rosters, fee demands, and academic reports.
            </Text>

            {sessionLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={sessionList}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
                renderItem={({ item }) => {
                  const isCurrentActive =
                    String(item.id) === String(activeAcademicYearId) ||
                    item.name === activeAcademicYearName;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.sessionItem,
                        { backgroundColor: colors.bg, borderColor: colors.cardBorder },
                        isCurrentActive && { borderColor: colors.primary, borderWidth: 2, backgroundColor: isDark ? '#082f49' : '#f0f9ff' },
                      ]}
                      onPress={() => handleSwitchSession(item)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={[
                              styles.sessionItemName,
                              { color: colors.textPrimary },
                              isCurrentActive && { color: colors.primary, fontWeight: '800' },
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.isCurrent ? (
                            <View style={styles.defaultPill}>
                              <Text style={styles.defaultPillText}>System Default</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={[styles.sessionItemDates, { color: colors.textSecondary }]}>
                          {item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN') : 'Start'} —{' '}
                          {item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN') : 'End'}
                        </Text>
                      </View>

                      {isCurrentActive ? (
                        <MaterialIcons name="check-circle" size={22} color={colors.primary} />
                      ) : (
                        <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* DRAGGABLE FLOATING SETTINGS BUTTON (MOVE ANYWHERE)       */}
      {/* ======================================================== */}
      <Animated.View
        style={[
          styles.draggableFab,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setShowSettingsModal(true)}
          style={[styles.fabCircle, isDark ? { backgroundColor: '#2563eb' } : { backgroundColor: '#0284c7' }]}
        >
          <Ionicons name="settings" size={24} color="#ffffff" />
          <View style={styles.fabPulseBadge} />
        </TouchableOpacity>
      </Animated.View>

      {/* ======================================================== */}
      {/* QUICK SETTINGS & CONTROL CENTER MODAL                    */}
      {/* ======================================================== */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.controlModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setShowSettingsModal(false)}
          />
          <View style={[styles.controlSheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {/* Top Sheet Drag Indicator */}
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />

            <View style={styles.controlSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.controlSheetIconWrap, { backgroundColor: isDark ? '#082f49' : '#e0f2fe' }]}>
                  <Ionicons name="options-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.controlSheetTitle, { color: colors.textPrimary }]}>
                    Executive Controls
                  </Text>
                  <Text style={[styles.controlSheetSub, { color: colors.textSecondary }]}>
                    Quick Settings & Session Controls
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={[styles.controlCloseBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* User Profile Card */}
            <View style={[styles.controlProfileCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder }]}>
              <Image
                source={require('../../assets/dvslogo1.jpeg')}
                style={[styles.controlAvatar, { borderRadius: 24 }]}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.controlSchoolName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {user?.schoolName || 'Delhi Public School'}
                </Text>
                <Text style={[styles.controlUserName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {user?.fullName || user?.username || 'Super Administrator'}
                </Text>
                <View style={styles.controlBadgeRow}>
                  <View style={styles.controlRoleBadge}>
                    <Text style={styles.controlRoleBadgeText}>{user?.roleName || 'SUPER ADMIN'}</Text>
                  </View>
                  <View style={styles.controlStatusBadge}>
                    <View style={styles.controlOnlineDot} />
                    <Text style={styles.controlStatusText}>{user?.branchName || 'Main Campus'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Control Options List */}
            <View style={styles.controlOptionsList}>
              {/* Option 1: Dark / Light Mode Switch */}
              <TouchableOpacity
                style={[styles.controlOptionRow, { borderColor: colors.cardBorder }]}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#312e81' : '#fef3c7' }]}>
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={20}
                    color={isDark ? '#a5b4fc' : '#d97706'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    Theme Mode
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Currently {isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
                  </Text>
                </View>
                <View style={[styles.themePill, { backgroundColor: isDark ? '#4338ca' : '#0284c7' }]}>
                  <Text style={styles.themePillText}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Academic Session Switch */}
              <TouchableOpacity
                style={[styles.controlOptionRow, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowSessionModal(true), 250);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#064e3b' : '#dcfce7' }]}>
                  <Ionicons name="calendar" size={20} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    Academic Session
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Active: {displaySessionName}
                  </Text>
                </View>
                <View style={styles.sessionChangePill}>
                  <Text style={styles.sessionChangePillText}>Change 📅</Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Refresh Campus Metrics */}
              <TouchableOpacity
                style={[styles.controlOptionRow, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  setShowSettingsModal(false);
                  onRefresh();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#0c4a6e' : '#e0f2fe' }]}>
                  <Ionicons name="refresh" size={20} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    Refresh Metrics
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Sync fees, attendance & leads
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Logout Action Button */}
            <TouchableOpacity
              style={styles.controlLogoutBtn}
              onPress={() => {
                setShowSettingsModal(false);
                Alert.alert(
                  'Confirm Logout',
                  'Are you sure you want to log out from School ERP?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: handleLogout },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={19} color="#ef4444" />
              <Text style={styles.controlLogoutText}>Logout from School ERP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MOBILE APPLICATION SIDEBAR DRAWER (MATCHING WEB 1:1)     */}
      {/* ======================================================== */}
      <Modal
        visible={drawerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setDrawerVisible(false)}
          />

          <View style={[styles.drawerContent, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, { backgroundColor: isDark ? '#1e293b' : '#0284c7' }]}>
              <View style={styles.drawerBrandRow}>
                <Image
                  source={require('../../assets/dvslogo1.jpeg')}
                  style={[styles.drawerLogo, { borderRadius: 24 }]}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.drawerBrandTitle} numberOfLines={1}>
                    {user?.schoolName || 'Digital Vidya Saarthi'}
                  </Text>
                  <Text style={styles.drawerBrandSub} numberOfLines={1}>
                    Branch: {user?.branchName || 'Main Campus'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDrawerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.drawerUserRow}>
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>
                    {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.drawerUserName} numberOfLines={1}>
                    {user?.fullName || user?.username || 'Administrator'}
                  </Text>
                  <Text style={styles.drawerUserRole}>{user?.roleName || 'Super Admin'}</Text>
                </View>
              </View>
            </View>

            {/* Drawer Menu List matching user's screenshots 1:1 */}
            <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
              {/* 1. Dashboard */}
              <TouchableOpacity
                style={styles.drawerItemSingle}
                onPress={() => {
                  setDrawerVisible(false);
                  navigation.navigate('Home');
                }}
              >
                <MaterialIcons name="dashboard" size={20} color="#0284c7" />
                <Text style={[styles.drawerItemSingleText, { color: colors.textPrimary }]}>Dashboard</Text>
              </TouchableOpacity>

              {/* Accordion Categories */}
              {SIDEBAR_MENU_DATA.map((menu, mIdx) => {
                const allowedChildren = menu.children.filter((child) => {
                  if (child.superAdminOnly && !isSuperAdmin) return false;
                  if (isSuperAdmin) return true;
                  if (!child.menuKey) return true;
                  return hasPermission(child.menuKey, 'View');
                });
                if (allowedChildren.length === 0 && !isSuperAdmin) return null;

                const isOpen = drawerExpanded[menu.title] !== false;

                return (
                  <View key={mIdx} style={styles.drawerSection}>
                    <TouchableOpacity
                      style={styles.drawerSectionHeader}
                      onPress={() => toggleDrawerSection(menu.title)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons name={menu.icon} size={18} color={menu.color || '#0284c7'} />
                        <Text style={[styles.drawerSectionTitle, { color: colors.textPrimary }]}>
                          {menu.title}
                        </Text>
                      </View>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.drawerSubList}>
                        {allowedChildren.map((item, cIdx) => (
                          <TouchableOpacity
                            key={cIdx}
                            style={styles.drawerSubItem}
                            onPress={() => {
                              setDrawerVisible(false);
                              navigation.navigate(item.route, item.params || {});
                            }}
                          >
                            <Text style={[styles.drawerSubItemText, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                              {item.title}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Drawer Footer */}
            <View style={[styles.drawerFooter, { borderTopColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.drawerLogoutBtn}
                onPress={() => {
                  setDrawerVisible(false);
                  handleLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={styles.drawerLogoutText}>Logout</Text>
              </TouchableOpacity>
              <Text style={styles.drawerVersionText}>School ERP v2.4.0</Text>
            </View>
          </View>
        </View>
      </Modal>
      {/* Diwali Celebration Greeting Modal */}
      <DiwaliGreetingModal
        visible={showDiwaliModal}
        onClose={() => setShowDiwaliModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // Festive Diwali Banner
  diwaliBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  diwaliBannerGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  diwaliBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  diwaliDiyaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fde68a',
    borderWidth: 1,
    borderColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diwaliBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.3,
  },
  diwaliBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#b45309',
    marginTop: 1,
  },
  diwaliBannerPill: {
    backgroundColor: '#f59e0b',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginLeft: 8,
  },
  diwaliBannerPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#451a03',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hamburgerBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrandName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  branchPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  branchPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e0f2fe',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sessionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Header Right Actions
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heroLeft: {
    flex: 1,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  heroDateText: {
    fontSize: 11.5,
    color: '#e0f2fe',
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 11.5,
    color: '#bae6fd',
    marginBottom: 14,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  heroActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  changeSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeSessionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },

  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },

  // Stats Grid
  statsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statSubText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Launcher Filter & Search Section
  launcherFilterSection: {
    marginBottom: 12,
    gap: 10,
  },
  launcherSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  launcherSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  categoryChipsScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
  },
  emptyLauncherBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyLauncherText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 4-Column Smartphone App Launcher Grid (Like Android / iOS App Drawer)
  launcherContainer: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  launcherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },
  launcherItem: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  launcherIconSquircle: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    position: 'relative',
    overflow: 'hidden',
  },
  launcherGlassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  launcherLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.1,
  },

  // Draggable Floating Action Button
  draggableFab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 9999,
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  fabPulseBadge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },

  // Quick Controls & Settings Modal
  controlModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  controlSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  controlSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlSheetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  controlSheetSub: {
    fontSize: 12,
    marginTop: 1,
  },
  controlCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  controlAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  controlSchoolName: {
    fontSize: 15,
    fontWeight: '800',
  },
  controlUserName: {
    fontSize: 12.5,
    marginTop: 1,
  },
  controlBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  controlRoleBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  controlRoleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  controlStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  controlOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  controlStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  controlOptionsList: {
    gap: 10,
    marginBottom: 16,
  },
  controlOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  sessionChangePill: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sessionChangePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  controlLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  controlLogoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Session Modal
  sessionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sessionModalBox: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  sessionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sessionModalSubtitle: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sessionItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionItemDates: {
    fontSize: 11,
    marginTop: 2,
  },
  defaultPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803d',
  },

  // Slide-out Drawer Styles matching Web Sidebar
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContent: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 10 : 24,
    paddingBottom: 16,
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  drawerBrandTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  drawerBrandSub: {
    fontSize: 10.5,
    color: '#bae6fd',
    marginTop: 1,
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    borderRadius: 10,
  },
  drawerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerAvatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  drawerUserName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  drawerUserRole: {
    fontSize: 10,
    color: '#e0f2fe',
    marginTop: 1,
  },
  drawerScroll: {
    flex: 1,
    paddingVertical: 10,
  },
  drawerItemSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  drawerItemSingleText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  drawerSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
  },
  drawerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  drawerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  drawerSubList: {
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
    paddingVertical: 4,
  },
  drawerSubItem: {
    paddingVertical: 9,
    paddingLeft: 44,
    paddingRight: 16,
  },
  drawerSubItemText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawerLogoutText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ef4444',
  },
  drawerVersionText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '600',
  },

  // Role Tabs
  roleTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  roleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  roleTabText: {
    fontSize: 11,
  },

  // Analytics Section & Charts
  analyticsSection: {
    marginBottom: 18,
    gap: 12,
  },
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  chartSubtitle: {
    fontSize: 10.5,
  },
  chartTooltipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 95,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barMonthText: {
    fontSize: 10.5,
    marginTop: 6,
  },
  chartFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Gauge & Progress Meters
  gaugeBarContainer: {
    marginVertical: 4,
  },
  multiProgressBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  progressSegment: {
    height: '100%',
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  feeBreakdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  feeBreakdownBox: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
  },
  dotPill: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Attendance Breakdown Grid
  attendanceGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  attPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },

  // Class Enrollment Rows
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classNameLabel: {
    width: 70,
    fontSize: 11.5,
    fontWeight: '700',
  },
  classBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  classBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  classCountBadge: {
    width: 65,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '700',
  },

  // Gender Distribution
  genderMetricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
  },

  // Birthdays & Celebrations
  bdayFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyBdayBox: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  bdayPersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  bdayAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bdayAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  bdayName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  todayBdayBadge: {
    backgroundColor: '#fef08a',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  todayBdayBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#854d0e',
  },
  bdayRoleText: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  whatsAppWishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  whatsAppWishBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Recent Activity Feed
  recentTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  recentItemTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentItemSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
});
