CREATE SCHEMA "settings";
--> statement-breakpoint
CREATE TABLE "settings"."app_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"site_name" text DEFAULT 'Fullstack Template' NOT NULL,
	"logo_key" text,
	"favicon_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
