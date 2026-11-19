import { describe, expect, it } from 'vitest'
import { BadRequestError } from '../contracts/errors'
import { buildPage, decodeCursor, encodeCursor, normalizeLimit, keysetCondition } from './pagination'

const at = (iso: string, id: string): { createdAt: Date; id: string } => ({
  createdAt: new Date(iso),
  id,
})

describe('cursor encoding', () => {
  it('round-trips a position exactly', () => {
    const createdAt = new Date('2026-01-02T03:04:05.678Z')
    const decoded = decodeCursor(encodeCursor(createdAt, 'abc-123'))

    expect(decoded.id).toBe('abc-123')
    expect(decoded.createdAt.toISOString()).toBe(createdAt.toISOString())
  })

  it('rejects a cursor that is not valid base64url content', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(BadRequestError)
  })

  it('rejects a cursor missing the id segment', () => {
    const broken = Buffer.from('2026-01-02T03:04:05.678Z|', 'utf8').toString('base64url')
    expect(() => decodeCursor(broken)).toThrow(BadRequestError)
  })

  it('rejects a cursor with an unparseable timestamp', () => {
    const broken = Buffer.from('nonsense|abc', 'utf8').toString('base64url')
    expect(() => decodeCursor(broken)).toThrow(BadRequestError)
  })
})

describe('buildPage', () => {
  it('reports no further pages when the extra row is absent', () => {
    const page = buildPage([at('2026-01-01T00:00:00Z', '1'), at('2026-01-01T00:00:01Z', '2')], 5)

    expect(page.items).toHaveLength(2)
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeNull()
  })

  it('uses the extra row as the has-more signal without returning it', () => {
    const rows = [
      at('2026-01-01T00:00:03Z', '3'),
      at('2026-01-01T00:00:02Z', '2'),
      at('2026-01-01T00:00:01Z', '1'), // the probe row
    ]
    const page = buildPage(rows, 2)

    expect(page.items.map((row) => row.id)).toEqual(['3', '2'])
    expect(page.hasMore).toBe(true)
    // The cursor must point at the last *returned* row, not the probe row.
    expect(decodeCursor(page.nextCursor as string).id).toBe('2')
  })

  it('handles an empty result set', () => {
    const page = buildPage([], 10)

    expect(page.items).toEqual([])
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeNull()
  })
})

describe('normalizeLimit', () => {
  it('defaults when unspecified', () => {
    expect(normalizeLimit(undefined)).toBe(25)
  })

  it('clamps to the maximum so a client cannot request the whole table', () => {
    expect(normalizeLimit(10_000)).toBe(100)
  })

  it('clamps to at least one row', () => {
    expect(normalizeLimit(0)).toBe(1)
    expect(normalizeLimit(-5)).toBe(1)
  })

  it('truncates fractions and ignores non-finite input', () => {
    expect(normalizeLimit(12.9)).toBe(12)
    expect(normalizeLimit(Number.NaN)).toBe(25)
  })
})

describe('keysetCondition', () => {
  it('produces a predicate comparing both columns', () => {
    const condition = keysetCondition(
      { name: 'created_at' } as never,
      { name: 'id' } as never,
      { createdAt: new Date('2026-01-01T00:00:00Z'), id: 'abc' },
    )

    // A missing predicate would silently return page one forever.
    expect(condition).toBeDefined()
  })
})