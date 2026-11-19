import { KOMITMEN } from '@/lib/landing-content'
import { QuietSection } from '@/components/landing/quiet-section'

export function WhyUs() {
  return (
    <QuietSection tone="mist" className="brand-reveal">
      <div className="brand-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-ink)]">
            {KOMITMEN.overline}
          </p>
          <h2 className="font-display mt-4 text-2xl leading-tight text-[var(--brand-emerald)] sm:text-3xl lg:text-[2.5rem]">
            {KOMITMEN.heading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--brand-text)]">{KOMITMEN.description}</p>
        </div>

        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {KOMITMEN.items.map((item) => (
            <li key={item.number} className="border-t border-[var(--brand-gold-soft)]/60 pt-5">
              <div className="text-sm font-semibold tracking-wide text-[var(--brand-emerald)]">
                {item.number}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-[var(--brand-blue-accent)]">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--brand-text)]">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </QuietSection>
  )
}
