import { z } from 'zod'
import { PaginationQuerySchema, UuidSchema } from './pagination'

export const AuditStatusSchema = z.enum(['success', 'failure'])
export type AuditStatus = z.infer<typeof AuditStatusSchema>
export const AuditActorTypeSchema = z.enum(['user', 'system', 'api_key'])

export const ListAuditQuerySchema = PaginationQuerySchema.extend({
  module: z.string().trim().min(1).max(64).optional(),
  action: z.string().trim().min(1).max(120).optional(),
  actorId: UuidSchema.optional(),
  status: AuditStatusSchema.optional(),
  /** Inclusive ISO-8601 lower bound on `occurredAt`. */
  from: z.string().datetime().optional(),
  /** Exclusive ISO-8601 upper bound on `occurredAt`. */
  to: z.string().datetime().optional(),
})

export type ListAuditQuery = z.infer<typeof ListAuditQuerySchema>

export interface AuditLog {
  id: string
  occurredAt: string
  module: string
  action: string
  actorId: string | null
  actorType: 'user' | 'system' | 'api_key'
  targetType: string | null
  targetId: string | null
  status: 'success' | 'failure'
  ip: string | null
  userAgent: string | null
  requestId: string | null
  metadata: Record<string, unknown> | null
}

export type AuditLogListResponse = {
  items: AuditLog[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}