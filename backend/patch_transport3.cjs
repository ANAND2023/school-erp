const fs = require('fs');
let code = fs.readFileSync('D:/erp/backend/SchoolERP.API/Controllers/TransportController.cs', 'utf8');

const regex = /public async Task<IActionResult> SaveAllocation\(\[FromBody\] TransportAllocation allocation\)[\s\S]*?return Ok\(new \{ success = true \}\);\s*\}/;

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
            }
            else
            {
                var existing = await _context.TransportAllocations.FindAsync(allocation.Id);
                if (existing == null) return NotFound();
                existing.StudentId = allocation.StudentId;
                existing.RouteStopId = allocation.RouteStopId;
                existing.StartDate = allocation.StartDate;
                existing.Status = allocation.Status;
                existing.ModifiedBy = _currentUserService.UserId ?? 0;
                existing.ModifiedOn = System.DateTime.UtcNow;
            }
            return Ok(new { success = true });
        }`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('D:/erp/backend/SchoolERP.API/Controllers/TransportController.cs', code);
  console.log("Successfully patched TransportController.cs!");
} else {
  console.log("Regex not found!");
}
