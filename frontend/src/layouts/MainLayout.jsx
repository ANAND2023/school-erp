import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useThemeStore } from '../store/themeStore';
import { usePermission } from '../hooks/usePermission';
import { useAcademicYear } from '../hooks/useAcademicYear';
import { AppThemeSwitcher } from '../components/common/AppThemeSwitcher';
import { AppFontSizeScaler } from '../components/common/AppFontSizeScaler';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';
import { AppNotifications } from '../components/common/AppNotifications';
import { academicYearApi } from '../features/masters/api';
import { ImpersonationBanner } from '../features/superadmin/components/ImpersonationBanner';
import apiClient from '../api/client';

const navItems = [
  {
    title: 'Dashboard',
    menuKey: 'Dashboard',
    icon: 'pi pi-th-large',
    path: '/dashboard',
  },
  {
    title: 'Auth & Access',
    menuKey: 'Auth',
    icon: 'pi pi-shield',
    children: [
      { title: 'Users', path: '/users', menuKey: 'Users' },
      { title: 'Roles & Permissions', path: '/roles', menuKey: 'Roles' },
      { title: 'Audit Logs', path: '/audit-logs', menuKey: 'AuditLogs', superAdminOnly: true },
    ],
  },
  {
    title: 'Masters',
    menuKey: 'Masters',
    icon: 'pi pi-cog',
    children: [
      { title: 'School & Branch', path: '/masters/branch', menuKey: 'NumberingSeries' },
      { title: 'Academic Years', path: '/masters/academic-years', menuKey: 'AcademicYears' },
      { title: 'Classes & Sections', path: '/masters/classes', menuKey: 'Classes' },
      { title: 'Subjects', path: '/masters/subjects', menuKey: 'Subjects' },
      { title: 'Class-Subject Mapping', path: '/masters/class-subjects', menuKey: 'ClassSubjects' },
      { title: 'Fee Discount Master', path: '/masters/fee-discount', menuKey: 'FeeDiscountMaster' },
      { title: 'Simple Masters', path: '/masters/simple', menuKey: 'SimpleMasters' },
      { title: 'Numbering Series', path: '/masters/numbering', menuKey: 'NumberingSeries' },
        { title: 'Bulk Student Upload', path: '/students/bulk-operations', menuKey: 'BulkStudentUpload' },
    ],
  },
  {
    title: 'Admission',
    menuKey: 'Admissions',
    icon: 'pi pi-id-card',
    children: [
      { title: 'Admission Records', path: '/admissions/records', menuKey: ['Admissions', 'Students'] },
      { title: 'New Admission', path: '/admissions/new', menuKey: 'Admissions' },
      { title: 'Enquiries', path: '/enquiries', menuKey: 'Enquiries' },
      { title: 'Registration Slips Register', path: '/registrations/slips-list', menuKey: 'Admissions' },
      { title: 'Registration Slip Generator', path: '/registrations/slip-generator', menuKey: 'Admissions' },
      { title: 'Registration Form Builder', path: '/registrations/builder', menuKey: 'Admissions' },
      { title: 'Bulk Student Admission', path: '/students/bulk-operations', menuKey: ['BulkStudentUpload', 'Admissions'] },
      { title: 'AWR Register / Folio', path: '/students/awr-report', menuKey: ['Students', 'Admissions'] },
    ],
  },
  {
    title: 'Students',
    menuKey: 'Students',
    icon: 'pi pi-users',
    children: [
      { title: 'Student Directory', path: '/students', menuKey: 'Students' },
      { title: 'Roll Numbers', path: '/students/roll-numbers', menuKey: 'RollNumbers' },
      { title: 'Section Change', path: '/students/section-change', menuKey: 'SectionChange' },
      { title: 'ID Card Settings', path: '/students/id-card-design', menuKey: 'IDCardSettings' },
      { title: 'Print ID Cards', path: '/students/id-card-print', menuKey: 'PrintIDCards' },
      { title: 'Student Gate Pass', path: '/students/gate-pass', menuKey: 'Students' },
      { title: 'Bulk Student Edit', path: '/students/bulk-operations', menuKey: ['BulkStudentUpload', 'Students'] },
    ],
  },
  {
    title: 'Staff & HR',
    menuKey: 'Staff',
    icon: 'pi pi-users',
    children: [
      { title: 'Staff Directory', path: '/staff', menuKey: 'Staff' },
      { title: 'Teacher Allocation', path: '/staff/allocation', menuKey: 'TeacherAllocation' },
    ],
  },
  {
    title: 'Fees Management',
    menuKey: 'Fees',
    icon: 'pi pi-wallet',
    children: [
      { title: 'Fee Structure', path: '/fees/structure', menuKey: 'FeeStructure' },
      { title: 'Class Fee Structure', path: '/fees/class-structure', menuKey: ['Fees', 'FeeStructure', 'Enquiries'] },
      { title: 'Fee Assignment', path: '/fees/assignment', menuKey: 'FeeAssignment' },
      { title: 'Fee Collection', path: '/fees/collection', menuKey: 'FeeCollection' },
      { title: 'Fee Discount Master', path: '/fees/discount-master', menuKey: 'FeeDiscountMaster' },
      { title: 'Demand Bill', path: '/fees/demand-bills', menuKey: 'DemandBill' },
      { title: 'Fee Concessions', path: '/fees/concessions', menuKey: 'FeeConcessions' },
      { title: 'Fee Reports', path: '/fees/reports', menuKey: 'FeeReports' },
    ],
  },
  {
    title: 'Attendance & Timetable',
    menuKey: 'Attendance',
    icon: 'pi pi-calendar',
    children: [
      { title: 'Student Attendance', path: '/attendance/student', menuKey: 'StudentAttendance' },
      { title: 'Staff Attendance', path: '/attendance/staff', menuKey: 'StaffAttendance' },
      { title: 'Leave Management', path: '/attendance/leave', menuKey: 'LeaveManagement' },
      { title: 'Attendance Reports', path: '/attendance/reports', menuKey: 'AttendanceReports' },
      { title: 'Holiday Calendar', path: '/attendance/holidays', menuKey: 'HolidayCalendar' },
      { title: 'Class Timetable', path: '/timetable/class', menuKey: 'ClassTimetable' },
      { title: 'Teacher Timetable', path: '/timetable/teacher', menuKey: 'TeacherTimetable' },
      { title: 'Substitutions', path: '/timetable/substitution', menuKey: 'Substitutions' },
    ],
  },
  {
    title: 'Examinations',
    menuKey: 'Examinations',
    icon: 'pi pi-book',
    children: [
      { title: 'Exam Schedules', path: '/exams/schedules', menuKey: 'ExamSchedules' },
      { title: 'Marks Entry', path: '/exams/marks-entry', menuKey: 'MarksEntry' },
      { title: 'Report Cards', path: '/exams/report-cards', menuKey: 'ReportCards' },
    ],
  },
      {
      title: 'Transport',
      menuKey: 'Transport',
      icon: 'pi pi-car',
      children: [
        { title: 'Vehicles', path: '/transport/vehicles', menuKey: 'Vehicles' },
        { title: 'Routes & Stops', path: '/transport/routes', menuKey: 'RoutesStops' },
        { title: 'Student Allocations', path: '/transport/allocations', menuKey: 'TransportAllocations' }
      ],
    },
    {
      title: 'Promotion & TC',
    menuKey: 'Promotion',
    icon: 'pi pi-arrow-up-right',
    children: [
      { title: 'Promote Students', path: '/promotion', menuKey: 'Promotion' },
      { title: 'Transfer Certificates', path: '/tc', menuKey: 'TransferCertificates' },
    ],
  },
  {
    title: 'Certificates',
    menuKey: ['Students', 'TransferCertificates', 'Promotion'],
    icon: 'pi pi-verified',
    children: [
      { title: 'Bonafide Certificate', path: '/certificates/bonafide', menuKey: ['Students', 'TransferCertificates', 'Promotion'] },
      { title: 'Birth Certificate', path: '/certificates/birth', menuKey: ['Students', 'TransferCertificates', 'Promotion'] },
      { title: 'Age Certificate', path: '/certificates/age', menuKey: ['Students', 'TransferCertificates', 'Promotion'] },
      { title: 'Character Certificate', path: '/certificates/character', menuKey: ['Students', 'TransferCertificates', 'Promotion'] },
      { title: 'RET Certificate', path: '/certificates/ret', menuKey: ['Students', 'TransferCertificates', 'Promotion'] },
      { title: 'AWR Register / Report', path: '/students/awr-report', menuKey: ['Students', 'TransferCertificates', 'Promotion'] },
      { title: 'Transfer Certificate (TC)', path: '/tc', menuKey: 'TransferCertificates' },
    ],
  },
  {
    title: 'Inventory & Stock',
    menuKey: 'Inventory',
    icon: 'pi pi-box',
    children: [
      { title: 'Inventory Overview', path: '/inventory', menuKey: 'InventoryOverview' },
      { title: 'Store & Slip Setup', path: '/inventory/store-setup', menuKey: 'InventoryOverview' },
      { title: 'Items Master', path: '/inventory/items', menuKey: 'ItemsMaster' },
      { title: 'Item Categories', path: '/inventory/categories', menuKey: 'ItemCategories' },
      { title: 'Suppliers / Vendors', path: '/inventory/suppliers', menuKey: 'Suppliers' },
      { title: 'Manufactures', path: '/inventory/manufactures', menuKey: 'Manufactures' },
      { title: 'Stock Inward (Purchase)', path: '/inventory/purchases', menuKey: 'StockInward' },
      { title: 'Stock Issue (Outward)', path: '/inventory/issues', menuKey: 'StockIssue' },
      { title: 'Item Return (Sale Return)', path: '/inventory/returns', menuKey: 'StockIssue' },
      { title: 'Stock Movement Ledger', path: '/inventory/ledger', menuKey: 'StockLedger' },
    ],
  },
  {
    title: 'Expenses',
      menuKey: 'Expenses',
      icon: 'pi pi-wallet',
      path: '/expense',
    },
    {
      title: 'Reports',
    menuKey: 'Reports',
    icon: 'pi pi-chart-bar',
    path: '/reports',
  },
];

import { BellScheduler } from '../components/common/BellScheduler';

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, snackbar, closeSnackbar } = useUiStore();
  const { hasPermission, isSuperAdmin } = usePermission();
  const { activeAcademicYearId, switchAcademicYear } = useAcademicYear();
  const { isDarkMode, currentColorHex } = useThemeStore();

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  // Auto-close sidebar on mobile route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, setSidebarOpen]);

  const [openSubMenus, setOpenSubMenus] = useState({});
  const profileMenuRef = useRef(null);
  const toastRef = useRef(null);

  // Sync snackbar events with PrimeReact Toast
  useEffect(() => {
    if (snackbar.open && toastRef.current) {
      toastRef.current.show({
        severity: snackbar.severity || 'info',
        summary: snackbar.severity ? snackbar.severity.toUpperCase() : 'Notice',
        detail: snackbar.message,
        life: 4000,
      });
      closeSnackbar();
    }
  }, [snackbar, closeSnackbar]);

  const handleSubMenuToggle = (key) => {
    setOpenSubMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [academicYears, setAcademicYears] = useState([
    { id: 1, name: 'Session: 2026-27 (Current)' },
  ]);

  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: user?.schoolName || '',
    branchName: user?.branchName || '',
    affiliationNumber: '',
    address: user?.schoolAddress || '',
    phone: user?.schoolPhone || '',
    email: user?.schoolEmail || '',
    website: '',
    logoUrl: user?.schoolLogoUrl || '',
  });

  useEffect(() => {
    if (user) {
      setSchoolInfo((prev) => ({
        ...prev,
        schoolName: user.schoolName || prev.schoolName,
        branchName: user.branchName || prev.branchName,
        address: user.schoolAddress || prev.address,
        phone: user.schoolPhone || prev.phone,
        email: user.schoolEmail || prev.email,
        logoUrl: user.schoolLogoUrl || prev.logoUrl,
      }));
    }

    academicYearApi.getAcademicYears()
      .then((res) => {
        if (res.data?.success && res.data?.data?.length > 0) {
          const list = res.data.data.map((ay) => ({
            id: ay.id,
            name: `Session: ${ay.name}${ay.isCurrent ? ' (Current)' : ''}`,
            rawName: ay.name,
            isCurrent: ay.isCurrent,
          }));
          setAcademicYears(list);
          useAuthStore.getState().setAcademicYears(list);

          const currentId = activeAcademicYearId || 1;
          const match = list.find((y) => y.id === currentId);
          if (!match) {
            const defaultYear = list.find((y) => y.isCurrent) || list[0];
            switchAcademicYear(defaultYear.id, defaultYear.rawName);
          } else {
            useAuthStore.getState().setActiveAcademicYear(match.id, match.rawName);
          }
        }
      })
      .catch(() => {});

    // Fetch current branch details (accessible to all authenticated roles)
    apiClient.get('/branches/current')
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const branch = res.data.data;
          const fullAddr = [branch.address, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ');
          setSchoolInfo({
            schoolName: branch.schoolName || branch.name || user?.schoolName || '',
            branchName: branch.name || user?.branchName || '',
            affiliationNumber: branch.affiliationNumber || '',
            address: fullAddr || user?.schoolAddress || '',
            phone: branch.phone || user?.schoolPhone || '',
            email: branch.email || user?.schoolEmail || '',
            website: branch.website || '',
            logoUrl: branch.logoUrl || user?.schoolLogoUrl || '',
          });
        }
      })
      .catch(() => {
        // Secondary fallback to /branches list if available
        apiClient.get('/branches')
          .then((res) => {
            if (res.data?.success && res.data?.data?.length > 0) {
              const currentBranchId = user?.branchId || useAuthStore.getState().activeBranchId;
              const branch = res.data.data.find((b) => b.id === currentBranchId) || res.data.data[0];
              if (branch) {
                const fullAddr = [branch.address, branch.city, branch.state, branch.pincode].filter(Boolean).join(', ');
                setSchoolInfo({
                  schoolName: branch.schoolName || branch.name || '',
                  branchName: branch.name || '',
                  affiliationNumber: branch.affiliationNumber || '',
                  address: fullAddr,
                  phone: branch.phone || '',
                  email: branch.email || '',
                  website: branch.website || '',
                  logoUrl: branch.logoUrl || '',
                });
              }
            }
          })
          .catch(() => {});
      });
  }, [user]);

  const profileMenuItems = [
    {
      label: user?.fullName || user?.username || 'User Profile',
      items: [
        {
          label: `Role: ${user?.roleName || user?.userType || 'Staff'}`,
          disabled: true,
        },
        ...(isSuperAdmin || user?.userType === 1 || useAuthStore.getState().isImpersonating ? [
          {
            label: 'Super Admin Portal',
            icon: 'pi pi-shield text-indigo-500 font-bold',
            command: () => navigate('/superadmin'),
          },
        ] : []),
        {
          label: 'Change Password',
          icon: 'pi pi-key',
          command: () => navigate('/change-password'),
        },
        {
          separator: true,
        },
        {
          label: 'Logout',
          icon: 'pi pi-sign-out text-red-500',
          command: () => {
            logout();
            navigate('/login');
          },
        },
      ],
    },
  ];

  const userInitial = user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U';
  const isImpersonating = useAuthStore((s) => s.isImpersonating);
  const headerTop = isImpersonating ? '34px' : '0px';
  const contentTop = isImpersonating ? '76px' : '42px';

  const handleAcademicYearChange = (yearId) => {
    const selected = academicYears.find((y) => y.id === yearId);
    switchAcademicYear(yearId, selected?.rawName || '');
    toastRef.current?.show({
      severity: 'info',
      summary: 'Academic Session Switched',
      detail: selected?.name || `Academic Year #${yearId}`,
      life: 2500,
    });
  };

  return (
    <div
      className="min-h-screen flex flex-column"
      style={{
        backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
        color: isDarkMode ? '#f8fafc' : '#1e293b',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      <BellScheduler />
      <Toast ref={toastRef} position="bottom-right" />

      {/* Global Impersonation Alert Banner */}
      <ImpersonationBanner />

      {/* Top Navbar */}
      <header
        className="no-print fixed left-0 w-full flex align-items-center justify-content-between px-3 text-white shadow-1"
        style={{
          top: headerTop,
          height: '42px',
          zIndex: 1100,
          backgroundColor: currentColorHex || 'var(--primary-color, #3B82F6)',
          transition: 'background-color 0.2s ease, top 0.2s ease',
        }}
      >
        <div className="flex align-items-center gap-2">
          {/* Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-button p-button-text p-button-rounded text-white p-1 flex align-items-center justify-content-center cursor-pointer border-none"
            style={{ background: 'transparent', width: '28px', height: '28px' }}
            title="Toggle Sidebar"
          >
            <i className={`pi ${sidebarOpen ? 'pi-align-left' : 'pi-bars'} text-lg`} />
          </button>

          {/* Logo / Title */}
          <div className="flex align-items-center gap-2 ml-1 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <img
              src="/dvslogo1.jpeg"
              alt="Digital Vidya Saarthi Logo"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'contain',
                backgroundColor: '#ffffff',
                padding: '1px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            />
            <span className="font-bold text-sm tracking-wide select-none">DVS ERP</span>
          </div>

          {/* Branch badge */}
          {user?.branchName && (
            <span
              className="text-xs font-semibold px-2 py-0.5 border-round ml-2 hidden md:inline-block"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', fontSize: '11px' }}
            >
              Branch: {user.branchName}
            </span>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex align-items-center gap-2 sm:gap-3">
          {/* Test Bell Button */}
          <button
            type="button"
            onClick={() => {
              const customDataUrl = localStorage.getItem('custom_bell_data_url');
              const defaultBell = 'https://actions.google.com/sounds/v1/alarms/school_bell_ring.ogg';
              const audio = new Audio(customDataUrl || defaultBell);
              audio.volume = 1.0;
              audio.play().catch(e => {
                alert("Browser blocked audio. Please allow audio playback or interact with the page first.");
              });
            }}
            className="p-button p-button-text text-white p-1 hidden md:flex align-items-center cursor-pointer border-none"
            style={{ background: 'transparent', fontSize: '13px' }}
            title="Test Bell Sound"
          >
            🔔 Test Sound
          </button>
          {/* Academic Year Selector */}
          <div className="hidden sm:block">
            <Dropdown
              value={activeAcademicYearId || 1}
              options={academicYears}
              optionLabel="name"
              optionValue="id"
              onChange={(e) => handleAcademicYearChange(e.value)}
              className="p-inputtext-sm text-xs font-medium app-compact-header-dropdown"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                minWidth: '160px',
                height: '28px',
              }}
            />
          </div>

          {/* Super Admin Quick Portal Button */}
          {(isSuperAdmin || user?.userType === 1 || isImpersonating) && (
            <button
              type="button"
              onClick={() => navigate('/superadmin')}
              className="border-none text-white text-xs px-2 py-1 border-round cursor-pointer flex align-items-center gap-1 font-semibold transition-colors"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
              title="Switch to Super Admin Portal"
            >
              <i className="pi pi-shield text-xs text-yellow-300" />
              <span className="hidden sm:inline">Super Admin</span>
            </button>
          )}

          {/* App Notifications Bell */}
            <AppNotifications />

            {/* Font Size Scaler Widget */}
          <AppFontSizeScaler />

          {/* Theme Switcher Widget */}
          <AppThemeSwitcher />

          {/* Profile Avatar Button */}
          <button
            type="button"
            onClick={(e) => profileMenuRef.current?.toggle(e)}
            className="p-button p-button-text p-button-rounded p-0 flex align-items-center justify-content-center border-none cursor-pointer bg-transparent"
            title="Account Settings"
          >
            <Avatar
              label={userInitial}
              shape="circle"
              style={{
                width: '28px',
                height: '28px',
                fontSize: '11px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: 'bold',
                border: '1.5px solid rgba(255, 255, 255, 0.5)',
              }}
            />
          </button>
          <Menu model={profileMenuItems} popup ref={profileMenuRef} className="shadow-3" />
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex flex-1" style={{ marginTop: contentTop, transition: 'margin-top 0.2s ease' }}>
        {/* Mobile Backdrop Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black-alpha-50 app-mobile-backdrop"
            style={{ top: contentTop, bottom: '26px', zIndex: 1190 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Collapsible Sidebar */}
        <aside
          className="no-print fixed left-0 overflow-y-auto border-right-1 surface-border app-sidebar-drawer"
          style={{
            top: contentTop,
            bottom: '26px',
            width: sidebarOpen ? '260px' : '0px',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            boxShadow: sidebarOpen ? '4px 0 16px rgba(0,0,0,0.12)' : 'none',
            zIndex: 1200,
          }}
        >
          <nav className="p-2 flex flex-column gap-1">
            {/* If user is Student or Parent, show their specialized portal menu */}
            {(user?.userType === 6 || user?.userType === 7) ? (
              [
                { title: 'Portal Overview', path: '/dashboard?tab=overview', key: 'overview', icon: 'pi pi-th-large' },
                { title: 'Class Timetable', path: '/dashboard?tab=timetable', key: 'timetable', icon: 'pi pi-calendar' },
                { title: 'Attendance Log', path: '/dashboard?tab=attendance', key: 'attendance', icon: 'pi pi-check-circle' },
                { title: 'Exams & Marks Cards', path: '/dashboard?tab=exams', key: 'exams', icon: 'pi pi-file-edit' },
                { title: 'Fee Receipts & Dues', path: '/dashboard?tab=fees', key: 'fees', icon: 'pi pi-wallet' },
                { title: 'Notices & Circulars', path: '/dashboard?tab=notices', key: 'notices', icon: 'pi pi-bell' },
                { title: 'NCERT E-Books Reader', path: '/dashboard?tab=ncert', key: 'ncert', icon: 'pi pi-book' },
                { title: 'AI Study Buddy (Chat)', path: '/dashboard?tab=ai-tutor', key: 'ai-tutor', icon: 'pi pi-sparkles' },
              ].map((item, idx) => {
                const searchTab = new URLSearchParams(location.search).get('tab') || 'overview';
                const isSelected = searchTab === item.key;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className="w-full flex align-items-center gap-3 p-2 border-round text-left cursor-pointer border-none transition-all"
                    style={{
                      backgroundColor: isSelected
                        ? (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : `${currentColorHex}18`)
                        : 'transparent',
                      color: isSelected ? currentColorHex : (isDarkMode ? '#cbd5e1' : '#334155'),
                      borderLeft: isSelected ? `3px solid ${currentColorHex}` : '3px solid transparent',
                      fontWeight: isSelected ? 800 : 600,
                    }}
                  >
                    <i className={`${item.icon} text-base`} />
                    <span className="text-sm font-semibold">{item.title}</span>
                  </button>
                );
              })
            ) : (
              navItems.map((item) => {
              if (item.children) {
                const allowedChildren = item.children.filter((child) => {
                  if (child.superAdminOnly) {
                    return isSuperAdmin;
                  }
                  return isSuperAdmin || hasPermission(child.menuKey, 'View');
                });
                if (allowedChildren.length === 0 && !isSuperAdmin) return null;

                const isChildActive = allowedChildren.some(
                  (c) => location.pathname === c.path || (c.path !== '/' && location.pathname.startsWith(c.path))
                );
                const isOpen = openSubMenus[item.menuKey] ?? isChildActive;

                return (
                  <div key={item.menuKey} className="flex flex-column">
                    {/* Parent group item */}
                    <button
                      type="button"
                      onClick={() => handleSubMenuToggle(item.menuKey)}
                      className="w-full flex align-items-center justify-content-between p-2 border-round text-left cursor-pointer border-none bg-transparent hover:surface-hover transition-colors"
                      style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}
                    >
                      <div className="flex align-items-center gap-3">
                        <i className={`${item.icon} text-base`} />
                        <span className="text-sm font-semibold">{item.title}</span>
                      </div>
                      <i className={`pi ${isOpen ? 'pi-chevron-up' : 'pi-chevron-down'} text-xs text-500`} />
                    </button>

                    {/* Children sub-items */}
                    {isOpen && (
                      <div className="flex flex-column gap-1 pl-4 my-1">
                        {allowedChildren.map((child) => {
                          const isSelected = location.pathname === child.path;
                          return (
                            <button
                              key={child.path}
                              type="button"
                              onClick={() => {
                                navigate(child.path);
                                if (isMobile) setSidebarOpen(false);
                              }}
                              className="w-full text-left py-2 px-3 border-round text-xs font-semibold cursor-pointer border-none transition-all"
                              style={{
                                backgroundColor: isSelected
                                  ? (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : `${currentColorHex}18`)
                                  : 'transparent',
                                color: isSelected ? currentColorHex : (isDarkMode ? '#94a3b8' : '#64748b'),
                                borderLeft: isSelected ? `3px solid ${currentColorHex}` : '3px solid transparent',
                              }}
                            >
                              {child.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isSelected = location.pathname === item.path;
              return (
                <button
                  key={item.menuKey}
                  type="button"
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                      if (isMobile) setSidebarOpen(false);
                    }
                  }}
                  className="w-full flex align-items-center gap-3 p-2 border-round text-left cursor-pointer border-none transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : `${currentColorHex}18`)
                      : 'transparent',
                    color: isSelected ? currentColorHex : (isDarkMode ? '#cbd5e1' : '#334155'),
                    borderLeft: isSelected ? `3px solid ${currentColorHex}` : '3px solid transparent',
                  }}
                >
                  <i className={`${item.icon} text-base`} />
                  <span className="text-sm font-semibold">{item.title}</span>
                </button>
              );
            }))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main
          className="flex-1 p-2 md:p-3 overflow-y-auto"
          style={{
            marginLeft: (sidebarOpen && !isMobile) ? '260px' : '0px',
            transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 'calc(100vh - 42px - 26px)',
            paddingBottom: '36px',
          }}
        >
          {/* Universal Styled Breadcrumb & Page Header with Background (Hidden on mobile devices) */}
          <div className="hidden md:block">
            <AppBreadcrumb />
          </div>

          <Outlet key={`${location.pathname}-${activeAcademicYearId}`} />
        </main>
      </div>

      {/* Fixed Ultra-Compact Bottom Bar with Continuous School Marquee */}
      <footer
        className="no-print fixed bottom-0 left-0 w-full flex align-items-center justify-content-between px-2 select-none"
        style={{
          height: '26px',
          zIndex: 100,
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderTop: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0',
          boxShadow: '0 -1px 4px rgba(0, 0, 0, 0.06)',
          fontSize: '11px',
          lineHeight: '26px',
        }}
      >
        {/* Left Badge: School / Campus Tag (Opaque to prevent marquee overlap) */}
        <div
          className="flex align-items-center gap-1.5 font-bold flex-shrink-0 px-2"
          style={{
            color: currentColorHex,
            borderRight: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            height: '100%',
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            zIndex: 5,
          }}
        >
          <i className="pi pi-building text-xs" />
          <span className="hidden sm:inline" style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b', fontSize: '11px', fontWeight: 700 }}>
            {schoolInfo.schoolName || user?.schoolName || 'School ERP'}
          </span>
        </div>

        {/* Center: Live Continuous Marquee with School Info & Contacts */}
        <div className="flex-1 overflow-hidden mx-2 flex align-items-center" style={{ height: '100%', position: 'relative' }}>
          <marquee
            scrollamount="4"
            onMouseOver={(e) => e.target.stop()}
            onMouseOut={(e) => e.target.start()}
            style={{
              color: isDarkMode ? '#cbd5e1' : '#475569',
              fontSize: '11px',
              lineHeight: '26px',
              display: 'block',
              width: '100%',
            }}
          >
            {[
              schoolInfo.branchName ? `🏢 Campus: ${schoolInfo.branchName}` : '',
              schoolInfo.affiliationNumber ? `📜 Affiliation: ${schoolInfo.affiliationNumber}` : '',
              schoolInfo.address ? `📍 Address: ${schoolInfo.address}` : '',
              schoolInfo.phone ? `📞 Contact: ${schoolInfo.phone}` : '',
              schoolInfo.email ? `✉️ Email: ${schoolInfo.email}` : '',
              schoolInfo.website ? `🌐 Website: ${schoolInfo.website}` : '',
              `✨ Powered by Digital Vidya Sarthi (DVS ERP)`,
            ]
              .filter(Boolean)
              .join(' \u00A0\u00A0\u00A0|\u00A0\u00A0\u00A0 ')}
          </marquee>
        </div>

        {/* Right Fixed Brand (Opaque) */}
        <div
          className="flex align-items-center gap-1.5 font-medium flex-shrink-0 px-2"
          style={{
            borderLeft: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            height: '100%',
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            zIndex: 5,
            fontSize: '11px',
          }}
        >
          <span className="text-400 hidden md:inline">Software:</span>
          <span className="font-bold tracking-wide" style={{ color: currentColorHex }}>
            Digital Vidya Sarthi
          </span>
          <span className="text-400">• DVS ERP</span>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;



