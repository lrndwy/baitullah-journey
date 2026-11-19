import { Inject, Injectable } from '@nestjs/common'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  buildPage,
  decodeCursor,
  keysetCondition,
  normalizeLimit,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  type AuditRecorder,
  type DatabaseHandle,
  type EventBus,
  type Page,
  type PermissionMeta,
} from '@app/core'
import type { CreateRoleInput, Role, UpdateRoleInput } from '@app/contracts'
import { and, count, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { AUDIT_RECORDER, DATABASE, EVENT_BUS } from '../../platform/tokens'

@Injectable()
export class RbacService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
  ) {}

  /**
   * Reconciles the permission table with the manifests of all enabled modules.
   * This is what makes installing or removing a module sufficient: the
   * catalogue follows the code, and permissions of removed modules disappear
   * along with their `role_permissions` rows.
   */
  async syncPermissions(catalog: { key: string; description: string; module: string }[]): Promise<number> {
    return this.database.db.transaction(async (tx) => {
      if (catalog.length > 0) {
        await tx
          .insert(permissions)
          .values(catalog)
          .onConflictDoUpdate({
            target: permissions.key,
            set: {
              description: sql`excluded.description`,
              module: sql`excluded.module`,
            },
          })
      }

      const keys = catalog.map((entry) => entry.key)
      const removed = await tx
        .delete(permissions)
        .where(keys.length > 0 ? notInArray(permissions.key, keys) : sql`true`)
        .returning({ key: permissions.key })

      return removed.length
    })
  }

  /** Creates the two built-in roles if they are missing, without clobbering edits. */
  async ensureSystemRoles(permissionKeys: string[]): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      await tx
        .insert(roles)
        .values({
          key: 'admin',
          name: 'Administrator',
          description: 'Full access to every module.',
          isSystem: true,
        })
        .onConflictDoNothing({ target: roles.key })

      // Seed member + content_manager only on a fresh install (nothing besides
      // admin). After an admin deletes them, they stay gone across restarts.
      const existing = await tx.select({ key: roles.key }).from(roles)
      const extras = existing.filter((row) => row.key !== 'admin')
      if (extras.length === 0) {
        for (const role of [
          { key: 'member', name: 'Member', description: 'Standard access to the application.' },
          {
            key: 'content_manager',
            name: 'Content Manager',
            description: 'Mengelola katalog, konten website, dan review pemesanan.',
          },
        ]) {
          await tx
            .insert(roles)
            .values({ ...role, isSystem: true })
            .onConflictDoNothing({ target: roles.key })
        }
      }

      const [admin] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, 'admin')).limit(1)
      if (!admin || permissionKeys.length === 0) return

      await tx
        .insert(rolePermissions)
        .values(permissionKeys.map((key) => ({ roleId: admin.id, permissionKey: key })))
        .onConflictDoNothing()

      const contentManagerKeys = permissionKeys.filter((key) =>
        /^(packages|content|inquiries|settings)\./.test(key),
      )
      const [contentManager] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.key, 'content_manager'))
        .limit(1)
      if (contentManager && contentManagerKeys.length > 0) {
        await tx
          .insert(rolePermissions)
          .values(contentManagerKeys.map((key) => ({ roleId: contentManager.id, permissionKey: key })))
          .onConflictDoNothing()
      }
    })
  }

  async listRoles(cursor: string | undefined, limit: number | undefined): Promise<Page<Role>> {
    const pageSize = normalizeLimit(limit)
    const position = cursor ? decodeCursor(cursor) : undefined

    const pageFilter = position ? keysetCondition(roles.createdAt, roles.id, position) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db.select({ total: sql<number>`count(*)::int` }).from(roles),
      this.database.db
        .select({
          id: roles.id,
          key: roles.key,
          name: roles.name,
          description: roles.description,
          isSystem: roles.isSystem,
          createdAt: roles.createdAt,
        })
        .from(roles)
        .where(pageFilter)
        .orderBy(desc(roles.createdAt), desc(roles.id))
        .limit(pageSize + 1),
    ])

    const total = countRows[0]?.total ?? 0
    const page = buildPage(rows, pageSize, total)
    const ids = page.items.map((row) => row.id)

    const [grants, members] = await Promise.all([
      ids.length > 0
        ? this.database.db
            .select({ roleId: rolePermissions.roleId, permissionKey: rolePermissions.permissionKey })
            .from(rolePermissions)
            .where(inArray(rolePermissions.roleId, ids))
        : Promise.resolve([]),
      ids.length > 0
        ? this.database.db
            .select({ roleId: userRoles.roleId, memberCount: count(userRoles.userId) })
            .from(userRoles)
            .where(inArray(userRoles.roleId, ids))
            .groupBy(userRoles.roleId)
        : Promise.resolve([]),
    ])

    const permissionsByRole = new Map<string, string[]>()
    for (const grant of grants) {
      const list = permissionsByRole.get(grant.roleId) ?? []
      list.push(grant.permissionKey)
      permissionsByRole.set(grant.roleId, list)
    }

    const memberCountByRole = new Map(members.map((row) => [row.roleId, Number(row.memberCount)]))

    const items = page.items.map<Role>((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      isSystem: row.isSystem,
      permissions: permissionsByRole.get(row.id) ?? [],
      memberCount: memberCountByRole.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
    }))

    return { ...page, items }
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    const created = await this.database.db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, input.key)).limit(1)
      if (existing) throw new ConflictError(`Role "${input.key}" already exists`)

      const [role] = await tx
        .insert(roles)
        .values({
          key: input.key,
          name: input.name,
          description: input.description ?? null,
        })
        .returning({
          id: roles.id,
          key: roles.key,
          name: roles.name,
          description: roles.description,
          isSystem: roles.isSystem,
          createdAt: roles.createdAt,
        })

      if (!role) throw new Error('Failed to create role')

      if (input.permissions.length > 0) {
        await tx
          .insert(rolePermissions)
          .values(input.permissions.map((key) => ({ roleId: role.id, permissionKey: key })))
          .onConflictDoNothing()
      }

      return role
    })

    await this.audit.record({ action: 'rbac.role.create', module: 'rbac', targetType: 'role', targetId: created.id })

    return { ...created, createdAt: created.createdAt.toISOString(), permissions: input.permissions, memberCount: 0 }
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    await this.database.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: roles.id, isSystem: roles.isSystem })
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1)
      if (!existing) throw new NotFoundError('Role not found')

      const [role] = await tx
        .update(roles)
        .set({
          name: input.name,
          description: input.description === undefined ? undefined : input.description,
        })
        .where(eq(roles.id, id))
        .returning({
          id: roles.id,
          key: roles.key,
          name: roles.name,
          description: roles.description,
          isSystem: roles.isSystem,
          createdAt: roles.createdAt,
        })

      if (!role) throw new Error('Failed to update role')

      if (input.permissions) {
        // The admin role is the platform's break-glass account; redefining its
        // permissions is how a deployment locks itself out.
        if (role.key === 'admin') throw new ForbiddenError('The admin role always holds every permission')

        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
        if (input.permissions.length > 0) {
          await tx
            .insert(rolePermissions)
            .values(input.permissions.map((key) => ({ roleId: id, permissionKey: key })))
            .onConflictDoNothing()
        }
      }

      return role
    })

    await this.audit.record({ action: 'rbac.role.update', module: 'rbac', targetType: 'role', targetId: id })
    return this.roleWithRelations(id)
  }

  async deleteRole(id: string): Promise<void> {
    const [role] = await this.database.db
      .select({ key: roles.key, isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1)

    if (!role) throw new NotFoundError('Role not found')
    // Keep the break-glass administrator role; other system roles (member,
    // content_manager, …) may be removed by an administrator.
    if (role.key === 'admin') {
      throw new ForbiddenError('The admin role cannot be deleted')
    }

    await this.database.db.delete(roles).where(eq(roles.id, id))
    await this.audit.record({ action: 'rbac.role.delete', module: 'rbac', targetType: 'role', targetId: id })
  }

  async assignRole(userId: string, roleKey: string, assigned: boolean): Promise<void> {
    const [role] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, roleKey))
      .limit(1)

    if (!role) throw new NotFoundError(`Role "${roleKey}" not found`)

    if (assigned) {
      await this.database.db.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing()
    } else {
      await this.database.db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
    }

    await this.audit.record({
      action: assigned ? 'rbac.role.assign' : 'rbac.role.revoke',
      module: 'rbac',
      targetType: 'user',
      targetId: userId,
      metadata: { roleKey },
    })
    await this.events.emit(assigned ? 'rbac.role.assigned' : 'rbac.role.revoked', { userId, roleKey })
  }

  async listPermissions(): Promise<PermissionMeta[]> {
    const rows = await this.database.db
      .select({
        key: permissions.key,
        description: permissions.description,
        module: permissions.module,
      })
      .from(permissions)
      .orderBy(permissions.key)

    return rows
  }

  private async roleWithRelations(id: string): Promise<Role> {
    const [row] = await this.database.db
      .select({
        id: roles.id,
        key: roles.key,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
        createdAt: roles.createdAt,
      })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1)

    if (!row) throw new NotFoundError('Role not found')

    const grants = await this.database.db
      .select({ permissionKey: rolePermissions.permissionKey })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id))

    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      isSystem: row.isSystem,
      permissions: grants.map((grant) => grant.permissionKey),
      memberCount: 0,
      createdAt: row.createdAt.toISOString(),
    }
  }
}