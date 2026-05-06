using Microsoft.Extensions.DependencyInjection;
using ScholarshipManagement.Application.Interfaces;
using ScholarshipManagement.Application.Services;

namespace ScholarshipManagement.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IEligibilityService, EligibilityService>();
        return services;
    }
}
