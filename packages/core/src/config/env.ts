import { z } from 'zod'

/** Accepts the several spellings a "true" flag arrives as in a shell. */
function boolFlag(value: string): boolean {
  return value === 'true' || value === '1' || value === 'yes'
}

/**
 * Every environment-dependent value in the platform is declared here and
 * validated once, at boot. A missing or malformed variable fails fast with a
 * readable message instead of surfacing as `undefined` at 3am in production.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3000/api/auth/google/callback'),

  /**
   * Local-only passwordless sign-in, for working without Google credentials
   * and for end-to-end tests. Refused outright when NODE_ENV is production.
   */
  AUTH_DEV_LOGIN: z.string().default('false').transform(boolFlag),

  WEB_ORIGIN: z.string().default('http://localhost:3001'),
  /** Extra browser origins allowed to call the API, comma separated. */
  CORS_ORIGINS: z.string().default(''),

  /**
   * Module switches. `MODULES_ENABLED` (allow-list) wins when non-empty,
   * otherwise every registered module is on except those in `MODULES_DISABLED`.
   * Core modules ignore both switches.
   */
  MODULES_ENABLED: z.string().default(''),
  MODULES_DISABLED: z.string().default(''),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  AUDIT_ENABLED: z.string().default('true').transform(boolFlag),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  /**
   * Password policy, applied in the application on every password write:
   * self-service reset, an authenticated change, and an administrator creating
   * an account. Named after MySQL's `validate_password.policy` levels because
   * the same ladder is what a DBA would expect: LOW = length only, MEDIUM =
   * mixed character classes, STRONG = MEDIUM + dictionary and sequence checks.
   */
  PASSWORD_POLICY: z.enum(['LOW', 'MEDIUM', 'STRONG']).default('STRONG'),
  /** Raised, never lowered below the level's own floor (see @app/contracts). */
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(128).default(12),
  /** Days before a password must be replaced. 0 disables rotation. */
  PASSWORD_MAX_AGE_DAYS: z.coerce.number().int().min(0).default(0),

  /**
   * Account lockout after consecutive failed sign-ins. 0 disables the lock,
   * leaving only the per-IP rate limiter in front of the login route.
   */
  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(0).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).default(15),

  /**
   * S3-compatible object storage. RustFS, MinIO and MaxIO all speak this API;
   * only the endpoint and path-style setting differ. Leave blank to run without
   * object storage — the file endpoints answer 503 instead of crashing at boot.
   */
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('app'),
  /** MinIO, RustFS and most self-hosted gateways need path-style addressing. */
  S3_FORCE_PATH_STYLE: z.string().default('true').transform(boolFlag),
  /**
   * The endpoint presigned URLs are signed against — normally the address the
   * *browser* can reach, while `S3_ENDPOINT` is the in-cluster address the API
   * uses. Without this, a presigned URL handed to a browser points at a
   * hostname that only resolves inside the container network.
   */
  S3_PUBLIC_ENDPOINT: z.string().optional(),
  /** Set when a CDN or reverse proxy serves objects publicly. */
  S3_PUBLIC_BASE_URL: z.string().optional(),

  /** `smtp://user:pass@host:587`. When unset, mail is logged instead of sent. */
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('no-reply@example.com'),

  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  PASSWORD_RESET_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  /**
   * Optional bootstrap administrator. When email + password are set and no
   * user with that email exists, the API creates an active `admin` on boot.
   * Existing users are never overwritten.
   */
  BOOTSTRAP_ADMIN_EMAIL: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().email().optional(),
  ),
  BOOTSTRAP_ADMIN_PASSWORD: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().min(8).optional(),
  ),
  BOOTSTRAP_ADMIN_NAME: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().min(1).max(120).optional(),
  ),
})

export type Env = z.infer<typeof EnvSchema>

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return parsed.data
}

let cached: Env | undefined

export function getEnv(): Env {
  cached ??= loadEnv()
  return cached
}

/** Test helper: forget the cached env so the next `getEnv()` re-reads. */
export function resetEnvCache(): void {
  cached = undefined
}

/**
 * Resolves whether a module is active. Core modules are always on, and any
 * module whose name is unlisted defaults to on — so a new module needs no
 * config to start working, only an entry in `MODULES_DISABLED` to be turned off.
 */
export function isModuleEnabled(name: string, core = false): boolean {
  if (core) return true
  const env = getEnv()
  const enabled = parseCsv(env.MODULES_ENABLED)
  const disabled = parseCsv(env.MODULES_DISABLED)
  if (enabled.length > 0) return enabled.includes(name)
  return !disabled.includes(name)
}

export function corsOrigins(): string[] {
  const env = getEnv()
  return [...new Set([env.WEB_ORIGIN, ...parseCsv(env.CORS_ORIGINS)])]
}

export const REFRESH_COOKIE_NAME = 'app_refresh'

/**
 * Refresh tokens travel in an httpOnly cookie so no script can read them, and
 * are scoped to the auth routes so they are not attached to every API call.
 * `sameSite: 'lax'` keeps the browser from sending it cross-site while still
 * surviving the OAuth redirect back from Google.
 */
export function refreshCookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: string
  maxAge: number
} {
  const env = getEnv()
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
  }
}

/** Dev sign-in must be impossible in production no matter how it is configured. */
export function devLoginEnabled(): boolean {
  const env = getEnv()
  return env.NODE_ENV !== 'production' && env.AUTH_DEV_LOGIN
}

export function googleOAuthConfigured(): boolean {
  const env = getEnv()
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

/**
 * Object storage is optional. Endpoints check this and answer 503 rather than
 * letting the process fail to boot on a deployment that never uploads files.
 */
export function objectStorageConfigured(): boolean {
  const env = getEnv()
  return Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)
}

/** Without SMTP, mail is written to the log — which is what local dev needs. */
export function smtpConfigured(): boolean {
  return Boolean(getEnv().SMTP_URL)
}

/** Both email and password must be present before bootstrap runs. */
export function bootstrapAdminConfigured(): boolean {
  const env = getEnv()
  return Boolean(env.BOOTSTRAP_ADMIN_EMAIL && env.BOOTSTRAP_ADMIN_PASSWORD)
}
