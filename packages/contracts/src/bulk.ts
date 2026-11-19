import { z } from 'zod'
import { UuidSchema } from './pagination'

/**
 * Bulk operations take an explicit id list rather than a filter. A filter-based
 * bulk delete turns one confused click into "deleted everything matching this
 * search", which is not a recoverable mistake.
 */
export const BulkIdsSchema = z.object({
  ids: z.array(UuidSchema).min(1, 'Select at least one row').max(200, 'At most 200 rows at once'),
})

export type BulkIdsInput = z.infer<typeof BulkIdsSchema>

export interface BulkDeleteResponse {
  /** Rows actually affected — an id that no longer exists is not an error. */
  deleted: number
}