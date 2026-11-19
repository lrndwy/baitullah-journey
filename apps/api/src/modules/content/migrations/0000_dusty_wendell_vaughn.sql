CREATE SCHEMA "content";
--> statement-breakpoint
CREATE TABLE "content"."articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text,
	"thumbnail_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."galleries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"event_date" date,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"customer_name" text NOT NULL,
	"content" text NOT NULL,
	"rating" integer NOT NULL,
	"photo_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content"."gallery_images" ADD CONSTRAINT "gallery_images_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "content"."galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_unique" ON "content"."articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_status_published_at_idx" ON "content"."articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_created_at_idx" ON "content"."articles" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "galleries_slug_unique" ON "content"."galleries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "galleries_published_event_date_idx" ON "content"."galleries" USING btree ("is_published","event_date");--> statement-breakpoint
CREATE INDEX "galleries_created_at_idx" ON "content"."galleries" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "gallery_images_gallery_sort_idx" ON "content"."gallery_images" USING btree ("gallery_id","sort_order");--> statement-breakpoint
CREATE INDEX "testimonials_published_idx" ON "content"."testimonials" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "testimonials_created_at_idx" ON "content"."testimonials" USING btree ("created_at","id");