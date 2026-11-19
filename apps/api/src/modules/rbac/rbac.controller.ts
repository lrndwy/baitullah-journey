import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import {
  AssignRoleSchema,
  CreateRoleSchema,
  ListRolesQuerySchema,
  UpdateRoleSchema,
  UuidSchema,
  type AssignRoleInput,
  type CreateRoleInput,
  type Role,
  type RoleListResponse,
  type UpdateRoleInput,
} from '@app/contracts'
import { z } from 'zod'
import { AuditAction, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { RbacService } from './rbac.service'

@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @RequirePermissions('rbac.role.read')
  @Get('roles')
  async listRoles(
    @Query(new ZodValidationPipe(ListRolesQuerySchema))
    query: z.infer<typeof ListRolesQuerySchema>,
  ): Promise<RoleListResponse> {
    return this.rbac.listRoles(query.cursor, query.limit)
  }

  @RequirePermissions('rbac.role.write')
  @AuditAction('rbac.role.create')
  @Post('roles')
  async createRole(
    @Body(new ZodValidationPipe(CreateRoleSchema)) body: CreateRoleInput,
  ): Promise<{ role: Role }> {
    return { role: await this.rbac.createRole(body) }
  }

  @RequirePermissions('rbac.role.write')
  @AuditAction('rbac.role.update')
  @Patch('roles/:id')
  async updateRole(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateRoleSchema)) body: UpdateRoleInput,
  ): Promise<{ role: Role }> {
    return { role: await this.rbac.updateRole(id, body) }
  }

  @RequirePermissions('rbac.role.delete')
  @AuditAction('rbac.role.delete')
  @Delete('roles/:id')
  async deleteRole(@Param('id', new ZodValidationPipe(UuidSchema)) id: string): Promise<{ ok: true }> {
    await this.rbac.deleteRole(id)
    return { ok: true }
  }

  @RequirePermissions('rbac.assignment.write')
  @AuditAction('rbac.role.assign')
  @Post('users/:userId/roles/:roleKey')
  async assignRole(
    @Param('userId', new ZodValidationPipe(UuidSchema)) userId: string,
    @Param('roleKey') roleKey: string,
    @Body(new ZodValidationPipe(AssignRoleSchema)) body: AssignRoleInput,
  ): Promise<{ ok: true }> {
    await this.rbac.assignRole(userId, roleKey, body.assigned)
    return { ok: true }
  }

  @RequirePermissions('rbac.permission.read')
  @Get('permissions')
  async listPermissions() {
    return { permissions: await this.rbac.listPermissions() }
  }
}