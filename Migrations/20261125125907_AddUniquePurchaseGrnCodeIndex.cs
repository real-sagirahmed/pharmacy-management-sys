using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUniquePurchaseGrnCodeIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Deduplicate any pre-existing multi-branch (TenantId, GrnCode) collisions before adding unique index
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1
    FROM [PurchaseMasters]
    GROUP BY [TenantId], [GrnCode]
    HAVING COUNT(*) > 1
)
BEGIN
    ;WITH DupGrns AS (
        SELECT [PurchaseId],
               [GrnCode],
               ROW_NUMBER() OVER (PARTITION BY [TenantId], [GrnCode] ORDER BY [PurchaseId]) AS [RowNum]
        FROM [PurchaseMasters]
    )
    UPDATE p
    SET p.[GrnCode] = LEFT(
                        d.[GrnCode],
                        CASE WHEN 19 - LEN(CAST(d.[PurchaseId] AS nvarchar(10))) > 0
                             THEN 19 - LEN(CAST(d.[PurchaseId] AS nvarchar(10)))
                             ELSE 0
                        END) + '-' + CAST(d.[PurchaseId] AS nvarchar(10))
    FROM [PurchaseMasters] p
    INNER JOIN DupGrns d ON p.[PurchaseId] = d.[PurchaseId]
    WHERE d.[RowNum] > 1;
END");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseMasters_TenantId_GrnCode",
                table: "PurchaseMasters",
                columns: new[] { "TenantId", "GrnCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseMasters_TenantId_GrnCode",
                table: "PurchaseMasters");
        }
    }
}
