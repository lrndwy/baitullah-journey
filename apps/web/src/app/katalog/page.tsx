import { KatalogFilters } from '@/components/landing/katalog-filters'
import { brandBtn } from '@/components/landing/brand'
import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/landing-content'
import { fetchPublicCategories, fetchPublicPackages, mediaUrl } from '@/lib/public-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; q?: string }>
}) {
  const params = await searchParams
  const categorySlug = params.kategori?.trim() || undefined
  const q = params.q?.trim() || undefined

  const [categories, packages] = await Promise.all([
    fetchPublicCategories(),
    fetchPublicPackages({ categorySlug, q, limit: 48 }),
  ])

  return (
    <PublicShell>
      <PageHero
        eyebrow="Katalog"
        title="Paket Umroh & Haji"
        description="Pilih paket yang sesuai kebutuhan keluarga. Semua harga yang ditampilkan adalah harga dasar; jadwal keberangkatan bisa memiliki penyesuaian."
      />

      <div className="brand-container py-16 sm:py-20">
        <KatalogFilters
          categories={categories}
          initialQ={q}
          initialCategorySlug={categorySlug}
        />

        {categories.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-2">
            <Button asChild className={!categorySlug ? brandBtn.chipActive : brandBtn.chip}>
              <a href="/katalog">Semua</a>
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                asChild
                className={
                  categorySlug === category.slug ? brandBtn.chipActive : brandBtn.chip
                }
              >
                <a href={`/katalog?kategori=${encodeURIComponent(category.slug)}`}>
                  {category.name}
                </a>
              </Button>
            ))}
          </div>
        ) : null}

        {packages.items.length === 0 ? (
          <Card className={cn('mt-12', EMPTY_PANEL_CLASS)}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Belum ada paket yang dipublikasikan untuk filter ini.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {packages.items.map((pkg) => {
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
                      <span className="text-xs text-[var(--brand-text-muted)]">
                        {pkg.packageType ?? 'Paket'}
                      </span>
                    )}
                  </div>
                  <CardHeader className="space-y-2 px-4 pt-4 pb-0">
                    {pkg.categoryName ? (
                      <Badge
                        variant="outline"
                        className="w-fit border-[var(--brand-gold)]/30 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-gold)]"
                      >
                        {pkg.categoryName}
                      </Badge>
                    ) : null}
                    <CardTitle className="text-lg text-[var(--brand-blue-accent)]">
                      <a href={`/katalog/${pkg.slug}`} className="hover:text-[var(--brand-emerald)]">
                        {pkg.name}
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pt-2">
                    {pkg.description ? (
                      <p className="line-clamp-3 text-sm text-[var(--brand-text)]">{pkg.description}</p>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex items-end justify-between gap-3 border-0 bg-transparent px-4 pt-2 pb-4">
                    <div>
                      <p className="text-xs text-[var(--brand-text-muted)]">Mulai dari</p>
                      <p className="font-semibold text-[var(--brand-emerald)]">
                        {formatRupiah(pkg.basePrice)}
                      </p>
                    </div>
                    <Button asChild className={brandBtn.primary}>
                      <a href={`/katalog/${pkg.slug}`}>Lihat detail</a>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PublicShell>
  )
}
