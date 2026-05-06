using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Constants;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ScholarshipsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IEligibilityService _eligibilityService;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;

    public ScholarshipsController(
        IApplicationDbContext context,
        IEligibilityService eligibilityService,
        INotificationService notificationService,
        IAuditService auditService)
    {
        _context = context;
        _eligibilityService = eligibilityService;
        _notificationService = notificationService;
        _auditService = auditService;
    }

    [HttpPost("activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ActivateScholarship([FromBody] ActivateScholarshipRequest request, CancellationToken cancellationToken)
    {
        var eligibility = await _eligibilityService.CheckEligibilityAsync(request.StudentId, null, cancellationToken);
        if (!eligibility.IsEligible || string.IsNullOrEmpty(eligibility.ScholarshipType))
            return BadRequest(new { message = eligibility.Message });

        var existing = await _context.Scholarships
            .FirstOrDefaultAsync(s => s.StudentId == request.StudentId && s.Type == eligibility.ScholarshipType && s.Status == ScholarshipConstants.StatusActive, cancellationToken);
        if (existing != null)
            return BadRequest(new { message = "Scholarship already active" });

        var duration = eligibility.ScholarshipType == ScholarshipConstants.ScholarshipTypeMahapola
            ? ScholarshipConstants.MahapolaDurationMonths
            : ScholarshipConstants.BursaryDurationMonths;

        _context.Scholarships.Add(new Domain.Entities.Scholarship
        {
            StudentId = request.StudentId,
            Type = eligibility.ScholarshipType,
            Status = ScholarshipConstants.StatusActive,
            DurationMonths = duration,
            RemainingMonths = duration,
            StartDate = DateTime.UtcNow
        });

        await _notificationService.CreateNotificationAsync(
            request.StudentId,
            $"You are eligible for {eligibility.ScholarshipType} Scholarship",
            "Eligibility",
            cancellationToken);

        await _auditService.LogAsync(
            "Scholarship Activated",
            $"Activated {eligibility.ScholarshipType} scholarship for student ID {request.StudentId}.",
            "Scholarship",
            null,
            User.Identity?.Name ?? "Admin",
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Scholarship activated: {eligibility.ScholarshipType}" });
    }
}

public class ActivateScholarshipRequest
{
    public int StudentId { get; set; }
}
