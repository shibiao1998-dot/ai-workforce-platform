CREATE TABLE `audit_logs` (
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
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`title` text NOT NULL,
	`team` text NOT NULL,
	`status` text NOT NULL,
	`sub_team` text,
	`soul` text,
	`identity` text,
	`description` text,
	`avatar_description` text,
	`persona` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `help_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `help_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `help_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `metric_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text,
	`team` text,
	`task_type` text NOT NULL,
	`human_baseline` real NOT NULL,
	`cost_per_hour` real DEFAULT 46.875 NOT NULL,
	`description` text,
	`updated_at` integer,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`period` text NOT NULL,
	`period_type` text NOT NULL,
	`task_count` integer DEFAULT 0 NOT NULL,
	`adoption_rate` real,
	`accuracy_rate` real,
	`human_time_saved` real,
	`custom_metrics` text,
	`created_at` integer,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`module` text NOT NULL,
	`action` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_perm_unq` ON `role_permissions` (`role_id`,`module`,`action`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `skill_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`period` text NOT NULL,
	`invocation_count` integer DEFAULT 0 NOT NULL,
	`success_rate` real,
	`avg_response_time` real,
	`last_used_at` integer,
	`created_at` integer,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`level` integer DEFAULT 3 NOT NULL,
	`category` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_outputs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`url` text,
	`created_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`step_order` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`thought` text,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`team` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`current_step` text,
	`start_time` integer,
	`estimated_end_time` integer,
	`actual_end_time` integer,
	`metadata` text,
	`quality_score` integer,
	`retry_count` integer DEFAULT 0,
	`token_usage` integer,
	`reflection` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
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
CREATE UNIQUE INDEX `user_roles_uc_user_id_unique` ON `user_roles` (`uc_user_id`);--> statement-breakpoint
CREATE TABLE `version_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`version` text NOT NULL,
	`date` text NOT NULL,
	`changelog` text NOT NULL,
	`capabilities` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
