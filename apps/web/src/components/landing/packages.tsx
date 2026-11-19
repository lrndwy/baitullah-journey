import type { Package } from '@app/contracts'
import { PAKET, formatRupiah } from '@/lib/landing-content'
import { mediaUrl } from '@/lib/public-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { brandBtn } from '@/components/landing/brand'
import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { QuietSection } from '@/components/landing/quiet-section'
import { TextLink } from '@/components/landing/text-link'
import { cn } from '@/lib/utils'

export function Packages({ packages }: { packages: Package[] }) {
  return (
    <QuietSection tone="plain" className="bg-[var(--brand-surface)] brand-reveal">
      <div className="brand-container">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-ink)]">
              {PAKET.overline}
            </p>
            <h2 className="font-display mt-3 text-2xl leading-tight text-[var(--brand-emerald)] sm:text-3xl lg:text-[2.5rem]">
              {PAKET.heading}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--brand-text)]">{PAKET.description}</p>
          </div>
          <TextLink href="/katalog">Lihat semua paket →</TextLink>
        </div>

        {packages.length === 0 ? (
          <Card className={cn('mt-12', EMPTY_PANEL_CLASS)}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Paket unggulan akan tampil di sini setelah dipublikasikan.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const image = mediaUrl(pkg.thumbnailUrl)
              return (
                <Card
                  key={pkg.id}
                  className="gap-0 overflow-hidden rounded-xl bg-white py-0 shadow-none ring-1 ring-black/5"
                >
                  <div className="flex h-44 items-center justify-center bg-[var(--brand-bluelight)]">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-[var(--brand-text-muted)]">
                        {pkg.packageType ?? 'Paket'}
                      </span>
                    )}
                  </div>
                  <CardHeader className="space-y-2 px-5 pt-5 pb-0">
                    {pkg.categoryName ? (
                      <Badge
                        variant="outline"
                        className="w-fit border-[var(--brand-gold)]/25 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-gold-ink)]"
                      >
                        {pkg.categoryName}
                      </Badge>
                    ) : null}
                    <CardTitle className="text-lg text-[var(--brand-blue-accent)]">{pkg.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pt-2">
                    {pkg.description ? (
                      <p className="line-clamp-2 text-sm text-[var(--brand-text)]">{pkg.description}</p>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex items-end justify-between gap-3 border-0 bg-transparent px-5 pt-3 pb-5">
                    <div>
                      <p className="text-xs text-[var(--brand-text-muted)]">Mulai dari</p>
                      <p className="text-lg font-semibold text-[var(--brand-emerald)]">
                        {formatRupiah(pkg.basePrice)}
                      </p>
                    </div>
                    <Button asChild className={brandBtn.primary}>
                      <a href={`/katalog/${pkg.slug}`}>Detail</a>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </QuietSection>
  )
}
