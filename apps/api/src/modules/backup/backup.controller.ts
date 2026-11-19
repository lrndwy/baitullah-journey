import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import {
  BackupUploadRequestSchema,
  CreateBackupSchema,
  PaginationQuerySchema,
  RestoreModeSchema,
  UuidSchema,
  type BackupListResponse,
  type BackupSummary,
  type BackupUploadRequest,
  type BackupUploadSignature,
  type CreateBackupInput,
  type RestoreReport,
} from '@app/contracts'
import type { AuthPrincipal } from '@app/core'
import { z } from 'zod'
import { AuditAction, CurrentPrincipal, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { BackupService } from './backup.service'

const RestoreBodySchema = z.object({ mode: RestoreModeSchema })

const BackupIdParamSchema = z.object({ id: UuidSchema })

@Controller('backup')
export class BackupController {
  constructor(private readonly backups: BackupService) {}

  @RequirePermissions('backup.read')
  @Get('backups')
  async list(
    @Query(new ZodValidationPipe(PaginationQuerySchema))
    query: z.infer<typeof PaginationQuerySchema>,
  ): Promise<BackupListResponse> {
    return this.backups.list(query.cursor, query.limit)
  }

  @RequirePermissions('backup.create')
  @AuditAction('backup.create')
  @Post('backups')
  async create(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(CreateBackupSchema)) body: CreateBackupInput,
  ): Promise<{ backup: BackupSummary }> {
    return { backup: await this.backups.create(body, principal.userId) }
  }

  /**
   * Uploading an archive made elsewhere. Two steps, like every other upload
   * here: register and sign, let the browser PUT straight to the bucket, then
   * confirm — at which point the bytes are read back and validated.
   */
  @RequirePermissions('backup.create')
  @AuditAction('backup.upload.sign')
  @Post('backups/upload-url')
  async signUpload(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(BackupUploadRequestSchema)) body: BackupUploadRequest,
  ): Promise<BackupUploadSignature> {
    return this.backups.signUpload(body, principal.userId)
  }

  @RequirePermissions('backup.create')
  @AuditAction('backup.upload.complete')
  @Post('backups/:id/complete')
  async completeUpload(
    @Param(new ZodValidationPipe(BackupIdParamSchema)) params: { id: string },
  ): Promise<{ backup: BackupSummary }> {
    return { backup: await this.backups.completeUpload(params.id) }
  }

  /** Presigned link to the `.tar.gz`, so the archive never streams through the API. */
  @RequirePermissions('backup.read')
  @Get('backups/:id/download')
  async download(
    @Param(new ZodValidationPipe(BackupIdParamSchema)) params: { id: string },
  ): Promise<{ url: string; filename: string }> {
    return this.backups.downloadUrl(params.id)
  }

  @RequirePermissions('backup.restore')
  @AuditAction('backup.restore')
  @Post('backups/:id/restore')
  async restore(
    @Param(new ZodValidationPipe(BackupIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(RestoreBodySchema)) body: z.infer<typeof RestoreBodySchema>,
  ): Promise<{ report: RestoreReport }> {
    return { report: await this.backups.restore(params.id, body.mode) }
  }

  @RequirePermissions('backup.delete')
  @AuditAction('backup.delete')
  @Delete('backups/:id')
  async remove(
    @Param(new ZodValidationPipe(BackupIdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.backups.remove(params.id)
    return { ok: true }
  }
}