using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Models;

namespace PharmacyApi.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Medicine> Medicines { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<PurchaseMaster> PurchaseMasters { get; set; }
        public DbSet<PurchaseDetail> PurchaseDetails { get; set; }
        public DbSet<SalesMaster> SalesMasters { get; set; }
        public DbSet<SalesDetail> SalesDetails { get; set; }

        // ─── Master Data ───
        public DbSet<Party> Parties { get; set; }
        public DbSet<Tax> Taxes { get; set; }
        public DbSet<Uom> Uoms { get; set; }
        public DbSet<Generic> Generics { get; set; }
        public DbSet<Category> Categories { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure decimal precision — existing
            builder.Entity<Medicine>().Property(m => m.Price).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.TotalAmount).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.UnitCost).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.Subtotal).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.GrandTotal).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.Discount).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.UnitPrice).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.Tax).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.Subtotal).HasPrecision(18, 2);

            // ─── Master Data: Unique Index on Code ───
            builder.Entity<Party>().HasIndex(p => p.Code).IsUnique();
            builder.Entity<Tax>().HasIndex(t => t.Code).IsUnique();
            builder.Entity<Tax>().Property(t => t.TaxRate).HasPrecision(5, 2);
            builder.Entity<Uom>().HasIndex(u => u.Code).IsUnique();
            builder.Entity<Generic>().HasIndex(g => g.Code).IsUnique();
            builder.Entity<Category>().HasIndex(c => c.Code).IsUnique();
        }
    }
}
