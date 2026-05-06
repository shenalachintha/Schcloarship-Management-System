using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Constants;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Staff,Admin")]
public class DisciplineController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;

    public DisciplineController(IApplicationDbContext context, INotificationService notificationService, IAuditService auditService)
    {
        _context = context;
        _notificationService = notificationService;
        _auditService = auditService;
    }

    [HttpPost]
    public async Task<IActionResult> RecordDiscipline([FromBody] RecordDisciplineRequest request, CancellationToken cancellationToken)
    {
        var student = await _context.Students.FindAsync(new object[] { request.StudentId }, cancellationToken);
        if (student == null)
            return NotFound("Student not found");

        _context.DisciplineRecords.Add(new Domain.Entities.DisciplineRecord
        {
            StudentId = request.StudentId,
            Description = request.Description,
            RecordedDate = DateTime.UtcNow,
            RecordedBy = User.Identity?.Name ?? "Staff"
        });

        await _notificationService.CreateNotificationAsync(
            request.StudentId,
            "Discipline issue recorded for this month: " + request.Description,
            "Rejection",
            cancellationToken);

        await _auditService.LogAsync(
            "Discipline Recorded",
            $"Recorded discipline issue for student {student.Name}: {request.Description}",
            "DisciplineRecord",
            student.StudentId.ToString(),
            User.Identity?.Name ?? "Staff",
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Discipline issue recorded" });
    }

    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetDisciplineRecords(int studentId, CancellationToken cancellationToken)
    {
        var records = await _context.DisciplineRecords
            .Where(d => d.StudentId == studentId)
            .OrderByDescending(d => d.RecordedDate)
            .Select(d => new { d.DisciplineRecordId, d.Description, d.RecordedDate, d.RecordedBy })
            .ToListAsync(cancellationToken);
        return Ok(records);
    }
}

public class RecordDisciplineRequest
{
    public int StudentId { get; set; }
    public string Description { get; set; } = string.Empty;
}
