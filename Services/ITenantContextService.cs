namespace PharmacyApi.Services
{
    // ARCHITECTURAL INTENT: TenantId ও BranchId সবসময় এই সার্ভিস থেকে নেওয়া হবে।
    // Controller বা Repository সরাসরি HttpContext parse করবে না।
    // JWT Claim থেকে লোড হয় — HTTP Request-scoped (Scoped DI lifetime)।
    //
    // Access Hierarchy (পরিবর্তন করবেন না):
    //   IsSystemAdmin = true                    → সব Tenant, সব Branch
    //   TenantId ≠ null, BranchId = null        → Tenant Owner (নিজের সব Branch)
    //   TenantId ≠ null, BranchId ≠ null        → Branch Staff (শুধু নির্দিষ্ট Branch)
    public interface ITenantContextService
    {
        int?  TenantId              { get; }
        int?  BranchId              { get; }   // null = সব Branch দেখতে পারবে (Owner/Admin)
        bool  IsSystemAdmin         { get; }
        bool  CanAccessAllBranches  { get; }   // TenantId ≠ null কিন্তু BranchId = null
    }
}
