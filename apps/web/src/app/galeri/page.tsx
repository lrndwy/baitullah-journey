import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { formatDateId } from '@/lib/landing-content'
import { fetchPublicGalleries } from '@/lib/public-api'
import { Card, CardContent } from '@/components/ui/card'

export default async function GaleriPage() {
  const galleries = await fetchPublicGalleries({ limit: 48 })

  return (
    <PublicShell>
      <PageHero
        eyebrow="Dokumentasi"
        title="Galeri Perjalanan"
        description="Cuplikan momen jamaah di tanah suci dan kegiatan manasik."
      />

      <div className="brand-container py-16 sm:py-20">
        {galleries.items.length === 0 ? (
          <Card className={EMPTY_PANEL_CLASS}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Belum ada galeri yang dipublikasikan.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.items.map((gallery) => (
              <li key={gallery.id} className="border-t border-[var(--brand-gold-soft)]/50 pt-5">
                <a href={`/galeri/${gallery.slug}`} className="group block">
                  <h2 className="text-lg font-semibold text-[var(--brand-blue-accent)] group-hover:text-[var(--brand-emerald)]">
                    {gallery.title}
                  </h2>
                  {gallery.eventDate ? (
                    <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
                      {formatDateId(gallery.eventDate)}
                    </p>
                  ) : null}
                  {gallery.description ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--brand-text)]">
                      {gallery.description}
                    </p>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  )
}
