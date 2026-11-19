CREATE SCHEMA "packages";
--> statement-breakpoint
CREATE TABLE "packages"."accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"country" text,
	"accommodation_type" text,
	"address" text,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages"."departures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"departure_date" date NOT NULL,
	"return_date" date NOT NULL,
	"quota" integer NOT NULL,
	"available_quota" integer NOT NULL,
	"airline" text,
	"status" text DEFAULT 'open' NOT NULL,
	"price_override" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages"."facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages"."itineraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"departure_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text
);
--> statement-breakpoint
CREATE TABLE "packages"."package_accommodations" (
	"package_id" uuid NOT NULL,
	"accommodation_id" uuid NOT NULL,
	"accommodation_role" text NOT NULL,
	"nights" integer NOT NULL,
	CONSTRAINT "package_accommodations_package_id_accommodation_id_pk" PRIMARY KEY("package_id","accommodation_id")
);
--> statement-breakpoint
CREATE TABLE "packages"."package_facilities" (
	"package_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	CONSTRAINT "package_facilities_package_id_facility_id_pk" PRIMARY KEY("package_id","facility_id")
);
--> statement-breakpoint
CREATE TABLE "packages"."packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"created_by" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"package_type" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"base_price" integer NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "packages"."departures" ADD CONSTRAINT "departures_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "packages"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages"."itineraries" ADD CONSTRAINT "itineraries_departure_id_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "packages"."departures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages"."package_accommodations" ADD CONSTRAINT "package_accommodations_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "packages"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages"."package_accommodations" ADD CONSTRAINT "package_accommodations_accommodation_id_accommodations_id_fk" FOREIGN KEY ("accommodation_id") REFERENCES "packages"."accommodations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages"."package_facilities" ADD CONSTRAINT "package_facilities_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "packages"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages"."package_facilities" ADD CONSTRAINT "package_facilities_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "packages"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages"."packages" ADD CONSTRAINT "packages_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "packages"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accommodations_created_at_idx" ON "packages"."accommodations" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "packages"."categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_created_at_idx" ON "packages"."categories" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "departures_created_at_idx" ON "packages"."departures" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "departures_package_idx" ON "packages"."departures" USING btree ("package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_name_unique" ON "packages"."facilities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "facilities_created_at_idx" ON "packages"."facilities" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "itineraries_departure_day_unique" ON "packages"."itineraries" USING btree ("departure_id","day_number");--> statement-breakpoint
CREATE INDEX "itineraries_departure_idx" ON "packages"."itineraries" USING btree ("departure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_slug_unique" ON "packages"."packages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "packages_created_at_idx" ON "packages"."packages" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "packages_category_idx" ON "packages"."packages" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "packages_status_idx" ON "packages"."packages" USING btree ("status");