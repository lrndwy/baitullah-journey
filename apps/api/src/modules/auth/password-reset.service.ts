import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gt, isNull } from 'drizzle-orm'
import {
  passwordResetCodes,
  sessions,
  users,
  BadRequestError,
  type DatabaseHandle,
  type Env,
} from '@app/core'
import { APP_ENV, DATABASE } from '../../platform/tokens'

export interface IssuedResetCode {
  code: string
  expiresAt: Date
}

/**
 * Issues and verifies the six-digit codes used for password reset.
 *
 * Codes are stored as a hash, are single-use, expire, and are invalidated after
 * a bounded number of wrong guesses — so an attacker cannot brute-force a
 * 10^6 space by simply retrying.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  async issue(userId: string): Promise<IssuedResetCode> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(Date.now() + this.env.PASSWORD_RESET_TTL_SECONDS * 1000)

    // Supersede any outstanding code: two live codes is one too many.
    await this.database.db
      .update(passwordResetCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(passwordResetCodes.userId, userId), isNull(passwordResetCodes.consumedAt)))

    await this.database.db.insert(passwordResetCodes).values({
      userId,
      codeHash: hash(code),
      expiresAt,
    })

    return { code, expiresAt }
  }

  /**
   * Verifies and consumes a code. Throws on any failure with a single generic
   * message — telling the caller *which* part was wrong helps an attacker more
   * than it helps a legitimate user.
   */
  async consume(userId: string, code: string): Promise<void> {
    const [record] = await this.database.db
      .select({
        id: passwordResetCodes.id,
        codeHash: passwordResetCodes.codeHash,
        attempts: passwordResetCodes.attempts,
      })
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          isNull(passwordResetCodes.consumedAt),
          gt(passwordResetCodes.expiresAt, new Date()),
        ),
      )
      .limit(1)

    const invalid = new BadRequestError('That code is invalid or has expired')

    if (!record) throw invalid

    if (record.attempts >= this.env.PASSWORD_RESET_MAX_ATTEMPTS) {
      await this.invalidateAll(userId)
      throw invalid
    }

    if (!matches(code, record.codeHash)) {
      await this.database.db
        .update(passwordResetCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(passwordResetCodes.id, record.id))
      throw invalid
    }

    await this.database.db
      .update(passwordResetCodes)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetCodes.id, record.id))
  }

  /** Called after a successful reset: no code stays usable afterwards. */
  async invalidateAll(userId: string): Promise<void> {
    await this.database.db
      .update(passwordResetCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(passwordResetCodes.userId, userId), isNull(passwordResetCodes.consumedAt)))
  }

  /**
   * Sets a new password and revokes every session. If the reason for the reset
   * is a compromised account, the attacker's session must stop working.
   *
   * `password_changed_at` is what the rotation rule reads later, so it is
   * written in the same statement as the hash — a password must never look
   * older than it is.
   */
  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId))

      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    })
  }
}

function hash(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function matches(code: string, storedHash: string): boolean {
  const provided = Buffer.from(hash(code), 'hex')
  const expected = Buffer.from(storedHash, 'hex')
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}