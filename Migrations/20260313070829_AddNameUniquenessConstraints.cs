using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddNameUniquenessConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_UseFors_Name",
                table: "UseFors",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Uoms_Name",
                table: "Uoms",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Taxes_Name",
                table: "Taxes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Parties_FullName",
                table: "Parties",
                column: "FullName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_Name",
                table: "Medicines",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Manufacturers_Name",
                table: "Manufacturers",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Generics_Name",
                table: "Generics",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DosageForms_Name",
                table: "DosageForms",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommonStrengths_Name",
                table: "CommonStrengths",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UseFors_Name",
                table: "UseFors");

            migrationBuilder.DropIndex(
                name: "IX_Uoms_Name",
                table: "Uoms");

            migrationBuilder.DropIndex(
                name: "IX_Taxes_Name",
                table: "Taxes");

            migrationBuilder.DropIndex(
                name: "IX_Parties_FullName",
                table: "Parties");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_Name",
                table: "Medicines");

            migrationBuilder.DropIndex(
                name: "IX_Manufacturers_Name",
                table: "Manufacturers");

            migrationBuilder.DropIndex(
                name: "IX_Generics_Name",
                table: "Generics");

            migrationBuilder.DropIndex(
                name: "IX_DosageForms_Name",
                table: "DosageForms");

            migrationBuilder.DropIndex(
                name: "IX_CommonStrengths_Name",
                table: "CommonStrengths");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name",
                table: "Categories");
        }
    }
}
