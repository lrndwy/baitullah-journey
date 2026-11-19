import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import type { ReactNode } from 'react'
import { BrandingProvider } from '@/components/branding-provider'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/landing-content'
import { loadBranding } from '@/lib/branding'
import { apiPublicUrl } from '@/lib/runtime-config'
import { SessionProvider } from '@/lib/session'
import './globals.css'

/**
 * Two families, three jobs. Inter carries every paragraph, label and control;
 * Playfair Display carries headings and pull-quotes, reached through
 * `font-display` (see the `--font-display` theme route in globals.css). Body
 * text is never set in the serif — Playfair thins out badly below ~20px.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
})

/**
 * The API origin is resolved per request and handed to the client bundle here.
 * Baking it in at build time would mean one image per environment; this keeps
 * the image portable (`docker run -e API_PUBLIC_URL=…`) at the cost of one
 * inline script. `<` is escaped so a value containing `</script>` cannot break
 * out of the tag.
 */
function RuntimeConfigScript(): ReactNode {
  const config = JSON.stringify({ apiPublicUrl: apiPublicUrl() }).replace(/</g, '\\u003c')
  return <script dangerouslySetInnerHTML={{ __html: `window.__APP_CONFIG__=${config}` }} />
}

/**
 * The tab title and favicon come from the settings module, so renaming the site
 * does not require a rebuild. Both fall back to the defaults when the API is
 * unreachable — a branding lookup must never be able to break the page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const branding = await loadBranding()

  return {
    title: branding.siteName,
    description: BRAND.description,
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const branding = await loadBranding()

  return (
    <html lang="id" suppressHydrationWarning className={cn('font-sans', inter.variable, playfair.variable)}>
      <head>
        <RuntimeConfigScript />
      </head>
      <body className="min-h-svh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BrandingProvider branding={branding}>
            <SessionProvider>{children}</SessionProvider>
          </BrandingProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
