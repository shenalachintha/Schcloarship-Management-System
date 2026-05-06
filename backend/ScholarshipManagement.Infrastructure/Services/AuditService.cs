using System;
using System.Threading;
using System.Threading.Tasks;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Entities;

namespace ScholarshipManagement.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IApplicationDbContext _context;

    public AuditService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(string action, string details, string entityName, string? entityId = null, string performedBy = "System", CancellationToken cancellationToken = default)
    {
        var log = new AuditLog
        {
            Action = action,
            Details = details,
            EntityName = entityName,
            EntityId = entityId,
            PerformedBy = performedBy,
            PerformedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
