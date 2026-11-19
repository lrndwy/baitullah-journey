CREATE SCHEMA "profile";
--> statement-breakpoint
CREATE TABLE "profile"."user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"job_title" text,
	"department" text,
	"phone" text,
	"location" text,
	"bio" text,
	"timezone" text,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
