import { z } from 'zod'

/**
 * An optional field that may also be cleared. `null` clears it, `undefined`
 * leaves it alone — the distinction matters for a partially-filled profile.
 */
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()

export const UpdateProfileSchema = z
  .object({
    jobTitle: optionalText(120),
    department: optionalText(120),
    phone: optionalText(40),
    location: optionalText(120),
    bio: optionalText(1000),
    /** IANA name, e.g. `Asia/Jakarta`. */
    timezone: optionalText(64),
    /** BCP-47 tag, e.g. `id-ID`. */
    locale: optionalText(16),
    avatarUrl: z.string().url().max(2048).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

/** Sent after the browser has PUT the avatar bytes to the presigned URL. */
export const AvatarCompleteSchema = z.object({
  key: z.string().trim().min(1).max(512),
})

export type AvatarCompleteInput = z.infer<typeof AvatarCompleteSchema>

export interface UserProfile {
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
  jobTitle: string | null
  department: string | null
  phone: string | null
  location: string | null
  bio: string | null
  timezone: string | null
  locale: string | null
  roles: string[]
  createdAt: string
  updatedAt: string
}