import type { ModuleManifest } from '@app/core'

export const backupManifest: ModuleManifest = {
  name: 'backup',
  title: 'Backups',
  description: 'Export and import database rows and stored files, in replace or merge mode.',
  version: '1.0.0',
  permissions: [
    { key: 'backup.read', description: 'List and download backups' },
    { key: 'backup.create', description: 'Create a backup' },
    { key: 'backup.restore', description: 'Restore from a backup' },
    { key: 'backup.delete', description: 'Delete a backup' },
  ],
  adminNav: [
    { label: 'Backup', path: '/admin/backups', icon: 'archive', permission: 'backup.read' },
  ],
  emits: ['backup.created', 'backup.restored'],
  /** Its own catalogue is intentionally excluded — see `backup.schema.ts`. */
  tables: [],
}

/** Where object bytes live, and where archives are stored. */
export const FILES_PREFIX = 'files/'
export const BACKUPS_PREFIX = 'backups/'

export const BACKUP_FORMAT_VERSION = 1

/**
 * Kernel-owned tables that hold live credentials and are therefore never
 * archived. They are reset by a `replace` restore so the restored database
 * cannot contain sessions issued against the pre-restore state.
 */
export const VOLATILE_TABLES: { schema: string; name: string }[] = [
  { schema: 'auth', name: 'sessions' },
  { schema: 'auth', name: 'password_reset_codes' },
]

export interface BackupManifestFile {
  formatVersion: number
  createdAt: string
  appModules: string[]
  tables: {
    /** `schema.table` — the identifier used in SQL. */
    id: string
    module: string
    columns: string[]
    primaryKey: string[]
    dataFile: string
    rows: number
  }[]
  objects: { key: string; size: number }[]
}