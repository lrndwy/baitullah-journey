import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** Profile data is its own bounded context, so it gets its own schema. */
export const profileSchema = pgSchema('profile')

export const userProfiles = profileSchema.table('user_profiles', {
  /** Shared primary key with `auth.users`: one profile per user, no exceptions. */
  userId: uuid('user_id').primaryKey(),
  jobTitle: text('job_title'),
  department: text('department'),
  phone: text('phone'),
  location: text('location'),
  bio: text('bio'),
  /** IANA name, e.g. `Asia/Jakarta`. */
  timezone: text('timezone'),
  /** BCP-47 tag, e.g. `id-ID`. */
  locale: text('locale'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})