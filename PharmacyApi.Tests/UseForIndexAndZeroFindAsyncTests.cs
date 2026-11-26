using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-15 invariants:
/// - Zero `.FindAsync(` calls remain anywhere across Controllers, Repositories, Services, Data, or Filters
/// - Master data & domain repositories cannot serve pre-tracked ChangeTracker entities across tenants
/// - UseFor model registers composite unique indexes on (TenantId, Code) and (TenantId, Name)
/// </summary>
public class UseForIndexAndZeroFindAsyncTests
{
    private sealed class MutableTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

    private static ApplicationDbContext CreateDb(ITenantContextService ctx, string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options, ctx);
    }

    private static string FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "PharmacyApi.csproj")))
            dir = dir.Parent;

        Assert.NotNull(dir);
        return dir!.FullName;
    }

    [Fact]
    public void NoFindAsyncCallsRemain_AcrossProductionCode()
    {
        var root = FindRepositoryRoot();
        var dirs = new[] { "Controllers", "Repositories", "Services", "Data", "Filters" }
            .Select(d => Path.Combine(root, d))
            .Where(Directory.Exists);

        var violations = new List<string>();
        foreach (var dir in dirs)
        {
            foreach (var file in Directory.GetFiles(dir, "*.cs", SearchOption.AllDirectories))
            {
                var lines = File.ReadAllLines(file);
                for (int i = 0; i < lines.Length; i++)
                {
                    var trimmed = lines[i].TrimStart();
                    if (trimmed.StartsWith("//") || trimmed.StartsWith("*"))
                        continue;

                    if (trimmed.Contains(".FindAsync(", StringComparison.Ordinal))
                    {
                        var rel = Path.GetRelativePath(root, file);
                        violations.Add($"{rel}:{i + 1} calls .FindAsync()");
                    }
                }
            }
        }

        Assert.True(violations.Count == 0,
            "Disallowed .FindAsync() usage found:\n" + string.Join("\n", violations));
    }

    [Fact]
    public void UseForModel_DefinesTenantScopedCompositeUniqueIndexes_ForCodeAndName()
    {
        var ctx = new MutableTenantContext { TenantId = 1 };
        using var db = CreateDb(ctx, Guid.NewGuid().ToString());

        var entity = db.Model.FindEntityType(typeof(UseFor));
        Assert.NotNull(entity);

        var indexes = entity!.GetIndexes().ToList();
        Assert.Contains(indexes, idx =>
            idx.IsUnique &&
            idx.Properties.Select(p => p.Name).SequenceEqual(new[] { "TenantId", "Code" }));
        Assert.Contains(indexes, idx =>
            idx.IsUnique &&
            idx.Properties.Select(p => p.Name).SequenceEqual(new[] { "TenantId", "Name" }));
    }

    [Fact]
    public async Task TrackedCrossTenantEntities_AreNeverServedByFirstOrDefaultQueries()
    {
        var dbName = Guid.NewGuid().ToString();
        var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
        await using (var seed = CreateDb(seedCtx, dbName))
        {
            seed.Categories.Add(new Category { CategoryId = 20, TenantId = 2, Code = "CAT-T2", Name = "T2 Secret Cat" });
            seed.UseFors.Add(new UseFor { UseForId = 30, TenantId = 2, Code = "USF-T2", Name = "T2 Fever" });
            seed.Parties.Add(new Party { PartyId = 40, TenantId = 2, Code = "SUP-T2", PartyType = "Supplier", FullName = "T2 Supplier", Cell = "01700000000" });
            seed.Medicines.Add(new Medicine { MedicineId = 50, TenantId = 2, Code = "MED-T2", Name = "T2 Med", SalePrice = 10m });
            await seed.SaveChangesAsync();
        }

        var t1Ctx = new MutableTenantContext { TenantId = 1 };
        await using var db = CreateDb(t1Ctx, dbName);

        // Pre-populate ChangeTracker with Tenant 2 rows via IgnoreQueryFilters() — FindAsync() used to leak these
        Assert.NotEmpty(await db.Categories.IgnoreQueryFilters().ToListAsync());
        Assert.NotEmpty(await db.UseFors.IgnoreQueryFilters().ToListAsync());
        Assert.NotEmpty(await db.Parties.IgnoreQueryFilters().ToListAsync());
        Assert.NotEmpty(await db.Medicines.IgnoreQueryFilters().ToListAsync());

        var catRepo = new CategoryRepository(db);
        var usfRepo = new UseForRepository(db);
        var partyRepo = new PartyRepository(db);
        var medRepo = new MedicineRepository(db);

        Assert.Null(await catRepo.GetByIdAsync(20));
        Assert.False(await catRepo.UpdateAsync(20, new CategoryDto { Code = "X", Name = "Hacked" }));
        Assert.False(await catRepo.DeleteAsync(20));

        Assert.Null(await usfRepo.GetByIdAsync(30));
        Assert.False(await usfRepo.UpdateAsync(30, new UseForDto { Code = "X", Name = "Hacked" }));
        Assert.False(await usfRepo.DeleteAsync(30));

        Assert.Null(await partyRepo.GetByIdAsync(40));
        Assert.False(await partyRepo.UpdateAsync(40, new PartyDto { Code = "X", PartyType = "Supplier", FullName = "Hacked", Cell = "01711111111" }));
        Assert.False(await partyRepo.DeleteAsync(40));

        Assert.Null(await medRepo.GetByIdAsync(50));
        Assert.False(await medRepo.UpdateAsync(50, new MedicineDto { Name = "Hacked", SalePrice = 1m }, "t1admin"));
        Assert.False(await medRepo.DeleteAsync(50));
    }

    [Fact]
    public async Task UseFor_AllowsSameCodeAndNameAcrossDifferentTenants()
    {
        var dbName = Guid.NewGuid().ToString();
        var t1Ctx = new MutableTenantContext { TenantId = 1 };
        await using (var db1 = CreateDb(t1Ctx, dbName))
        {
            var repo1 = new UseForRepository(db1);
            var created1 = await repo1.CreateAsync(new UseForDto { Name = "Pain Relief", Remarks = "T1" });
            Assert.Equal("USF0001", created1.Code);
        }

        var t2Ctx = new MutableTenantContext { TenantId = 2 };
        await using var db2 = CreateDb(t2Ctx, dbName);
        var repo2 = new UseForRepository(db2);
        var created2 = await repo2.CreateAsync(new UseForDto { Name = "Pain Relief", Remarks = "T2" });
        Assert.Equal("USF0001", created2.Code);
    }
}
