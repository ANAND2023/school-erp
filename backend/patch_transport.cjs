const fs = require('fs');
let code = fs.readFileSync('D:/erp/backend/SchoolERP.API/Controllers/TransportController.cs', 'utf8');

const regex = /public async Task<IActionResult> GetAllocations\(\)[\s\S]*?return Ok\(new \{ success = true, data = allocations \}\);\s*\}/;

const replacement = `public async Task<IActionResult> GetAllocations()
        {
            var yearId = _currentUserService.AcademicYearId;
            var allocations = await _context.TransportAllocations
                .Include(a => a.Student)
                    .ThenInclude(s => s.Enrollments).ThenInclude(e => e.Class)
                .Include(a => a.Student)
                    .ThenInclude(s => s.Enrollments).ThenInclude(e => e.Section)
                .Include(a => a.RouteStop)
                    .ThenInclude(rs => rs.Route)
                .Where(a => a.BranchId == _currentUserService.BranchId && a.AcademicYearId == yearId && a.IsActive)
                .Select(a => new {
                    id = a.Id,
                    studentId = a.StudentId,
                    studentName = a.Student.FirstName + " " + a.Student.LastName,
                    admissionNo = a.Student.AdmissionNo,
                    className = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).Class.Name,
                    sectionName = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).Section.Name,
                    classId = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).ClassId,
                    sectionId = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).SectionId,
                    routeId = a.RouteStop.RouteId,
                    routeName = a.RouteStop.Route.RouteName,
                    routeStopId = a.RouteStopId,
                    stopName = a.RouteStop.StopName,
                    monthlyFare = a.RouteStop.MonthlyFare,
                    startDate = a.StartDate,
                    status = a.Status
                })
                .ToListAsync();
            return Ok(new { success = true, data = allocations });
        }
        
        [HttpPut("allocations/{id}/toggle-status")]
        public async Task<IActionResult> ToggleAllocationStatus(long id)
        {
            var allocation = await _context.TransportAllocations.FindAsync(id);
            if (allocation == null) return NotFound();
            
            allocation.Status = allocation.Status == "Active" ? "Inactive" : "Active";
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('D:/erp/backend/SchoolERP.API/Controllers/TransportController.cs', code);
  console.log("Successfully patched!");
} else {
  console.log("Regex not found!");
}
