using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.API.Models;
using ScholarshipManagement.Application.Interfaces;
using System.Security.Claims;
using ScholarshipManagement.Domain.Constants;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IEligibilityService _eligibilityService;

    public StudentsController(IApplicationDbContext context, IEligibilityService eligibilityService)
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

    [HttpGet("dashboard")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<StudentDashboardResponse>> GetDashboard(CancellationToken cancellationToken)
    {
        var studentId = await ResolveStudentIdAsync(cancellationToken);
        if (studentId == null)
            return Unauthorized();

        var eligibility = await _eligibilityService.CheckEligibilityAsync(studentId.Value, null, cancellationToken);
        var currentMonth = eligibility.EvaluationMonth ?? DateTime.UtcNow.ToString("yyyy-MM");

        var scholarship = await _context.Scholarships
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var payments = await _context.Payments
            .Where(p => p.StudentId == studentId)
            .OrderByDescending(p => p.Month)
            .Take(20)
            .Select(p => new PaymentDto
            {
                PaymentId = p.PaymentId,
                Amount = p.Amount,
                Month = p.Month,
                Status = p.PaymentStatus
            })
            .ToListAsync(cancellationToken);

        var notifications = await _context.Notifications
            .Where(n => n.StudentId == studentId)
            .OrderByDescending(n => n.CreatedDate)
            .Take(10)
            .Select(n => new NotificationDto
            {
                NotificationId = n.NotificationId,
                Message = n.Message,
                Type = n.Type,
                CreatedDate = n.CreatedDate
            })
            .ToListAsync(cancellationToken);

        var allProcessedPayments = await _context.Payments
            .Where(p => p.StudentId == studentId && p.PaymentStatus == ScholarshipConstants.StatusProcessed)
            .ToListAsync(cancellationToken);

        var totalPaid = allProcessedPayments.Sum(p => p.Amount);
        
        // Calculate reduction due to missed months (Attendance < 80% and not paid)
        var monthlyAttendanceRecords = await _context.MonthlyAttendances
            .Where(m => m.StudentId == studentId)
            .ToListAsync(cancellationToken);

        var processedMonths = allProcessedPayments.Select(p => p.Month).ToHashSet();
        
        // Count months missed due to low attendance
        var attendanceMissedMonths = monthlyAttendanceRecords
            .Where(m => m.Percentage < ScholarshipConstants.AttendanceMinimum && !processedMonths.Contains(m.Month))
            .Select(m => m.Month)
            .ToHashSet();

        // Count months missed due to discipline records
        var disciplineRecords = await _context.DisciplineRecords
            .Where(d => d.StudentId == studentId)
            .ToListAsync(cancellationToken);

        var disciplineMissedMonths = disciplineRecords
            .Select(d => d.RecordedDate.ToString("yyyy-MM"))
            .Where(m => !processedMonths.Contains(m))
            .ToHashSet();

        var allMissedMonths = attendanceMissedMonths.Union(disciplineMissedMonths).ToHashSet();
        
        // Include current month if it's missed (below 80% or discipline) but not in processed yet
        if (!processedMonths.Contains(currentMonth))
        {
            if (eligibility.AttendancePercentage < ScholarshipConstants.AttendanceMinimum || eligibility.HasDisciplineIssue)
            {
                allMissedMonths.Add(currentMonth);
            }
        }

        var missedMonthsCount = allMissedMonths.Count;

        var scholarshipType = scholarship?.Type ?? eligibility.ScholarshipType;
        var amount = scholarshipType == ScholarshipConstants.ScholarshipTypeMahapola 
            ? ScholarshipConstants.MahapolaAmount 
            : ScholarshipConstants.BursaryAmount;

        var duration = scholarship?.DurationMonths ?? 
                       (scholarshipType == ScholarshipConstants.ScholarshipTypeMahapola ? ScholarshipConstants.MahapolaDurationMonths : ScholarshipConstants.BursaryDurationMonths);
        
        var remaining = scholarship?.RemainingMonths ?? duration;

        var annualTotal = duration * amount;
        var reduction = missedMonthsCount * amount;
        var adjustedAnnualTotal = annualTotal - reduction;

        var forecasts = GetForecasts(scholarship, eligibility, payments, allMissedMonths);

        return Ok(new StudentDashboardResponse
        {
            Eligibility = new EligibilityInfo
            {
                IsEligible = eligibility.IsEligible,
                ScholarshipType = eligibility.ScholarshipType,
                Message = eligibility.Message,
                EvaluationMonth = eligibility.EvaluationMonth
            },
            AttendancePercentage = eligibility.AttendancePercentage,
            ScholarshipStatus = scholarship?.Status ?? (eligibility.IsEligible ? "Pending Approval" : "None"),
            PaymentHistory = payments,
            Notifications = notifications,
            ForecastedPayments = forecasts,
            TotalRemainingAmount = Math.Max(0, annualTotal - totalPaid),
            AnnualTotalAmount = adjustedAnnualTotal,
            FullAnnualAmount = annualTotal
        });
    }

    private decimal CalculateAnnualTotal(Domain.Entities.Scholarship? scholarship)
    {
        if (scholarship == null) return 0;
        var amount = scholarship.Type == ScholarshipConstants.ScholarshipTypeMahapola 
            ? ScholarshipConstants.MahapolaAmount 
            : ScholarshipConstants.BursaryAmount;
        return amount * scholarship.DurationMonths;
    }

    private List<ForecastDto> GetForecasts(Domain.Entities.Scholarship? scholarship, EligibilityResult eligibility, List<PaymentDto> payments, HashSet<string> missedMonths)
    {
        var forecasts = new List<ForecastDto>();
        var scholarshipType = scholarship?.Type ?? eligibility.ScholarshipType;
        
        if (string.IsNullOrEmpty(scholarshipType) && !eligibility.IsEligible)
            return forecasts;

        var status = scholarship?.Status ?? ScholarshipConstants.StatusActive;
        var duration = scholarship?.DurationMonths ?? 
                       (scholarshipType == ScholarshipConstants.ScholarshipTypeMahapola ? ScholarshipConstants.MahapolaDurationMonths : ScholarshipConstants.BursaryDurationMonths);
        var remaining = scholarship?.RemainingMonths ?? duration;

        if (status == ScholarshipConstants.StatusActive && remaining > 0)
        {
            var amount = scholarshipType == ScholarshipConstants.ScholarshipTypeMahapola 
                ? ScholarshipConstants.MahapolaAmount 
                : ScholarshipConstants.BursaryAmount;
                
            var currentMonthStr = DateTime.UtcNow.ToString("yyyy-MM");
            var currentMonthPaid = payments.Any(p => p.Month == currentMonthStr && p.Status == ScholarshipConstants.StatusProcessed);
            
            var startDate = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            if (currentMonthPaid)
            {
                startDate = startDate.AddMonths(1);
            }

            int forecastedCount = 0;
            // Total future slots available = Total remaining - any months already marked as missed but not processed
            int maxFutureSlots = Math.Max(0, remaining - missedMonths.Count);

            // Iterate through potential future months.
            // We search up to remaining + 24 to find enough valid slots, skipping any month in missedMonths.
            for (int i = 0; i < remaining + 24 && forecastedCount < maxFutureSlots; i++)
            {
                var forecastDate = startDate.AddMonths(i);
                var forecastMonthStr = forecastDate.ToString("yyyy-MM");

                // Skip specifically missed months (attendance < 80% or discipline)
                if (missedMonths.Contains(forecastMonthStr))
                    continue;

                // Also double check if it was already paid (safety check for startDate logic)
                if (payments.Any(p => p.Month == forecastMonthStr && p.Status == ScholarshipConstants.StatusProcessed))
                    continue;

                forecasts.Add(new ForecastDto
                {
                    Month = forecastMonthStr,
                    EstimatedAmount = amount
                });
                forecastedCount++;
            }
        }
        return forecasts;
    }
    [HttpGet]
    [Authorize(Roles = "Staff,Admin,HOD,Counselor")]
    public async Task<IActionResult> GetAllStudents(CancellationToken cancellationToken)
    {
        var query = _context.Students
            .Include(s => s.User)
            .Where(s => s.UserId != null);

        if (User.IsInRole("HOD"))
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                var hod = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
                if (hod != null && !string.IsNullOrEmpty(hod.Department))
                {
                    query = query.Where(s => s.Department == hod.Department);
                }
            }
        }

        var students = await query
            .Select(s => new
            {
                s.StudentId,
                s.RegistrationNumber,
                s.Name,
                s.Faculty,
                s.Department,
                s.Address,
                s.MobileNumber,
                s.NIC,
                s.ScholarshipType,
                s.Batch,
                s.DisciplineStatus,
                AverageAttendance = s.MonthlyAttendances.Any() ? s.MonthlyAttendances.Average(ma => ma.Percentage) : 100
            })
            .ToListAsync(cancellationToken);
        return Ok(students);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Staff,Admin,HOD,Counselor")]
    public async Task<IActionResult> GetStudent(int id, CancellationToken cancellationToken)
    {
        var student = await _context.Students
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.StudentId == id, cancellationToken);

        if (student == null)
            return NotFound();

        return Ok(new
        {
            student.StudentId,
            student.RegistrationNumber,
            student.Name,
            student.Faculty,
            student.Department,
            student.Address,
            student.MobileNumber,
            student.NIC,
            student.BankName,
            student.BankAccountNumber,
            student.GPA,
            student.FamilyIncome,
            student.DisciplineStatus,
            Username = student.User.Username
        });
    }
}
