using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;

namespace PharmacyApi.Services
{
    public class GlobalSearchService : IGlobalSearchService
    {
        private readonly ApplicationDbContext _context;
        private readonly IUserManagementService _userService;

        public GlobalSearchService(ApplicationDbContext context, IUserManagementService userService)
        {
            _context = context;
            _userService = userService;
        }

        public async Task<List<SearchResultDto>> SearchAsync(SearchRequestDto request, string userId)
        {
            var results = new List<SearchResultDto>();
            
            if (string.IsNullOrWhiteSpace(request.SearchText))
                return results; // Return empty if no search text to avoid massive dumps

            var search = request.SearchText.ToLower();
            
            // ─── 1. Security Check (RBAC) ───
            var isSystemAdmin = await _userService.IsUserSystemAdminAsync(userId);
            var permissions = isSystemAdmin ? new List<PermissionDto>() : await _userService.GetEffectivePermissionsAsync(userId);
            var allowedModules = permissions.Where(p => p.CanView).Select(p => p.ModuleName).ToList();

            // Helper function to check strict access
            bool HasAccess(string moduleName) => isSystemAdmin || allowedModules.Contains(moduleName);
            bool IsRequested(string moduleName) => request.Modules == null || !request.Modules.Any() || request.Modules.Contains(moduleName);

            // ─── 2. Search Medicines ───
            if (HasAccess("Medicines") && IsRequested("Medicines"))
            {
                var query = _context.Medicines.AsQueryable();
                
                query = query.Where(m => m.Name.ToLower().Contains(search) || 
                                         m.Code.ToLower().Contains(search) || 
                                         m.GenericName.ToLower().Contains(search));

                // Status Filter
                if (request.Statuses != null && request.Statuses.Any())
                {
                    bool wantActive = request.Statuses.Contains("Active");
                    bool wantInactive = request.Statuses.Contains("Inactive");
                    if (wantActive && !wantInactive) query = query.Where(m => m.IsActive);
                    if (!wantActive && wantInactive) query = query.Where(m => !m.IsActive);
                }

                var meds = await query.Take(20).Select(m => new SearchResultDto
                {
                    Type = "Medicine",
                    Title = m.Name,
                    Subtitle = $"Generic: {m.GenericName} | Code: {m.Code}",
                    Info = m.IsActive ? $"Stock: {m.StockQuantity}" : "Status: Inactive",
                    RoutePath = $"/dashboard/medicines",
                    Timestamp = m.CreatedAt
                }).ToListAsync();
                results.AddRange(meds);
            }

            // ─── 3. Search Sales (Invoices/Customers) ───
            if (HasAccess("Sales") && IsRequested("Sales"))
            {
                var query = _context.SalesMasters.Include(s => s.Party).AsQueryable();

                query = query.Where(s => s.InvoiceCode.ToLower().Contains(search) || 
                                         s.CustomerName.ToLower().Contains(search) ||
                                         (s.CustomerPhone != null && s.CustomerPhone.ToLower().Contains(search)));

                // Date Filters
                if (request.FromDate.HasValue) query = query.Where(s => s.SaleDate >= request.FromDate.Value);
                if (request.ToDate.HasValue) query = query.Where(s => s.SaleDate <= request.ToDate.Value);

                // Status Filter
                if (request.Statuses != null && request.Statuses.Any())
                {
                   query = query.Where(s => request.Statuses.Contains(s.SaleStatus) || request.Statuses.Contains(s.PaymentStatus));
                }

                var sales = await query.Take(20).Select(s => new SearchResultDto
                {
                    Type = "Sale",
                    Title = $"Invoice #{s.InvoiceCode}",
                    Subtitle = s.CustomerName,
                    Info = $"Total: ৳{s.GrandTotal} | Status: {s.PaymentStatus}",
                    RoutePath = $"/dashboard/sales/edit/{s.SaleId}",
                    Timestamp = s.SaleDate
                }).ToListAsync();
                results.AddRange(sales);
            }

            // ─── 4. Search Purchases ───
            if (HasAccess("Purchases") && IsRequested("Purchases"))
            {
                var query = _context.PurchaseMasters.Include(p => p.Party).AsQueryable();

                query = query.Where(p => p.InvoiceNumber.ToLower().Contains(search) || 
                                         (p.Party != null && p.Party.FullName.ToLower().Contains(search)));

                if (request.FromDate.HasValue) query = query.Where(p => p.PurchaseDate >= request.FromDate.Value);
                if (request.ToDate.HasValue) query = query.Where(p => p.PurchaseDate <= request.ToDate.Value);

                var purchases = await query.Take(20).Select(p => new SearchResultDto
                {
                    Type = "Purchase",
                    Title = $"Supplier Invoice: {p.InvoiceNumber}",
                    Subtitle = p.Party != null ? p.Party.FullName : "Unknown Supplier",
                    Info = $"Total: ৳{p.GrandTotal} | Status: {p.PaymentStatus}",
                    RoutePath = $"/dashboard/purchases",
                    Timestamp = p.PurchaseDate
                }).ToListAsync();
                results.AddRange(purchases);
            }

            // ─── 5. Search Parties (Customers/Suppliers) ───
            if (HasAccess("Parties") && IsRequested("Parties"))
            {
                var query = _context.Parties.AsQueryable();

                query = query.Where(p => p.FullName.ToLower().Contains(search) || 
                                         p.Cell.ToLower().Contains(search) || 
                                         p.Code.ToLower().Contains(search));

                if (request.Statuses != null && request.Statuses.Any())
                {
                    if (request.Statuses.Contains("Active")) query = query.Where(p => p.IsActive);
                    if (request.Statuses.Contains("Inactive")) query = query.Where(p => !p.IsActive);
                }

                var parties = await query.Take(20).Select(p => new SearchResultDto
                {
                    Type = "Party",
                    Title = p.FullName,
                    Subtitle = $"Type: {p.PartyType} | Code: {p.Code}",
                    Info = $"Phone: {p.Cell}",
                    RoutePath = $"/dashboard/parties",
                    Timestamp = null
                }).ToListAsync();
                results.AddRange(parties);
            }

            // Final Sort: Most relevant/recent first (Descending by Date)
            return results.OrderByDescending(r => r.Timestamp).ToList();
        }
    }
}
