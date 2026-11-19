'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Client boundary for `next-themes`. The `.dark` class variant declared in
 * `globals.css` is what switches the shadcn tokens, so the provider only has to
 * toggle the class on `<html>`.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}