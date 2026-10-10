const fs = require('fs');
let code = fs.readFileSync('D:/erp/backend/SchoolERP.API/Controllers/TransportController.cs', 'utf8');

const regex = /public async Task<IActionResult> SaveAllocation\(\[FromBody\] TransportAllocation allocation\)\s*\{\s*if \(allocation.Id == 0\)\s*\{/;

const replacement = `public async Task<IActionResult> SaveAllocation([FromBody] TransportAllocation allocation)
        {
            if (allocation.Id == 0)
            {
                var existingAlloc = await _context.TransportAllocations
                    .FirstOrDefaultAsync(a => a.StudentId == allocation.StudentId && a.AcademicYearId == _currentUserService.AcademicYearId && a.IsActive);
                
                if (existingAlloc != null)
                {
                    existingAlloc.RouteStopId = allocation.RouteStopId;
                    existingAlloc.StartDate = allocation.StartDate;
                    existingAlloc.Status = allocation.Status;
                    existingAlloc.ModifiedBy = _currentUserService.UserId ?? 0;
                    existingAlloc.ModifiedOn = System.DateTime.UtcNow;
                }
                else
                {
                    allocation.BranchId = _currentUserService.BranchId;
                    allocation.AcademicYearId = _currentUserService.AcademicYearId;
                    allocation.IsActive = true;
                    allocation.CreatedBy = _currentUserService.UserId ?? 0;
                    allocation.CreatedOn = System.DateTime.UtcNow;
                    _context.TransportAllocations.Add(allocation);
                }
            }`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  
  // also add a temporary endpoint to delete duplicates
  const deleteEndpoint = `
        [HttpGet("allocations/clean-duplicates")]
        public async Task<IActionResult> CleanDuplicates()
        {
            var duplicates = await _context.TransportAllocations
                .GroupBy(a => new { a.StudentId, a.AcademicYearId })
                .Where(g => g.Count() > 1)
                .ToListAsync();

            int deletedCount = 0;
            foreach (var group in duplicates)
            {
                var toDelete = group.OrderByDescending(a => a.Id).Skip(1).ToList();
                _context.TransportAllocations.RemoveRange(toDelete);
                deletedCount += toDelete.Count;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true, deleted = deletedCount });
        }
        
        [HttpPost("allocations")]`;
        
  code = code.replace('[HttpPost("allocations")]', deleteEndpoint);
  fs.writeFileSync('D:/erp/backend/SchoolERP.API/Controllers/TransportController.cs', code);
  console.log("Successfully patched!");
} else {
  console.log("Regex not found!");
}
