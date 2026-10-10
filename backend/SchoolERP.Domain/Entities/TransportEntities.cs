using System;
using System.Collections.Generic;
using SchoolERP.Domain.Common;
using System.Text.Json.Serialization;
using SchoolERP.Domain.Entities;

namespace SchoolERP.Domain.Entities
{
    public class Vehicle : BaseEntity
    {
        public long BranchId { get; set; }
        public string RegistrationNo { get; set; } = string.Empty;
        public string VehicleType { get; set; } = string.Empty; // Bus, Van, etc.
        public int Capacity { get; set; }
        public string? MakeAndModel { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public long? DriverId { get; set; }
        [JsonIgnore]
        public virtual Employee? Driver { get; set; }
        public string Status { get; set; } = "Active"; // Active, UnderMaintenance, Inactive
        
        [JsonIgnore]
        public virtual Branch? Branch { get; set; }
        [JsonIgnore]
        public virtual ICollection<TransportRoute> Routes { get; set; } = new List<TransportRoute>();
    }

    public class TransportRoute : BaseEntity
    {
        public long BranchId { get; set; }
        public string RouteName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public long? VehicleId { get; set; }
        
        [JsonIgnore]
        public virtual Branch? Branch { get; set; }
        public virtual Vehicle? Vehicle { get; set; }
        public virtual ICollection<RouteStop> Stops { get; set; } = new List<RouteStop>();
    }

    public class RouteStop : BaseEntity
    {
        public long RouteId { get; set; }
        public string StopName { get; set; } = string.Empty;
        public TimeSpan? PickUpTime { get; set; }
        public TimeSpan? DropTime { get; set; }
        public decimal MonthlyFare { get; set; } = 0;
        
        [JsonIgnore]
        public virtual TransportRoute? Route { get; set; }
        [JsonIgnore]
        public virtual ICollection<TransportAllocation> Allocations { get; set; } = new List<TransportAllocation>();
    }

    public class TransportAllocation : BaseEntity
    {
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public long StudentId { get; set; }
        public long RouteStopId { get; set; }
        
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } = "Active"; // Active, Cancelled
        
        [JsonIgnore]
        public virtual Branch? Branch { get; set; }
        [JsonIgnore]
        public virtual AcademicYear? AcademicYear { get; set; }
        [JsonIgnore]
        public virtual Student? Student { get; set; }
        public virtual RouteStop? RouteStop { get; set; }
    }
}
