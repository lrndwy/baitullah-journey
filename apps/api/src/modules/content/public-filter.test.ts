import { describe, expect, it } from 'vitest'
import {
  filterPublishedArticles,
  filterPublishedFlag,
  isPublicArticleStatus,
  resolveArticlePublishedAt,
} from './public-filter'

describe('public content filters', () => {
  it('treats only published article status as public', () => {
    expect(isPublicArticleStatus('published')).toBe(true)
    expect(isPublicArticleStatus('draft')).toBe(false)
    expect(isPublicArticleStatus('archived')).toBe(false)
  })

  it('filters article lists to published rows only', () => {
    const items = [
      { id: '1', status: 'draft' },
      { id: '2', status: 'published' },
      { id: '3', status: 'archived' },
      { id: '4', status: 'published' },
    ]

    expect(filterPublishedArticles(items).map((row) => row.id)).toEqual(['2', '4'])
  })

  it('filters galleries and testimonials by isPublished', () => {
    const items = [
      { id: 'a', isPublished: false },
      { id: 'b', isPublished: true },
      { id: 'c', isPublished: false },
    ]

    expect(filterPublishedFlag(items).map((row) => row.id)).toEqual(['b'])
  })

  it('stamps publishedAt to now when publishing with a null publishedAt', () => {
    const before = Date.now()
    const result = resolveArticlePublishedAt({
      status: 'published',
      publishedAt: null,
      existing: null,
    })
    const after = Date.now()

    expect(result).toBeInstanceOf(Date)
    expect(result!.getTime()).toBeGreaterThanOrEqual(before)
    expect(result!.getTime()).toBeLessThanOrEqual(after)
  })

  it('keeps an existing publishedAt when republishing without a new value', () => {
    const existing = new Date('2024-06-01T10:00:00.000Z')
    expect(
      resolveArticlePublishedAt({
        status: 'published',
        existing,
      }),
    ).toEqual(existing)
  })

  it('clears or preserves publishedAt for non-published statuses', () => {
    const existing = new Date('2024-06-01T10:00:00.000Z')

    expect(
      resolveArticlePublishedAt({
        status: 'draft',
        publishedAt: null,
        existing,
      }),
    ).toBeNull()

    expect(
      resolveArticlePublishedAt({
        status: 'archived',
        existing,
      }),
    ).toEqual(existing)
  })
})
