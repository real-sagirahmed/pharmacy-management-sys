using System.Text.Json;
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
/// Regression tests locking GAP-17 invariants:
/// - deploy.yml automatic push triggers must stay restricted to main (never develop)
/// - deploy.yml and appsettings.json CORS AllowedOrigins must use https://pharmacymsys.runasp.net
/// - AuthController Login/Logout must share BuildAuthCookieOptions and enforce Secure=true in non-Development
/// </summary>
public class DeploymentGovernanceTests
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

    private sealed class StubWebHostEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "PharmacyApi";
        public string WebRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static string FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "PharmacyApi.csproj")))
        {
            dir = dir.Parent;
        }

        Assert.NotNull(dir);
        return dir!.FullName;
    }

    [Fact]
    public void DeployWorkflow_RestrictsAutomatedPushToMainOnly_AndDoesNotDeployDevelop()
    {
        var root = FindRepositoryRoot();
        var deployPath = Path.Combine(root, ".github", "workflows", "deploy.yml");
        Assert.True(File.Exists(deployPath), $"Missing deploy workflow at {deployPath}");

        var lines = File.ReadAllLines(deployPath);
        var pushBranches = new List<string>();
        bool inOn = false;
        bool inPush = false;
        bool inBranches = false;

        foreach (var rawLine in lines)
        {
            // Strip trailing YAML comments before analyzing structure or branch items
            var hashIdx = rawLine.IndexOf('#');
            var codeLine = hashIdx >= 0 ? rawLine[..hashIdx] : rawLine;
            var trimmed = codeLine.Trim();

            if (string.IsNullOrWhiteSpace(trimmed))
                continue;

            int indent = codeLine.Length - codeLine.TrimStart().Length;

            if (indent == 0)
            {
                inOn = trimmed == "on:";
                inPush = false;
                inBranches = false;
                continue;
            }

            if (!inOn) continue;

            if (indent == 2)
            {
                inPush = trimmed == "push:";
                inBranches = false;
                continue;
            }

            if (inPush && indent == 4)
            {
                inBranches = trimmed == "branches:";
                continue;
            }

            if (inBranches && trimmed.StartsWith("-", StringComparison.Ordinal))
            {
                var branch = trimmed[1..].Trim().Trim('"', '\'');
                if (!string.IsNullOrEmpty(branch))
                    pushBranches.Add(branch);
            }
        }

        Assert.Contains("main", pushBranches);
        Assert.DoesNotContain("develop", pushBranches);
    }

    [Fact]
    public void DeployWorkflow_AndAppSettings_UseHttpsProductionCorsOrigin()
    {
        var root = FindRepositoryRoot();

        // 1. Validate deploy.yml embedded appsettings.json AllowedOrigins block
        var deployPath = Path.Combine(root, ".github", "workflows", "deploy.yml");
        var deployText = File.ReadAllText(deployPath);
        Assert.Contains("\"https://pharmacymsys.runasp.net\"", deployText, StringComparison.Ordinal);
        Assert.DoesNotContain("\"http://pharmacymsys.runasp.net\"", deployText, StringComparison.Ordinal);

        // 2. Validate appsettings.json Cors:AllowedOrigins array
        var appSettingsPath = Path.Combine(root, "appsettings.json");
        using var doc = JsonDocument.Parse(File.ReadAllText(appSettingsPath));
        var origins = doc.RootElement
            .GetProperty("Cors")
            .GetProperty("AllowedOrigins")
            .EnumerateArray()
            .Select(e => e.GetString())
            .Where(s => s != null)
            .ToList();

        Assert.Contains("https://pharmacymsys.runasp.net", origins);
        Assert.DoesNotContain("http://pharmacymsys.runasp.net", origins);
    }

    [Theory]
    [InlineData("Production", false, true)]
    [InlineData("Development", false, false)]
    [InlineData("Development", true, true)]
    public void AuthController_Logout_AppliesEnvironmentAwareSecureCookiePolicy(
        string environmentName,
        bool isHttpsRequest,
        bool expectedSecureFlag)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddScoped<ITenantContextService>(_ => new StubTenantContext());
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddScoped<IUserManagementService, UserManagementService>();

        using var provider = services.BuildServiceProvider();
        var userMgr = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleMgr = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var userSvc = provider.GetRequiredService<IUserManagementService>();
        var config = new ConfigurationBuilder().Build();
        var env = new StubWebHostEnvironment { EnvironmentName = environmentName };

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = isHttpsRequest ? "https" : "http";

        var controller = new AuthController(
            userMgr,
            roleMgr,
            config,
            new StubEmailService(),
            userSvc,
            env)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };

        var result = controller.Logout();
        Assert.IsType<OkObjectResult>(result);

        var setCookie = httpContext.Response.Headers.SetCookie.ToString();
        Assert.Contains("auth_token=;", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", setCookie, StringComparison.OrdinalIgnoreCase);

        bool hasSecure = setCookie.Contains("; secure", StringComparison.OrdinalIgnoreCase);
        Assert.Equal(expectedSecureFlag, hasSecure);
    }

    [Fact]
    public void AuthController_UsesSharedBuildAuthCookieOptions_ForAppendAndDelete()
    {
        var root = FindRepositoryRoot();
        var authPath = Path.Combine(root, "Controllers", "AuthController.cs");
        var authSource = File.ReadAllText(authPath);

        Assert.Contains("Response.Cookies.Append(\"auth_token\", tokenString, BuildAuthCookieOptions(", authSource, StringComparison.Ordinal);
        Assert.Contains("Response.Cookies.Delete(\"auth_token\", BuildAuthCookieOptions())", authSource, StringComparison.Ordinal);
        Assert.DoesNotContain("Response.Cookies.Delete(\"auth_token\")", authSource, StringComparison.Ordinal);
    }
}
