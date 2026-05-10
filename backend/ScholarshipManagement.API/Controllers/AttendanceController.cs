using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Constants;
using System.Security.Claims;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IEligibilityService _eligibilityService;

    public AttendanceController(IApplicationDbContext context, IEligibilityService eligibilityService)
    {
        _context = context;
        _eligibilityService = eligibilityService;
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

    [HttpPost]
    [Authorize(Roles = "Staff,Admin,HOD")]
    public async Task<IActionResult> RecordAttendance([FromBody] RecordAttendanceRequest request, CancellationToken cancellationToken)
    {
        var student = await _context.Students.FindAsync(new object[] { request.StudentId }, cancellationToken);
        if (student == null)
            return NotFound("Student not found");

        var existing = await _context.Attendances
            .FirstOrDefaultAsync(a => a.StudentId == request.StudentId && a.Date.Date == request.Date.Date, cancellationToken);

        if (existing != null)
        {
            existing.Status = request.Status;
            existing.RecordedAt = DateTime.UtcNow;
            existing.RecordedBy = User.Identity?.Name ?? "Staff";
        }
        else
        {
            _context.Attendances.Add(new Domain.Entities.Attendance
            {
                StudentId = request.StudentId,
                Date = request.Date,
                Status = request.Status,
                RecordedAt = DateTime.UtcNow,
                RecordedBy = User.Identity?.Name ?? "Staff"
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Attendance recorded successfully" });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Staff,Admin,HOD")]
    public async Task<IActionResult> UpdateAttendance(int id, [FromBody] UpdateAttendanceRequest request, CancellationToken cancellationToken)
    {
        var attendance = await _context.Attendances.FindAsync(new object[] { id }, cancellationToken);
        if (attendance == null)
            return NotFound();

        attendance.Status = request.Status;
        attendance.RecordedAt = DateTime.UtcNow;
        attendance.RecordedBy = User.Identity?.Name ?? "Staff";
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Attendance updated successfully" });
    }

    [HttpGet("history/{studentId}")]
    [Authorize(Roles = "Staff,Admin,HOD,Counselor")]
    public async Task<IActionResult> GetHistory(int studentId, CancellationToken cancellationToken)
    {
        var history = await _context.MonthlyAttendances
            .Where(m => m.StudentId == studentId)
            .OrderByDescending(m => m.Month)
            .ToListAsync(cancellationToken);

        return Ok(history);
    }

    [HttpGet("my-history")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyHistory(CancellationToken cancellationToken)
    {
        var studentId = await ResolveStudentIdAsync(cancellationToken);
        if (studentId == null)
            return Unauthorized();

        var history = await _context.MonthlyAttendances
            .Where(m => m.StudentId == studentId)
            .OrderByDescending(m => m.Month)
            .ToListAsync(cancellationToken);

        return Ok(history);
    }

    [HttpGet("student/{studentId}/monthly")]
    [Authorize(Roles = "Staff,Admin,Student")]
    public async Task<IActionResult> GetMonthlyAttendance(int studentId, [FromQuery] int year, [FromQuery] int month, CancellationToken cancellationToken)
    {
        var monthStr = $"{year}-{month:D2}";
        var monthlyRecord = await _context.MonthlyAttendances
            .FirstOrDefaultAsync(m => m.StudentId == studentId && m.Month == monthStr, cancellationToken);
            
        var startOfMonth = new DateTime(year, month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var attendances = await _context.Attendances
            .Where(a => a.StudentId == studentId && a.Date >= startOfMonth && a.Date <= endOfMonth)
            .OrderBy(a => a.Date)
            .Select(a => new { a.AttendanceId, a.Date, a.Status })
            .ToListAsync(cancellationToken);

        decimal percentage;
        if (monthlyRecord != null)
        {
            percentage = monthlyRecord.Percentage;
        }
        else if (attendances.Count == 0)
        {
            percentage = 100m;
        }
        else
        {
            var presentCount = attendances.Count(a => a.Status.Equals("Present", StringComparison.OrdinalIgnoreCase));
            percentage = (decimal)presentCount / attendances.Count * 100;
        }

        return Ok(new { percentage, records = attendances });
    }

    [HttpGet("report")]
    [Authorize(Roles = "Staff,Admin,HOD,Counselor")]
    public async Task<IActionResult> GetAttendanceReport([FromQuery] int? studentId, [FromQuery] int year, [FromQuery] int month, CancellationToken cancellationToken)
    {
        var startOfMonth = new DateTime(year, month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var query = _context.Attendances
            .Where(a => a.Date >= startOfMonth && a.Date <= endOfMonth);

        if (studentId.HasValue)
            query = query.Where(a => a.StudentId == studentId.Value);

        var grouped = await query
            .GroupBy(a => a.StudentId)
            .Select(g => new
            {
                StudentId = g.Key,
                Total = g.Count(),
                Present = g.Count(a => a.Status == "Present"),
                Percentage = g.Count() > 0 ? (decimal)g.Count(a => a.Status == "Present") / g.Count() * 100 : 0
            })
            .ToListAsync(cancellationToken);

        return Ok(grouped);
    }
    [HttpPost("monthly-percentage")]
    [Authorize(Roles = "Staff,Admin,HOD")]
    public async Task<IActionResult> RecordMonthlyPercentage([FromBody] RecordMonthlyPercentageRequest request, CancellationToken cancellationToken)
    {
        var student = await _context.Students.FindAsync(new object[] { request.StudentId }, cancellationToken);
        if (student == null)
            return NotFound("Student not found");

        var existing = await _context.MonthlyAttendances
            .FirstOrDefaultAsync(a => a.StudentId == request.StudentId && a.Month == request.Month, cancellationToken);

        if (existing != null)
        {
            return BadRequest(new { message = $"Monthly attendance for {request.Month} has already been recorded and cannot be changed." });
        }
        else
        {
            _context.MonthlyAttendances.Add(new Domain.Entities.MonthlyAttendance
            {
                StudentId = request.StudentId,
                Month = request.Month,
                Percentage = request.Percentage,
                RecordedAt = DateTime.UtcNow
            });
        }

        // Auto-activate scholarship if it's the first time and they are eligible
        var eligibility = await _eligibilityService.CheckEligibilityAsync(request.StudentId, request.Month, cancellationToken);
        if (eligibility.IsEligible && !string.IsNullOrEmpty(eligibility.ScholarshipType))
        {
            var activeScholarship = await _context.Scholarships
                .FirstOrDefaultAsync(s => s.StudentId == request.StudentId && s.Type == eligibility.ScholarshipType && s.Status == Domain.Constants.ScholarshipConstants.StatusActive, cancellationToken);
            
            if (activeScholarship == null)
            {
                var duration = eligibility.ScholarshipType == Domain.Constants.ScholarshipConstants.ScholarshipTypeMahapola
                    ? Domain.Constants.ScholarshipConstants.MahapolaDurationMonths
                    : Domain.Constants.ScholarshipConstants.BursaryDurationMonths;

                _context.Scholarships.Add(new Domain.Entities.Scholarship
                {
                    StudentId = request.StudentId,
                    Type = eligibility.ScholarshipType,
                    Status = Domain.Constants.ScholarshipConstants.StatusActive,
                    DurationMonths = duration,
                    RemainingMonths = duration,
                    StartDate = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Monthly attendance recorded successfully" });
    }

    [HttpPost("bulk-monthly-percentage")]
    [Authorize(Roles = "Admin,HOD")]
    public async Task<IActionResult> BulkUploadMonthlyAttendance([FromBody] BulkMonthlyAttendanceRequest request, CancellationToken cancellationToken)
    {
        if (request.Records == null || !request.Records.Any())
            return BadRequest("No records provided");

        // Fetch HOD's department if the user is an HOD
        string? hodDepartment = null;
        if (User.IsInRole("HOD"))
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                var hod = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
                hodDepartment = hod?.Department;
            }
        }

        var results = new List<string>();
        int count = 0;

        foreach (var record in request.Records)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.RegistrationNumber == record.RegistrationNumber, cancellationToken);

            if (student == null)
            {
                results.Add($"Student with Reg No {record.RegistrationNumber} not found");
                continue;
            }

            // Cross-Department Validation
            if (User.IsInRole("HOD") && !string.IsNullOrEmpty(hodDepartment) && student.Department != hodDepartment)
            {
                results.Add($"Security Violation: Reg No {record.RegistrationNumber} does not belong to your department ({hodDepartment})");
                continue;
            }

            var existing = await _context.MonthlyAttendances
                .FirstOrDefaultAsync(a => a.StudentId == student.StudentId && a.Month == request.Month, cancellationToken);

            if (existing != null)
            {
                existing.Percentage = record.Percentage;
                existing.RecordedAt = DateTime.UtcNow;
            }
            else
            {
                _context.MonthlyAttendances.Add(new Domain.Entities.MonthlyAttendance
                {
                    StudentId = student.StudentId,
                    Month = request.Month,
                    Percentage = record.Percentage,
                    RecordedAt = DateTime.UtcNow
                });
            }
            count++;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Successfully processed {count} records", details = results });
    }

    [HttpGet("high-attendance-report")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetHighAttendanceReport([FromQuery] string month, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(month))
            return BadRequest("Month is required");

        if (!DateTime.TryParseExact(month, "yyyy-MM", null, System.Globalization.DateTimeStyles.None, out var evaluationDate))
            return BadRequest("Invalid month format");

        var startOfMonth = new DateTime(evaluationDate.Year, evaluationDate.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var processedPaymentStudentIds = await _context.Payments
            .Where(p => p.Month == month && p.PaymentStatus == ScholarshipConstants.StatusProcessed)
            .Select(p => p.StudentId)
            .ToListAsync(cancellationToken);

        var report = await _context.MonthlyAttendances
            .Include(a => a.Student)
                .ThenInclude(s => s.DisciplineRecords)
            .Where(a => a.Month == month && a.Percentage >= 80)
            .Where(a => !processedPaymentStudentIds.Contains(a.StudentId))
            .Where(a => !a.Student.DisciplineRecords.Any(r => r.RecordedDate >= startOfMonth && r.RecordedDate <= endOfMonth))
            .Select(a => new
            {
                a.Student.StudentId,
                a.Student.RegistrationNumber,
                a.Student.Name,
                a.Student.NIC,
                a.Student.Faculty,
                a.Student.Department,
                a.Student.Batch,
                a.Student.ScholarshipType,
                Percentage = a.Percentage
            })
            .ToListAsync(cancellationToken);

        return Ok(report);
    }

    [HttpGet("all-monthly")]
    [Authorize(Roles = "Admin,HOD")]
    public async Task<IActionResult> GetAllMonthlyAttendance([FromQuery] string month, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(month))
            return BadRequest("Month is required");

        var report = await _context.MonthlyAttendances
            .Include(a => a.Student)
            .Where(a => a.Month == month)
            .Select(a => new
            {
                a.Student.StudentId,
                a.Student.RegistrationNumber,
                a.Student.Name,
                a.Student.Department,
                a.Student.Batch,
                Percentage = a.Percentage
            })
            .ToListAsync(cancellationToken);

        return Ok(report);
    }
}

public class RecordAttendanceRequest
{
    public int StudentId { get; set; }
    public DateTime Date { get; set; }
    public string Status { get; set; } = "Present"; // Present, Absent
}

public class UpdateAttendanceRequest
{
    public string Status { get; set; } = "Present";
}

public class RecordMonthlyPercentageRequest
{
    public int StudentId { get; set; }
    public string Month { get; set; } = string.Empty;
    public decimal Percentage { get; set; }
}
public class BulkMonthlyAttendanceRequest
{
    public string Month { get; set; } = string.Empty;
    public List<AttendancePercentageItem> Records { get; set; } = new();
}

public class AttendancePercentageItem
{
    public string RegistrationNumber { get; set; } = string.Empty;
    public decimal Percentage { get; set; }
}
