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
    }
}
