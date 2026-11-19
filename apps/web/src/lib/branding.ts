import type { SiteSettings } from '@app/contracts'
import { cache } from 'react'
import { apiPublicUrl, internalApiUrl } from './runtime-config'

export interface Branding {
  siteName: string
  /** Absolute URL for the browser, or null when nothing has been uploaded. */
  logoUrl: string | null
  faviconUrl: string | null
}

export const DEFAULT_BRANDING: Branding = {
  siteName: 'Baitullah Journey',
  logoUrl: null,
  faviconUrl: null,
}

/**
 * Branding is read on every request rather than at build time: the web image is
 * built before the API exists, and the site name is editable at runtime.
 *
 * Never throws. An unreachable API or a disabled settings module falls back to
 * the defaults, because a branding lookup must not be able to take the site
 * down.
 *
 * Wrapped in React `cache` so the layout, `generateMetadata` and the landing
 * page share one lookup per request instead of issuing three.
 */
export const loadBranding = cache(async (): Promise<Branding> => {
  try {
    const response = await fetch(`${internalApiUrl()}/api/settings`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) return DEFAULT_BRANDING

    const { settings } = (await response.json()) as { settings: SiteSettings }

    return {
      siteName: settings.siteName || DEFAULT_BRANDING.siteName,
      logoUrl: settings.logoUrl ? `${apiPublicUrl()}${settings.logoUrl}` : null,
      faviconUrl: settings.faviconUrl ? `${apiPublicUrl()}${settings.faviconUrl}` : null,
    }
  } catch {
    return DEFAULT_BRANDING
  }
})
