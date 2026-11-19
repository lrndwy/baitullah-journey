import { describe, expect, it } from 'vitest'
import { isAccountLocked, lockRemainingMinutes, nextFailedLoginState } from './login-lock'

const NOW = new Date('2026-11-08T10:00:00Z')
const OPTIONS = { maxAttempts: 3, lockMinutes: 15, now: NOW }

describe('nextFailedLoginState', () => {
  it('counts attempts below the threshold without locking', () => {
    expect(nextFailedLoginState({ failedLoginAttempts: 0 }, OPTIONS)).toEqual({
      failedLoginAttempts: 1,
      lockedUntil: null,
      locked: false,
    })
    expect(nextFailedLoginState({ failedLoginAttempts: 1 }, OPTIONS)).toEqual({
      failedLoginAttempts: 2,
      lockedUntil: null,
      locked: false,
    })
  })

  it('locks exactly on the attempt that reaches the threshold', () => {
    expect(nextFailedLoginState({ failedLoginAttempts: 2 }, OPTIONS)).toEqual({
      failedLoginAttempts: 0,
      lockedUntil: new Date('2026-11-08T10:15:00Z'),
      locked: true,
    })
  })

  it('starts the streak from zero when the lock is applied', () => {
    const decision = nextFailedLoginState({ failedLoginAttempts: 2 }, OPTIONS)
    expect(decision.failedLoginAttempts).toBe(0)
  })

  it('does nothing when the mechanism is disabled', () => {
    expect(
      nextFailedLoginState({ failedLoginAttempts: 4 }, { ...OPTIONS, maxAttempts: 0 }),
    ).toEqual({ failedLoginAttempts: 4, lockedUntil: null, locked: false })
  })
})

describe('isAccountLocked', () => {
  it('is false without a lock', () => {
    expect(isAccountLocked(null, NOW)).toBe(false)
  })

  it('is true before the unlock instant', () => {
    expect(isAccountLocked(new Date('2026-11-08T10:05:00Z'), NOW)).toBe(true)
  })

  it('is false once the lock has expired', () => {
    expect(isAccountLocked(new Date('2026-11-08T09:59:59Z'), NOW)).toBe(false)
  })
})

describe('lockRemainingMinutes', () => {
  it('rounds up and never reports zero', () => {
    expect(lockRemainingMinutes(new Date('2026-11-08T10:01:30Z'), NOW)).toBe(2)
    expect(lockRemainingMinutes(new Date('2026-11-08T10:00:01Z'), NOW)).toBe(1)
  })
})