using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Domain.Entities;
using SchoolERP.Domain.Enums;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.API.Helpers
{
    public static class SchoolDefaultsHelper
    {
        // 1. Default Classes from Nursery, LKG, UKG to Class 10 (I to X)
        public static readonly (string Name, int Order)[] DefaultClasses = new[]
        {
            ("NUR", 1),
            ("LKG", 2),
            ("UKG", 3),
            ("I", 4),
            ("II", 5),
            ("III", 6),
            ("IV", 7),
            ("V", 8),
            ("VI", 9),
            ("VII", 10),
            ("VIII", 11),
            ("IX", 12),
            ("X", 13)
        };

        // 2. Default Sections: A and B
        public static readonly string[] DefaultSections = new[] { "A", "B" };

        // 3. Default Subjects
        public static readonly (string Name, string Code, SubjectType Type)[] DefaultSubjects = new[]
        {
            ("English", "ENG", SubjectType.Scholastic),
            ("Hindi", "HIN", SubjectType.Scholastic),
            ("Mathematics", "MATH", SubjectType.Scholastic),
            ("Science", "SCI", SubjectType.Scholastic),
            ("Social Studies", "SST", SubjectType.Scholastic),
            ("Computer Science", "CS", SubjectType.Scholastic),
            ("General Knowledge", "GK", SubjectType.Scholastic),
            ("Environmental Studies", "EVS", SubjectType.Scholastic),
            ("Physical Education", "PE", SubjectType.CoScholastic),
            ("Art & Craft", "ART", SubjectType.CoScholastic)
        };

        public static async Task SeedBranchDefaultsAsync(ApplicationDbContext context, long branchId, long? academicYearId = null)
        {
            if (branchId <= 0) return;

            // Seed Simple Masters (Categories, Religions, Houses, Document Types, Designations, Departments, Payment Modes, Banks)
            await SeedBranchSimpleMastersAsync(context, branchId);

            // Seed Numbering Series (without branch code MAIN)
            await SeedNumberingSeriesAsync(context, branchId);

            // Resolve AcademicYearId if not provided
            if (!academicYearId.HasValue || academicYearId.Value <= 0)
            {
                var currentAy = await context.AcademicYears
                    .FirstOrDefaultAsync(ay => ay.BranchId == branchId && ay.IsActive && ay.IsCurrent);
                academicYearId = currentAy?.Id;
            }

            // 1. Seed Classes & Sections
            var existingClasses = await context.Classes
                .Include(c => c.Sections)
                .Where(c => c.BranchId == branchId)
                .ToListAsync();

            var classMap = new Dictionary<string, ClassMaster>(StringComparer.OrdinalIgnoreCase);
            foreach (var cls in existingClasses)
            {
                classMap[cls.Name.Trim()] = cls;
            }

            foreach (var (className, order) in DefaultClasses)
            {
                // Check if class exists by exact name or alternate representation (e.g. "NUR" vs "Nursery")
                ClassMaster? cls = null;
                if (classMap.TryGetValue(className, out var directMatch))
                {
                    cls = directMatch;
                }
                else
                {
                    cls = existingClasses.FirstOrDefault(c =>
                        string.Equals(c.Name.Trim(), className, StringComparison.OrdinalIgnoreCase) ||
                        (className == "NUR" && string.Equals(c.Name.Trim(), "Nursery", StringComparison.OrdinalIgnoreCase)));
                }

                if (cls == null)
                {
                    cls = new ClassMaster
                    {
                        BranchId = branchId,
                        Name = className,
                        DisplayOrder = order,
                        IsActive = true
                    };
                    context.Classes.Add(cls);
                    await context.SaveChangesAsync();
                    classMap[className] = cls;
                }

                // Seed Default Sections: A and B
                foreach (var secName in DefaultSections)
                {
                    var hasSection = await context.Sections.AnyAsync(s =>
                        s.ClassId == cls.Id &&
                        s.BranchId == branchId &&
                        (s.Name.ToLower() == secName.ToLower() || s.Name.ToLower() == $"section {secName.ToLower()}"));

                    if (!hasSection)
                    {
                        context.Sections.Add(new Section
                        {
                            ClassId = cls.Id,
                            BranchId = branchId,
                            Name = secName,
                            Capacity = 40,
                            IsActive = true
                        });
                    }
                }
                await context.SaveChangesAsync();
            }

            // 2. Seed Subjects
            var existingSubjects = await context.Subjects
                .Where(s => s.BranchId == branchId)
                .ToListAsync();

            var subjectsList = new List<Subject>();
            foreach (var (subName, subCode, subType) in DefaultSubjects)
            {
                var existingSub = existingSubjects.FirstOrDefault(s =>
                    string.Equals(s.Code.Trim(), subCode, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(s.Name.Trim(), subName, StringComparison.OrdinalIgnoreCase));

                if (existingSub == null)
                {
                    var newSub = new Subject
                    {
                        BranchId = branchId,
                        Name = subName,
                        Code = subCode,
                        Type = subType,
                        IsActive = true
                    };
                    context.Subjects.Add(newSub);
                    subjectsList.Add(newSub);
                }
                else
                {
                    subjectsList.Add(existingSub);
                }
            }
            await context.SaveChangesAsync();

            // 3. Seed Class-Subject Mappings if Academic Year is present
            if (academicYearId.HasValue && academicYearId.Value > 0)
            {
                var ayId = academicYearId.Value;
                var allClasses = await context.Classes
                    .Where(c => c.BranchId == branchId && c.IsActive)
                    .ToListAsync();

                var existingMappings = await context.ClassSubjects
                    .Where(cs => cs.BranchId == branchId && cs.AcademicYearId == ayId)
                    .ToListAsync();

                foreach (var cls in allClasses)
                {
                    foreach (var sub in subjectsList)
                    {
                        var hasMapping = existingMappings.Any(m => m.ClassId == cls.Id && m.SubjectId == sub.Id);
                        if (!hasMapping)
                        {
                            context.ClassSubjects.Add(new ClassSubject
                            {
                                BranchId = branchId,
                                AcademicYearId = ayId,
                                ClassId = cls.Id,
                                SubjectId = sub.Id,
                                IsOptional = sub.Type == SubjectType.CoScholastic,
                                IsActive = true
                            });
                        }
                    }
                }
                await context.SaveChangesAsync();
            }
        }

        // 4. Comprehensive Default Simple Masters for every School / Branch
        public static readonly (MasterType Type, string Name, string Code, int Order)[] DefaultSimpleMasters = new[]
        {
            // Student Categories
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

            // Document Types (Comprehensive Student & School Required Documents)
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

            // Designations (Staff & Teachers)
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

            // Banks (Common Indian Banks)
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

        public static async Task SeedBranchSimpleMastersAsync(ApplicationDbContext context, long branchId)
        {
            if (branchId <= 0) return;

            var existing = await context.SimpleMasters
                .Where(m => m.BranchId == branchId)
                .Select(m => new { m.Type, m.Name, m.Code })
                .ToListAsync();

            var toAdd = new List<SimpleMaster>();
            foreach (var item in DefaultSimpleMasters)
            {
                var exists = existing.Any(e =>
                    e.Type == item.Type &&
                    (string.Equals(e.Name.Trim(), item.Name.Trim(), StringComparison.OrdinalIgnoreCase) ||
                     (!string.IsNullOrWhiteSpace(item.Code) && string.Equals(e.Code?.Trim(), item.Code.Trim(), StringComparison.OrdinalIgnoreCase))));

                if (!exists)
                {
                    toAdd.Add(new SimpleMaster
                    {
                        BranchId = branchId,
                        Type = item.Type,
                        Name = item.Name,
                        Code = item.Code,
                        DisplayOrder = item.Order,
                        IsActive = true
                    });
                }
            }

            if (toAdd.Count > 0)
            {
                context.SimpleMasters.AddRange(toAdd);
                await context.SaveChangesAsync();
            }
        }

        public static async Task SeedNumberingSeriesAsync(ApplicationDbContext context, long branchId)
        {
            if (branchId <= 0) return;

            var existingSeries = await context.NumberingSeries
                .Where(ns => ns.BranchId == branchId)
                .ToListAsync();

            var defaultConfigs = new (string ModuleType, string Prefix, bool IncludeBranch, bool IncludeAY, string YearFormat, string Separator, int Digits, long StartNum)[]
            {
                ("Admission", "", false, true, "YYYYYY", "/", 4, 1),
                ("FeeReceipt", "RCP", false, true, "YYYYYY", "/", 6, 1),
                ("Enquiry", "ENQ", false, true, "YYYYYY", "/", 4, 1),
                ("TransferCertificate", "TC", false, true, "YYYY-YY", "/", 4, 1),
                ("Staff", "EMP", false, false, "None", "/", 4, 1)
            };

            var toAdd = new List<NumberingSeries>();
            foreach (var def in defaultConfigs)
            {
                var ex = existingSeries.FirstOrDefault(s => s.ModuleType == def.ModuleType);
                if (ex == null)
                {
                    toAdd.Add(new NumberingSeries
                    {
                        BranchId = branchId,
                        ModuleType = def.ModuleType,
                        Prefix = def.Prefix,
                        IncludeBranchCode = def.IncludeBranch, // false
                        IncludeAcademicYear = def.IncludeAY,
                        YearFormat = def.YearFormat,
                        Separator = def.Separator,
                        Digits = def.Digits,
                        StartNumber = def.StartNum,
                        CurrentSequence = 0,
                        IsActive = true
                    });
                }
                else if (ex.IncludeBranchCode)
                {
                    // Remove MAIN branch code from existing series
                    ex.IncludeBranchCode = false;
                }
            }

            if (toAdd.Count > 0)
            {
                context.NumberingSeries.AddRange(toAdd);
            }
            await context.SaveChangesAsync();
        }
    }
}
