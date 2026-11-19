/**
 * The arithmetic of account lockout.
 *
 * It lives in its own file because it is the part worth testing: the service
 * around it is a database read, an update and an audit record, while the
 * decision — count, threshold, streak reset, unlock instant — is pure and has
 * no business being buried in a `WHERE` clause.
 *
 * The semantics match what a DBA expects from MySQL's
 * `FAILED_LOGIN_ATTEMPTS` / `PASSWORD_LOCK_TIME`: the lock applies on the
 * attempt that reaches the threshold, and the streak starts from zero once the
 * lock expires (otherwise a returning user would be one typo from the next
 * lock).
 */

export interface FailedLoginState {
  /** Consecutive failed attempts since the last success or lock. */
  failedLoginAttempts: number
  /** `null` when the account is not locked. */
  lockedUntil: Date | null
}

export interface FailedLoginDecision extends FailedLoginState {
  /** True when *this* attempt is the one that applied the lock. */
  locked: boolean
}

export function isAccountLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime()
}

/** Whole minutes a locked user still has to wait, never reported as 0. */
export function lockRemainingMinutes(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000))
}

/**
 * `maxAttempts <= 0` disables the mechanism: the state is returned unchanged and
 * `locked` stays false, so the caller performs no write at all.
 */
export function nextFailedLoginState(
  current: { failedLoginAttempts: number },
  options: { maxAttempts: number; lockMinutes: number; now: Date },
): FailedLoginDecision {
  const { maxAttempts, lockMinutes, now } = options

  if (maxAttempts <= 0) {
    return { failedLoginAttempts: current.failedLoginAttempts, lockedUntil: null, locked: false }
  }

  const attempts = current.failedLoginAttempts + 1
  if (attempts < maxAttempts) {
    return { failedLoginAttempts: attempts, lockedUntil: null, locked: false }
  }

  return {
    failedLoginAttempts: 0,
    lockedUntil: new Date(now.getTime() + lockMinutes * 60_000),
    locked: true,
  }
}