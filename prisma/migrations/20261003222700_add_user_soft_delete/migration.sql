-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `deleted_at` DATETIME(3) NULL;
