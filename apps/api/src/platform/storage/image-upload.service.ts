import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { BadRequestError, ServiceUnavailableError } from '@app/core'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type AssetUploadCompletion,
  type AssetUploadSignature,
  type ImageUploadRequest,
} from '@app/contracts'
import { ObjectStore } from './object-store.service'

const UPLOAD_TTL_SECONDS = 900

/**
 * The upload dance shared by every image the application renders: avatars, the
 * site logo, the favicon.
 *
 *   1. `sign`    — vet the declared type and size, hand back a presigned PUT
 *   2. (browser uploads straight to the bucket)
 *   3. `verify`  — HEAD the object and check what actually landed
 *
 * Step 3 is not ceremony: a presigned PUT signs the content type but cannot cap
 * the body, so the only place the *real* size and type can be checked is after
 * the bytes exist. Anything that fails is deleted rather than left in the
 * bucket for someone to find later.
 */
@Injectable()
export class ImageUploadService {
  constructor(private readonly objects: ObjectStore) {}

  /** False on a deployment without object storage; callers degrade rather than throw. */
  get configured(): boolean {
    return this.objects.configured
  }

  async sign(prefix: string, input: ImageUploadRequest): Promise<AssetUploadSignature> {
    this.requireStorage()

    // One key, signed and returned — generating it twice would sign a different
    // object than the client is told to upload to.
    const key = `${prefix}${randomUUID()}-${sanitize(input.filename)}`

    return {
      key,
      uploadUrl: await this.objects.presignPut(key, input.contentType, UPLOAD_TTL_SECONDS),
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
    }
  }

  /** Throws and removes the object when what landed is not an acceptable image. */
  async verify(key: string): Promise<AssetUploadCompletion> {
    this.requireStorage()

    const head = await this.objects.head(key)
    if (!head) throw new BadRequestError('The upload was not found in storage')

    const declared = head.contentType ?? ''
    const allowed = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(declared)

    if (!allowed || head.size > MAX_IMAGE_BYTES) {
      await this.objects.remove(key).catch(() => undefined)
      throw new BadRequestError(
        allowed
          ? `Images must be smaller than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB`
          : `Unsupported image type "${declared || 'unknown'}"`,
      )
    }

    /*
     * The declared type is what the client signed, and the bucket simply echoes
     * it back — so checking it alone would accept anything renamed to `.png`.
     * The first bytes are the only claim the uploader cannot forge, and these
     * files are small enough to read in full.
     */
    const bytes = await this.objects.get(key)
    const sniffed = sniffImageType(bytes)

    if (!sniffed || !isSameFamily(sniffed, declared)) {
      await this.objects.remove(key).catch(() => undefined)
      throw new BadRequestError(
        sniffed
          ? `That file is a ${sniffed}, not a ${declared}`
          : 'That file is not a readable image',
      )
    }

    return { key, size: head.size, contentType: declared }
  }

  /** Best-effort: replacing an image must not fail because the old one is gone. */
  async remove(key: string | null | undefined): Promise<void> {
    if (!key || !this.objects.configured) return
    await this.objects.remove(key).catch(() => undefined)
  }

  /** A fresh download URL for an already-uploaded image. */
  async presign(key: string, ttlSeconds = 3600): Promise<string> {
    this.requireStorage()
    return this.objects.presignGet(key, ttlSeconds)
  }

  /**
   * The key a client sends back is echoed from a signature this server issued,
   * but it is still client input. Constraining it to its own prefix stops one
   * feature from claiming another's objects.
   */
  assertKeyUnder(key: string, prefix: string): void {
    if (!key.startsWith(prefix)) {
      throw new BadRequestError('That upload does not belong to this record')
    }
  }

  private requireStorage(): void {
    if (!this.objects.configured) {
      throw new ServiceUnavailableError({
        code: 'storage_not_configured',
        message: 'Object storage is not configured, so images cannot be uploaded',
      })
    }
  }
}

function sanitize(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'image'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '')
  return (cleaned || 'image').slice(0, 100)
}

type ImageFamily = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/x-icon'

/** What the bytes say, regardless of what the uploader called them. */
export function sniffImageType(bytes: Buffer): ImageFamily | null {
  if (bytes.length < 12) return null

  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return 'image/x-icon'
  }

  return null
}

/** The two ICO spellings are the same file; nothing else may masquerade. */
function isSameFamily(sniffed: ImageFamily, declared: string): boolean {
  if (declared === 'image/vnd.microsoft.icon') return sniffed === 'image/x-icon'
  return sniffed === declared
}