using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenancyWithBranches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UseFors_Code",
                table: "UseFors");

            migrationBuilder.DropIndex(
                name: "IX_UseFors_Name",
                table: "UseFors");

            migrationBuilder.DropIndex(
                name: "IX_Uoms_Code",
                table: "Uoms");

            migrationBuilder.DropIndex(
                name: "IX_Uoms_Name",
                table: "Uoms");

            migrationBuilder.DropIndex(
                name: "IX_Taxes_Code",
                table: "Taxes");

            migrationBuilder.DropIndex(
                name: "IX_Taxes_Name",
                table: "Taxes");

            migrationBuilder.DropIndex(
                name: "IX_SalesMasters_InvoiceCode",
                table: "SalesMasters");

            migrationBuilder.DropIndex(
                name: "IX_Parties_Code",
                table: "Parties");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_Code",
                table: "Medicines");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_Name",
                table: "Medicines");

            migrationBuilder.DropIndex(
                name: "IX_Manufacturers_Code",
                table: "Manufacturers");

            migrationBuilder.DropIndex(
                name: "IX_Manufacturers_Name",
                table: "Manufacturers");

            migrationBuilder.DropIndex(
                name: "IX_Generics_Code",
                table: "Generics");

            migrationBuilder.DropIndex(
                name: "IX_Generics_Name",
                table: "Generics");

            migrationBuilder.DropIndex(
                name: "IX_DosageForms_Code",
                table: "DosageForms");

            migrationBuilder.DropIndex(
                name: "IX_DosageForms_Name",
                table: "DosageForms");

            migrationBuilder.DropIndex(
                name: "IX_CommonStrengths_Code",
                table: "CommonStrengths");

            migrationBuilder.DropIndex(
                name: "IX_CommonStrengths_Name",
                table: "CommonStrengths");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Code",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name",
                table: "Categories");

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "UseFors",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Uoms",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Taxes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Suppliers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "SalesMasters",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "SalesMasters",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "RolePermissions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "PurchaseMasters",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PurchaseMasters",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Parties",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Medicines",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Manufacturers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Generics",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "DosageForms",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "CommonStrengths",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Categories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "AspNetUsers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "AspNetUsers",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BranchTransfers",
                columns: table => new
                {
                    TransferId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    FromBranchId = table.Column<int>(type: "int", nullable: false),
                    ToBranchId = table.Column<int>(type: "int", nullable: false),
                    MedicineId = table.Column<int>(type: "int", nullable: false),
                    BatchId = table.Column<int>(type: "int", nullable: true),
                    BatchNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    TransferCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TransferDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RequestedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ApprovedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BranchTransfers", x => x.TransferId);
                    table.ForeignKey(
                        name: "FK_BranchTransfers_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Medicines",
                        principalColumn: "MedicineId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MedicineBatches",
                columns: table => new
                {
                    BatchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    MedicineId = table.Column<int>(type: "int", nullable: false),
                    BatchNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CurrentStock = table.Column<int>(type: "int", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    SalePrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PurchaseDetailId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicineBatches", x => x.BatchId);
                    table.ForeignKey(
                        name: "FK_MedicineBatches_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Medicines",
                        principalColumn: "MedicineId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    TenantId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PharmacyName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Slogan = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    HeadOfficeAddress = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DrugLicenseNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    LogoPath = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    InvoiceFooter = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PrimaryColor = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SubscriptionPlan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SubscriptionExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.TenantId);
                });

            migrationBuilder.CreateTable(
                name: "Branches",
                columns: table => new
                {
                    BranchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    BranchName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DrugLicenseNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsHeadOffice = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branches", x => x.BranchId);
                    table.ForeignKey(
                        name: "FK_Branches_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Uoms_TenantId_Code",
                table: "Uoms",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Uoms_TenantId_Name",
                table: "Uoms",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Taxes_TenantId_Code",
                table: "Taxes",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Taxes_TenantId_Name",
                table: "Taxes",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesMasters_TenantId_InvoiceCode",
                table: "SalesMasters",
                columns: new[] { "TenantId", "InvoiceCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Parties_TenantId_Code",
                table: "Parties",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_TenantId_Code",
                table: "Medicines",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_TenantId_Name",
                table: "Medicines",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Manufacturers_TenantId_Code",
                table: "Manufacturers",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Manufacturers_TenantId_Name",
                table: "Manufacturers",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Generics_TenantId_Code",
                table: "Generics",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Generics_TenantId_Name",
                table: "Generics",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DosageForms_TenantId_Code",
                table: "DosageForms",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DosageForms_TenantId_Name",
                table: "DosageForms",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommonStrengths_TenantId_Code",
                table: "CommonStrengths",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommonStrengths_TenantId_Name",
                table: "CommonStrengths",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_TenantId_Code",
                table: "Categories",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_TenantId_Name",
                table: "Categories",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_TenantId",
                table: "Branches",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_BranchTransfers_MedicineId",
                table: "BranchTransfers",
                column: "MedicineId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicineBatches_MedicineId",
                table: "MedicineBatches",
                column: "MedicineId");

            // ─── SaaS Seed & Backfill for Existing s7 Drug House Data ───────────
            migrationBuilder.Sql(@"
                -- 1. Seed Tenant 1 (s7 Drug House) if not already exists
                SET IDENTITY_INSERT Tenants ON;
                IF NOT EXISTS (SELECT 1 FROM Tenants WHERE TenantId = 1)
                BEGIN
                    INSERT INTO Tenants (TenantId, PharmacyName, Tagline, ContactPhone, ContactEmail, Address, DrugLicenseNo, SubscriptionPlan, IsActive, CreatedAt)
                    VALUES (1, N'S7 Drug House', N'আপনার বিশ্বস্ত স্বাস্থ্য সঙ্গী', '01700000000', 'info@s7drughouse.com', N'ঢাকা, বাংলাদেশ', 'DL-DH-001', 'Pro', 1, GETUTCDATE());
                END
                SET IDENTITY_INSERT Tenants OFF;

                -- 2. Seed Head Office Branch for Tenant 1 if not exists
                SET IDENTITY_INSERT Branches ON;
                IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchId = 1)
                BEGIN
                    INSERT INTO Branches (BranchId, TenantId, BranchName, BranchCode, IsHeadOffice, IsActive, CreatedAt)
                    VALUES (1, 1, N'মেইন আউটলেট (হেড অফিস)', 'BR-001', 1, 1, GETUTCDATE());
                END
                SET IDENTITY_INSERT Branches OFF;

                -- 3. Backfill TenantId = 1 on all existing tenant-scoped tables
                UPDATE Medicines SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE Parties SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE Suppliers SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE RolePermissions SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE Categories SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE Generics SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE Manufacturers SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE DosageForms SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE CommonStrengths SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE Taxes SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE Uoms SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;
                UPDATE UseFors SET TenantId = 1 WHERE TenantId = 0 OR TenantId IS NULL;

                -- 4. Backfill TenantId = 1 and BranchId = 1 on transaction masters
                UPDATE SalesMasters SET TenantId = 1, BranchId = 1 WHERE TenantId = 0 OR TenantId IS NULL OR BranchId = 0 OR BranchId IS NULL;
                UPDATE PurchaseMasters SET TenantId = 1, BranchId = 1 WHERE TenantId = 0 OR TenantId IS NULL OR BranchId = 0 OR BranchId IS NULL;

                -- 5. Backfill non-SystemAdmin users to Tenant 1 and Branch 1
                UPDATE AspNetUsers
                SET TenantId = 1, BranchId = 1
                WHERE TenantId IS NULL
                  AND Id NOT IN (
                      SELECT ur.UserId
                      FROM AspNetUserRoles ur
                      JOIN AspNetRoles r ON ur.RoleId = r.Id
                      WHERE r.Name = 'SystemAdmin'
                  );

                -- 6. Populate MedicineBatches from existing Medicines having stock
                INSERT INTO MedicineBatches (TenantId, BranchId, MedicineId, BatchNumber, ExpiryDate, CurrentStock, PurchasePrice, SalePrice, Status, ReceivedAt, CreatedAt)
                SELECT 
                    1, 
                    1, 
                    m.MedicineId, 
                    COALESCE(NULLIF(m.Batch, ''), 'OPENING'), 
                    COALESCE(m.ExpiryDate, DATEADD(year, 1, GETUTCDATE())), 
                    m.StockQuantity, 
                    m.PurchasePrice, 
                    m.SalePrice, 
                    'Active', 
                    GETUTCDATE(), 
                    GETUTCDATE()
                FROM Medicines m
                WHERE m.StockQuantity > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM MedicineBatches b 
                      WHERE b.TenantId = 1 AND b.BranchId = 1 AND b.MedicineId = m.MedicineId
                  );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Branches");

            migrationBuilder.DropTable(
                name: "BranchTransfers");

            migrationBuilder.DropTable(
                name: "MedicineBatches");

            migrationBuilder.DropTable(
                name: "Tenants");

            migrationBuilder.DropIndex(
                name: "IX_Uoms_TenantId_Code",
                table: "Uoms");

            migrationBuilder.DropIndex(
                name: "IX_Uoms_TenantId_Name",
                table: "Uoms");

            migrationBuilder.DropIndex(
                name: "IX_Taxes_TenantId_Code",
                table: "Taxes");

            migrationBuilder.DropIndex(
                name: "IX_Taxes_TenantId_Name",
                table: "Taxes");

            migrationBuilder.DropIndex(
                name: "IX_SalesMasters_TenantId_InvoiceCode",
                table: "SalesMasters");

            migrationBuilder.DropIndex(
                name: "IX_Parties_TenantId_Code",
                table: "Parties");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_TenantId_Code",
                table: "Medicines");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_TenantId_Name",
                table: "Medicines");

            migrationBuilder.DropIndex(
                name: "IX_Manufacturers_TenantId_Code",
                table: "Manufacturers");

            migrationBuilder.DropIndex(
                name: "IX_Manufacturers_TenantId_Name",
                table: "Manufacturers");

            migrationBuilder.DropIndex(
                name: "IX_Generics_TenantId_Code",
                table: "Generics");

            migrationBuilder.DropIndex(
                name: "IX_Generics_TenantId_Name",
                table: "Generics");

            migrationBuilder.DropIndex(
                name: "IX_DosageForms_TenantId_Code",
                table: "DosageForms");

            migrationBuilder.DropIndex(
                name: "IX_DosageForms_TenantId_Name",
                table: "DosageForms");

            migrationBuilder.DropIndex(
                name: "IX_CommonStrengths_TenantId_Code",
                table: "CommonStrengths");

            migrationBuilder.DropIndex(
                name: "IX_CommonStrengths_TenantId_Name",
                table: "CommonStrengths");

            migrationBuilder.DropIndex(
                name: "IX_Categories_TenantId_Code",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_TenantId_Name",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "UseFors");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Uoms");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Taxes");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "RolePermissions");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Parties");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Manufacturers");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Generics");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "DosageForms");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CommonStrengths");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AspNetUsers");

            migrationBuilder.CreateIndex(
                name: "IX_UseFors_Code",
                table: "UseFors",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UseFors_Name",
                table: "UseFors",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Uoms_Code",
                table: "Uoms",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Uoms_Name",
                table: "Uoms",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Taxes_Code",
                table: "Taxes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Taxes_Name",
                table: "Taxes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesMasters_InvoiceCode",
                table: "SalesMasters",
                column: "InvoiceCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Parties_Code",
                table: "Parties",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_Code",
                table: "Medicines",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_Name",
                table: "Medicines",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Manufacturers_Code",
                table: "Manufacturers",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Manufacturers_Name",
                table: "Manufacturers",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Generics_Code",
                table: "Generics",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Generics_Name",
                table: "Generics",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DosageForms_Code",
                table: "DosageForms",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DosageForms_Name",
                table: "DosageForms",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommonStrengths_Code",
                table: "CommonStrengths",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommonStrengths_Name",
                table: "CommonStrengths",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Code",
                table: "Categories",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);
        }
    }
}
