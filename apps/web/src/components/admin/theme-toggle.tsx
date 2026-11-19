'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Tip } from '@/components/admin/icon-action'

/**
 * The icon is chosen with CSS rather than React state so the server-rendered
 * markup and the first client render agree — no hydration mismatch, and no
 * "mounted" flag dance.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'

  return (
    <Tip content={`Switch to ${next} mode`}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle theme"
        onClick={() => setTheme(next)}
      >
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
      </Button>
    </Tip>
  )
}