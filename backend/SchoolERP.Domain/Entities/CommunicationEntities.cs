using System;
using SchoolERP.Domain.Common;
using SchoolERP.Domain.Enums;

namespace SchoolERP.Domain.Entities
{
    public class ChatMessage : BaseEntity
    {
        public long SenderId { get; set; }
        public long ReceiverId { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;
        public long BranchId { get; set; }
    }

    public class SystemNotification : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public long? TargetUserId { get; set; } 
        public SchoolERP.Domain.Enums.UserType? TargetUserType { get; set; }
        public long BranchId { get; set; }
        public long CreatedById { get; set; }
    }
}
