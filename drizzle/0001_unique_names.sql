-- Rows from before the duplicate-name rule would make the unique indexes fail to build: the first row of each
-- group keeps its name, the rest get a short id suffix (ids are unique, so the renamed rows are too), cut to stay
-- within the form limits (list name 80, task title 120) so the row can still be edited and saved.
UPDATE `lists` SET `name` = substr(`name`, 1, 69) || ' (' || substr(`id`, 1, 8) || ')'
WHERE `rowid` NOT IN (SELECT min(`rowid`) FROM `lists` GROUP BY `user_id`, lower(`name`));--> statement-breakpoint
UPDATE `tasks` SET `title` = substr(`title`, 1, 109) || ' (' || substr(`id`, 1, 8) || ')'
WHERE `rowid` NOT IN (SELECT min(`rowid`) FROM `tasks` GROUP BY `list_id`, lower(`title`));--> statement-breakpoint
CREATE UNIQUE INDEX `lists_user_id_name_unique` ON `lists` (`user_id`,lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_list_id_title_unique` ON `tasks` (`list_id`,lower("title"));
