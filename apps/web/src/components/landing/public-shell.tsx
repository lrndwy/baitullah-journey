import type { ReactNode } from 'react'
import { loadBranding } from '@/lib/branding'
import { loadSiteSettings } from '@/lib/public-api'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

export async function PublicShell({ children }: { children: ReactNode }) {
  const [branding, settings] = await Promise.all([loadBranding(), loadSiteSettings()])

  return (
    <div className="brand-surface flex min-h-svh flex-col">
      <SiteHeader
        siteName={branding.siteName}
        logoUrl={branding.logoUrl}
        phone={settings?.phone}
        license={settings?.license}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter
        siteName={branding.siteName}
        logoUrl={branding.logoUrl}
        tagline={settings?.tagline}
        phone={settings?.phone}
        email={settings?.email}
        whatsapp={settings?.whatsapp}
        address={settings?.address}
        license={settings?.license}
      />
    </div>
  )
}

/**
 * Compressed Split sacred depth for inner public routes — same language as SplitHero,
 * quieter room: short copy band + thin visual accent pane.
 */
export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <header className="relative overflow-hidden bg-[var(--brand-emerald)] brand-hero-enter">
      <div className="brand-container grid grid-cols-1 items-stretch sm:grid-cols-[minmax(0,1.4fr)_minmax(7rem,0.55fr)]">
        <div className="py-10 sm:py-14 sm:pr-8">
          {eyebrow ? (
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-bright)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display mt-3 max-w-2xl text-3xl leading-[1.12] tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--brand-green-mist)] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <div className="relative min-h-[7rem] sm:min-h-0" aria-hidden>
          <div className="absolute inset-3 border border-[var(--brand-gold-soft)]/30 sm:inset-y-6 sm:right-0 sm:left-2" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 60% 40%, color-mix(in oklch, var(--brand-gold) 22%, transparent), transparent 65%), linear-gradient(160deg, var(--brand-emerald-deep), var(--brand-emerald-bright))',
            }}
          />
        </div>
      </div>
    </header>
  )
}
