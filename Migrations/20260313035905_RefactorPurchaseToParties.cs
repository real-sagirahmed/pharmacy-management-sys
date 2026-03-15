using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class RefactorPurchaseToParties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseMasters_Suppliers_SupplierId",
                table: "PurchaseMasters");

            migrationBuilder.RenameColumn(
                name: "SupplierId",
                table: "PurchaseMasters",
                newName: "PartyId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseMasters_SupplierId",
                table: "PurchaseMasters",
                newName: "IX_PurchaseMasters_PartyId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseMasters_Parties_PartyId",
                table: "PurchaseMasters",
                column: "PartyId",
                principalTable: "Parties",
                principalColumn: "PartyId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseMasters_Parties_PartyId",
                table: "PurchaseMasters");

            migrationBuilder.RenameColumn(
                name: "PartyId",
                table: "PurchaseMasters",
                newName: "SupplierId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseMasters_PartyId",
                table: "PurchaseMasters",
                newName: "IX_PurchaseMasters_SupplierId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseMasters_Suppliers_SupplierId",
                table: "PurchaseMasters",
                column: "SupplierId",
                principalTable: "Suppliers",
                principalColumn: "SupplierId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
