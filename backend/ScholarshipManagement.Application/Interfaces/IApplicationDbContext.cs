using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Domain.Entities;

namespace ScholarshipManagement.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Student> Students { get; }
    DbSet<Attendance> Attendances { get; }
    DbSet<Scholarship> Scholarships { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<DisciplineRecord> DisciplineRecords { get; }
    DbSet<MonthlyAttendance> MonthlyAttendances { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<GovernmentScholarshipList> GovernmentScholarshipLists { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
