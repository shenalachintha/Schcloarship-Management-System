namespace ScholarshipManagement.Domain.Entities;

public class Scholarship
{
    public int ScholarshipId { get; set; }
    public int StudentId { get; set; }
    public string Type { get; set; } = string.Empty; // Mahapola, Bursary
    public string Status { get; set; } = string.Empty; // Active, Inactive, Rejected
    public int DurationMonths { get; set; }
    public int RemainingMonths { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Student Student { get; set; } = null!;
}
