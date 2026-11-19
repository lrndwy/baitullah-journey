import { Controller, Get, Query } from '@nestjs/common'
import { ListAuditQuerySchema, type AuditLogListResponse, type ListAuditQuery } from '@app/contracts'
import { RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { AuditService } from './audit.service'

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermissions('audit.log.read')
  @Get('logs')
  async list(
    @Query(new ZodValidationPipe(ListAuditQuerySchema)) query: ListAuditQuery,
  ): Promise<AuditLogListResponse> {
    return this.audit.list(query)
  }
}