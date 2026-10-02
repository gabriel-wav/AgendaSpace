-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `approved_at` DATETIME(3) NULL,
    ADD COLUMN `approved_by_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Map Existing Data
UPDATE `bookings` b
JOIN `spaces` s ON b.`space_id` = s.`id`
SET b.`approval_status` = 'APPROVED',
    b.`approved_at` = b.`updated_at`,
    b.`approved_by_id` = s.`created_by`
WHERE b.`host_approved` = 1;

-- Drop Column
ALTER TABLE `bookings` DROP COLUMN `host_approved`;
