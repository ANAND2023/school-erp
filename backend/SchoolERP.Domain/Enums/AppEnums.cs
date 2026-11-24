namespace SchoolERP.Domain.Enums
{
    public enum UserType
    {
        SuperAdmin = 1,
        SchoolAdmin = 2,
        Principal = 3,
        Teacher = 4,
        Accountant = 5,
        Parent = 6,
        Student = 7
    }

    public enum StudentStatus
    {
        Active = 1,
        Left = 2,
        TcIssued = 3,
        PassedOut = 4
    }

    public enum EnquiryStatus
    {
        Open = 1,
        FollowUp = 2,
        Converted = 3,
        Closed = 4
    }

    public enum SubjectType
    {
        Scholastic = 1,
        CoScholastic = 2
    }

    public enum MasterType
    {
        Category = 1,
        Religion = 2,
        House = 3,
        DocumentType = 4,
        Designation = 5,
        Department = 6,
        PaymentMode = 7,
        Bank = 8
    }

    public enum EmployeeStatus
    {
        Active = 1,
        OnLeave = 2,
        Resigned = 3,
        Terminated = 4,
        Retired = 5
    }

    public enum FeeHeadType
    {
        OneTime = 1,
        Recurring = 2,
        Refundable = 3
    }

    public enum FineType
    {
        FixedAmount = 1,
        PerDay = 2
    }

    public enum ReceiptStatus
    {
        Paid = 1,
        Cancelled = 2
    }

    public enum FeePaymentMode
    {
        Cash = 1,
        UPI = 2,
        Card = 3,
        Cheque = 4,
        BankTransfer = 5,
        Online = 6
    }

    public enum ChequeStatus
    {
        Pending = 1,
        Cleared = 2,
        Bounced = 3
    }

    public enum ConcessionType
    {
        Percentage = 1,
        FixedAmount = 2
    }

    public enum DueStatus
    {
        Unpaid = 1,
        PartiallyPaid = 2,
        Paid = 3,
        Waived = 4
    }

    public enum AttendanceStatus
    {
        Present = 1,
        Absent = 2,
        Leave = 3,
        HalfDay = 4,
        Late = 5,
        CasualLeave = 6, // CL (Casual Leave)
        SickLeave = 7    // SL (Sick / Medical Leave)
    }

    public enum LeaveType
    {
        Casual = 1,
        Medical = 2,
        Earned = 3,
        Maternity = 4,
        Unpaid = 5,
        Other = 6
    }

    public enum LeaveStatus
    {
        Pending = 1,
        Approved = 2,
        Rejected = 3
    }

    public enum TimetableDay
    {
        Monday = 1,
        Tuesday = 2,
        Wednesday = 3,
        Thursday = 4,
        Friday = 5,
        Saturday = 6
    }

    public enum PromotionResult
    {
        Promoted = 1,
        Detained = 2,
        Left = 3
    }

    public enum TcStatus
    {
        Draft = 1,
        Issued = 2,
        Cancelled = 3
    }
}


