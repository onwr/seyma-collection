-- CreateTable
CREATE TABLE `StoreSale` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleNo` VARCHAR(32) NOT NULL,
    `status` ENUM('COMPLETED', 'VOIDED') NOT NULL DEFAULT 'COMPLETED',
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `discountTotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'CARD', 'POS_CARD') NOT NULL,
    `note` VARCHAR(500) NULL,
    `customerPhone` VARCHAR(40) NULL,
    `createdByUserId` INTEGER NOT NULL,
    `voidedAt` DATETIME(3) NULL,
    `voidedByUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoreSale_saleNo_key`(`saleNo`),
    INDEX `StoreSale_createdAt_idx`(`createdAt`),
    INDEX `StoreSale_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `StoreSale_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreSaleLine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeSaleId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `variantId` INTEGER NULL,
    `name` VARCHAR(400) NOT NULL,
    `sku` VARCHAR(120) NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `lineDiscount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `lineTotal` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StoreSaleLine_storeSaleId_idx`(`storeSaleId`),
    INDEX `StoreSaleLine_productId_idx`(`productId`),
    INDEX `StoreSaleLine_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `salesChannel` ENUM('ONLINE', 'RETAIL') NULL,
    ADD COLUMN `storeSaleId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `StockMovement_storeSaleId_idx` ON `StockMovement`(`storeSaleId`);
CREATE INDEX `StockMovement_salesChannel_createdAt_idx` ON `StockMovement`(`salesChannel`, `createdAt`);

-- AddForeignKey
ALTER TABLE `StoreSale` ADD CONSTRAINT `StoreSale_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreSale` ADD CONSTRAINT `StoreSale_voidedByUserId_fkey` FOREIGN KEY (`voidedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreSaleLine` ADD CONSTRAINT `StoreSaleLine_storeSaleId_fkey` FOREIGN KEY (`storeSaleId`) REFERENCES `StoreSale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_storeSaleId_fkey` FOREIGN KEY (`storeSaleId`) REFERENCES `StoreSale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
