using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
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
/// Regression tests locking GAP-06 security invariants:
/// - AuthController requires authentication by default; Register is restricted to SystemAdmin
/// - Register blocks protected/invalid roles and requires a valid active TenantId
/// - ChangePassword & UploadProfilePicture enforce caller ownership (IDOR prevention)
/// - UploadProfilePicture validates extension, size (<= 2MB), magic bytes, and path containment
/// </summary>
public class AuthSecurityTests
{
    private sealed class StubTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;
    }

    private sealed class StubEmailService : IEmailService
    {
        public Task SendEmailAsync(string email, string subject, string message) => Task.CompletedTask;
    }

    private sealed class TempWebHostEnvironment : IWebHostEnvironment, IDisposable
    {
        public string RootPath { get; } = Path.Combine(Path.GetTempPath(), "s7pms_gap06_" + Guid.NewGuid().ToString("N"));
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "PharmacyApi";
        public string WebRootPath { get; set; }
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();

        public TempWebHostEnvironment()
        {
            Directory.CreateDirectory(RootPath);
            WebRootPath = Path.Combine(RootPath, "wwwroot");
            ContentRootPath = RootPath;
            Directory.CreateDirectory(WebRootPath);
        }

        public void Dispose()
        {
            if (Directory.Exists(RootPath))
                Directory.Delete(RootPath, recursive: true);
        }
    }

    private static ServiceProvider CreateProvider(string dbName, StubTenantContext? ctx = null)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddScoped<ITenantContextService>(_ => ctx ?? new StubTenantContext { IsSystemAdmin = true });
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
        IWebHostEnvironment env,
        ClaimsPrincipal? userPrincipal = null)
    {
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userSvc = provider.GetRequiredService<IUserManagementService>();
        var config = new ConfigurationBuilder().Build();

        var httpCtx = new DefaultHttpContext();
        if (userPrincipal != null)
            httpCtx.User = userPrincipal;

        return new AuthController(userMgr, roleMgr, config, new StubEmailService(), userSvc, env)
        {
            ControllerContext = new ControllerContext { HttpContext = httpCtx }
        };
    }

    private static ClaimsPrincipal BuildPrincipal(string userId, string role) =>
        new(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role)
        }, "TestAuth"));

    private static IFormFile BuildFormFile(byte[] content, string fileName, string contentType)
    {
        var ms = new MemoryStream(content);
        return new FormFile(ms, 0, content.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    [Fact]
    public void AuthController_EnforcesClassLevelAuthorize_AndExplicitAllowAnonymousOnlyOnPublicEndpoints()
    {
        var ctrlType = typeof(AuthController);
        Assert.NotNull(ctrlType.GetCustomAttribute<AuthorizeAttribute>());

        var regMethod = ctrlType.GetMethod(nameof(AuthController.Register))!;
        var regAuth = regMethod.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(regAuth);
        Assert.Equal("SystemAdmin", regAuth!.Roles);
        Assert.Null(regMethod.GetCustomAttribute<AllowAnonymousAttribute>());

        var chgPwd = ctrlType.GetMethod(nameof(AuthController.ChangePassword))!;
        Assert.Null(chgPwd.GetCustomAttribute<AllowAnonymousAttribute>());

        var uploadPic = ctrlType.GetMethod(nameof(AuthController.UploadProfilePicture))!;
        Assert.Null(uploadPic.GetCustomAttribute<AllowAnonymousAttribute>());

        foreach (var pubName in new[]
        {
            nameof(AuthController.Login),
            nameof(AuthController.ForgotPassword),
            nameof(AuthController.ResetPassword),
            nameof(AuthController.Logout)
        })
        {
            Assert.NotNull(ctrlType.GetMethod(pubName)!.GetCustomAttribute<AllowAnonymousAttribute>());
        }
    }

    [Fact]
    public async Task Register_RejectsProtectedOrUnknownRoles_AndMissingTenant_AndCreatesScopedUser()
    {
        using var env = new TempWebHostEnvironment();
        using var provider = CreateProvider(Guid.NewGuid().ToString());
        var db = provider.GetRequiredService<ApplicationDbContext>();
        db.Tenants.Add(new Tenant { TenantId = 1, PharmacyName = "Green Pharma", IsActive = true });
        db.Branches.Add(new Branch { BranchId = 1, TenantId = 1, BranchName = "Head Office", IsHeadOffice = true, IsActive = true });
        await db.SaveChangesAsync();

        var controller = CreateController(provider, env, BuildPrincipal("sys-1", "SystemAdmin"));

        // 1. Protected SystemAdmin escalation blocked
        var escRes = await controller.Register(new RegisterModel
        {
            Username = "evil_sys",
            Email = "evil@test.com",
            Password = "Password@123",
            FullName = "Evil User",
            TenantId = 1,
            Role = "SystemAdmin"
        });
        Assert.IsType<BadRequestObjectResult>(escRes);

        // 2. Missing TenantId blocked
        var noTenantRes = await controller.Register(new RegisterModel
        {
            Username = "orphan_mgr",
            Email = "orphan@test.com",
            Password = "Password@123",
            FullName = "Orphan User",
            TenantId = null,
            Role = "Manager"
        });
        Assert.IsType<BadRequestObjectResult>(noTenantRes);

        // 3. Valid scoped Manager succeeds with TenantId & BranchId stamped
        var okRes = await controller.Register(new RegisterModel
        {
            Username = "valid_mgr",
            Email = "mgr@test.com",
            Password = "Password@123",
            FullName = "Valid Manager",
            TenantId = 1,
            BranchId = 1,
            Role = "Manager"
        });
        Assert.IsType<OkObjectResult>(okRes);

        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var created = await userMgr.FindByNameAsync("valid_mgr");
        Assert.NotNull(created);
        Assert.Equal(1, created!.TenantId);
        Assert.Equal(1, created.BranchId);
        Assert.True(await userMgr.IsInRoleAsync(created, "Manager"));
        Assert.Null(await userMgr.FindByNameAsync("evil_sys"));
    }

    [Fact]
    public async Task ChangePassword_PreventsUnauthenticatedAndCrossUserIdor_AllowsSelf()
    {
        using var env = new TempWebHostEnvironment();
        using var provider = CreateProvider(Guid.NewGuid().ToString());
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();

        var userA = new ApplicationUser { Id = "user-a", UserName = "userA", Email = "a@test.com", FullName = "User A", TenantId = 1 };
        var userB = new ApplicationUser { Id = "user-b", UserName = "userB", Email = "b@test.com", FullName = "User B", TenantId = 2 };
        await userMgr.CreateAsync(userA, "PassA@123!");
        await userMgr.CreateAsync(userB, "PassB@123!");

        // 1. Unauthenticated principal -> Unauthorized
        var anonCtrl = CreateController(provider, env, new ClaimsPrincipal(new ClaimsIdentity()));
        var anonRes = await anonCtrl.ChangePassword(new ChangePasswordModel
        {
            UserId = "user-b",
            OldPassword = "PassB@123!",
            NewPassword = "NewPass@123!"
        });
        Assert.IsType<UnauthorizedResult>(anonRes);

        // 2. User A attempting to target User B -> 403 Forbid
        var authCtrl = CreateController(provider, env, BuildPrincipal("user-a", "Cashier"));
        var idorRes = await authCtrl.ChangePassword(new ChangePasswordModel
        {
            UserId = "user-b",
            OldPassword = "PassB@123!",
            NewPassword = "Hacked@123!"
        });
        Assert.IsType<ForbidResult>(idorRes);
        Assert.True(await userMgr.CheckPasswordAsync(userB, "PassB@123!"));

        // 3. User A targeting self (even with null UserId) -> 200 OK
        var selfRes = await authCtrl.ChangePassword(new ChangePasswordModel
        {
            UserId = null,
            OldPassword = "PassA@123!",
            NewPassword = "UpdatedA@123!"
        });
        Assert.IsType<OkObjectResult>(selfRes);
        Assert.True(await userMgr.CheckPasswordAsync(userA, "UpdatedA@123!"));
    }

    [Fact]
    public async Task UploadProfilePicture_EnforcesIdorMimeMagicBytesSizeLimit_AndPathContainment()
    {
        using var env = new TempWebHostEnvironment();
        using var provider = CreateProvider(Guid.NewGuid().ToString());
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();

        // Seed a sensitive file outside uploads/profiles to verify path traversal delete never touches it
        var secretOutside = Path.Combine(env.WebRootPath, "secret.txt");
        await File.WriteAllTextAsync(secretOutside, "keep-me");

        var userA = new ApplicationUser
        {
            Id = "user-a",
            UserName = "userA",
            Email = "a@test.com",
            FullName = "User A",
            TenantId = 1,
            ProfilePicturePath = "/../wwwroot/secret.txt"
        };
        await userMgr.CreateAsync(userA, "PassA@123!");

        var controller = CreateController(provider, env, BuildPrincipal("user-a", "Cashier"));
        byte[] validPng = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];

        // 1. Cross-user IDOR -> 403 Forbid
        var idorRes = await controller.UploadProfilePicture(BuildFormFile(validPng, "avatar.png", "image/png"), "user-b");
        Assert.IsType<ForbidResult>(idorRes);

        // 2. SVG / XSS payload rejected
        var svgBytes = "<svg onload=alert(1)></svg>"u8.ToArray();
        var svgRes = await controller.UploadProfilePicture(BuildFormFile(svgBytes, "xss.svg", "image/svg+xml"));
        Assert.IsType<BadRequestObjectResult>(svgRes);

        // 3. Spoofed .jpg containing HTML rejected by magic-byte check
        var spoofedRes = await controller.UploadProfilePicture(BuildFormFile("<script>1</script>"u8.ToArray(), "evil.jpg", "image/jpeg"));
        Assert.IsType<BadRequestObjectResult>(spoofedRes);

        // 4. Oversized > 2MB file rejected
        var oversized = new byte[(2 * 1024 * 1024) + 1];
        Array.Copy(validPng, oversized, validPng.Length);
        var sizeRes = await controller.UploadProfilePicture(BuildFormFile(oversized, "huge.png", "image/png"));
        Assert.IsType<BadRequestObjectResult>(sizeRes);

        // 5. Valid PNG succeeds, stays under /uploads/profiles/, and never deletes files outside uploads/profiles/
        var okRes = await controller.UploadProfilePicture(BuildFormFile(validPng, "avatar.png", "image/png"), "user-a");
        Assert.IsType<OkObjectResult>(okRes);
        Assert.True(File.Exists(secretOutside));

        var updated = await userMgr.FindByIdAsync("user-a");
        Assert.NotNull(updated!.ProfilePicturePath);
        Assert.StartsWith("/uploads/profiles/", updated.ProfilePicturePath, StringComparison.Ordinal);
        Assert.EndsWith(".png", updated.ProfilePicturePath, StringComparison.Ordinal);
        var savedDiskPath = Path.Combine(env.WebRootPath, updated.ProfilePicturePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        Assert.True(File.Exists(savedDiskPath));
    }
}
