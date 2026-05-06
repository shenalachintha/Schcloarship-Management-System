namespace ScholarshipManagement.Domain.Entities;

public class MonthlyAttendance
{
    public int MonthlyAttendanceId { get; set; }
    public int StudentId { get; set; }
    public string Month { get; set; } = string.Empty; // Format: "yyyy-MM" e.g. "2026-03"
    public decimal Percentage { get; set; }
    public DateTime RecordedAt { get; set; }

    public Student? Student { get; set; }
}
