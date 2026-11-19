import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { TextLink } from '@/components/landing/text-link'
import { formatDateId } from '@/lib/landing-content'
import { fetchPublicArticles, mediaUrl } from '@/lib/public-api'
import { Card, CardContent } from '@/components/ui/card'

export default async function PanduanPage() {
  const articles = await fetchPublicArticles({ limit: 48 })

  return (
    <PublicShell>
      <PageHero
        eyebrow="Edukasi"
        title="Panduan Jamaah"
        description="Artikel persiapan, manasik, dan tips ibadah sebelum keberangkatan."
      />

      <div className="brand-container py-16 sm:py-20">
        {articles.items.length === 0 ? (
          <Card className={EMPTY_PANEL_CLASS}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Belum ada panduan yang dipublikasikan.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-10 md:grid-cols-2">
            {articles.items.map((article) => {
              const thumb = mediaUrl(article.thumbnailUrl)
              return (
                <li
                  key={article.id}
                  className="overflow-hidden border border-[var(--brand-gold-soft)]/40 bg-white"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-44 w-full object-cover" />
                  ) : null}
                  <div className="space-y-3 px-5 py-5">
                    {article.publishedAt ? (
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {formatDateId(article.publishedAt.slice(0, 10))}
                      </p>
                    ) : null}
                    <h2 className="text-xl font-semibold text-[var(--brand-blue-accent)]">
                      <a
                        href={`/panduan/${article.slug}`}
                        className="hover:text-[var(--brand-emerald)]"
                      >
                        {article.title}
                      </a>
                    </h2>
                    {article.excerpt ? (
                      <p className="text-sm leading-relaxed text-[var(--brand-text)]">
                        {article.excerpt}
                      </p>
                    ) : null}
                    <TextLink href={`/panduan/${article.slug}`}>Baca selengkapnya →</TextLink>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </PublicShell>
  )
}
