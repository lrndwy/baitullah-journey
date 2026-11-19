CREATE SCHEMA "inquiries";
--> statement-breakpoint
CREATE TABLE "inquiries"."inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"departure_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"pax_count" integer NOT NULL,
	"notes" text,
	"preferred_contact" text DEFAULT 'whatsapp' NOT NULL,
	"status" text DEFAULT 'baru' NOT NULL,
	"admin_notes" text,
	"quota_applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inquiries_created_at_idx" ON "inquiries"."inquiries" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries"."inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_package_idx" ON "inquiries"."inquiries" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "inquiries_departure_idx" ON "inquiries"."inquiries" USING btree ("departure_id");