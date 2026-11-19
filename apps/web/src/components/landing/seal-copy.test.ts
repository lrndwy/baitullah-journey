import { describe, expect, it } from 'vitest'
import { sealLinesFromHero } from './seal-copy'

describe('sealLinesFromHero', () => {
  it('maps the three HERO seals preserving label and flattening sub newlines', () => {
    const lines = sealLinesFromHero([
      { label: 'PIHK & PPIU', sub: 'Resmi Berizin Kemenag' },
      { label: 'Direct Flight', sub: 'Garuda & Saudia\nLangsung' },
      { label: 'Mutawwif Bersanad', sub: 'Alumni Madinah & Kairo' },
    ])
    expect(lines).toEqual([
      { label: 'PIHK & PPIU', sub: 'Resmi Berizin Kemenag' },
      { label: 'Direct Flight', sub: 'Garuda & Saudia Langsung' },
      { label: 'Mutawwif Bersanad', sub: 'Alumni Madinah & Kairo' },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(sealLinesFromHero([])).toEqual([])
  })
})
