import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import {
  BulkIdsSchema,
  CreateUserSchema,
  ListUsersQuerySchema,
  UpdateUserSchema,
  UserIdParamSchema,
  type BulkDeleteResponse,
  type BulkIdsInput,
  type CreateUserInput,
  type ListUsersQuery,
  type UpdateUserInput,
  type User,
  type UserListResponse,
} from '@app/contracts'
import { AuditAction, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions('users.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(ListUsersQuerySchema)) query: ListUsersQuery,
  ): Promise<UserListResponse> {
    return this.users.list(query)
  }

  @RequirePermissions('users.delete')
  @AuditAction('users.bulk_delete')
  @Post('bulk-delete')
  async removeMany(
    @Body(new ZodValidationPipe(BulkIdsSchema)) body: BulkIdsInput,
  ): Promise<BulkDeleteResponse> {
    return { deleted: await this.users.removeMany(body.ids) }
  }

  @RequirePermissions('users.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: { id: string },
  ): Promise<{ user: User }> {
    return { user: await this.users.findById(params.id, { allowDeleted: true }) }
  }

  @RequirePermissions('users.create')
  @AuditAction('users.create')
  @Post()
  async create(@Body(new ZodValidationPipe(CreateUserSchema)) body: CreateUserInput): Promise<{ user: User }> {
    return { user: await this.users.create(body) }
  }

  @RequirePermissions('users.update')
  @AuditAction('users.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserInput,
  ): Promise<{ user: User }> {
    return { user: await this.users.update(params.id, body) }
  }

  @RequirePermissions('users.update')
  @AuditAction('users.restore')
  @Post(':id/restore')
  async restore(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: { id: string },
  ): Promise<{ user: User }> {
    return { user: await this.users.restore(params.id) }
  }

  /** Permanent delete — declare before `:id` so Nest does not swallow the suffix. */
  @RequirePermissions('users.delete')
  @AuditAction('users.purge')
  @Delete(':id/permanent')
  async purge(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.users.purge(params.id)
    return { ok: true }
  }

  /** Soft delete. */
  @RequirePermissions('users.delete')
  @AuditAction('users.delete')
  @Delete(':id')
  async remove(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.users.remove(params.id)
    return { ok: true }
  }
}
