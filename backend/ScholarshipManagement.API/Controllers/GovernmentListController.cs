using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Entities;

namespace ScholarshipManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class GovernmentListController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public GovernmentListController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var list = await _context.GovernmentScholarshipLists.ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Add([FromBody] GovernmentScholarshipList item, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(item.RegistrationNumber) && await _context.GovernmentScholarshipLists.AnyAsync(g => g.RegistrationNumber == item.RegistrationNumber, cancellationToken))
            return BadRequest(new { message = "Registration Number already exists in the list" });

        if (!string.IsNullOrEmpty(item.NIC) && await _context.GovernmentScholarshipLists.AnyAsync(g => g.NIC == item.NIC, cancellationToken))
            return BadRequest(new { message = "NIC already exists in the list" });

        item.ApprovedDate = DateTime.UtcNow;
        item.Status = "Pending";
        _context.GovernmentScholarshipLists.Add(item);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(item);
    }

    [HttpPut("assign/{id}")]
    [Authorize(Roles = "Staff")]
    public async Task<IActionResult> Assign(int id, [FromBody] AssignRequest request, CancellationToken cancellationToken)
    {
        var item = await _context.GovernmentScholarshipLists.FindAsync(new object[] { id }, cancellationToken);
        if (item == null) return NotFound();

        item.ScholarshipType = request.ScholarshipType;
        item.Status = "Assigned";
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(item);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var item = await _context.GovernmentScholarshipLists.FindAsync(new object[] { id }, cancellationToken);
        if (item == null) return NotFound();

        _context.GovernmentScholarshipLists.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Removed from list" });
    }
}

public class AssignRequest
{
    public string ScholarshipType { get; set; } = string.Empty;
}
