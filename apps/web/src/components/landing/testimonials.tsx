import type { Testimonial } from '@app/contracts'
import { TESTIMONI } from '@/lib/landing-content'
import { mediaUrl } from '@/lib/public-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { QuietSection } from '@/components/landing/quiet-section'
import { TextLink } from '@/components/landing/text-link'
import { cn } from '@/lib/utils'

export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <QuietSection tone="mist" className="brand-reveal">
      <div className="brand-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-ink)]">
              Testimoni Jamaah
            </p>
            <h2 className="font-display mt-3 text-2xl leading-tight text-[var(--brand-emerald)] sm:text-3xl lg:text-[2.5rem]">
              {TESTIMONI.heading}
            </h2>
          </div>
          <TextLink href="/galeri">{TESTIMONI.linkGaleri} →</TextLink>
        </div>

        {items.length === 0 ? (
          <Card className={cn('mt-12', EMPTY_PANEL_CLASS)}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Testimoni jamaah akan tampil di sini setelah dipublikasikan.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {items.map((item) => {
              const photo = mediaUrl(item.photoUrl)
              return (
                <blockquote
                  key={item.id}
                  className="border-t border-[var(--brand-gold-soft)]/60 pt-6"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar>
                      {photo ? <AvatarImage src={photo} alt="" /> : null}
                      <AvatarFallback className="bg-[var(--brand-bluelight)] text-[var(--brand-emerald)]">
                        {item.customerName.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold text-[var(--brand-blue-accent)]">
                        {item.customerName}
                      </div>
                      <div className="text-xs text-[var(--brand-text-muted)]">
                        {'★'.repeat(item.rating)}
                        {'☆'.repeat(Math.max(0, 5 - item.rating))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--brand-text)]">“{item.content}”</p>
                </blockquote>
              )
            })}
          </div>
        )}
      </div>
    </QuietSection>
  )
}
