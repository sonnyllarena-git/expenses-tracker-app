CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lender_name` text NOT NULL,
	`principal_amount` real NOT NULL,
	`interest_rate` real,
	`monthly_payment` real NOT NULL,
	`start_date` text NOT NULL,
	`remaining_balance` real NOT NULL,
	`next_payment_date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_loans_user_active` ON `loans` (`user_id`,`is_active`);