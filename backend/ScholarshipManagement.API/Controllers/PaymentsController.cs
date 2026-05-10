using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Constants;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class PaymentsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IEligibilityService _eligibilityService;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;

    public PaymentsController(
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

    [HttpGet("eligible")]
    public async Task<IActionResult> GetEligibleStudents([FromQuery] string month, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(month))
            month = $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Month:D2}";

        var students = await _context.Students
            .Include(s => s.User)
            .Where(s => s.UserId != null)
            .ToListAsync(cancellationToken);

        var eligibleList = new List<object>();

        foreach (var student in students)
        {
            var eligibility = await _eligibilityService.CheckEligibilityAsync(student.StudentId, month, cancellationToken);
            if (!eligibility.IsEligible || string.IsNullOrEmpty(eligibility.ScholarshipType))
                continue;

            // Find an active scholarship or assume one will be created
            var scholarship = await _context.Scholarships
                .FirstOrDefaultAsync(s => s.StudentId == student.StudentId && s.Type == eligibility.ScholarshipType && s.Status == ScholarshipConstants.StatusActive, cancellationToken);

            int remainingMonths = scholarship?.RemainingMonths ?? 
                (eligibility.ScholarshipType == ScholarshipConstants.ScholarshipTypeMahapola ? ScholarshipConstants.MahapolaDurationMonths : ScholarshipConstants.BursaryDurationMonths);

            if (remainingMonths <= 0)
                continue;

            var existingPayment = await _context.Payments
                .FirstOrDefaultAsync(p => p.StudentId == student.StudentId && p.Month == month, cancellationToken);

            var amount = eligibility.ScholarshipType == ScholarshipConstants.ScholarshipTypeMahapola ? ScholarshipConstants.MahapolaAmount : ScholarshipConstants.BursaryAmount;

            var paymentStatus = existingPayment?.PaymentStatus ?? ScholarshipConstants.StatusPending;
            if (paymentStatus != ScholarshipConstants.StatusPending)
                continue;

            eligibleList.Add(new
            {
                student.StudentId,
                student.RegistrationNumber,
                student.Name,
                ScholarshipType = eligibility.ScholarshipType,
                Amount = amount,
                RemainingMonths = remainingMonths,
                PaymentStatus = paymentStatus,
                PaymentId = existingPayment?.PaymentId
            });
        }

        return Ok(eligibleList);
    }

    [HttpPost("approve")]
    public async Task<IActionResult> ApprovePayment([FromBody] ApprovePaymentRequest request, CancellationToken cancellationToken)
    {
        var student = await _context.Students.FindAsync(new object[] { request.StudentId }, cancellationToken);
        if (student == null)
            return NotFound();

        var amount = request.ScholarshipType == ScholarshipConstants.ScholarshipTypeMahapola ? ScholarshipConstants.MahapolaAmount : ScholarshipConstants.BursaryAmount;

        var existing = await _context.Payments
            .FirstOrDefaultAsync(p => p.StudentId == request.StudentId && p.Month == request.Month, cancellationToken);

        if (existing != null)
        {
            if (existing.PaymentStatus == ScholarshipConstants.StatusProcessed)
                return BadRequest(new { message = $"Payment for {request.Month} has already been processed." });
                
            if (existing.PaymentStatus == ScholarshipConstants.StatusRejected)
                return BadRequest(new { message = $"Payment for {request.Month} was previously rejected and cannot be approved." });

            existing.PaymentStatus = ScholarshipConstants.StatusProcessed;
            existing.ProcessedAt = DateTime.UtcNow;
            existing.ProcessedBy = User.Identity?.Name ?? "Admin";
        }
        else
        {
            _context.Payments.Add(new Domain.Entities.Payment
            {
                StudentId = request.StudentId,
                Amount = amount,
                Month = request.Month,
                PaymentStatus = ScholarshipConstants.StatusProcessed,
                ScholarshipType = request.ScholarshipType,
                ProcessedAt = DateTime.UtcNow,
                ProcessedBy = User.Identity?.Name ?? "Admin"
            });
        }

        var scholarship = await _context.Scholarships
            .FirstOrDefaultAsync(s => s.StudentId == request.StudentId && s.Type == request.ScholarshipType, cancellationToken);
            
        if (scholarship == null)
        {
            var duration = request.ScholarshipType == ScholarshipConstants.ScholarshipTypeMahapola
                ? ScholarshipConstants.MahapolaDurationMonths
                : ScholarshipConstants.BursaryDurationMonths;
                
            scholarship = new Domain.Entities.Scholarship
            {
                StudentId = request.StudentId,
                Type = request.ScholarshipType,
                Status = ScholarshipConstants.StatusActive,
                DurationMonths = duration,
                RemainingMonths = duration,
                StartDate = DateTime.UtcNow
            };
            _context.Scholarships.Add(scholarship);
        }
        
        if (scholarship.Status == ScholarshipConstants.StatusActive)
        {
            scholarship.RemainingMonths = Math.Max(0, scholarship.RemainingMonths - 1);
            scholarship.UpdatedAt = DateTime.UtcNow;
            if (scholarship.RemainingMonths == 0)
                scholarship.Status = ScholarshipConstants.StatusInactive;
        }

        var message = $"{request.ScholarshipType} payment credited: Rs {amount} for {request.Month}. Remaining payments: {scholarship?.RemainingMonths ?? 0} months.";
        await _notificationService.CreateNotificationAsync(request.StudentId, message, "Payment", cancellationToken);

        await _auditService.LogAsync(
            "Payment Approved",
            $"Approved {request.ScholarshipType} payment of Rs {amount} for student {student.Name} ({student.RegistrationNumber}) for month {request.Month}.",
            "Payment",
            null,
            User.Identity?.Name ?? "Admin",
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Payment processed successfully" });
    }

    [HttpPost("bulk-approve")]
    public async Task<IActionResult> BulkApprovePayments([FromBody] List<ApprovePaymentRequest> requests, CancellationToken cancellationToken)
    {
        if (requests == null || !requests.Any())
            return BadRequest(new { message = "No payment requests provided." });

        int successCount = 0;
        var errors = new List<string>();

        foreach (var request in requests)
        {
            try
            {
                var student = await _context.Students.FindAsync(new object[] { request.StudentId }, cancellationToken);
                if (student == null)
                {
                    errors.Add($"Student ID {request.StudentId} not found.");
                    continue;
                }

                var amount = request.ScholarshipType == ScholarshipConstants.ScholarshipTypeMahapola
                    ? ScholarshipConstants.MahapolaAmount
                    : ScholarshipConstants.BursaryAmount;

                var existing = await _context.Payments
                    .FirstOrDefaultAsync(p => p.StudentId == request.StudentId && p.Month == request.Month, cancellationToken);

                if (existing != null)
                {
                    if (existing.PaymentStatus == ScholarshipConstants.StatusProcessed)
                        continue; // Already processed, skip
                    if (existing.PaymentStatus == ScholarshipConstants.StatusRejected)
                        continue; // Previously rejected, skip

                    existing.PaymentStatus = ScholarshipConstants.StatusProcessed;
                    existing.ProcessedAt = DateTime.UtcNow;
                    existing.ProcessedBy = User.Identity?.Name ?? "Admin";
                }
                else
                {
                    _context.Payments.Add(new Domain.Entities.Payment
                    {
                        StudentId = request.StudentId,
                        Amount = amount,
                        Month = request.Month,
                        PaymentStatus = ScholarshipConstants.StatusProcessed,
                        ScholarshipType = request.ScholarshipType,
                        ProcessedAt = DateTime.UtcNow,
                        ProcessedBy = User.Identity?.Name ?? "Admin"
                    });
                }

                // Handle scholarship tracking
                var scholarship = await _context.Scholarships
                    .FirstOrDefaultAsync(s => s.StudentId == request.StudentId && s.Type == request.ScholarshipType, cancellationToken);

                if (scholarship == null)
                {
                    var duration = request.ScholarshipType == ScholarshipConstants.ScholarshipTypeMahapola
                        ? ScholarshipConstants.MahapolaDurationMonths
                        : ScholarshipConstants.BursaryDurationMonths;

                    scholarship = new Domain.Entities.Scholarship
                    {
                        StudentId = request.StudentId,
                        Type = request.ScholarshipType,
                        Status = ScholarshipConstants.StatusActive,
                        DurationMonths = duration,
                        RemainingMonths = duration,
                        StartDate = DateTime.UtcNow
                    };
                    _context.Scholarships.Add(scholarship);
                }

                if (scholarship.Status == ScholarshipConstants.StatusActive)
                {
                    scholarship.RemainingMonths = Math.Max(0, scholarship.RemainingMonths - 1);
                    scholarship.UpdatedAt = DateTime.UtcNow;
                    if (scholarship.RemainingMonths == 0)
                        scholarship.Status = ScholarshipConstants.StatusInactive;
                }

                var message = $"{request.ScholarshipType} payment credited: Rs {amount} for {request.Month}. Remaining payments: {scholarship?.RemainingMonths ?? 0} months.";
                await _notificationService.CreateNotificationAsync(request.StudentId, message, "Payment", cancellationToken);

                await _auditService.LogAsync(
                    "Payment Approved",
                    $"Bulk approved {request.ScholarshipType} payment of Rs {amount} for student {student.Name} ({student.RegistrationNumber}) for month {request.Month}.",
                    "Payment",
                    null,
                    User.Identity?.Name ?? "Admin",
                    cancellationToken);

                successCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"Failed for student ID {request.StudentId}: {ex.Message}");
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Successfully processed {successCount} of {requests.Count} payments.", successCount, errors });
    }

    [HttpPost("reject")]
    public async Task<IActionResult> RejectPayment([FromBody] RejectPaymentRequest request, CancellationToken cancellationToken)
    {
        var existing = await _context.Payments
            .FirstOrDefaultAsync(p => p.PaymentId == request.PaymentId, cancellationToken);
        if (existing != null)
        {
            if (existing.PaymentStatus == ScholarshipConstants.StatusProcessed)
                return BadRequest(new { message = "Cannot reject a payment that has already been processed." });

            existing.PaymentStatus = ScholarshipConstants.StatusRejected;
            await _notificationService.CreateNotificationAsync(
                existing.StudentId,
                $"Scholarship payment rejected for {existing.Month}.",
                "Rejection",
                cancellationToken);

            await _auditService.LogAsync(
                "Payment Rejected",
                $"Rejected payment for student ID {existing.StudentId} for month {existing.Month}.",
                "Payment",
                existing.PaymentId.ToString(),
                User.Identity?.Name ?? "Admin",
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Payment rejected" });
    }
}

public class ApprovePaymentRequest
{
    public int StudentId { get; set; }
    public string Month { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
}

public class RejectPaymentRequest
{
    public int PaymentId { get; set; }
}
