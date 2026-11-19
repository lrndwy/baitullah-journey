import { brandBtn } from '@/components/landing/brand'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { TextLink } from '@/components/landing/text-link'
import { BRAND } from '@/lib/landing-content'
import { loadSiteSettings } from '@/lib/public-api'
import { Button } from '@/components/ui/button'

export default async function ProfilPage() {
  const settings = await loadSiteSettings()

  const siteName = settings?.siteName?.trim() || BRAND.name
  const tagline = settings?.tagline?.trim() || BRAND.tagline
  const about = settings?.aboutHtml?.trim()
  const phone = settings?.phone?.trim() || BRAND.phone
  const email = settings?.email?.trim() || BRAND.email
  const whatsapp = settings?.whatsapp?.trim() || BRAND.whatsapp
  const address = settings?.address?.trim() || BRAND.address
  const license = settings?.license?.trim() || BRAND.license

  return (
    <PublicShell>
      <PageHero eyebrow="Tentang kami" title={siteName} description={tagline} />

      <div className="brand-container grid gap-14 py-16 sm:py-20 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-5">
          <h2 className="font-display text-2xl text-[var(--brand-emerald)]">Profil</h2>
          {about ? (
            <div
              className="space-y-3 text-base leading-relaxed text-[var(--brand-text)] [&_a]:text-[var(--brand-emerald)] [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: about }}
            />
          ) : (
            <p className="text-base leading-relaxed text-[var(--brand-text)]">{BRAND.description}</p>
          )}
          <p className="border-t border-[var(--brand-gold-soft)]/50 pt-4 text-sm text-[var(--brand-text)]">
            {license}
          </p>
        </section>

        <aside className="h-fit space-y-5 border border-[var(--brand-gold-soft)]/50 bg-white p-6">
          <h2 className="font-display text-xl text-[var(--brand-emerald)]">Kontak</h2>
          <div className="space-y-4 text-sm text-[var(--brand-text)]">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--brand-gold-ink)]">
                Alamat
              </p>
              <p className="mt-1">{address}</p>
            </div>
            <div className="border-t border-[var(--brand-gold-soft)]/40 pt-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--brand-gold-ink)]">
                Telepon
              </p>
              <p className="mt-1">
                <TextLink href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</TextLink>
              </p>
            </div>
            <div className="border-t border-[var(--brand-gold-soft)]/40 pt-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--brand-gold-ink)]">
                WhatsApp
              </p>
              <p className="mt-1">
                <TextLink
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {whatsapp}
                </TextLink>
              </p>
            </div>
            <div className="border-t border-[var(--brand-gold-soft)]/40 pt-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--brand-gold-ink)]">
                Email
              </p>
              <p className="mt-1">
                <TextLink href={`mailto:${email}`}>{email}</TextLink>
              </p>
            </div>
          </div>
          <Button asChild className={`${brandBtn.primaryLg} w-full`}>
            <a href="/pemesanan">Ajukan pemesanan</a>
          </Button>
        </aside>
      </div>
    </PublicShell>
  )
}
