import type { ModuleManifest } from '@app/core'

export const usersManifest: ModuleManifest = {
  name: 'users',
  title: 'Users',
  description: 'User directory, status and role assignment.',
  version: '1.0.0',
  permissions: [
    { key: 'users.read', description: 'List and inspect users' },
    { key: 'users.create', description: 'Create users' },
    { key: 'users.update', description: 'Update users' },
    { key: 'users.delete', description: 'Delete users' },
  ],
  adminNav: [
    { label: 'Pengguna', path: '/admin/users', icon: 'users', permission: 'users.read' },
  ],
  emits: ['users.created', 'users.updated', 'users.deleted'],
}