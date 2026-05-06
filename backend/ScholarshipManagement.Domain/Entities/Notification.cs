namespace ScholarshipManagement.Domain.Entities;

public class Notification
{
    public int NotificationId { get; set; }
    public int StudentId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Eligibility, Payment, Attendance, Rejection
    public bool IsRead { get; set; }
    public DateTime CreatedDate { get; set; }

    public Student Student { get; set; } = null!;
}
