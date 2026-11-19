import { describe, expect, it } from 'vitest'
import {
  effectivePrice,
  filterPublicDepartures,
  filterPublicPackages,
  isPublicDeparture,
  isPublicPackage,
} from './public-filter'

describe('isPublicPackage', () => {
  it('only treats published as public', () => {
    expect(isPublicPackage('published')).toBe(true)
    expect(isPublicPackage('draft')).toBe(false)
    expect(isPublicPackage('archived')).toBe(false)
    expect(isPublicPackage('other')).toBe(false)
  })
})

describe('filterPublicPackages', () => {
  it('keeps only published rows', () => {
    const items = [
      { id: '1', status: 'draft' },
      { id: '2', status: 'published' },
      { id: '3', status: 'archived' },
      { id: '4', status: 'published' },
    ]
    expect(filterPublicPackages(items).map((item) => item.id)).toEqual(['2', '4'])
  })
})

describe('isPublicDeparture', () => {
  it('exposes open and full only', () => {
    expect(isPublicDeparture('open')).toBe(true)
    expect(isPublicDeparture('full')).toBe(true)
    expect(isPublicDeparture('closed')).toBe(false)
    expect(isPublicDeparture('cancelled')).toBe(false)
  })
})

describe('filterPublicDepartures', () => {
  it('drops closed and cancelled', () => {
    const items = [
      { id: 'a', status: 'open' },
      { id: 'b', status: 'full' },
      { id: 'c', status: 'closed' },
      { id: 'd', status: 'cancelled' },
    ]
    expect(filterPublicDepartures(items).map((item) => item.id)).toEqual(['a', 'b'])
  })
})

describe('effectivePrice', () => {
  it('prefers priceOverride when set', () => {
    expect(effectivePrice(10_000_000, null)).toBe(10_000_000)
    expect(effectivePrice(10_000_000, undefined)).toBe(10_000_000)
    expect(effectivePrice(10_000_000, 9_500_000)).toBe(9_500_000)
  })
})
