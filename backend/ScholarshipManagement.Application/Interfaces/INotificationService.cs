namespace ScholarshipManagement.Application.Interfaces;

public interface INotificationService
{
    Task CreateNotificationAsync(int studentId, string message, string type, CancellationToken cancellationToken = default);
}
