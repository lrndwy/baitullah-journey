'use client'

import type { ReactNode } from 'react'
import { ArrowDownRightIcon, ArrowUpRightIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * A stat card with its own gradient rather than a flat surface.
 *
 * The tone names a palette, not a colour value: keeping the gradients here (and
 * not at the call site) means the dashboard reads consistently and a rebrand is
 * one edit. Each tone carries a light and a dark variant, because a gradient
 * tuned for white backgrounds turns muddy on a dark one.
 */
const TONES = {
  violet: {
    surface:
      'bg-gradient-to-br from-violet-50 via-violet-100/60 to-white dark:from-violet-950/60 dark:via-violet-900/30 dark:to-card',
    glow: 'from-violet-500/20',
    accent: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500/15',
  },
  emerald: {
    surface:
      'bg-gradient-to-br from-emerald-50 via-emerald-100/60 to-white dark:from-emerald-950/60 dark:via-emerald-900/30 dark:to-card',
    glow: 'from-emerald-500/20',
    accent: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/15',
  },
  amber: {
    surface:
      'bg-gradient-to-br from-amber-50 via-amber-100/60 to-white dark:from-amber-950/60 dark:via-amber-900/30 dark:to-card',
    glow: 'from-amber-500/20',
    accent: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/15',
  },
  sky: {
    surface:
      'bg-gradient-to-br from-sky-50 via-sky-100/60 to-white dark:from-sky-950/60 dark:via-sky-900/30 dark:to-card',
    glow: 'from-sky-500/20',
    accent: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-500/15',
  },
} as const

export type StatTone = keyof typeof TONES

export function GradientStatCard({
  tone,
  label,
  value,
  hint,
  icon,
  trend,
}: {
  tone: StatTone
  label: string
  value: ReactNode
  hint?: string
  icon: ReactNode
  /** Small delta badge, e.g. "12 this week". */
  trend?: { value: string; direction: 'up' | 'down' }
}) {
  const palette = TONES[tone]

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-0 ring-1 shadow-sm',
        palette.surface,
        palette.ring,
      )}
    >
      {/* A soft corner bloom, so the gradient has a direction rather than
          being a flat wash. */}
      <div
        className={cn(
          'pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-gradient-to-b blur-3xl',
          palette.glow,
        )}
        aria-hidden
      />

      <div className="relative flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span className={cn('shrink-0 [&_svg]:size-4', palette.accent)}>{icon}</span>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-3xl leading-none font-semibold tabular-nums">{value}</span>
          {trend && (
            <span
              className={cn(
                'flex items-center gap-0.5 pb-0.5 text-xs font-medium',
                trend.direction === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400',
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRightIcon className="size-3" />
              ) : (
                <ArrowDownRightIcon className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>

        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  )
}