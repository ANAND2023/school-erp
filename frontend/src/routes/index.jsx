import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ChangePasswordPage } from '../features/auth/pages/ChangePasswordPage';
import { UnauthorizedPage } from '../features/auth/pages/UnauthorizedPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { TransportVehiclesPage } from '../features/transport/pages/TransportVehiclesPage';
import { TransportRoutesPage } from '../features/transport/pages/TransportRoutesPage';
import { TransportAllocationsPage } from '../features/transport/pages/TransportAllocationsPage';
import { CommunicationPage } from '../features/communication/pages/CommunicationPage';
import { LandingPage } from '../features/public/pages/LandingPage';
import { StudentPortalDashboardPage } from '../features/portal/pages/StudentPortalDashboardPage';

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
import { AdmissionFormBuilderPage } from '../features/admissions/pages/AdmissionFormBuilderPage';
import { AdmissionSlipGeneratorPage } from '../features/admissions/pages/AdmissionSlipGeneratorPage';
import { AdmissionSlipsListPage } from '../features/admissions/pages/AdmissionSlipsListPage';
import StudentsPage from '../features/students/pages/StudentsPage';
import StudentProfilePage from '../features/students/pages/StudentProfilePage';
import RollNumbersPage from '../features/students/pages/RollNumbersPage';
import SectionChangePage from '../features/students/pages/SectionChangePage';
import BulkOperationsPage from '../features/students/pages/BulkOperationsPage';
import IdCardDesignPage from '../features/students/pages/IdCardDesignPage';
import IdCardPrintPage from '../features/students/pages/IdCardPrintPage';
import StudentGatePassPage from '../features/students/pages/StudentGatePassPage';

// Module 4: Staff & HR
import StaffDirectoryPage from '../features/staff/pages/StaffDirectoryPage';
import EmployeeFormPage from '../features/staff/pages/EmployeeFormPage';
import EmployeeProfilePage from '../features/staff/pages/EmployeeProfilePage';
import TeacherAllocationPage from '../features/staff/pages/TeacherAllocationPage';

// Module 5: Fees Management
import FeeStructurePage from '../features/fees/pages/FeeStructurePage';
import FeeAssignmentPage from '../features/fees/pages/FeeAssignmentPage';
import FeeCollectionPage from '../features/fees/pages/FeeCollectionPage';
import DemandBillPage from '../features/fees/pages/DemandBillPage';
import FeeReportsPage from '../features/fees/pages/FeeReportsPage';
import { FeeDiscountMasterPage } from '../features/fees/pages/FeeDiscountMasterPage';
import ClassFeeStructurePage from '../features/fees/pages/ClassFeeStructurePage';

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
import { ExpensePage } from '../features/expense/pages/ExpensePage';

// Module: Inventory Management
import InventoryDashboardPage from '../features/inventory/pages/InventoryDashboardPage';
import ItemMasterPage from '../features/inventory/pages/ItemMasterPage';
import ItemCategoriesPage from '../features/inventory/pages/ItemCategoriesPage';
import ItemSuppliersPage from '../features/inventory/pages/ItemSuppliersPage';
import ManufactureMasterPage from '../features/inventory/pages/ManufactureMasterPage';
import StockInwardPage from '../features/inventory/pages/StockInwardPage';
import StockIssuePage from '../features/inventory/pages/StockIssuePage';
import StockReturnPage from '../features/inventory/pages/StockReturnPage';
import StockLedgerPage from '../features/inventory/pages/StockLedgerPage';
import InventoryStoreSetupPage from '../features/inventory/pages/InventoryStoreSetupPage';

// Super Admin Multi-Tenant Ecosystem
import { SuperAdminLayout } from '../features/superadmin/layouts/SuperAdminLayout';
import { SuperAdminDashboardPage } from '../features/superadmin/pages/SuperAdminDashboardPage';
import { TenantsListPage } from '../features/superadmin/pages/TenantsListPage';
import { CreateTenantWizardPage } from '../features/superadmin/pages/CreateTenantWizardPage';
import { TenantDetailPage } from '../features/superadmin/pages/TenantDetailPage';
import { SubscriptionPlansPage } from '../features/superadmin/pages/SubscriptionPlansPage';
import { GatewaysPage } from '../features/superadmin/pages/GatewaysPage';
import { WhatsAppSettingsPage } from '../features/superadmin/pages/WhatsAppSettingsPage';
import { GlobalAuditLogsPage } from '../features/superadmin/pages/GlobalAuditLogsPage';
import { LandingEnquiriesPage } from '../features/superadmin/pages/LandingEnquiriesPage';
import { ModuleCatalogPage } from '../features/superadmin/pages/ModuleCatalogPage';
import { WebsiteCmsPage } from '../features/superadmin/pages/WebsiteCmsPage';
import { SystemErrorLogsPage } from '../features/superadmin/pages/SystemErrorLogsPage';
import { EnquirySlipDesignerPage } from '../features/superadmin/pages/EnquirySlipDesignerPage';
import { FeeSlipDesignerPage } from '../features/superadmin/pages/FeeSlipDesignerPage';
import { AdmissionSlipDesignerPage } from '../features/superadmin/pages/AdmissionSlipDesignerPage';
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
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected routes within MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="portal" element={<StudentPortalDashboardPage />} />
        <Route path="expense" element={<ProtectedRoute requiredMenu="Expenses"><ExpensePage /></ProtectedRoute>} />
        <Route path="communication" element={<CommunicationPage />} />
            <Route path="transport/vehicles" element={<ProtectedRoute requiredMenu="Vehicles"><TransportVehiclesPage /></ProtectedRoute>} />
            <Route path="transport/routes" element={<ProtectedRoute requiredMenu="RoutesStops"><TransportRoutesPage /></ProtectedRoute>} />
            <Route path="transport/allocations" element={<ProtectedRoute requiredMenu="TransportAllocations"><TransportAllocationsPage /></ProtectedRoute>} />
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
            <ProtectedRoute requiredMenu="AuditLogs" superAdminOnly={true}>
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
        <Route
          path="masters/fee-discount"
          element={
            <ProtectedRoute requiredMenu={['FeeDiscountMaster', 'Masters', 'SimpleMasters', 'FeeStructure', 'Users']}>
              <FeeDiscountMasterPage />
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
          path="admissions/builder"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionFormBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admissions/slip-generator"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionSlipGeneratorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admissions/slips-list"
          element={
            <ProtectedRoute requiredMenu={['Admissions', 'Students']}>
              <AdmissionSlipsListPage />
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
        <Route
          path="students/bulk-operations"
          element={
            <ProtectedRoute requiredMenu="Students">
              <BulkOperationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/id-card-design"
          element={
            <ProtectedRoute requiredMenu="IDCardSettings">
              <IdCardDesignPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/id-card-print"
          element={
            <ProtectedRoute requiredMenu="PrintIDCards">
              <IdCardPrintPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/gate-pass"
          element={
            <ProtectedRoute requiredMenu={['Students', 'GatePass']}>
              <StudentGatePassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students/fee-structure"
          element={
            <ProtectedRoute requiredMenu={['Students', 'Enquiries', 'FeeStructure', 'Fees']}>
              <ClassFeeStructurePage />
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
          path="fees/class-structure"
          element={
            <ProtectedRoute requiredMenu={['FeeStructure', 'Fees', 'Students', 'Enquiries']}>
              <ClassFeeStructurePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fees/assignment"
          element={
            <ProtectedRoute requiredMenu="FeeAssignment">
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
          path="fees/discount-master"
          element={
            <ProtectedRoute requiredMenu={['FeeDiscountMaster', 'Fees', 'FeeStructure', 'FeeCollection', 'Users']}>
              <FeeDiscountMasterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fees/demand-bills"
          element={
            <ProtectedRoute requiredMenu="DemandBill">
              <DemandBillPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fees/demand-notice"
          element={
            <ProtectedRoute requiredMenu="DemandBill">
              <DemandBillPage />
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
            <ProtectedRoute requiredMenu="LeaveManagement">
              <LeaveManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance/reports"
          element={
            <ProtectedRoute requiredMenu="AttendanceReports">
              <AttendanceReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance/holidays"
          element={
            <ProtectedRoute requiredMenu="HolidayCalendar">
              <HolidaysPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable"
          element={
            <ProtectedRoute requiredMenu="ClassTimetable">
              <ClassTimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable/class"
          element={
            <ProtectedRoute requiredMenu="ClassTimetable">
              <ClassTimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable/teacher"
          element={
            <ProtectedRoute requiredMenu="TeacherTimetable">
              <TeacherTimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="timetable/substitution"
          element={
            <ProtectedRoute requiredMenu="Substitutions">
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
            <ProtectedRoute requiredMenu="InventoryOverview">
              <InventoryDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/store-setup"
          element={
            <ProtectedRoute requiredMenu="InventoryOverview">
              <InventoryStoreSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/items"
          element={
            <ProtectedRoute requiredMenu="ItemsMaster">
              <ItemMasterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/categories"
          element={
            <ProtectedRoute requiredMenu="ItemCategories">
              <ItemCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/suppliers"
          element={
            <ProtectedRoute requiredMenu="Suppliers">
              <ItemSuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/manufactures"
          element={
            <ProtectedRoute requiredMenu="Manufactures">
              <ManufactureMasterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/purchases"
          element={
            <ProtectedRoute requiredMenu="StockInward">
              <StockInwardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/issues"
          element={
            <ProtectedRoute requiredMenu="StockIssue">
              <StockIssuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/returns"
          element={
            <ProtectedRoute requiredMenu="StockIssue">
              <StockReturnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/ledger"
          element={
            <ProtectedRoute requiredMenu="StockLedger">
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
        <Route path="whatsapp" element={<WhatsAppSettingsPage />} />
        <Route path="enquiry-slip-designer" element={<EnquirySlipDesignerPage />} />
        <Route path="fee-slip-designer" element={<FeeSlipDesignerPage />} />
        <Route path="admission-slip-designer" element={<AdmissionSlipDesignerPage />} />
        <Route path="inventory-slip-designer" element={<InventoryStoreSetupPage />} />
        <Route path="audit-logs" element={<GlobalAuditLogsPage />} />
        <Route path="error-logs" element={<SystemErrorLogsPage />} />
        <Route path="enquiries" element={<LandingEnquiriesPage />} />
        <Route path="website-cms" element={<WebsiteCmsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};






