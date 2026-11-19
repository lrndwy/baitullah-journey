import type { ModuleManifest } from '@app/core'

export const auditManifest: ModuleManifest = {
  name: 'audit',
  title: 'Audit log',
  description: 'Read-only view of every recorded state change.',
  version: '1.0.0',
  permissions: [{ key: 'audit.log.read', description: 'Browse the audit trail' }],
  adminNav: [
    { label: 'Audit', path: '/admin/audit', icon: 'scroll', permission: 'audit.log.read' },
  ],
}