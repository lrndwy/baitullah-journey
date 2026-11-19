import { notFound } from 'next/navigation'
import { brandBtn } from '@/components/landing/brand'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { formatDateId, formatRupiah } from '@/lib/landing-content'
import { fetchPublicPackageBySlug, mediaUrl } from '@/lib/public-api'
import { Button } from '@/components/ui/button'

export default async function KatalogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const pkg = await fetchPublicPackageBySlug(slug)
  if (!pkg) notFound()

  const image = mediaUrl(pkg.thumbnailUrl)
  const openDepartures = pkg.departures.filter((item) => item.status === 'open')

  return (
    <PublicShell>
      <PageHero
        eyebrow={pkg.categoryName ?? pkg.packageType ?? 'Paket'}
        title={pkg.name}
        description={pkg.description ?? undefined}
      />

      <div className="brand-container space-y-16 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-xl bg-[var(--brand-bluelight)]">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-sm text-[var(--brand-text-muted)]">
                Gambar paket
              </div>
            )}
          </div>

          <aside className="h-fit space-y-4 border border-[var(--brand-gold-soft)]/50 bg-white p-6">
            <div>
              <p className="text-xs text-[var(--brand-text-muted)]">Harga dasar</p>
              <p className="font-display mt-2 text-3xl font-medium text-[var(--brand-emerald)]">
                {formatRupiah(pkg.basePrice)}
              </p>
              <p className="mt-1 text-sm text-[var(--brand-text)]">per jamaah · {pkg.currency}</p>
            </div>
            {openDepartures[0] ? (
              <Button asChild className={`${brandBtn.primaryLg} w-full`}>
                <a href={`/pemesanan?package=${pkg.id}&departure=${openDepartures[0].id}`}>
                  Ajukan pemesanan
                </a>
              </Button>
            ) : (
              <p className="bg-[var(--brand-surface)] px-3 py-3 text-sm text-[var(--brand-text-muted)]">
                Belum ada jadwal terbuka untuk paket ini.
              </p>
            )}
            <Button asChild variant="outline" className={`${brandBtn.outline} w-full`}>
              <a href="/katalog">Kembali ke katalog</a>
            </Button>
          </aside>
        </div>

        {pkg.facilities.length > 0 ? (
          <section>
            <h2 className="font-display text-2xl text-[var(--brand-emerald)]">Fasilitas</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2">
              {pkg.facilities.map((facility) => (
                <li
                  key={facility.facilityId}
                  className="border-t border-[var(--brand-gold-soft)]/50 pt-4"
                >
                  <h3 className="text-base font-semibold text-[var(--brand-blue-accent)]">
                    {facility.name}
                  </h3>
                  {facility.description ? (
                    <p className="mt-2 text-sm text-[var(--brand-text)]">{facility.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {pkg.accommodations.length > 0 ? (
          <section>
            <h2 className="font-display text-2xl text-[var(--brand-emerald)]">Akomodasi</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2">
              {pkg.accommodations.map((item) => (
                <li
                  key={`${item.accommodationId}-${item.accommodationRole}`}
                  className="border-t border-[var(--brand-gold-soft)]/50 pt-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-gold-ink)]">
                    {item.accommodationRole} · {item.nights} malam
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[var(--brand-blue-accent)]">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--brand-text)]">
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="font-display text-2xl text-[var(--brand-emerald)]">Jadwal keberangkatan</h2>
          {pkg.departures.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--brand-text-muted)]">
              Belum ada jadwal yang ditampilkan.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--brand-gold-soft)]/50 border-y border-[var(--brand-gold-soft)]/50">
              {pkg.departures.map((departure) => (
                <li key={departure.id} className="space-y-4 py-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--brand-blue-accent)]">
                        {formatDateId(departure.departureDate)} —{' '}
                        {formatDateId(departure.returnDate)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--brand-text)]">
                        {departure.airline ? `${departure.airline} · ` : ''}
                        Status: {departure.status === 'open' ? 'Terbuka' : 'Penuh'} · Sisa{' '}
                        {departure.availableQuota}/{departure.quota}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--brand-emerald)]">
                        {formatRupiah(departure.effectivePrice)}
                      </p>
                    </div>
                    {departure.status === 'open' ? (
                      <Button asChild className={brandBtn.primary}>
                        <a href={`/pemesanan?package=${pkg.id}&departure=${departure.id}`}>
                          Pesan jadwal ini
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {departure.itineraries.length > 0 ? (
                    <ol className="space-y-4 border-t border-[var(--brand-gold-soft)]/40 pt-4">
                      {departure.itineraries.map((day) => (
                        <li key={day.id} className="grid gap-1 sm:grid-cols-[4.5rem_1fr]">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-gold-ink)]">
                            Hari {day.dayNumber}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[var(--brand-blue-accent)]">
                              {day.title}
                            </p>
                            {day.location ? (
                              <p className="text-xs text-[var(--brand-text-muted)]">{day.location}</p>
                            ) : null}
                            {day.description ? (
                              <p className="mt-1 text-sm text-[var(--brand-text)]">{day.description}</p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PublicShell>
  )
}
