namespace ScholarshipManagement.Application.Interfaces;

public interface IEligibilityService
{
    Task<EligibilityResult> CheckEligibilityAsync(int studentId, string? month = null, CancellationToken cancellationToken = default);
}

public class EligibilityResult
{
    public bool IsEligible { get; set; }
    public string? ScholarshipType { get; set; } // Mahapola or Bursary
    public string Message { get; set; } = string.Empty;
    public decimal AttendancePercentage { get; set; }
    public string? EvaluationMonth { get; set; }
    public bool HasDisciplineIssue { get; set; }
    public List<string> RejectionReasons { get; set; } = new();
}
