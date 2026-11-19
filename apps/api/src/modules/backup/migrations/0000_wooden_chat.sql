CREATE SCHEMA "backup";
--> statement-breakpoint
CREATE TABLE "backup"."backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"key" text NOT NULL,
	"size" bigint NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"created_by" uuid,
	"tables" bigint DEFAULT 0 NOT NULL,
	"rows" bigint DEFAULT 0 NOT NULL,
	"files" bigint DEFAULT 0 NOT NULL,
	"manifest" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "backups_created_at_idx" ON "backup"."backups" USING btree ("created_at","id");