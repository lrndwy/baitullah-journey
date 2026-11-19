'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Wraps any control in a tooltip. Used for the labelled header actions, where
 * the tooltip carries the *consequence* of the action rather than repeating the
 * label — a tooltip that says "Add user" on a button that says "Add user" is
 * noise, not help.
 */
export function Tip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Every icon-only action in the admin uses this, so a control never depends on
 * the reader guessing what a glyph means. `label` is both the tooltip and the
 * accessible name.
 */
export function IconAction({
  label,
  icon,
  onClick,
  href,
  disabled,
  destructive,
}: {
  label: string
  icon: ReactNode
  onClick?: () => void
  /** Renders an anchor instead of a button, for downloads and links. */
  href?: string
  disabled?: boolean
  destructive?: boolean
}) {
  const button = href ? (
    <Button asChild variant="ghost" size="icon-sm">
      <Link href={href} aria-label={label} target={href.startsWith('http') ? '_blank' : undefined}>
        {icon}
      </Link>
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={destructive ? 'text-destructive hover:text-destructive' : undefined}
    >
      {icon}
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}