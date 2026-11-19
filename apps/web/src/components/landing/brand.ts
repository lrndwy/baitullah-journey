import { cn } from '@/lib/utils'

/** Shared shadcn Button classNames tuned to the public brand palette. */
export const brandBtn = {
  primary: cn(
    'h-auto rounded-lg border-transparent bg-[var(--brand-emerald)] px-4 py-2.5 text-sm font-semibold text-white',
    'hover:bg-[var(--brand-emerald-bright)] hover:text-white',
  ),
  primaryLg: cn(
    'h-auto rounded-lg border-transparent bg-[var(--brand-emerald)] px-5 py-3 text-sm font-semibold text-white',
    'hover:bg-[var(--brand-emerald-bright)] hover:text-white',
  ),
  gold: cn(
    'h-auto rounded-lg border-transparent bg-[var(--brand-gold-soft)] px-5 py-3 text-sm font-semibold text-[var(--brand-gold-ink)]',
    'hover:bg-[var(--brand-gold-bright)] hover:text-[var(--brand-gold-ink)]',
  ),
  outline: cn(
    'h-auto rounded-lg border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-[var(--brand-text)]',
    'hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]',
  ),
  outlineLight: cn(
    'h-auto rounded-lg border-white/25 bg-transparent px-5 py-3 text-sm font-semibold text-white',
    'hover:bg-white/10 hover:text-white',
  ),
  chip: cn(
    'h-auto rounded-lg border-transparent bg-white px-3 py-1.5 text-sm font-medium text-[var(--brand-text)] ring-1 ring-black/10',
    'hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]',
  ),
  chipActive: cn(
    'h-auto rounded-lg border-transparent bg-[var(--brand-emerald)] px-3 py-1.5 text-sm font-medium text-white',
    'hover:bg-[var(--brand-emerald-bright)] hover:text-white',
  ),
} as const

/** Plain text links — not Button — so they never pick up button padding/border/ring. */
export const brandLink = cn(
  'inline text-sm font-semibold text-[var(--brand-emerald)] underline-offset-4',
  'hover:underline focus-visible:outline-none focus-visible:underline',
)

export const brandField =
  'bg-white border-black/10 focus-visible:border-[var(--brand-emerald)] focus-visible:ring-[var(--brand-emerald)]/20'
