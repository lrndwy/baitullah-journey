import { describe, expect, it } from 'vitest'
import { SPLIT_HERO_ALLOWED_SLOTS } from './split-hero-slots'

describe('SplitHero budget', () => {
  it('allows only eyebrow, title, description, ctas, visual', () => {
    expect(SPLIT_HERO_ALLOWED_SLOTS).toEqual([
      'eyebrow',
      'title',
      'description',
      'primaryCta',
      'secondaryCta',
      'visual',
    ])
  })
})
