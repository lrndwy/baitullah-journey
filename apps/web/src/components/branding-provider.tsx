'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Branding } from '@/lib/branding'

const BrandingContext = createContext<Branding | null>(null)

/**
 * Branding is resolved once, on the server, and handed down. Client components
 * read it from here instead of each fetching `/api/settings` themselves.
 */
export function BrandingProvider({
  branding,
  children,
}: {
  branding: Branding
  children: ReactNode
}) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}

export function useBranding(): Branding {
  const branding = useContext(BrandingContext)
  if (!branding) throw new Error('useBranding must be used inside <BrandingProvider>')
  return branding
}