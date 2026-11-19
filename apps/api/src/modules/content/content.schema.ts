import {
  boolean,
  date,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const contentSchema = pgSchema('content')

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

export const articles = contentSchema.table(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id'),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    content: text('content'),
    thumbnailUrl: text('thumbnail_url'),
    /** `draft` | `published` | `archived`. */
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('articles_slug_unique').on(t.slug),
    index('articles_status_published_at_idx').on(t.status, t.publishedAt),
    index('articles_created_at_idx').on(t.createdAt, t.id),
  ],
)

export const galleries = contentSchema.table(
  'galleries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    createdBy: uuid('created_by'),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    eventDate: date('event_date', { mode: 'string' }),
    isPublished: boolean('is_published').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('galleries_slug_unique').on(t.slug),
    index('galleries_published_event_date_idx').on(t.isPublished, t.eventDate),
    index('galleries_created_at_idx').on(t.createdAt, t.id),
  ],
)

export const galleryImages = contentSchema.table(
  'gallery_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    galleryId: uuid('gallery_id')
      .notNull()
      .references(() => galleries.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    caption: text('caption'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('gallery_images_gallery_sort_idx').on(t.galleryId, t.sortOrder)],
)

export const testimonials = contentSchema.table(
  'testimonials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    createdBy: uuid('created_by'),
    customerName: text('customer_name').notNull(),
    content: text('content').notNull(),
    rating: integer('rating').notNull(),
    photoUrl: text('photo_url'),
    isPublished: boolean('is_published').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('testimonials_published_idx').on(t.isPublished),
    index('testimonials_created_at_idx').on(t.createdAt, t.id),
  ],
)
