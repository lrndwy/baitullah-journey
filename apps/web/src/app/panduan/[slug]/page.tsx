import { notFound } from 'next/navigation'
import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { TextLink } from '@/components/landing/text-link'
import { formatDateId } from '@/lib/landing-content'
import { fetchPublicArticleBySlug, mediaUrl } from '@/lib/public-api'
import { Card, CardContent } from '@/components/ui/card'

export default async function PanduanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await fetchPublicArticleBySlug(slug)
  if (!article) notFound()

  const thumb = mediaUrl(article.thumbnailUrl)

  return (
    <PublicShell>
      <PageHero eyebrow="Panduan" title={article.title} description={article.excerpt ?? undefined} />

      <article className="brand-container max-w-3xl py-16 sm:py-20">
        {article.publishedAt ? (
          <p className="text-sm text-[var(--brand-text-muted)]">
            Dipublikasikan {formatDateId(article.publishedAt.slice(0, 10))}
          </p>
        ) : null}

        {thumb ? (
          <div className="mt-8 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : null}

        {article.content ? (
          <div className="prose-brand mt-10 whitespace-pre-wrap text-base leading-relaxed text-[var(--brand-text)]">
            {article.content}
          </div>
        ) : (
          <Card className={`mt-10 ${EMPTY_PANEL_CLASS}`}>
            <CardContent className="py-6 text-sm text-[var(--brand-text-muted)]">
              Konten artikel belum tersedia.
            </CardContent>
          </Card>
        )}

        <p className="mt-12">
          <TextLink href="/panduan">← Semua panduan</TextLink>
        </p>
      </article>
    </PublicShell>
  )
}
