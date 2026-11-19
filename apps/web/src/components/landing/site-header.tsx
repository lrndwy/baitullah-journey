import { BRAND, HEADER_IZIN, NAV_LINKS } from '@/lib/landing-content'
import { Button } from '@/components/ui/button'
import { brandBtn } from '@/components/landing/brand'
import { TextLink } from '@/components/landing/text-link'
import { BrandMark } from './brand-mark'

interface Props {
  siteName: string
  logoUrl: string | null
  phone?: string | null
  license?: string | null
}

const NAV_ITEMS = NAV_LINKS.filter((link) => link.label !== 'Beranda')

export function SiteHeader({ siteName, logoUrl, phone, license }: Props) {
  const hotline = phone?.trim() || BRAND.phone
  const izin = license?.trim() || HEADER_IZIN

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-[var(--brand-emerald)] text-[11px] leading-none text-[#FFE088]">
        <div className="brand-container flex h-8 items-center justify-between gap-4">
          <span className="truncate tracking-[0.04em]">{izin}</span>
          <span className="shrink-0 text-[#D5E3FC]">Hotline: {hotline}</span>
        </div>
      </div>
      <div className="border-b border-[var(--brand-gold-soft)]/40 bg-white/95 backdrop-blur-md">
        <div className="brand-container flex h-16 items-center justify-between gap-6 sm:h-[4.5rem]">
          <BrandMark siteName={siteName} logoUrl={logoUrl} />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Navigasi utama">
            {NAV_ITEMS.map((link) => (
              <TextLink
                key={link.href}
                href={link.href}
                className="font-medium text-[var(--brand-text)] hover:text-[var(--brand-emerald)] hover:no-underline"
              >
                {link.label}
              </TextLink>
            ))}
            <Button asChild className={brandBtn.primary}>
              <a href="/pemesanan">Pemesanan</a>
            </Button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <details className="relative">
              <summary className="cursor-pointer list-none px-2 py-1.5 text-sm font-semibold text-[var(--brand-emerald)] marker:content-none [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <div className="absolute right-0 z-50 mt-2 min-w-[12rem] border border-[var(--brand-gold-soft)]/50 bg-white p-3 shadow-sm">
                <nav className="flex flex-col gap-2" aria-label="Navigasi mobile">
                  {NAV_ITEMS.map((link) => (
                    <TextLink
                      key={link.href}
                      href={link.href}
                      className="font-medium text-[var(--brand-text)] hover:text-[var(--brand-emerald)]"
                    >
                      {link.label}
                    </TextLink>
                  ))}
                </nav>
              </div>
            </details>
            <Button asChild className={brandBtn.primary}>
              <a href="/pemesanan">Pesan</a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
