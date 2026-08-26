-- CreateTable
CREATE TABLE `HeaderNavItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `href` VARCHAR(191) NOT NULL,
    `labelUppercase` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `openInNewTab` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HeaderNavItem_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `HeaderNavItem` (`label`, `href`, `labelUppercase`, `sortOrder`, `isActive`, `openInNewTab`, `createdAt`, `updatedAt`)
VALUES
('ANASAYFA', '/', false, 0, true, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('Erkek Bebek', '/categories/erkek-bebek', true, 1, true, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('Kız Bebek 0-5 Yaş', '/categories/kiz-bebek', true, 2, true, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('Erkek Çocuk 0-5 Yaş', '/categories/erkek-cocuk', true, 3, true, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('Kız Çocuk 2-15 Yaş', '/categories/kiz-cocuk', true, 4, true, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('Aksesuar', '/categories/anne-bebek', true, 5, true, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
