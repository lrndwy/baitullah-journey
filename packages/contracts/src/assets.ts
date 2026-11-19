import { z } from 'zod'

/**
 * Image uploads that end up rendered in the browser: avatars, logos, favicons.
 *
 * SVG is deliberately absent. An SVG can carry script, and once it is served
 * from the bucket any navigation to its URL executes it in this origin's
 * context. Raster formats cannot do that, so the allow-list is raster-only.
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
] as const

export const MAX_IMAGE_BYTES = 2_097_152

export const ImageUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.coerce.number().int().positive().max(MAX_IMAGE_BYTES),
})

export type ImageUploadRequest = z.infer<typeof ImageUploadRequestSchema>

export const AssetCompleteSchema = z.object({
  /** Echoed back from the signature so the server verifies what it signed. */
  key: z.string().trim().min(1).max(512),
})

export type AssetCompleteInput = z.infer<typeof AssetCompleteSchema>

export interface AssetUploadSignature {
  key: string
  uploadUrl: string
  expiresAt: string
}

/**
 * A presigned PUT signs the content type but cannot cap the body size, so the
 * declared size is checked before signing and the real size is checked again
 * when the upload is confirmed. An object that fails the second check is
 * deleted, not merely ignored.
 */
export interface AssetUploadCompletion {
  key: string
  size: number
  contentType: string
}