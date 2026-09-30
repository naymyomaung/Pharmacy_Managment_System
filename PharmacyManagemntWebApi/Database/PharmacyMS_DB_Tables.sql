-- =============================================
-- PharmacyMS_DB : Full SSMS Table Script
-- SQL Server 2019+ / SSMS
-- Run once on: Server=.\SQLEXPRESS
-- =============================================
IF DB_ID('PharmacyMS_DB') IS NULL CREATE DATABASE PharmacyMS_DB;
GO
USE PharmacyMS_DB;
GO

-- 1. Users
IF OBJECT_ID('dbo.Users','U') IS NULL
CREATE TABLE dbo.Users(
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    Role NVARCHAR(20) NOT NULL DEFAULT 'Cashier'
        CHECK (Role IN ('Admin','Pharmacist','Cashier')),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

-- 2. Units
IF OBJECT_ID('dbo.Units','U') IS NULL
CREATE TABLE dbo.Units(
    UnitId INT IDENTITY(1,1) PRIMARY KEY,
    UnitName NVARCHAR(50) NOT NULL,   -- Tablet, Strip, Box, Bottle
    UnitCode NVARCHAR(10) NOT NULL UNIQUE, -- TBL, STRP, BOX, BTL
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    DeletedAt DATETIME NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 3. Drugs
IF OBJECT_ID('dbo.Drugs','U') IS NULL
CREATE TABLE dbo.Drugs(
    DrugId INT IDENTITY(1,1) PRIMARY KEY,
    DrugName NVARCHAR(100) NOT NULL,
    GenericName NVARCHAR(100) NULL,
    Category NVARCHAR(50) NULL,
    BaseUnitId INT NOT NULL REFERENCES dbo.Units(UnitId),
    SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    StockQuantity INT NOT NULL DEFAULT 0,
    ExpiryDate DATE NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 4. DrugConversions
IF OBJECT_ID('dbo.DrugConversions','U') IS NULL
CREATE TABLE dbo.DrugConversions(
    ConversionId INT IDENTITY(1,1) PRIMARY KEY,
    DrugId INT NOT NULL REFERENCES dbo.Drugs(DrugId),
    FromUnitId INT NOT NULL REFERENCES dbo.Units(UnitId),
    ToUnitId INT NOT NULL REFERENCES dbo.Units(UnitId),
    ConversionFactor DECIMAL(18,2) NOT NULL CHECK (ConversionFactor > 0),
    CONSTRAINT UQ_DrugConversion UNIQUE (DrugId, FromUnitId, ToUnitId)
);

-- 5. Suppliers
IF OBJECT_ID('dbo.Suppliers','U') IS NULL
CREATE TABLE dbo.Suppliers(
    SupplierId INT IDENTITY(1,1) PRIMARY KEY,
    SupplierName NVARCHAR(100) NOT NULL,
    ContactPerson NVARCHAR(100) NULL,
    Phone NVARCHAR(20) NULL,
    Address NVARCHAR(255) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 6. Purchases (Master)
IF OBJECT_ID('dbo.Purchases','U') IS NULL
CREATE TABLE dbo.Purchases(
    PurchaseId INT IDENTITY(1,1) PRIMARY KEY,
    SupplierId INT NULL REFERENCES dbo.Suppliers(SupplierId),
    UserId INT NOT NULL REFERENCES dbo.Users(UserId),
    PurchaseDate DATETIME NOT NULL DEFAULT GETDATE(),
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    InvoiceNumber NVARCHAR(50) NULL
);

-- 7. PurchaseItems (Details)
IF OBJECT_ID('dbo.PurchaseItems','U') IS NULL
CREATE TABLE dbo.PurchaseItems(
    PurchaseItemId INT IDENTITY(1,1) PRIMARY KEY,
    PurchaseId INT NOT NULL REFERENCES dbo.Purchases(PurchaseId),
    DrugId INT NOT NULL REFERENCES dbo.Drugs(DrugId),
    UnitId INT NOT NULL REFERENCES dbo.Units(UnitId),
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(18,2) NOT NULL,
    ExpiryDate DATE NULL,
    Subtotal AS (Quantity * UnitPrice) PERSISTED
);
GO
-- Add ExpiryDate to PurchaseItems if upgrading an existing DB
IF OBJECT_ID('dbo.PurchaseItems','U') IS NOT NULL AND COL_LENGTH('dbo.PurchaseItems','ExpiryDate') IS NULL
    ALTER TABLE dbo.PurchaseItems ADD ExpiryDate DATE NULL;
GO

-- 7b. DrugBatches (FEFO tracking: one row per purchase line, earliest expiry sells first)
IF OBJECT_ID('dbo.DrugBatches','U') IS NULL
CREATE TABLE dbo.DrugBatches(
    BatchId INT IDENTITY(1,1) PRIMARY KEY,
    DrugId INT NOT NULL REFERENCES dbo.Drugs(DrugId),
    PurchaseItemId INT NULL REFERENCES dbo.PurchaseItems(PurchaseItemId),
    ExpiryDate DATE NULL,
    Quantity INT NOT NULL DEFAULT 0,
    UnitId INT NOT NULL REFERENCES dbo.Units(UnitId),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- 8. Sales (Master)
IF OBJECT_ID('dbo.Sales','U') IS NULL
CREATE TABLE dbo.Sales(
    SaleId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL REFERENCES dbo.Users(UserId),
    CustomerName NVARCHAR(100) NOT NULL DEFAULT 'General Customer',
    SaleDate DATETIME NOT NULL DEFAULT GETDATE(),
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    Discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    NetAmount AS (TotalAmount - Discount) PERSISTED,
    PaymentMethod NVARCHAR(20) NOT NULL DEFAULT 'Cash'
);

-- 9. SaleItems (Details)
IF OBJECT_ID('dbo.SaleItems','U') IS NULL
CREATE TABLE dbo.SaleItems(
    SaleItemId INT IDENTITY(1,1) PRIMARY KEY,
    SaleId INT NOT NULL REFERENCES dbo.Sales(SaleId),
    DrugId INT NOT NULL REFERENCES dbo.Drugs(DrugId),
    UnitId INT NOT NULL REFERENCES dbo.Units(UnitId),
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(18,2) NOT NULL,
    Subtotal AS (Quantity * UnitPrice) PERSISTED
);
GO

-- Seed Units
IF NOT EXISTS (SELECT 1 FROM dbo.Units)
INSERT INTO dbo.Units (UnitName, UnitCode) VALUES
('Tablet','TBL'),('Strip','STRP'),('Box','BOX'),('Bottle','BTL');
GO

-- Seed Admin (password = admin123 hashed with SHA256 for demo; replace with BCrypt in prod)
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username='admin')
INSERT INTO dbo.Users (FullName, Username, PasswordHash, Role)
VALUES ('Administrator','admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9','Admin');
GO
