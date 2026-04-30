CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`operator_uc_id` text NOT NULL,
	`operator_nickname` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`details` text,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`module` text NOT NULL,
	`action` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `role_perm_unq` ON `role_permissions` (`role_id`,`module`,`action`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`uc_user_id` text NOT NULL,
	`nickname` text NOT NULL,
	`avatar` text,
	`role_id` text NOT NULL,
	`last_login_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_roles_uc_user_id_unique` ON `user_roles` (`uc_user_id`);
