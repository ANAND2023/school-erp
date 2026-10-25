using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Application.Common.Interfaces;
using SchoolERP.Application.DTOs;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;

namespace SchoolERP.Infrastructure.Services
{
    public class NumberingSeriesService : INumberingSeriesService
    {
        private readonly ApplicationDbContext _context;

        public NumberingSeriesService(ApplicationDbContext context)
        {
            _context = context;
        }

        private static readonly List<(string ModuleType, string Title, string DefaultPrefix, bool IncludeBranch, bool IncludeAY, string YearFormat, string Separator, int Digits, long StartNum)> DefaultConfigs = new()
        {
            ("Admission", "Student Admission No", "ADM", false, true, "YYYYYY", "/", 4, 1),
            ("FeeReceipt", "Fee Payment Receipt No", "RCP", false, true, "YYYYYY", "/", 6, 1),
            ("Enquiry", "Student Enquiry No", "ENQ", false, true, "YYYYYY", "/", 4, 1),
            ("TransferCertificate", "Transfer Certificate (TC) No", "TC", false, true, "YYYY-YY", "/", 4, 1),
            ("Staff", "Staff / Employee Code", "EMP", false, false, "None", "/", 4, 1)
        };

        public async Task<List<NumberingSeriesDto>> GetSeriesListAsync(long branchId)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var branchCode = branch?.Code ?? string.Empty;

            var currentAY = await _context.AcademicYears
                .Where(ay => ay.BranchId == branchId && ay.IsCurrent)
                .FirstOrDefaultAsync();
            var ayName = currentAY?.Name ?? DateTime.UtcNow.Year + "-" + (DateTime.UtcNow.Year + 1).ToString().Substring(2);

            var dbSeries = await _context.NumberingSeries
                .Where(ns => ns.BranchId == branchId && ns.IsActive)
                .ToListAsync();

            var result = new List<NumberingSeriesDto>();
            var needsDbSave = false;

            foreach (var def in DefaultConfigs)
            {
                var existing = dbSeries.FirstOrDefault(s => s.ModuleType == def.ModuleType);
                if (existing != null)
                {
                    if (existing.IncludeBranchCode)
                    {
                        existing.IncludeBranchCode = false;
                        needsDbSave = true;
                    }
                    if (existing.ModuleType == "Admission" && string.IsNullOrWhiteSpace(existing.Prefix))
                    {
                        existing.Prefix = "ADM";
                        needsDbSave = true;
                    }

                    var dto = new NumberingSeriesDto
                    {
                        Id = existing.Id,
                        BranchId = branchId,
                        ModuleType = existing.ModuleType,
                        Title = def.Title,
                        Prefix = existing.Prefix,
                        IncludeBranchCode = existing.IncludeBranchCode,
                        IncludeAcademicYear = existing.IncludeAcademicYear,
                        YearFormat = existing.YearFormat,
                        Separator = existing.Separator,
                        Digits = existing.Digits,
                        StartNumber = existing.StartNumber,
                        CurrentSequence = existing.CurrentSequence,
                        Suffix = existing.Suffix
                    };
                    dto.SamplePreview = FormatNumber(dto, branchCode, ayName, Math.Max(dto.StartNumber, dto.CurrentSequence + 1));
                    result.Add(dto);
                }
                else
                {
                    var dto = new NumberingSeriesDto
                    {
                        Id = 0,
                        BranchId = branchId,
                        ModuleType = def.ModuleType,
                        Title = def.Title,
                        Prefix = def.DefaultPrefix,
                        IncludeBranchCode = def.IncludeBranch,
                        IncludeAcademicYear = def.IncludeAY,
                        YearFormat = def.YearFormat,
                        Separator = def.Separator,
                        Digits = def.Digits,
                        StartNumber = def.StartNum,
                        CurrentSequence = 0,
                        Suffix = null
                    };
                    dto.SamplePreview = FormatNumber(dto, branchCode, ayName, dto.StartNumber);
                    result.Add(dto);
                }
            }

            if (needsDbSave)
            {
                await _context.SaveChangesAsync();
            }

            return result;
        }

        public async Task<bool> SaveSeriesListAsync(long branchId, List<SaveNumberingSeriesRequest> requests)
        {
            var dbSeries = await _context.NumberingSeries
                .Where(ns => ns.BranchId == branchId && ns.IsActive)
                .ToListAsync();

            foreach (var req in requests)
            {
                var existing = dbSeries.FirstOrDefault(s => s.ModuleType == req.ModuleType);
                if (existing != null)
                {
                    existing.Prefix = req.Prefix?.Trim() ?? string.Empty;
                    existing.IncludeBranchCode = req.IncludeBranchCode;
                    existing.IncludeAcademicYear = req.IncludeAcademicYear;
                    existing.YearFormat = req.YearFormat ?? "YYYYYY";
                    existing.Separator = req.Separator ?? "/";
                    existing.Digits = req.Digits > 0 ? req.Digits : 4;
                    existing.StartNumber = req.StartNumber > 0 ? req.StartNumber : 1;
                    existing.Suffix = req.Suffix?.Trim();
                }
                else
                {
                    var newSeries = new NumberingSeries
                    {
                        BranchId = branchId,
                        ModuleType = req.ModuleType,
                        Prefix = req.Prefix?.Trim() ?? string.Empty,
                        IncludeBranchCode = req.IncludeBranchCode,
                        IncludeAcademicYear = req.IncludeAcademicYear,
                        YearFormat = req.YearFormat ?? "YYYYYY",
                        Separator = req.Separator ?? "/",
                        Digits = req.Digits > 0 ? req.Digits : 4,
                        StartNumber = req.StartNumber > 0 ? req.StartNumber : 1,
                        CurrentSequence = 0,
                        Suffix = req.Suffix?.Trim(),
                        IsActive = true
                    };
                    _context.NumberingSeries.Add(newSeries);
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<string> GetNextNumberAsync(long branchId, string moduleType, string? branchCode = null, string? academicYearName = null)
        {
            if (string.IsNullOrWhiteSpace(branchCode))
            {
                var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
                branchCode = branch?.Code ?? string.Empty;
            }

            if (string.IsNullOrWhiteSpace(academicYearName))
            {
                var currentAY = await _context.AcademicYears
                    .Where(ay => ay.BranchId == branchId && ay.IsCurrent)
                    .FirstOrDefaultAsync();
                academicYearName = currentAY?.Name ?? DateTime.UtcNow.Year.ToString();
            }

            var series = await _context.NumberingSeries
                .FirstOrDefaultAsync(ns => ns.BranchId == branchId && ns.ModuleType == moduleType && ns.IsActive);

            if (series == null)
            {
                // Auto-create default series if not yet saved in DB
                var def = DefaultConfigs.FirstOrDefault(d => d.ModuleType == moduleType);
                series = new NumberingSeries
                {
                    BranchId = branchId,
                    ModuleType = moduleType,
                    Prefix = def.DefaultPrefix ?? string.Empty,
                    IncludeBranchCode = def.IncludeBranch,
                    IncludeAcademicYear = def.IncludeAY,
                    YearFormat = def.YearFormat ?? "YYYYYY",
                    Separator = def.Separator ?? "/",
                    Digits = def.Digits > 0 ? def.Digits : 4,
                    StartNumber = def.StartNum > 0 ? def.StartNum : 1,
                    CurrentSequence = 0,
                    IsActive = true
                };
                _context.NumberingSeries.Add(series);
            }
            else
            {
                if (series.IncludeBranchCode)
                {
                    series.IncludeBranchCode = false;
                }
                if (series.ModuleType == "Admission" && string.IsNullOrWhiteSpace(series.Prefix))
                {
                    series.Prefix = "ADM";
                }
            }

            var nextSeq = Math.Max(series.StartNumber, series.CurrentSequence + 1);
            series.CurrentSequence = nextSeq;

            await _context.SaveChangesAsync();

            var dto = new NumberingSeriesDto
            {
                Prefix = series.Prefix,
                IncludeBranchCode = series.IncludeBranchCode,
                IncludeAcademicYear = series.IncludeAcademicYear,
                YearFormat = series.YearFormat,
                Separator = series.Separator,
                Digits = series.Digits,
                StartNumber = series.StartNumber,
                CurrentSequence = series.CurrentSequence,
                Suffix = series.Suffix
            };

            return FormatNumber(dto, branchCode, academicYearName, nextSeq);
        }

        public string FormatNumber(NumberingSeriesDto series, string branchCode, string academicYearName, long sequenceNumber)
        {
            var parts = new List<string>();

            // 1. Branch Code
            if (series.IncludeBranchCode && !string.IsNullOrWhiteSpace(branchCode))
            {
                parts.Add(branchCode.Trim());
            }

            // 2. Prefix
            if (!string.IsNullOrWhiteSpace(series.Prefix))
            {
                parts.Add(series.Prefix.Trim());
            }

            // 3. Academic Year
            if (series.IncludeAcademicYear && !string.IsNullOrWhiteSpace(academicYearName))
            {
                var cleanAy = academicYearName.Trim();
                if (series.YearFormat == "YYYY-YY")
                {
                    parts.Add(cleanAy);
                }
                else if (series.YearFormat == "YY-YY")
                {
                    // e.g. "2026-27" -> "26-27"
                    var split = cleanAy.Split('-');
                    var first = split[0].Length >= 2 ? split[0].Substring(split[0].Length - 2) : split[0];
                    var second = split.Length > 1 ? split[1] : "";
                    parts.Add($"{first}-{second}");
                }
                else if (series.YearFormat == "YYYY")
                {
                    var split = cleanAy.Split('-');
                    parts.Add(split[0]);
                }
                else if (series.YearFormat == "None")
                {
                    // Do not include
                }
                else
                {
                    // Default YYYYYY (e.g. "202627")
                    parts.Add(cleanAy.Replace("-", ""));
                }
            }

            // 4. Sequence number with zero padding
            var padDigits = series.Digits > 0 ? series.Digits : 4;
            parts.Add(sequenceNumber.ToString(new string('0', padDigits)));

            // 5. Suffix
            if (!string.IsNullOrWhiteSpace(series.Suffix))
            {
                parts.Add(series.Suffix.Trim());
            }

            var sep = series.Separator ?? "/";
            return string.Join(sep, parts);
        }
    }
}
