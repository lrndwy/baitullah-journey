import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { brandBtn, brandLink } from '@/components/landing/brand'
import { cn } from '@/lib/utils'

/**
 * Layout helpers for the public site. Interactive controls use shadcn UI with
 * brand classNames from `brand.ts`.
 */

export function Container({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>{children}</div>
}

/**
 * `scroll-mt` clears the fixed header when a nav anchor jumps here.
 */
export function Section({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-20 sm:py-28', className)}>
      {children}
    </section>
  )
}

/**
 * Small uppercase label above a heading. The colour follows the surface: the
 * bright gold on white is only 3.16:1 and would fail AA at this size, so light
 * surfaces get the darker gold instead.
 */
export function Eyebrow({
  tone = 'ink',
  className,
  children,
}: {
  tone?: 'ink' | 'light'
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn(
        'text-[0.6875rem] font-semibold uppercase tracking-[0.18em]',
        tone === 'light' ? 'text-brand-gold' : 'text-brand-gold-ink',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'start',
  tone = 'ink',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'start' | 'center'
  tone?: 'ink' | 'light'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2
        className={cn(
          'font-display max-w-3xl text-[1.75rem] leading-[1.15] font-medium tracking-[-0.015em] text-balance sm:text-4xl lg:text-[2.75rem]',
          tone === 'light' ? 'text-white' : 'text-neutral-950',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'max-w-2xl text-base leading-relaxed',
            tone === 'light' ? 'text-white/70' : 'text-neutral-600',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

type ButtonVariant = 'gold' | 'primary' | 'outline' | 'outlineLight' | 'link'

const BUTTON_VARIANTS: Record<Exclude<ButtonVariant, 'link'>, string> = {
  gold: brandBtn.gold,
  primary: brandBtn.primaryLg,
  outline: brandBtn.outline,
  outlineLight: brandBtn.outlineLight,
}

/**
 * An anchor styled with the shadcn Button for CTAs. Use `variant="link"` for
 * plain text links without button chrome.
 */
export function ButtonLink({
  href,
  children,
  variant = 'gold',
  external = false,
  ariaLabel,
  className,
}: {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  external?: boolean
  ariaLabel?: string
  className?: string
}) {
  const linkProps = {
    href,
    ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
    ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
  }

  if (variant === 'link') {
    return (
      <a {...linkProps} className={cn(brandLink, className)}>
        {children}
      </a>
    )
  }

  return (
    <Button
      asChild
      variant={variant === 'outline' || variant === 'outlineLight' ? 'outline' : 'default'}
      className={cn(BUTTON_VARIANTS[variant], className)}
    >
      <a {...linkProps}>{children}</a>
    </Button>
  )
}
