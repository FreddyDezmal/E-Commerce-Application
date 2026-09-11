using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ECommerceApi.Data;

/* 
 Design-time factory used ONLY by EF Core CLI tools (`dotnet ef
 migrations add`, `dotnet ef database update`).

 This exists because Program.cs's minimal-hosting builder reads
 configuration and throws if ConnectionStrings:DefaultConnection is
 missing, which is the right behavior for the *running app* (fail
 fast on missing config), but design-time tooling
 invokes the app differently and does not reliably set
 ASPNETCORE_ENVIRONMENT=Development in the invoking shell, so
 appsettings.Development.json often doesn't get picked up and the app
 throws before EF's tooling ever gets a chance to build a migration.

 This factory reads configuration directly and independently of
 Program.cs, so `dotnet ef` commands work regardless of the calling
 shell's environment variable state.
*/
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var basePath = AppContext.BaseDirectory;

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is not configured for design-time tools. " +
                "Confirm src/appsettings.Development.json exists (copy it from " +
                "appsettings.Development.example.json if not) and contains a real connection " +
                "string, then rebuild (`dotnet build`) so it gets copied to the output directory, " +
                "and retry the `dotnet ef` command. Alternatively, set the " +
                "ConnectionStrings__DefaultConnection environment variable directly.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
