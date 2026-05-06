using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Entities;

namespace ScholarshipManagement.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _context;

    public NotificationService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task CreateNotificationAsync(int studentId, string message, string type, CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            StudentId = studentId,
            Message = message,
            Type = type,
            IsRead = false,
            CreatedDate = DateTime.UtcNow
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
