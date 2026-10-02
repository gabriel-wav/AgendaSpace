-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `host_approved` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `spaces` ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false;
