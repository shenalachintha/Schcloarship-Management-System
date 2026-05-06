namespace ScholarshipManagement.Application.Interfaces;

public interface IEmailService
{
    Task SendStudentCredentialsAsync(string toEmail, string studentName, string username, string password);
}
