import { Inject, Injectable, type Logger } from '@nestjs/common'
import { auditLogs, type AuditRecordInput, type AuditRecorder, type DatabaseHandle, type Env } from '@app/core'
import { APP_ENV, DATABASE, LOGGER } from '../tokens'

/**
 * Recording is kernel infrastructure, not a feature module: the trail must
 * exist even when the audit *viewer* is disabled in this deployment.
 *
 * Writing never throws. An audit failure must not fail the business operation
 * that produced it — the error is logged loudly and the request proceeds.
 */
@Injectable()
export class AuditRecorderService implements AuditRecorder {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  async record(input: AuditRecordInput): Promise<void> {
    if (!this.env.AUDIT_ENABLED) return

    try {
      await this.database.db.insert(auditLogs).values({
        module: input.module ?? 'platform',
        action: input.action,
        actorId: input.actorId ?? null,
        actorType: input.actorType ?? 'user',
        targetType: input.targetType,
        targetId: input.targetId,
        status: input.status ?? 'success',
        ip: input.ip,
        userAgent: input.userAgent,
        requestId: input.requestId,
        metadata: input.metadata,
      })
    } catch (error) {
      this.logger.error({ err: error, action: input.action }, 'failed to write audit record')
    }
  }
}