-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `barcode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ProductVariant_barcode_key` ON `ProductVariant`(`barcode`);

-- AlterTable
ALTER TABLE `StockMovement` MODIFY COLUMN `salesChannel` ENUM('ONLINE', 'RETAIL', 'MARKETPLACE') NULL;

-- CreateTable
CREATE TABLE `TrendyolOrderSync` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderNumber` VARCHAR(191) NOT NULL,
    `shipmentPackageId` VARCHAR(191) NOT NULL,
    `lastStatus` VARCHAR(191) NOT NULL,
    `stockDecremented` BOOLEAN NOT NULL DEFAULT false,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrendyolOrderSync_orderNumber_key`(`orderNumber`),
    INDEX `TrendyolOrderSync_lastStatus_idx`(`lastStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
