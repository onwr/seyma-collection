-- AlterTable
ALTER TABLE `Product` ADD COLUMN `wooProductId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Product_wooProductId_key` ON `Product`(`wooProductId`);
