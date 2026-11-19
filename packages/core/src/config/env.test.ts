import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { devLoginEnabled, loadEnv, resetEnvCache } from './env'
import { isModuleEnabled } from './env'

const REQUIRED = {
  DATABASE_URL: 'postgres://localhost/app',
  JWT_ACCESS_SECRET: 'access-secret-long-enough',
  JWT_REFRESH_SECRET: 'refresh-secret-long-enough',
}

/** `resetEnvCache` forgets the memoised env so each case reads its own values. */
function withEnv(overrides: Record<string, string> = {}): void {
  for (const [key, value] of Object.entries({ ...REQUIRED, ...overrides })) {
    process.env[key] = value
  }
  resetEnvCache()
}

function clearEnv(keys: string[]): void {
  for (const key of keys) delete process.env[key]
  resetEnvCache()
}

const MANAGED_KEYS = [
  ...Object.keys(REQUIRED),
  'MODULES_ENABLED',
  'MODULES_DISABLED',
  'AUTH_DEV_LOGIN',
  'NODE_ENV',
]

describe('loadEnv', () => {
  beforeEach(() => withEnv())
  afterEach(() => clearEnv(MANAGED_KEYS))

  it('applies defaults for optional values', () => {
    const env = loadEnv(process.env)

    expect(env.PORT).toBe(3000)
    expect(env.RATE_LIMIT_MAX).toBe(300)
    expect(env.AUDIT_ENABLED).toBe(true)
  })

  it('names every missing required variable instead of failing on the first', () => {
    expect(() => loadEnv({ NODE_ENV: 'development' })).toThrowError(
      /DATABASE_URL[\s\S]*JWT_ACCESS_SECRET[\s\S]*JWT_REFRESH_SECRET/,
    )
  })

  it('rejects a secret that is too short to be meaningful', () => {
    expect(() => loadEnv({ ...process.env, JWT_ACCESS_SECRET: 'short' })).toThrowError(
      /JWT_ACCESS_SECRET/,
    )
  })

  it('coerces numeric strings and rejects nonsense', () => {
    expect(loadEnv({ ...process.env, PORT: '8080' }).PORT).toBe(8080)
    expect(() => loadEnv({ ...process.env, PORT: 'not-a-port' })).toThrowError(/PORT/)
  })
})

describe('isModuleEnabled', () => {
  afterEach(() => clearEnv(MANAGED_KEYS))

  it('enables every module when neither switch is set', () => {
    withEnv()
    expect(isModuleEnabled('users')).toBe(true)
  })

  it('honours the deny-list', () => {
    withEnv({ MODULES_DISABLED: 'users, billing' })
    expect(isModuleEnabled('users')).toBe(false)
    expect(isModuleEnabled('billing')).toBe(false)
    expect(isModuleEnabled('reports')).toBe(true)
  })

  it('lets the allow-list win over the deny-list', () => {
    withEnv({ MODULES_ENABLED: 'users', MODULES_DISABLED: 'users' })
    expect(isModuleEnabled('users')).toBe(true)
    expect(isModuleEnabled('reports')).toBe(false)
  })

  it('ignores whitespace and empty entries in the lists', () => {
    withEnv({ MODULES_DISABLED: ' users , , billing ,' })
    expect(isModuleEnabled('users')).toBe(false)
    expect(isModuleEnabled('billing')).toBe(false)
    expect(isModuleEnabled('audit')).toBe(true)
  })

  it('never disables a core module', () => {
    withEnv({ MODULES_DISABLED: 'auth', MODULES_ENABLED: 'users' })
    expect(isModuleEnabled('auth', true)).toBe(true)
    expect(isModuleEnabled('users', true)).toBe(true)
  })
})

describe('devLoginEnabled', () => {
  afterEach(() => clearEnv(MANAGED_KEYS))

  it('is available outside production when switched on', () => {
    withEnv({ AUTH_DEV_LOGIN: 'true', NODE_ENV: 'development' })
    expect(devLoginEnabled()).toBe(true)
  })

  it('is refused in production even when switched on', () => {
    withEnv({ AUTH_DEV_LOGIN: 'true', NODE_ENV: 'production' })
    expect(devLoginEnabled()).toBe(false)
  })

  it('is off by default', () => {
    withEnv()
    expect(devLoginEnabled()).toBe(false)
  })
})