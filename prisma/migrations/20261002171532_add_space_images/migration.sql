-- CreateTable
CREATE TABLE `space_images` (
    `id` VARCHAR(191) NOT NULL,
    `space_id` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `space_images_space_id_idx`(`space_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `space_images` ADD CONSTRAINT `space_images_space_id_fkey` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing images
INSERT INTO `space_images` (`id`, `space_id`, `url`, `position`, `created_at`, `updated_at`)
SELECT 
    UUID(), 
    `id`, 
    `image_url`, 
    0, 
    CURRENT_TIMESTAMP(3), 
    CURRENT_TIMESTAMP(3)
FROM `spaces`
WHERE `image_url` IS NOT NULL AND `image_url` != '';
