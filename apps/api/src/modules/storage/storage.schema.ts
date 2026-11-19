import { bigint, index, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/** The storage module owns its own schema, like every module does. */
export const storageSchema = pgSchema('storage')

export const files = storageSchema.table(
  'files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Object key inside the bucket. Unique: a key maps to exactly one record. */
    key: text('key').notNull(),
    /** Name the user uploaded, preserved for display and download. */
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    /** Bytes. `bigint` because files routinely exceed int4. */
    size: bigint('size', { mode: 'number' }).notNull(),
    /** `public` | `private`. */
    visibility: text('visibility').notNull().default('private'),
    /** `pending` until the bytes are confirmed in the bucket. */
    status: text('status').notNull().default('pending'),
    ownerId: uuid('owner_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('files_key_unique').on(t.key),
    index('files_created_at_idx').on(t.createdAt, t.id),
    index('files_owner_idx').on(t.ownerId),
  ],
)