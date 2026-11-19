import { Inject, Injectable } from '@nestjs/common'
import {
  ConflictError,
  NotFoundError,
  auditLogs,
  buildPage,
  decodeCursor,
  hashPassword,
  keysetCondition,
  normalizeLimit,
  oauthAccounts,
  roles,
  sessions,
  userRoles,
  users,
  type DatabaseHandle,
  type Env,
  type EventBus,
  type Page,
} from '@app/core'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput, User } from '@app/contracts'
import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { APP_ENV, DATABASE, EVENT_BUS } from '../../platform/tokens'
import { assertPasswordPolicy } from '../../platform/security/password-policy'
import { ImageUploadService } from '../../platform/storage/image-upload.service'
import { resolveAvatarUrl } from '../../platform/storage/avatar-url'

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    @Inject(APP_ENV) private readonly env: Env,
    private readonly images: ImageUploadService,
  ) {}

  async list(query: ListUsersQuery): Promise<Page<User>> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined

    const base: SQL[] = []
    if (query.deleted === 'exclude') base.push(isNull(users.deletedAt))
    if (query.deleted === 'only') base.push(isNotNull(users.deletedAt))
    if (query.status) base.push(eq(users.status, query.status))
    if (query.search) {
      const pattern = `%${query.search}%`
      const search = or(ilike(users.email, pattern), ilike(users.name, pattern))
      if (search) base.push(search)
    }

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(users.createdAt, users.id, position)
      if (keyset) filters.push(keyset)
    }

    const whereBase = base.length > 0 ? and(...base) : undefined
    const wherePage = filters.length > 0 ? and(...filters) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(users)
        .where(whereBase),
      this.database.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
          avatarKey: users.avatarKey,
          status: users.status,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(wherePage)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(pageSize + 1),
    ])

    const total = countRows[0]?.total ?? 0
    const page = buildPage(rows, pageSize, total)
    const roleMap = await this.rolesForUsers(page.items.map((row) => row.id))

    return {
      ...page,
      items: await Promise.all(page.items.map((row) => this.toUser(row, roleMap.get(row.id) ?? []))),
    }
  }

  async findById(id: string, options: { allowDeleted?: boolean } = {}): Promise<User> {
    const [row] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        avatarKey: users.avatarKey,
        status: users.status,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(
        options.allowDeleted
          ? eq(users.id, id)
          : and(eq(users.id, id), isNull(users.deletedAt)),
      )
      .limit(1)

    if (!row) throw new NotFoundError('User not found')

    const roleMap = await this.rolesForUsers([row.id])
    return this.toUser(row, roleMap.get(row.id) ?? [])
  }

  async create(input: CreateUserInput): Promise<User> {
    const [existing] = await this.database.db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)

    if (existing && !existing.deletedAt) {
      throw new ConflictError('A user with that email already exists')
    }
    if (existing?.deletedAt) {
      throw new ConflictError(
        'A soft-deleted account still uses that email. Restore it or permanently delete it first.',
      )
    }

    // An administrator sets this password, so the account's own email and name
    // are the identity the policy refuses to see inside it.
    if (input.password) {
      assertPasswordPolicy(this.env, input.password, { email: input.email, name: input.name })
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null

    const created = await this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          name: input.name ?? null,
          passwordHash,
          passwordChangedAt: passwordHash ? new Date() : null,
          emailVerified: false,
        })
        .returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })

      if (!user) throw new Error('Failed to create user')

      await this.assignRoles(tx, user.id, input.roleKeys)
      return user
    })

    await this.events.emit('users.created', { userId: created.id, email: created.email })
    return this.findById(created.id)
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    await this.findById(id)

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name: input.name === undefined ? undefined : input.name,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))

      if (input.roleKeys) {
        await tx.delete(userRoles).where(eq(userRoles.userId, id))
        await this.assignRoles(tx, id, input.roleKeys)
      }
    })

    await this.events.emit('users.updated', { userId: id })
    return this.findById(id)
  }

  /** Soft delete — row stays, hidden from default lists, sessions revoked. */
  async remove(id: string): Promise<void> {
    await this.findById(id)

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ deletedAt: new Date(), status: 'suspended', updatedAt: new Date() })
        .where(eq(users.id, id))

      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)))
    })

    await this.database.db.delete(oauthAccounts).where(eq(oauthAccounts.userId, id))
    await this.events.emit('users.deleted', { userId: id })
  }

  async removeMany(ids: string[]): Promise<number> {
    const removed = await this.database.db.transaction(async (tx) => {
      const affected = await tx
        .update(users)
        .set({ deletedAt: new Date(), status: 'suspended', updatedAt: new Date() })
        .where(and(inArray(users.id, ids), isNull(users.deletedAt)))
        .returning({ id: users.id })

      if (affected.length > 0) {
        const deletedIds = affected.map((row) => row.id)
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(inArray(sessions.userId, deletedIds), isNull(sessions.revokedAt)))
        await tx.delete(oauthAccounts).where(inArray(oauthAccounts.userId, deletedIds))
        await tx.delete(userRoles).where(inArray(userRoles.userId, deletedIds))
      }

      return affected.length
    })

    for (const id of ids) await this.events.emit('users.deleted', { userId: id })
    return removed
  }

  /** Restore a soft-deleted account. */
  async restore(id: string): Promise<User> {
    const user = await this.findById(id, { allowDeleted: true })
    if (!user.deletedAt) return user

    await this.database.db
      .update(users)
      .set({ deletedAt: null, status: 'active', updatedAt: new Date() })
      .where(eq(users.id, id))

    await this.events.emit('users.restored', { userId: id })
    return this.findById(id)
  }

  /**
   * Hard delete — row is removed permanently. Cascades cover auth children;
   * profile and audit actor refs are cleaned explicitly.
   */
  async purge(id: string): Promise<void> {
    const user = await this.findById(id, { allowDeleted: true })

    await this.database.db.transaction(async (tx) => {
      await tx.execute(sql`delete from profile.user_profiles where user_id = ${id}::uuid`)
      await tx
        .update(auditLogs)
        .set({ actorId: null })
        .where(eq(auditLogs.actorId, id))
      await tx.delete(oauthAccounts).where(eq(oauthAccounts.userId, id))
      await tx.delete(userRoles).where(eq(userRoles.userId, id))
      await tx.delete(users).where(eq(users.id, id))
    })

    await this.events.emit('users.purged', { userId: id, email: user.email })
  }

  private async toUser(
    row: {
      id: string
      email: string
      name: string | null
      avatarUrl: string | null
      avatarKey: string | null
      status: string
      createdAt: Date
      deletedAt: Date | null
    },
    roleKeys: string[],
  ): Promise<User> {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: await resolveAvatarUrl(this.images, row.avatarKey, row.avatarUrl),
      status: row.status as User['status'],
      roles: roleKeys,
      createdAt: row.createdAt.toISOString(),
      deletedAt: row.deletedAt?.toISOString() ?? null,
    }
  }

  private async assignRoles(
    tx: Pick<DatabaseHandle['db'], 'select' | 'insert'>,
    userId: string,
    roleKeys: string[],
  ): Promise<void> {
    if (roleKeys.length === 0) return

    const found = await tx
      .select({ id: roles.id, key: roles.key })
      .from(roles)
      .where(inArray(roles.key, roleKeys))

    const missing = roleKeys.filter((key) => !found.some((role) => role.key === key))
    if (missing.length > 0) throw new NotFoundError(`Unknown roles: ${missing.join(', ')}`)

    await tx
      .insert(userRoles)
      .values(found.map((role) => ({ userId, roleId: role.id })))
      .onConflictDoNothing()
  }

  private async rolesForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    if (userIds.length === 0) return new Map()

    const rows = await this.database.db
      .select({ userId: userRoles.userId, roleKey: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(inArray(userRoles.userId, userIds))

    const map = new Map<string, string[]>()
    for (const row of rows) {
      const list = map.get(row.userId) ?? []
      list.push(row.roleKey)
      map.set(row.userId, list)
    }
    return map
  }
}
