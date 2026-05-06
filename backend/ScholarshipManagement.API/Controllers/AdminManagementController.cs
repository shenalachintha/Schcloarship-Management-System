using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminManagementController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public AdminManagementController(IApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    [HttpGet("pending-staff")]
    public async Task<IActionResult> GetPendingStaff(CancellationToken cancellationToken)
    {
        var pending = await _context.Users
            .Where(u => (u.Role.ToLower() == "staff" || u.Role.ToLower() == "admin") && !u.IsApproved)
            .Select(u => new {
                u.UserId,
                u.Username,
                u.Name,
                u.Role,
                u.Faculty,
                u.Department,
                u.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(pending);
    }

    [HttpPost("approve-staff/{userId}")]
    public async Task<IActionResult> ApproveStaff(int userId, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return NotFound();

        user.IsApproved = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Account for {user.Name} has been approved." });
    }

    [HttpDelete("reject-staff/{userId}")]
    public async Task<IActionResult> RejectStaff(int userId, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return NotFound();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Registration rejected and account removed." });
    }

    [HttpGet("approved-staff")]
    public async Task<IActionResult> GetApprovedStaff(CancellationToken cancellationToken)
    {
        var staff = await _context.Users
            .Where(u => u.Role == "Staff" && u.IsApproved)
            .Select(u => new {
                u.UserId,
                u.Username,
                u.Name,
                u.Faculty,
                u.Department,
                u.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(staff);
    }

    [HttpPost("bulk-students")]
    public async Task<IActionResult> BulkAddStudents([FromBody] List<BulkStudentRequest> students, CancellationToken cancellationToken)
    {
        if (students == null || !students.Any()) return BadRequest("No student data provided");

        foreach (var s in students)
        {
            var existing = await _context.GovernmentScholarshipLists
                .FirstOrDefaultAsync(x => x.NIC == s.NIC, cancellationToken);
            
            if (existing != null)
            {
                existing.Name = s.Name;
                existing.Faculty = s.Faculty;
                existing.Department = s.Department;
                existing.Batch = s.Batch;
                if (!string.IsNullOrEmpty(s.RegistrationNumber))
                    existing.RegistrationNumber = s.RegistrationNumber;
                
                if (!string.IsNullOrEmpty(s.ScholarshipType))
                {
                    existing.ScholarshipType = s.ScholarshipType;
                    existing.Status = "Assigned";
                }
                
                _context.GovernmentScholarshipLists.Update(existing);
            }
            else
            {
                _context.GovernmentScholarshipLists.Add(new Domain.Entities.GovernmentScholarshipList
                {
                    RegistrationNumber = s.RegistrationNumber ?? string.Empty,
                    NIC = s.NIC,
                    Name = s.Name,
                    Faculty = s.Faculty,
                    Department = s.Department,
                    Batch = s.Batch,
                    ScholarshipType = s.ScholarshipType,
                    Status = string.IsNullOrEmpty(s.ScholarshipType) ? "Pending" : "Assigned",
                    ApprovedDate = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Bulk authorization complete" });
    }

    [HttpGet("financial-history")]
    public async Task<IActionResult> GetFinancialHistory(CancellationToken cancellationToken)
    {
        var history = await _context.Payments
            .Include(p => p.Student)
            .OrderByDescending(p => p.ProcessedAt)
            .Select(p => new {
                p.PaymentId,
                p.Amount,
                p.Month,
                p.ScholarshipType,
                p.PaymentStatus,
                p.ProcessedAt,
                StudentName = p.Student.Name,
                RegistrationNumber = p.Student.RegistrationNumber,
                NIC = p.Student.NIC
            })
            .ToListAsync(cancellationToken);

        return Ok(history);
    }

    [HttpPost("provision-account")]
    public async Task<IActionResult> ProvisionAccount([FromBody] ProvisionAccountRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Student email is required." });

        var govEntry = await _context.GovernmentScholarshipLists
            .FirstOrDefaultAsync(g => g.Id == request.GovListId, cancellationToken);
        if (govEntry == null)
            return NotFound(new { message = "Student not found in the authorization list." });

        if (string.IsNullOrEmpty(govEntry.ScholarshipType))
            return BadRequest(new { message = "Student must have a confirmed scholarship type (Mahapola/Bursary) before provisioning." });

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Email, cancellationToken);
        Domain.Entities.User newUser;
        string tempPassword = "";

        if (existingUser != null)
        {
            if (existingUser.NIC != govEntry.NIC)
                return Conflict(new { message = "An account with this email already exists for a different person." });
            
            newUser = existingUser;
            newUser.IsApproved = true; // Ensure they are approved
        }
        else
        {
            tempPassword = GeneratePassword();
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);

            newUser = new Domain.Entities.User
            {
                Username = request.Email,
                PasswordHash = passwordHash,
                Role = "Student",
                Name = govEntry.Name,
                NIC = govEntry.NIC,
                IsApproved = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var studentProfile = await _context.Students
            .FirstOrDefaultAsync(s => s.NIC == govEntry.NIC, cancellationToken);

        if (studentProfile == null)
        {
            studentProfile = new Domain.Entities.Student
            {
                UserId = newUser.UserId,
                NIC = govEntry.NIC,
                RegistrationNumber = govEntry.RegistrationNumber,
                Name = govEntry.Name,
                Faculty = govEntry.Faculty,
                Department = govEntry.Department,
                Batch = govEntry.Batch,
                ScholarshipType = govEntry.ScholarshipType,
                CreatedAt = DateTime.UtcNow
            };
            _context.Students.Add(studentProfile);
        }
        else
        {
            studentProfile.UserId = newUser.UserId;
            studentProfile.ScholarshipType = govEntry.ScholarshipType;
            studentProfile.Batch = govEntry.Batch;
            _context.Students.Update(studentProfile);
        }

        govEntry.Status = "Provisioned";
        _context.GovernmentScholarshipLists.Update(govEntry);
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendStudentCredentialsAsync(request.Email, govEntry.Name, request.Email, tempPassword);
        }
        catch (Exception ex)
        {
            return Ok(new { 
                message = $"Account created for {govEntry.Name}, but email could not be sent: {ex.Message}",
                username = request.Email,
                tempPassword,
                emailSent = false
            });
        }

        return Ok(new { 
            message = $"Account provisioned and credentials sent to {request.Email}",
            username = request.Email,
            emailSent = true
        });
    }

    private static string GeneratePassword()
    {
        const string chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        const string special = "@#$!";
        var rng = new Random();
        var pwd = new string(Enumerable.Range(0, 8).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
        return pwd + special[rng.Next(special.Length)] + rng.Next(10);
    }
}

public class BulkStudentRequest
{
    public string? RegistrationNumber { get; set; }
    public string NIC { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Faculty { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Batch { get; set; } = string.Empty;
    public string? ScholarshipType { get; set; }
}

public class ProvisionAccountRequest
{
    public int GovListId { get; set; }
    public string Email { get; set; } = string.Empty;
}
