using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Models;
using PharmacyApi.Services;
using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ITenantContextService _ctx;
        private readonly UserManager<ApplicationUser> _userManager;

        public TenantsController(
            ApplicationDbContext db,
            ITenantContextService ctx,
            UserManager<ApplicationUser> userManager)
        {
            _db          = db;
            _ctx         = ctx;
            _userManager = userManager;
        }

        // ── GET /api/tenants/config ─────────────────────────────────────────
        // যেকোনো লগড-ইন ইউজার — নিজের Tenant-এর ব্র্যান্ডিং কনফিগ লোড করে
        [HttpGet("config")]
        [Authorize]
        public async Task<IActionResult> GetConfig()
        {
            if (_ctx.IsSystemAdmin)
                return Ok(new { pharmacyName = "teamS7 Tech Solutions", subscriptionPlan = "Internal" });

            if (_ctx.TenantId == null)
                return Unauthorized();

            var tenant = await _db.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == _ctx.TenantId);

            if (tenant == null) return NotFound();

            return Ok(new
            {
                pharmacyName       = tenant.PharmacyName,
                slogan             = tenant.Slogan,
                headOfficeAddress  = tenant.HeadOfficeAddress,
                phone              = tenant.Phone,
                email              = tenant.Email,
                drugLicenseNo      = tenant.DrugLicenseNo,
                logoPath           = tenant.LogoPath,
                invoiceFooter      = tenant.InvoiceFooter,
                primaryColor       = tenant.PrimaryColor,
                subscriptionPlan   = tenant.SubscriptionPlan,
                subscriptionExpiry = tenant.SubscriptionExpiry
            });
        }

        // ── GET /api/tenants ─────────────────────────────────────────────────
        // SystemAdmin only — সব Tenant লিস্ট
        [HttpGet]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> GetAll()
        {
            var tenants = await _db.Tenants
                .IgnoreQueryFilters()
                .OrderBy(t => t.PharmacyName)
                .Select(t => new
                {
                    t.TenantId,
                    t.PharmacyName,
                    t.Email,
                    t.Phone,
                    t.SubscriptionPlan,
                    t.SubscriptionExpiry,
                    t.IsActive,
                    t.CreatedAt,
                    BranchCount = t.Branches.Count
                })
                .ToListAsync();

            return Ok(tenants);
        }

        // ── GET /api/tenants/{id} ─────────────────────────────────────────────
        [HttpGet("{id:int}")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> GetById(int id)
        {
            var tenant = await _db.Tenants
                .IgnoreQueryFilters()
                .Include(t => t.Branches)
                .FirstOrDefaultAsync(t => t.TenantId == id);

            return tenant == null ? NotFound() : Ok(tenant);
        }

        // ── POST /api/tenants ─────────────────────────────────────────────────
        // নতুন ফার্মেসি (Tenant) + Default Branch তৈরি
        [HttpPost]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateTenantDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            return await _db.ExecuteInTransactionAsync<IActionResult>(async ct =>
            {
                var tenant = new Tenant
                {
                    PharmacyName      = dto.PharmacyName,
                    Slogan            = dto.Slogan,
                    HeadOfficeAddress = dto.Address,
                    Phone             = dto.Phone,
                    Email             = dto.Email,
                    DrugLicenseNo     = dto.DrugLicenseNo,
                    InvoiceFooter     = dto.InvoiceFooter,
                    PrimaryColor      = dto.PrimaryColor,
                    SubscriptionPlan  = dto.SubscriptionPlan ?? "Trial",
                    SubscriptionExpiry= dto.SubscriptionExpiry,
                    IsActive          = true
                };
                _db.Tenants.Add(tenant);
                await _db.SaveChangesAsync(ct); // TenantId generate হবে

                // Default Head Office Branch তৈরি
                var defaultBranch = new Branch
                {
                    TenantId     = tenant.TenantId,
                    BranchName   = dto.HeadOfficeBranchName ?? "মেইন আউটলেট",
                    Address      = dto.Address,
                    Phone        = dto.Phone,
                    DrugLicenseNo= dto.DrugLicenseNo,
                    IsHeadOffice = true,
                    IsActive     = true
                };
                _db.Branches.Add(defaultBranch);
                await _db.SaveChangesAsync(ct);

                IActionResult result = CreatedAtAction(nameof(GetById), new { id = tenant.TenantId }, new
                {
                    tenant.TenantId,
                    defaultBranch.BranchId,
                    tenant.PharmacyName
                });
                return (true, result);
            });
        }

        // ── PUT /api/tenants/{id} ─────────────────────────────────────────────
        [HttpPut("{id:int}")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTenantDto dto)
        {
            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == id);
            if (tenant == null) return NotFound();

            tenant.PharmacyName       = dto.PharmacyName ?? tenant.PharmacyName;
            tenant.Slogan             = dto.Slogan       ?? tenant.Slogan;
            tenant.HeadOfficeAddress  = dto.Address      ?? tenant.HeadOfficeAddress;
            tenant.Phone              = dto.Phone        ?? tenant.Phone;
            tenant.Email              = dto.Email        ?? tenant.Email;
            tenant.DrugLicenseNo      = dto.DrugLicenseNo?? tenant.DrugLicenseNo;
            tenant.InvoiceFooter      = dto.InvoiceFooter?? tenant.InvoiceFooter;
            tenant.PrimaryColor       = dto.PrimaryColor ?? tenant.PrimaryColor;
            tenant.SubscriptionPlan   = dto.SubscriptionPlan  ?? tenant.SubscriptionPlan;
            tenant.SubscriptionExpiry = dto.SubscriptionExpiry ?? tenant.SubscriptionExpiry;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── PATCH /api/tenants/{id}/status ───────────────────────────────────
        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> SetStatus(int id, [FromBody] bool isActive)
        {
            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == id);
            if (tenant == null) return NotFound();
            tenant.IsActive = isActive;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── POST /api/tenants/{id}/logo ───────────────────────────────────────
        [HttpPost("{id:int}/logo")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file, IWebHostEnvironment env)
        {
            if (file == null || file.Length == 0) return BadRequest("কোনো ফাইল আপলোড হয়নি।");

            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == id);
            if (tenant == null) return NotFound();

            var folder = Path.Combine(env.WebRootPath, "uploads", "logos", $"tenant-{id}");
            Directory.CreateDirectory(folder);

            var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"logo{ext}";
            var filePath = Path.Combine(folder, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            tenant.LogoPath = $"/uploads/logos/tenant-{id}/{fileName}";
            await _db.SaveChangesAsync();

            return Ok(new { logoPath = tenant.LogoPath });
        }
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────
    public class CreateTenantDto
    {
        [Required] public string PharmacyName { get; set; } = string.Empty;
        public string? Slogan { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        [EmailAddress] public string? Email { get; set; }
        public string? DrugLicenseNo { get; set; }
        public string? InvoiceFooter { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SubscriptionPlan { get; set; }
        public DateTime? SubscriptionExpiry { get; set; }
        public string? HeadOfficeBranchName { get; set; }
    }

    public class UpdateTenantDto
    {
        public string? PharmacyName { get; set; }
        public string? Slogan { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        [EmailAddress] public string? Email { get; set; }
        public string? DrugLicenseNo { get; set; }
        public string? InvoiceFooter { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SubscriptionPlan { get; set; }
        public DateTime? SubscriptionExpiry { get; set; }
    }
}
