CREATE TABLE `subcategories` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_subcategories_category` ON `subcategories` (`category_id`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `subcategory_id` text REFERENCES subcategories(id);