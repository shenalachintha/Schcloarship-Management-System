namespace ScholarshipManagement.API.Models;

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Student"; // Student, Staff, Admin
    public string Name { get; set; } = string.Empty;
    public string? RegistrationNumber { get; set; }
    public string? Faculty { get; set; }
    public string? Department { get; set; }
    public string? Address { get; set; }
    public string? MobileNumber { get; set; }
    public string? NIC { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
}
