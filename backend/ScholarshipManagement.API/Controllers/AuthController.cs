using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.API.Models;
using ScholarshipManagement.Application.Interfaces;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IApplicationDbContext _context;

    public AuthController(IAuthService authService, IApplicationDbContext context)
    {
        _authService = authService;
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Username and password are required" });

        var result = await _authService.LoginAsync(request.Username, request.Password, cancellationToken);
        if (result == null)
            return Unauthorized(new { message = "Invalid username or password" });

        return Ok(new
        {
            token = result.Token,
            username = result.Username,
            role = result.Role,
            studentId = result.StudentId,
            userId = result.UserId,
            isApproved = result.IsApproved
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Role))
        {
            return BadRequest(new { message = "Username, Password, Name and Role are strictly required." });
        }

        if (request.Role == "Admin")
        {
            return BadRequest(new { message = "Admin registration is not allowed." });
        }

        if (request.Role == "Student")
        {
            return BadRequest(new { message = "Student self-registration is disabled. Please wait for an account to be created for you." });
        }

        var result = await _authService.RegisterAsync(
            request.Username, 
            request.Password, 
            request.Role,
            request.Name, 
            request.RegistrationNumber, 
            request.Faculty,
            request.Department,
            request.Address,
            request.MobileNumber,
            request.NIC,
            request.BankName,
            request.BankAccountNumber,
            cancellationToken);

        if (result == null)
        {
            return Conflict(new { message = "Username is already taken" });
        }

        return Ok(new
        {
            message = "Registration successful",
            token = result.Token,
            username = result.Username,
            role = result.Role,
            studentId = result.StudentId,
            userId = result.UserId,
            isApproved = result.IsApproved
        });
    }
}
