import { z } from 'zod'

/**
 * Cursor pagination is the only list-pagination strategy in the platform.
 * `OFFSET` degrades as tables grow and skips rows under concurrent writes.
 */
export const PaginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

export interface Page<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  /**
   * Total rows matching the filters — the number a paginator needs to show
   * "page 3 of 12". Counted separately from the page itself, because a keyset
   * scan stops as soon as it has a page and therefore cannot know the total.
   */
  total: number
}

export const UuidSchema = z.string().uuid()