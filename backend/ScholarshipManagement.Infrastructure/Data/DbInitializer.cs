using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ScholarshipManagement.Domain.Entities;

namespace ScholarshipManagement.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        await context.Database.MigrateAsync();

        // Ensure the specific admin exists
        var adminEmail = "shenalachintha8@gmail.com";
        var adminExists = await context.Users.AnyAsync(u => u.Username == adminEmail);

        if (!adminExists)
        {
            // Remove old admins to enforce single admin policy
            var oldAdmins = await context.Users.Where(u => u.Role == "Admin").ToListAsync();
            context.Users.RemoveRange(oldAdmins);

            var adminPass = "ShenalAdmin@2026";
            var adminHash = BCrypt.Net.BCrypt.HashPassword(adminPass);

            context.Users.Add(new User 
            { 
                Username = adminEmail, 
                PasswordHash = adminHash, 
                Role = "Admin", 
                Name = "Shenal Chintha",
                CreatedAt = DateTime.UtcNow 
            });
            
            await context.SaveChangesAsync();
        }

        // Ensure at least one staff exists for testing
        if (!await context.Users.AnyAsync(u => u.Role == "Staff"))
        {
            var staffHash = BCrypt.Net.BCrypt.HashPassword("staff123");
            context.Users.Add(new User 
            { 
                Username = "staff1", 
                PasswordHash = staffHash, 
                Role = "Staff", 
                Name = "Academic Staff", 
                IsApproved = true,
                CreatedAt = DateTime.UtcNow 
            });
            await context.SaveChangesAsync();
        }
        // CLEANUP: Remove any students that were auto-synced without a user account
        var profileOnlyStudents = await context.Students.Where(s => s.UserId == null).ToListAsync();
        if (profileOnlyStudents.Any())
        {
            context.Students.RemoveRange(profileOnlyStudents);
            await context.SaveChangesAsync();
        }
    }
}
