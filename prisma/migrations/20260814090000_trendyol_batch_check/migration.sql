-- CreateTable
CREATE TABLE `TrendyolBatchCheck` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchRequestId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checkedAt` DATETIME(3) NULL,
    `itemCount` INTEGER NULL,
    `failedItemCount` INTEGER NULL,
    `failures` TEXT NULL,

    UNIQUE INDEX `TrendyolBatchCheck_batchRequestId_key`(`batchRequestId`),
    INDEX `TrendyolBatchCheck_checkedAt_idx`(`checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
