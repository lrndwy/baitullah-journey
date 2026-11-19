import type { ReactNode } from 'react'

/**
 * Shared heading for every admin page. Four call sites already, and the title
 * block is the thing most likely to drift apart if it were copy-pasted.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}