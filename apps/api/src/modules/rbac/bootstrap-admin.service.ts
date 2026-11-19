import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common'
import {
  bootstrapAdminConfigured,
  createLogger,
  getEnv,
  hashPassword,
  roles,
  userRoles,
  users,
  type DatabaseHandle,
} from '@app/core'
import { and, eq, isNull } from 'drizzle-orm'
import { DATABASE } from '../../platform/tokens'
import { assertPasswordPolicy } from '../../platform/security/password-policy'

const logger = createLogger('bootstrap-admin')

/**
 * Creates the env-configured administrator once. Never overwrites an existing
 * account — password rotation stays an explicit admin action.
 */
@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!bootstrapAdminConfigured()) return

    const env = getEnv()
    const email = env.BOOTSTRAP_ADMIN_EMAIL!.toLowerCase()
    const password = env.BOOTSTRAP_ADMIN_PASSWORD!
    const name = env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrator'

    // Fail loudly at boot rather than silently seeding an account that the
    // application's own policy would have refused to create through the API.
    assertPasswordPolicy(env, password, { email, name })

    const [existing] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1)

    if (existing) {
      logger.info({ email }, 'bootstrap admin skipped — user already exists')
      return
    }

    const passwordHash = await hashPassword(password)

    await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          name,
          emailVerified: true,
          passwordHash,
          status: 'active',
        })
        .returning({ id: users.id })

      if (!created) throw new Error('Failed to bootstrap admin user')

      const [adminRole] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, 'admin')).limit(1)
      if (!adminRole) {
        logger.warn({ email }, 'bootstrap admin created without role — admin role missing')
        return
      }

      await tx.insert(userRoles).values({ userId: created.id, roleId: adminRole.id }).onConflictDoNothing()
    })

    logger.info({ email }, 'bootstrap admin created')
  }
}
