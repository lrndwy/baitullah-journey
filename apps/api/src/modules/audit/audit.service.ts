import { Inject, Injectable } from '@nestjs/common'
import {
  auditLogs,
  buildPage,
  decodeCursor,
  keysetCondition,
  normalizeLimit,
  type DatabaseHandle,
  type Page,
} from '@app/core'
import type { AuditLog, ListAuditQuery } from '@app/contracts'
import { and, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm'
import { DATABASE } from '../../platform/tokens'

/**
 * Read-only. The platform intentionally exposes no update or delete path for
 * the trail; retention is a scheduled job, not an ad-hoc query.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async list(query: ListAuditQuery): Promise<Page<AuditLog>> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined

    const base: SQL[] = []
    if (query.module) base.push(eq(auditLogs.module, query.module))
    if (query.action) base.push(eq(auditLogs.action, query.action))
    if (query.actorId) base.push(eq(auditLogs.actorId, query.actorId))
    if (query.status) base.push(eq(auditLogs.status, query.status))
    if (query.from) base.push(gte(auditLogs.occurredAt, new Date(query.from)))
    if (query.to) base.push(lt(auditLogs.occurredAt, new Date(query.to)))

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(auditLogs.occurredAt, auditLogs.id, position)
      if (keyset) filters.push(keyset)
    }

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(base.length > 0 ? and(...base) : undefined),
      this.database.db
        .select()
        .from(auditLogs)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(auditLogs.occurredAt), desc(auditLogs.id))
        .limit(pageSize + 1),
    ])

    const total = countRows[0]?.total ?? 0

    // The audit table pages on `occurred_at` while `buildPage` expects
    // `createdAt`; map the field rather than maintaining a second paginator.
    const page = buildPage(
      rows.map((row) => ({ ...row, createdAt: row.occurredAt })),
      pageSize,
      total,
    )

    return {
      items: page.items.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        module: row.module,
        action: row.action,
        actorId: row.actorId,
        actorType: row.actorType as AuditLog['actorType'],
        targetType: row.targetType,
        targetId: row.targetId,
        status: row.status as AuditLog['status'],
        ip: row.ip,
        userAgent: row.userAgent,
        requestId: row.requestId,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      })),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      total: page.total,
    }
  }
}