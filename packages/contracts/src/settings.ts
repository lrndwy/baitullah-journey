import { z } from 'zod'

/**
 * Branding that has to be readable before anyone signs in — the login page
 * carries the site name and logo — so `GET /api/settings` is public.
 */
export const UpdateSettingsSchema = z
  .object({
    siteName: z.string().trim().min(1).max(80).optional(),
    tagline: z.string().trim().max(240).nullable().optional(),
    whatsapp: z.string().trim().max(32).nullable().optional(),
    phone: z.string().trim().max(64).nullable().optional(),
    email: z.string().trim().email().max(254).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    license: z.string().trim().max(500).nullable().optional(),
    aboutHtml: z.string().trim().max(50_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>

/** Logo and favicon are the two slots the settings page can hold an image for. */
export const ASSET_SLOTS = ['logo', 'favicon'] as const
export type AssetSlot = (typeof ASSET_SLOTS)[number]

export const AssetSlotSchema = z.enum(ASSET_SLOTS)

export interface SiteSettings {
  siteName: string
  tagline: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  address: string | null
  license: string | null
  aboutHtml: string | null
  /**
   * Stable paths (`/api/settings/assets/logo`), not bucket URLs. Each request
   * redirects to a freshly presigned URL, so the value never expires and can be
   * cached in HTML without going stale.
   */
  logoUrl: string | null
  faviconUrl: string | null
  updatedAt: string | null
}
