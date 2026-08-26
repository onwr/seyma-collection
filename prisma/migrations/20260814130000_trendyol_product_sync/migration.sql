-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `trendyolListedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `TrendyolBatchCheck` ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'STOCK';
