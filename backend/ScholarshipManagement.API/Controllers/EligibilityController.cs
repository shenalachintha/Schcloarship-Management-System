using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScholarshipManagement.Application.Interfaces;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EligibilityController : ControllerBase
{
    private readonly IEligibilityService _eligibilityService;

    public EligibilityController(IEligibilityService eligibilityService)
    {
        _eligibilityService = eligibilityService;
    }

    [HttpGet("student/{studentId}")]
    [Authorize(Roles = "Student,Staff,Admin")]
    public async Task<IActionResult> CheckEligibility(int studentId, [FromQuery] string? month, CancellationToken cancellationToken)
    {
        var result = await _eligibilityService.CheckEligibilityAsync(studentId, month, cancellationToken);
        return Ok(result);
    }
}
