namespace ScholarshipManagement.Domain.Entities;

public class Student
{
    public int StudentId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Faculty { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string NIC { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public string Batch { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankAccountNumber { get; set; } = string.Empty;
    public decimal GPA { get; set; }
    public decimal FamilyIncome { get; set; }
    public bool DisciplineStatus { get; set; } // true = has discipline issues
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<MonthlyAttendance> MonthlyAttendances { get; set; } = new List<MonthlyAttendance>();
    public ICollection<Scholarship> Scholarships { get; set; } = new List<Scholarship>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<DisciplineRecord> DisciplineRecords { get; set; } = new List<DisciplineRecord>();
}
