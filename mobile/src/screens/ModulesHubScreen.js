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

export default function ModulesHubScreen({ navigation }) {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    'Students & Admission': true,
    'Fees Management': true,
    'Attendance & Timetable': true,
    'Examinations': true,
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
        { label: 'User Directory', route: 'Users', sub: 'Accounts, credentials & active status' },
        { label: 'Roles & Privileges', route: 'Users', sub: 'Role mappings and system access' },
      ],
    },
    {
      title: 'Masters & Setup',
      icon: 'construct',
      color: '#0284c7',
      items: [
        { label: 'Classes & Sections', route: 'Masters', sub: 'Class list, section capacities & streams' },
        { label: 'Subjects Master', route: 'Masters', sub: 'Curriculum subjects, codes & theory/practical' },
        { label: 'Academic Years', route: 'Masters', sub: 'Active academic session & dates' },
        { label: 'School & Branch Info', route: 'Masters', sub: 'Campus profile, affiliations & address' },
      ],
    },
    {
      title: 'Students & Admission',
      icon: 'school',
      color: '#0ea5e9',
      items: [
        { label: 'Admission Enquiries', route: 'Enquiries', sub: 'Leads, calls, status & follow-ups' },
        { label: 'New Admission Form', route: 'NewAdmission', sub: 'Student enrollment & guardian details' },
        { label: 'Student Directory', route: 'Students', sub: 'Class-wise student roster & profiles' },
        { label: 'Student Gate Pass', route: 'GatePassList', sub: 'Digital exit slips, photo capture & OTP' },
      ],
    },
    {
      title: 'Staff & HR',
      icon: 'people',
      color: '#8b5cf6',
      items: [
        { label: 'Staff Directory', route: 'Staff', sub: 'Faculty profiles, WhatsApp chat & direct calling' },
        { label: 'Teacher Allocation', route: 'Timetable', sub: 'Subject and class teacher assignments' },
      ],
    },
    {
      title: 'Fees Management',
      icon: 'wallet',
      color: '#10b981',
      items: [
        { label: 'Daily Fee Collection', route: 'Fees', sub: 'Cash, UPI, Cheque breakdown & totals' },
        { label: 'Student Dues & Receipts', route: 'Fees', sub: 'Fee search, payment collection & slips' },
      ],
    },
    {
      title: 'Attendance & Timetable',
      icon: 'calendar',
      color: '#f59e0b',
      items: [
        { label: 'Daily Attendance', route: 'Attendance', sub: 'Present, Absent, Late & HalfDay marking' },
        { label: 'Leave Applications', route: 'LeaveManagement', sub: 'Staff & student leaves with 1-tap approval' },
        { label: 'Holiday Calendar', route: 'LeaveManagement', sub: 'Official school holidays & breaks' },
        { label: 'Class Timetables', route: 'Timetable', sub: 'Period schedule, teachers & room numbers' },
      ],
    },
    {
      title: 'Examinations',
      icon: 'book',
      color: '#ec4899',
      items: [
        { label: 'Exam Schedules', route: 'Exams', sub: 'Term examinations & timetable dates' },
        { label: 'Marks Entry Sheet', route: 'Exams', sub: 'Enter student scores & absent tracking' },
      ],
    },
    {
      title: 'Transport',
      icon: 'bus',
      color: '#f97316',
      items: [
        { label: 'Vehicles & Fleet', route: 'Transport', sub: 'Buses, vans, drivers & direct phone calls' },
        { label: 'Routes & Stops', route: 'Transport', sub: 'Pickup routes, morning/evening timings' },
      ],
    },
    {
      title: 'Promotion & TC',
      icon: 'arrow-up-circle',
      color: '#14b8a6',
      items: [
        { label: 'Transfer Certificates (TC)', route: 'PromotionTc', sub: 'Issue school leaving certificates' },
        { label: 'Batch Student Promotion', route: 'PromotionTc', sub: 'Promote students to next academic class' },
      ],
    },
    {
      title: 'Store & Inventory',
      icon: 'cube',
      color: '#64748b',
      items: [
        { label: 'Inventory Catalog', route: 'Inventory', sub: 'Items stock, categories & low stock alert' },
      ],
    },
    {
      title: 'Expenses',
      icon: 'receipt',
      color: '#ef4444',
      items: [
        { label: 'Expense Vouchers', route: 'Expenses', sub: 'Expense tracking, receipts & Add Voucher' },
      ],
    },
    {
      title: 'Communication',
      icon: 'notifications',
      color: '#3b82f6',
      items: [
        { label: 'Circulars & Notices', route: 'Notices', sub: 'School notices, news & announcements' },
      ],
    },
  ];

  const filteredModules = modules
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
                <View style={[styles.sectionIconCircle, { backgroundColor: `${mod.color}15` }]}>
                  <Ionicons name={mod.icon} size={20} color={mod.color} />
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
                      onPress={() => navigation.navigate(item.route)}
                    >
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
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    margin: 12,
    marginBottom: 6,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  itemCountBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: isDark ? '#0f172a' : '#fafbfc',
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
