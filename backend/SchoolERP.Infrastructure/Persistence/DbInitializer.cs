using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Infrastructure.Persistence
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Ensure Database is created
            await context.Database.EnsureCreatedAsync();

            // Ensure is_optional column exists on fee_heads table if already created previously
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE fee_heads ADD COLUMN is_optional TINYINT(1) NOT NULL DEFAULT 0;");
            }
            catch { }

            // Ensure family_id & sibling_student_id on students table
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE students ADD COLUMN family_id BIGINT NULL;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE students ADD COLUMN sibling_student_id BIGINT NULL;");
            }
            catch { }

            // Ensure signature columns exist on branches table
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE branches ADD COLUMN principal_signature_url LONGTEXT NULL;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE branches ADD COLUMN cashier_signature_url LONGTEXT NULL;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE branches ADD COLUMN authorized_signature_url LONGTEXT NULL;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE branches ADD COLUMN logo_url LONGTEXT NULL;");
            }
            catch { }

            // Ensure student_siblings table exists
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS student_siblings (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        student_id BIGINT NOT NULL,
                        sibling_student_id BIGINT NOT NULL,
                        created_by BIGINT NOT NULL DEFAULT 1,
                        created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        modified_by BIGINT NULL,
                        modified_on DATETIME NULL,
                        is_active TINYINT(1) NOT NULL DEFAULT 1,
                        INDEX idx_student_siblings_student (student_id),
                        INDEX idx_student_siblings_sibling (sibling_student_id)
                    );");
            }
            catch { }

            // Seed School & Branch
            if (!await context.Schools.AnyAsync())
            {
                var school = new School
                {
                    Name = "Delhi Public School",
                    Code = "DPS",
                    AffiliationNumber = "CBSE/2026/0912",
                    ContactNumber = "+91 98765 43210",
                    Email = "info@dps.edu.in",
                    Website = "https://dps.edu.in",
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.Schools.Add(school);
                await context.SaveChangesAsync();

                var branch = new Branch
                {
                    SchoolId = school.Id,
                    Name = "Main Campus",
                    Code = "MAIN",
                    PrintHeader = "DELHI PUBLIC SCHOOL - MAIN CAMPUS",
                    Address = "123 Knowledge Park, Sector 4",
                    City = "New Delhi",
                    State = "Delhi",
                    Pincode = "110001",
                    Phone = "+91 11 2345 6789",
                    Email = "main@dps.edu.in",
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.Branches.Add(branch);
                await context.SaveChangesAsync();

                // Seed Academic Year
                var academicYear = new AcademicYear
                {
                    BranchId = branch.Id,
                    Name = "2026-27",
                    StartDate = new DateTime(2026, 4, 1),
                    EndDate = new DateTime(2027, 3, 31),
                    IsCurrent = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.AcademicYears.Add(academicYear);
                await context.SaveChangesAsync();
            }

            // Seed Roles
            if (!await context.Roles.AnyAsync())
            {
                var menus = new List<string>
                {
                    "Dashboard", "Users", "Roles", "AuditLogs",
                    "Branch", "AcademicYears", "Classes", "Sections", "Subjects", "ClassSubjects", "SimpleMasters",
                    "Enquiries", "Admissions", "Students", "RollNumbers", "SectionChange",
                    "Staff", "TeacherAllocation",
                    "FeeStructure", "FeeCollection", "FeeConcessions", "FeeReports",
                    "StudentAttendance", "StaffAttendance", "Timetable",
                    "ExamSchedules", "MarksEntry", "ReportCards",
                    "Promotion", "TransferCertificates", "Reports",
                    "Inventory"
                };

                var superAdminRole = new Role
                {
                    Name = "Super Admin",
                    Description = "Global system owner with unrestricted access",
                    IsSystemRole = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.Roles.Add(superAdminRole);

                var schoolAdminRole = new Role
                {
                    Name = "School Admin",
                    Description = "Branch administrator for all operational modules",
                    IsSystemRole = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.Roles.Add(schoolAdminRole);

                var principalRole = new Role
                {
                    Name = "Principal",
                    Description = "Head of school with approvals and reports",
                    IsSystemRole = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.Roles.Add(principalRole);

                var teacherRole = new Role
                {
                    Name = "Teacher",
                    Description = "Class and subject teacher access",
                    IsSystemRole = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.Roles.Add(teacherRole);

                var accountantRole = new Role
                {
                    Name = "Accountant",
                    Description = "Fee collection and accounts counter",
                    IsSystemRole = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow,
                    IsActive = true
                };
                context.Roles.Add(accountantRole);

                await context.SaveChangesAsync();

                // Add permissions for School Admin (All Menus, All Actions)
                foreach (var menu in menus)
                {
                    context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = schoolAdminRole.Id,
                        Menu = menu,
                        CanView = true,
                        CanAdd = true,
                        CanEdit = true,
                        CanDelete = true,
                        CanPrint = true,
                        CanExport = true,
                        CreatedBy = 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    });

                    // Principal permissions
                    context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = principalRole.Id,
                        Menu = menu,
                        CanView = true,
                        CanAdd = !menu.Contains("Users") && !menu.Contains("Roles"),
                        CanEdit = !menu.Contains("Users") && !menu.Contains("Roles"),
                        CanDelete = false,
                        CanPrint = true,
                        CanExport = true,
                        CreatedBy = 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    });
                }

                await context.SaveChangesAsync();

                // Seed Default Users
                var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123");

                var branch = await context.Branches.FirstAsync();

                var superAdmin = new User
                {
                    Username = "superadmin",
                    PasswordHash = defaultPasswordHash,
                    FullName = "Super Administrator",
                    Email = "superadmin@erp.local",
                    Mobile = "9876543210",
                    UserType = UserType.SuperAdmin,
                    RoleId = superAdminRole.Id,
                    BranchId = branch.Id,
                    MustChangePassword = false,
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow
                };

                var schoolAdmin = new User
                {
                    Username = "admin",
                    PasswordHash = defaultPasswordHash,
                    FullName = "Branch Admin",
                    Email = "admin@dps.edu.in",
                    Mobile = "9876543211",
                    UserType = UserType.SchoolAdmin,
                    RoleId = schoolAdminRole.Id,
                    BranchId = branch.Id,
                    MustChangePassword = false,
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow
                };

                var principalUser = new User
                {
                    Username = "principal",
                    PasswordHash = defaultPasswordHash,
                    FullName = "Dr. S. K. Sharma",
                    Email = "principal@dps.edu.in",
                    Mobile = "9876543212",
                    UserType = UserType.Principal,
                    RoleId = principalRole.Id,
                    BranchId = branch.Id,
                    MustChangePassword = false,
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedOn = DateTime.UtcNow
                };

                context.Users.AddRange(superAdmin, schoolAdmin, principalUser);
                await context.SaveChangesAsync();
            }

            // Seed Classes & Sections
            var defaultBranch = await context.Branches.FirstOrDefaultAsync();
            var currentAcademicYear = await context.AcademicYears.FirstOrDefaultAsync(ay => ay.IsCurrent);

            if (defaultBranch != null && !await context.Classes.AnyAsync())
            {
                var classNames = new[] { "Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10" };
                var order = 1;
                foreach (var cName in classNames)
                {
                    var cls = new ClassMaster
                    {
                        BranchId = defaultBranch.Id,
                        Name = cName,
                        DisplayOrder = order++,
                        IsActive = true
                    };
                    context.Classes.Add(cls);
                    await context.SaveChangesAsync();

                    context.Sections.Add(new Section { ClassId = cls.Id, BranchId = defaultBranch.Id, Name = "A", Capacity = 40, IsActive = true });
                    context.Sections.Add(new Section { ClassId = cls.Id, BranchId = defaultBranch.Id, Name = "B", Capacity = 40, IsActive = true });
                }
                await context.SaveChangesAsync();
            }

            // Seed Subjects & Class-Subject Mappings
            if (defaultBranch != null && !await context.Subjects.AnyAsync())
            {
                var subjectsList = new[]
                {
                    new Subject { BranchId = defaultBranch.Id, Name = "English", Code = "ENG", Type = SubjectType.Scholastic, IsActive = true },
                    new Subject { BranchId = defaultBranch.Id, Name = "Hindi", Code = "HIN", Type = SubjectType.Scholastic, IsActive = true },
                    new Subject { BranchId = defaultBranch.Id, Name = "Mathematics", Code = "MATH", Type = SubjectType.Scholastic, IsActive = true },
                    new Subject { BranchId = defaultBranch.Id, Name = "Science", Code = "SCI", Type = SubjectType.Scholastic, IsActive = true },
                    new Subject { BranchId = defaultBranch.Id, Name = "Social Studies", Code = "SST", Type = SubjectType.Scholastic, IsActive = true },
                    new Subject { BranchId = defaultBranch.Id, Name = "Computer Science", Code = "CS", Type = SubjectType.Scholastic, IsActive = true },
                    new Subject { BranchId = defaultBranch.Id, Name = "Physical Education", Code = "PE", Type = SubjectType.CoScholastic, IsActive = true },
                    new Subject { BranchId = defaultBranch.Id, Name = "Art & Craft", Code = "ART", Type = SubjectType.CoScholastic, IsActive = true },
                };

                context.Subjects.AddRange(subjectsList);
                await context.SaveChangesAsync();

                if (currentAcademicYear != null)
                {
                    var allClasses = await context.Classes.ToListAsync();
                    foreach (var cls in allClasses)
                    {
                        foreach (var sub in subjectsList)
                        {
                            context.ClassSubjects.Add(new ClassSubject
                            {
                                BranchId = defaultBranch.Id,
                                AcademicYearId = currentAcademicYear.Id,
                                ClassId = cls.Id,
                                SubjectId = sub.Id,
                                IsOptional = sub.Type == SubjectType.CoScholastic,
                                IsActive = true
                            });
                        }
                    }
                    await context.SaveChangesAsync();
                }
            }

            // Seed Simple Masters (Lookups)
            if (defaultBranch != null && !await context.SimpleMasters.AnyAsync())
            {
                var lookups = new List<SimpleMaster>
                {
                    // Category
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Category, Name = "General", Code = "GEN", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Category, Name = "OBC", Code = "OBC", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Category, Name = "SC", Code = "SC", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Category, Name = "ST", Code = "ST", DisplayOrder = 4, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Category, Name = "EWS", Code = "EWS", DisplayOrder = 5, IsActive = true },

                    // Religion
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Religion, Name = "Hindu", Code = "HIN", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Religion, Name = "Muslim", Code = "MUS", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Religion, Name = "Christian", Code = "CHR", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Religion, Name = "Sikh", Code = "SIK", DisplayOrder = 4, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Religion, Name = "Jain", Code = "JAI", DisplayOrder = 5, IsActive = true },

                    // House
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.House, Name = "Red House (Mars)", Code = "RED", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.House, Name = "Blue House (Neptune)", Code = "BLUE", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.House, Name = "Green House (Earth)", Code = "GREEN", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.House, Name = "Yellow House (Sun)", Code = "YELLOW", DisplayOrder = 4, IsActive = true },

                    // Document Types
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.DocumentType, Name = "Birth Certificate", Code = "BC", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.DocumentType, Name = "Aadhaar Card", Code = "AADHAAR", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.DocumentType, Name = "Transfer Certificate (TC)", Code = "TC", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.DocumentType, Name = "Previous Report Card", Code = "RC", DisplayOrder = 4, IsActive = true },

                    // Designations
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Designation, Name = "Principal", Code = "PRIN", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Designation, Name = "PGT Teacher", Code = "PGT", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Designation, Name = "TGT Teacher", Code = "TGT", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Designation, Name = "PRT Teacher", Code = "PRT", DisplayOrder = 4, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Designation, Name = "Accountant", Code = "ACCT", DisplayOrder = 5, IsActive = true },

                    // Departments
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Department, Name = "Academic", Code = "ACAD", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Department, Name = "Administration", Code = "ADMIN", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Department, Name = "Accounts", Code = "FIN", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Department, Name = "Sports & Fitness", Code = "SPORT", DisplayOrder = 4, IsActive = true },

                    // Payment Modes
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.PaymentMode, Name = "Cash", Code = "CASH", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.PaymentMode, Name = "UPI / QR Code", Code = "UPI", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.PaymentMode, Name = "Bank Cheque", Code = "CHQ", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.PaymentMode, Name = "Credit / Debit Card", Code = "CARD", DisplayOrder = 4, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.PaymentMode, Name = "Online Payment Gateway", Code = "PG", DisplayOrder = 5, IsActive = true },

                    // Banks
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Bank, Name = "State Bank of India", Code = "SBI", DisplayOrder = 1, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Bank, Name = "HDFC Bank", Code = "HDFC", DisplayOrder = 2, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Bank, Name = "ICICI Bank", Code = "ICICI", DisplayOrder = 3, IsActive = true },
                    new SimpleMaster { BranchId = defaultBranch.Id, Type = MasterType.Bank, Name = "Punjab National Bank", Code = "PNB", DisplayOrder = 4, IsActive = true },
                };

                context.SimpleMasters.AddRange(lookups);
                await context.SaveChangesAsync();
            }

            // Seed Module Catalog if not exists
            if (!await context.ModuleCatalogs.AnyAsync())
            {
                var modules = new List<ModuleCatalog>
                {
                    new ModuleCatalog { Code = "STUDENTS", Name = "Student Management", Category = "Core", Description = "Student admissions, profiles, documents, and records", IsCore = true, DisplayOrder = 1, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "ACADEMICS", Name = "Academics & Classes", Category = "Core", Description = "Academic years, classes, sections, and subjects", IsCore = true, DisplayOrder = 2, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "ATTENDANCE", Name = "Attendance System", Category = "Operations", Description = "Daily student and staff biometric/manual attendance tracking", IsCore = false, DisplayOrder = 3, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "FEES", Name = "Fee Management", Category = "Finance", Description = "Fee structures, concessions, collection counters, receipts, and dues", IsCore = false, DisplayOrder = 4, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "EXAMINATIONS", Name = "Examinations & Grading", Category = "Academics", Description = "Exams scheduling, marks entry, report cards, and promotion", IsCore = false, DisplayOrder = 5, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "STAFF_PAYROLL", Name = "Staff & HR", Category = "HR", Description = "Employee directory, teacher allocations, substitutions, and leaves", IsCore = false, DisplayOrder = 6, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "TRANSPORT", Name = "Transport Management", Category = "Logistics", Description = "Bus routes, stops, vehicle tracking, and student mapping", IsCore = false, DisplayOrder = 7, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "HOSTEL", Name = "Hostel Management", Category = "Logistics", Description = "Hostel buildings, rooms, bed allocations, and mess management", IsCore = false, DisplayOrder = 8, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "INVENTORY", Name = "Inventory & Assets", Category = "Operations", Description = "School assets, stock tracking, vendors, and purchase requisitions", IsCore = false, DisplayOrder = 9, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                    new ModuleCatalog { Code = "COMMUNICATIONS", Name = "SMS & WhatsApp Gateway", Category = "Communication", Description = "Bulk SMS, WhatsApp notifications, circulars, and announcements", IsCore = false, DisplayOrder = 10, CreatedBy = 1, CreatedOn = DateTime.UtcNow, IsActive = true },
                };
                context.ModuleCatalogs.AddRange(modules);
                await context.SaveChangesAsync();
            }

            // Seed Subscription Plans if not exists
            if (!await context.SubscriptionPlans.AnyAsync())
            {
                var plans = new List<SubscriptionPlan>
                {
                    new SubscriptionPlan
                    {
                        Code = "STARTER",
                        Name = "Starter Plan",
                        Description = "Essential features for small schools and pre-primary institutes",
                        BillingPeriod = "Monthly",
                        PricePerPeriod = 1999m,
                        MaxStudents = 250,
                        MaxStaff = 25,
                        IncludedModules = "STUDENTS,ACADEMICS,ATTENDANCE",
                        CreatedBy = 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    },
                    new SubscriptionPlan
                    {
                        Code = "GROWTH",
                        Name = "Growth Plan",
                        Description = "Ideal for growing K-12 schools requiring fees, exams, and staff management",
                        BillingPeriod = "Monthly",
                        PricePerPeriod = 4999m,
                        MaxStudents = 1000,
                        MaxStaff = 75,
                        IncludedModules = "STUDENTS,ACADEMICS,ATTENDANCE,FEES,EXAMINATIONS,STAFF_PAYROLL",
                        CreatedBy = 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    },
                    new SubscriptionPlan
                    {
                        Code = "ENTERPRISE",
                        Name = "Enterprise Plan",
                        Description = "Full-featured unlimited package for premier institutions and school groups",
                        BillingPeriod = "Annual",
                        PricePerPeriod = 49999m,
                        MaxStudents = 5000,
                        MaxStaff = 300,
                        IncludedModules = "STUDENTS,ACADEMICS,ATTENDANCE,FEES,EXAMINATIONS,STAFF_PAYROLL,TRANSPORT,HOSTEL,INVENTORY,COMMUNICATIONS",
                        CreatedBy = 1,
                        CreatedOn = DateTime.UtcNow,
                        IsActive = true
                    }
                };
                context.SubscriptionPlans.AddRange(plans);
                await context.SaveChangesAsync();
            }

            // Ensure first school has slug, status, active modules & subscription
            var defaultSchool = await context.Schools.FirstOrDefaultAsync();
            if (defaultSchool != null)
            {
                if (string.IsNullOrEmpty(defaultSchool.Slug))
                {
                    defaultSchool.Slug = "dps";
                    defaultSchool.City = defaultSchool.City ?? "New Delhi";
                    defaultSchool.State = defaultSchool.State ?? "Delhi";
                    defaultSchool.Pincode = defaultSchool.Pincode ?? "110001";
                    defaultSchool.Status = "Active";
                    await context.SaveChangesAsync();
                }

                // Ensure tenant modules seeded for default school
                if (!await context.TenantModules.AnyAsync(m => m.SchoolId == defaultSchool.Id))
                {
                    var allModules = await context.ModuleCatalogs.ToListAsync();
                    foreach (var mod in allModules)
                    {
                        context.TenantModules.Add(new TenantModule
                        {
                            SchoolId = defaultSchool.Id,
                            ModuleCode = mod.Code,
                            IsEnabled = true,
                            CreatedBy = 1,
                            CreatedOn = DateTime.UtcNow,
                            IsActive = true
                        });
                    }
                    await context.SaveChangesAsync();
                }

                // Ensure default school has active enterprise subscription
                if (!await context.TenantSubscriptions.AnyAsync(s => s.SchoolId == defaultSchool.Id))
                {
                    var entPlan = await context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == "ENTERPRISE");
                    if (entPlan != null)
                    {
                        context.TenantSubscriptions.Add(new TenantSubscription
                        {
                            SchoolId = defaultSchool.Id,
                            PlanId = entPlan.Id,
                            StartDate = DateTime.UtcNow.AddMonths(-1),
                            EndDate = DateTime.UtcNow.AddYears(1),
                            CustomMaxStudents = 5000,
                            CustomMaxStaff = 300,
                            AmountPaid = entPlan.PricePerPeriod,
                            Status = "Active",
                            Notes = "Initial default seeding subscription",
                            CreatedBy = 1,
                            CreatedOn = DateTime.UtcNow,
                            IsActive = true
                        });
                        await context.SaveChangesAsync();
                    }
                }
            }

            // Seed Inventory Module Data
            await SeedInventoryAsync(context);
        }

        public static async Task SeedInventoryAsync(ApplicationDbContext context)
        {
            var branch = await context.Branches.FirstOrDefaultAsync(b => b.IsActive);
            var branchId = branch?.Id ?? 1;

            if (await context.ItemCategories.AnyAsync(c => c.BranchId == branchId && c.IsActive))
            {
                return; // Already seeded
            }

            // 1. Categories
            var catUniform = new ItemCategory { BranchId = branchId, Name = "Uniforms & Apparel", Code = "UNIF", DisplayOrder = 10, Description = "School dress, blazers, sportswear, shoes", CreatedBy = 1, IsActive = true };
            var catBooks = new ItemCategory { BranchId = branchId, Name = "Books & Course Material", Code = "BOOK", DisplayOrder = 20, Description = "NCERT & reference textbooks, syllabus books", CreatedBy = 1, IsActive = true };
            var catStationery = new ItemCategory { BranchId = branchId, Name = "Stationery & Notebooks", Code = "STAT", DisplayOrder = 30, Description = "Class registers, notebooks, diaries, files", CreatedBy = 1, IsActive = true };
            var catAccessories = new ItemCategory { BranchId = branchId, Name = "Accessories & Badges", Code = "ACC", DisplayOrder = 40, Description = "Ties, belts, ID cards, badges, ribbons", CreatedBy = 1, IsActive = true };
            var catSports = new ItemCategory { BranchId = branchId, Name = "Sports & Games Equipment", Code = "SPORT", DisplayOrder = 50, Description = "Cricket, football, badminton, basketball gear", CreatedBy = 1, IsActive = true };
            var catLab = new ItemCategory { BranchId = branchId, Name = "Science & Lab Supplies", Code = "LAB", DisplayOrder = 60, Description = "Physics, chemistry, biology apparatus & coats", CreatedBy = 1, IsActive = true };

            context.ItemCategories.AddRange(catUniform, catBooks, catStationery, catAccessories, catSports, catLab);
            await context.SaveChangesAsync();

            // 2. Suppliers
            var supUniform = new ItemSupplier
            {
                BranchId = branchId,
                SupplierName = "Apex School Uniforms & Apparel Ltd.",
                ContactPerson = "Ramesh Verma",
                Phone = "+91 98112 34567",
                Email = "sales@apexuniforms.in",
                Address = "Plot 42, Okhla Industrial Area Phase-III",
                City = "New Delhi",
                State = "Delhi",
                Gstin = "07AABCA1234F1Z1",
                Remarks = "Authorized Uniform supplier",
                CreatedBy = 1,
                IsActive = true
            };

            var supBooks = new ItemSupplier
            {
                BranchId = branchId,
                SupplierName = "National Book House & Stationery Co.",
                ContactPerson = "Anita Singhania",
                Phone = "+91 98223 45678",
                Email = "orders@nationalbooks.com",
                Address = "12, Educational Book Market, Daryaganj",
                City = "New Delhi",
                State = "Delhi",
                Gstin = "07AABCN5678M1Z4",
                Remarks = "Textbooks & bulk notebooks vendor",
                CreatedBy = 1,
                IsActive = true
            };

            var supSports = new ItemSupplier
            {
                BranchId = branchId,
                SupplierName = "Champion Sports & Fitness Goods",
                ContactPerson = "Harpreet Singh",
                Phone = "+91 98334 56789",
                Email = "info@championsports.in",
                Address = "Sports Complex Road",
                City = "Jalandhar",
                State = "Punjab",
                Gstin = "03AABCJ9012K1Z8",
                Remarks = "Official sports equipment provider",
                CreatedBy = 1,
                IsActive = true
            };

            context.ItemSuppliers.AddRange(supUniform, supBooks, supSports);
            await context.SaveChangesAsync();

            // 3. Items Master
            var itemsList = new List<InventoryItem>
            {
                new InventoryItem { BranchId = branchId, CategoryId = catUniform.Id, ItemCode = "UNIF-0001", ItemName = "School Summer Uniform Set (Boys - Size 30)", Unit = "Set", UnitPrice = 650, SellingPrice = 850, OpeningStock = 50, CurrentStock = 50, ReorderLevel = 10, RackNumber = "Rack U-1", Description = "Shirt + Trouser + Socks", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catUniform.Id, ItemCode = "UNIF-0002", ItemName = "School Summer Uniform Set (Girls - Size 30)", Unit = "Set", UnitPrice = 680, SellingPrice = 890, OpeningStock = 45, CurrentStock = 45, ReorderLevel = 10, RackNumber = "Rack U-2", Description = "Shirt + Skirt + Socks", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catUniform.Id, ItemCode = "UNIF-0003", ItemName = "Winter School Blazer (Navy Blue - Size 32)", Unit = "Pcs", UnitPrice = 1200, SellingPrice = 1550, OpeningStock = 30, CurrentStock = 30, ReorderLevel = 8, RackNumber = "Rack U-3", Description = "Pure wool blazer with embroidered school crest", CreatedBy = 1, IsActive = true },

                new InventoryItem { BranchId = branchId, CategoryId = catBooks.Id, ItemCode = "BOOK-0001", ItemName = "NCERT Mathematics Class 10th (Latest Edition)", Unit = "Pcs", UnitPrice = 180, SellingPrice = 210, OpeningStock = 100, CurrentStock = 100, ReorderLevel = 15, RackNumber = "Shelf B-1", Description = "Standard CBSE Board textbook", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catBooks.Id, ItemCode = "BOOK-0002", ItemName = "NCERT Science & Technology Class 10th", Unit = "Pcs", UnitPrice = 210, SellingPrice = 240, OpeningStock = 90, CurrentStock = 90, ReorderLevel = 15, RackNumber = "Shelf B-2", Description = "Physics, Chemistry & Biology textbook", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catBooks.Id, ItemCode = "BOOK-0003", ItemName = "English First Flight Class 10th", Unit = "Pcs", UnitPrice = 140, SellingPrice = 165, OpeningStock = 80, CurrentStock = 80, ReorderLevel = 15, RackNumber = "Shelf B-3", Description = "CBSE English literature reader", CreatedBy = 1, IsActive = true },

                new InventoryItem { BranchId = branchId, CategoryId = catStationery.Id, ItemCode = "STAT-0001", ItemName = "School Ruled Notebook (180 Pages - Hardcover)", Unit = "Pcs", UnitPrice = 45, SellingPrice = 65, OpeningStock = 350, CurrentStock = 350, ReorderLevel = 50, RackNumber = "Rack S-1", Description = "High quality 70 GSM paper single ruled", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catStationery.Id, ItemCode = "STAT-0002", ItemName = "Drawing Book & Sketch Pad (A3 Size)", Unit = "Pcs", UnitPrice = 60, SellingPrice = 85, OpeningStock = 120, CurrentStock = 120, ReorderLevel = 20, RackNumber = "Rack S-2", Description = "Cartridge paper drawing book for art classes", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catStationery.Id, ItemCode = "STAT-0003", ItemName = "Student Geometry & Compass Box Set", Unit = "Box", UnitPrice = 85, SellingPrice = 120, OpeningStock = 75, CurrentStock = 75, ReorderLevel = 15, RackNumber = "Rack S-3", Description = "Metal geometry kit with dividers and protractor", CreatedBy = 1, IsActive = true },

                new InventoryItem { BranchId = branchId, CategoryId = catAccessories.Id, ItemCode = "ACC-0001", ItemName = "School Belt & Student ID Card Lanyard Set", Unit = "Set", UnitPrice = 95, SellingPrice = 150, OpeningStock = 200, CurrentStock = 200, ReorderLevel = 30, RackNumber = "Shelf A-1", Description = "Adjustable woven belt and PVC card holder", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catAccessories.Id, ItemCode = "ACC-0002", ItemName = "School House Tie & Enamel Crest Badge", Unit = "Set", UnitPrice = 80, SellingPrice = 120, OpeningStock = 180, CurrentStock = 180, ReorderLevel = 25, RackNumber = "Shelf A-2", Description = "House color satin tie with metal pin badge", CreatedBy = 1, IsActive = true },

                new InventoryItem { BranchId = branchId, CategoryId = catSports.Id, ItemCode = "SPORT-0001", ItemName = "Football (Size 5 - FIFA Match Quality)", Unit = "Pcs", UnitPrice = 450, SellingPrice = 650, OpeningStock = 15, CurrentStock = 15, ReorderLevel = 5, RackNumber = "Sports Room", Description = "Hand-stitched PU football for tournament", CreatedBy = 1, IsActive = true },
                new InventoryItem { BranchId = branchId, CategoryId = catSports.Id, ItemCode = "SPORT-0002", ItemName = "Cricket Bat (Kashmir Willow - Full Size)", Unit = "Pcs", UnitPrice = 950, SellingPrice = 1350, OpeningStock = 12, CurrentStock = 12, ReorderLevel = 4, RackNumber = "Sports Room", Description = "Club level Kashmir willow bat", CreatedBy = 1, IsActive = true },

                new InventoryItem { BranchId = branchId, CategoryId = catLab.Id, ItemCode = "LAB-0001", ItemName = "Student Chemistry & Biology Lab Coat (White - M)", Unit = "Pcs", UnitPrice = 320, SellingPrice = 450, OpeningStock = 40, CurrentStock = 40, ReorderLevel = 10, RackNumber = "Lab Store", Description = "100% cotton protective lab coat", CreatedBy = 1, IsActive = true },
            };

            context.InventoryItems.AddRange(itemsList);
            await context.SaveChangesAsync();

            // Record Opening Stock movement logs
            foreach (var itm in itemsList)
            {
                context.InventoryStockLogs.Add(new InventoryStockLog
                {
                    BranchId = branchId,
                    ItemId = itm.Id,
                    TransactionType = "OPENING",
                    ReferenceNumber = "OP-STOCK",
                    Quantity = itm.OpeningStock,
                    BalanceAfter = itm.OpeningStock,
                    TransactionDate = DateTime.UtcNow.AddDays(-15),
                    Remarks = "Initial Opening Stock",
                    CreatedBy = 1,
                    IsActive = true
                });
            }
            await context.SaveChangesAsync();

            // 4. Record a Supplier Purchase Inward
            var purItems = new List<InventoryPurchaseItem>
            {
                new InventoryPurchaseItem { ItemId = itemsList[0].Id, Quantity = 20, UnitCost = 650, TotalCost = 13000, BatchNo = "BATCH-2026-A", CreatedBy = 1, IsActive = true },
                new InventoryPurchaseItem { ItemId = itemsList[3].Id, Quantity = 25, UnitCost = 180, TotalCost = 4500, BatchNo = "ED-2026-NCERT", CreatedBy = 1, IsActive = true },
                new InventoryPurchaseItem { ItemId = itemsList[6].Id, Quantity = 50, UnitCost = 45, TotalCost = 2250, BatchNo = "NB-180P-A", CreatedBy = 1, IsActive = true },
            };

            var purchase = new InventoryPurchase
            {
                BranchId = branchId,
                SupplierId = supUniform.Id,
                PurchaseNumber = "PUR-2026-0001",
                InvoiceNumber = "INV-APEX-9842",
                PurchaseDate = DateTime.UtcNow.AddDays(-5),
                TotalAmount = 19750,
                PaymentMode = "Bank Transfer",
                PaymentStatus = "Paid",
                Remarks = "Bulk supply for new academic session",
                PurchaseItems = purItems,
                CreatedBy = 1,
                IsActive = true
            };

            context.InventoryPurchases.Add(purchase);
            await context.SaveChangesAsync();

            // Update item stock & logs for purchase
            foreach (var pi in purItems)
            {
                var itm = itemsList.First(i => i.Id == pi.ItemId);
                itm.CurrentStock += pi.Quantity;

                context.InventoryStockLogs.Add(new InventoryStockLog
                {
                    BranchId = branchId,
                    ItemId = itm.Id,
                    TransactionType = "PURCHASE",
                    ReferenceNumber = "PUR-2026-0001",
                    Quantity = pi.Quantity,
                    BalanceAfter = itm.CurrentStock,
                    TransactionDate = DateTime.UtcNow.AddDays(-5),
                    Remarks = "Inward Purchase from Apex Uniforms (Inv: INV-APEX-9842)",
                    CreatedBy = 1,
                    IsActive = true
                });
            }
            await context.SaveChangesAsync();

            // 5. Sell / Issue Items to a Student
            var student = await context.Students.FirstOrDefaultAsync(s => s.BranchId == branchId && s.IsActive);
            var studentName = student != null
                ? $"{student.FirstName} {student.LastName} (Adm No: {student.AdmissionNo})"
                : "Aarav Sharma (Adm No: ADM/2026/0001)";

            var issueItems = new List<InventoryIssueItem>
            {
                new InventoryIssueItem { ItemId = itemsList[0].Id, Quantity = 1, ReturnedQuantity = 0, IsReturned = false, Remarks = "Summer Uniform Set", CreatedBy = 1, IsActive = true },
                new InventoryIssueItem { ItemId = itemsList[3].Id, Quantity = 1, ReturnedQuantity = 0, IsReturned = false, Remarks = "NCERT Math Class 10", CreatedBy = 1, IsActive = true },
                new InventoryIssueItem { ItemId = itemsList[4].Id, Quantity = 1, ReturnedQuantity = 0, IsReturned = false, Remarks = "NCERT Science Class 10", CreatedBy = 1, IsActive = true },
                new InventoryIssueItem { ItemId = itemsList[6].Id, Quantity = 4, ReturnedQuantity = 0, IsReturned = false, Remarks = "Ruled Notebooks (Set of 4)", CreatedBy = 1, IsActive = true },
                new InventoryIssueItem { ItemId = itemsList[9].Id, Quantity = 1, ReturnedQuantity = 0, IsReturned = false, Remarks = "School Belt & ID Lanyard", CreatedBy = 1, IsActive = true },
            };

            var studentIssue = new InventoryIssue
            {
                BranchId = branchId,
                IssueNumber = "ISS-2026-0001",
                IssueDate = DateTime.UtcNow.AddDays(-1),
                IssuedToType = "Student",
                IssuedToId = student?.Id,
                IssuedToName = studentName,
                Department = "Class 10-A",
                IsReturnable = false,
                Status = "Issued",
                Remarks = "Course Kit & Uniform Package Issued to Student at Admission",
                IssueItems = issueItems,
                CreatedBy = 1,
                IsActive = true
            };

            context.InventoryIssues.Add(studentIssue);
            await context.SaveChangesAsync();

            // Deduct stock for issued items & create logs
            foreach (var ii in issueItems)
            {
                var itm = itemsList.First(i => i.Id == ii.ItemId);
                itm.CurrentStock -= ii.Quantity;

                context.InventoryStockLogs.Add(new InventoryStockLog
                {
                    BranchId = branchId,
                    ItemId = itm.Id,
                    TransactionType = "ISSUE",
                    ReferenceNumber = "ISS-2026-0001",
                    Quantity = -ii.Quantity,
                    BalanceAfter = itm.CurrentStock,
                    TransactionDate = DateTime.UtcNow.AddDays(-1),
                    Remarks = $"Sold/Issued to student {studentName}",
                    CreatedBy = 1,
                    IsActive = true
                });
            }
            await context.SaveChangesAsync();
        }
    }
}
