'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface BreadcrumbContextValue {
  /** Overrides the last crumb's label, e.g. a user's email instead of their id. */
  label: string | null
  setLabel: (label: string | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

/**
 * Lets a page name itself in the breadcrumb.
 *
 * Breadcrumbs are otherwise derived from the path, which is right for static
 * pages but produces a raw UUID on a detail route. The page is the only place
 * that knows the record's human name, so it publishes it here rather than the
 * layout growing a lookup table of every detail route.
 */
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null)
  return (
    <BreadcrumbContext.Provider value={{ label, setLabel }}>{children}</BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbContext(): BreadcrumbContextValue | null {
  return useContext(BreadcrumbContext)
}

/** Call from a detail page with the record's display name. */
export function useBreadcrumbLabel(label: string | null): void {
  const context = useBreadcrumbContext()

  useEffect(() => {
    if (!context) return
    context.setLabel(label)
    return () => context.setLabel(null)
  }, [context, label])
}