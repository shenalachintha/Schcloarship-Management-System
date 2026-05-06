using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ScholarshipManagement.Application.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ScholarshipManagement.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(IApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResult?> LoginAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.Student)
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        var token = GenerateJwtToken(user);
        var studentId = user.StudentId ?? user.Student?.StudentId;
        
        // If still null, try one last time to find by UserId
        if (studentId == null && user.Role == "Student")
        {
            studentId = await _context.Students
                .Where(s => s.UserId == user.UserId)
                .Select(s => (int?)s.StudentId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new AuthResult
        {
            Token = token,
            Username = user.Username,
            Role = user.Role,
            StudentId = studentId,
            UserId = user.UserId,
            IsApproved = user.IsApproved
        };
    }

    public async Task<bool> ValidateUserAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

        return user != null && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    }

    public async Task<AuthResult?> RegisterAsync(
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
        CancellationToken cancellationToken = default)
    {
        // Check if username exists
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
        if (existingUser != null)
        {
            return null; // Username taken
        }

        Domain.Entities.Student? student = null;
        if (role == "Student")
        {
            student = new Domain.Entities.Student
            {
                RegistrationNumber = registrationNumber ?? nic ?? string.Empty,
                NIC = nic ?? string.Empty,
                Name = name,
                Faculty = faculty ?? string.Empty,
                Department = department ?? string.Empty,
                Address = address ?? string.Empty,
                MobileNumber = mobileNumber ?? string.Empty,
                BankName = bankName ?? string.Empty,
                BankAccountNumber = bankAccountNumber ?? string.Empty,
                GPA = 0,
                FamilyIncome = 0,
                CreatedAt = DateTime.UtcNow,
                DisciplineStatus = false
            };
        }

        var user = new Domain.Entities.User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            Name = name,
            Faculty = faculty ?? string.Empty,
            Department = department ?? string.Empty,
            Address = address ?? string.Empty,
            MobileNumber = mobileNumber ?? string.Empty,
            NIC = nic ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            IsApproved = role == "Student" || role == "Admin",
            Student = student
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        var token = GenerateJwtToken(user);
        var studentId = user.StudentId ?? user.Student?.StudentId;

        return new AuthResult
        {
            Token = token,
            Username = user.Username,
            Role = user.Role,
            StudentId = studentId,
            UserId = user.UserId,
            IsApproved = user.IsApproved
        };
    }

    public async Task<AuthResult?> RegisterStudentAsync(string username, string password, string name, string registrationNumber, CancellationToken cancellationToken = default)
    {
        return await RegisterAsync(username, password, "Student", name, registrationNumber, null, null, null, null, null, null, null, cancellationToken);
    }

    private string GenerateJwtToken(Domain.Entities.User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured")));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("StudentId", (user.StudentId ?? user.Student?.StudentId)?.ToString() ?? ""),
            new Claim("IsApproved", user.IsApproved.ToString().ToLower())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
