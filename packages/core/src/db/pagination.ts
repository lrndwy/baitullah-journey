import { and, eq, lt, or, type SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { BadRequestError } from '../contracts/errors'

export interface Page<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  /** Rows matching the filters, for "page X of Y" in a paginator. */
  total: number
}

export interface CursorPosition {
  createdAt: Date
  id: string
}

/**
 * Cursors are opaque to clients: base64url of `<iso-timestamp>|<id>`.
 * Keyset pagination on `(created_at, id)` is stable under concurrent inserts,
 * unlike `OFFSET`, and stays O(log n) as tables grow.
 */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): CursorPosition {
  let raw: string
  try {
    raw = Buffer.from(cursor, 'base64url').toString('utf8')
  } catch {
    throw new BadRequestError('Invalid pagination cursor', { cursor })
  }

  const separator = raw.lastIndexOf('|')
  const createdAt = new Date(raw.slice(0, separator))
  const id = raw.slice(separator + 1)

  if (separator === -1 || !id || Number.isNaN(createdAt.getTime())) {
    throw new BadRequestError('Invalid pagination cursor', { cursor })
  }

  return { createdAt, id }
}

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export function normalizeLimit(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE)
}

/**
 * Callers fetch `limit + 1` rows; the extra row is the signal that more data
 * exists, so no separate `COUNT(*)` is needed to know whether a next page
 * exists. `total` is passed in by the caller when it wants page numbering.
 */
export function buildPage<T extends CursorPosition>(rows: T[], limit: number, total = 0): Page<T> {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items.at(-1)

  return {
    items,
    hasMore,
    total,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
  }
}

/**
 * The `WHERE` half of keyset pagination, shared so every module orders and
 * filters identically. Expects the caller to `ORDER BY created_at DESC, id DESC`.
 */
export function keysetCondition(
  createdAtColumn: AnyPgColumn,
  idColumn: AnyPgColumn,
  cursor: CursorPosition,
): SQL | undefined {
  return or(
    lt(createdAtColumn, cursor.createdAt),
    and(eq(createdAtColumn, cursor.createdAt), lt(idColumn, cursor.id)),
  )
}