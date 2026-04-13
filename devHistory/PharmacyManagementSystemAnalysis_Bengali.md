# ফার্মেসি ম্যানেজমেন্ট সিস্টেম - সম্পূর্ণ প্রজেক্ট বিশ্লেষণ

## ১. সামগ্রিক আর্কিটেকচার এবং টেকনোলজি স্ট্যাক

### ব্যাকএন্ড টেকনোলজি স্ট্যাক
- **ফ্রেমওয়ার্ক:** ASP.NET Core 8.0 (net8.0)
- **ডেটাবেস:** SQL Server (databaseasp.net-এ হোস্ট করা)
- **ORM:** Entity Framework Core 8.0 Code-First অ্যাপ্রোচের সাথে
- **অথেন্টিকেশন:** JWT Bearer Token (JwtBearer)
- **অথরাইজেশন:** ASP.NET Identity Role-Based Access Control (RBAC) এর সাথে
- **API ডকুমেন্টেশন:** Swagger/OpenAPI 6.5.0
- **ইমেইল সার্ভিস:** SMTP (Gmail কনফিগারেশন)

### ফ্রন্টএন্ড টেকনোলজি স্ট্যাক
- **ফ্রেমওয়ার্ক:** Angular 19.2.0
- **UI কম্পোনেন্ট লাইব্রেরি:** PrimeNG 19.1.4, Material Design, TailwindCSS 4.2.1
- **HTTP ক্লায়েন্ট:** Angular HttpClient with Interceptors
- **বিল্ড টুল:** Angular CLI 19.2.0
- **রাউটিং:** Angular Router with Guards

### ডিপ্লয়মেন্ট
- **ফ্রন্টএন্ড বিল্ড আউটপুট:** [wwwroot](wwwroot) ডিরেক্টরি (ব্যাকএন্ডের সাথে ইন্টিগ্রেটেড)
- **ব্যাকএন্ড হোস্টিং:** ASP.NET Core InProcess হোস্টিং মডেল
- **CORS কনফিগারেশন:** ফ্রন্টএন্ডের জন্য সক্ষম (http://pharmacymsys.runasp.net)

---

## ২. ব্যাকএন্ড ইমপ্লিমেন্টেশন

### কন্ট্রোলার এবং এন্ডপয়েন্টস

সিস্টেমটি বিভিন্ন ব্যবসায়িক ডোমেইন পরিচালনা করে ১৮টি বিশেষায়িত কন্ট্রোলার বাস্তবায়ন করে:

| কন্ট্রোলার | কী এন্ডপয়েন্টস |
|-----------|---------------|
| [AuthController.cs](Controllers/AuthController.cs) | POST `/register`, `/login` - JWT টোকেন জেনারেশন সহ ইউজার অথেন্টিকেশন |
| [MedicinesController.cs](Controllers/MedicinesController.cs) | GET/POST/PUT `/medicines`, `/next-code` - পেজিনেশন সহ মেডিসিন মাস্টার ডেটা ম্যানেজমেন্ট |
| [SalesController.cs](Controllers/SalesController.cs) | GET/POST `/sales`, `/hold`, `/next-invoice-code`, `/medicine-batches/{id}` - সেলস ট্রানজ্যাকশন এবং হোল্ড ফাংশনালিটি |
| [PurchasesController.cs](Controllers/PurchasesController.cs) | GET/POST/DELETE `/purchases`, `/next-grn`, `/paged` - GRN তৈরি এবং সাপ্লায়ার পারচেস |
| [PaymentsController.cs](Controllers/PaymentsController.cs) | GET `/SalesDues`, `/PurchaseDues` + POST `/CollectSalesDue`, `/PayPurchaseDue`, `/Bulk*` - পেমেন্ট কালেকশন এবং রিকনসিলিয়েশন |
| [PartiesController.cs](Controllers/PartiesController.cs) | ডুয়াল-টাইপ পার্টি মডেল সহ কাস্টমার/সাপ্লায়ার মাস্টার ডেটা |
| [ReportsController.cs](Controllers/ReportsController.cs) | GET `/sales-summary`, `/stock-status`, `/profit-loss`, `/expiry`, `/top-selling`, `/ledger`, `/vat-report` - ব্যবসায়িক অ্যানালিটিক্স এবং রিপোর্টিং এন্ডপয়েন্টস (১০+ রিপোর্ট টাইপ) |
| [UsersController.cs](Controllers/UsersController.cs) | ইউজার এবং রোল ম্যানেজমেন্ট (অ্যাডমিন-অনলি): CRUD ইউজার, রোল ম্যানেজ, পারমিশন অ্যাসাইন |
| মাস্টার ডেটা কন্ট্রোলার | [CategoriesController.cs](Controllers/CategoriesController.cs), [TaxesController.cs](Controllers/TaxesController.cs), [UomsController.cs](Controllers/UomsController.cs), [GenericsController.cs](Controllers/GenericsController.cs), [ManufacturersController.cs](Controllers/ManufacturersController.cs), [DosageFormsController.cs](Controllers/DosageFormsController.cs), [CommonStrengthsController.cs](Controllers/CommonStrengthsController.cs), [UseForController.cs](Controllers/UseForController.cs) |

**অথেন্টিকেশন এবং অথরাইজেশন:**
- সমস্ত প্রোটেক্টেড এন্ডপয়েন্টে JWT Bearer টোকেন ভ্যালিডেশন।
- **SystemAdmin (সুপার-ইউজার):** এই রোলটি সিস্টেমের একমাত্র গ্লোবাল বাইপাস পাওয়ার অধিকারী। পারমিশন ম্যাট্রিক্সের বাইরেও এরা সব মডিউল এক্সেস করতে পারে।
- **পারমিশন-বেসড এক্সেস:** Admin, Manager এবং Cashier রোলের ক্ষমতা শুধুমাত্র ডাটাবেজ পারমিশন ম্যাট্রিক্সের (Permission Matrix) মাধ্যমে নির্ধারিত হয়।
- [AuthController.cs](Controllers/AuthController.cs) রোল অ্যাসাইনমেন্ট সহ রেজিস্ট্রেশন এবং লগইন পরিচালনা করে।
- টোকেন এক্সপাইরেশন: লগইন থেকে ৩ ঘণ্টা।
- **অটো-রোল সিডিং:** অ্যাপ্লিকেশন স্টার্টআপে প্রথম ইউজারকে **SystemAdmin** হিসেবে প্রমোট করা হয়।
- **এসকেলেশন প্রোটেকশন:** রোল এবং পারমিশন ম্যানেজমেন্ট এন্ডপয়েন্টগুলো শুধুমাত্র SystemAdmin-এর জন্য সুরক্ষিত।

### মডেল এবং ডেটাবেস স্কিমা

**ডেটাবেস কনটেক্সট:** [ApplicationDbContext.cs](Data/ApplicationDbContext.cs) `IdentityDbContext<ApplicationUser>` এক্সটেন্ড করে

**কোর এন্টিটি মডেল:**

১. **[Medicine.cs](Models/Medicine.cs)** - ফার্মাসিউটিক্যাল প্রোডাক্টস
   - ফিল্ডস: Code, Name, GenericName, Category, UOM, PurchasePrice, SalePrice, StockQuantity, Batch, ExpiryDate, Manufacturer, DosageForm, Strength, UseFor, IsActive
   - Code & Name-এ ইউনিক কনস্ট্রেইন্টস
   - অডিট ফিল্ডস: CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
   - প্রিসিশন: প্রাইসের জন্য Decimal(18,2)

২. **পারচেস ট্রানজ্যাকশন** - GRN (Goods Receipt Note) প্রসেস
   - [PurchaseMaster.cs](Models/Purchase.cs): অটো-জেনারেটেড GRN কোডস (GRN-00001 ফরম্যাট) সহ হেডার টেবিল
   - PurchaseDetail: ব্যাচ ট্র্যাকিং, UOM, কস্ট ব্রেকডাউন (discount%, tax%, unit cost) সহ লাইন আইটেমস
   - PurchasePayment: মাল্টিপল পেমেন্ট মেথডস সহ পেমেন্ট ট্র্যাকিং
   - [Party.cs](Models/Party.cs) (সাপ্লায়ার) এর সাথে FK রেফারেন্স

৩. **সেলস ট্রানজ্যাকশন** - ইনভয়েস ম্যানেজমেন্ট
   - [SalesMaster.cs](Models/Sales.cs): অটো-জেনারেটেড কোডস (INV-ফরম্যাট), কাস্টমার ইনফো স্ন্যাপশট সহ ইনভয়েস হেডার
   - SalesDetail: প্রাইসিং, ট্যাক্স/ডিসকাউন্ট ব্রেকডাউন সহ লাইন আইটেমস
   - SalesPayment: মাল্টিপল পেমেন্ট মেথড সাপোর্ট (Cash, Card, Cheque, ইত্যাদি)
   - Walk-in কাস্টমার এবং রেজিস্টার্ড পার্টিস সাপোর্ট করে
   - সেল স্ট্যাটাস ট্র্যাকিং: Completed / Hold

৪. **[Party.cs](Models/Party.cs)** - ইউনিফাইড কাস্টমার/সাপ্লায়ার মাস্টার
   - ডুয়াল-পারপাস মডেল (PartyType: Customer | Supplier)
   - Code (ইউনিক), FullName, Cell, Email, Address
   - লজিক্যাল ডিলিশনের জন্য IsActive ফ্ল্যাগ

৫. **মাস্টার ডেটা মডেল:**
   - [Tax.cs](Models/Tax.cs): TaxRate (0-100), ইউনিক Code & Name
   - [Uom.cs](Models/Uom.cs): Unit of Measurement (Box, Strip, Pcs, Bottle, ইত্যাদি)
   - [Generic.cs](Models/Generic.cs): API names/সল্ট names (Paracetamol, Amoxicillin)
   - [Category.cs](Models/Category.cs): মেডিসিন ক্যাটাগরিস (Antibiotic, Antacid, Vitamin)
   - [Manufacturer.cs](Models/Manufacturer.cs): ফার্মা ম্যানুফ্যাকচারার্স
   - [DosageForm.cs](Models/DosageForm.cs): Tablet, Capsule, Syrup, Injection, ইত্যাদি
   - [CommonStrength.cs](Models/CommonStrength.cs): প্রিডিফাইন্ড ডোজেস
   - [UseFor.cs](Models/UseFor.cs): মেডিক্যাল ইন্ডিকেশনস

৬. **ইউজার এবং অথরাইজেশন:**
   - [ApplicationUser.cs](Models/ApplicationUser.cs): FullName, IsActive সহ IdentityUser এক্সটেন্ড করে
   - [RolePermission.cs](Models/RolePermission.cs): মডিউল-লেভেল পারমিশনস (View, Create, Edit, Delete)

**ডেটাবেস প্রিসিশন এবং কনস্ট্রেইন্টস:**
- সমস্ত মোনেটারি অ্যামাউন্টস: Decimal(18, 2)
- ডিসকাউন্ট/ট্যাক্স পারসেন্টেজেস: Decimal(5, 2)
- সমস্ত মাস্টার ডেটায় ইউনিক ইনডেক্সেস (Code + Name পেয়ারস)
- ফরেন কী রিলেশনশিপস ক্যাসকেড রুলস সহ

**মাইগ্রেশনস:**
সর্বশেষ মাইগ্রেশন: [20260313071430_RemovePartyNameUniqueness.cs](Migrations/20260313071430_RemovePartyNameUniqueness.cs) ডুপ্লিকেট কাস্টমার names (ব্যবসায়িক রিকোয়ারমেন্ট) অনুমতি দেয়

### সার্ভিসেস এবং রিপোজিটরিস

**সার্ভিস লেয়ার:** [Services/](Services/)

১. **[IUserManagementService.cs](Services/UserManagementService.cs)** - ইউজার এবং রোল CRUD
   - CreateUserAsync, UpdateUserAsync, ToggleUserStatusAsync
   - অ্যাসিঙ্ক রোল ম্যানেজমেন্ট (Create, Update, Delete roles)
   - পারমিশন ইনহেরিটেন্সের জন্য GetEffectivePermissionsAsync()

২. **[IEmailService.cs](Services/EmailService.cs)** - ইমেইল অ্যাবস্ট্রাকশন
   - ইমপ্লিমেন্টেশনস:
     - SmtpEmailService: Gmail SMTP (formal.teams7@gmail.com)
     - FileEmailService: [App_Data/Logs/Emails.txt](App_Data/Logs/Emails.txt)-এ ফাইল-বেসড লগিং

**রিপোজিটরি প্যাটার্ন:** [Repositories/](Repositories/)

**জেনেরিক রিপোজিটরি ইন্টারফেস:**
```csharp
public interface IRepository<T, TDto>
{
    Task<IEnumerable<TDto>> GetAllAsync();
    Task<TDto?> GetByIdAsync(int id);
    Task<TDto> CreateAsync(TDto dto);
    Task<bool> UpdateAsync(int id, TDto dto);
    Task<bool> DeleteAsync(int id);
    Task<string> GetNextCodeAsync(string prefix);
}
```

**স্পেশালাইজড রিপোজিটরিস:**

- **[IMedicineRepository.cs](Repositories/IMedicineRepository.cs) & [MedicineRepository.cs](Repositories/MedicineRepository.cs)**
  - ফিল্টারস (Category, GenericName, Manufacturer, ExpiryDate range, DosageForm, Strength, UseFor) সহ পেজিনেটেড সার্চ
  - PurchaseDetails থেকে ব্যাচ ট্র্যাকিং
  - স্টক কোয়ান্টিটি ম্যানেজমেন্ট
  - অটো-কোড জেনারেশন (MED-00001)

- **[IPurchaseRepository.cs](Repositories/IPurchaseRepository.cs) & [PurchaseRepository.cs](Repositories/PurchaseRepository.cs)**
  - GRN কোড অটো-জেনারেশন (GRN-00001 ফরম্যাট)
  - ডেট রেঞ্জ এবং সাপ্লায়ার ফিল্টারিং সহ পেজড লিস্টিং
  - রিলেটেড এন্টিটিস (Party, Details, Payments) সহ ফুল ডিটেইল রিট্রিভাল
  - ট্যাক্স/ডিসকাউন্ট সহ পারচেস লাইন আইটেম ম্যানেজমেন্ট

- **[ISalesRepository.cs](Repositories/ISalesRepository.cs)** - কমপ্লেক্স সেলস অপারেশনস
  - ইনভয়েস কোড জেনারেশন
  - সেলসের জন্য ব্যাচ/এক্সপায়ারি ট্র্যাকিং
  - হোল্ড ট্রানজ্যাকশন ফাংশনালিটি (স্টক NOT ডিডাক্টেড)
  - সেল স্ট্যাটাস ম্যানেজমেন্ট (Completed/Hold)
  - পেমেন্ট রিকনসিলিয়েশন

- **[IPaymentRepository.cs](Repositories/IPaymentRepository.cs)**
  - GetSalesDuesAsync() / GetPurchaseDuesAsync()
  - CollectSalesDueAsync() / PayPurchaseDueAsync()
  - BulkCollectSalesDueAsync() / BulkPayPurchaseDueAsync()
  - প্রতি ট্রানজ্যাকশনে পেমেন্ট হিস্টরি

- **[IReportRepository.cs](Repositories/IReportRepository.cs)** - অ্যানালিটিক্স ব্যাকএন্ড
  - ডেট-রেঞ্জ, কাস্টমার ব্রেকডাউন সহ সেলস সামারি
  - পারচেস ভ্যালু সহ স্টক স্ট্যাটাস
  - COGS-বেসড প্রফিট/লস ক্যালকুলেশন
  - কোয়ান্টিটি এবং রেভেনিউ দ্বারা টপ-সেলিং মেডিসিনস
  - কনফিগারেবল মান্থস উইন্ডো সহ এক্সপায়ারি রিপোর্ট
  - লো স্টক অ্যালার্টস
  - কাস্টমার/সাপ্লায়ার লেজার রিপোর্টস
  - ইউজার পারফরম্যান্স অ্যানালিটিক্স

**মাস্টার ডেটা রিপোজিটরিস:**
- [CategoryRepository.cs](Repositories/CategoryRepository.cs), [TaxRepository.cs](Repositories/TaxRepository.cs), [UomRepository.cs](Repositories/UomRepository.cs), [GenericMedicineRepository.cs](Repositories/GenericMedicineRepository.cs), [ManufacturerRepository.cs](Repositories/ManufacturerRepository.cs), [DosageFormRepository.cs](Repositories/DosageFormRepository.cs), [CommonStrengthRepository.cs](Repositories/CommonStrengthRepository.cs), [UseForRepository.cs](Repositories/UseForRepository.cs) - পেজিনেশন সহ স্ট্যান্ডার্ড CRUD

### কনফিগারেশন এবং ডিপেন্ডেন্সিস

**[Program.cs](Program.cs) - স্টার্টআপ কনফিগারেশন:**

```csharp
// DI রেজিস্ট্রেশন (lines 17-36)
builder.Services.AddScoped<IPartyRepository, PartyRepository>();
builder.Services.AddScoped<IRepository<Tax, TaxDto>, TaxRepository>();
// ... 14+ রিপোজিটরিস রেজিস্টার্ড

// রিট্রাই পলিসি সহ ডেটাবেস কনটেক্সট
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30)
        )
    ));

// Identity & JWT অথেন্টিকেশন
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// appsettings থেকে ডায়নামিক অরিজিনস সহ CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(/* dynamic from config */)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// স্টার্টআপে অটো-মাইগ্রেশন & রোল সিডিং
using (var scope = app.Services.CreateScope())
{
    context.Database.Migrate();
    // অ্যাডমিন রোলস এক্সিস্ট করে তা নিশ্চিত করে
    // যদি কোনো অ্যাডমিন না থাকে তাহলে প্রথম ইউজারকে অ্যাডমিন প্রমোট করে
}
```

**[appsettings.json](appsettings.json) কনফিগারেশন:**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=db44047.databaseasp.net; Database=db44047; User Id=db44047; Password=PharmacyDb123;"
  },
  "Jwt": {
    "Key": "Pr0d-Ph@rmacy-JWT-S3cr3t-K3y-2026!XyZ",
    "Issuer": "PharmacyApi",
    "Audience": "PharmacyFrontend"
  },
  "Cors": {
    "AllowedOrigins": "http://pharmacymsys.runasp.net"
  },
  "SmtpSettings": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "Username": "formal.teams7@gmail.com",
    "Password": "ewlvuyvqrerlhulb",
    "SenderEmail": "formal.teams7@gmail.com"
  }
}
```

---

## ৩. ফ্রন্টএন্ড ইমপ্লিমেন্টেশন (Angular)

### প্রজেক্ট স্ট্রাকচার

[frontend/](frontend/) - Angular CLI প্রজেক্ট (pharmacy-sys)

### ডোমেইন অনুসারে কম্পোনেন্টস

**অথেন্টিকেশন কম্পোনেন্টস:**
- [login/login.component.ts](frontend/src/app/components/login) - JWT টোকেন পারসিস্টেন্স সহ ইউজারনেম/পাসওয়ার্ড লগইন
- [register/register.component.ts](frontend/src/app/components/register) - রোল সিলেকশন সহ ইউজার রেজিস্ট্রেশন
- [forgot-password/forgot-password.component.ts](frontend/src/app/components/forgot-password)
- [reset-password/reset-password.component.ts](frontend/src/app/components/reset-password)

**কোর ব্যবসায়িক কম্পোনেন্টস:**
- [dashboard/](frontend/src/app/components/dashboard) - মেইন লেআউট এবং ন্যাভিগেশন হাব
  - [user-management/user-management.component.ts](frontend/src/app/components/dashboard/user-management)
  - [role-management/role-management.component.ts](frontend/src/app/components/dashboard/user-management)
- [medicines/medicine-list.component.ts](frontend/src/app/components/medicines) - CRUD সহ মেডিসিন ইনভেন্টরি
- [purchases/purchase-list.component.ts](frontend/src/app/components/purchases) - GRN লিস্ট ভিউ
- [purchases/purchase-form.component.ts](frontend/src/app/components/purchases) - ব্যাচ/এক্সপায়ারি ট্র্যাকিং সহ GRN তৈরি ফর্ম
- [sales/sales-list.component.ts](frontend/src/app/components/sales) - ইনভয়েস/সেলস হিস্টরি
- [sales/sales-form.component.ts](frontend/src/app/components/sales) - কার্ট এবং পেমেন্ট সহ POS-লাইক সেলস ফর্ম
- [due-collection/due-collection.component.ts](frontend/src/app/components/due-collection) - পেমেন্ট রিকনসিলিয়েশন UI

**মাস্টার ডেটা কম্পোনেন্টস:**
- [parties/party-list.component.ts](frontend/src/app/components/parties) - কাস্টমার/সাপ্লায়ার ম্যানেজমেন্ট
- [categories/](frontend/src/app/components/categories), [taxes/](frontend/src/app/components/taxes), [uoms/](frontend/src/app/components/uoms), [generics/](frontend/src/app/components/generics), [manufacturers/](frontend/src/app/components/manufacturers), [dosage-forms/](frontend/src/app/components/dosage-forms), [common-strengths/](frontend/src/app/components/common-strengths), [use-for/](frontend/src/app/components/use-for) - মাস্টার ডেটার জন্য স্ট্যান্ডার্ড CRUD ইন্টারফেসেস

**রিপোর্টিং এবং অ্যানালিটিক্স:**
- [analytics/visual-dashboard.component.ts](frontend/src/app/components/analytics) - Chart.js (সেলস ট্রেন্ডস, স্টক লেভেলস) সহ ভিজুয়াল ড্যাশবোর্ডস
- [reports/report-viewer.component.ts](frontend/src/app/components/reports) - ডায়নামিক রিপোর্ট ডিসপ্লে সহ:
  - Sales Summary, Purchase Summary
  - Stock Status, **Profit/Loss (শুধুমাত্র SystemAdmin দৃশ্যমান)**
  - Expiry Report, Top-Selling Medicines
  - Low Stock Alerts
  - Customer/Supplier Ledgers
  - User Performance
  - VAT/Tax Reports
  - jspdf & jspdf-autotable দ্বারা PDF এক্সপোর্ট
  - প্রিন্ট ফাংশনালিটি
  - **সিকিউরিটি:** প্রফিট মার্জিন এবং সংবেদনশীল তথ্য শুধুমাত্র SystemAdmin দেখতে পাবেন।

### সার্ভিসেস

[frontend/src/app/services/](frontend/src/app/services/) - ১৯টি বিশেষায়িত সার্ভিসেস:

- **[auth.service.ts](frontend/src/app/services/auth.service.ts)** - JWT টোকেন ম্যানেজমেন্ট, লগইন/লগআউট, রোল/পারমিশন রিট্রিভাল
- **[medicine.service.ts](frontend/src/app/services/medicine.service.ts)** - মেডিসিন CRUD এবং ব্যাচ রিট্রিভাল
- **[purchase.service.ts](frontend/src/app/services/purchase.service.ts)** - GRN অপারেশনস
- **[sales.service.ts](frontend/src/app/services/sales.service.ts)** - সেলস ট্রানজ্যাকশনস (Create, Hold, Delete)
- **[payment.service.ts](frontend/src/app/services/payment.service.ts)** - ডিউ কালেকশন এবং পেমেন্ট হিস্টরি
- **[party.service.ts](frontend/src/app/services/party.service.ts)** - কাস্টমার/সাপ্লায়ার ম্যানেজমেন্ট
- **[report.service.ts](frontend/src/app/services/report.service.ts)** - রিপোর্ট ডেটা ফেচিং এবং এক্সপোর্ট
- **[user.service.ts](frontend/src/app/services/user.service.ts)** - ইউজার এবং রোল ম্যানেজমেন্ট (অ্যাডমিন অনলি)
- **মাস্টার ডেটা সার্ভিসেস:** [category.service.ts](frontend/src/app/services/category.service.ts), [tax.service.ts](frontend/src/app/services/tax.service.ts), [uom.service.ts](frontend/src/app/services/uom.service.ts), [generic.service.ts](frontend/src/app/services/generic.service.ts), [manufacturer.service.ts](frontend/src/app/services/manufacturer.service.ts), [dosage-form.service.ts](frontend/src/app/services/dosage-form.service.ts), [common-strength.service.ts](frontend/src/app/services/common-strength.service.ts), [use-for.service.ts](frontend/src/app/services/use-for.service.ts)
- **প্রিন্ট সার্ভিসেস:** [grn-print.service.ts](frontend/src/app/services/grn-print.service.ts), [invoice-print.service.ts](frontend/src/app/services/invoice-print.service.ts)

### গার্ডস এবং ইন্টারসেপ্টরস

**[auth.guard.ts](frontend/src/app/guards/auth.guard.ts):**
- প্রোটেক্টেড রুটসের জন্য `CanActivate` ইমপ্লিমেন্ট করে
- টোকেন এক্সিস্টেন্স এবং রোল-বেসড রুট অ্যাক্সেস চেক করে
- অনথরাইজড হলে লগইন-এ রিডাইরেক্ট করে

**[auth.interceptor.ts](frontend/src/app/interceptors/auth.interceptor.ts):**
- সমস্ত HTTP রিকোয়েস্টে JWT Bearer টোকেন অ্যাটাচ করে
- `currentUserValue` (auth.service-এ BehaviorSubject) থেকে টোকেন রিড করে

### রাউটিং

**[app.routes.ts](frontend/src/app/routes.ts)** - স্ট্যান্ডালোন API রুটস:

```typescript
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [AuthGuard],
  children: [
    { path: 'medicines', component: MedicineListComponent },
    { path: 'purchases', component: PurchaseListComponent },
    { path: 'purchases/new', component: PurchaseFormComponent },
    { path: 'sales', component: SalesListComponent },
    { path: 'sales/new', component: SalesFormComponent },
    { path: 'sales/edit/:id', component: SalesFormComponent },
    { path: 'due-collection', component: DueCollectionComponent },
    
    // লেজি-লোডেড রিপোর্টস
    { path: 'analytics', loadComponent: () => import('./components/analytics/visual-dashboard.component') },
    { path: 'reports/sales-summary', loadComponent: () => import('./components/reports/report-viewer.component') },
    { path: 'reports/profit-loss', loadComponent: () => import('./components/reports/report-viewer.component') },
    // ... 8+ রিপোর্ট রুটস
    
    { path: 'users', component: UserManagementComponent },
    { path: 'roles', component: RoleManagementComponent }
  ]
}
```

### কনফিগারেশন

**[app.config.ts](frontend/src/app/app.config.ts)** - ডিপেন্ডেন্সি ইনজেকশন সেটআপ:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    providePrimeNG({ theme: { preset: Aura } }),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    MessageService,
    ConfirmationService,
    DatePipe
  ]
};
```

### UI ডিপেন্ডেন্সিস

- **কম্পোনেন্ট ফ্রেমওয়ার্ক:** PrimeNG 19.1.4 (DataTable, Dialog, Form controls)
- **আইকনস:** Lucide Angular 0.577.0, PrimeIcons 7.0.0
- **স্টাইলিং:** TailwindCSS 4.2.1, Material Prebuilt Theme (Azure Blue)
- **রিপোর্টস:** jsPDF 4.2.0, jspdf-autotable 5.0.7
- **চার্টস:** Chart.js 4.5.1

---

## ৪. কী ফিচার এবং ফাংশনালিটিস ইমপ্লিমেন্টেড

### ১. **মেডিসিন ইনভেন্টরি ম্যানেজমেন্ট**
- স্ট্যান্ডার্ডাইজড ফিল্ডস সহ মেডিসিনস তৈরি, আপডেট, ডিলিট
- ইউনিক কোড/নেম এনফোর্সমেন্ট
- রিয়েল-টাইম স্টক কোয়ান্টিটি ট্র্যাকিং
- ব্যাচ এবং এক্সপায়ারি ডেট মনিটরিং
- মেডিসিন অ্যাট্রিবিউটস: Generic, Category, Manufacturer, Dosage Form, Strength, UseFor
- মাল্টি-ফিল্ড ফিল্টারিং সহ পেজিনেটেড সার্চ

### ২. **পারচেস ম্যানেজমেন্ট (GRN প্রসেস)**
- অটো-জেনারেটেড কোডস (GRN-00001 ফরম্যাট) সহ Goods Receipt Note (GRN)
- সাপ্লায়ার/পার্টি সিলেকশন
- ব্যাচ/এক্সপায়ারি ট্র্যাকিং সহ মাল্টিপল লাইন আইটেমস
- ইউনিট-অফ-মেজার সাপোর্ট
- লাইন-লেভেল এবং ডকুমেন্ট-লেভেল ট্যাক্স এবং ডিসকাউন্ট ক্যালকুলেশন
- Paid, Partial, Due স্ট্যাটাস সহ পেমেন্ট ট্র্যাকিং
- মাল্টিপল পেমেন্ট মেথডস সাপোর্টেড (Cash, Bank, Check)
- পার্শিয়াল পেমেন্টসের জন্য পেমেন্ট রিকনসিলিয়েশন

### ৩. **সেলস ম্যানেজমেন্ট (POS)**
- অটো-ইনক্রিমেন্টিং কোডস (INV-ফরম্যাট) সহ ইনভয়েস জেনারেশন
- Walk-in বা রেজিস্টার্ড পার্টি কাস্টমার সিলেকশন
- মাল্টি-আইটেম শপিং কার্ট সহ:
  - PurchaseDetails থেকে FIFO প্রিন্সিপল দ্বারা ব্যাচ/এক্সপায়ারি সিলেকশন
  - ইউনিট প্রাইস এবং ট্যাক্স ওভাররাইড ক্যাপাবিলিটি
  - লাইন-লেভেল ডিসকাউন্ট (% বা অ্যামাউন্ট)
- ডকুমেন্ট-লেভেল স্পেশাল ডিসকাউন্ট
- অটোমেটিক ট্যাক্স ক্যালকুলেশন
- **সেল হোল্ড ফাংশনালিটি:** স্টক ডিডাকশন ছাড়াই ইনকমপ্লিট সেলস সেভ; পরে রিজিউম
- মাল্টিপল পেমেন্ট মেথডস (Cash, Card, Cheque, Bank Transfer)
- ট্রানজ্যাকশন টাইমে বা স্প্লিট পেমেন্টসে পেমেন্ট
- সেল স্ট্যাটাস ট্র্যাকিং (Completed/Hold)

### ৪. **পেমেন্ট রিকনসিলিয়েশন**
- পার্শিয়াল পেমেন্ট সাপোর্ট সহ সেলস ডিউ কালেকশন
- পারচেস ডিউ পেমেন্ট ট্র্যাকিং
- বাল্ক পেমেন্ট অপারেশনস
- ইন্ডিভিজুয়াল এবং অ্যাগ্রিগেট লেজার রিপোর্টিং
- প্রতি ট্রানজ্যাকশনে পেমেন্ট হিস্টরি
- আউটস্ট্যান্ডিং অ্যামাউন্ট ট্র্যাকিং

### ৫. **মাস্টার ডেটা ম্যানেজমেন্ট**
কমপ্রিহেনসিভ সেটআপ পেজেস:
- **পার্টিস:** কোড, ফোন, ইমেইল, অ্যাড্রেস সহ কাস্টমারস এবং সাপ্লায়ারস (ইউনিফাইড মডেল)
- **ট্যাক্সেস:** পারচেসেস এবং সেলসে অ্যাপ্লাইড রেটস (0-100%) সহ VAT/GST সেটআপ
- **ইউনিটস অফ মেজার:** Pcs, Box, Strip, Bottle, ইত্যাদি
- **জেনেরিকস (API Names):** Paracetamol, Amoxicillin, ইত্যাদি
- **ক্যাটাগরিস:** মেডিসিন ক্লাসিফিকেশন (Antibiotic, Antacid, Vitamin, ইত্যাদি)
- **ম্যানুফ্যাকচারার্স:** ফার্মা কোম্পানি রেকর্ডস
- **ডোজেজ ফর্মস:** Tablet, Capsule, Syrup, Injection, Cream, ইত্যাদি
- **কমন স্ট্রেন্থস:** প্রিডিফাইন্ড ডোজেজ ভ্যালুজ (500mg, 250mg, ইত্যাদি)
- **ইউজ ফর:** মেডিক্যাল ইন্ডিকেশনস (Headache, Cold, Fever, ইত্যাদি)

সমস্ত কোড ইউনিকনেস, অ্যাক্টিভেশন স্ট্যাটাস, এবং অডিট ট্রেইলস সহ

### ৬. **রিপোর্টিং এবং অ্যানালিটিক্স**
কমপ্রিহেনসিভ ব্যবসায়িক ইন্টেলিজেন্স:
- **সেলস সামারি:** ডেট-রেঞ্জ, ইনভয়েস-ওয়াইজ, কাস্টমার ব্রেকডাউন, প্রফিট মার্জিন
- **পারচেস সামারি:** GRN-ওয়াইজ, সাপ্লায়ার-ওয়াইজ, আউটস্ট্যান্ডিং ডিউজ
- **স্টক স্ট্যাটাস রিপোর্ট:** কারেন্ট স্টক ভ্যালু (পারচেস এবং সেলিং প্রাইসেস), ইনভেন্টরি ভ্যালুয়েশন
- **প্রফিট এবং লস:** সেলস - COGS দ্বারা গ্রস প্রফিট ক্যালকুলেশন, নেট প্রফিট ট্রেন্ডিং
- **এক্সপায়ারি ম্যানেজমেন্ট:** কনফিগারেবল মান্থস উইন্ডো সহ আপকামিং এক্সপায়ারিস, ব্যাচ ট্র্যাকিং
- **টপ-সেলিং মেডিসিনস:** কোয়ান্টিটি এবং রেভেনিউ দ্বারা, ট্রানজ্যাকশন ফ্রিকোয়েন্সি
- **লো স্টক অ্যালার্টস:** কনফিগারেবল থ্রেশহোল্ডস
- **লেজার রিপোর্টস:** ব্যালেন্স সহ কাস্টমার/সাপ্লায়ার ট্রানজ্যাকশন হিস্টরি
- **ইউজার পারফরম্যান্স:** ইউজার প্রতি সেলস কাউন্ট, রেভেনিউ, প্রফিট কন্ট্রিবিউশন
- **ট্যাক্স/VAT রিপোর্ট:** ট্যাক্স-ওয়াইজ ব্রেকডাউন, কালেক্টেড অ্যামাউন্ট, অডিট ট্রেইল

ভিজুয়াল ড্যাশবোর্ডস সহ:
- Chart.js ইন্টিগ্রেশন (পাই, বার, লাইন চার্টস)
- টেবল ফরম্যাটিং সহ PDF এক্সপোর্ট ক্যাপাবিলিটি (jsPDF)
- প্রিন্ট-ফ্রেন্ডলি লেআউটস
- ডেট রেঞ্জ ফিল্টারিং

### ৭. **ইউজার ম্যানেজমেন্ট এবং অথরাইজেশন**
- **ইউজার CRUD:** ক্রিয়েট, আপডেট, একটিভ স্ট্যাটাস টগল, ডিলিট (Admin বা তদূর্ধ্ব)।
- **রোল ম্যানেজমেন্ট (Hardened):** রোল তৈরি, নাম পরিবর্তন এবং ডিলিট করার ক্ষমতা শুধুমাত্র **SystemAdmin**-এর জন্য সংরক্ষিত।
- **পারমিশন ম্যাট্রিক্স:** মডিউল-লেভেল পারমিশনস (Sales, Medicines, Purchases, ইত্যাদি)।
  - প্রতি মডিউলে CanView, CanCreate, CanEdit, CanDelete।
  - এই ম্যাট্রিক্সটি পরিবর্তন করার ক্ষমতা শুধুমাত্র SystemAdmin-এর কাছে থাকে, যাতে কোনো Admin নিজের পারমিশন নিজে বাড়াতে না পারে।
- **রোল-বেসড রুট গার্ডস:** ফ্রন্টএন্ড এবং ব্যাকএন্ড—উভয় লেভেলে রোল এবং পারমিশন যাচাই করা হয়।
- **ডায়নামিক UI রেন্ডারিং:** লগইন করা ইউজারের যে মডিউলে পারমিশন নেই, সেটি ড্যাশবোর্ড বা সাইডবার থেকে অটোমেটিক হাইড হয়ে যায়।
- **JWT টোকেন-বেসড API সিকিউরিটি:** ৩-ঘণ্টা টোকেন এক্সপায়ারেশন।
- **অডিট ট্রেইল:** সমস্ত ট্রানজ্যাকশনসে CreatedBy/UpdatedBy ফিল্ডস।

### ৮. **ডকুমেন্ট প্রিন্টিং**
- **GRN প্রিন্ট সার্ভিস:** ফরম্যাটেড রিসিপ্ট/রিপোর্ট ভিউ
- **ইনভয়েস প্রিন্ট সার্ভিস:** কাস্টমার-ফেসিং ইনভয়েস সহ:
  - কাস্টমার ডিটেইলস
  - আইটেমাইজড লিস্ট
  - ট্যাক্স ব্রেকডাউন
  - টোটাল অ্যামাউন্ট
  - পেমেন্ট মেথড রেকর্ড
- কাস্টমাইজেবল ফরম্যাটিং সহ PDF জেনারেশন

### ৯. **অডিট এবং ডেটা ইন্টিগ্রিটি**
- সমস্ত ট্রানজ্যাকশনাল এন্টিটিসে CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
- Bangladesh Standard Time (UTC+6) টাইমস্ট্যাম্পস
- IsActive ফ্ল্যাগ দ্বারা লজিক্যাল ডিলিশন
- ডেটাবেস রিট্রাই পলিসি (৫ রিট্রাইস, ৩০-সেকেন্ড ম্যাক্স ডিলে)
- Code এবং Name ফিল্ডসে ইউনিক ইনডেক্স কনস্ট্রেইন্টস

### ১০. **ইমেইল নোটিফিকেশনস**
- কনফিগারেবল SMTP সার্ভিস
- [App_Data/Logs/Emails.txt](App_Data/Logs/Emails.txt)-এ FileEmailService ফলব্যাক (লগস)
- পাসওয়ার্ড রিসেট, ইউজার নোটিফিকেশনসের জন্য ব্যবহৃত (এক্সটেনসিবল)

---

## ৫. ডেটাবেস ডিজাইন এবং রিলেশনশিপস

### এন্টিটি রিলেশনশিপ ডায়াগ্রাম (লজিক্যাল)

```
ApplicationUser (Identity)
    ↓
RolePermission
    Role (string: Admin, Manager, Cashier)

Party (Customer/Supplier)
    ↑        ↑
    |        |
    └─ PurchaseMaster ← PurchaseDetailPayment
    └─ SalesMaster ← SalesDetail
       └─ SalesPayment

PurchaseMaster ← 1---Many PurchaseDetail → Medicine
                     ↓
                    Uom
                     ↓
Purchase Detail has: Medicine, Batch, Expiry, Qty, Unit Cost, Tax%, Discount%

SalesMaster ← 1---Many SalesDetail → Medicine
                   ↓
                  SalesPayment
                   ↓
Sales Detail has: Medicine, Qty, Unit Price, Tax, Discount, Batch/Expiry snapshot

Master Data (all with Code uniqueness):
    Tax
    Uom
    Generic
    Category
    Manufacturer
    DosageForm
    CommonStrength
    UseFor
```

### কী ডিজাইন প্যাটার্নস

১. **অডিট ট্রেইলের জন্য ডিনরমালাইজেশন:** PurchaseDetail এবং SalesDetail ট্যাক্স রেটস, UOM names, কাস্টমার names স্টোর করে হিস্টরিক্যাল অ্যাকিউরেসির জন্য (যেমন, একটি ট্যাক্স রেট পরিবর্তিত হলে পুরানো ট্রানজ্যাকশনস অপরিবর্তিত থাকে)

২. **সফ্ট ডিলিট:** সমস্ত মাস্টার এন্টিটিসে IsActive বুলিয়ান ফ্ল্যাগ ডেটা লস ছাড়াই আর্কাইভিং অনুমতি দেয়

৩. **কম্পোজিট ইউনিকনেস:** বেশিরভাগ মাস্টার টেবিলে Code + Name ইউনিক, Party-তে Code-অনলি

৪. **অডিট ফিল্ডস:** ট্রানজ্যাকশনসে CreatedAt, CreatedBy, UpdatedAt, UpdatedBy চেঞ্জ হিস্টরি ট্র্যাক করে

৫. **ডেসিমাল প্রিসিশন:** অ্যাকিউরেসির জন্য সমস্ত মোনেটারি ভ্যালুজ Decimal(18,2); পারসেন্টেজেস Decimal(5,2)

৬. **ফরেন কী ক্যাসকেড:** রিলেটেড এন্টিটিস (Party → Purchase/Sale) রেফারেন্শিয়াল ইন্টিগ্রিটি সাপোর্ট করে

### ডেটা ইন্টিগ্রিটি ফিচারস

- **ইউনিক কনস্ট্রেইন্টস:** মডেল কনফিগারেশনে এনফোর্সড সমস্ত মাস্টার ডেটায় Code & Name
- **SQL Server রিট্রাই পলিসি:** ট্রানজিয়েন্ট ফেইলিউরসে ৫ রিট্রাইস, ৩০-সেকেন্ড ম্যাক্স ডিলে
- **ট্রানজ্যাকশন সাপোর্ট:** Entity Framework অ্যাটমিক্যালি সেভ অপারেশনস হ্যান্ডেল করে
- **ব্যাচ এক্সপায়ারি ভ্যালিডেশন:** মেডিসিন পারচেস ট্র্যাকিং ব্যাচ, এক্সপায়ারি, কোয়ান্টিটি লিঙ্ক করে FIFO কমপ্লায়েন্সের জন্য

---

## ৬. অতিরিক্ত কনফিগারেশন এবং স্পেশাল ইমপ্লিমেন্টেশনস

### টাইমজোন হ্যান্ডলিং

সমস্ত টাইমস্ট্যাম্পস Bangladesh Standard Time (UTC+6) ব্যবহার করে:
```csharp
TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, 
    TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
```
সিস্টেম টাইমজোন অনুপলব্ধ হলে UTC+6 অফসেট ফলব্যাক।

### লগিং

- **অ্যাপ্লিকেশন লগিং:** [appsettings.json](appsettings.json)-এ কনফিগার্ড
  - ডিফল্ট লেভেল: Information
  - Microsoft.AspNetCore: Warning
- **ইমেইল লগিং:** [App_Data/Logs/Emails.txt](App_Data/Logs/Emails.txt)-এ FileEmailService দ্বারা ফাইল-বেসড
- **মাইগ্রেশন এররস:** স্টার্টআপ ডেটাবেস মাইগ্রেশনে লগড

### কোড অটোজেনারেশন স্ট্র্যাটেজিস

| এন্টিটি | কোড ফরম্যাট | লক-ফ্রি কাউন্টার |
|--------|------------|-------------------|
| Medicine | MED-00001 | "MED-" প্রিফিক্স সহ max MedicineId কোয়েরি করে |
| Purchase (GRN) | GRN-00001 | "GRN-" প্রিফিক্স সহ max PurchaseId কোয়েরি করে |
| Sales (Invoice) | INV20260315-1 | ফরম্যাট: INV + YYYYMMDD + সিকোয়েন্স |
| Tax | TAX-00001 | স্ট্যান্ডার্ড প্রিফিক্স-বেসড |
| Uom | UOM-00001 | স্ট্যান্ডার্ড প্রিফিক্স-বেসড |

### Angular স্ট্যান্ডালোন কম্পোনেন্টস

Angular 19 স্ট্যান্ডালোন API সমস্ত জায়গায় ব্যবহৃত:
- NgModules প্রয়োজন নেই
- রুটস `provideRouter(routes)` ব্যবহার করে
- সার্ভিসেস `providedIn: 'root'` ব্যবহার করে
- লেজি লোডিং: `loadComponent: () => import(...)`

### স্টেট ম্যানেজমেন্ট

- **অথ সার্ভিস BehaviorSubject:** টোকেন, রোলস, পারমিশনস সহ currentUserValue ম্যানেজ করে
- **কম্পোনেন্ট Input/Output:** @Input/@Output দ্বারা প্যারেন্ট-চাইল্ড কমিউনিকেশন
- **সার্ভিস অবজারভেবলস:** RxJS Subjects দ্বারা স্টেট ডিস্ট্রিবিউশন
- **কোনো এক্সটার্নাল স্টেট লাইব্রেরি নেই:** কারেন্ট কমপ্লেক্সিটির জন্য পিউর Angular সার্ভিসেস যথেষ্ট

### বিল্ড কনফিগারেশন

**[angular.json](frontend/angular.json)** - প্রোডাকশন সেটআপ:
- আউটপুট পাথ: `../wwwroot` (.NET ব্যাকএন্ড থেকে সার্ভ করে)
- Azure Blue Material থিম
- Material প্রিবিল্ট স্টাইলস
- TailwindCSS কনফিগার্ড
- টেস্ট স্কিমাস ডিফল্টলি টেস্টস স্কিপ করে (skipTests: true)
- বান্ডেল সাইজ বাজেটস: 2MB ওয়ার্নিং / 5MB এরর

### সিকিউরিটি মেজারস

১. **JWT ভ্যালিডেশন:**
   - Issuer ভ্যালিডেশন: PharmacyApi
   - Audience ভ্যালিডেশন: PharmacyFrontend
   - HS256 দ্বারা সিগনেচার ভ্যালিডেশন
   - এক্সপায়ারেশন (৩ ঘণ্টা)

২. **CORS পলিসি:**
   - কনফিগার্ড অরিজিনসে রিস্ট্রিক্টেড
   - সমস্ত হেডারস এবং মেথডস অনুমতি দেয় (টাইটেন করা যায়)

৩. **পাসওয়ার্ড সিকিউরিটি:**
   - ASP.NET Identity হ্যাশিং
   - DTOs-এ মিনিমাম লেংথ রিকোয়ারমেন্টস (৬ ক্যারেক্টার)
   - ইমেইল ভেরিফিকেশন সাপোর্ট

৪. **রোল-বেসড অথরাইজেশন (Protected):**
   - কন্ট্রোলারসে [Authorize] অ্যাট্রিবিউট।
   - **SystemAdmin Bypass:** সব জায়গায় কার্যকর।
   - রোল ম্যানেজমেন্টের জন্য এন্ডপয়েন্ট সুরক্ষা: `[Authorize(Roles = "SystemAdmin")]`।
   - ফ্রন্টএন্ড গার্ডস আনঅথরাইজড রুট অ্যাক্সেস প্রিভেন্ট করে এবং পারমিশন অনুযায়ী UI এলিমেন্টগুলো রিমুভ করে।

৫. **ডেটা ভ্যালিডেশন:**
   - সার্ভার-সাইড DataAnnotations ভ্যালিডেশন
   - Entity Framework কনস্ট্রেইন্টস
   - কন্ট্রোলারসে DTO ভ্যালিডেশন

---

## ৭. ফাইল স্ট্রাকচার সামারি

```
ব্যাকএন্ড (C# .NET Core 8.0)
├── Controllers/ (১৮টি কন্ট্রোলার)
├── Models/ (১৫টি এন্টিটি মডেল)
├── Repositories/ (১৯টি রিপোজিটরি ইমপ্লিমেন্টেশন)
├── Services/ (ইমেইল, ইউজার ম্যানেজমেন্ট)
├── Data/ (ApplicationDbContext)
├── DTOs/ (ডেটা ট্রান্সফার অবজেক্টস)
├── Migrations/ (EF Core মাইগ্রেশনস)
├── Program.cs (স্টার্টআপ কনফিগারেশন)
└── appsettings.json (কনফিগারেশন)

ফ্রন্টএন্ড (Angular ১৯)
└── frontend/
    └── src/app/
        ├── components/ (২০+ ফিচার কম্পোনেন্টস)
        ├── services/ (১৯টি HTTP/ব্যবসায়িক সার্ভিসেস)
        ├── guards/ (AuthGuard)
        ├── interceptors/ (AuthInterceptor)
        ├── app.routes.ts (রাউটিং কনফিগারেশন)
        ├── app.config.ts (DI সেটআপ)
        └── styles.css (গ্লোবাল স্টাইলস)
```

---

## সামারি

**ফার্মেসি ম্যানেজমেন্ট সিস্টেম** একটি **ফুল-স্ট্যাক এন্টারপ্রাইজ অ্যাপ্লিকেশন** যা ইন্ডাস্ট্রি-স্ট্যান্ডার্ড টেকনোলজিস (ASP.NET Core 8 + Angular 19) দিয়ে বিল্ট। এটি ইমপ্লিমেন্ট করে:

- **কমপ্লিট ফার্মেসি ব্যবসায়িক ওয়ার্কফ্লো:** ইনভেন্টরি → পারচেসেস → সেলস → পেমেন্টস → রিপোর্টিং
- **মডার্ন আর্কিটেকচার:** RESTful API, JWT অথ, RBAC, রিপোজিটরি প্যাটার্ন, DTOs
- **ফাইন্যান্শিয়াল অ্যাকিউরেসি:** ডেসিমাল প্রিসিশন, ট্যাক্স/ডিসকাউন্ট ক্যালকুলেশনস, প্রফিট/লস রিপোর্টিং
- **অডিট কমপ্লায়েন্স:** ইউজার ট্র্যাকিং, টাইমস্ট্যাম্প অডিটিং, ট্রানজ্যাকশনাল ইন্টিগ্রিটি
- **রিচ UI:** PrimeNG, Material Design, TailwindCSS, PDF এক্সপোর্ট, চার্টিং সহ Angular
- **স্কেলেবিলিটি:** রিট্রাই পলিসিস, পেজিনেশন, লেজি-লোডিং সহ Entity Framework
- **সিকিউরিটি:** JWT টোকেনস, রোল-বেসড গার্ডস, CORS, সার্ভার-সাইড ভ্যালিডেশন

সিস্টেমটি চারটি মৌলিক রোল (SystemAdmin, Admin, Manager, Cashier) সাপোর্ট করে। এর মধ্যে **SystemAdmin** হলো সর্বোচ্চ ক্ষমতার অধিকারী যারা সব সিকিউরিটি পলিসি এবং পারমিশন কন্ট্রোল করে। বাকি রোলগুলো গ্রানুলার মডিউল-লেভেল পারমিশনস (Permission Matrix) দ্বারা নিয়ন্ত্রিত হয়। সিস্টেমটি কমপ্লেক্স রিটেইল সিনারিওস (ব্যাচ এক্সপায়ারি, হোল্ডস, স্প্লিট পেমেন্ট) হ্যান্ডেল করে এবং ডিসিশন-মেকিংয়ের জন্য এক্সিকিউটিভ-লেভেল অ্যানালিটিক্স প্রোভাইড করে।