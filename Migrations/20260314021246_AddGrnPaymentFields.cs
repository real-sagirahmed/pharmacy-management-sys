using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddGrnPaymentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TotalAmount",
                table: "PurchaseMasters",
                newName: "TotalTax");

            migrationBuilder.RenameColumn(
                name: "Subtotal",
                table: "PurchaseDetails",
                newName: "TaxAmount");

            migrationBuilder.AddColumn<decimal>(
                name: "Adjustment",
                table: "PurchaseMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DueAmount",
                table: "PurchaseMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GrandTotal",
                table: "PurchaseMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "GrnCode",
                table: "PurchaseMasters",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "InvoiceDate",
                table: "PurchaseMasters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PaidAmount",
                table: "PurchaseMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "PurchaseMasters",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "SubTotal",
                table: "PurchaseMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalDiscount",
                table: "PurchaseMasters",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "PurchaseDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPercent",
                table: "PurchaseDetails",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LineTotal",
                table: "PurchaseDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SalePrice",
                table: "PurchaseDetails",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxPercent",
                table: "PurchaseDetails",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "UomId",
                table: "PurchaseDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UomName",
                table: "PurchaseDetails",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "PurchasePayments",
                columns: table => new
                {
                    PurchasePaymentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseId = table.Column<int>(type: "int", nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AccountNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TransactionId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchasePayments", x => x.PurchasePaymentId);
                    table.ForeignKey(
                        name: "FK_PurchasePayments_PurchaseMasters_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "PurchaseMasters",
                        principalColumn: "PurchaseId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_UomId",
                table: "PurchaseDetails",
                column: "UomId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchasePayments_PurchaseId",
                table: "PurchasePayments",
                column: "PurchaseId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseDetails_Uoms_UomId",
                table: "PurchaseDetails",
                column: "UomId",
                principalTable: "Uoms",
                principalColumn: "UomId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseDetails_Uoms_UomId",
                table: "PurchaseDetails");

            migrationBuilder.DropTable(
                name: "PurchasePayments");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseDetails_UomId",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "Adjustment",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "DueAmount",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "GrandTotal",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "GrnCode",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "InvoiceDate",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "PaidAmount",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "SubTotal",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "TotalDiscount",
                table: "PurchaseMasters");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "DiscountPercent",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "LineTotal",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "SalePrice",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "TaxPercent",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "UomId",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "UomName",
                table: "PurchaseDetails");

            migrationBuilder.RenameColumn(
                name: "TotalTax",
                table: "PurchaseMasters",
                newName: "TotalAmount");

            migrationBuilder.RenameColumn(
                name: "TaxAmount",
                table: "PurchaseDetails",
                newName: "Subtotal");
        }
    }
}
