CREATE TABLE `income` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` real NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`date` text NOT NULL,
	`is_recurring` integer DEFAULT false NOT NULL,
	`recurring_frequency` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_income_user_date` ON `income` (`user_id`,`date`);