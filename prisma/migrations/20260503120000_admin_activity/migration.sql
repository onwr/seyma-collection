-- CreateTable
CREATE TABLE `AdminActivity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actorUserId` INTEGER NULL,
    `actorEmail` VARCHAR(255) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `resourceType` VARCHAR(80) NULL,
    `resourceId` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `ip` VARCHAR(45) NULL,

    INDEX `AdminActivity_createdAt_idx`(`createdAt`),
    INDEX `AdminActivity_action_idx`(`action`),
    INDEX `AdminActivity_actorUserId_idx`(`actorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminActivity` ADD CONSTRAINT `AdminActivity_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
