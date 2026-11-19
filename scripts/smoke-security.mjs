#!/usr/bin/env node
/**
 * Security smoke test against a *running* API.
 *
 * The unit tests cover the guards in isolation; this covers the assembled
 * container, which is the thing that actually ships. It exists because the
 * failure modes it checks are all configuration, not code:
 *
 *   - a guard that is wired into the module graph but never registered globally
 *   - `AUTH_DEV_LOGIN` leaking into production, handing anyone an admin session
 *   - helmet not applied, so the browser loses its content-type sniffing defence
 *   - a validation failure answered with a 500 and a stack trace
 *
 * Usage: node scripts/smoke-security.mjs [baseUrl] [--production]
 */
const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')
const production = process.argv.includes('--production')

let failures = 0

function report(ok, label, detail) {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

async function request(path, init = {}) {
  const headers = { ...init.headers }
  if (init.body !== undefined) headers['content-type'] = 'application/json'

  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...init,
    headers,
  })

  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }

  return { status: response.status, headers: response.headers, body }
}

/** Nest answers a POST with 201 by default, so both 2xx success codes count. */
function isSuccess(status) {
  return status >= 200 && status < 300
}

async function main() {
  console.log(`Security smoke against ${baseUrl}${production ? ' (production)' : ''}`)

  // ── The container is actually serving ──────────────────────────────────────
  const health = await request('/health')
  report(health.status === 200, 'GET /health is reachable', `status ${health.status}`)

  // ── Authentication is enforced, not merely declared ────────────────────────
  // These routes are protected by a *global* guard. If somebody registers the
  // guard as a provider but forgets APP_GUARD, every unit test still passes and
  // the whole admin API is open.
  for (const path of [
    '/api/users',
    '/api/_meta/navigation',
    '/api/audit/logs',
    '/api/rbac/roles',
  ]) {
    const response = await request(path)
    report(response.status === 401, `GET ${path} requires a session`, `status ${response.status}`)
  }

  // ── A forged token is rejected, not trusted ────────────────────────────────
  const forged = await request('/api/users', { headers: { authorization: 'Bearer not.a.token' } })
  report(forged.status === 401, 'A malformed bearer token is rejected', `status ${forged.status}`)

  // ── Deployment metadata stays public on purpose ────────────────────────────
  const modules = await request('/api/_meta/modules')
  report(modules.status === 200, 'GET /api/_meta/modules stays public', `status ${modules.status}`)

  // ── Passwordless / Google entry points stay gone ───────────────────────────
  const devLogin = await request('/api/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ email: 'attacker@example.com' }),
  })
  report(
    !isSuccess(devLogin.status),
    'POST /api/auth/dev-login is not available',
    `status ${devLogin.status}`,
  )

  const google = await request('/api/auth/google')
  report(
    !isSuccess(google.status),
    'GET /api/auth/google is not available',
    `status ${google.status}`,
  )

  void production

  // ── Bad input is a 400, and never leaks the stack ──────────────────────────
  const invalid = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: "'; DROP TABLE users; --", password: '' }),
  })
  report(invalid.status === 400, 'Malformed login input is a 400', `status ${invalid.status}`)
  report(
    invalid.body !== null &&
      typeof invalid.body === 'object' &&
      typeof invalid.body.error?.code === 'string',
    'Errors use the stable JSON envelope',
  )
  report(
    !JSON.stringify(invalid.body).includes('at '),
    'A validation failure carries no stack trace',
  )

  // ── helmet is applied ──────────────────────────────────────────────────────
  // `nosniff` is the one header whose absence turns an upload into stored XSS.
  report(
    health.headers.get('x-content-type-options') === 'nosniff',
    'helmet sets X-Content-Type-Options',
    `value ${health.headers.get('x-content-type-options')}`,
  )

  // ── The rate limiter is wired in ───────────────────────────────────────────
  // Not a load test: it asserts the guard runs at all, which is what breaks
  // when the Redis provider is replaced during a refactor.
  report(
    health.headers.get('x-ratelimit-limit') !== null,
    'The rate limiter runs before the route',
    `x-ratelimit-limit ${health.headers.get('x-ratelimit-limit')}`,
  )

  console.log(
    failures === 0 ? '\nAll security smoke checks passed.' : `\n${failures} check(s) failed.`,
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('Security smoke could not complete:', error)
  process.exit(1)
})
