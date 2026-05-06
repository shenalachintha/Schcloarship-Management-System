using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using ScholarshipManagement.Application.Interfaces;

namespace ScholarshipManagement.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendStudentCredentialsAsync(string toEmail, string studentName, string username, string password)
    {
        var smtpHost = _config["Smtp:Host"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_config["Smtp:Port"] ?? "587");
        var smtpUser = _config["Smtp:Username"] ?? "";
        var smtpPass = _config["Smtp:Password"] ?? "";
        var fromName = _config["Smtp:FromName"] ?? "Scholarship Management System";

        var subject = "Your Scholarship Portal Account Has Been Created";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
  <style>
    body {{ font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 40px 32px; text-align: center; }}
    .header h1 {{ color: white; margin: 0; font-size: 24px; font-weight: 800; }}
    .header p {{ color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px; }}
    .body {{ padding: 40px 32px; }}
    .body p {{ color: #475569; line-height: 1.7; font-size: 15px; }}
    .credentials {{ background: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0; }}
    .credentials h3 {{ margin: 0 0 16px; color: #1E293B; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; }}
    .cred-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E2E8F0; }}
    .cred-row:last-child {{ border-bottom: none; }}
    .cred-label {{ color: #94A3B8; font-size: 13px; font-weight: 600; }}
    .cred-value {{ color: #1E293B; font-size: 13px; font-weight: 800; font-family: monospace; }}
    .footer {{ background: #F8FAFC; padding: 24px 32px; text-align: center; }}
    .footer p {{ color: #94A3B8; font-size: 12px; margin: 4px 0; }}
    .warning {{ background: #FFF7ED; border-left: 4px solid #F97316; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-size: 13px; color: #7C2D12; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>🎓 Scholarship Portal</h1>
      <p>University Scholarship Management System</p>
    </div>
    <div class='body'>
      <p>Dear <strong>{studentName}</strong>,</p>
      <p>Congratulations! Your scholarship has been confirmed and a portal account has been created for you. You can now log in to view your scholarship details, payment history, and attendance records.</p>
      
      <div class='credentials'>
        <h3>Your Login Credentials</h3>
        <div class='cred-row'>
          <span class='cred-label'>Username</span>
          <span class='cred-value'>{username}</span>
        </div>
        <div class='cred-row'>
          <span class='cred-label'>Temporary Password</span>
          <span class='cred-value'>{password}</span>
        </div>
      </div>

      <div class='warning'>
        ⚠️ For security, please change your password after your first login.
      </div>

      <p>You can now sign in to the scholarship portal using the credentials above.</p>
    </div>
    <div class='footer'>
      <p>This is an automated message from the University Scholarship Management System.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>";

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(smtpUser, smtpPass)
        };

        var mail = new MailMessage
        {
            From = new MailAddress(smtpUser, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        mail.To.Add(toEmail);

        await client.SendMailAsync(mail);
    }
}
