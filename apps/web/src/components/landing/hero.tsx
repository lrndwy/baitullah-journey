import { HERO } from '@/lib/landing-content'
import { SplitHero } from '@/components/landing/split-hero'

export function Hero() {
  return (
    <SplitHero
      eyebrow={HERO.overlineAccent.text}
      title={HERO.heading.replace(/\n/g, ' ')}
      description={HERO.description}
      primaryCta={{ href: '/katalog', label: HERO.cta }}
      secondaryCta={{ href: '/pemesanan', label: 'Ajukan Pemesanan' }}
    />
  )
}
