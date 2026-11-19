'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Page } from '@app/contracts'
import { apiFetch, ApiError } from './api'

/**
 * Paginates an in-memory list with the same surface as `usePaginated`, so
 * `DataPagination` renders either without knowing the difference.
 *
 * Used where the API returns a complete set — the permission catalogue, for
 * instance, which is bounded by the number of permissions the code declares.
 * Paging that server-side would add a round trip for no benefit.
 */
export function useClientPaginated<T>(all: T[], initialLimit = 10): Paginated<T> {
  const [limit, setLimitState] = useState(initialLimit)
  const [pageIndex, setPageIndex] = useState(0)

  const pageCount = Math.max(1, Math.ceil(all.length / limit))

  // A list that shrank below the current page must not leave us on a blank one.
  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(pageCount - 1)
  }, [pageCount, pageIndex])

  const start = pageIndex * limit
  const items = useMemo(() => all.slice(start, start + limit), [all, start, limit])

  return {
    items,
    total: all.length,
    limit,
    pageIndex,
    pageCount,
    loading: false,
    error: null,
    canPrev: pageIndex > 0,
    canNext: start + limit < all.length,
    setLimit: (next) => {
      setLimitState(next)
      setPageIndex(0)
    },
    first: () => setPageIndex(0),
    prev: () => setPageIndex((current) => Math.max(0, current - 1)),
    next: () => setPageIndex((current) => Math.min(pageCount - 1, current + 1)),
    reload: () => undefined,
  }
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  /** 0-based. The UI shows `pageIndex + 1`. */
  pageIndex: number
  pageCount: number
  loading: boolean
  error: string | null
  canPrev: boolean
  canNext: boolean
  setLimit: (limit: number) => void
  first: () => void
  prev: () => void
  next: () => void
  reload: () => void
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

/**
 * Cursor-based pagination with a client-side page stack.
 *
 * The API pages by keyset (`cursor`), which is what keeps a list stable while
 * rows are being inserted — but a keyset scan does not know its own position.
 * `total` comes from a separate count, and previous/next work by keeping the
 * cursors already visited. That buys real page numbers and backwards
 * navigation without giving up the stability of keyset paging.
 *
 * The one thing it cannot do is jump to an unvisited page, because that would
 * require the offset keyset paging exists to avoid.
 */
export function usePaginated<T>(options: {
  path: string
  params?: Record<string, string | undefined>
  initialLimit?: number
}): Paginated<T> {
  const { path, params, initialLimit = 25 } = options
  // Serialised so a fresh object literal from the caller does not re-trigger.
  const paramsKey = JSON.stringify(params ?? {})

  const [limit, setLimitState] = useState(initialLimit)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [pageIndex, setPageIndex] = useState(0)
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cursor = cursors[pageIndex]

  // Any change to the query resets to the first page: a filter applied to page
  // 4 of a different result set is meaningless.
  useEffect(() => {
    setCursors([null])
    setPageIndex(0)
  }, [paramsKey, limit])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams({ limit: String(limit) })
      for (const [key, value] of Object.entries(JSON.parse(paramsKey) as Record<string, string>)) {
        if (value) query.set(key, value)
      }
      if (cursor) query.set('cursor', cursor)

      const page = await apiFetch<Page<T>>(`${path}?${query.toString()}`)

      setItems(page.items)
      setTotal(page.total ?? 0)
      setCursors((previous) => {
        if (!page.nextCursor) return previous.slice(0, pageIndex + 1)
        const next = previous.slice(0, pageIndex + 1)
        next[pageIndex + 1] = page.nextCursor
        return next
      })
    } catch (cause) {
      setItems([])
      setError(cause instanceof ApiError ? cause.message : 'Could not load this list')
    } finally {
      setLoading(false)
    }
  }, [cursor, limit, pageIndex, paramsKey, path])

  useEffect(() => {
    void load()
  }, [load])

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  )

  return {
    items,
    total,
    limit,
    pageIndex,
    pageCount,
    loading,
    error,
    canPrev: pageIndex > 0,
    canNext: pageIndex + 1 < cursors.length,
    setLimit: setLimitState,
    first: () => setPageIndex(0),
    prev: () => setPageIndex((current) => Math.max(0, current - 1)),
    next: () => setPageIndex((current) => current + 1),
    reload: () => void load(),
  }
}