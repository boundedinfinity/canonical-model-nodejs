CREATE TABLE `label_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE INDEX `label_groups_name_idx` ON `label_groups` (`name`);--> statement-breakpoint
CREATE TABLE `labels__label_groups` (
	`label_id` text NOT NULL,
	`label_group_id` text NOT NULL,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`label_group_id`) REFERENCES `label_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE INDEX `labels_name_idx` ON `labels` (`name`);--> statement-breakpoint
CREATE TABLE `person_names_first` (
	`person_names_id` text,
	`name` text,
	`index` integer,
	FOREIGN KEY (`person_names_id`) REFERENCES `person_names`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `person_names_first_idx` ON `person_names_first` (`name`);--> statement-breakpoint
CREATE TABLE `person_names_last` (
	`person_names_id` text,
	`name` text,
	`index` integer,
	FOREIGN KEY (`person_names_id`) REFERENCES `person_names`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `person_names_last_idx` ON `person_names_last` (`name`);--> statement-breakpoint
CREATE TABLE `person_names_middle` (
	`person_names_id` text,
	`name` text,
	`index` integer,
	FOREIGN KEY (`person_names_id`) REFERENCES `person_names`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `person_names_middle_idx` ON `person_names_middle` (`name`);--> statement-breakpoint
CREATE TABLE `person_names_prefixes_aliases` (
	`prefix_id` text,
	`name` text,
	`index` integer
);
--> statement-breakpoint
CREATE TABLE `person_names_prefixes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`type` text DEFAULT 'common',
	`description` text
);
--> statement-breakpoint
CREATE TABLE `person_names_suffixes_aliases` (
	`suffix_id` text,
	`name` text,
	`index` integer
);
--> statement-breakpoint
CREATE TABLE `person_names_suffixes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`type` text DEFAULT 'common',
	`description` text
);
--> statement-breakpoint
CREATE TABLE `person_names` (
	`id` text PRIMARY KEY NOT NULL,
	`order` text DEFAULT 'western'
);
