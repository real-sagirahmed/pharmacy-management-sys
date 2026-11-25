using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        private readonly ITenantContextService _ctx;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            ITenantContextService ctx)
            : base(options)
        {
            _ctx = ctx;
        }

        // ─── SaaS Core ───────────────────────────────────────────────────────
        public DbSet<Tenant>         Tenants         { get; set; }
        public DbSet<Branch>         Branches        { get; set; }
        public DbSet<BranchTransfer> BranchTransfers { get; set; }
        public DbSet<MedicineBatch>  MedicineBatches { get; set; }

        // ─── Existing ────────────────────────────────────────────────────────
        public DbSet<Medicine>        Medicines        { get; set; }
        public DbSet<Supplier>        Suppliers        { get; set; }
        public DbSet<PurchaseMaster>  PurchaseMasters  { get; set; }
        public DbSet<PurchaseDetail>  PurchaseDetails  { get; set; }
        public DbSet<PurchasePayment> PurchasePayments { get; set; }
        public DbSet<SalesMaster>     SalesMasters     { get; set; }
        public DbSet<SalesDetail>     SalesDetails     { get; set; }
        public DbSet<SalesPayment>    SalesPayments    { get; set; }
        public DbSet<Party>           Parties          { get; set; }
        public DbSet<Tax>             Taxes            { get; set; }
        public DbSet<Uom>             Uoms             { get; set; }
        public DbSet<Generic>         Generics         { get; set; }
        public DbSet<Category>        Categories       { get; set; }
        public DbSet<Manufacturer>    Manufacturers    { get; set; }
        public DbSet<DosageForm>      DosageForms      { get; set; }
        public DbSet<CommonStrength>  CommonStrengths  { get; set; }
        public DbSet<UseFor>          UseFors          { get; set; }
        public DbSet<RolePermission>  RolePermissions  { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ═══════════════════════════════════════════════════════════════════
            // ARCHITECTURAL INTENT: EF Core Global Query Filter Strategy
            //
            // Tier 1 — Tenant Isolation (ব্যবসা-প্রতিষ্ঠান স্তর):
            //   Medicine Catalog, Master Data → TenantId filter only
            //   Branch আলাদা করে না — Catalog সব শাখায় শেয়ার হয়।
            //
            // Tier 2 — Branch Isolation (শাখা স্তর):
            //   Sales, Purchase, MedicineBatch → TenantId + BranchId filter
            //   BranchId = null → Tenant Admin সব Branch-এর ডেটা দেখতে পারবে।
            //
            // SystemAdmin → সব filter bypass (IgnoreQueryFilters() ব্যবহার করলে)।
            // কোনো Repository/Controller সরাসরি TenantId/BranchId ফিল্টার করবে না —
            // EF Core স্বয়ংক্রিয়ভাবে করে।
            //
            // এই filter কখনো সরাবেন না বা bypass করবেন না — data isolation এখানেই নির্ভরশীল।
            // ═══════════════════════════════════════════════════════════════════

            // ── Tier 1: Tenant-only ──────────────────────────────────────────
            builder.Entity<Medicine>().HasQueryFilter(m =>
                _ctx.IsSystemAdmin || m.TenantId == _ctx.TenantId);

            builder.Entity<Party>().HasQueryFilter(p =>
                _ctx.IsSystemAdmin || p.TenantId == _ctx.TenantId);

            builder.Entity<Supplier>().HasQueryFilter(s =>
                _ctx.IsSystemAdmin || s.TenantId == _ctx.TenantId);

            builder.Entity<RolePermission>().HasQueryFilter(r =>
                _ctx.IsSystemAdmin || r.TenantId == _ctx.TenantId);

            // Master Data — Tenant-scoped
            builder.Entity<Category>().HasQueryFilter(c =>
                _ctx.IsSystemAdmin || c.TenantId == _ctx.TenantId);

            builder.Entity<Generic>().HasQueryFilter(g =>
                _ctx.IsSystemAdmin || g.TenantId == _ctx.TenantId);

            builder.Entity<Manufacturer>().HasQueryFilter(m =>
                _ctx.IsSystemAdmin || m.TenantId == _ctx.TenantId);

            builder.Entity<DosageForm>().HasQueryFilter(d =>
                _ctx.IsSystemAdmin || d.TenantId == _ctx.TenantId);

            builder.Entity<CommonStrength>().HasQueryFilter(c =>
                _ctx.IsSystemAdmin || c.TenantId == _ctx.TenantId);

            builder.Entity<Uom>().HasQueryFilter(u =>
                _ctx.IsSystemAdmin || u.TenantId == _ctx.TenantId);

            builder.Entity<Tax>().HasQueryFilter(t =>
                _ctx.IsSystemAdmin || t.TenantId == _ctx.TenantId);

            builder.Entity<UseFor>().HasQueryFilter(u =>
                _ctx.IsSystemAdmin || u.TenantId == _ctx.TenantId);

            // ── Tier 2: Tenant + Branch ──────────────────────────────────────
            builder.Entity<SalesMaster>().HasQueryFilter(s =>
                _ctx.IsSystemAdmin ||
                (s.TenantId == _ctx.TenantId &&
                 (_ctx.BranchId == null || s.BranchId == _ctx.BranchId)));

            builder.Entity<PurchaseMaster>().HasQueryFilter(p =>
                _ctx.IsSystemAdmin ||
                (p.TenantId == _ctx.TenantId &&
                 (_ctx.BranchId == null || p.BranchId == _ctx.BranchId)));

            builder.Entity<MedicineBatch>().HasQueryFilter(b =>
                _ctx.IsSystemAdmin ||
                (b.TenantId == _ctx.TenantId &&
                 (_ctx.BranchId == null || b.BranchId == _ctx.BranchId)));

            // Branch transfers — Tenant-scoped (Admin দেখে সব শাখার transfer)
            builder.Entity<BranchTransfer>().HasQueryFilter(t =>
                _ctx.IsSystemAdmin || t.TenantId == _ctx.TenantId);

            // ── Unique Indexes (Tenant-scoped — আগের global unique সরিয়ে composite) ──
            // ARCHITECTURAL INTENT: Code uniqueness is now per-Tenant, not globally.
            // Two different Tenants can have Medicine code "MED-001" — that is correct.
            builder.Entity<Medicine>().HasIndex(m => new { m.TenantId, m.Code }).IsUnique();
            builder.Entity<Medicine>().HasIndex(m => new { m.TenantId, m.Name }).IsUnique();

            // SalesMaster: InvoiceCode unique per Tenant
            builder.Entity<SalesMaster>().HasIndex(s => new { s.TenantId, s.InvoiceCode }).IsUnique();

            // Party: Code unique per Tenant
            builder.Entity<Party>().HasIndex(p => new { p.TenantId, p.Code }).IsUnique();

            // Master Data: Code + Name unique per Tenant
            builder.Entity<Tax>().HasIndex(t => new { t.TenantId, t.Code }).IsUnique();
            builder.Entity<Tax>().HasIndex(t => new { t.TenantId, t.Name }).IsUnique();
            builder.Entity<Uom>().HasIndex(u => new { u.TenantId, u.Code }).IsUnique();
            builder.Entity<Uom>().HasIndex(u => new { u.TenantId, u.Name }).IsUnique();
            builder.Entity<Generic>().HasIndex(g => new { g.TenantId, g.Code }).IsUnique();
            builder.Entity<Generic>().HasIndex(g => new { g.TenantId, g.Name }).IsUnique();
            builder.Entity<Category>().HasIndex(c => new { c.TenantId, c.Code }).IsUnique();
            builder.Entity<Category>().HasIndex(c => new { c.TenantId, c.Name }).IsUnique();
            builder.Entity<Manufacturer>().HasIndex(m => new { m.TenantId, m.Code }).IsUnique();
            builder.Entity<Manufacturer>().HasIndex(m => new { m.TenantId, m.Name }).IsUnique();
            builder.Entity<DosageForm>().HasIndex(d => new { d.TenantId, d.Code }).IsUnique();
            builder.Entity<DosageForm>().HasIndex(d => new { d.TenantId, d.Name }).IsUnique();
            builder.Entity<CommonStrength>().HasIndex(c => new { c.TenantId, c.Code }).IsUnique();
            builder.Entity<CommonStrength>().HasIndex(c => new { c.TenantId, c.Name }).IsUnique();

            // ── Decimal Precision (অপরিবর্তিত) ──────────────────────────────
            builder.Entity<Medicine>().Property(m => m.SalePrice).HasPrecision(18, 2);
            builder.Entity<Medicine>().Property(m => m.PurchasePrice).HasPrecision(18, 2);

            builder.Entity<PurchaseMaster>().Property(p => p.SubTotal).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.TotalDiscount).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.TotalTax).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.Adjustment).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.GrandTotal).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.PaidAmount).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.DueAmount).HasPrecision(18, 2);

            builder.Entity<PurchaseDetail>().Property(p => p.UnitCost).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.DiscountAmount).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.DiscountPercent).HasPrecision(5, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.TaxAmount).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.TaxPercent).HasPrecision(5, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.SalePrice).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.LineTotal).HasPrecision(18, 2);

            builder.Entity<PurchasePayment>().Property(p => p.Amount).HasPrecision(18, 2);

            builder.Entity<SalesMaster>().Property(s => s.GrandTotal).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.SubTotal).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.TotalDiscount).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.TotalTax).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.SpecialDiscount).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.PaidAmount).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.ChangeAmount).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.DueAmount).HasPrecision(18, 2);

            builder.Entity<SalesDetail>().Property(s => s.UnitPrice).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.DiscountAmount).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.DiscountPercent).HasPrecision(5, 2);
            builder.Entity<SalesDetail>().Property(s => s.TaxAmount).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.TaxPercent).HasPrecision(5, 2);
            builder.Entity<SalesDetail>().Property(s => s.LineTotal).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.Tax).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.Subtotal).HasPrecision(18, 2);

            builder.Entity<SalesPayment>().Property(s => s.Amount).HasPrecision(18, 2);

            builder.Entity<Tax>().Property(t => t.TaxRate).HasPrecision(5, 2);

            builder.Entity<MedicineBatch>().Property(b => b.PurchasePrice).HasPrecision(18, 2);
            builder.Entity<MedicineBatch>().Property(b => b.SalePrice).HasPrecision(18, 2);
        }

        // ARCHITECTURAL INTENT: SaveChangesAsync Safety Net
        // Automatically stamps TenantId (and BranchId where applicable) on newly created entities
        // when resolved from the request's ITenantContextService.
        // This ensures zero possibility of records being saved with TenantId = 0.
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (_ctx.TenantId.HasValue && _ctx.TenantId.Value > 0)
            {
                foreach (var entry in ChangeTracker.Entries())
                {
                    if (entry.State == EntityState.Added)
                    {
                        var tenantProp = entry.Metadata.FindProperty("TenantId");
                        if (tenantProp != null && tenantProp.ClrType == typeof(int))
                        {
                            var currentVal = entry.CurrentValues["TenantId"] as int? ?? 0;
                            if (currentVal == 0)
                            {
                                entry.CurrentValues["TenantId"] = _ctx.TenantId.Value;
                            }
                        }

                        var branchProp = entry.Metadata.FindProperty("BranchId");
                        if (branchProp != null && branchProp.ClrType == typeof(int) && _ctx.BranchId.HasValue && _ctx.BranchId.Value > 0)
                        {
                            var currentVal = entry.CurrentValues["BranchId"] as int? ?? 0;
                            if (currentVal == 0)
                            {
                                entry.CurrentValues["BranchId"] = _ctx.BranchId.Value;
                            }
                        }
                    }
                }
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
