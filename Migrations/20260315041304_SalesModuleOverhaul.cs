using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class SalesModuleOverhaul : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Discount",
                table: "SalesMasters",
                newName: "TotalTax");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "SalesMasters",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "CustomerPhone",
                table: "SalesMasters",
                type: "nvarchar(15)",
                maxLength: 15,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AddColumn<decimal>(
                name: "ChangeAmount",
                table: "SalesMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "CustomerId",
                table: "SalesMasters",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoiceCode",
                table: "SalesMasters",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SaleStatus",
                table: "SalesMasters",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "SaleTime",
                table: "SalesMasters",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "SpecialDiscount",
                table: "SalesMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SubTotal",
                table: "SalesMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalDiscount",
                table: "SalesMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "BatchNumber",
                table: "SalesDetails",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "SalesDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPercent",
                table: "SalesDetails",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiryDate",
                table: "SalesDetails",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LineTotal",
                table: "SalesDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmount",
                table: "SalesDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxPercent",
                table: "SalesDetails",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "UomId",
                table: "SalesDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UomName",
                table: "SalesDetails",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    CustomerId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Mobile = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    IsRegistered = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.CustomerId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SalesMasters_CustomerId",
                table: "SalesMasters",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesMasters_InvoiceCode",
                table: "SalesMasters",
                column: "InvoiceCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesDetails_UomId",
                table: "SalesDetails",
                column: "UomId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Code",
                table: "Customers",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesDetails_Uoms_UomId",
                table: "SalesDetails",
                column: "UomId",
                principalTable: "Uoms",
                principalColumn: "UomId");

            migrationBuilder.AddForeignKey(
                name: "FK_SalesMasters_Customers_CustomerId",
                table: "SalesMasters",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "CustomerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SalesDetails_Uoms_UomId",
                table: "SalesDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesMasters_Customers_CustomerId",
                table: "SalesMasters");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_SalesMasters_CustomerId",
                table: "SalesMasters");

            migrationBuilder.DropIndex(
                name: "IX_SalesMasters_InvoiceCode",
                table: "SalesMasters");

            migrationBuilder.DropIndex(
                name: "IX_SalesDetails_UomId",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "ChangeAmount",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "InvoiceCode",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "SaleStatus",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "SaleTime",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "SpecialDiscount",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "SubTotal",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "TotalDiscount",
                table: "SalesMasters");

            migrationBuilder.DropColumn(
                name: "BatchNumber",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "DiscountPercent",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "ExpiryDate",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "LineTotal",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "TaxAmount",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "TaxPercent",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "UomId",
                table: "SalesDetails");

            migrationBuilder.DropColumn(
                name: "UomName",
                table: "SalesDetails");

            migrationBuilder.RenameColumn(
                name: "TotalTax",
                table: "SalesMasters",
                newName: "Discount");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "SalesMasters",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "CustomerPhone",
                table: "SalesMasters",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(15)",
                oldMaxLength: 15,
                oldNullable: true);
        }
    }
}
