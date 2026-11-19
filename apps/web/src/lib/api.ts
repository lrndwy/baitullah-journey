import type { TokenResponse } from '@app/contracts'
import { apiPublicUrl } from './runtime-config'

/**
 * The access token lives in memory only — never in localStorage or a
 * readable cookie, where any injected script could exfiltrate it. A page
 * reload simply re-runs the refresh flow against the httpOnly cookie.
 *
 * `refreshInFlight` de-duplicates concurrent refreshes: a dashboard firing
 * eight requests at once must trigger one rotation, not eight.
 */
export const tokenStore: {
  accessToken: string | null
  expiresAt: string | null
  refreshInFlight: Promise<TokenResponse | null> | null
} = {
  accessToken: null,
  expiresAt: null,
  refreshInFlight: null,
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown }
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent
 * callers share one in-flight rotation, because a refresh token is single-use
 * and two parallel rotations would invalidate each other.
 */
export async function refreshSession(): Promise<TokenResponse | null> {
  if (tokenStore.refreshInFlight) return tokenStore.refreshInFlight

  tokenStore.refreshInFlight = (async () => {
    try {
      const response = await fetch(`${apiPublicUrl()}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) return null

      const session = (await response.json()) as TokenResponse
      tokenStore.accessToken = session.accessToken
      tokenStore.expiresAt = session.expiresAt
      return session
    } catch {
      return null
    } finally {
      tokenStore.refreshInFlight = null
    }
  })()

  return tokenStore.refreshInFlight
}

export function clearSession(): void {
  tokenStore.accessToken = null
  tokenStore.expiresAt = null
}

/**
 * Authenticated fetch. A 401 triggers exactly one transparent refresh and
 * retry, so pages never hand-roll token expiry handling.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = (token: string | null) =>
    fetch(`${apiPublicUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })

  let response = await send(tokenStore.accessToken)

  if (response.status === 401) {
    const refreshed = await refreshSession()
    if (refreshed) response = await send(refreshed.accessToken)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorEnvelope
    throw new ApiError(
      response.status,
      body.error?.code ?? `http_${response.status}`,
      body.error?.message ?? response.statusText,
      body.error?.details,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
