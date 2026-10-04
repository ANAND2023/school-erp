import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ChangePasswordPage } from '../features/auth/pages/ChangePasswordPage';
import { UnauthorizedPage } from '../features/auth/pages/UnauthorizedPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';

// Module 1: Auth & Users
import { UsersPage } from '../features/auth/pages/UsersPage';
import { RolesPage } from '../features/auth/pages/RolesPage';
import { AuditLogsPage } from '../features/auth/pages/AuditLogsPage';

// Module 2: Masters
import { BranchMasterPage } from '../features/masters/pages/BranchMasterPage';
import { AcademicYearsPage } from '../features/masters/pages/AcademicYearsPage';
import { ClassesSectionsPage } from '../features/masters/pages/ClassesSectionsPage';
import { SubjectsPage } from '../features/masters/pages/SubjectsPage';
import { ClassSubjectMappingPage } from '../features/masters/pages/ClassSubjectMappingPage';
import { SimpleMastersPage } from '../features/masters/pages/SimpleMastersPage';
import { NumberingSeriesPage } from '../features/masters/pages/NumberingSeriesPage';

// Module 3: Students, Enquiries & Admissions
import { EnquiriesPage } from '../features/students/pages/EnquiriesPage';
import { AdmissionFormPage } from '../features/students/pages/AdmissionFormPage';
import StudentsPage from '../features/students/pages/StudentsPage';
import StudentProfilePage from '../features/students/pages/StudentProfilePage';
import RollNumbersPage from '../features/students/pages/RollNumbersPage';
import SectionChangePage from '../features/students/pages/SectionChangePage';

// Module 4: Staff & HR
import StaffDirectoryPage from '../features/staff/pages/StaffDirectoryPage';
import EmployeeFormPage from '../features/staff/pages/EmployeeFormPage';
import EmployeeProfilePage from '../features/staff/pages/EmployeeProfilePage';
import TeacherAllocationPage from '../features/staff/pages/TeacherAllocationPage';

// Module 5: Fees Management
import FeeStructurePage from '../features/fees/pages/FeeStructurePage';
import FeeAssignmentPage from '../features/fees/pages/FeeAssignmentPage';
import FeeCollectionPage from '../features/fees/pages/FeeCollectionPage';
import FeeReportsPage from '../features/fees/pages/FeeReportsPage';

// Module 6: Attendance & Timetable
import StudentAttendancePage from '../features/attendance/pages/StudentAttendancePage';
import StaffAttendancePage from '../features/attendance/pages/StaffAttendancePage';
import LeaveManagementPage from '../features/attendance/pages/LeaveManagementPage';
import AttendanceReportsPage from '../features/attendance/pages/AttendanceReportsPage';
import HolidaysPage from '../features/attendance/pages/HolidaysPage';
import ClassTimetablePage from '../features/timetable/pages/ClassTimetablePage';
import TeacherTimetablePage from '../features/timetable/pages/TeacherTimetablePage';
import SubstitutionPage from '../features/timetable/pages/SubstitutionPage';

// Module 7: Examinations & Report Cards
import ExamSchedulesPage from '../features/exams/pages/ExamSchedulesPage';
import MarksEntryPage from '../features/exams/pages/MarksEntryPage';
import ReportCardsPage from '../features/exams/pages/ReportCardsPage';

// Module 8: Promotion & TC
import PromotionPage from '../features/promotion/pages/PromotionPage';
import TransferCertificatePage from '../features/promotion/pages/TransferCertificatePage';

// Central Reports Hub
import ReportsHubPage from '../features/reports/pages/ReportsHubPage';

// Module: Inventory Management
import InventoryDashboardPage from '../features/inventory/pages/InventoryDashboardPage';
import ItemMasterPage from '../features/inventory/pages/ItemMasterPage';
import ItemCategoriesPage from '../features/inventory/pages/ItemCategoriesPage';
import ItemSuppliersPage from '../features/inventory/pages/ItemSuppliersPage';
import StockInwardPage from '../features/inventory/pages/StockInwardPage';
import StockIssuePage from '../features/inventory/pages/StockIssuePage';
import StockLedgerPage from '../features/inventory/pages/StockLedgerPage';

// Super Admin Multi-Tenant Ecosystem
import { SuperAdminLayout } from '../features/superadmin/layouts/SuperAdminLayout';
import { SuperAdminDashboardPage } from '../features/superadmin/pages/SuperAdminDashboardPage';
import { TenantsListPage } from '../features/superadmin/pages/TenantsListPage';
import { CreateTenantWizardPage } from '../features/superadmin/pages/CreateTenantWizardPage';
import { TenantDetailPage } from '../features/superadmin/pages/TenantDetailPage';
import { SubscriptionPlansPage } from '../features/superadmin/pages/SubscriptionPlansPage';
import { GatewaysPage } from '../features/superadmin/pages/GatewaysPage';
import { GlobalAuditLogsPage } from '../features/superadmin/pages/GlobalAuditLogsPage';
import { ModuleCatalogPage } from '../features/superadmin/pages/ModuleCatalogPage';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

const SuperAdminRoute = ({ children }) => {
  const { isAuthenticated, user, isImpersonating } = useAuthStore();
  const { isSuperAdmin } = usePermission();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow if user is super admin or actively impersonating
  if (!isSuperAdmin && user?.userType !== 1 && !isImpersonating) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected routes within MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />

        {/* Module 1: Auth & User Management */}
        <Route
          path="users"
          element={
            <ProtectedRoute requiredMenu="Users">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute requiredMenu="Roles">
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute requiredMenu="AuditLogs">
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Module 2: Masters */}
        <Route
          path="masters/schools"
          element={
            <ProtectedRoute requiredMenu="Branch">
              <BranchMasterPage initialTab={0} />
            </ProtectedRoute>
          }
        />
        <Route
          path="masters/branch"
          element={
            <ProtectedRoute requiredMenu="Branch">
              <BranchMasterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="masters/academic-years"
          element={
            <ProtectedRoute requiredMenu="AcademicYears">
              <AcademicYearsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="masters/classes"
          element={
            <ProtectedRoute requiredMenu="Classes">
              <ClassesSectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="masters/subjects"
          element={
            <ProtectedRoute requiredMenu="Subjects">
              <SubjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="masters/class-subjects"
          element={
            <ProtectedRoute requiredMenu="ClassSubjects">
              <ClassSubjectMappingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="masters/simple"
          element={
            <ProtectedRoute requiredMenu="SimpleMasters">
              <SimpleMastersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="masters/numbering"
          element={
            <ProtectedRoute requiredMenu={['Branch', 'Masters']}>
              <NumberingSeriesPage />
            </ProtectedRoute>
          }
        />

        {/* Module 3: Students, Enquiries & Admissions */}
        <Route
          path="enquiries"
          element={
            <ProtectedRoute requiredMenu="Enquiries">
              <EnquiriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/enquiries"
          element={
            <ProtectedRoute requiredMenu="Enquiries">
              <EnquiriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admissions/new"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/admit"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/admission"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admissions"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admission"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students"
          element={
            <ProtectedRoute requiredMenu="Students">
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/profile/:id"
          element={
            <ProtectedRoute requiredMenu="Students">
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/roll-numbers"
          element={
            <ProtectedRoute requiredMenu="RollNumbers">
              <RollNumbersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/section-change"
          element={
            <ProtectedRoute requiredMenu="SectionChange">
              <SectionChangePage />
            </ProtectedRoute>
          }
        />

        {/* Module 4: Staff & HR */}
        <Route
          path="staff"
          element={
            <ProtectedRoute requiredMenu="Staff">
              <StaffDirectoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/new"
          element={
            <ProtectedRoute requiredMenu="Staff">
              <EmployeeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/edit/:id"
          element={
            <ProtectedRoute requiredMenu="Staff">
              <EmployeeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/profile/:id"
          element={
            <ProtectedRoute requiredMenu="Staff">
              <EmployeeProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/allocation"
          element={
            <ProtectedRoute requiredMenu="TeacherAllocation">
              <TeacherAllocationPage />
            </ProtectedRoute>
          }
        />

        {/* Module 5: Fees Management */}
        <Route
          path="fees/structure"
          element={
            <ProtectedRoute requiredMenu="FeeStructure">
              <FeeStructurePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fees/assignment"
          element={
            <ProtectedRoute requiredMenu="FeeStructure">
              <FeeAssignmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fees/concessions"
          element={
            <ProtectedRoute requiredMenu="FeeConcessions">
              <FeeAssignmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fees/collection"
          element={
            <ProtectedRoute requiredMenu="FeeCollection">
              <FeeCollectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fees/reports"
          element={
            <ProtectedRoute requiredMenu="FeeReports">
              <FeeReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Module 6: Attendance, Leave & Timetable */}
        <Route
          path="attendance/student"
          element={
            <ProtectedRoute requiredMenu="StudentAttendance">
              <StudentAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance/staff"
          element={
            <ProtectedRoute requiredMenu="StaffAttendance">
              <StaffAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance/leave"
          element={
            <ProtectedRoute requiredMenu="StaffAttendance">
              <LeaveManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance/reports"
          element={
            <ProtectedRoute requiredMenu="StudentAttendance">
              <AttendanceReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance/holidays"
          element={
            <ProtectedRoute requiredMenu="StudentAttendance">
              <HolidaysPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable"
          element={
            <ProtectedRoute requiredMenu="Timetable">
              <ClassTimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable/class"
          element={
            <ProtectedRoute requiredMenu="Timetable">
              <ClassTimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable/teacher"
          element={
            <ProtectedRoute requiredMenu="Timetable">
              <TeacherTimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable/substitution"
          element={
            <ProtectedRoute requiredMenu="Timetable">
              <SubstitutionPage />
            </ProtectedRoute>
          }
        />

        {/* Module 7: Examinations & Report Cards */}
        <Route
          path="exams/schedules"
          element={
            <ProtectedRoute requiredMenu="ExamSchedules">
              <ExamSchedulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="exams/marks-entry"
          element={
            <ProtectedRoute requiredMenu="MarksEntry">
              <MarksEntryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="exams/report-cards"
          element={
            <ProtectedRoute requiredMenu="ReportCards">
              <ReportCardsPage />
            </ProtectedRoute>
          }
        />

        {/* Module 8: Promotion & TC */}
        <Route
          path="promotion"
          element={
            <ProtectedRoute requiredMenu="Promotion">
              <PromotionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="tc"
          element={
            <ProtectedRoute requiredMenu="TransferCertificates">
              <TransferCertificatePage />
            </ProtectedRoute>
          }
        />

        {/* Central Reports Hub */}
        <Route
          path="reports"
          element={
            <ProtectedRoute requiredMenu="Reports">
              <ReportsHubPage />
            </ProtectedRoute>
          }
        />

        {/* Module: Inventory Management */}
        <Route
          path="inventory"
          element={
            <ProtectedRoute requiredMenu="Inventory">
              <InventoryDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/items"
          element={
            <ProtectedRoute requiredMenu="Inventory">
              <ItemMasterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/categories"
          element={
            <ProtectedRoute requiredMenu="Inventory">
              <ItemCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/suppliers"
          element={
            <ProtectedRoute requiredMenu="Inventory">
              <ItemSuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/purchases"
          element={
            <ProtectedRoute requiredMenu="Inventory">
              <StockInwardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/issues"
          element={
            <ProtectedRoute requiredMenu="Inventory">
              <StockIssuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/ledger"
          element={
            <ProtectedRoute requiredMenu="Inventory">
              <StockLedgerPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Super Admin Executive Governance Portal */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="tenants" element={<TenantsListPage />} />
        <Route path="tenants/new" element={<CreateTenantWizardPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />
        <Route path="plans" element={<SubscriptionPlansPage />} />
        <Route path="modules" element={<ModuleCatalogPage />} />
        <Route path="gateways" element={<GatewaysPage />} />
        <Route path="audit-logs" element={<GlobalAuditLogsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
