-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `surname` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `authType` ENUM('LOCAL', 'LDAP') NOT NULL DEFAULT 'LOCAL',
    `ldapDn` VARCHAR(191) NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Group_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Group_permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_id` INTEGER NOT NULL,
    `can_request` BOOLEAN NOT NULL DEFAULT false,
    `can_approve_specific` BOOLEAN NOT NULL DEFAULT false,
    `can_approve_generic` BOOLEAN NOT NULL DEFAULT false,
    `can_manage_environment` BOOLEAN NOT NULL DEFAULT false,
    `can_manage_template` BOOLEAN NOT NULL DEFAULT false,
    `can_manage_OS` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Group_permission_group_id_key`(`group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requester_id` INTEGER NOT NULL,
    `approver_id` INTEGER NOT NULL,
    `observation` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'INPROGRESS') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestMachine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `machine_template_id` INTEGER NOT NULL,
    `hostname` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'INPROGRESS') NOT NULL DEFAULT 'PENDING',
    `environment_node_id` INTEGER NOT NULL,

    UNIQUE INDEX `RequestMachine_hostname_key`(`hostname`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Machine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vmid` INTEGER NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `request_Machine_id` INTEGER NOT NULL,
    `machine_type` ENUM('LXC', 'VM') NOT NULL,

    UNIQUE INDEX `Machine_vmid_key`(`vmid`),
    UNIQUE INDEX `Machine_request_Machine_id_key`(`request_Machine_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Credential` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `machine_id` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Credential_machine_id_key`(`machine_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Machine_template` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `cores` INTEGER NOT NULL,
    `ram` INTEGER NOT NULL,
    `machine_type_id` INTEGER NOT NULL,
    `provisiong_script` VARCHAR(191) NULL,

    UNIQUE INDEX `Machine_template_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Machine_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `vmid` INTEGER NOT NULL,
    `os` VARCHAR(191) NOT NULL,
    `os_family` ENUM('LINUX', 'WINDOWS') NOT NULL,
    `environment_node_id` INTEGER NOT NULL,
    `type` ENUM('LXC', 'VM') NOT NULL,

    UNIQUE INDEX `Machine_type_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Environment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `token_name` VARCHAR(191) NOT NULL,
    `token_secret` VARCHAR(191) NOT NULL,
    `template_folder_id` VARCHAR(191) NOT NULL,
    `container_storage` VARCHAR(191) NOT NULL,
    `vm_storage` VARCHAR(191) NOT NULL,
    `machine_lan` VARCHAR(191) NOT NULL,
    `lan_prefix` VARCHAR(191) NOT NULL,
    `machine_gateway` VARCHAR(191) NOT NULL,
    `linux_bridge` VARCHAR(191) NOT NULL,
    `ssh_username` VARCHAR(191) NOT NULL,
    `ssh_password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Environment_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Environment_node` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `environment_id` INTEGER NOT NULL,

    UNIQUE INDEX `Environment_node_name_key`(`name`),
    UNIQUE INDEX `Environment_node_ip_key`(`ip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GroupToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_GroupToUser_AB_unique`(`A`, `B`),
    INDEX `_GroupToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Group_permission` ADD CONSTRAINT `Group_permission_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `Group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_requester_id_fkey` FOREIGN KEY (`requester_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestMachine` ADD CONSTRAINT `RequestMachine_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `Request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestMachine` ADD CONSTRAINT `RequestMachine_machine_template_id_fkey` FOREIGN KEY (`machine_template_id`) REFERENCES `Machine_template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestMachine` ADD CONSTRAINT `RequestMachine_environment_node_id_fkey` FOREIGN KEY (`environment_node_id`) REFERENCES `Environment_node`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Machine` ADD CONSTRAINT `Machine_request_Machine_id_fkey` FOREIGN KEY (`request_Machine_id`) REFERENCES `RequestMachine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Credential` ADD CONSTRAINT `Credential_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `Machine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Machine_template` ADD CONSTRAINT `Machine_template_machine_type_id_fkey` FOREIGN KEY (`machine_type_id`) REFERENCES `Machine_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Machine_type` ADD CONSTRAINT `Machine_type_environment_node_id_fkey` FOREIGN KEY (`environment_node_id`) REFERENCES `Environment_node`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Environment_node` ADD CONSTRAINT `Environment_node_environment_id_fkey` FOREIGN KEY (`environment_id`) REFERENCES `Environment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GroupToUser` ADD CONSTRAINT `_GroupToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GroupToUser` ADD CONSTRAINT `_GroupToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
