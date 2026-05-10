namespace ScholarshipManagement.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResult?> LoginAsync(string username, string password, CancellationToken cancellationToken = default);
    Task<bool> ValidateUserAsync(string username, string password, CancellationToken cancellationToken = default);
    Task<AuthResult?> RegisterAsync(
        string username, 
        string password, 
        string role, 
        string name, 
        string? registrationNumber = null, 
        string? faculty = null, 
        string? department = null, 
        string? address = null, 
        string? mobileNumber = null, 
        string? nic = null, 
        string? bankName = null, 
        string? bankAccountNumber = null, 
        CancellationToken cancellationToken = default);
    
    Task<AuthResult?> RegisterStudentAsync(string username, string password, string name, string registrationNumber, CancellationToken cancellationToken = default);
}

public class AuthResult
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? StudentId { get; set; }
    public int UserId { get; set; }
    public bool IsApproved { get; set; }
    public string? Faculty { get; set; }
    public string? Department { get; set; }
    public string? Name { get; set; }
}
