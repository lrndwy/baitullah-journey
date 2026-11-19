import { randomBytes } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gt, isNull } from 'drizzle-orm'
import {
  oauthAccounts,
  roles,
  sessions,
  userRoles,
  users,
  ForbiddenError,
  Mailer,
  NotFoundError,
  UnauthorizedError,
  devLoginEnabled,
  hashPassword,
  verifyPassword,
  type AuditRecorder,
  type DatabaseHandle,
  type Env,
  type EventBus,
  type Logger,
  type RedisClient,
} from '@app/core'
import { isPasswordExpired, type SessionUser } from '@app/contracts'
import { AUDIT_RECORDER, APP_ENV, DATABASE, EVENT_BUS, LOGGER, REDIS } from '../../platform/tokens'
import { assertPasswordPolicy } from '../../platform/security/password-policy'
import { PermissionResolver } from '../../platform/security/permission-resolver.service'
import { ImageUploadService } from '../../platform/storage/image-upload.service'
import { resolveAvatarUrl } from '../../platform/storage/avatar-url'
import { TokenService } from '../../platform/security/token.service'
import { PasswordResetService } from './password-reset.service'
import { isAccountLocked, lockRemainingMinutes, nextFailedLoginState } from './login-lock'

export interface OAuthProfile {
  provider: string
  providerAccountId: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface SessionMeta {
  ip?: string
  userAgent?: string
  requestId?: string
}

export interface IssuedSession {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  user: SessionUser
}

const HANDOFF_TTL_SECONDS = 120

/**
 * A syntactically valid scrypt hash of a value nobody knows, compared against
 * when no account matches. Without it, a missing account would return faster
 * than a wrong password and become an enumeration oracle by timing.
 */
const DUMMY_PASSWORD_HASH =
  'scrypt:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

/**
 * Owns the identity tables in the core schema: users, OAuth links, sessions.
 * Other modules read those tables directly; none of them may write to them.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(REDIS) private readonly redis: RedisClient,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(APP_ENV) private readonly env: Env,
    private readonly tokens: TokenService,
    private readonly permissions: PermissionResolver,
    private readonly passwordReset: PasswordResetService,
    private readonly mailer: Mailer,
    private readonly images: ImageUploadService,
  ) {}

  /**
   * An administrator triggers a reset for someone else. It issues the same
   * single-use code and emails it — the admin never chooses or sees the new
   * password, which is what keeps the action auditable and the account secure.
   */
  async sendPasswordResetFor(userId: string, actorId: string): Promise<{ devCode?: string }> {
    const [user] = await this.database.db
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)

    if (!user) throw new NotFoundError('User not found')

    const result = await this.issueResetEmail(user)

    await this.audit.record({
      action: 'auth.password.reset_requested_by_admin',
      module: 'auth',
      actorId,
      actorType: 'user',
      targetType: 'user',
      targetId: user.id,
    })

    return result
  }

  /**
   * Always resolves successfully, whether or not the address exists — the
   * response must not become an oracle for account enumeration.
   */
  async requestPasswordReset(email: string): Promise<{ devCode?: string }> {
    const normalized = email.trim().toLowerCase()
    const [user] = await this.database.db
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(and(eq(users.email, normalized), isNull(users.deletedAt)))
      .limit(1)

    if (!user || user.status !== 'active') return {}

    await this.audit.record({
      action: 'auth.password.reset_requested',
      module: 'auth',
      actorId: user.id,
      targetType: 'user',
      targetId: user.id,
    })

    return this.issueResetEmail(user)
  }

  /** Shared by the self-service and administrator paths. */
  private async issueResetEmail(user: {
    id: string
    email: string
    name: string | null
  }): Promise<{ devCode?: string }> {
    const { code, expiresAt } = await this.passwordReset.issue(user.id)
    const minutes = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60_000))

    await this.mailer.send({
      to: user.email,
      subject: 'Your password reset code',
      text: `Hello${user.name ? ` ${user.name}` : ''},

Your password reset code is: ${code}

It expires in ${minutes} minute(s). If you did not request this, you can ignore this email.`,
    })

    // Only ever surfaced when the platform is explicitly in local dev mode.
    return this.mailer.configured || !devLoginEnabled() ? {} : { devCode: code }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const [user] = await this.database.db
      .select({ id: users.id, name: users.name, status: users.status })
      .from(users)
      .where(and(eq(users.email, normalized), isNull(users.deletedAt)))
      .limit(1)

    if (!user) throw new UnauthorizedError('That code is invalid or has expired')

    // Before the code is consumed: a password that breaks the policy must not
    // burn a single-use code the user then has to request again.
    assertPasswordPolicy(this.env, newPassword, { email: normalized, name: user.name })

    await this.passwordReset.consume(user.id, code)
    await this.passwordReset.setPassword(user.id, await hashPassword(newPassword))

    await this.audit.record({
      action: 'auth.password.reset',
      module: 'auth',
      actorId: user.id,
      actorType: 'user',
      targetType: 'user',
      targetId: user.id,
    })
    await this.events.emit('auth.password.reset', { userId: user.id })

    this.logger.info({ userId: user.id }, 'password reset completed, all sessions revoked')
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const [user] = await this.database.db
      .select({ passwordHash: users.passwordHash, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedError('Current password is incorrect')
    }

    assertPasswordPolicy(this.env, newPassword, { email: user.email, name: user.name })

    await this.passwordReset.setPassword(userId, await hashPassword(newPassword))

    await this.audit.record({
      action: 'auth.password.changed',
      module: 'auth',
      actorId: userId,
      actorType: 'user',
      targetType: 'user',
      targetId: userId,
    })
    await this.events.emit('auth.password.changed', { userId })
  }

  async loginWithOAuth(profile: OAuthProfile, meta: SessionMeta): Promise<IssuedSession> {
    const user = await this.findOrCreateOAuthUser(profile)
    return this.createSession(user.id, user.email, meta)
  }

  /** Local-only sign-in path; the caller has already enforced `devLoginEnabled()`. */
  async loginByEmail(email: string, meta: SessionMeta): Promise<IssuedSession> {
    const normalized = email.trim().toLowerCase()
    const existing = await this.database.db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1)

    const user = existing[0] ?? (await this.createUser({ email: normalized, emailVerified: true }))
    if (user.status !== 'active') throw new ForbiddenError('Account is suspended')

    return this.createSession(user.id, user.email, meta)
  }

  /**
   * Email + password sign-in. Exists so that resetting a password (and an
   * administrator creating a user with one) actually leads somewhere.
   *
   * A wrong password and an unknown address produce the same error, and the
   * hash comparison happens even when the account is missing, so response time
   * does not reveal which addresses exist.
   */
  async loginWithPassword(email: string, password: string, meta: SessionMeta): Promise<IssuedSession> {
    const normalized = email.trim().toLowerCase()
    const [user] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
        passwordHash: users.passwordHash,
        passwordChangedAt: users.passwordChangedAt,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(and(eq(users.email, normalized), isNull(users.deletedAt)))
      .limit(1)

    const now = new Date()
    const lockedUntil = user?.lockedUntil ?? null
    if (lockedUntil && isAccountLocked(lockedUntil, now)) {
      throw new ForbiddenError(
        `This account is locked after repeated failed sign-ins. Try again in ${lockRemainingMinutes(lockedUntil, now)} minute(s).`,
      )
    }

    const stored = user?.passwordHash ?? DUMMY_PASSWORD_HASH
    const ok = await verifyPassword(password, stored)
    const invalid = new UnauthorizedError('Email or password is incorrect')

    if (!user || !user.passwordHash || !ok) {
      // Only an account that *has* a password moves the counter. An OAuth-only
      // account has nothing to guess, and counting a stranger's typing against
      // it would lock a user who never used a password here.
      if (user?.passwordHash) await this.recordFailedLogin(user, meta)
      throw invalid
    }

    if (user.status !== 'active') throw new ForbiddenError('Account is suspended')

    if (isPasswordExpired(user.passwordChangedAt, this.env.PASSWORD_MAX_AGE_DAYS, now)) {
      throw new ForbiddenError(
        'Your password has expired. Use "Forgot password" to choose a new one.',
      )
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.database.db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, user.id))
    }

    return this.createSession(user.id, user.email, meta)
  }

  /**
   * Counts one failed password attempt and locks the account on the last one.
   *
   * The streak is reset when the lock is applied rather than left at the
   * threshold: the lock itself is the penalty, and a user returning after it
   * expires should start from zero instead of being one typo away from the next
   * lock. `LOGIN_MAX_FAILED_ATTEMPTS=0` turns the whole mechanism off.
   */
  private async recordFailedLogin(
    user: { id: string; failedLoginAttempts: number },
    meta: SessionMeta,
  ): Promise<void> {
    const decision = nextFailedLoginState(user, {
      maxAttempts: this.env.LOGIN_MAX_FAILED_ATTEMPTS,
      lockMinutes: this.env.LOGIN_LOCK_MINUTES,
      now: new Date(),
    })

    // Nothing to write: the mechanism is disabled (max attempts 0).
    if (!decision.locked && decision.failedLoginAttempts === user.failedLoginAttempts) return

    await this.database.db
      .update(users)
      .set({
        failedLoginAttempts: decision.failedLoginAttempts,
        lockedUntil: decision.lockedUntil,
      })
      .where(eq(users.id, user.id))

    const lockedUntil = decision.lockedUntil
    if (!decision.locked || !lockedUntil) return

    this.logger.warn(
      { userId: user.id, minutes: this.env.LOGIN_LOCK_MINUTES },
      'account locked after repeated failed sign-ins',
    )

    await this.audit.record({
      action: 'auth.login.locked',
      module: 'auth',
      actorId: user.id,
      actorType: 'user',
      targetType: 'user',
      targetId: user.id,
      status: 'failure',
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: {
        failedAttempts: this.env.LOGIN_MAX_FAILED_ATTEMPTS,
        lockedUntil: lockedUntil.toISOString(),
      },
    })
    await this.events.emit('auth.login.locked', {
      userId: user.id,
      lockedUntil: lockedUntil.toISOString(),
    })
  }

  async createSession(userId: string, email: string, meta: SessionMeta): Promise<IssuedSession> {
    const refreshToken = this.tokens.generateRefreshToken()
    const [session] = await this.database.db
      .insert(sessions)
      .values({
        userId,
        refreshTokenHash: this.tokens.hashRefreshToken(refreshToken),
        expiresAt: this.tokens.refreshExpiryFromNow(),
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
      .returning({ id: sessions.id })

    if (!session) throw new Error('Failed to create session')

    const access = await this.tokens.issueAccessToken(userId, email, session.id)
    const user = await this.sessionUser(userId)

    await this.audit.record({
      action: 'auth.login',
      module: 'auth',
      actorId: userId,
      actorType: 'user',
      targetType: 'session',
      targetId: session.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    })
    await this.events.emit('auth.login', { userId, sessionId: session.id })

    return { accessToken: access.token, refreshToken, expiresAt: access.expiresAt, user }
  }

  /**
   * Rotates the refresh token on every use: the presented token is replaced by
   * a fresh one, so a stolen token is useful only until the legitimate client
   * refreshes — after which the thief's copy is dead.
   */
  async refresh(refreshToken: string, meta: SessionMeta): Promise<IssuedSession> {
    const hash = this.tokens.hashRefreshToken(refreshToken)
    const [session] = await this.database.db
      .select({ id: sessions.id, userId: sessions.userId })
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, hash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (!session) throw new UnauthorizedError('Invalid or expired refresh token')

    const [user] = await this.database.db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user || user.status !== 'active') {
      await this.revokeSession(session.id)
      throw new UnauthorizedError('Account is no longer active')
    }

    const nextRefreshToken = this.tokens.generateRefreshToken()
    await this.database.db
      .update(sessions)
      .set({
        refreshTokenHash: this.tokens.hashRefreshToken(nextRefreshToken),
        ip: meta.ip ?? undefined,
        userAgent: meta.userAgent ?? undefined,
      })
      .where(eq(sessions.id, session.id))

    const access = await this.tokens.issueAccessToken(user.id, user.email, session.id)
    const sessionUser = await this.sessionUser(user.id)

    return {
      accessToken: access.token,
      refreshToken: nextRefreshToken,
      expiresAt: access.expiresAt,
      user: sessionUser,
    }
  }

  async logout(sessionId: string, meta: SessionMeta): Promise<void> {
    const [session] = await this.database.db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)

    await this.revokeSession(sessionId)

    if (session) {
      await this.audit.record({
        action: 'auth.logout',
        module: 'auth',
        actorId: session.userId,
        actorType: 'user',
        targetType: 'session',
        targetId: sessionId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      })
      await this.events.emit('auth.logout', { userId: session.userId, sessionId })
    }
  }

  async sessionUser(userId: string): Promise<SessionUser> {
    const [user] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        avatarKey: users.avatarKey,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) throw new UnauthorizedError('Account no longer exists')

    const access = await this.permissions.resolveForUser(userId)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: await resolveAvatarUrl(this.images, user.avatarKey, user.avatarUrl),
      roles: access.roles,
      permissions: access.permissions,
    }
  }

  async listSessions(userId: string): Promise<
    { id: string; ip: string | null; userAgent: string | null; createdAt: string; expiresAt: string }[]
  > {
    const rows = await this.database.db
      .select({
        id: sessions.id,
        ip: sessions.ip,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .limit(50)

    return rows.map((row) => ({
      id: row.id,
      ip: row.ip,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    }))
  }

  /**
   * The OAuth callback hands the browser a short-lived code rather than a
   * token: tokens in a redirect URL end up in history, logs and referrers.
   * The profile is parked in Redis and exchanged once, from the web app.
   */
  async createHandoff(profile: OAuthProfile): Promise<string> {
    const code = randomBytes(24).toString('base64url')
    await this.redis.set(`auth:handoff:${code}`, JSON.stringify(profile), 'EX', HANDOFF_TTL_SECONDS)
    return code
  }

  async consumeHandoff(code: string): Promise<OAuthProfile | undefined> {
    const raw = await this.redis.getdel(`auth:handoff:${code}`)
    if (!raw) return undefined
    return JSON.parse(raw) as OAuthProfile
  }

  private async revokeSession(sessionId: string): Promise<void> {
    await this.database.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
  }

  private async findOrCreateOAuthUser(profile: OAuthProfile): Promise<{
    id: string
    email: string
    status: string
  }> {
    const linked = await this.database.db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(
        and(
          eq(oauthAccounts.provider, profile.provider),
          eq(oauthAccounts.providerAccountId, profile.providerAccountId),
        ),
      )
      .limit(1)

    if (linked[0]) {
      if (linked[0].status !== 'active') throw new ForbiddenError('Account is suspended')
      return linked[0]
    }

    const byEmail = await this.database.db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.email, profile.email.toLowerCase()))
      .limit(1)

    const user = byEmail[0] ?? (await this.createUser({
      email: profile.email.toLowerCase(),
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      emailVerified: true,
    }))

    if (user.status !== 'active') throw new ForbiddenError('Account is suspended')

    await this.database.db
      .insert(oauthAccounts)
      .values({
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      })
      .onConflictDoNothing()

    this.logger.info({ userId: user.id, provider: profile.provider }, 'linked oauth account')
    return user
  }

  /**
   * The first human to ever sign in becomes the administrator; everyone after
   * that joins as a member. Without this, a fresh deployment would have no way
   * to reach the admin dashboard.
   */
  private async createUser(input: {
    email: string
    name?: string
    avatarUrl?: string
    emailVerified: boolean
    passwordHash?: string
  }): Promise<{ id: string; email: string; status: string }> {
    return this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email,
          name: input.name ?? null,
          avatarUrl: input.avatarUrl ?? null,
          emailVerified: input.emailVerified,
          passwordHash: input.passwordHash ?? null,
        })
        .returning({ id: users.id, email: users.email, status: users.status })

      if (!created) throw new Error('Failed to create user')

      const adminRole = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, 'admin')).limit(1)
      if (adminRole[0]) {
        const existingAdmin = await tx
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(eq(userRoles.roleId, adminRole[0].id))
          .limit(1)

        const roleKey = existingAdmin.length === 0 ? 'admin' : 'member'
        const [role] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, roleKey)).limit(1)
        if (role) {
          await tx.insert(userRoles).values({ userId: created.id, roleId: role.id }).onConflictDoNothing()
        }
      }

      return created
    })
  }
}