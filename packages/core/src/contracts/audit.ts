export type AuditActorType = 'user' | 'system' | 'api_key'
export type AuditStatus = 'success' | 'failure'

export interface AuditRecordInput {
  /** Dotted action name, e.g. `users.create`. */
  action: string
  /** Owning module. Auto-filled by the registry when omitted. */
  module?: string
  actorId?: string | null
  actorType?: AuditActorType
  /** Type/id of the thing acted upon, e.g. `user` / `<uuid>`. */
  targetType?: string
  targetId?: string
  status?: AuditStatus
  ip?: string
  userAgent?: string
  requestId?: string
  /** Structured, non-sensitive context. Never put secrets or PII in here. */
  metadata?: Record<string, unknown>
}

/**
 * The write side of the audit trail, injected anywhere a module needs to
 * record a business event. The kernel owns the storage and the retention
 * policy; modules only describe what happened.
 */
export interface AuditRecorder {
  record(input: AuditRecordInput): Promise<void>
}
