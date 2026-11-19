'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { NavigationItem, SessionUser, TokenResponse } from '@app/contracts'
import { apiFetch, clearSession, refreshSession, tokenStore } from './api'

interface SessionState {
  user: SessionUser | null
  status: 'loading' | 'authenticated' | 'anonymous'
}

interface SessionContextValue extends SessionState {
  navigation: NavigationItem[]
  can: (permission: string) => boolean
  adopt: (session: TokenResponse) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /**
   * Re-reads the signed-in user. The sidebar avatar comes from this object, so
   * a change made on the profile page would otherwise not appear until a reload.
   */
  refreshUser: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, setState] = useState<SessionState>({ user: null, status: 'loading' })
  const [navigation, setNavigation] = useState<NavigationItem[]>([])

  const adopt = useCallback((session: TokenResponse) => {
    tokenStore.accessToken = session.accessToken
    tokenStore.expiresAt = session.expiresAt
    setState({ user: session.user, status: 'authenticated' })
  }, [])

  // On first paint the access token is gone (it only ever lived in memory), so
  // restore the session from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const session = await refreshSession()
      if (cancelled) return
      setState(
        session
          ? { user: session.user, status: 'authenticated' }
          : { user: null, status: 'anonymous' },
      )
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // The sidebar is produced by the API from the modules that are actually
  // installed and the permissions this user actually holds.
  useEffect(() => {
    if (state.status !== 'authenticated') {
      setNavigation([])
      return
    }

    let cancelled = false
    void apiFetch<{ items: NavigationItem[] }>('/api/_meta/navigation')
      .then((result) => {
        if (!cancelled) setNavigation(result.items)
      })
      .catch(() => {
        if (!cancelled) setNavigation([])
      })

    return () => {
      cancelled = true
    }
    // Keyed on status alone — the navigation does not change when the user
    // object does, and re-fetching it on every avatar update is waste.
  }, [state.status])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await apiFetch<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      adopt(session)
    },
    [adopt],
  )

  const signOut = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    clearSession()
    setState({ user: null, status: 'anonymous' })
  }, [])

  const can = useCallback(
    (permission: string) => state.user?.permissions.includes(permission) ?? false,
    [state.user],
  )

  const refreshUser = useCallback(async () => {
    try {
      const { user: fresh } = await apiFetch<{ user: SessionUser }>('/api/auth/me')
      setState((current) =>
        current.status === 'authenticated' ? { ...current, user: fresh } : current,
      )
    } catch {
      // A failed refresh leaves the last known user in place; the next 401 will
      // send them to sign-in if the session really is gone.
    }
  }, [])

  return (
    <SessionContext.Provider
      value={{ ...state, navigation, can, adopt, signIn, signOut, refreshUser }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside <SessionProvider>')
  return context
}
