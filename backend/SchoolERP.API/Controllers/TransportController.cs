using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Domain.Entities;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.Application.Common.Interfaces;
using System.Threading.Tasks;
using System.Linq;

namespace SchoolERP.API.Controllers
{
    [Route("api/transport")]
    [ApiController]
    [Authorize]
    public class TransportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public TransportController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles()
        {
            var vehicles = await _context.Vehicles
                .Include(v => v.Driver).Where(v => v.BranchId == _currentUserService.BranchId && v.IsActive)
                .Select(v => new { id = v.Id, registrationNo = v.RegistrationNo, vehicleType = v.VehicleType, capacity = v.Capacity, status = v.Status, driverId = v.DriverId, driver = v.Driver != null ? new { firstName = v.Driver.FirstName, lastName = v.Driver.LastName } : null }).ToListAsync(); return Ok(new { success = true, data = vehicles });
        }

        [HttpPost("vehicles")]
        public async Task<IActionResult> SaveVehicle([FromBody] Vehicle vehicle)
        {
            if (vehicle.Id == 0)
            {
                vehicle.BranchId = _currentUserService.BranchId;
                vehicle.IsActive = true;
                vehicle.CreatedBy = _currentUserService.UserId ?? 0;
                vehicle.CreatedOn = System.DateTime.UtcNow;
                _context.Vehicles.Add(vehicle);
            }
            else
            {
                var existing = await _context.Vehicles.FindAsync(vehicle.Id);
                if (existing == null) return NotFound();
                existing.RegistrationNo = vehicle.RegistrationNo;
                existing.VehicleType = vehicle.VehicleType;
                existing.Capacity = vehicle.Capacity;
                existing.DriverName = vehicle.DriverName;
                existing.DriverPhone = vehicle.DriverPhone;
                existing.DriverId = vehicle.DriverId;
                existing.Status = vehicle.Status;
                existing.ModifiedBy = _currentUserService.UserId ?? 0;
                existing.ModifiedOn = System.DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("vehicles/{id}")]
        public async Task<IActionResult> DeleteVehicle(long id)
        {
            var vehicle = await _context.Vehicles.FindAsync(id);
            if (vehicle != null)
            {
                vehicle.IsActive = false;
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true });
        }

        [HttpGet("routes")]
        public async Task<IActionResult> GetRoutes()
        {
            var routes = await _context.TransportRoutes
                .Include(r => r.Vehicle)
                .Include(r => r.Stops)
                .Where(r => r.BranchId == _currentUserService.BranchId && r.IsActive)
                .ToListAsync();
            return Ok(new { success = true, data = routes });
        }

        [HttpPost("routes")]
        public async Task<IActionResult> SaveRoute([FromBody] TransportRoute route)
        {
            if (route.Id == 0)
            {
                route.BranchId = _currentUserService.BranchId;
                route.IsActive = true;
                route.CreatedBy = _currentUserService.UserId ?? 0;
                route.CreatedOn = System.DateTime.UtcNow;

                if (route.Stops != null)
                {
                    foreach (var stop in route.Stops)
                    {
                        stop.IsActive = true;
                        stop.CreatedOn = System.DateTime.UtcNow;
                        stop.CreatedBy = _currentUserService.UserId ?? 0;
                    }
                }

                _context.TransportRoutes.Add(route);
            }
            else
            {
                // Simple update logic (for brevity, ignoring complex stop updates)
                var existing = await _context.TransportRoutes
                    .Include(r => r.Stops)
                    .FirstOrDefaultAsync(r => r.Id == route.Id);

                if (existing == null) return NotFound();
                existing.RouteName = route.RouteName;
                existing.Description = route.Description;
                existing.VehicleId = route.VehicleId;
                existing.ModifiedBy = _currentUserService.UserId ?? 0;
                existing.ModifiedOn = System.DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("routes/{id}")]
        public async Task<IActionResult> DeleteRoute(long id)
        {
            var route = await _context.TransportRoutes.FindAsync(id);
            if (route != null)
            {
                route.IsActive = false;
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true });
        }

        [HttpGet("drivers")]
        public async Task<IActionResult> GetDrivers()
        {
            var branchId = _currentUserService.BranchId;
            var drivers = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Where(e => e.BranchId == branchId && e.IsActive)
                .Where(e => 
                    (e.Designation != null && e.Designation.Name.Contains("Driver")) || 
                    (e.Department != null && e.Department.Name.Contains("Driver")) ||
                    _context.Users.Any(u => u.LinkedEntityId == e.Id && u.Role.Name == "Driver")
                )
                .Select(e => new {
                    id = e.Id,
                    fullName = e.FirstName + " " + e.LastName,
                    employeeCode = e.EmployeeCode
                })
                .ToListAsync();
                
            return Ok(new { success = true, data = drivers });
        }

        [HttpGet("allocations")]
        public async Task<IActionResult> GetAllocations()
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
                    className = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) != null ? a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).Class.Name : "",
                    sectionName = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) != null ? a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).Section.Name : "",
                    classId = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) != null ? a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).ClassId : 0,
                    sectionId = a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId) != null ? a.Student.Enrollments.FirstOrDefault(e => e.AcademicYearId == yearId).SectionId : 0,
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
            
            var oldStatus = allocation.Status;
            allocation.Status = allocation.Status == "Active" ? "Inactive" : "Active";

            // Record history
            var user = await _context.Users.FindAsync(_currentUserService.UserId ?? 0);
            var audit = new AuditLog
            {
                UserId = _currentUserService.UserId,
                Username = user?.FullName ?? user?.Username ?? "System",
                Action = "ToggleStatus",
                Module = "Transport",
                EntityName = "TransportAllocation",
                RecordId = id.ToString(),
                OldValues = oldStatus,
                NewValues = allocation.Status,
                BranchId = _currentUserService.BranchId,
                CreatedOn = System.DateTime.UtcNow,
                CreatedBy = _currentUserService.UserId ?? 0,
                IsActive = true
            };
            _context.AuditLogs.Add(audit);

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("allocations/{id}/history")]
        public async Task<IActionResult> GetAllocationHistory(long id)
        {
            var history = await _context.AuditLogs
                .Where(a => a.EntityName == "TransportAllocation" && a.RecordId == id.ToString())
                .OrderByDescending(a => a.CreatedOn)
                .Select(a => new {
                    id = a.Id,
                    action = a.Action,
                    oldStatus = a.OldValues,
                    newStatus = a.NewValues,
                    changedOn = a.CreatedOn,
                    changedBy = a.Username
                })
                .ToListAsync();
                
            return Ok(new { success = true, data = history });
        }
        
        [HttpGet("allocations/{id}/fees")]
        public async Task<IActionResult> GetAllocationFees(long id)
        {
            var allocation = await _context.TransportAllocations.FindAsync(id);
            if (allocation == null) return NotFound();
            
            var fees = await _context.Set<StudentFeeDue>()
                .Include(f => f.Installment)
                .Include(f => f.FeeHead)
                .Where(f => f.StudentId == allocation.StudentId 
                         && f.AcademicYearId == allocation.AcademicYearId 
                         && f.IsActive 
                         && f.FeeHead != null && f.FeeHead.Name.Contains("Transport"))
                .OrderBy(f => f.Installment != null ? f.Installment.DisplayOrder : 0)
                .Select(f => new {
                    id = f.Id,
                    month = f.Installment != null ? f.Installment.Name : "Unknown",
                    dueDate = f.Installment != null ? f.Installment.DueDate : System.DateTime.MinValue,
                    amount = f.OriginalAmount - f.ConcessionAmount,
                    paidAmount = f.PaidAmount,
                    balanceAmount = f.BalanceAmount,
                    status = f.Status.ToString()
                })
                .ToListAsync();
                
            return Ok(new { success = true, data = fees });
        }
            
         
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
        
        [HttpPost("allocations")]
        public async Task<IActionResult> SaveAllocation([FromBody] TransportAllocation allocation)
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
                existing.ModifiedOn = System.DateTime.UtcNow; } await _context.SaveChangesAsync(); return Ok(new { success = true });
        }

        [HttpDelete("allocations/{id}")]
        public async Task<IActionResult> DeleteAllocation(long id)
        {
            var allocation = await _context.TransportAllocations.FindAsync(id);
            if (allocation != null)
            {
                allocation.IsActive = false;
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true });
        }
    }
}
















