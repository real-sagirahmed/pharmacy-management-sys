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
        public DbSet<PurchasePayment> PurchasePayments { get; set; }
        public DbSet<SalesMaster> SalesMasters { get; set; }
        public DbSet<SalesDetail> SalesDetails { get; set; }
        public DbSet<SalesPayment> SalesPayments { get; set; }

        // ─── Master Data ───
        public DbSet<Party> Parties { get; set; }
        public DbSet<Tax> Taxes { get; set; }
        public DbSet<Uom> Uoms { get; set; }
        public DbSet<Generic> Generics { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Manufacturer> Manufacturers { get; set; }
        public DbSet<DosageForm> DosageForms { get; set; }
        public DbSet<CommonStrength> CommonStrengths { get; set; }
        public DbSet<UseFor> UseFors { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Unique Index on Code & Name
            builder.Entity<Medicine>().HasIndex(m => m.Code).IsUnique();
            builder.Entity<Medicine>().HasIndex(m => m.Name).IsUnique();

            // Configure decimal precision — existing
            builder.Entity<Medicine>().Property(m => m.SalePrice).HasPrecision(18, 2);
            builder.Entity<Medicine>().Property(m => m.PurchasePrice).HasPrecision(18, 2);
            // PurchaseMaster
            builder.Entity<PurchaseMaster>().Property(p => p.SubTotal).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.TotalDiscount).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.TotalTax).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.Adjustment).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.GrandTotal).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.PaidAmount).HasPrecision(18, 2);
            builder.Entity<PurchaseMaster>().Property(p => p.DueAmount).HasPrecision(18, 2);
            // PurchaseDetail
            builder.Entity<PurchaseDetail>().Property(p => p.UnitCost).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.DiscountAmount).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.DiscountPercent).HasPrecision(5, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.TaxAmount).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.TaxPercent).HasPrecision(5, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.SalePrice).HasPrecision(18, 2);
            builder.Entity<PurchaseDetail>().Property(p => p.LineTotal).HasPrecision(18, 2);
            // PurchasePayment
            builder.Entity<PurchasePayment>().Property(p => p.Amount).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.GrandTotal).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.Discount).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.PaidAmount).HasPrecision(18, 2);
            builder.Entity<SalesMaster>().Property(s => s.DueAmount).HasPrecision(18, 2);
            
            builder.Entity<SalesDetail>().Property(s => s.UnitPrice).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.Tax).HasPrecision(18, 2);
            builder.Entity<SalesDetail>().Property(s => s.Subtotal).HasPrecision(18, 2);
            
            builder.Entity<SalesPayment>().Property(s => s.Amount).HasPrecision(18, 2);

            // ─── Master Data: Unique Index on Code & Name ───
            builder.Entity<Party>().HasIndex(p => p.Code).IsUnique();
            // builder.Entity<Party>().HasIndex(p => p.FullName).IsUnique(); // Removed as per logical requirement (duplicate customer names allowed)

            builder.Entity<Tax>().HasIndex(t => t.Code).IsUnique();
            builder.Entity<Tax>().HasIndex(t => t.Name).IsUnique();
            builder.Entity<Tax>().Property(t => t.TaxRate).HasPrecision(5, 2);

            builder.Entity<Uom>().HasIndex(u => u.Code).IsUnique();
            builder.Entity<Uom>().HasIndex(u => u.Name).IsUnique();

            builder.Entity<Generic>().HasIndex(g => g.Code).IsUnique();
            builder.Entity<Generic>().HasIndex(g => g.Name).IsUnique();

            builder.Entity<Category>().HasIndex(c => c.Code).IsUnique();
            builder.Entity<Category>().HasIndex(c => c.Name).IsUnique();

            builder.Entity<Manufacturer>().HasIndex(m => m.Code).IsUnique();
            builder.Entity<Manufacturer>().HasIndex(m => m.Name).IsUnique();

            builder.Entity<DosageForm>().HasIndex(d => d.Code).IsUnique();
            builder.Entity<DosageForm>().HasIndex(d => d.Name).IsUnique();

            builder.Entity<CommonStrength>().HasIndex(s => s.Code).IsUnique();
            builder.Entity<CommonStrength>().HasIndex(s => s.Name).IsUnique();

            builder.Entity<UseFor>().HasIndex(u => u.Code).IsUnique();
            builder.Entity<UseFor>().HasIndex(u => u.Name).IsUnique();
        }
    }
}
