using System;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Entities;

namespace SchoolERP.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext
    {
        private readonly ICurrentUserService? _currentUserService;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            ICurrentUserService? currentUserService = null)
            : base(options)
        {
            _currentUserService = currentUserService;
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
        public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
        public DbSet<SystemNotification> SystemNotifications => Set<SystemNotification>();

        public DbSet<School> Schools => Set<School>();
        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<AcademicYear> AcademicYears => Set<AcademicYear>();
        public DbSet<ClassMaster> Classes => Set<ClassMaster>();
        public DbSet<Section> Sections => Set<Section>();
        public DbSet<Subject> Subjects => Set<Subject>();
        public DbSet<ClassSubject> ClassSubjects => Set<ClassSubject>();
        public DbSet<SimpleMaster> SimpleMasters => Set<SimpleMaster>();
        public DbSet<NumberingSeries> NumberingSeries => Set<NumberingSeries>();

        public DbSet<Enquiry> Enquiries => Set<Enquiry>();
        public DbSet<EnquiryFollowup> EnquiryFollowups => Set<EnquiryFollowup>();
        public DbSet<Student> Students => Set<Student>();
        public DbSet<StudentGuardian> StudentGuardians => Set<StudentGuardian>();
        public DbSet<StudentEnrollment> StudentEnrollments => Set<StudentEnrollment>();
        public DbSet<StudentDocument> StudentDocuments => Set<StudentDocument>();
        public DbSet<StudentSectionHistory> StudentSectionHistories => Set<StudentSectionHistory>();
        public DbSet<StudentSibling> StudentSiblings => Set<StudentSibling>();
        public DbSet<StudentGatePass> StudentGatePasses => Set<StudentGatePass>();
        public DbSet<StudentCertificate> StudentCertificates => Set<StudentCertificate>();
        public DbSet<StudentAuditLog> StudentAuditLogs => Set<StudentAuditLog>();

        // Dynamic Admission Builder & Admission Slip Management
        public DbSet<AdmissionFormConfig> AdmissionFormConfigs => Set<AdmissionFormConfig>();
        public DbSet<AdmissionFormField> AdmissionFormFields => Set<AdmissionFormField>();
        public DbSet<AdmissionSlip> AdmissionSlips => Set<AdmissionSlip>();
        public DbSet<AdmissionPayment> AdmissionPayments => Set<AdmissionPayment>();

        // Expenses
        public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
        public DbSet<Expense> Expenses => Set<Expense>();

        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<TeacherAllocation> TeacherAllocations => Set<TeacherAllocation>();
        public DbSet<StaffPayroll> StaffPayrolls => Set<StaffPayroll>();
        public DbSet<StaffLeavePolicy> StaffLeavePolicies => Set<StaffLeavePolicy>();
        public DbSet<StaffLeaveAllocation> StaffLeaveAllocations => Set<StaffLeaveAllocation>();

        public DbSet<FeeHead> FeeHeads => Set<FeeHead>();
        public DbSet<FeeGroup> FeeGroups => Set<FeeGroup>();
        public DbSet<FeeInstallment> FeeInstallments => Set<FeeInstallment>();
        public DbSet<FeeStructure> FeeStructures => Set<FeeStructure>();
        public DbSet<FineRule> FineRules => Set<FineRule>();
        public DbSet<StudentFeeDue> StudentFeeDues => Set<StudentFeeDue>();
        public DbSet<FeeConcession> FeeConcessions => Set<FeeConcession>();
        public DbSet<FeeReceipt> FeeReceipts => Set<FeeReceipt>();
        public DbSet<FeeReceiptDetail> FeeReceiptDetails => Set<FeeReceiptDetail>();
        public DbSet<FeePayment> FeePayments => Set<FeePayment>();
        public DbSet<FeeDiscountScheme> FeeDiscountSchemes => Set<FeeDiscountScheme>();

        // Attendance & Timetable Module
        public DbSet<Holiday> Holidays => Set<Holiday>();
        public DbSet<StudentAttendance> StudentAttendances => Set<StudentAttendance>();
        public DbSet<StaffAttendance> StaffAttendances => Set<StaffAttendance>();
        public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
        public DbSet<PeriodMaster> Periods => Set<PeriodMaster>();
        public DbSet<TimetableEntry> Timetables => Set<TimetableEntry>();
        public DbSet<Substitution> Substitutions => Set<Substitution>();

        // Examination Module (Module 7)
        public DbSet<ExamTerm> ExamTerms => Set<ExamTerm>();
        public DbSet<Exam> Exams => Set<Exam>();
        public DbSet<ExamSchedule> ExamSchedules => Set<ExamSchedule>();
        public DbSet<GradeScale> GradeScales => Set<GradeScale>();
        public DbSet<MarksEntry> MarksEntries => Set<MarksEntry>();
        public DbSet<CoScholasticGrade> CoScholasticGrades => Set<CoScholasticGrade>();
        public DbSet<ReportRemark> ReportRemarks => Set<ReportRemark>();

        // Homework & Assignments Module
        public DbSet<Homework> Homeworks => Set<Homework>();
        public DbSet<HomeworkSubmission> HomeworkSubmissions => Set<HomeworkSubmission>();

        // Promotion & TC Module (Module 8)
        public DbSet<StudentPromotion> StudentPromotions => Set<StudentPromotion>();
        public DbSet<TransferCertificate> TransferCertificates => Set<TransferCertificate>();

        // Inventory Management Module
        public DbSet<ItemCategory> ItemCategories => Set<ItemCategory>();
        public DbSet<ItemSupplier> ItemSuppliers => Set<ItemSupplier>();
        public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
        public DbSet<InventoryPurchase> InventoryPurchases => Set<InventoryPurchase>();
        public DbSet<InventoryPurchaseItem> InventoryPurchaseItems => Set<InventoryPurchaseItem>();
        public DbSet<InventoryIssue> InventoryIssues => Set<InventoryIssue>();
        public DbSet<InventoryIssueItem> InventoryIssueItems => Set<InventoryIssueItem>();
        public DbSet<InventoryStockLog> InventoryStockLogs => Set<InventoryStockLog>();

        // Multi-Tenancy, Subscriptions & Super Admin Modules
        public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
        public DbSet<TenantSubscription> TenantSubscriptions => Set<TenantSubscription>();
        public DbSet<ModuleCatalog> ModuleCatalogs => Set<ModuleCatalog>();
        public DbSet<TenantModule> TenantModules => Set<TenantModule>();
        public DbSet<TenantGatewayConfig> TenantGatewayConfigs => Set<TenantGatewayConfig>();
        public DbSet<GlobalAuditLog> GlobalAuditLogs => Set<GlobalAuditLog>();
        public DbSet<LandingEnquiry> LandingEnquiries => Set<LandingEnquiry>();
        public DbSet<LandingPageSetting> LandingPageSettings => Set<LandingPageSetting>();
        public DbSet<SystemErrorLog> SystemErrorLogs => Set<SystemErrorLog>();
        public DbSet<Vehicle> Vehicles => Set<Vehicle>();
        public DbSet<TransportRoute> TransportRoutes => Set<TransportRoute>();
        public DbSet<RouteStop> RouteStops => Set<RouteStop>();
        public DbSet<TransportAllocation> TransportAllocations => Set<TransportAllocation>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply snake_case naming convention and Global Query Filter for soft delete
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                // Table name in snake_case
                var tableName = entity.GetTableName();
                if (!string.IsNullOrEmpty(tableName))
                {
                    entity.SetTableName(ToSnakeCase(tableName));
                }

                // Column names in snake_case
                foreach (var property in entity.GetProperties())
                {
                    var columnName = property.GetColumnName(StoreObjectIdentifier.Table(entity.GetTableName()!, null));
                    if (!string.IsNullOrEmpty(columnName))
                    {
                        property.SetColumnName(ToSnakeCase(columnName));
                    }
                }

                // Soft delete filter: is_active = 1
                if (typeof(BaseEntity).IsAssignableFrom(entity.ClrType))
                {
                    var method = typeof(ApplicationDbContext)
                        .GetMethod(nameof(ConfigureGlobalFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)?
                        .MakeGenericMethod(entity.ClrType);

                    method?.Invoke(null, new object[] { modelBuilder });
                }
            }

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Username).IsUnique();
                entity.Property(u => u.Username).HasMaxLength(100).IsRequired();
                entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
                entity.Property(u => u.Email).HasMaxLength(150);
                entity.Property(u => u.Mobile).HasMaxLength(20);
            });

            // Academic Year uniqueness per branch
            modelBuilder.Entity<AcademicYear>(entity =>
            {
                entity.HasIndex(ay => new { ay.BranchId, ay.Name }).IsUnique();
            });

            // Employee configuration (BR-4.1: Employee code unique per branch/school)
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.HasIndex(e => new { e.BranchId, e.EmployeeCode }).IsUnique();
                entity.Property(e => e.EmployeeCode).HasMaxLength(50).IsRequired();
                entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.LastName).HasMaxLength(100);
                entity.Property(e => e.Mobile).HasMaxLength(20).IsRequired();
            });

            // Teacher Allocation (BR-4.2: One section has only one class teacher per academic year)
            modelBuilder.Entity<TeacherAllocation>(entity =>
            {
                entity.HasIndex(a => new { a.BranchId, a.AcademicYearId, a.ClassId, a.SectionId, a.SubjectId, a.IsClassTeacher });
            });

            // Staff Payroll configuration
            modelBuilder.Entity<StaffPayroll>(entity =>
            {
                entity.ToTable("staff_payrolls");
                entity.HasIndex(p => new { p.BranchId, p.EmployeeId, p.PayrollMonth, p.PayrollYear }).IsUnique();
                entity.HasIndex(p => new { p.BranchId, p.SalarySlipNo }).IsUnique();
                entity.Property(p => p.SalarySlipNo).HasMaxLength(60).IsRequired();
                entity.Property(p => p.MonthName).HasMaxLength(50).IsRequired();
                entity.Property(p => p.PaymentStatus).HasMaxLength(30).IsRequired();
                entity.Property(p => p.PaymentMode).HasMaxLength(50);
                entity.Property(p => p.TransactionReference).HasMaxLength(150);
            });

            // Decimal precision for monetary fields (BR-5.5)
            foreach (var property in modelBuilder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetPrecision(12);
                property.SetScale(2);
            }

            // Fee Configurations
            modelBuilder.Entity<FeeHead>(entity =>
            {
                entity.HasIndex(h => new { h.BranchId, h.Code }).IsUnique();
                entity.Property(h => h.Name).HasMaxLength(100).IsRequired();
                entity.Property(h => h.Code).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<FeeGroup>(entity =>
            {
                entity.HasIndex(g => new { g.BranchId, g.Name }).IsUnique();
                entity.Property(g => g.Name).HasMaxLength(100).IsRequired();
            });

            modelBuilder.Entity<FeeInstallment>(entity =>
            {
                entity.Property(i => i.Name).HasMaxLength(100).IsRequired();
            });

            modelBuilder.Entity<FeeReceipt>(entity =>
            {
                // BR-5.1: Receipt numbers are sequential per branch per academic year
                entity.HasIndex(r => new { r.BranchId, r.AcademicYearId, r.ReceiptNo }).IsUnique();
                entity.Property(r => r.ReceiptNo).HasMaxLength(50).IsRequired();
            });

            // Attendance & Timetable Configurations
            modelBuilder.Entity<Holiday>(entity =>
            {
                entity.HasIndex(h => new { h.BranchId, h.AcademicYearId, h.HolidayDate }).IsUnique();
                entity.Property(h => h.Name).HasMaxLength(150).IsRequired();
            });

            modelBuilder.Entity<StudentAttendance>(entity =>
            {
                entity.HasIndex(a => new { a.BranchId, a.AcademicYearId, a.StudentId, a.AttendanceDate }).IsUnique();
            });

            modelBuilder.Entity<StaffAttendance>(entity =>
            {
                entity.HasIndex(a => new { a.BranchId, a.EmployeeId, a.AttendanceDate }).IsUnique();
            });

            modelBuilder.Entity<PeriodMaster>(entity =>
            {
                entity.HasIndex(p => new { p.BranchId, p.AcademicYearId, p.PeriodNumber }).IsUnique();
                entity.Property(p => p.Name).HasMaxLength(100).IsRequired();
            });

            modelBuilder.Entity<TimetableEntry>(entity =>
            {
                entity.HasIndex(t => new { t.BranchId, t.AcademicYearId, t.SectionId, t.DayOfWeek, t.PeriodId }).IsUnique();
            });

            modelBuilder.Entity<Substitution>(entity =>
            {
                entity.HasIndex(s => new { s.BranchId, s.AcademicYearId, s.SubstitutionDate, s.PeriodId, s.SectionId });
            });

            // Multi-Tenant Configurations
            modelBuilder.Entity<School>(entity =>
            {
                entity.HasIndex(s => s.Slug).IsUnique();
                entity.HasIndex(s => s.Code).IsUnique();
            });

            modelBuilder.Entity<TenantModule>(entity =>
            {
                entity.HasIndex(tm => new { tm.SchoolId, tm.ModuleCode }).IsUnique();
            });

            modelBuilder.Entity<SubscriptionPlan>(entity =>
            {
                entity.HasIndex(sp => sp.Code).IsUnique();
            });

            modelBuilder.Entity<TenantGatewayConfig>(entity =>
            {
                entity.HasIndex(gc => new { gc.SchoolId, gc.GatewayType, gc.Provider });
            });

            modelBuilder.Entity<SystemErrorLog>(entity =>
            {
                entity.ToTable("system_error_logs");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.StatusCode);
                entity.HasIndex(e => e.IsResolved);
                entity.HasIndex(e => e.ErrorId);
            });
        }

        private static void ConfigureGlobalFilter<TEntity>(ModelBuilder modelBuilder) where TEntity : BaseEntity
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(e => e.IsActive);
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var currentUserId = _currentUserService?.UserId ?? 0;

            foreach (var entry in ChangeTracker.Entries<BaseEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.CreatedOn = now;
                        entry.Entity.CreatedBy = currentUserId;
                        entry.Entity.IsActive = true;
                        break;

                    case EntityState.Modified:
                        entry.Entity.ModifiedOn = now;
                        entry.Entity.ModifiedBy = currentUserId;
                        break;

                    case EntityState.Deleted:
                        // Convert physical delete to soft delete
                        entry.State = EntityState.Modified;
                        entry.Entity.IsActive = false;
                        entry.Entity.ModifiedOn = now;
                        entry.Entity.ModifiedBy = currentUserId;
                        break;
                }
            }

            return await base.SaveChangesAsync(cancellationToken);
        }

        private static string ToSnakeCase(string input)
        {
            if (string.IsNullOrEmpty(input)) return input;
            var startUnderscores = Regex.Match(input, @"^_+");
            return startUnderscores + Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
        }
    }
}
