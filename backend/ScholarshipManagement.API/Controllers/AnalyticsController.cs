using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AnalyticsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AnalyticsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        var mahapolaCount = await _context.Scholarships
            .CountAsync(s => s.Type == "Mahapola" && s.Status == "Active", cancellationToken);

        var bursaryCount = await _context.Scholarships
            .CountAsync(s => s.Type == "Bursary" && s.Status == "Active", cancellationToken);

        var totalStudents = await _context.Students.CountAsync(cancellationToken);

        var currentMonth = $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Month:D2}";
        var monthlyPayments = await _context.Payments
            .Where(p => p.Month == currentMonth && p.PaymentStatus == "Processed")
            .GroupBy(p => p.ScholarshipType)
            .Select(g => new { Type = g.Key, Count = g.Count(), Total = g.Sum(p => p.Amount) })
            .ToListAsync(cancellationToken);

        var rejectionCount = await _context.Payments
            .CountAsync(p => p.PaymentStatus == "Rejected" && p.Month == currentMonth, cancellationToken);

        return Ok(new
        {
            totalMahapolaStudents = mahapolaCount,
            totalBursaryStudents = bursaryCount,
            totalStudents,
            monthlyPayments,
            rejectionCount,
            studentsBelow80Attendance = 0
        });
    }
}
