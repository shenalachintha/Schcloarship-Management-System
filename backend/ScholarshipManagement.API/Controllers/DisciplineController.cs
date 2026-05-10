using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Constants;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Staff,Admin,HOD,Counselor")]
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

    [HttpGet("monthly")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetMonthlyDisciplineIssues([FromQuery] string month, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(month))
            return BadRequest("Month is required");

        if (!DateTime.TryParseExact(month, "yyyy-MM", null, System.Globalization.DateTimeStyles.None, out var evaluationDate))
            return BadRequest("Invalid month format");

        var startOfMonth = new DateTime(evaluationDate.Year, evaluationDate.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var records = await _context.DisciplineRecords
            .Include(d => d.Student)
            .Where(d => d.RecordedDate >= startOfMonth && d.RecordedDate <= endOfMonth)
            .OrderByDescending(d => d.RecordedDate)
            .Select(d => new 
            {
                d.DisciplineRecordId,
                d.Description,
                d.RecordedDate,
                d.RecordedBy,
                StudentId = d.StudentId,
                RegistrationNumber = d.Student.RegistrationNumber,
                Name = d.Student.Name,
                Department = d.Student.Department,
                Batch = d.Student.Batch
            })
            .ToListAsync(cancellationToken);

        return Ok(records);
    }
}

public class RecordDisciplineRequest
{
    public int StudentId { get; set; }
    public string Description { get; set; } = string.Empty;
}
