using System;

namespace SchoolERP.Domain.Common
{
    public abstract class BaseEntity
    {
        public long Id { get; set; }
        public long CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public long? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
