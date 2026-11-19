import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Every module owns a Postgres schema. Isolation is enforced by the database,
 * not by convention: dropping a module means dropping its schema, and no
 * module can reach into another module's tables by accident.
 */
export const authSchema = pgSchema('auth')
export const rbacSchema = pgSchema('rbac')
export const auditSchema = pgSchema('audit')

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

export const users = authSchema.table(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    name: text('name'),
    /** Provider picture (Google), used until the account uploads its own. */
    avatarUrl: text('avatar_url'),
    /**
     * Object key of an uploaded avatar. Lives on the identity table rather than
     * in a module because the session, the user directory and the profile page
     * all need it, and every one of them would otherwise have to ask another
     * module — which the module contract forbids.
     */
    avatarKey: text('avatar_key'),
    /** Null for accounts that only ever sign in through an OAuth provider. */
    passwordHash: text('password_hash'),
    /**
     * When the current password was written. `NULL` for OAuth-only accounts,
     * which have no password to rotate.
     */
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
    /**
     * Consecutive failed password sign-ins. Reset to 0 on success and when a
     * lock is applied, so the counter measures the current streak, not a
     * lifetime total.
     */
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    /** Set when the streak reaches LOGIN_MAX_FAILED_ATTEMPTS; NULL when unlocked. */
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    /** `active` | `suspended`. */
    status: text('status').notNull().default('active'),
    ...timestamps,
    /** Soft delete: audited records are never hard-deleted. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_created_at_idx').on(t.createdAt, t.id),
  ],
)

export const oauthAccounts = authSchema.table(
  'oauth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** `google`, `github`, ... */
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('oauth_accounts_provider_unique').on(t.provider, t.providerAccountId)],
)

export const sessions = authSchema.table(
  'sessions',
  {
    /** Also the session id embedded in issued access tokens. */
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Only the hash of the refresh token is ever persisted. */
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
)

export const passwordResetCodes = authSchema.table(
  'password_reset_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Only the hash of the emailed code is persisted. */
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    /** Wrong guesses so far; the code is invalidated at the configured limit. */
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('password_reset_codes_user_idx').on(t.userId),
    index('password_reset_codes_expires_idx').on(t.expiresAt),
  ],
)

export const roles = rbacSchema.table(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Stable identifier used in code, e.g. `admin`. */
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** System roles cannot be deleted or renamed. */
    isSystem: boolean('is_system').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('roles_key_unique').on(t.key)],
)

export const permissions = rbacSchema.table(
  'permissions',
  {
    /** Namespaced key, e.g. `users.read`. Mirrors the module manifest. */
    key: text('key').primaryKey(),
    description: text('description').notNull(),
    module: text('module').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('permissions_module_idx').on(t.module)],
)

export const rolePermissions = rbacSchema.table(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
)

export const userRoles = rbacSchema.table(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
)

/**
 * Append-only. There is intentionally no update or delete path in the
 * platform; retention is handled by a scheduled job, not by ad-hoc deletes.
 */
export const auditLogs = auditSchema.table(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    module: text('module').notNull(),
    action: text('action').notNull(),
    actorId: uuid('actor_id'),
    /** `user` | `system` | `api_key`. */
    actorType: text('actor_type').notNull().default('user'),
    targetType: text('target_type'),
    targetId: text('target_id'),
    /** `success` | `failure`. */
    status: text('status').notNull().default('success'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    metadata: jsonb('metadata'),
  },
  (t) => [
    index('audit_logs_occurred_at_idx').on(t.occurredAt),
    index('audit_logs_actor_idx').on(t.actorId, t.occurredAt),
    index('audit_logs_action_idx').on(t.module, t.action, t.occurredAt),
  ],
)

export const schema = {
  users,
  oauthAccounts,
  sessions,
  passwordResetCodes,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  auditLogs,
}