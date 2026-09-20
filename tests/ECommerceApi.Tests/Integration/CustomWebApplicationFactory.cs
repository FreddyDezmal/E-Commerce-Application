using ECommerceApi.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceApi.Tests.Integration;

// Swaps the real PostgreSQL-backed AppDbContext for an EF Core InMemory database so integration tests can run without a live PostgreSQL instance.
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    static CustomWebApplicationFactory()
    {
        Environment.SetEnvironmentVariable(
            "ConnectionStrings__DefaultConnection",
            "Host=localhost;Database=unused;Username=unused;Password=unused");
        Environment.SetEnvironmentVariable("Jwt__Key", "integration-test-only-secret-key-not-for-real-use-32chars");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "TestIssuer");
        Environment.SetEnvironmentVariable("Jwt__Audience", "TestAudience");
        Environment.SetEnvironmentVariable("Jwt__ExpiryMinutes", "60");
        // The auth endpoints are rate limited per IP. Every test request arrives
        // from the same loopback address, so the production limit would throttle
        // the suite itself. Raised here only, never in a real deployment.
        Environment.SetEnvironmentVariable("RateLimiting__AuthPermitLimit", "100000");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Development so ExceptionHandlingMiddleware includes the real exception
        // message in 500 responses. Under "Test" every server-side failure came
        // back as a bare "An unexpected error occurred", which made the functional
        // tests impossible to diagnose from their output alone.
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }
            var databaseName = $"integration-tests-{Guid.NewGuid()}";
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(databaseName)
                    /* Checkout wraps its work in a real transaction
                       (OrderRepository.CreateFromCartAsync). The InMemory provider
                       has no transaction support and throws on BeginTransaction by
                       default, which surfaced as a 500 from POST /api/orders.
                       Ignoring the warning makes it a no-op so the rest of the
                       journey is exercised. NOTE: atomicity itself is therefore NOT
                       covered by these tests -- it needs a real PostgreSQL run. */
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        });
    }
}
