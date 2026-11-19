import { HERO } from '../../lib/landing-content'

export type SealLine = { label: string; sub: string }

/** Normalize HERO.trustSeals for calm display below the hero (never in SplitHero). */
export function sealLinesFromHero(
  seals: ReadonlyArray<{ label: string; sub: string }> = HERO.trustSeals,
): SealLine[] {
  return seals.map((seal) => ({
    label: seal.label,
    sub: seal.sub.replace(/\s*\n\s*/g, ' ').trim(),
  }))
}
