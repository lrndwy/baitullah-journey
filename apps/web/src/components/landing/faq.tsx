import { EDUKASI } from '@/lib/landing-content'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { QuietSection } from '@/components/landing/quiet-section'
import { TextLink } from '@/components/landing/text-link'

export function Faq() {
  return (
    <QuietSection tone="white" className="brand-reveal">
      <div className="brand-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-ink)]">
            {EDUKASI.overline}
          </p>
          <h2 className="font-display mt-4 text-2xl leading-tight text-[var(--brand-emerald)] sm:text-3xl lg:text-[2.5rem]">
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl border-y border-[var(--brand-gold-soft)]/50">
          <Accordion type="single" collapsible className="w-full">
            {EDUKASI.faqs.map((item) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className="border-[var(--brand-gold-soft)]/50"
              >
                <AccordionTrigger className="text-[var(--brand-blue-accent)] hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[var(--brand-text)]">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <p className="mt-8 text-center text-sm text-[var(--brand-text-muted)]">
          Butuh panduan lebih lengkap? <TextLink href="/panduan">Baca artikel panduan</TextLink>
        </p>
      </div>
    </QuietSection>
  )
}
