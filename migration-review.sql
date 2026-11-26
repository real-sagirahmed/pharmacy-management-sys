IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] nvarchar(450) NOT NULL,
        [FullName] nvarchar(100) NOT NULL,
        [IsActive] bit NOT NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [Medicines] (
        [MedicineId] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [GenericName] nvarchar(100) NOT NULL,
        [Category] nvarchar(50) NOT NULL,
        [Price] decimal(18,2) NOT NULL,
        [StockQuantity] int NOT NULL,
        [ExpiryDate] datetime2 NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Medicines] PRIMARY KEY ([MedicineId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [SalesMasters] (
        [SaleId] int NOT NULL IDENTITY,
        [CustomerName] nvarchar(100) NOT NULL,
        [CustomerPhone] nvarchar(20) NOT NULL,
        [SaleDate] datetime2 NOT NULL,
        [GrandTotal] decimal(18,2) NOT NULL,
        [Discount] decimal(18,2) NOT NULL,
        [PaymentMethod] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_SalesMasters] PRIMARY KEY ([SaleId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [Suppliers] (
        [SupplierId] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [ContactPerson] nvarchar(100) NOT NULL,
        [Phone] nvarchar(20) NOT NULL,
        [Email] nvarchar(100) NOT NULL,
        [Address] nvarchar(200) NOT NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Suppliers] PRIMARY KEY ([SupplierId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] nvarchar(450) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] nvarchar(450) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [SalesDetails] (
        [SalesDetailId] int NOT NULL IDENTITY,
        [SaleId] int NOT NULL,
        [MedicineId] int NOT NULL,
        [Quantity] int NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Tax] decimal(18,2) NOT NULL,
        [Subtotal] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_SalesDetails] PRIMARY KEY ([SalesDetailId]),
        CONSTRAINT [FK_SalesDetails_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines] ([MedicineId]) ON DELETE CASCADE,
        CONSTRAINT [FK_SalesDetails_SalesMasters_SaleId] FOREIGN KEY ([SaleId]) REFERENCES [SalesMasters] ([SaleId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [PurchaseMasters] (
        [PurchaseId] int NOT NULL IDENTITY,
        [SupplierId] int NOT NULL,
        [InvoiceNumber] nvarchar(50) NOT NULL,
        [PurchaseDate] datetime2 NOT NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_PurchaseMasters] PRIMARY KEY ([PurchaseId]),
        CONSTRAINT [FK_PurchaseMasters_Suppliers_SupplierId] FOREIGN KEY ([SupplierId]) REFERENCES [Suppliers] ([SupplierId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE TABLE [PurchaseDetails] (
        [PurchaseDetailId] int NOT NULL IDENTITY,
        [PurchaseId] int NOT NULL,
        [MedicineId] int NOT NULL,
        [BatchNumber] nvarchar(50) NOT NULL,
        [ExpiryDate] datetime2 NULL,
        [Quantity] int NOT NULL,
        [UnitCost] decimal(18,2) NOT NULL,
        [Subtotal] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_PurchaseDetails] PRIMARY KEY ([PurchaseDetailId]),
        CONSTRAINT [FK_PurchaseDetails_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines] ([MedicineId]) ON DELETE CASCADE,
        CONSTRAINT [FK_PurchaseDetails_PurchaseMasters_PurchaseId] FOREIGN KEY ([PurchaseId]) REFERENCES [PurchaseMasters] ([PurchaseId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PurchaseDetails_MedicineId] ON [PurchaseDetails] ([MedicineId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PurchaseDetails_PurchaseId] ON [PurchaseDetails] ([PurchaseId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PurchaseMasters_SupplierId] ON [PurchaseMasters] ([SupplierId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_SalesDetails_MedicineId] ON [SalesDetails] ([MedicineId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_SalesDetails_SaleId] ON [SalesDetails] ([SaleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260310001614_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260310001614_InitialCreate', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE TABLE [Categories] (
        [CategoryId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Categories] PRIMARY KEY ([CategoryId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE TABLE [Generics] (
        [GenericId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Generics] PRIMARY KEY ([GenericId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE TABLE [Parties] (
        [PartyId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [PartyType] nvarchar(20) NOT NULL,
        [FullName] nvarchar(150) NOT NULL,
        [Cell] nvarchar(15) NULL,
        [Email] nvarchar(100) NULL,
        [Address] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Parties] PRIMARY KEY ([PartyId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE TABLE [Taxes] (
        [TaxId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [TaxRate] decimal(5,2) NOT NULL,
        [Remarks] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Taxes] PRIMARY KEY ([TaxId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE TABLE [Uoms] (
        [UomId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Uoms] PRIMARY KEY ([UomId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Categories_Code] ON [Categories] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Generics_Code] ON [Generics] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Parties_Code] ON [Parties] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Taxes_Code] ON [Taxes] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Uoms_Code] ON [Uoms] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312014207_AddMasterDataTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312014207_AddMasterDataTables', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312050332_UpdateMedicineAuditAndCode'
)
BEGIN
    ALTER TABLE [Medicines] ADD [Code] nvarchar(20) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312050332_UpdateMedicineAuditAndCode'
)
BEGIN
    ALTER TABLE [Medicines] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312050332_UpdateMedicineAuditAndCode'
)
BEGIN
    ALTER TABLE [Medicines] ADD [CreatedBy] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312050332_UpdateMedicineAuditAndCode'
)
BEGIN
    ALTER TABLE [Medicines] ADD [UpdatedAt] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312050332_UpdateMedicineAuditAndCode'
)
BEGIN
    ALTER TABLE [Medicines] ADD [UpdatedBy] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312050332_UpdateMedicineAuditAndCode'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Medicines_Code] ON [Medicines] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312050332_UpdateMedicineAuditAndCode'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312050332_UpdateMedicineAuditAndCode', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312073436_UpdateMedicineUomAndSalePrice'
)
BEGIN
    EXEC sp_rename N'[Medicines].[Price]', N'SalePrice', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312073436_UpdateMedicineUomAndSalePrice'
)
BEGIN
    ALTER TABLE [Medicines] ADD [UOM] nvarchar(50) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312073436_UpdateMedicineUomAndSalePrice'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312073436_UpdateMedicineUomAndSalePrice', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312084622_IncreaseMedicineFieldLengths'
)
BEGIN
    DECLARE @var0 sysname;
    SELECT @var0 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Medicines]') AND [c].[name] = N'UOM');
    IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [Medicines] DROP CONSTRAINT [' + @var0 + '];');
    ALTER TABLE [Medicines] ALTER COLUMN [UOM] nvarchar(100) NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312084622_IncreaseMedicineFieldLengths'
)
BEGIN
    DECLARE @var1 sysname;
    SELECT @var1 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Medicines]') AND [c].[name] = N'GenericName');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Medicines] DROP CONSTRAINT [' + @var1 + '];');
    ALTER TABLE [Medicines] ALTER COLUMN [GenericName] nvarchar(250) NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312084622_IncreaseMedicineFieldLengths'
)
BEGIN
    DECLARE @var2 sysname;
    SELECT @var2 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Medicines]') AND [c].[name] = N'Category');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Medicines] DROP CONSTRAINT [' + @var2 + '];');
    ALTER TABLE [Medicines] ALTER COLUMN [Category] nvarchar(250) NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312084622_IncreaseMedicineFieldLengths'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312084622_IncreaseMedicineFieldLengths', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312092605_AddPurchasePriceBatchExpiry'
)
BEGIN
    ALTER TABLE [Medicines] ADD [Batch] nvarchar(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312092605_AddPurchasePriceBatchExpiry'
)
BEGIN
    ALTER TABLE [Medicines] ADD [PurchasePrice] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312092605_AddPurchasePriceBatchExpiry'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312092605_AddPurchasePriceBatchExpiry', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312092649_AddExpiryDate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312092649_AddExpiryDate', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313035905_RefactorPurchaseToParties'
)
BEGIN
    ALTER TABLE [PurchaseMasters] DROP CONSTRAINT [FK_PurchaseMasters_Suppliers_SupplierId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313035905_RefactorPurchaseToParties'
)
BEGIN
    EXEC sp_rename N'[PurchaseMasters].[SupplierId]', N'PartyId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313035905_RefactorPurchaseToParties'
)
BEGIN
    EXEC sp_rename N'[PurchaseMasters].[IX_PurchaseMasters_SupplierId]', N'IX_PurchaseMasters_PartyId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313035905_RefactorPurchaseToParties'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD CONSTRAINT [FK_PurchaseMasters_Parties_PartyId] FOREIGN KEY ([PartyId]) REFERENCES [Parties] ([PartyId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313035905_RefactorPurchaseToParties'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313035905_RefactorPurchaseToParties', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE TABLE [CommonStrengths] (
        [CommonStrengthId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_CommonStrengths] PRIMARY KEY ([CommonStrengthId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE TABLE [DosageForms] (
        [DosageFormId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_DosageForms] PRIMARY KEY ([DosageFormId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE TABLE [Manufacturers] (
        [ManufacturerId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Manufacturers] PRIMARY KEY ([ManufacturerId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE TABLE [UseFors] (
        [UseForId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Remarks] nvarchar(250) NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_UseFors] PRIMARY KEY ([UseForId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CommonStrengths_Code] ON [CommonStrengths] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DosageForms_Code] ON [DosageForms] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Manufacturers_Code] ON [Manufacturers] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UseFors_Code] ON [UseFors] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313064630_AddNewMasterDataTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313064630_AddNewMasterDataTables', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UseFors_Name] ON [UseFors] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Uoms_Name] ON [Uoms] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Taxes_Name] ON [Taxes] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Parties_FullName] ON [Parties] ([FullName]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Medicines_Name] ON [Medicines] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Manufacturers_Name] ON [Manufacturers] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Generics_Name] ON [Generics] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DosageForms_Name] ON [DosageForms] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CommonStrengths_Name] ON [CommonStrengths] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Categories_Name] ON [Categories] ([Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313070829_AddNameUniquenessConstraints'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313070829_AddNameUniquenessConstraints', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313071430_RemovePartyNameUniqueness'
)
BEGIN
    DROP INDEX [IX_Parties_FullName] ON [Parties];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313071430_RemovePartyNameUniqueness'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313071430_RemovePartyNameUniqueness', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313090755_AddNewMasterDataToMedicine'
)
BEGIN
    ALTER TABLE [Medicines] ADD [DosageForm] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313090755_AddNewMasterDataToMedicine'
)
BEGIN
    ALTER TABLE [Medicines] ADD [Manufacturer] nvarchar(250) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313090755_AddNewMasterDataToMedicine'
)
BEGIN
    ALTER TABLE [Medicines] ADD [Strength] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313090755_AddNewMasterDataToMedicine'
)
BEGIN
    ALTER TABLE [Medicines] ADD [UseFor] nvarchar(250) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313090755_AddNewMasterDataToMedicine'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313090755_AddNewMasterDataToMedicine', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094302_AddAuditToPurchase'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094302_AddAuditToPurchase'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [CreatedBy] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094302_AddAuditToPurchase'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [UpdatedAt] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094302_AddAuditToPurchase'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [UpdatedBy] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094302_AddAuditToPurchase'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094302_AddAuditToPurchase'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313094302_AddAuditToPurchase', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [Suppliers] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [Suppliers] ADD [CreatedBy] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [Suppliers] ADD [UpdatedAt] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [Suppliers] ADD [UpdatedBy] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [CreatedBy] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [UpdatedAt] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [UpdatedBy] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313094548_AddAuditToSalesAndSupplier'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313094548_AddAuditToSalesAndSupplier', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    EXEC sp_rename N'[PurchaseMasters].[TotalAmount]', N'TotalTax', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    EXEC sp_rename N'[PurchaseDetails].[Subtotal]', N'TaxAmount', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [Adjustment] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [DueAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [GrandTotal] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [GrnCode] nvarchar(20) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [InvoiceDate] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [PaidAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [PaymentStatus] nvarchar(20) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [SubTotal] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [TotalDiscount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [DiscountAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [DiscountPercent] decimal(5,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [LineTotal] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [SalePrice] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [TaxPercent] decimal(5,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [UomId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD [UomName] nvarchar(50) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    CREATE TABLE [PurchasePayments] (
        [PurchasePaymentId] int NOT NULL IDENTITY,
        [PurchaseId] int NOT NULL,
        [PaymentMethod] nvarchar(30) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [AccountNumber] nvarchar(100) NULL,
        [TransactionId] nvarchar(100) NULL,
        [Remarks] nvarchar(250) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PurchasePayments] PRIMARY KEY ([PurchasePaymentId]),
        CONSTRAINT [FK_PurchasePayments_PurchaseMasters_PurchaseId] FOREIGN KEY ([PurchaseId]) REFERENCES [PurchaseMasters] ([PurchaseId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    CREATE INDEX [IX_PurchaseDetails_UomId] ON [PurchaseDetails] ([UomId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    CREATE INDEX [IX_PurchasePayments_PurchaseId] ON [PurchasePayments] ([PurchaseId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    ALTER TABLE [PurchaseDetails] ADD CONSTRAINT [FK_PurchaseDetails_Uoms_UomId] FOREIGN KEY ([UomId]) REFERENCES [Uoms] ([UomId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314021246_AddGrnPaymentFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260314021246_AddGrnPaymentFields', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314065627_AddDueCollectionSystem'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [DueAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314065627_AddDueCollectionSystem'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [PaidAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314065627_AddDueCollectionSystem'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [PaymentStatus] nvarchar(20) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314065627_AddDueCollectionSystem'
)
BEGIN
    CREATE TABLE [SalesPayments] (
        [SalesPaymentId] int NOT NULL IDENTITY,
        [SaleId] int NOT NULL,
        [PaymentMethod] nvarchar(30) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [AccountNumber] nvarchar(100) NULL,
        [TransactionId] nvarchar(100) NULL,
        [Remarks] nvarchar(250) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SalesPayments] PRIMARY KEY ([SalesPaymentId]),
        CONSTRAINT [FK_SalesPayments_SalesMasters_SaleId] FOREIGN KEY ([SaleId]) REFERENCES [SalesMasters] ([SaleId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314065627_AddDueCollectionSystem'
)
BEGIN
    CREATE INDEX [IX_SalesPayments_SaleId] ON [SalesPayments] ([SaleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314065627_AddDueCollectionSystem'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260314065627_AddDueCollectionSystem', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    EXEC sp_rename N'[SalesMasters].[Discount]', N'TotalTax', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    DECLARE @var3 sysname;
    SELECT @var3 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SalesMasters]') AND [c].[name] = N'PaymentMethod');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [SalesMasters] DROP CONSTRAINT [' + @var3 + '];');
    ALTER TABLE [SalesMasters] ALTER COLUMN [PaymentMethod] nvarchar(20) NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    DECLARE @var4 sysname;
    SELECT @var4 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SalesMasters]') AND [c].[name] = N'CustomerPhone');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [SalesMasters] DROP CONSTRAINT [' + @var4 + '];');
    ALTER TABLE [SalesMasters] ALTER COLUMN [CustomerPhone] nvarchar(15) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [ChangeAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [CustomerId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [InvoiceCode] nvarchar(30) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [SaleStatus] nvarchar(20) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [SaleTime] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [SpecialDiscount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [SubTotal] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [TotalDiscount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [BatchNumber] nvarchar(50) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [DiscountAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [DiscountPercent] decimal(5,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [ExpiryDate] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [LineTotal] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [TaxAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [TaxPercent] decimal(5,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [UomId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD [UomName] nvarchar(50) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    CREATE TABLE [Customers] (
        [CustomerId] int NOT NULL IDENTITY,
        [Code] nvarchar(20) NOT NULL,
        [FullName] nvarchar(100) NOT NULL,
        [Mobile] nvarchar(15) NULL,
        [Email] nvarchar(150) NULL,
        [Address] nvarchar(250) NULL,
        [IsRegistered] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(100) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_Customers] PRIMARY KEY ([CustomerId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    CREATE INDEX [IX_SalesMasters_CustomerId] ON [SalesMasters] ([CustomerId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SalesMasters_InvoiceCode] ON [SalesMasters] ([InvoiceCode]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    CREATE INDEX [IX_SalesDetails_UomId] ON [SalesDetails] ([UomId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Customers_Code] ON [Customers] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesDetails] ADD CONSTRAINT [FK_SalesDetails_Uoms_UomId] FOREIGN KEY ([UomId]) REFERENCES [Uoms] ([UomId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD CONSTRAINT [FK_SalesMasters_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([CustomerId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315041304_SalesModuleOverhaul'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260315041304_SalesModuleOverhaul', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315053155_AddRolePermissions'
)
BEGIN
    CREATE TABLE [RolePermissions] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(max) NOT NULL,
        [ModuleName] nvarchar(50) NOT NULL,
        [CanView] bit NOT NULL,
        [CanCreate] bit NOT NULL,
        [CanEdit] bit NOT NULL,
        [CanDelete] bit NOT NULL,
        CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315053155_AddRolePermissions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260315053155_AddRolePermissions', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315090511_ConsolidateCustomersToParties'
)
BEGIN
    ALTER TABLE [SalesMasters] DROP CONSTRAINT [FK_SalesMasters_Customers_CustomerId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315090511_ConsolidateCustomersToParties'
)
BEGIN
    DROP TABLE [Customers];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315090511_ConsolidateCustomersToParties'
)
BEGIN
    EXEC sp_rename N'[SalesMasters].[CustomerId]', N'PartyId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315090511_ConsolidateCustomersToParties'
)
BEGIN
    EXEC sp_rename N'[SalesMasters].[IX_SalesMasters_CustomerId]', N'IX_SalesMasters_PartyId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315090511_ConsolidateCustomersToParties'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD CONSTRAINT [FK_SalesMasters_Parties_PartyId] FOREIGN KEY ([PartyId]) REFERENCES [Parties] ([PartyId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315090511_ConsolidateCustomersToParties'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260315090511_ConsolidateCustomersToParties', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315092453_MakeCellRequiredInParties'
)
BEGIN
    DECLARE @var5 sysname;
    SELECT @var5 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Parties]') AND [c].[name] = N'Cell');
    IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [Parties] DROP CONSTRAINT [' + @var5 + '];');
    EXEC(N'UPDATE [Parties] SET [Cell] = N'''' WHERE [Cell] IS NULL');
    ALTER TABLE [Parties] ALTER COLUMN [Cell] nvarchar(15) NOT NULL;
    ALTER TABLE [Parties] ADD DEFAULT N'' FOR [Cell];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315092453_MakeCellRequiredInParties'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260315092453_MakeCellRequiredInParties', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260416112142_AddUserAddress'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [Address] nvarchar(500) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260416112142_AddUserAddress'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260416112142_AddUserAddress', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260416113138_AddProfilePicture'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [ProfilePicturePath] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260416113138_AddProfilePicture'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260416113138_AddProfilePicture', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_UseFors_Code] ON [UseFors];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_UseFors_Name] ON [UseFors];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Uoms_Code] ON [Uoms];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Uoms_Name] ON [Uoms];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Taxes_Code] ON [Taxes];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Taxes_Name] ON [Taxes];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_SalesMasters_InvoiceCode] ON [SalesMasters];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Parties_Code] ON [Parties];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Medicines_Code] ON [Medicines];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Medicines_Name] ON [Medicines];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Manufacturers_Code] ON [Manufacturers];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Manufacturers_Name] ON [Manufacturers];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Generics_Code] ON [Generics];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Generics_Name] ON [Generics];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_DosageForms_Code] ON [DosageForms];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_DosageForms_Name] ON [DosageForms];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_CommonStrengths_Code] ON [CommonStrengths];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_CommonStrengths_Name] ON [CommonStrengths];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Categories_Code] ON [Categories];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    DROP INDEX [IX_Categories_Name] ON [Categories];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [UseFors] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Uoms] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Taxes] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Suppliers] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [BranchId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [RolePermissions] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [BranchId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [PurchaseMasters] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Parties] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Medicines] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Manufacturers] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Generics] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [DosageForms] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [CommonStrengths] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [Categories] ADD [TenantId] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [BranchId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [TenantId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE TABLE [BranchTransfers] (
        [TransferId] int NOT NULL IDENTITY,
        [TenantId] int NOT NULL,
        [FromBranchId] int NOT NULL,
        [ToBranchId] int NOT NULL,
        [MedicineId] int NOT NULL,
        [BatchId] int NULL,
        [BatchNumber] nvarchar(50) NOT NULL,
        [Quantity] int NOT NULL,
        [TransferCode] nvarchar(30) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [Remarks] nvarchar(500) NULL,
        [TransferDate] datetime2 NOT NULL,
        [RequestedBy] nvarchar(100) NULL,
        [ApprovedBy] nvarchar(100) NULL,
        [ApprovedAt] datetime2 NULL,
        CONSTRAINT [PK_BranchTransfers] PRIMARY KEY ([TransferId]),
        CONSTRAINT [FK_BranchTransfers_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines] ([MedicineId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE TABLE [MedicineBatches] (
        [BatchId] int NOT NULL IDENTITY,
        [TenantId] int NOT NULL,
        [BranchId] int NOT NULL,
        [MedicineId] int NOT NULL,
        [BatchNumber] nvarchar(50) NOT NULL,
        [ExpiryDate] datetime2 NOT NULL,
        [CurrentStock] int NOT NULL,
        [PurchasePrice] decimal(18,2) NOT NULL,
        [SalePrice] decimal(18,2) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [ReceivedAt] datetime2 NOT NULL,
        [PurchaseDetailId] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_MedicineBatches] PRIMARY KEY ([BatchId]),
        CONSTRAINT [FK_MedicineBatches_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines] ([MedicineId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE TABLE [Tenants] (
        [TenantId] int NOT NULL IDENTITY,
        [PharmacyName] nvarchar(150) NOT NULL,
        [Slogan] nvarchar(200) NULL,
        [HeadOfficeAddress] nvarchar(300) NULL,
        [Phone] nvarchar(20) NULL,
        [Email] nvarchar(100) NULL,
        [DrugLicenseNo] nvarchar(50) NULL,
        [LogoPath] nvarchar(300) NULL,
        [InvoiceFooter] nvarchar(500) NULL,
        [PrimaryColor] nvarchar(10) NULL,
        [IsActive] bit NOT NULL,
        [SubscriptionPlan] nvarchar(20) NOT NULL,
        [SubscriptionExpiry] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Tenants] PRIMARY KEY ([TenantId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE TABLE [Branches] (
        [BranchId] int NOT NULL IDENTITY,
        [TenantId] int NOT NULL,
        [BranchName] nvarchar(100) NOT NULL,
        [Address] nvarchar(300) NULL,
        [Phone] nvarchar(20) NULL,
        [DrugLicenseNo] nvarchar(50) NULL,
        [IsHeadOffice] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Branches] PRIMARY KEY ([BranchId]),
        CONSTRAINT [FK_Branches_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [Tenants] ([TenantId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Uoms_TenantId_Code] ON [Uoms] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Uoms_TenantId_Name] ON [Uoms] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Taxes_TenantId_Code] ON [Taxes] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Taxes_TenantId_Name] ON [Taxes] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SalesMasters_TenantId_InvoiceCode] ON [SalesMasters] ([TenantId], [InvoiceCode]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Parties_TenantId_Code] ON [Parties] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Medicines_TenantId_Code] ON [Medicines] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Medicines_TenantId_Name] ON [Medicines] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Manufacturers_TenantId_Code] ON [Manufacturers] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Manufacturers_TenantId_Name] ON [Manufacturers] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Generics_TenantId_Code] ON [Generics] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Generics_TenantId_Name] ON [Generics] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DosageForms_TenantId_Code] ON [DosageForms] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DosageForms_TenantId_Name] ON [DosageForms] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CommonStrengths_TenantId_Code] ON [CommonStrengths] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CommonStrengths_TenantId_Name] ON [CommonStrengths] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Categories_TenantId_Code] ON [Categories] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Categories_TenantId_Name] ON [Categories] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE INDEX [IX_Branches_TenantId] ON [Branches] ([TenantId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE INDEX [IX_BranchTransfers_MedicineId] ON [BranchTransfers] ([MedicineId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    CREATE INDEX [IX_MedicineBatches_MedicineId] ON [MedicineBatches] ([MedicineId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
                    -- 1. Seed Tenant 1 (s7 Drug House) if not already exists
                    SET IDENTITY_INSERT Tenants ON;
                    IF NOT EXISTS (SELECT 1 FROM Tenants WHERE TenantId = 1)
                    BEGIN
                        INSERT INTO Tenants (TenantId, PharmacyName, Slogan, HeadOfficeAddress, Phone, Email, DrugLicenseNo, PrimaryColor, SubscriptionPlan, IsActive, CreatedAt)
                        VALUES (1, N'S7 Drug House', N'আপনার বিশ্বস্ত স্বাস্থ্য সঙ্গী', N'ঢাকা, বাংলাদেশ', '01700000000', 'info@s7drughouse.com', 'DL-DH-001', '#007070', 'Pro', 1, GETUTCDATE());
                    END
                    SET IDENTITY_INSERT Tenants OFF;
                    -- 2. Seed Head Office Branch for Tenant 1 if not exists
                    SET IDENTITY_INSERT Branches ON;
                    IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchId = 1)
                    BEGIN
                        INSERT INTO Branches (BranchId, TenantId, BranchName, Address, Phone, DrugLicenseNo, IsHeadOffice, IsActive, CreatedAt)
                        VALUES (1, 1, N'মেইন আউটলেট (হেড অফিস)', N'ঢাকা, বাংলাদেশ', '01700000000', 'DL-DH-001', 1, 1, GETUTCDATE());
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
                    -- 5a. Backfill TenantId = 1 on existing non-SystemAdmin users (SystemAdmin stays TenantId = NULL, BranchId = NULL)
                    UPDATE AspNetUsers
                    SET TenantId = 1
                    WHERE TenantId IS NULL
                      AND Id NOT IN (
                          SELECT ur.UserId
                          FROM AspNetUserRoles ur
                          JOIN AspNetRoles r ON ur.RoleId = r.Id
                          WHERE r.Name = 'SystemAdmin' OR r.NormalizedName = 'SYSTEMADMIN'
                      );
                    -- 5b. Assign BranchId = 1 ONLY to non-Admin / non-SystemAdmin users (Manager, Cashier, etc.)
                    -- ARCHITECTURAL INTENT: Tenant Admin owners keep BranchId = NULL so they can view and switch all branches (GAP-15 backfill fix).
                    UPDATE AspNetUsers
                    SET BranchId = 1
                    WHERE BranchId IS NULL
                      AND TenantId = 1
                      AND Id NOT IN (
                          SELECT ur.UserId
                          FROM AspNetUserRoles ur
                          JOIN AspNetRoles r ON ur.RoleId = r.Id
                          WHERE r.Name IN ('SystemAdmin', 'Admin')
                             OR r.NormalizedName IN ('SYSTEMADMIN', 'ADMIN')
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
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125045825_AddMultiTenancyWithBranches'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261125045825_AddMultiTenancyWithBranches', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125125907_AddUniquePurchaseGrnCodeIndex'
)
BEGIN
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
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125125907_AddUniquePurchaseGrnCodeIndex'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PurchaseMasters_TenantId_GrnCode] ON [PurchaseMasters] ([TenantId], [GrnCode]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261125125907_AddUniquePurchaseGrnCodeIndex'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261125125907_AddUniquePurchaseGrnCodeIndex', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261126073131_AddUniqueUseForTenantIndexes'
)
BEGIN
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
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261126073131_AddUniqueUseForTenantIndexes'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UseFors_TenantId_Code] ON [UseFors] ([TenantId], [Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261126073131_AddUniqueUseForTenantIndexes'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UseFors_TenantId_Name] ON [UseFors] ([TenantId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261126073131_AddUniqueUseForTenantIndexes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261126073131_AddUniqueUseForTenantIndexes', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261126082949_AddSalePrescriptionImagePath'
)
BEGIN
    ALTER TABLE [SalesMasters] ADD [PrescriptionImagePath] nvarchar(260) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261126082949_AddSalePrescriptionImagePath'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261126082949_AddSalePrescriptionImagePath', N'8.0.0');
END;
GO

COMMIT;
GO

