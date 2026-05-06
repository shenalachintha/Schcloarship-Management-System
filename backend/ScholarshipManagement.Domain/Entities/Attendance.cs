namespace ScholarshipManagement.Domain.Entities;

public class Attendance
{
    public int AttendanceId { get; set; }
    public int StudentId { get; set; }
    public DateTime Date { get; set; }
    public string Status { get; set; } = string.Empty; // Present, Absent
    public DateTime RecordedAt { get; set; }
    public string? RecordedBy { get; set; }

    public Student Student { get; set; } = null!;
}
