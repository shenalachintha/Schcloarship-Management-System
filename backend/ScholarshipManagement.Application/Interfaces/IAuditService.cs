using System.Threading;
using System.Threading.Tasks;

namespace ScholarshipManagement.Application.Interfaces;

public interface IAuditService
{
    Task LogAsync(string action, string details, string entityName, string? entityId = null, string performedBy = "System", CancellationToken cancellationToken = default);
}
