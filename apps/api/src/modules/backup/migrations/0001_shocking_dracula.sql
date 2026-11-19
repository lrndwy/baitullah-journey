ALTER TABLE "backup"."backups" ALTER COLUMN "trigger" SET DEFAULT 'created';--> statement-breakpoint
ALTER TABLE "backup"."backups" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;