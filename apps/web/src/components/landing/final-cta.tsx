import { BRAND, CTA } from '@/lib/landing-content'
import { Button } from '@/components/ui/button'
import { brandBtn } from '@/components/landing/brand'
import { TextLink } from '@/components/landing/text-link'

export function FinalCta({
  phone,
  whatsapp,
}: {
  phone?: string | null
  whatsapp?: string | null
}) {
  const wa = (whatsapp?.trim() || BRAND.whatsapp).replace(/\D/g, '')
  const hotline = phone?.trim() || CTA.hotline.tel

  return (
    <section className="bg-[var(--brand-emerald)] py-20 sm:py-28 brand-reveal">
      <div className="brand-container max-w-3xl text-center">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-bright)]">
          {CTA.overline}
        </p>
        <h2 className="font-display mt-4 text-2xl leading-tight text-white sm:text-3xl lg:text-[2.5rem]">
          {CTA.heading.replace(/\n/g, ' ')}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--brand-green-mist)]">{CTA.description}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className={brandBtn.gold}>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
              {CTA.wa.label}
            </a>
          </Button>
          <Button asChild variant="outline" className={brandBtn.outlineLight}>
            <a href="/pemesanan">Isi Formulir Pemesanan</a>
          </Button>
          <TextLink
            href={`tel:${hotline.replace(/\s/g, '')}`}
            className="font-medium text-[var(--brand-blue-frost)] hover:text-white hover:no-underline"
          >
            {CTA.hotline.label}: {hotline}
          </TextLink>
        </div>
      </div>
    </section>
  )
}
