using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PharmacyApi.Controllers;
using PharmacyApi.Data;
using PharmacyApi.Filters;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Services;
using Xunit;

namespace PharmacyApi.Tests;

/// <summary>
/// Regression tests covering GAP-24 (Prescription Upload security & tenant/branch isolation)
/// and source architectural locks for GAP-22, GAP-23, GAP-24 white-label & 80mm thermal receipts.
/// </summary>
public class PrescriptionUploadAndWhiteLabelTests
{
    private sealed class MutableTenantContext : ITenantContextService
    {
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool CanAccessAllBranches { get; set; }
    }

    private sealed class FakeEnv(string contentRoot, string? webRoot = null) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PharmacyApi";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = contentRoot;
        public string EnvironmentName { get; set; } = "Production";
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = webRoot!;
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "PharmacyApi.csproj")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new DirectoryNotFoundException("Could not locate PharmacyApi.csproj root.");
    }

    private static ApplicationDbContext CreateDb(ITenantContextService ctx, string dbName)
    {
        var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ApplicationDbContext(opts, ctx);
    }

    private static FormFile CreateFormFile(byte[] bytes, string fileName, string contentType)
    {
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    [Fact]
    public void SalesController_UploadPrescription_HasAuthorizeAndSalesCreatePermission()
    {
        var type = typeof(SalesController);
        Assert.NotNull(type.GetCustomAttribute<AuthorizeAttribute>());

        var method = type.GetMethod(nameof(SalesController.UploadPrescription))!;
        var perm = method.GetCustomAttribute<ModulePermissionAttribute>();
        Assert.NotNull(perm);
        Assert.Equal("Sales", perm!.Arguments![0]);
        Assert.Equal("create", perm.Arguments![1]);
    }

    [Fact]
    public async Task ImageUploadValidator_EnforcesSizeExtensionMimeAndMagicBytes()
    {
        var validPng = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
        var validJpg = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 };
        var validWebp = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50 };
        var spoofPng = Encoding.UTF8.GetBytes("<html>bad</html>");

        using (var okPng = CreateFormFile(validPng, "rx.png", "image/png").OpenReadStream()) { Assert.True(okPng.Length > 0); }

        var fPng = CreateFormFile(validPng, "rx.png", "image/png");
        Assert.True((await ImageUploadValidator.ValidateAsync(fPng)).IsValid);

        var fJpg = CreateFormFile(validJpg, "rx.jpg", "image/jpeg");
        Assert.True((await ImageUploadValidator.ValidateAsync(fJpg)).IsValid);

        var fWebp = CreateFormFile(validWebp, "rx.webp", "image/webp");
        Assert.True((await ImageUploadValidator.ValidateAsync(fWebp)).IsValid);

        var fSpoof = CreateFormFile(spoofPng, "evil.png", "image/png");
        Assert.False((await ImageUploadValidator.ValidateAsync(fSpoof)).IsValid);

        var fBadExt = CreateFormFile(validPng, "rx.svg", "image/svg+xml");
        Assert.False((await ImageUploadValidator.ValidateAsync(fBadExt)).IsValid);

        var fTooBig = CreateFormFile(validPng, "rx.png", "image/png");
        Assert.False((await ImageUploadValidator.ValidateAsync(fTooBig, maxBytes: 4)).IsValid);
    }

    [Fact]
    public async Task UploadPrescription_EnforcesTenantAndBranchIsolation_AndPersistsPath()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), "s7pms_rx_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempRoot);
        try
        {
            var dbName = Guid.NewGuid().ToString();
            var seedCtx = new MutableTenantContext { IsSystemAdmin = true };
            await using (var seed = CreateDb(seedCtx, dbName))
            {
                seed.SalesMasters.Add(new SalesMaster
                {
                    SaleId = 101,
                    InvoiceCode = "INV20261126-1",
                    TenantId = 1,
                    BranchId = 1,
                    CustomerName = "Patient A",
                    SaleDate = DateTime.UtcNow.Date,
                    SaleTime = DateTime.UtcNow,
                    GrandTotal = 120m,
                    PaidAmount = 120m,
                    SaleStatus = "Completed"
                });
                await seed.SaveChangesAsync();
            }

            var env = new FakeEnv(tempRoot, Path.Combine(tempRoot, "wwwroot"));
            var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02 };

            // Cross-tenant caller (T2) must get 404 without writing any file to disk
            var t2Ctx = new MutableTenantContext { TenantId = 2, BranchId = 2, CanAccessAllBranches = false };
            await using (var dbT2 = CreateDb(t2Ctx, dbName))
            {
                var ctrlT2 = new SalesController(new SalesRepository(dbT2, t2Ctx));
                var crossTenantFile = CreateFormFile(pngBytes, "rx.png", "image/png");
                Assert.IsType<NotFoundResult>(await ctrlT2.UploadPrescription(101, crossTenantFile, env));
                Assert.False(Directory.Exists(Path.Combine(tempRoot, "wwwroot", "uploads", "prescriptions")));
            }

            // Cross-branch caller in same tenant (T1 Branch 2) must get 404 without writing disk
            var t1b2Ctx = new MutableTenantContext { TenantId = 1, BranchId = 2, CanAccessAllBranches = false };
            await using (var dbT1B2 = CreateDb(t1b2Ctx, dbName))
            {
                var ctrlB2 = new SalesController(new SalesRepository(dbT1B2, t1b2Ctx));
                var crossBranchFile = CreateFormFile(pngBytes, "rx.png", "image/png");
                Assert.IsType<NotFoundResult>(await ctrlB2.UploadPrescription(101, crossBranchFile, env));
            }

            // Spoofed file from rightful T1 Branch 1 fails 400
            var t1b1Ctx = new MutableTenantContext { TenantId = 1, BranchId = 1, CanAccessAllBranches = false };
            await using (var dbT1B1 = CreateDb(t1b1Ctx, dbName))
            {
                var ctrl = new SalesController(new SalesRepository(dbT1B1, t1b1Ctx));
                var spoofFile = CreateFormFile(Encoding.ASCII.GetBytes("MZ_FAKE"), "rx.jpg", "image/jpeg");
                Assert.IsType<BadRequestObjectResult>(await ctrl.UploadPrescription(101, spoofFile, env));

                var validFile = CreateFormFile(pngBytes, "rx.png", "image/png");
                var ok = Assert.IsType<OkObjectResult>(await ctrl.UploadPrescription(101, validFile, env));
                var payloadJson = System.Text.Json.JsonSerializer.Serialize(ok.Value);
                Assert.Contains("/uploads/prescriptions/tenant-1/rx-101-", payloadJson);

                var persisted = await dbT1B1.SalesMasters.SingleAsync(s => s.SaleId == 101);
                Assert.StartsWith("/uploads/prescriptions/tenant-1/rx-101-", persisted.PrescriptionImagePath);
            }
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public void Frontend_WhiteLabelTokensPdfBrandingAndThermalReceipt_AreLocked()
    {
        var root = FindRepoRoot();
        var fe = Path.Combine(root, "frontend", "src");

        // GAP-22: index.html and all 4 auth screens use dynamic branding, currentYear & var(--brand)
        var indexHtml = File.ReadAllText(Path.Combine(fe, "index.html"));
        Assert.DoesNotContain("s7 Drug House", indexHtml, StringComparison.OrdinalIgnoreCase);

        foreach (var authRel in new[]
        {
            Path.Combine("app", "components", "login", "login.component.ts"),
            Path.Combine("app", "components", "register", "register.component.ts"),
            Path.Combine("app", "components", "forgot-password", "forgot-password.component.ts"),
            Path.Combine("app", "components", "reset-password", "reset-password.component.ts")
        })
        {
            var src = File.ReadAllText(Path.Combine(fe, authRel));
            Assert.Contains("tenantConfig.pharmacyName()", src);
            Assert.Contains("currentYear", src);
            Assert.DoesNotContain("© 2024", src);
            Assert.DoesNotContain("linear-gradient(135deg, #007070", src);
        }

        // GAP-23: PDF print services use TenantConfigService.getPrintBranding() with zero hardcoded pharmacy names
        foreach (var printRel in new[]
        {
            Path.Combine("app", "services", "invoice-print.service.ts"),
            Path.Combine("app", "services", "grn-print.service.ts"),
            Path.Combine("app", "components", "due-collection", "money-receipt.service.ts")
        })
        {
            var src = File.ReadAllText(Path.Combine(fe, printRel));
            Assert.Contains("getPrintBranding()", src);
            Assert.DoesNotContain("'PHARMACY SYSTEM'", src);
            Assert.DoesNotContain("'PHARMACY MANAGEMENT SYSTEM'", src);
            Assert.DoesNotContain("'s7 Drug House'", src);
            Assert.DoesNotContain("Sector 7, Uttara", src);
        }

        // GAP-24: 80mm Bengali thermal receipt CSS + XSS HTML escaping + Noto Sans Bengali present
        var thermalSrc = File.ReadAllText(Path.Combine(fe, "app", "services", "thermal-receipt-print.service.ts"));
        Assert.Contains("size: 80mm auto", thermalSrc);
        Assert.Contains("Noto Sans Bengali", thermalSrc);
        Assert.Contains("escapeHtml", thermalSrc);
        Assert.Contains("getPrintBranding()", thermalSrc);
    }
}
