import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { brandLink } from '@/components/landing/brand'
import { cn } from '@/lib/utils'

/** Inline public-site link without Button chrome (no box/padding/ring). */
export function TextLink({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'a'> & { children: ReactNode }) {
  return (
    <a className={cn(brandLink, className)} {...props}>
      {children}
    </a>
  )
}
