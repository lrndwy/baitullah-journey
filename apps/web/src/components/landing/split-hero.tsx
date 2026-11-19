import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { brandBtn } from '@/components/landing/brand'
import { cn } from '@/lib/utils'

export { SPLIT_HERO_ALLOWED_SLOTS } from './split-hero-slots'

export type SplitHeroProps = {
  eyebrow: string
  title: string
  description: string
  primaryCta: { href: string; label: string }
  secondaryCta?: { href: string; label: string }
  visual?: ReactNode
  className?: string
}

function DefaultVisual() {
  return (
    <div
      className="relative h-full min-h-[16rem] w-full overflow-hidden sm:min-h-[20rem] lg:min-h-full"
      aria-hidden
    >
      <div className="absolute inset-3 rounded-sm border border-[var(--brand-gold-soft)]/35 sm:inset-4" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 70% 40%, color-mix(in oklch, var(--brand-emerald-bright) 55%, transparent), transparent 70%), linear-gradient(155deg, var(--brand-emerald-deep) 0%, var(--brand-emerald) 45%, color-mix(in oklch, var(--brand-gold) 28%, var(--brand-emerald-deep)) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-[var(--brand-gold)]/15 blur-3xl"
        aria-hidden
      />
    </div>
  )
}

/**
 * Split sacred depth: quiet copy left, deep visual pane right.
 * Mobile stacks with a still-substantial visual (not a tiny thumbnail).
 */
export function SplitHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  visual,
  className,
}: SplitHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-[var(--brand-emerald)] brand-hero-enter',
        className,
      )}
    >
      <div className="brand-container grid min-h-[calc(100svh-5.5rem)] grid-cols-1 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col justify-center py-12 sm:py-16 lg:py-20 lg:pr-10">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-bright)]">
            {eyebrow}
          </p>
          <h1 className="font-display mt-5 max-w-xl text-3xl leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--brand-green-mist)] sm:text-base">
            {description}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild className={brandBtn.gold}>
              <a href={primaryCta.href}>{primaryCta.label}</a>
            </Button>
            {secondaryCta ? (
              <Button asChild variant="outline" className={brandBtn.outlineLight}>
                <a href={secondaryCta.href}>{secondaryCta.label}</a>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-[16rem] sm:min-h-[20rem] lg:min-h-0">{visual ?? <DefaultVisual />}</div>
      </div>
    </section>
  )
}
