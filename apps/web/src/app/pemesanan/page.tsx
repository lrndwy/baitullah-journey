import { InquiryForm } from '@/components/landing/inquiry-form'
import { EMPTY_PANEL_CLASS } from '@/components/landing/empty-panel'
import { PageHero, PublicShell } from '@/components/landing/public-shell'
import { fetchPublicPackages } from '@/lib/public-api'
import { Card, CardContent } from '@/components/ui/card'

export default async function PemesananPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; departure?: string }>
}) {
  const params = await searchParams
  const packages = await fetchPublicPackages({ limit: 100 })

  return (
    <PublicShell>
      <PageHero
        eyebrow="Pemesanan"
        title="Ajukan Minat Keberangkatan"
        description="Isi formulir berikut. Tim kami akan menghubungi Anda secara manual — tanpa perlu membuat akun."
      />

      <div className="brand-container max-w-3xl py-16 sm:py-20">
        {packages.items.length === 0 ? (
          <Card className={EMPTY_PANEL_CLASS}>
            <CardContent className="py-12 text-center text-sm text-[var(--brand-text-muted)]">
              Belum ada paket yang bisa dipesan. Silakan cek kembali nanti atau hubungi kami melalui
              halaman profil.
            </CardContent>
          </Card>
        ) : (
          <InquiryForm
            packages={packages.items}
            initialPackageId={params.package}
            initialDepartureId={params.departure}
          />
        )}
      </div>
    </PublicShell>
  )
}
