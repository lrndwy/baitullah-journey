import { bigint, index, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const backupSchema = pgSchema('backup')

/**
 * Metadata for a stored archive. The bytes live in object storage; this table
 * is what makes an archive listable and its restore auditable.
 *
 * Deliberately not listed in the manifest's `tables`, so a backup never tries
 * to restore the backup catalogue into itself.
 */
export const backups = backupSchema.table(
  'backups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    label: text('label'),
    /** Object key of the `.tar.gz` in the bucket. */
    key: text('key').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    /**
     * `created` archives were built here; `uploaded` ones arrived from another
     * deployment through the upload flow.
     */
    trigger: text('trigger').notNull().default('created'),
    /**
     * `pending` until the bytes are confirmed to be a readable archive. A row
     * only becomes `ready` once its manifest has been parsed — an upload that
     * never completes leaves a pending row, not a restore that fails later.
     */
    status: text('status').notNull().default('pending'),
    createdBy: uuid('created_by'),
    tables: bigint('tables', { mode: 'number' }).notNull().default(0),
    rows: bigint('rows', { mode: 'number' }).notNull().default(0),
    files: bigint('files', { mode: 'number' }).notNull().default(0),
    /** Archive manifest, kept for inspection without downloading the archive. */
    manifest: jsonb('manifest'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('backups_created_at_idx').on(t.createdAt, t.id)],
)