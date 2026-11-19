import { BRAND, FOOTER, NAV_LINKS } from '@/lib/landing-content'
import { TextLink } from '@/components/landing/text-link'

interface Props {
  siteName: string
  logoUrl: string | null
  tagline?: string | null
  phone?: string | null
  email?: string | null
  whatsapp?: string | null
  address?: string | null
  license?: string | null
}

export function SiteFooter({
  siteName,
  tagline,
  phone,
  email,
  whatsapp,
  address,
  license,
}: Props) {
  const displayPhone = phone?.trim() || BRAND.phone
  const displayEmail = email?.trim() || BRAND.email
  const displayWa = whatsapp?.trim() || BRAND.whatsapp
  const displayAddress = address?.trim() || BRAND.address
  const displayLicense = license?.trim() || BRAND.license
  const displayTagline = tagline?.trim() || BRAND.tagline

  return (
    <footer className="border-t border-[var(--brand-gold-soft)]/50 bg-[var(--brand-blue-mist)]">
      <div className="brand-container py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <div>
              <div className="font-display text-xl text-[var(--brand-emerald)]">{siteName}</div>
              <div className="mt-1 text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--brand-gold-ink)]">
                {FOOTER.tagline}
              </div>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--brand-text)]">{displayTagline}</p>
            <p className="text-xs leading-relaxed text-[var(--brand-text-muted)]">{displayLicense}</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[var(--brand-emerald)]">Navigasi</h2>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <TextLink
                    href={link.href}
                    className="font-medium text-[var(--brand-text)] hover:text-[var(--brand-emerald)]"
                  >
                    {link.label}
                  </TextLink>
                </li>
              ))}
              <li>
                <TextLink
                  href="/pemesanan"
                  className="font-medium text-[var(--brand-text)] hover:text-[var(--brand-emerald)]"
                >
                  Pemesanan
                </TextLink>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[var(--brand-emerald)]">Kontak</h2>
            <address className="mt-4 space-y-2.5 text-sm not-italic leading-relaxed text-[var(--brand-text)]">
              <p>{displayAddress}</p>
              <p>
                Tel: <TextLink href={`tel:${displayPhone.replace(/\s/g, '')}`}>{displayPhone}</TextLink>
              </p>
              <p>
                WA:{' '}
                <TextLink
                  href={`https://wa.me/${displayWa.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {displayWa}
                </TextLink>
              </p>
              <p>
                Email: <TextLink href={`mailto:${displayEmail}`}>{displayEmail}</TextLink>
              </p>
            </address>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--brand-gold-soft)]/50 pt-6 text-xs text-[var(--brand-text-muted)]">
          <span>{BRAND.copyright}</span>
          <div className="flex gap-5">
            {FOOTER.legal.map((item) => (
              <TextLink
                key={item.label}
                href={item.href}
                className="text-xs font-medium text-[var(--brand-text-muted)] hover:text-[var(--brand-emerald)]"
              >
                {item.label}
              </TextLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
