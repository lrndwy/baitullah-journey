import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { rolePermissions, roles, sessions, userRoles, type DatabaseHandle } from '@app/core'
import { DATABASE } from '../tokens'

export interface ResolvedAccess {
  roles: string[]
  permissions: string[]
}

/**
 * Resolves a session into the flat role and permission lists the guards check,
 * in a single query. Combining the session validity check with the role join
 * keeps authenticated requests to one round trip.
 *
 * Resolved on every request, deliberately: a cached permission set means a
 * revoked role stays effective until the TTL expires, which is a security bug
 * rather than a performance win.
 *
 * ponytail: one joined query per authenticated request. Add a Redis
 * read-through cache with explicit invalidation on role writes when profiling
 * says it matters.
 */
@Injectable()
export class PermissionResolver {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  /** `undefined` when the session is revoked, expired or belongs to another user. */
  async resolveForSession(userId: string, sessionId: string): Promise<ResolvedAccess | undefined> {
    const rows = await this.database.db
      .select({
        roleKey: roles.key,
        permissionKey: rolePermissions.permissionKey,
      })
      .from(sessions)
      .leftJoin(userRoles, eq(userRoles.userId, sessions.userId))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )

    if (rows.length === 0) return undefined
    return toAccess(rows)
  }

  /** Roles and permissions for a user, without any session validity check. */
  async resolveForUser(userId: string): Promise<ResolvedAccess> {
    const rows = await this.database.db
      .select({ roleKey: roles.key, permissionKey: rolePermissions.permissionKey })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(eq(userRoles.userId, userId))

    return toAccess(rows)
  }
}

function toAccess(rows: { roleKey: string | null; permissionKey: string | null }[]): ResolvedAccess {
  const roleKeys = new Set<string>()
  const permissionKeys = new Set<string>()
  for (const row of rows) {
    if (row.roleKey) roleKeys.add(row.roleKey)
    if (row.permissionKey) permissionKeys.add(row.permissionKey)
  }
  return { roles: [...roleKeys], permissions: [...permissionKeys] }
}