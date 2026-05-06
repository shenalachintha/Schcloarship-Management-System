namespace ScholarshipManagement.Domain.Constants;

public static class ScholarshipConstants
{
    public const decimal MahapolaIncomeLimit = 300000;
    public const decimal BursaryIncomeLimit = 500000;
    public const decimal MahapolaGpaMinimum = 2.0m;
    public const decimal AttendanceMinimum = 80m;
    public const decimal MahapolaAmount = 7500;
    public const decimal BursaryAmount = 6500;
    public const int MahapolaDurationMonths = 10;
    public const int BursaryDurationMonths = 12;

    public const string ScholarshipTypeMahapola = "Mahapola";
    public const string ScholarshipTypeBursary = "Bursary";
    public const string StatusActive = "Active";
    public const string StatusInactive = "Inactive";
    public const string StatusRejected = "Rejected";
    public const string StatusPending = "Pending";
    public const string StatusApproved = "Approved";
    public const string StatusProcessed = "Processed";
}
