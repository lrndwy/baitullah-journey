import { z } from 'zod'
import { PaginationQuerySchema, UuidSchema } from './pagination'

export const FileVisibilitySchema = z.enum(['public', 'private'])
export type FileVisibility = z.infer<typeof FileVisibilitySchema>

export const UploadSignatureSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(160),
  /** Bytes. The client declares it so the signature can bound the upload. */
  size: z.coerce.number().int().positive().max(52_428_800),
  visibility: FileVisibilitySchema.default('private'),
})

export type UploadSignatureInput = z.infer<typeof UploadSignatureSchema>

export const ListFilesQuerySchema = PaginationQuerySchema.extend({
  /** Case-insensitive match against the stored filename. */
  search: z.string().trim().min(1).max(200).optional(),
  visibility: FileVisibilitySchema.optional(),
})

export type ListFilesQuery = z.infer<typeof ListFilesQuerySchema>

export const FileIdParamSchema = z.object({ id: UuidSchema })

export interface StoredFile {
  id: string
  /** Object key inside the bucket. Never exposed to clients as a path. */
  key: string
  filename: string
  contentType: string
  size: number
  visibility: FileVisibility
  /**
   * `pending` until the bytes actually land in the bucket. A client that
   * requests a signature and never uploads leaves a pending row, not a claim
   * that a file exists.
   */
  status: 'pending' | 'ready'
  ownerId: string | null
  createdAt: string
}

export interface StoredFileWithUrl extends StoredFile {
  /**
   * Time-limited download URL. For a private object this is a presigned URL;
   * for a public one it is the CDN/base URL. Either way it expires.
   */
  url: string
}

export type StoredFileListResponse = {
  items: StoredFileWithUrl[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

export interface UploadSignatureResponse {
  fileId: string
  key: string
  /** PUT the bytes here; every requirement is already encoded in the URL. */
  uploadUrl: string
  expiresAt: string
}