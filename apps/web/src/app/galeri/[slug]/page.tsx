import { notFound } from 'next/navigation'
import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { TextLink } from '@/components/landing/text-link'
import { formatDateId } from '@/lib/landing-content'
import { fetchPublicGalleryBySlug, mediaUrl } from '@/lib/public-api'
import { Card, CardContent } from '@/components/ui/card'

export default async function GaleriDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const gallery = await fetchPublicGalleryBySlug(slug)
  if (!gallery) notFound()

  const images = gallery.images ?? []

  return (
    <PublicShell>
      <PageHero
        eyebrow="Galeri"
        title={gallery.title}
        description={gallery.description ?? undefined}
      />

      <div className="brand-container py-16 sm:py-20">
        {gallery.eventDate ? (
          <p className="mb-10 text-sm text-[var(--brand-text-muted)]">
            Tanggal kegiatan: {formatDateId(gallery.eventDate)}
          </p>
        ) : null}

        {images.length === 0 ? (
          <Card className={EMPTY_PANEL_CLASS}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Galeri ini belum memiliki foto.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => {
              const src = mediaUrl(image.imageUrl)
              return (
                <figure key={image.id} className="overflow-hidden bg-[var(--brand-bluelight)]">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={image.caption ?? ''}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-sm text-[var(--brand-text-muted)]">
                      Foto
                    </div>
                  )}
                  {image.caption ? (
                    <figcaption className="border-t border-[var(--brand-gold-soft)]/40 bg-white px-3 py-2 text-sm text-[var(--brand-text)]">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              )
            })}
          </div>
        )}

        <p className="mt-12">
          <TextLink href="/galeri">← Semua galeri</TextLink>
        </p>
      </div>
    </PublicShell>
  )
}
