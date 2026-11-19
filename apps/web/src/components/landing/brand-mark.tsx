import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The Baitullah Journey brand mark — ogee arch with Rub el Hizb star.
 * Default monogram when no logoUrl is set.
 */
function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 36" fill="none" aria-hidden className={cn('h-9 w-8', className)}>
      <path d="M1 35V14.5Q9.5 4.5 16 1.5Q22.5 4.5 31 14.5V35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <g fill="currentColor">
        <rect x="11.5" y="18" width="9" height="9" />
        <rect x="11.5" y="18" width="9" height="9" transform="rotate(45 16 22.5)" />
      </g>
    </svg>
  )
}

export function BrandMark({ siteName, logoUrl, className }: { siteName: string; logoUrl?: string | null; className?: string }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label={`${siteName} — beranda`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-9 w-8 rounded-sm object-cover" />
      ) : (
        <Monogram className="text-[var(--brand-emerald)]" />
      )}
      <span className="flex flex-col">
        <span className="font-display text-[1.0625rem] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap text-neutral-950">{siteName}</span>
        <span className="mt-[3px] text-[0.5625rem] leading-none font-semibold uppercase tracking-[0.22em] text-[var(--brand-gold)]">Umroh &amp; Haji</span>
      </span>
    </Link>
  )
}