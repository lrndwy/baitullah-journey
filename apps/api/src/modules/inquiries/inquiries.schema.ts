import { boolean, index, integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const inquiriesSchema = pgSchema('inquiries')

export const inquiries = inquiriesSchema.table(
  'inquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    packageId: uuid('package_id').notNull(),
    departureId: uuid('departure_id').notNull(),
    customerName: text('customer_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    paxCount: integer('pax_count').notNull(),
    notes: text('notes'),
    preferredContact: text('preferred_contact').notNull().default('whatsapp'),
    status: text('status').notNull().default('baru'),
    adminNotes: text('admin_notes'),
    quotaApplied: boolean('quota_applied').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('inquiries_created_at_idx').on(t.createdAt, t.id),
    index('inquiries_status_idx').on(t.status),
    index('inquiries_package_idx').on(t.packageId),
    index('inquiries_departure_idx').on(t.departureId),
  ],
)
