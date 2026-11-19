import { BRAND, HEADER_IZIN } from '@/lib/landing-content'
import { sealLinesFromHero } from '@/components/landing/seal-copy'

export function TrustStrip({ license }: { license?: string | null }) {
  const text = license?.trim() || HEADER_IZIN
  const seals = sealLinesFromHero()

  return (
    <section className="border-y border-[var(--brand-gold-soft)]/50 bg-white brand-reveal">
      <div className="brand-container flex flex-col gap-4 py-5 sm:py-6">
        <div className="flex flex-col gap-1 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-sm font-medium text-[var(--brand-emerald)]">{text}</p>
          <p className="text-xs text-[var(--brand-text-muted)]">{BRAND.tagline}</p>
        </div>
        {seals.length > 0 ? (
          <ul className="flex flex-col gap-3 border-t border-[var(--brand-gold-soft)]/40 pt-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-0 sm:gap-y-2 sm:divide-x sm:divide-[var(--brand-gold-soft)]/50">
            {seals.map((seal) => (
              <li
                key={seal.label}
                className="text-sm leading-snug text-[var(--brand-text)] sm:px-5 sm:first:pl-0 sm:last:pr-0"
              >
                <span className="font-semibold text-[var(--brand-emerald)]">{seal.label}</span>
                <span className="text-[var(--brand-text-muted)]"> — {seal.sub}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
