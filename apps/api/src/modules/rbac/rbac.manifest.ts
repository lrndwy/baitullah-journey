import { permissions, rolePermissions, roles, userRoles, type ModuleManifest } from '@app/core'

export const rbacManifest: ModuleManifest = {
  name: 'rbac',
  title: 'Access control',
  description: 'Roles, permissions and role assignment.',
  version: '1.1.0',
  core: true,
  permissions: [
    { key: 'rbac.role.read', description: 'List and inspect roles' },
    { key: 'rbac.role.write', description: 'Create and update roles' },
    { key: 'rbac.role.delete', description: 'Delete roles' },
    { key: 'rbac.assignment.write', description: 'Grant or revoke roles for a user' },
    { key: 'rbac.permission.read', description: 'List the permission catalogue' },
  ],
  adminNav: [
    { label: 'Peran', path: '/admin/roles', icon: 'shield', permission: 'rbac.role.read' },
  ],
  emits: ['rbac.role.assigned', 'rbac.role.revoked'],
  /** Parents before children: `roles` and `permissions` before their join tables. */
  tables: [roles, permissions, userRoles, rolePermissions],
}