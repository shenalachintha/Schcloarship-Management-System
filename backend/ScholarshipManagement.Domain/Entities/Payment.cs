namespace ScholarshipManagement.Domain.Entities;

public class Payment
{
    public int PaymentId { get; set; }
    public int StudentId { get; set; }
    public decimal Amount { get; set; }
    public string Month { get; set; } = string.Empty; // e.g., "2025-03"
    public string PaymentStatus { get; set; } = string.Empty; // Pending, Approved, Rejected, Processed
    public string? ScholarshipType { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedBy { get; set; }

    public Student Student { get; set; } = null!;
}
