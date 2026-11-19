import { describe, expect, it } from 'vitest'
import { EMPTY_PANEL_CLASS } from './empty-panel'

describe('EMPTY_PANEL_CLASS', () => {
  it('sets an explicit border width so dashed gold edges paint under preflight', () => {
    expect(EMPTY_PANEL_CLASS.split(/\s+/)).toEqual(
      expect.arrayContaining(['border', 'border-dashed']),
    )
    expect(EMPTY_PANEL_CLASS).toContain('border-[var(--brand-gold-soft)]')
  })
})
