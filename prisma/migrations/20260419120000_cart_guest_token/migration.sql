-- Misafir sepeti: userId isteğe bağlı, guestToken ile çerez eşlemesi
ALTER TABLE `Cart` DROP FOREIGN KEY `Cart_userId_fkey`;

ALTER TABLE `Cart` MODIFY `userId` INTEGER NULL;

ALTER TABLE `Cart` ADD COLUMN `guestToken` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `Cart_guestToken_key` ON `Cart`(`guestToken`);

ALTER TABLE `Cart` ADD CONSTRAINT `Cart_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
