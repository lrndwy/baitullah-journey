import { randomUUID } from 'node:crypto'
import type { ModuleManifest } from '@app/core'
import { files } from './storage.schema'

export const storageManifest: ModuleManifest = {
  name: 'storage',
  title: 'File storage',
  description: 'S3-compatible object storage with presigned uploads and downloads.',
  version: '1.0.0',
  permissions: [
    { key: 'storage.file.read', description: 'List and download every file' },
    { key: 'storage.file.write', description: 'Upload files' },
    { key: 'storage.file.delete', description: 'Delete any file' },
  ],
  adminNav: [
    { label: 'File', path: '/admin/files', icon: 'folder', permission: 'storage.file.read' },
  ],
  emits: ['storage.file.uploaded', 'storage.file.deleted'],
  tables: [files],
}

/** Enforced before a signature is issued, so a client cannot presign a huge PUT. */
export const MAX_UPLOAD_BYTES = 52_428_800

/** `files/2026/10/<uuid>-name.pdf` — dated prefixes keep listings cheap. */
export function buildObjectKey(filename: string): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `files/${year}/${month}/${randomUUID()}-${sanitizeFilename(filename)}`
}

/** Everything a user controls about the name is stripped; only the shape survives. */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'file'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '')
  return (cleaned || 'file').slice(0, 120)
}