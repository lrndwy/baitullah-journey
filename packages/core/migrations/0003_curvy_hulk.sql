ALTER TABLE "auth"."users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN "locked_until" timestamp with time zone;