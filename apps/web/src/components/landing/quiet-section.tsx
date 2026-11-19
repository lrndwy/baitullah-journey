import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONE: Record<'plain' | 'mist' | 'white', string> = {
  plain: '',
  mist: 'bg-[var(--brand-blue-mist)]',
  white: 'bg-white',
}

/**
 * Calm public-section chrome: generous air, optional surface tone, optional gold hairline.
 */
export function QuietSection({
  id,
  className,
  tone = 'plain',
  hairline = false,
  children,
}: {
  id?: string
  className?: string
  tone?: 'plain' | 'mist' | 'white'
  hairline?: boolean
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20 py-20 sm:py-28',
        hairline && 'border-t border-[var(--brand-gold-soft)]/50',
        TONE[tone],
        className,
      )}
    >
      {children}
    </section>
  )
}
