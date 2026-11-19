import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import {
  BulkIdsSchema,
  FileIdParamSchema,
  ListFilesQuerySchema,
  UploadSignatureSchema,
  type BulkDeleteResponse,
  type BulkIdsInput,
  type ListFilesQuery,
  type StoredFile,
  type StoredFileListResponse,
  type StoredFileWithUrl,
  type UploadSignatureInput,
  type UploadSignatureResponse,
} from '@app/contracts'
import type { AuthPrincipal } from '@app/core'
import { AuditAction, CurrentPrincipal, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { StorageService } from './storage.service'

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /**
   * Presigns an upload. Any signed-in user may upload; whether the resulting
   * file is visible to everyone else is what the permission guards decide.
   */
  @RequirePermissions('storage.file.write')
  @AuditAction('storage.file.sign')
  @Post('files')
  async createUpload(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(UploadSignatureSchema)) body: UploadSignatureInput,
  ): Promise<UploadSignatureResponse> {
    return this.storage.createUploadSignature(body, principal.userId)
  }

  @RequirePermissions('storage.file.write')
  @AuditAction('storage.file.complete')
  @Post('files/:id/complete')
  async completeUpload(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param(new ZodValidationPipe(FileIdParamSchema)) params: { id: string },
  ): Promise<{ file: StoredFile }> {
    return {
      file: await this.storage.completeUpload(
        params.id,
        principal.userId,
        canManageAny(principal),
      ),
    }
  }

  @RequirePermissions('storage.file.delete')
  @AuditAction('storage.file.bulk_delete')
  @Post('files/bulk-delete')
  async removeMany(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(BulkIdsSchema)) body: BulkIdsInput,
  ): Promise<BulkDeleteResponse> {
    return {
      deleted: await this.storage.removeMany(body.ids, principal.userId, canManageAny(principal)),
    }
  }

  @RequirePermissions('storage.file.read')
  @Get('files')
  async list(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(ListFilesQuerySchema)) query: ListFilesQuery,
  ): Promise<StoredFileListResponse> {
    return this.storage.list(query, principal, canManageAny(principal))
  }

  @Get('files/:id')
  async findOne(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param(new ZodValidationPipe(FileIdParamSchema)) params: { id: string },
  ): Promise<{ file: StoredFileWithUrl }> {
    return {
      file: await this.storage.findOne(params.id, principal.userId, canManageAny(principal)),
    }
  }

  @RequirePermissions('storage.file.delete')
  @AuditAction('storage.file.delete')
  @Delete('files/:id')
  async remove(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param(new ZodValidationPipe(FileIdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.storage.remove(params.id, principal.userId, canManageAny(principal))
    return { ok: true }
  }
}

/**
 * Holding `storage.file.read` is what makes a caller a file administrator: they
 * can see, download and delete other people's files, not just their own.
 */
function canManageAny(principal: AuthPrincipal): boolean {
  return principal.permissions.includes('storage.file.read')
}