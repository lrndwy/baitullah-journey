import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'split-hero.tsx'),
  'utf8',
)

describe('SplitHero first-viewport height', () => {
  it('fills the screen below the sticky header so TrustStrip seals stay below the fold', () => {
    expect(source).toContain('min-h-[calc(100svh-5.5rem)]')
    expect(source).not.toContain('min(88vh,44rem)')
  })
})
