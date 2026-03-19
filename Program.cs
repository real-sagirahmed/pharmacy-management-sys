using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ─── Master Data Repositories (DI Registration) ───
builder.Services.AddScoped<IPartyRepository, PartyRepository>();
builder.Services.AddScoped<IRepository<Tax, TaxDto>, TaxRepository>();
builder.Services.AddScoped<IRepository<Uom, UomDto>, UomRepository>();
builder.Services.AddScoped<IRepository<PharmacyApi.Models.Generic, GenericDto>, GenericMedicineRepository>();
builder.Services.AddScoped<IRepository<Category, CategoryDto>, CategoryRepository>();
builder.Services.AddScoped<IRepository<Manufacturer, ManufacturerDto>, ManufacturerRepository>();
builder.Services.AddScoped<IRepository<DosageForm, DosageFormDto>, DosageFormRepository>();
builder.Services.AddScoped<IRepository<CommonStrength, CommonStrengthDto>, CommonStrengthRepository>();
builder.Services.AddScoped<IRepository<UseFor, UseForDto>, UseForRepository>();
builder.Services.AddScoped<IMedicineRepository, MedicineRepository>();
builder.Services.AddScoped<IPurchaseRepository, PurchaseRepository>();
builder.Services.AddScoped<ISalesRepository, SalesRepository>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IEmailService, FileEmailService>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()
            ?? new[] { builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:4200" };

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null)
    ));

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Auth logic
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

// Enable CORS before Authentication and Authorization
app.UseCors("AllowFrontend");

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
// Apply migrations and seed admin role for the first user
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        context.Database.Migrate();

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        // Ensure roles exist
        string[] roles = { "Admin", "Manager", "Cashier" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // Promote first user to Admin if no Admin exists
        var admins = await userManager.GetUsersInRoleAsync("Admin");
        if (!admins.Any())
        {
            var firstUser = await context.Users.OrderBy(u => u.Id).FirstOrDefaultAsync();
            if (firstUser != null)
            {
                await userManager.AddToRoleAsync(firstUser, "Admin");
            }
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during database migration or role seeding.");
    }
}

app.MapControllers();

app.MapFallbackToFile("index.html");

app.Run();
