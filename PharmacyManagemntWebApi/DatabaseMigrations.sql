-- Database Migration Script for FEFO (First Expired First Out) Implementation
-- Run this script against your database to add the required columns and tables

-- 1. Add ExpiryDate column to PurchaseItems table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'PurchaseItems' AND COLUMN_NAME = 'ExpiryDate')
BEGIN
    ALTER TABLE dbo.PurchaseItems ADD ExpiryDate DATETIME NULL;
    PRINT 'Added ExpiryDate column to PurchaseItems table';
END
ELSE
BEGIN
    PRINT 'ExpiryDate column already exists in PurchaseItems table';
END
GO

-- 2. Create DrugBatches table for FEFO inventory tracking
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DrugBatches')
BEGIN
    CREATE TABLE dbo.DrugBatches (
        BatchId INT IDENTITY(1,1) PRIMARY KEY,
        DrugId INT NOT NULL,
        PurchaseItemId INT NOT NULL,
        ExpiryDate DATETIME NULL,
        Quantity INT NOT NULL DEFAULT 0,  -- Quantity in base unit
        UnitId INT NOT NULL,              -- Unit of the quantity (typically base unit)
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_DrugBatches_DrugId FOREIGN KEY (DrugId) REFERENCES dbo.Drugs(DrugId),
        CONSTRAINT FK_DrugBatches_PurchaseItemId FOREIGN KEY (PurchaseItemId) REFERENCES dbo.PurchaseItems(PurchaseItemId)
    );
    
    -- Index for FEFO queries (earliest expiry first)
    CREATE INDEX IX_DrugBatches_DrugId_ExpiryDate ON dbo.DrugBatches (DrugId, ExpiryDate ASC, CreatedAt ASC);
    CREATE INDEX IX_DrugBatches_PurchaseItemId ON dbo.DrugBatches (PurchaseItemId);
    
    PRINT 'Created DrugBatches table with indexes';
END
ELSE
BEGIN
    PRINT 'DrugBatches table already exists';
END
GO

-- 3. Optional: Backfill existing PurchaseItems with Drug ExpiryDate (if any)
-- This assumes existing drugs have a single ExpiryDate that applies to all their stock
-- You may want to adjust this based on your data
SET QUOTED_IDENTIFIER ON;
UPDATE pi
SET pi.ExpiryDate = d.ExpiryDate
FROM dbo.PurchaseItems pi
INNER JOIN dbo.Drugs d ON pi.DrugId = d.DrugId
WHERE pi.ExpiryDate IS NULL AND d.ExpiryDate IS NOT NULL;

-- 4. Optional: Create initial batches from existing PurchaseItems
-- This creates one batch per existing PurchaseItem with current stock
-- Only run this if you have existing data and want to initialize FEFO tracking
/*
INSERT INTO dbo.DrugBatches (DrugId, PurchaseItemId, ExpiryDate, Quantity, UnitId, CreatedAt)
SELECT 
    pi.DrugId,
    pi.PurchaseItemId,
    pi.ExpiryDate,
    CASE 
        WHEN d.BaseUnitId != pi.UnitId THEN 
            CAST(pi.Quantity * ISNULL(dc.Factor, 1) AS INT)
        ELSE 
            pi.Quantity
    END as Quantity,
    d.BaseUnitId,
    GETDATE()
FROM dbo.PurchaseItems pi
INNER JOIN dbo.Drugs d ON pi.DrugId = d.DrugId
LEFT JOIN dbo.DrugConversions dc ON dc.DrugId = pi.DrugId AND dc.FromUnitId = pi.UnitId AND dc.ToUnitId = d.BaseUnitId
WHERE NOT EXISTS (SELECT 1 FROM dbo.DrugBatches db WHERE db.PurchaseItemId = pi.PurchaseItemId);
*/

PRINT 'Migration completed successfully!';