import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const settingsSchema = pgSchema('settings')

/**
 * A one-row table. Branding is a property of this installation, not a
 * collection — a key/value table would let a typo create a second opinion about
 * what the site is called.
 */
export const appSettings = settingsSchema.table('app_settings', {
  /** Always `'default'`; the primary key is what enforces the singleton. */
  id: text('id').primaryKey(),
  siteName: text('site_name').notNull().default('Baitullah Journey'),
  tagline: text('tagline'),
  whatsapp: text('whatsapp'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  license: text('license'),
  aboutHtml: text('about_html'),
  logoKey: text('logo_key'),
  faviconKey: text('favicon_key'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
})

export const SETTINGS_ROW_ID = 'default'