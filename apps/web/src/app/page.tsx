import { Departures } from '@/components/landing/departures'
import { Faq } from '@/components/landing/faq'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { Packages } from '@/components/landing/packages'
import { PublicShell } from '@/components/landing/public-shell'
import { Testimonials } from '@/components/landing/testimonials'
import { TrustStrip } from '@/components/landing/trust-strip'
import { WhyUs } from '@/components/landing/why-us'
import {
  fetchPublicPackages,
  fetchPublicTestimonials,
  fetchUpcomingDepartures,
  loadSiteSettings,
} from '@/lib/public-api'

export default async function HomePage() {
  const [featured, departures, testimonials, settings] = await Promise.all([
    fetchPublicPackages({ featured: true, limit: 6 }),
    fetchUpcomingDepartures(6),
    fetchPublicTestimonials({ limit: 6 }),
    loadSiteSettings(),
  ])

  const packages =
    featured.items.length > 0
      ? featured.items
      : (await fetchPublicPackages({ limit: 6 })).items

  return (
    <PublicShell>
      <Hero />
      <TrustStrip license={settings?.license} />
      <WhyUs />
      <Packages packages={packages} />
      <Departures items={departures} />
      <Testimonials items={testimonials} />
      <Faq />
      <FinalCta phone={settings?.phone} whatsapp={settings?.whatsapp} />
    </PublicShell>
  )
}
