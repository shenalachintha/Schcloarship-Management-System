namespace ScholarshipManagement.API.Models;

public class StudentDashboardResponse
{
    public EligibilityInfo Eligibility { get; set; } = null!;
    public decimal AttendancePercentage { get; set; }
    public string ScholarshipStatus { get; set; } = string.Empty;
    public List<PaymentDto> PaymentHistory { get; set; } = new();
    public List<NotificationDto> Notifications { get; set; } = new();
    public List<ForecastDto> ForecastedPayments { get; set; } = new();
    public decimal TotalRemainingAmount { get; set; }
    public decimal AnnualTotalAmount { get; set; }
    public decimal FullAnnualAmount { get; set; }
}

public class ForecastDto
{
    public string Month { get; set; } = string.Empty;
    public decimal EstimatedAmount { get; set; }
}

public class EligibilityInfo
{
    public bool IsEligible { get; set; }
    public string? ScholarshipType { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? EvaluationMonth { get; set; }
}

public class PaymentDto
{
    public int PaymentId { get; set; }
    public decimal Amount { get; set; }
    public string Month { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class NotificationDto
{
    public int NotificationId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
}
