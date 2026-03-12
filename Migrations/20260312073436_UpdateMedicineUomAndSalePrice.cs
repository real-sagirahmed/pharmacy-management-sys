using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMedicineUomAndSalePrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Price",
                table: "Medicines",
                newName: "SalePrice");

            migrationBuilder.AddColumn<string>(
                name: "UOM",
                table: "Medicines",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UOM",
                table: "Medicines");

            migrationBuilder.RenameColumn(
                name: "SalePrice",
                table: "Medicines",
                newName: "Price");
        }
    }
}
