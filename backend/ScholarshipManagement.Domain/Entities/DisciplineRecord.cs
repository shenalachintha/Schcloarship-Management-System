namespace ScholarshipManagement.Domain.Entities;

public class DisciplineRecord
{
    public int DisciplineRecordId { get; set; }
    public int StudentId { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime RecordedDate { get; set; }
    public string RecordedBy { get; set; } = string.Empty;

    public Student Student { get; set; } = null!;
}
