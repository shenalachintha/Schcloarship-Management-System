using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Constants;

namespace ScholarshipManagement.Application.Services;

public class EligibilityService : IEligibilityService
{
    private readonly IApplicationDbContext _context;

    public EligibilityService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<EligibilityResult> CheckEligibilityAsync(int studentId, string? month = null, CancellationToken cancellationToken = default)
    {
        var student = await _context.Students
            .Include(s => s.DisciplineRecords)
            .FirstOrDefaultAsync(s => s.StudentId == studentId, cancellationToken);

        if (student == null)
        {
            return new EligibilityResult
            {
                IsEligible = false,
                Message = "Student not found",
                RejectionReasons = { "Student record not found" }
            };
        }

        if (string.IsNullOrEmpty(month))
        {
            var latestMonthly = await _context.MonthlyAttendances
                .Where(m => m.StudentId == studentId)
                .OrderByDescending(m => m.Month)
                .Select(m => m.Month)
                .FirstOrDefaultAsync(cancellationToken);
            
            var latestDaily = await _context.Attendances
                .Where(a => a.StudentId == studentId)
                .OrderByDescending(a => a.Date)
                .Select(a => a.Date)
                .FirstOrDefaultAsync(cancellationToken);

            var latestDailyMonth = latestDaily != default ? latestDaily.ToString("yyyy-MM") : null;

            if (latestMonthly != null && latestDailyMonth != null)
            {
                month = string.Compare(latestMonthly, latestDailyMonth) >= 0 ? latestMonthly : latestDailyMonth;
            }
            else
            {
                month = latestMonthly ?? latestDailyMonth ?? DateTime.UtcNow.ToString("yyyy-MM");
            }
        }

        var result = new EligibilityResult { EvaluationMonth = month };

        // Rule 1: Discipline check (monthly only)
        // A discipline issue should affect ONLY the month it was recorded — next month is clean slate.
        if (DateTime.TryParseExact(month, "yyyy-MM", null, System.Globalization.DateTimeStyles.None, out var evaluationDate))
        {
            var startOfMonth = new DateTime(evaluationDate.Year, evaluationDate.Month, 1);
            var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

            if (student.DisciplineRecords.Any(r => r.RecordedDate >= startOfMonth && r.RecordedDate <= endOfMonth))
            {
                // Determine the scholarship type for the message even before the full eligibility check
                var preApprovedForMsg = await _context.GovernmentScholarshipLists
                    .FirstOrDefaultAsync(g =>
                        (g.RegistrationNumber == student.RegistrationNumber || g.NIC == student.NIC) &&
                        (g.Status == "Assigned" || g.Status == "Provisioned"),
                        cancellationToken);
                var schType = preApprovedForMsg?.ScholarshipType ?? "Mahapola / Bursary";

                result.HasDisciplineIssue = true;
                result.IsEligible = false;
                result.ScholarshipType = schType;
                result.EvaluationMonth = month;
                result.RejectionReasons.Add($"Disciplinary action recorded for {month}");
                result.Message = $"Not Eligible: A disciplinary issue was recorded for {month}. Your {schType} scholarship is suspended for this month only. Meet Assistant Registrar for more details.";
                return result; // Return immediately — discipline suspends only this month
            }
        }

        // Rule 3: Government Approval List check (Replaces old income check)
        var preApproved = await _context.GovernmentScholarshipLists
            .FirstOrDefaultAsync(g =>
                (g.RegistrationNumber == student.RegistrationNumber || g.NIC == student.NIC) &&
                (g.Status == "Assigned" || g.Status == "Provisioned"),
                cancellationToken);

        if (preApproved != null && !string.IsNullOrEmpty(preApproved.ScholarshipType))
        {
            result.ScholarshipType = preApproved.ScholarshipType;
        }
        else
        {
            var isPending = await _context.GovernmentScholarshipLists.AnyAsync(g => g.RegistrationNumber == student.RegistrationNumber || g.NIC == student.NIC, cancellationToken);
            result.IsEligible = false;
            result.RejectionReasons.Add(isPending ? "Scholarship type assignment pending by university staff" : "Record not found in MIS Student Access List");
            result.Message = isPending ? "Your scholarship type assignment is currently pending staff review in the MIS Access Hub." : "You are not included in the MIS Student Access List. Please contact the administration.";
            return result;
        }

        // Rule 2: Attendance check
        var monthlyAttendance = await GetMonthlyAttendancePercentageAsync(studentId, month, cancellationToken);
        
        if (!monthlyAttendance.HasValue)
        {
            result.IsEligible = true; // Assume eligible if records are just missing (e.g. new student)
            result.AttendancePercentage = 100; // Mock 100% for new students to pass checks
            result.Message = $"You are eligible for {result.ScholarshipType} Scholarship (Attendance Pending)";
            return result;
        }

        result.AttendancePercentage = monthlyAttendance.Value;

        if (monthlyAttendance.Value < ScholarshipConstants.AttendanceMinimum)
        {
            result.IsEligible = false;
            result.RejectionReasons.Add($"Monthly attendance ({monthlyAttendance.Value:F1}%) is below 80%");
            result.Message = $"Not Eligible: {month} attendance ({monthlyAttendance.Value:F1}%) is below the required 80%.";
            return result;
        }

        result.IsEligible = true;
            result.Message = $"Your {result.ScholarshipType} scholarship account is active.";
        return result;
    }

    private async Task<decimal?> GetMonthlyAttendancePercentageAsync(int studentId, string? month = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(month))
        {
            var now = DateTime.UtcNow;
            month = $"{now.Year}-{now.Month:D2}";
        }
        
        var monthlyRecord = await _context.MonthlyAttendances
            .FirstOrDefaultAsync(m => m.StudentId == studentId && m.Month == month, cancellationToken);
            
        if (monthlyRecord != null)
            return monthlyRecord.Percentage;

        // Fallback to daily calculations if no monthly record exists
        if (!DateTime.TryParseExact(month, "yyyy-MM", null, System.Globalization.DateTimeStyles.None, out var targetDate))
        {
            targetDate = DateTime.UtcNow;
        }

        var startOfMonth = new DateTime(targetDate.Year, targetDate.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var attendances = await _context.Attendances
            .Where(a => a.StudentId == studentId && a.Date >= startOfMonth && a.Date <= endOfMonth)
            .ToListAsync(cancellationToken);

        if (attendances.Count == 0)
            return null; // No attendance data at all for this month

        var presentCount = attendances.Count(a => a.Status.Equals("Present", StringComparison.OrdinalIgnoreCase));
        return (decimal)presentCount / attendances.Count * 100;
    }
}
