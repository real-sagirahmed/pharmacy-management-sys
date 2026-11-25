using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.Models;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests locking GAP-12 invariants:
/// - AuthController.Login rejects inactive users, inactive tenants, expired subscriptions, and inactive branches with 403 and no cookie
/// - SubscriptionExpiry is inclusive through end-of-day (BST) and SystemAdmin is never locked out by tenant state
/// - AuthController.ForgotPassword resolves Cors:AllowedOrigins array properly (and FrontendUrl override) without leaking localhost in Production
/// - Program startup admin promotion never grants the Tenant Admin role to SystemAdmin
/// </summary>
public class LoginAndStartupSeedTests
{
    private sealed class StubTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

    private sealed class SpyEmailService : IEmailService
    {
        public string? LastRecipient { get; private set; }
        public string? LastMessage { get; private set; }

        public Task SendEmailAsync(string email, string subject, string message)
        {
            LastRecipient = email;
            LastMessage = message;
            return Task.CompletedTask;
        }
    }

    private sealed class StubWebHostEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "PharmacyApi";
        public string WebRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static DateTime BdToday() =>
        TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time")).Date;

    private static ServiceProvider CreateProvider(string dbName)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddScoped<ITenantContextService>(_ => new StubTenantContext { IsSystemAdmin = true });
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseInMemoryDatabase(dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        return services.BuildServiceProvider();
    }

    private static AuthController CreateController(
        ServiceProvider provider,
        SpyEmailService emailSvc,
        string envName,
        Dictionary<string, string?>? extraConfig = null)
    {
        var cfgMap = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "Gap12UnitTestingSuperSecretKey_AtLeast32Chars!",
            ["Jwt:Issuer"] = "PharmacyApi",
            ["Jwt:Audience"] = "PharmacyClient",
            ["Cors:AllowedOrigins:0"] = "http://localhost:4200",
            ["Cors:AllowedOrigins:1"] = "https://pharmacymsys.runasp.net"
        };
        if (extraConfig != null)
        {
            foreach (var kv in extraConfig)
                cfgMap[kv.Key] = kv.Value;
        }

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(cfgMap)
            .Build();

        return new AuthController(
            provider.GetRequiredService<UserManager<ApplicationUser>>(),
            provider.GetRequiredService<RoleManager<IdentityRole>>(),
            config,
            emailSvc,
            provider.GetRequiredService<IUserManagementService>(),
            new StubWebHostEnvironment { EnvironmentName = envName })
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
    }

    [Theory]
    [InlineData(false, true, 30, true, "deactivated")]
    [InlineData(true, false, 30, true, "inactive or suspended")]
    [InlineData(true, true, -1, true, "subscription has expired")]
    [InlineData(true, true, 30, false, "branch is currently inactive")]
    public async Task Login_RejectsIneligibleUserTenantSubscriptionOrBranch_With403AndNoCookie(
        bool userActive,
        bool tenantActive,
        int subscriptionOffsetDays,
        bool branchActive,
        string expectedReasonFragment)
    {
        using var provider = CreateProvider(Guid.NewGuid().ToString());
        var db = provider.GetRequiredService<ApplicationDbContext>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();

        await roleMgr.CreateAsync(new IdentityRole("Cashier"));
        db.Tenants.Add(new Tenant
        {
            TenantId = 1,
            PharmacyName = "Test Pharmacy",
            IsActive = tenantActive,
            SubscriptionExpiry = BdToday().AddDays(subscriptionOffsetDays)
        });
        db.Branches.Add(new Branch
        {
            BranchId = 1,
            TenantId = 1,
            BranchName = "Main",
            IsHeadOffice = true,
            IsActive = branchActive
        });
        await db.SaveChangesAsync();

        var user = new ApplicationUser
        {
            UserName = "staff1",
            Email = "staff1@test.com",
            FullName = "Staff One",
            TenantId = 1,
            BranchId = 1,
            IsActive = userActive
        };
        Assert.True((await userMgr.CreateAsync(user, "Pass@123!")).Succeeded);
        await userMgr.AddToRoleAsync(user, "Cashier");

        var controller = CreateController(provider, new SpyEmailService(), Environments.Production);
        var result = await controller.Login(new LoginModel { Username = "staff1", Password = "Pass@123!" });

        var obj = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, obj.StatusCode);
        Assert.Contains(expectedReasonFragment, obj.Value?.ToString() ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, controller.Response.Headers.SetCookie.Count);
    }

    [Fact]
    public async Task Login_AllowsExpiryTodayInclusive_AndAllowsSystemAdminWhenTenantInactive_AndHidesStatusOnWrongPassword()
    {
        using var provider = CreateProvider(Guid.NewGuid().ToString());
        var db = provider.GetRequiredService<ApplicationDbContext>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();

        await roleMgr.CreateAsync(new IdentityRole("SystemAdmin"));
        await roleMgr.CreateAsync(new IdentityRole("Admin"));

        db.Tenants.AddRange(
            new Tenant { TenantId = 1, PharmacyName = "Suspended T1", IsActive = false },
            new Tenant { TenantId = 2, PharmacyName = "Expiring Today T2", IsActive = true, SubscriptionExpiry = BdToday() });
        await db.SaveChangesAsync();

        var sysAdmin = new ApplicationUser { UserName = "sys", Email = "sys@test.com", FullName = "Sys", IsActive = true };
        var ownerToday = new ApplicationUser { UserName = "owner2", Email = "o2@test.com", FullName = "Owner2", TenantId = 2, IsActive = true };
        Assert.True((await userMgr.CreateAsync(sysAdmin, "Pass@123!")).Succeeded);
        Assert.True((await userMgr.CreateAsync(ownerToday, "Pass@123!")).Succeeded);
        await userMgr.AddToRoleAsync(sysAdmin, "SystemAdmin");
        await userMgr.AddToRoleAsync(ownerToday, "Admin");

        var controller = CreateController(provider, new SpyEmailService(), Environments.Production);

        // 1. SystemAdmin succeeds even when Tenant 1 is inactive
        Assert.IsType<OkObjectResult>(await controller.Login(new LoginModel { Username = "sys", Password = "Pass@123!" }));

        // 2. Wrong password returns 401 Unauthorized (no status leak)
        var deactivatedUser = new ApplicationUser { UserName = "offuser", Email = "off@test.com", FullName = "Off", TenantId = 2, IsActive = false };
        Assert.True((await userMgr.CreateAsync(deactivatedUser, "Pass@123!")).Succeeded);
        Assert.IsType<UnauthorizedResult>(await controller.Login(new LoginModel { Username = "offuser", Password = "WrongPassword!" }));

        // 3. Tenant expiring today (inclusive) succeeds
        Assert.IsType<OkObjectResult>(await controller.Login(new LoginModel { Username = "owner2", Password = "Pass@123!" }));
    }

    [Fact]
    public async Task ForgotPassword_ResolvesProductionAndDevelopmentOriginsFromArray_AndExplicitFrontendUrl()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection();
        services.AddScoped<ITenantContextService>(_ => new StubTenantContext { IsSystemAdmin = true });
        services.AddDbContext<ApplicationDbContext>(opts => opts.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();
        services.AddScoped<IUserManagementService, UserManagementService>();
        using var tokenProvider = services.BuildServiceProvider();
        var tokUserMgr = tokenProvider.GetRequiredService<UserManager<ApplicationUser>>();
        Assert.True((await tokUserMgr.CreateAsync(new ApplicationUser { UserName = "u1", Email = "u1@test.com", FullName = "U1" }, "Pass@123!")).Succeeded);

        // 1. Production mode picks https://pharmacymsys.runasp.net from Cors:AllowedOrigins array (not localhost:4200)
        var prodSpy = new SpyEmailService();
        var prodCtrl = CreateController(tokenProvider, prodSpy, Environments.Production);
        await prodCtrl.ForgotPassword(new ForgotPasswordModel { Email = "u1@test.com" });
        Assert.NotNull(prodSpy.LastMessage);
        Assert.Contains("https://pharmacymsys.runasp.net/reset-password?", prodSpy.LastMessage, StringComparison.Ordinal);
        Assert.DoesNotContain("localhost", prodSpy.LastMessage, StringComparison.OrdinalIgnoreCase);

        // 2. Development mode picks loopback http://localhost:4200
        var devSpy = new SpyEmailService();
        var devCtrl = CreateController(tokenProvider, devSpy, Environments.Development);
        await devCtrl.ForgotPassword(new ForgotPasswordModel { Email = "u1@test.com" });
        Assert.Contains("http://localhost:4200/reset-password?", devSpy.LastMessage, StringComparison.Ordinal);

        // 3. Explicit FrontendUrl overrides array cleanly
        var customSpy = new SpyEmailService();
        var customCtrl = CreateController(tokenProvider, customSpy, Environments.Production,
            new Dictionary<string, string?> { ["FrontendUrl"] = "https://portal.custompharma.com/" });
        await customCtrl.ForgotPassword(new ForgotPasswordModel { Email = "u1@test.com" });
        Assert.Contains("https://portal.custompharma.com/reset-password?", customSpy.LastMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task PromoteLegacyTenantAdminIfMissingAsync_NeverPromotesSystemAdmin_AndPromotesTenantUser()
    {
        using var provider = CreateProvider(Guid.NewGuid().ToString());
        var db = provider.GetRequiredService<ApplicationDbContext>();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();

        await roleMgr.CreateAsync(new IdentityRole("SystemAdmin"));
        await roleMgr.CreateAsync(new IdentityRole("Admin"));

        var sysAdmin = new ApplicationUser { Id = "0001-sys", UserName = "sysadmin", Email = "sys@test.com", FullName = "Sys", TenantId = null };
        Assert.True((await userMgr.CreateAsync(sysAdmin, "Pass@123!")).Succeeded);
        await userMgr.AddToRoleAsync(sysAdmin, "SystemAdmin");

        // Fresh DB with ONLY SystemAdmin -> must NOT become Admin
        await UserManagementService.PromoteLegacyTenantAdminIfMissingAsync(userMgr, db);
        Assert.False(await userMgr.IsInRoleAsync(sysAdmin, "Admin"));

        // Add legacy Tenant 1 user -> ONLY legacy user gets Admin
        var legacyUser = new ApplicationUser { Id = "0002-legacy", UserName = "legacy1", Email = "l@test.com", FullName = "Legacy", TenantId = 1 };
        Assert.True((await userMgr.CreateAsync(legacyUser, "Pass@123!")).Succeeded);

        await UserManagementService.PromoteLegacyTenantAdminIfMissingAsync(userMgr, db);
        Assert.False(await userMgr.IsInRoleAsync(sysAdmin, "Admin"));
        Assert.True(await userMgr.IsInRoleAsync(legacyUser, "Admin"));
    }
}
