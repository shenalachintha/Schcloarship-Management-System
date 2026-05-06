using Microsoft.EntityFrameworkCore;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Domain.Entities;

namespace ScholarshipManagement.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<Scholarship> Scholarships => Set<Scholarship>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<DisciplineRecord> DisciplineRecords => Set<DisciplineRecord>();
    public DbSet<MonthlyAttendance> MonthlyAttendances => Set<MonthlyAttendance>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<GovernmentScholarshipList> GovernmentScholarshipLists => Set<GovernmentScholarshipList>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.Username).HasMaxLength(100);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Faculty).HasMaxLength(100);
            entity.Property(e => e.Department).HasMaxLength(100);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.MobileNumber).HasMaxLength(20);
            entity.Property(e => e.NIC).HasMaxLength(20);
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(e => e.StudentId);
            entity.HasIndex(e => e.RegistrationNumber).IsUnique();
            entity.Property(e => e.RegistrationNumber).HasMaxLength(50);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.GPA).HasPrecision(3, 2);
            entity.Property(e => e.FamilyIncome).HasPrecision(18, 2);
            entity.HasOne(e => e.User)
                .WithOne(u => u.Student)
                .HasForeignKey<Student>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(e => e.AttendanceId);
            entity.Property(e => e.Status).HasMaxLength(20);
            entity.HasIndex(e => new { e.StudentId, e.Date }).IsUnique();
            entity.HasOne(e => e.Student)
                .WithMany(s => s.Attendances)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Scholarship>(entity =>
        {
            entity.HasKey(e => e.ScholarshipId);
            entity.Property(e => e.Type).HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(20);
            entity.HasOne(e => e.Student)
                .WithMany(s => s.Scholarships)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.PaymentId);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Month).HasMaxLength(10);
            entity.Property(e => e.PaymentStatus).HasMaxLength(20);
            entity.HasOne(e => e.Student)
                .WithMany(s => s.Payments)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId);
            entity.Property(e => e.Message).HasMaxLength(500);
            entity.Property(e => e.Type).HasMaxLength(50);
            entity.HasOne(e => e.Student)
                .WithMany(s => s.Notifications)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DisciplineRecord>(entity =>
        {
            entity.HasKey(e => e.DisciplineRecordId);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.HasOne(e => e.Student)
                .WithMany(s => s.DisciplineRecords)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MonthlyAttendance>(entity =>
        {
            entity.HasKey(e => e.MonthlyAttendanceId);
            entity.Property(e => e.Month).HasMaxLength(10);
            entity.Property(e => e.Percentage).HasPrecision(5, 2);
            entity.HasIndex(e => new { e.StudentId, e.Month }).IsUnique();
            entity.HasOne(e => e.Student)
                .WithMany(s => s.MonthlyAttendances)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.AuditLogId);
            entity.Property(e => e.Action).HasMaxLength(200);
            entity.Property(e => e.PerformedBy).HasMaxLength(200);
            entity.Property(e => e.EntityName).HasMaxLength(100);
            entity.Property(e => e.EntityId).HasMaxLength(50);
        });

        modelBuilder.Entity<GovernmentScholarshipList>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.NIC).IsUnique();
            entity.Property(e => e.NIC).HasMaxLength(50);
            entity.Property(e => e.ScholarshipType).HasMaxLength(50);
        });
    }
}
