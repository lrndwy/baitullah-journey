import type { ImageUploadService } from './image-upload.service'

/** Long enough to survive a page session, short enough to stay a capability. */
export const AVATAR_URL_TTL_SECONDS = 3600

/**
 * Turns the two avatar sources into the one URL a client should render.
 *
 * An uploaded avatar wins over the provider picture, and it is resolved to a
 * freshly presigned URL on every read rather than being stored: a presigned URL
 * written to the database would be a dead link within the hour.
 *
 * Kernel-level on purpose — the session, the user directory and the profile page
 * all need this, and none of them may import another module.
 */
export async function resolveAvatarUrl(
  images: ImageUploadService,
  avatarKey: string | null | undefined,
  providerUrl: string | null | undefined,
): Promise<string | null> {
  if (!avatarKey) return providerUrl ?? null
  if (!images.configured) return providerUrl ?? null

  try {
    return await images.presign(avatarKey, AVATAR_URL_TTL_SECONDS)
  } catch {
    // A storage outage should not make a profile unreadable; fall back.
    return providerUrl ?? null
  }
}