using ECommerceApi.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceApi.Tests.Integration;

/// <summary>
/// Swaps the real PostgreSQL-backed AppDbContext for an EF Core InMemory
/// database so integration tests can run without a live PostgreSQL
/// instance.
///
/// ⚠️ Documented trade-off (Milestone 2 §35 explicitly warns against
/// this): InMemory does NOT enforce PostgreSQL-specific behavior — CHECK
/// constraints, unique-index race conditions, decimal(10,2) precision,
/// and EF.Functions.ILike all behave differently or not at all under
/// InMemory. These tests therefore verify HTTP-layer wiring (routing,
/// auth/authorization, validation, status codes) — NOT Postgres-specific
/// correctness. The unit tests (Tests/Unit/Services) already cover the
/// business rules that matter without touching a database at all; a
/// separate, real-PostgreSQL-backed test run is still required before
/// trusting this API in production (see README "Known Limitations").
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    // Set via environment variables rather than relying solely on
    // ConfigureWebHost's ConfigureAppConfiguration hook: Program.cs reads
    // configuration and throws eagerly (by design — "fail fast on missing
    // config" per Milestone 2 §10) BEFORE builder.Build() is called, and
    // WebApplicationBuilder.CreateBuilder() already wires in environment
    // variables as a configuration source from the very start. This
    // avoids depending on exactly when ConfigureWebHost's own config
    // overrides get merged relative to Program.cs's top-level statements
    // for the minimal-hosting model.
    static CustomWebApplicationFactory()
    {
        Environment.SetEnvironmentVariable(
            "ConnectionStrings__DefaultConnection",
            "Host=localhost;Database=unused;Username=unused;Password=unused");
        Environment.SetEnvironmentVariable("Jwt__Key", "integration-test-only-secret-key-not-for-real-use-32chars");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "TestIssuer");
        Environment.SetEnvironmentVariable("Jwt__Audience", "TestAudience");
        Environment.SetEnvironmentVariable("Jwt__ExpiryMinutes", "60");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            // IMPORTANT: the database name must be computed ONCE, outside
            // the options lambda. AddDbContext registers DbContextOptions
            // as Scoped by default, which means the lambda passed to
            // UseInMemoryDatabase(...) is re-invoked on every new DI scope
            // — i.e. on every HTTP request. Calling Guid.NewGuid() *inside*
            // the lambda (the original bug here) silently gave every
            // request its own empty database, so nothing ever appeared to
            // persist across requests (register "succeeded" against an
            // empty DB, then login immediately after saw a different,
            // equally empty DB). Capturing a fixed name in a local variable
            // and referencing it from the closure fixes this: every scope
            // resolves DbContextOptions pointing at the same named
            // in-memory database for this factory's lifetime.
            var databaseName = $"integration-tests-{Guid.NewGuid()}";
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(databaseName));
        });
    }
}
