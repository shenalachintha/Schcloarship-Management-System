using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using System.Security.Claims;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public NotificationsController(IApplicationDbContext context)
    {
        _context = context;
    }

    private async Task<int?> ResolveStudentIdAsync(CancellationToken cancellationToken)
    {
        var studentIdClaim = User.FindFirst("StudentId")?.Value;
        if (int.TryParse(studentIdClaim, out var id))
            return id;

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            return null;

        return await _context.Students
            .Where(s => s.UserId == userId)
            .Select(s => (int?)s.StudentId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    [HttpGet("student")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyNotifications(CancellationToken cancellationToken)
    {
        var studentId = await ResolveStudentIdAsync(cancellationToken);
        if (studentId == null)
            return Unauthorized();

        var notifications = await _context.Notifications
            .Where(n => n.StudentId == studentId)
            .OrderByDescending(n => n.CreatedDate)
            .Take(50)
            .Select(n => new { n.NotificationId, n.Message, n.Type, n.CreatedDate, n.IsRead })
            .ToListAsync(cancellationToken);

        return Ok(notifications);
    }
}
