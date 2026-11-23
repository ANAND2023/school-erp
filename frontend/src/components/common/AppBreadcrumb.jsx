import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useAcademicYear } from '../../hooks/useAcademicYear';

// Comprehensive route registry for breadcrumb, title, and metadata
export const routeBreadcrumbMap = {
  '/dashboard': {
    module: 'Overview',
    moduleIcon: 'pi pi-th-large',
    modulePath: '/dashboard',
    title: 'Executive Dashboard',
    subtitle: 'Real-time school operational metrics, student attendance summary, and fee collection overview',
    code: 'Dashboard',
  },

  // Module 1: Auth & Access
  '/users': {
    module: 'Auth & Access',
    moduleIcon: 'pi pi-shield',
    modulePath: '/users',
    title: 'User Management',
    subtitle: 'Manage administrative and staff user accounts, credentials, and access statuses',
    code: 'Module 1',
  },
  '/roles': {
    module: 'Auth & Access',
    moduleIcon: 'pi pi-shield',
    modulePath: '/roles',
    title: 'Roles & Permissions',
    subtitle: 'Configure role-based access control (RBAC) and granular permission matrices',
    code: 'Module 1',
  },
  '/audit-logs': {
    module: 'Auth & Access',
    moduleIcon: 'pi pi-shield',
    modulePath: '/audit-logs',
    title: 'Audit Logs & Security',
    subtitle: 'Review immutable system activity logs, security trails, and timestamped user actions',
    code: 'Audit',
  },
  '/change-password': {
    module: 'Account Settings',
    moduleIcon: 'pi pi-key',
    modulePath: '/change-password',
    title: 'Change Password',
    subtitle: 'Update your account login password and personal security credentials',
  },

  // Module 2: Masters
  '/masters/branch': {
    module: 'Masters',
    moduleIcon: 'pi pi-cog',
    modulePath: '/masters/branch',
    title: 'School & Branch Master',
    subtitle: 'Configure school institutional profile, campus address, logo, and affiliation details',
    code: 'Module 2',
  },
  '/masters/academic-years': {
    module: 'Masters',
    moduleIcon: 'pi pi-cog',
    modulePath: '/masters/academic-years',
    title: 'Academic Years & Sessions',
    subtitle: 'Manage academic calendar sessions, cycle start/end dates, and set current active session',
    code: 'Module 2',
  },
  '/masters/classes': {
    module: 'Masters',
    moduleIcon: 'pi pi-cog',
    modulePath: '/masters/classes',
    title: 'Classes & Sections Master',
    subtitle: 'Manage standard classes, sections, student capacity limits, and class teacher assignments',
    code: 'Module 2',
  },
  '/masters/subjects': {
    module: 'Masters',
    moduleIcon: 'pi pi-cog',
    modulePath: '/masters/subjects',
    title: 'Subjects Catalog',
    subtitle: 'Define institutional subjects, curriculum codes, and subject classification types',
    code: 'Module 2',
  },
  '/masters/class-subjects': {
    module: 'Masters',
    moduleIcon: 'pi pi-cog',
    modulePath: '/masters/class-subjects',
    title: 'Class-Subject Mapping',
    subtitle: 'Map curriculum subjects to classes and assign teaching periods and weekly schedules',
    code: 'Module 2',
  },
  '/masters/simple': {
    module: 'Masters',
    moduleIcon: 'pi pi-cog',
    modulePath: '/masters/simple',
    title: 'Simple Masters',
    subtitle: 'Manage lookup reference data: departments, designations, blood groups, and categories',
    code: 'Module 2',
  },

  // Module 3: Students & Admission
  '/enquiries': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/students',
    title: 'Student Enquiries',
    subtitle: '',
    code: 'Module 3',
  },
  '/admissions/new': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/students',
    title: 'New Student Admission',
    subtitle: 'Register new student, enter bio and guardian info, upload documents, and assign class',
    code: 'Module 3',
  },
  '/students': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/students',
    title: 'Student Directory',
    subtitle: 'Manage student records, active enrollment profiles, roll numbers, and section allotments',
    code: 'Module 3',
  },
  '/students/roll-numbers': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/students',
    title: 'Roll Number Assignment',
    subtitle: 'Assign or auto-generate sequential student roll numbers by class and section',
    code: 'Module 3',
  },
  '/students/section-change': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/students',
    title: 'Section Transfer & Reallocation',
    subtitle: 'Process student section reassignment and review historical transfer logs',
    code: 'Module 3',
  },
  '/students/gate-pass': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/students',
    title: 'Student Gate Pass',
    subtitle: 'Issue, track student campus departures, and verify security gate clearances',
    code: 'Module 3',
  },
  '/students/fee-structure': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/students',
    title: 'Class Fee Structure (Enquiry)',
    subtitle: 'Class-wise annual fee breakdown, installment schedule, and prospectus for student enquiries',
    code: 'Module 3',
  },
  '/registrations/builder': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/registrations/builder',
    title: 'Registration Form Builder',
    subtitle: 'Drag-and-drop dynamic registration form customization for academic sessions',
    code: 'Module 3',
  },
  '/registrations/slip-generator': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/registrations/slip-generator',
    title: 'Registration Slip Generator',
    subtitle: 'Generate individual and bulk registration slips with integrated fee collection',
    code: 'Module 3',
  },
  '/registrations/slips-list': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/registrations/slips-list',
    title: 'Registration Slips Register',
    subtitle: 'Searchable directory of generated student registration slips and payment status',
    code: 'Module 3',
  },
  '/admissions/builder': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/admissions/builder',
    title: 'Registration Form Builder',
    subtitle: 'Drag-and-drop dynamic registration form customization for academic sessions',
    code: 'Module 3',
  },
  '/admissions/slip-generator': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/admissions/slip-generator',
    title: 'Registration Slip Generator',
    subtitle: 'Generate individual and bulk registration slips with integrated fee collection',
    code: 'Module 3',
  },
  '/admissions/slips-list': {
    module: 'Students & Admission',
    moduleIcon: 'pi pi-user-plus',
    modulePath: '/admissions/slips-list',
    title: 'Registration Slips Register',
    subtitle: 'Searchable directory of generated student registration slips and payment status',
    code: 'Module 3',
  },

  // Module 4: Staff & HR
  '/staff': {
    module: 'Staff & HR',
    moduleIcon: 'pi pi-users',
    modulePath: '/staff',
    title: 'Staff Directory',
    subtitle: '',
    code: 'Module 4',
  },
  '/staff/allocation': {
    module: 'Staff & HR',
    moduleIcon: 'pi pi-users',
    modulePath: '/staff',
    title: 'Teacher Class Allocation',
    subtitle: 'Allocate class teachers, subject specialists, and weekly workload distribution',
    code: 'Module 4',
  },

  // Module 5: Fees Management
  '/fees/structure': {
    module: 'Fees Management',
    moduleIcon: 'pi pi-wallet',
    modulePath: '/fees/structure',
    title: 'Fee Setup & Structure Configuration',
    subtitle: 'Configure fee heads, fee groups, monthly installments, class structures, and late fine rules',
    code: 'Module 5',
  },
  '/fees/class-structure': {
    module: 'Fees Management',
    moduleIcon: 'pi pi-wallet',
    modulePath: '/fees/structure',
    title: 'Class Fee Structure & Prospectus',
    subtitle: 'Class-wise annual fee breakdown, installment schedule, and prospectus for parent enquiries',
    code: 'Module 5',
  },
  '/fees/assignment': {
    module: 'Fees Management',
    moduleIcon: 'pi pi-wallet',
    modulePath: '/fees/assignment',
    title: 'Student Fee Assignment & Concessions',
    subtitle: 'Assign class fee structures in bulk and apply institutional concessions and discounts',
    code: 'FR-5.2',
  },
  '/fees/collection': {
    module: 'Fees Management',
    moduleIcon: 'pi pi-wallet',
    modulePath: '/fees/collection',
    title: 'Fee Collection Counter',
    subtitle: 'Process student dues collection, late fines, multi-mode split payments, and print receipts',
    code: 'FR-5.4',
  },
  '/fees/concessions': {
    module: 'Fees Management',
    moduleIcon: 'pi pi-wallet',
    modulePath: '/fees/concessions',
    title: 'Fee Concessions & Scholarships',
    subtitle: 'Manage student fee discount approvals, sibling policy concessions, and scholarship allocations',
    code: 'FR-5.3',
  },
  '/fees/reports': {
    module: 'Fees Management',
    moduleIcon: 'pi pi-wallet',
    modulePath: '/fees/reports',
    title: 'Fee Reports & Audit Register',
    subtitle: 'Daily collection logs, cashier reconciliations, mode filters, audit trails, and defaulters list',
    code: 'FR-5.10',
  },

  // Module 6: Attendance & Timetable
  '/attendance/student': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/attendance/student',
    title: 'Student Daily Attendance',
    subtitle: 'Mark and monitor classroom attendance, track absentees, and send automated notifications',
    code: 'Module 6',
  },
  '/attendance/staff': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/attendance/staff',
    title: 'Staff Attendance Register',
    subtitle: 'Track teacher and staff daily check-ins, duty shifts, biometric logs, and punctuality',
    code: 'Module 6',
  },
  '/attendance/leave': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/attendance/leave',
    title: 'Leave Management',
    subtitle: 'Employee leave requests, approvals workflow, and leave balance quota tracking',
    code: 'Module 6',
  },
  '/attendance/reports': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/attendance/reports',
    title: 'Attendance Analytics & Reports',
    subtitle: 'Monthly attendance registers, percentage reports, and chronic absentee tracking',
    code: 'Module 6',
  },
  '/attendance/holidays': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/attendance/holidays',
    title: 'Institutional Holiday Calendar',
    subtitle: 'Official school holidays, festive breaks, and seasonal vacation schedules',
    code: 'Module 6',
  },
  '/timetable/class': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/timetable/class',
    title: 'Class Timetable Schedule',
    subtitle: 'Manage weekly class period timetables, subject slots, and bell schedules',
    code: 'Module 6',
  },
  '/timetable/teacher': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/timetable/teacher',
    title: 'Teacher Workload & Timetable',
    subtitle: 'Teacher-wise weekly period allocation, free periods, and schedule overview',
    code: 'Module 6',
  },
  '/timetable/substitution': {
    module: 'Attendance & Timetable',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/timetable/substitution',
    title: 'Period Substitution Management',
    subtitle: 'Assign substitute teachers for absent staff and maintain automated coverage logs',
    code: 'Module 6',
  },

  // Module 7: Examinations
  '/exams/schedules': {
    module: 'Examinations',
    moduleIcon: 'pi pi-book',
    modulePath: '/exams/schedules',
    title: 'Exam Schedules & Date Sheet',
    subtitle: 'Schedule term examinations, publish class date sheets, and assign invigilators',
    code: 'Module 7',
  },
  '/exams/marks-entry': {
    module: 'Examinations',
    moduleIcon: 'pi pi-book',
    modulePath: '/exams/marks-entry',
    title: 'Marks & Grades Entry',
    subtitle: 'Enter student theory marks, practical scores, and teacher remarks by class & section',
    code: 'Module 7',
  },
  '/exams/report-cards': {
    module: 'Examinations',
    moduleIcon: 'pi pi-book',
    modulePath: '/exams/report-cards',
    title: 'Report Cards & Marksheets',
    subtitle: 'Generate term report cards, compute GPA/percentages, rank analysis, and print marksheets',
    code: 'Module 7',
  },

  // Module 8: Promotion & TC
  '/promotion': {
    module: 'Promotion & TC',
    moduleIcon: 'pi pi-arrow-up-right',
    modulePath: '/promotion',
    title: 'Student Academic Promotion',
    subtitle: 'Promote qualified students to next academic grade or retain students upon session completion',
    code: 'Module 8',
  },
  '/tc': {
    module: 'Promotion & TC',
    moduleIcon: 'pi pi-arrow-up-right',
    modulePath: '/tc',
    title: 'Transfer Certificates (TC)',
    subtitle: 'Issue formal school leaving certificates, record withdrawal reasons, and print certificates',
    code: 'Module 8',
  },
  '/certificates/bonafide': {
    module: 'Certificates',
    moduleIcon: 'pi pi-verified',
    modulePath: '/certificates/bonafide',
    title: 'Bonafide Certificate',
    subtitle: 'Generate, preview, and print officially verified bonafide certificates with dynamic letterhead and formatting',
    code: 'Certificates',
  },
  '/certificates/birth': {
    module: 'Certificates',
    moduleIcon: 'pi pi-calendar',
    modulePath: '/certificates/birth',
    title: 'Date of Birth (DOB) Certificate',
    subtitle: 'Issue certified date of birth verification extracted from official school admission register',
    code: 'Certificates',
  },
  '/certificates/age': {
    module: 'Certificates',
    moduleIcon: 'pi pi-clock',
    modulePath: '/certificates/age',
    title: 'Certificate of Age',
    subtitle: 'Generate verified age certificates calculated as on date from official school records',
    code: 'Certificates',
  },
  '/certificates/character': {
    module: 'Certificates',
    moduleIcon: 'pi pi-star',
    modulePath: '/certificates/character',
    title: 'Character & Conduct Certificate',
    subtitle: 'Issue moral conduct and character verification certificates for students and alumni',
    code: 'Certificates',
  },
  '/certificates/ret': {
    module: 'Certificates',
    moduleIcon: 'pi pi-file',
    modulePath: '/certificates/ret',
    title: 'RET Certificate',
    subtitle: 'Issue verified record of education, examination results, and institutional retention certificate',
    code: 'Certificates',
  },
  '/students/awr-report': {
    module: 'Students & Registers',
    moduleIcon: 'pi pi-table',
    modulePath: '/students/awr-report',
    title: 'Admission & Withdrawal Register (A.W.R.)',
    subtitle: 'Statutory student general register records, admission/withdrawal ledger, and official folio extracts',
    code: 'AWR',
  },
  '/awr-report': {
    module: 'Students & Registers',
    moduleIcon: 'pi pi-table',
    modulePath: '/students/awr-report',
    title: 'Admission & Withdrawal Register (A.W.R.)',
    subtitle: 'Statutory student general register records, admission/withdrawal ledger, and official folio extracts',
    code: 'AWR',
  },

  // Central Reports
  '/reports': {
    module: 'Reports',
    moduleIcon: 'pi pi-chart-bar',
    modulePath: '/reports',
    title: 'Central Reports & Analytics Hub',
    subtitle: 'Comprehensive cross-module reporting center for admissions, fees, attendance, and academics',
    code: 'Reports',
  },
};

export const AppBreadcrumb = () => {
  const location = useLocation();
  const { isDarkMode, currentColorHex } = useThemeStore();
  const { user, activeAcademicYearId, activeAcademicYearName, academicYears } = useAuthStore();

  const currentAY = academicYears.find((y) => y.id === activeAcademicYearId) || academicYears[0];
  const activeYearLabel = activeAcademicYearName || (currentAY ? (currentAY.rawName || currentAY.name.replace('Session: ', '').replace(' (Current)', '')) : '2026-27');

  const primaryColor = currentColorHex || '#2563eb';
  const todayDateString = dayjs().format('dddd, DD MMM YYYY');
  
  const [currentTimeStr, setCurrentTimeStr] = useState(dayjs().format('hh:mm:ss A'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(dayjs().format('hh:mm:ss A'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Resolve metadata for current route
  const info = useMemo(() => {
    const path = location.pathname;

    // Check exact match
    if (routeBreadcrumbMap[path]) {
      return routeBreadcrumbMap[path];
    }

    // Dynamic routes
    if (path.startsWith('/students/') && path !== '/students') {
      return {
        module: 'Students & Admission',
        moduleIcon: 'pi pi-user-plus',
        modulePath: '/students',
        title: 'Student Profile',
        subtitle: 'Comprehensive student academic profile, guardian details, and payment history',
        code: 'Student',
      };
    }

    if (path.startsWith('/staff/') && path !== '/staff') {
      return {
        module: 'Staff & HR',
        moduleIcon: 'pi pi-users',
        modulePath: '/staff',
        title: 'Staff Profile',
        subtitle: 'Employee detailed profile, credentials, and departmental records',
        code: 'Staff',
      };
    }

    // Generic fallback for any route
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'Dashboard';
    const formattedTitle = lastSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const firstSegment = segments[0] || 'App';
    const formattedModule = firstSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      module: formattedModule,
      moduleIcon: 'pi pi-folder',
      modulePath: `/${segments[0] || ''}`,
      title: formattedTitle,
      subtitle: `System administration interface for ${formattedTitle}`,
      code: null,
    };
  }, [location.pathname]);

  return (
    <div
      className="app-breadcrumb-container hidden md:block"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 55%, #e2e8f0 100%)',
        border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
        borderLeft: `4px solid ${primaryColor}`,
        borderRadius: '6px',
        padding: '4px 10px',
        marginBottom: '8px',
        boxShadow: isDarkMode
          ? '0 2px 6px rgba(0, 0, 0, 0.2)'
          : '0 1px 4px rgba(37, 99, 235, 0.04)',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Top Row: Breadcrumb Navigation Trail & Quick Badges */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        {/* Breadcrumb Path Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            flexWrap: 'wrap',
          }}
          aria-label="Breadcrumb"
        >
          {/* Home Link */}
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'none',
              color: isDarkMode ? '#94a3b8' : '#475569',
              padding: '1px 4px',
              borderRadius: '4px',
              transition: 'color 0.15s ease, background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = primaryColor;
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#475569';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <i className="pi pi-home" style={{ fontSize: '10px', color: primaryColor }} />
            <span>Home</span>
          </Link>

          <i className="pi pi-angle-right" style={{ fontSize: '9px', color: isDarkMode ? '#64748b' : '#94a3b8' }} />

          {/* Module Category */}
          {info.module && (
            <>
              <Link
                to={info.modulePath || '#'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'none',
                  color: isDarkMode ? '#94a3b8' : '#475569',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease, background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = primaryColor;
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#475569';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {info.moduleIcon && <i className={info.moduleIcon} style={{ fontSize: '10px' }} />}
                <span>{info.module}</span>
              </Link>
              <i className="pi pi-angle-right" style={{ fontSize: '9px', color: isDarkMode ? '#64748b' : '#94a3b8' }} />
            </>
          )}

          {/* Current Page Pill */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: 700,
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.12)',
              color: primaryColor,
              border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(37, 99, 235, 0.2)',
            }}
          >
            {info.title}
          </span>
        </nav>

        {/* Right contextual info: Academic Session, Date, Branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {user?.branchName && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10.5px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                color: isDarkMode ? '#cbd5e1' : '#334155',
                border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
              }}
            >
              <i className="pi pi-building" style={{ fontSize: '9.5px', color: '#0284c7' }} />
              <span>{user.branchName}</span>
            </span>
          )}

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              color: isDarkMode ? '#93c5fd' : '#1d4ed8',
              border: isDarkMode ? '1px solid #1e3a8a' : '1px solid #bfdbfe',
            }}
          >
            <i className="pi pi-calendar" style={{ fontSize: '9.5px', color: primaryColor }} />
            <span>Session: {activeYearLabel}</span>
          </span>

          <span
            className="hidden sm:inline-flex"
            style={{
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            }}
          >
            <i className="pi pi-clock" style={{ fontSize: '9.5px', color: '#d97706' }} />
            <span>{todayDateString} &bull; {currentTimeStr}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AppBreadcrumb;
