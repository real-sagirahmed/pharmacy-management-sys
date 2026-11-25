using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Models
{
    // ARCHITECTURAL INTENT: Tenant = একটি স্বতন্ত্র ফার্মেসি ব্যবসা।
    // TenantId দিয়ে ব্যবসা-প্রতিষ্ঠান স্তরে সম্পূর্ণ ডেটা আইসোলেশন নিশ্চিত হয়।
    // Medicine Catalog Tenant-level shared (Branch আলাদা করে না)।
    // Stock, Sales, Purchase সব Branch-specific।
    // কখনো একটি Tenant-এর ডেটা অন্য Tenant দেখতে পারবে না।
    // Tenant মানে teamS7-এর বিল-পেইং ক্লায়েন্ট — Branch নয়।
    public class Tenant
    {
        [Key]
        public int TenantId { get; set; }

        [Required]
        [StringLength(150)]
        public string PharmacyName { get; set; } = string.Empty;  // "রহিম ফার্মেসি গ্রুপ"

        [StringLength(200)]
        public string? Slogan { get; set; }

        [StringLength(300)]
        public string? HeadOfficeAddress { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        // DGDA প্রধান লাইসেন্স নম্বর (হেড অফিসের) — ইনভয়েস হেডারে প্রিন্ট হবে
        [StringLength(50)]
        public string? DrugLicenseNo { get; set; }

        // লোগো ইমেজ পাথ (wwwroot/uploads/logos/tenant-{id}/)
        [StringLength(300)]
        public string? LogoPath { get; set; }

        // ইনভয়েসের ফুটার টেক্সট (যেমন: "ধন্যবাদ, পুনরায় আসবেন")
        [StringLength(500)]
        public string? InvoiceFooter { get; set; }

        // TailwindCSS-compatible primary color hex (যেমন: "#1e40af")
        [StringLength(10)]
        public string? PrimaryColor { get; set; }

        public bool IsActive { get; set; } = true;

        // SaaS Subscription
        // Trial | Basic | Pro | Enterprise
        [StringLength(20)]
        public string SubscriptionPlan { get; set; } = "Trial";

        public DateTime? SubscriptionExpiry { get; set; }

        // Navigation
        public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();

        public DateTime CreatedAt { get; set; }

        public Tenant()
        {
            CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
        }
    }
}
