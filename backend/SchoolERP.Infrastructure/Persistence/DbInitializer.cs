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

            // Ensure portal login columns exist on schools table
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE schools ADD COLUMN allow_student_login TINYINT(1) NOT NULL DEFAULT 1;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE schools ADD COLUMN allow_parent_login TINYINT(1) NOT NULL DEFAULT 1;");
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

            // Ensure ID card template columns exist on schools and branches table
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE schools ADD COLUMN id_card_front LONGTEXT NULL;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE schools ADD COLUMN id_card_back LONGTEXT NULL;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE branches ADD COLUMN id_card_front LONGTEXT NULL;");
            }
            catch { }

            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE branches ADD COLUMN id_card_back LONGTEXT NULL;");
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

            // Seed / Ensure Comprehensive Simple Masters & Numbering Series for ALL Branches
            var allDbBranches = await context.Branches.ToListAsync();
            var defaultSimpleMastersList = new (MasterType Type, string Name, string Code, int Order)[]
            {
                // Categories
                (MasterType.Category, "General", "GEN", 1),
                (MasterType.Category, "OBC", "OBC", 2),
                (MasterType.Category, "SC", "SC", 3),
                (MasterType.Category, "ST", "ST", 4),
                (MasterType.Category, "EWS", "EWS", 5),
                (MasterType.Category, "Minority", "MIN", 6),
                (MasterType.Category, "Specially Abled (PWD)", "PWD", 7),
                (MasterType.Category, "BPL", "BPL", 8),
                (MasterType.Category, "Single Girl Child", "SGC", 9),
                (MasterType.Category, "Staff Ward", "SW", 10),

                // Religions
                (MasterType.Religion, "Hindu", "HIN", 1),
                (MasterType.Religion, "Muslim", "MUS", 2),
                (MasterType.Religion, "Sikh", "SIK", 3),
                (MasterType.Religion, "Christian", "CHR", 4),
                (MasterType.Religion, "Jain", "JAI", 5),
                (MasterType.Religion, "Buddhist", "BUD", 6),
                (MasterType.Religion, "Parsi / Zoroastrian", "PAR", 7),
                (MasterType.Religion, "Jewish", "JEW", 8),
                (MasterType.Religion, "Other", "OTH", 9),

                // School Houses
                (MasterType.House, "Red House (Mars)", "RED", 1),
                (MasterType.House, "Blue House (Neptune)", "BLUE", 2),
                (MasterType.House, "Green House (Earth)", "GREEN", 3),
                (MasterType.House, "Yellow House (Sun)", "YELLOW", 4),

                // Document Types
                (MasterType.DocumentType, "Birth Certificate", "BC", 1),
                (MasterType.DocumentType, "Student Aadhaar Card", "AADHAAR", 2),
                (MasterType.DocumentType, "Transfer Certificate (TC)", "TC", 3),
                (MasterType.DocumentType, "Previous Report Card / Marksheet", "RC", 4),
                (MasterType.DocumentType, "Migration Certificate", "MC", 5),
                (MasterType.DocumentType, "Character Certificate", "CC", 6),
                (MasterType.DocumentType, "Caste Certificate", "CAST", 7),
                (MasterType.DocumentType, "Income Certificate", "INC", 8),
                (MasterType.DocumentType, "Domicile / Address Proof", "DOM", 9),
                (MasterType.DocumentType, "Medical Fitness Certificate", "MED", 10),
                (MasterType.DocumentType, "Father Aadhaar Card", "F-AADHAAR", 11),
                (MasterType.DocumentType, "Mother Aadhaar Card", "M-AADHAAR", 12),
                (MasterType.DocumentType, "Student Passport Photo", "S-PHOTO", 13),
                (MasterType.DocumentType, "Parent / Guardian Photo", "P-PHOTO", 14),
                (MasterType.DocumentType, "Ration Card / BPL Card", "RAT", 15),
                (MasterType.DocumentType, "Disability Certificate", "PWD-CERT", 16),

                // Designations
                (MasterType.Designation, "Principal", "PRIN", 1),
                (MasterType.Designation, "Vice Principal", "VPRIN", 2),
                (MasterType.Designation, "Headmistress / Headmaster", "HM", 3),
                (MasterType.Designation, "Academic Coordinator", "COORD", 4),
                (MasterType.Designation, "PGT Teacher", "PGT", 5),
                (MasterType.Designation, "TGT Teacher", "TGT", 6),
                (MasterType.Designation, "PRT Teacher", "PRT", 7),
                (MasterType.Designation, "NTT / Pre-Primary Teacher", "NTT", 8),
                (MasterType.Designation, "Special Educator", "SPED", 9),
                (MasterType.Designation, "School Counselor", "CNSL", 10),
                (MasterType.Designation, "Librarian", "LIB", 11),
                (MasterType.Designation, "Accountant / Cashier", "ACCT", 12),
                (MasterType.Designation, "Admission Officer / Front Desk", "ADM-OFF", 13),
                (MasterType.Designation, "Office Administrator / Clerk", "ADMIN", 14),
                (MasterType.Designation, "IT Incharge / Computer Lab", "IT", 15),
                (MasterType.Designation, "Science Lab Assistant", "LAB-AST", 16),
                (MasterType.Designation, "Physical Education Teacher (PET)", "PET", 17),
                (MasterType.Designation, "Music / Dance Teacher", "MUD", 18),
                (MasterType.Designation, "Art & Craft Teacher", "ART", 19),
                (MasterType.Designation, "School Nurse", "NURSE", 20),
                (MasterType.Designation, "Transport Supervisor", "TRANS", 21),
                (MasterType.Designation, "Security Guard", "SEC", 22),
                (MasterType.Designation, "Peon / Office Attendant", "PEON", 23),
                (MasterType.Designation, "Driver", "DRV", 24),
                (MasterType.Designation, "Conductor", "COND", 25),
                (MasterType.Designation, "Housekeeping / Cleaner", "CLEAN", 26),

                // Departments
                (MasterType.Department, "Academic & Curriculum", "ACAD", 1),
                (MasterType.Department, "Administration & Operations", "ADMIN", 2),
                (MasterType.Department, "Accounts & Finance", "FIN", 3),
                (MasterType.Department, "Admissions & Front Desk", "ADMIS", 4),
                (MasterType.Department, "Pre-Primary / Kindergarten", "PRE-PRI", 5),
                (MasterType.Department, "Primary School", "PRIMARY", 6),
                (MasterType.Department, "Middle School", "MIDDLE", 7),
                (MasterType.Department, "Secondary & Senior Secondary", "SEC-SR", 8),
                (MasterType.Department, "Science & Laboratories", "SCI", 9),
                (MasterType.Department, "Mathematics", "MATH", 10),
                (MasterType.Department, "Languages & Literature", "LANG", 11),
                (MasterType.Department, "Social Sciences & Humanities", "SOC", 12),
                (MasterType.Department, "Computer Science & IT", "CS-IT", 13),
                (MasterType.Department, "Sports & Physical Education", "SPORTS", 14),
                (MasterType.Department, "Performing Arts & Culture", "ARTS", 15),
                (MasterType.Department, "Library & Documentation", "LIB", 16),
                (MasterType.Department, "Examination & Evaluation", "EXAM", 17),
                (MasterType.Department, "Transport & Logistics", "TRANS", 18),
                (MasterType.Department, "Security & Maintenance", "MAINT", 19),

                // Payment Modes
                (MasterType.PaymentMode, "Cash", "CASH", 1),
                (MasterType.PaymentMode, "UPI / QR Code", "UPI", 2),
                (MasterType.PaymentMode, "Bank Cheque", "CHQ", 3),
                (MasterType.PaymentMode, "Demand Draft (DD)", "DD", 4),
                (MasterType.PaymentMode, "Net Banking (NEFT/RTGS/IMPS)", "NET", 5),
                (MasterType.PaymentMode, "Debit Card", "DCARD", 6),
                (MasterType.PaymentMode, "Credit Card", "CCARD", 7),
                (MasterType.PaymentMode, "POS Machine", "POS", 8),
                (MasterType.PaymentMode, "Online Payment Gateway", "PG", 9),

                // Banks
                (MasterType.Bank, "State Bank of India", "SBI", 1),
                (MasterType.Bank, "Punjab National Bank", "PNB", 2),
                (MasterType.Bank, "Bank of Baroda", "BOB", 3),
                (MasterType.Bank, "Canara Bank", "CANARA", 4),
                (MasterType.Bank, "Union Bank of India", "UBI", 5),
                (MasterType.Bank, "HDFC Bank", "HDFC", 6),
                (MasterType.Bank, "ICICI Bank", "ICICI", 7),
                (MasterType.Bank, "Axis Bank", "AXIS", 8),
                (MasterType.Bank, "Kotak Mahindra Bank", "KOTAK", 9),
                (MasterType.Bank, "IndusInd Bank", "INDUS", 10),
                (MasterType.Bank, "Bank of India", "BOI", 11),
                (MasterType.Bank, "Central Bank of India", "CBI", 12),
                (MasterType.Bank, "Indian Bank", "INDBANK", 13),
                (MasterType.Bank, "IDBI Bank", "IDBI", 14),
                (MasterType.Bank, "Yes Bank", "YES", 15),
                (MasterType.Bank, "Federal Bank", "FED", 16),
                (MasterType.Bank, "UCO Bank", "UCO", 17),
                (MasterType.Bank, "Indian Overseas Bank", "IOB", 18)
            };

            foreach (var br in allDbBranches)
            {
                // 1. Ensure NumberingSeries without branch code MAIN
                var branchSeries = await context.NumberingSeries.Where(ns => ns.BranchId == br.Id).ToListAsync();
                foreach (var s in branchSeries)
                {
                    if (s.IncludeBranchCode)
                    {
                        s.IncludeBranchCode = false; // Remove MAIN from existing series
                    }
                    if (s.ModuleType == "Admission" && string.IsNullOrWhiteSpace(s.Prefix))
                    {
                        s.Prefix = "ADM";
                    }
                }

                var defaultSeriesConfigs = new (string ModuleType, string Prefix, bool IncludeBranch, bool IncludeAY, string YearFormat, string Separator, int Digits, long StartNum)[]
                {
                    ("Admission", "ADM", false, true, "YYYYYY", "/", 4, 1),
                    ("FeeReceipt", "RCP", false, true, "YYYYYY", "/", 6, 1),
                    ("Enquiry", "ENQ", false, true, "YYYYYY", "/", 4, 1),
                    ("TransferCertificate", "TC", false, true, "YYYY-YY", "/", 4, 1),
                    ("Staff", "EMP", false, false, "None", "/", 4, 1),
                    ("BonafideCertificate", "DPS/BC", false, true, "YYYY", "/", 4, 1),
                    ("BirthCertificate", "DPS/DOB", false, true, "YYYY", "/", 4, 1),
                    ("AgeCertificate", "DPS/AGE", false, true, "YYYY", "/", 4, 1),
                    ("CharacterCertificate", "DPS/CC", false, true, "YYYY", "/", 4, 1),
                    ("RetCertificate", "DPS/RET", false, true, "YYYY", "/", 4, 1),
                    ("GatePass", "GP", false, true, "YYYY", "/", 4, 1)
                };

                foreach (var def in defaultSeriesConfigs)
                {
                    if (!branchSeries.Any(s => s.ModuleType == def.ModuleType))
                    {
                        context.NumberingSeries.Add(new NumberingSeries
                        {
                            BranchId = br.Id,
                            ModuleType = def.ModuleType,
                            Prefix = def.Prefix,
                            IncludeBranchCode = false,
                            IncludeAcademicYear = def.IncludeAY,
                            YearFormat = def.YearFormat,
                            Separator = def.Separator,
                            Digits = def.Digits,
                            StartNumber = def.StartNum,
                            CurrentSequence = 0,
                            IsActive = true
                        });
                    }
                }

                // 2. Ensure SimpleMasters
                var existingMasters = await context.SimpleMasters
                    .Where(m => m.BranchId == br.Id)
                    .Select(m => new { m.Type, m.Name, m.Code })
                    .ToListAsync();

                foreach (var def in defaultSimpleMastersList)
                {
                    var exists = existingMasters.Any(e =>
                        e.Type == def.Type &&
                        (string.Equals(e.Name.Trim(), def.Name.Trim(), StringComparison.OrdinalIgnoreCase) ||
                         (!string.IsNullOrWhiteSpace(def.Code) && string.Equals(e.Code?.Trim(), def.Code.Trim(), StringComparison.OrdinalIgnoreCase))));

                    if (!exists)
                    {
                        context.SimpleMasters.Add(new SimpleMaster
                        {
                            BranchId = br.Id,
                            Type = def.Type,
                            Name = def.Name,
                            Code = def.Code,
                            DisplayOrder = def.Order,
                            IsActive = true
                        });
                    }
                }
            }
            await context.SaveChangesAsync();

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

            // Seed Multi-Term Exam & Report Card Data (3 Terms, 9 Subjects, 4 Class 6 Students)
            await SeedMultiTermReportCardDataAsync(context);
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

        public static async Task SeedMultiTermReportCardDataAsync(ApplicationDbContext context)
        {
            var branch = await context.Branches.FirstOrDefaultAsync(b => b.IsActive);
            var branchId = branch?.Id ?? 1;

            var academicYear = await context.AcademicYears.FirstOrDefaultAsync(y => y.IsCurrent && y.BranchId == branchId)
                               ?? await context.AcademicYears.FirstOrDefaultAsync(y => y.BranchId == branchId);
            var yearId = academicYear?.Id ?? 1;

            // 1. Grade Scale
            if (!await context.GradeScales.AnyAsync(g => g.BranchId == branchId || g.BranchId == 0))
            {
                var scales = new List<GradeScale>
                {
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "A+", MinPercentage = 90, MaxPercentage = 100, GradePoint = 10, Remarks = "Outstanding", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "A", MinPercentage = 80, MaxPercentage = 89.99m, GradePoint = 9, Remarks = "Excellent", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "A-", MinPercentage = 75, MaxPercentage = 79.99m, GradePoint = 8.5m, Remarks = "Very Good", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "B+", MinPercentage = 70, MaxPercentage = 74.99m, GradePoint = 8, Remarks = "Good", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "B", MinPercentage = 60, MaxPercentage = 69.99m, GradePoint = 7, Remarks = "Above Average", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "C+", MinPercentage = 50, MaxPercentage = 59.99m, GradePoint = 6, Remarks = "Average", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "C", MinPercentage = 40, MaxPercentage = 49.99m, GradePoint = 5, Remarks = "Fair", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "D", MinPercentage = 33, MaxPercentage = 39.99m, GradePoint = 4, Remarks = "Marginal Pass", CreatedBy = 1, IsActive = true },
                    new GradeScale { BranchId = branchId, Name = "CBSE Scale", Grade = "E", MinPercentage = 0, MaxPercentage = 32.99m, GradePoint = 0, Remarks = "Needs Improvement / Fail", CreatedBy = 1, IsActive = true },
                };
                context.GradeScales.AddRange(scales);
                await context.SaveChangesAsync();
            }

            // 2. Class 6 & Section A
            var class6 = await context.Classes.FirstOrDefaultAsync(c => c.BranchId == branchId && (c.Name.Contains("6") || c.Name.Contains("VI")));
            if (class6 == null)
            {
                class6 = new ClassMaster { BranchId = branchId, Name = "Class 6", DisplayOrder = 6, CreatedBy = 1, IsActive = true };
                context.Classes.Add(class6);
                await context.SaveChangesAsync();
            }

            var sectionA = await context.Sections.FirstOrDefaultAsync(s => s.ClassId == class6.Id && s.Name == "A");
            if (sectionA == null)
            {
                sectionA = new Section { BranchId = branchId, ClassId = class6.Id, Name = "A", Capacity = 40, CreatedBy = 1, IsActive = true };
                context.Sections.Add(sectionA);
                await context.SaveChangesAsync();
            }

            // 3. Ensure 9 Standard Subjects
            var subjectsInfo = new (string Name, string Code)[]
            {
                ("English", "ENG"),
                ("Hindi", "HIN"),
                ("Mathematics", "MATH"),
                ("Science", "SCI"),
                ("Social Science", "SST"),
                ("Computer", "COMP"),
                ("General Knowledge", "GK"),
                ("Art & Craft", "ART"),
                ("Physical Education", "PE")
            };

            var subjectsList = new List<Subject>();
            foreach (var s in subjectsInfo)
            {
                var subj = await context.Subjects.FirstOrDefaultAsync(sb => sb.BranchId == branchId && (sb.Name == s.Name || sb.Code == s.Code));
                if (subj == null)
                {
                    subj = new Subject { BranchId = branchId, Name = s.Name, Code = s.Code, Type = SubjectType.Scholastic, CreatedBy = 1, IsActive = true };
                    context.Subjects.Add(subj);
                    await context.SaveChangesAsync();
                }
                subjectsList.Add(subj);

                // Ensure class subject mapping
                if (!await context.ClassSubjects.AnyAsync(cs => cs.ClassId == class6.Id && cs.SubjectId == subj.Id))
                {
                    context.ClassSubjects.Add(new ClassSubject { BranchId = branchId, AcademicYearId = yearId, ClassId = class6.Id, SubjectId = subj.Id, IsOptional = false, CreatedBy = 1, IsActive = true });
                }
            }
            await context.SaveChangesAsync();

            // 6. Ensure 4 Real Students in Class 6 Section A with Guardians
            var allYears = await context.AcademicYears.Where(y => y.BranchId == branchId || y.BranchId == 0).ToListAsync();
            if (!allYears.Any()) allYears.Add(new AcademicYear { Id = yearId, BranchId = branchId, Name = "2024-25" });

            var studentsData = new[]
            {
                new {
                    AdmNo = "DPS/2024/0601", Roll = 6, First = "Rahul", Last = "Sharma", Dob = new DateTime(2013, 8, 15),
                    Father = "Mr. Rajesh Sharma", Mother = "Mrs. Neha Sharma", Phone = "9811234567",
                    T1Marks = new decimal[] { 78, 85, 72, 80, 76, 88, 85, 82, 90 },
                    T2Marks = new decimal[] { 82, 88, 76, 84, 80, 92, 88, 85, 92 },
                    T3Marks = new decimal[] { 86, 90, 82, 88, 85, 94, 92, 90, 95 },
                    Remarks = "Rahul is a bright and sincere student. He shows good performance in all subjects and participates actively in co-curricular activities. Keep up the good work!",
                    CoScholastics = new (string Act, string T1, string T2, string T3)[] {
                        ("Discipline", "A", "A", "A+"),
                        ("Work Education", "A", "A", "A"),
                        ("Art Education", "A-", "A", "A+"),
                        ("Health & Physical Education", "A", "A+", "A+"),
                        ("Moral & Values", "A", "A", "A+")
                    }
                },
                new {
                    AdmNo = "DPS/2024/0602", Roll = 12, First = "Priya", Last = "Singh", Dob = new DateTime(2013, 11, 20),
                    Father = "Mr. Alok Singh", Mother = "Mrs. Sunita Singh", Phone = "9822334455",
                    T1Marks = new decimal[] { 85, 90, 88, 92, 86, 94, 90, 88, 92 },
                    T2Marks = new decimal[] { 88, 92, 90, 94, 89, 96, 92, 90, 94 },
                    T3Marks = new decimal[] { 92, 95, 94, 96, 92, 98, 95, 92, 96 },
                    Remarks = "Outstanding performance throughout the academic year. Excellent analytical and communication skills. Keep it up!",
                    CoScholastics = new (string Act, string T1, string T2, string T3)[] {
                        ("Discipline", "A+", "A+", "A+"),
                        ("Work Education", "A", "A+", "A+"),
                        ("Art Education", "A+", "A+", "A+"),
                        ("Health & Physical Education", "A", "A+", "A+"),
                        ("Moral & Values", "A+", "A+", "A+")
                    }
                },
                new {
                    AdmNo = "DPS/2024/0603", Roll = 18, First = "Amit", Last = "Kumar", Dob = new DateTime(2013, 5, 10),
                    Father = "Mr. Suresh Kumar", Mother = "Mrs. Rekha Devi", Phone = "9833445566",
                    T1Marks = new decimal[] { 68, 75, 65, 70, 72, 80, 74, 78, 85 },
                    T2Marks = new decimal[] { 72, 78, 70, 75, 76, 84, 78, 80, 88 },
                    T3Marks = new decimal[] { 76, 82, 74, 78, 80, 88, 82, 84, 90 },
                    Remarks = "Amit has shown consistent and commendable improvement across all academic subjects. Hardworking student.",
                    CoScholastics = new (string Act, string T1, string T2, string T3)[] {
                        ("Discipline", "B+", "A", "A"),
                        ("Work Education", "B+", "A", "A"),
                        ("Art Education", "A", "A", "A"),
                        ("Health & Physical Education", "A", "A+", "A+"),
                        ("Moral & Values", "A", "A", "A")
                    }
                },
                new {
                    AdmNo = "DPS/2024/0604", Roll = 24, First = "Ananya", Last = "Verma", Dob = new DateTime(2013, 9, 28),
                    Father = "Mr. Deepak Verma", Mother = "Mrs. Pooja Verma", Phone = "9844556677",
                    T1Marks = new decimal[] { 82, 86, 78, 84, 82, 90, 86, 92, 88 },
                    T2Marks = new decimal[] { 85, 88, 82, 86, 85, 92, 88, 94, 90 },
                    T3Marks = new decimal[] { 88, 91, 86, 90, 88, 95, 90, 96, 92 },
                    Remarks = "Ananya is a creative and dedicated learner with exceptional talent in Art, Computing, and Language studies.",
                    CoScholastics = new (string Act, string T1, string T2, string T3)[] {
                        ("Discipline", "A", "A", "A+"),
                        ("Work Education", "A", "A", "A+"),
                        ("Art Education", "A+", "A+", "A+"),
                        ("Health & Physical Education", "A", "A", "A+"),
                        ("Moral & Values", "A", "A+", "A+")
                    }
                }
            };

            foreach (var stData in studentsData)
            {
                var st = await context.Students.Include(s => s.Guardians).Include(s => s.Enrollments)
                    .FirstOrDefaultAsync(s => s.BranchId == branchId && s.AdmissionNo == stData.AdmNo);

                if (st == null)
                {
                    st = new Student
                    {
                        BranchId = branchId,
                        AdmissionNo = stData.AdmNo,
                        FirstName = stData.First,
                        LastName = stData.Last,
                        DateOfBirth = stData.Dob,
                        Gender = "Male",
                        Status = StudentStatus.Active,
                        AdmissionDate = DateTime.UtcNow.AddYears(-1),
                        Address = "123 Green Park Colony, Sector 4",
                        City = "Noida",
                        State = "Uttar Pradesh",
                        Pincode = "201301",
                        CreatedBy = 1,
                        IsActive = true
                    };
                    context.Students.Add(st);
                    await context.SaveChangesAsync();

                    // Add Father & Mother Guardians
                    context.StudentGuardians.AddRange(
                        new StudentGuardian { StudentId = st.Id, Name = stData.Father, Relation = "Father", Mobile = stData.Phone, IsPrimary = true, CreatedBy = 1, IsActive = true },
                        new StudentGuardian { StudentId = st.Id, Name = stData.Mother, Relation = "Mother", Mobile = stData.Phone, IsPrimary = false, CreatedBy = 1, IsActive = true }
                    );
                    await context.SaveChangesAsync();
                }

                // Ensure Enrollment in Class 6 - Section A for all academic years
                foreach (var yr in allYears)
                {
                    var enr = await context.StudentEnrollments.FirstOrDefaultAsync(e => e.StudentId == st.Id && e.AcademicYearId == yr.Id);
                    if (enr == null)
                    {
                        enr = new StudentEnrollment
                        {
                            StudentId = st.Id,
                            AcademicYearId = yr.Id,
                            ClassId = class6.Id,
                            SectionId = sectionA.Id,
                            RollNo = stData.Roll,
                            Status = StudentStatus.Active,
                            CreatedBy = 1,
                            IsActive = true
                        };
                        context.StudentEnrollments.Add(enr);
                    }
                    else
                    {
                        enr.ClassId = class6.Id;
                        enr.SectionId = sectionA.Id;
                        enr.RollNo = stData.Roll;
                        enr.Status = StudentStatus.Active;
                    }
                }
                await context.SaveChangesAsync();
            }
        }
    }
}

