using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using PharmacyApi.Services;

namespace PharmacyApi.Data
{
    // ARCHITECTURAL INTENT: This factory is ONLY used by EF Core design-time tooling
    // (dotnet ef migrations add, dotnet ef database update).
    // At design time, there is no HTTP request, so ITenantContextService cannot be
    // resolved from DI. We provide a NoOpTenantContextService that acts as SystemAdmin
    // (IsSystemAdmin=true, TenantId=null, BranchId=null) — this bypasses all Global
    // Query Filters during migration generation (correct behavior: migrations must see ALL tables).
    // NEVER use this factory in production code.
    public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            // Read connection string from environment or appsettings.json
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddEnvironmentVariables()
                .Build();

            var connectionString = config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("PLACEHOLDER"))
            {
                connectionString = "Server=(localdb)\\mssqllocaldb; Database=PharmacyDb; Trusted_Connection=True; MultipleActiveResultSets=True; Encrypt=False;";
            }

            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseSqlServer(connectionString);

            // Design-time: bypass all tenant filters (SystemAdmin view)
            var noOpContext = new DesignTimeTenantContext();
            return new ApplicationDbContext(optionsBuilder.Options, noOpContext);
        }
    }

    /// <summary>
    /// No-op ITenantContextService for design-time only.
    /// IsSystemAdmin = true → all Global Query Filters are disabled → migrations see full schema.
    /// </summary>
    internal class DesignTimeTenantContext : ITenantContextService
    {
        public int?  TenantId             => null;
        public int?  BranchId             => null;
        public bool  IsSystemAdmin         => true;
        public bool  CanAccessAllBranches  => true;
    }
}
