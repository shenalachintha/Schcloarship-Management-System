namespace ScholarshipManagement.Domain.Entities;

public class User
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // Student, Staff, Admin
    public string Name { get; set; } = string.Empty;
    public string Faculty { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string NIC { get; set; } = string.Empty;
    public int? StudentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsApproved { get; set; } = false;

    public Student? Student { get; set; }
}
