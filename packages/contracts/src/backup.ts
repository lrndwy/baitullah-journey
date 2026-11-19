import { z } from 'zod'

/**
 * How an import treats data that already exists.
 *
 * - `replace` — the archive is the truth. Every declared table is emptied
 *   before its rows are inserted, so the result is exactly the archive.
 * - `merge` — the database is the truth. Rows are matched on primary key:
 *   rows already present are updated in place, new rows are inserted, and
 *   nothing is deleted.
 *
 * Neither mode touches tables a module has not declared, so restoring a backup
 * can never silently empty the audit trail or log everyone out.
 */
export const RestoreModeSchema = z.enum(['replace', 'merge'])
export type RestoreMode = z.infer<typeof RestoreModeSchema>

export const CreateBackupSchema = z.object({
  label: z.string().trim().max(120).optional(),
  /** Include object-storage bytes in the archive. Metadata always travels. */
  includeFiles: z.coerce.boolean().default(true),
})

export type CreateBackupInput = z.infer<typeof CreateBackupSchema>

export const BackupUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  /** Declaration only; the real size is read back from the bucket. */
  size: z.coerce.number().int().positive().optional(),
})

export type BackupUploadRequest = z.infer<typeof BackupUploadRequestSchema>

export interface BackupUploadSignature {
  backupId: string
  key: string
  uploadUrl: string
  expiresAt: string
}

/** `created` archives were made here; `uploaded` ones arrived from elsewhere. */
export type BackupSource = 'created' | 'uploaded'

export interface BackupSummary {
  id: string
  source: BackupSource
  /** `pending` until the bytes are confirmed to be a readable archive. */
  status: 'pending' | 'ready'
  label: string | null
  createdAt: string
  size: number
  mode: RestoreMode
  createdBy: string | null
  tables: number
  rows: number
  files: number
}

export type BackupListResponse = {
  items: BackupSummary[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

export interface RestoreTableReport {
  name: string
  deleted: number
  inserted: number
  updated: number
  skipped: number
}

export interface RestoreReport {
  mode: RestoreMode
  backupId: string
  tables: RestoreTableReport[]
  files: { deleted: number; written: number; skipped: number }
  durationMs: number
}

/** A single row of the archive's manifest, for operator inspection. */
export interface BackupTableEntry {
  name: string
  rows: number
}