-- Atualiza quaisquer registros remanescentes de TENANT para USER ANTES de alterar o enum MySQL
UPDATE `users` SET `role` = 'USER' WHERE `role` = 'TENANT';

-- Altera o enum da coluna role para conter apenas ADMIN e USER com default USER
ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER';
