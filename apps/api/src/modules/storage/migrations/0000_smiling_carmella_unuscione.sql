CREATE SCHEMA "storage";
--> statement-breakpoint
CREATE TABLE "storage"."files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "files_key_unique" ON "storage"."files" USING btree ("key");--> statement-breakpoint
CREATE INDEX "files_created_at_idx" ON "storage"."files" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "files_owner_idx" ON "storage"."files" USING btree ("owner_id");