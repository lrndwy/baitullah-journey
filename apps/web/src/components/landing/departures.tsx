import type { Package } from '@app/contracts'
import { formatDateId, formatRupiah } from '@/lib/landing-content'
import type { PublicDeparture } from '@/lib/public-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { brandBtn } from '@/components/landing/brand'
import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { QuietSection } from '@/components/landing/quiet-section'
import { cn } from '@/lib/utils'

type Row = { package: Package; departure: PublicDeparture }

export function Departures({ items }: { items: Row[] }) {
  return (
    <QuietSection tone="white" className="brand-reveal">
      <div className="brand-container">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold-ink)]">
            Jadwal Terdekat
          </p>
          <h2 className="font-display mt-3 text-2xl leading-tight text-[var(--brand-emerald)] sm:text-3xl lg:text-[2.5rem]">
            Keberangkatan yang Masih Terbuka
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--brand-text)]">
            Kuota ditampilkan secara transparan. Ajukan minat Anda sebelum seat penuh.
          </p>
        </div>

        {items.length === 0 ? (
          <Card className={cn('mt-12 bg-[var(--brand-surface)]', EMPTY_PANEL_CLASS)}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Belum ada jadwal terbuka. Silakan cek katalog paket.
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-12 divide-y divide-[var(--brand-gold-soft)]/50 border-y border-[var(--brand-gold-soft)]/50">
            {items.map(({ package: pkg, departure }) => (
              <li
                key={departure.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--brand-blue-accent)]">{pkg.name}</p>
                  <p className="mt-1 text-sm text-[var(--brand-text)]">
                    {formatDateId(departure.departureDate)} — {formatDateId(departure.returnDate)}
                    {departure.airline ? ` · ${departure.airline}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                    Sisa kuota: {departure.availableQuota} dari {departure.quota}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-base font-semibold text-[var(--brand-emerald)]">
                    {formatRupiah(departure.effectivePrice)}
                  </p>
                  <Button asChild className={brandBtn.primary}>
                    <a href={`/pemesanan?package=${pkg.id}&departure=${departure.id}`}>Pesan</a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </QuietSection>
  )
}
