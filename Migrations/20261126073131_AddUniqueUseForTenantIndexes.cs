using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueUseForTenantIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Deduplicate any pre-existing per-tenant UseFor Code or Name collisions before creating composite unique indexes
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1
    FROM [UseFors]
    GROUP BY [TenantId], [Code]
    HAVING COUNT(*) > 1
)
BEGIN
    ;WITH DupCodes AS (
        SELECT [UseForId],
               [Code],
               ROW_NUMBER() OVER (PARTITION BY [TenantId], [Code] ORDER BY [UseForId]) AS [RowNum]
        FROM [UseFors]
    )
    UPDATE u
    SET u.[Code] = LEFT(
                        d.[Code],
                        CASE WHEN 19 - LEN(CAST(d.[UseForId] AS nvarchar(10))) > 0
                             THEN 19 - LEN(CAST(d.[UseForId] AS nvarchar(10)))
                             ELSE 0
                        END) + '-' + CAST(d.[UseForId] AS nvarchar(10))
    FROM [UseFors] u
    INNER JOIN DupCodes d ON u.[UseForId] = d.[UseForId]
    WHERE d.[RowNum] > 1;
END

IF EXISTS (
    SELECT 1
    FROM [UseFors]
    GROUP BY [TenantId], [Name]
    HAVING COUNT(*) > 1
)
BEGIN
    ;WITH DupNames AS (
        SELECT [UseForId],
               [Name],
               ROW_NUMBER() OVER (PARTITION BY [TenantId], [Name] ORDER BY [UseForId]) AS [RowNum]
        FROM [UseFors]
    )
    UPDATE u
    SET u.[Name] = LEFT(
                        d.[Name],
                        CASE WHEN 99 - LEN(CAST(d.[UseForId] AS nvarchar(10))) > 0
                             THEN 99 - LEN(CAST(d.[UseForId] AS nvarchar(10)))
                             ELSE 0
                        END) + '-' + CAST(d.[UseForId] AS nvarchar(10))
    FROM [UseFors] u
    INNER JOIN DupNames d ON u.[UseForId] = d.[UseForId]
    WHERE d.[RowNum] > 1;
END");

            migrationBuilder.CreateIndex(
                name: "IX_UseFors_TenantId_Code",
                table: "UseFors",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UseFors_TenantId_Name",
                table: "UseFors",
                columns: new[] { "TenantId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UseFors_TenantId_Code",
                table: "UseFors");

            migrationBuilder.DropIndex(
                name: "IX_UseFors_TenantId_Name",
                table: "UseFors");
        }
    }
}
