import {
  boolean,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const packagesSchema = pgSchema('packages')

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

export const categories = packagesSchema.table(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('categories_slug_unique').on(t.slug),
    index('categories_created_at_idx').on(t.createdAt, t.id),
  ],
)

export const packages = packagesSchema.table(
  'packages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    createdBy: uuid('created_by'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    packageType: text('package_type'),
    status: text('status').notNull().default('draft'),
    isFeatured: boolean('is_featured').notNull().default(false),
    basePrice: integer('base_price').notNull(),
    currency: text('currency').notNull().default('IDR'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('packages_slug_unique').on(t.slug),
    index('packages_created_at_idx').on(t.createdAt, t.id),
    index('packages_category_idx').on(t.categoryId),
    index('packages_status_idx').on(t.status),
  ],
)

export const departures = packagesSchema.table(
  'departures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    departureDate: date('departure_date', { mode: 'string' }).notNull(),
    returnDate: date('return_date', { mode: 'string' }).notNull(),
    quota: integer('quota').notNull(),
    availableQuota: integer('available_quota').notNull(),
    airline: text('airline'),
    status: text('status').notNull().default('open'),
    priceOverride: integer('price_override'),
    ...timestamps,
  },
  (t) => [
    index('departures_created_at_idx').on(t.createdAt, t.id),
    index('departures_package_idx').on(t.packageId),
  ],
)

export const itineraries = packagesSchema.table(
  'itineraries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    departureId: uuid('departure_id')
      .notNull()
      .references(() => departures.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    location: text('location'),
  },
  (t) => [
    uniqueIndex('itineraries_departure_day_unique').on(t.departureId, t.dayNumber),
    index('itineraries_departure_idx').on(t.departureId),
  ],
)

export const facilities = packagesSchema.table(
  'facilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('facilities_name_unique').on(t.name),
    index('facilities_created_at_idx').on(t.createdAt, t.id),
  ],
)

export const packageFacilities = packagesSchema.table(
  'package_facilities',
  {
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.packageId, t.facilityId] })],
)

export const accommodations = packagesSchema.table(
  'accommodations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    city: text('city'),
    country: text('country'),
    accommodationType: text('accommodation_type'),
    address: text('address'),
    websiteUrl: text('website_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('accommodations_created_at_idx').on(t.createdAt, t.id)],
)

export const packageAccommodations = packagesSchema.table(
  'package_accommodations',
  {
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    accommodationId: uuid('accommodation_id')
      .notNull()
      .references(() => accommodations.id, { onDelete: 'cascade' }),
    accommodationRole: text('accommodation_role').notNull(),
    nights: integer('nights').notNull(),
  },
  (t) => [primaryKey({ columns: [t.packageId, t.accommodationId] })],
)
