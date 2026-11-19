import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import {
  AssetCompleteSchema,
  ImageUploadRequestSchema,
  UpdateProfileSchema,
  UserIdParamSchema,
  type AssetUploadSignature,
  type ImageUploadRequest,
  type UpdateProfileInput,
  type UserProfile,
} from '@app/contracts'
import type { AuthPrincipal } from '@app/core'
import { AuditAction, CurrentPrincipal, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { ProfileService } from './profile.service'

@Controller('profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  /**
   * Your own profile. No permission is required beyond being signed in — which
   * is the point: authorisation is about other people's data.
   */
  @Get('me')
  async me(@CurrentPrincipal() principal: AuthPrincipal): Promise<{ profile: UserProfile }> {
    return { profile: await this.profiles.find(principal.userId) }
  }

  @AuditAction('profile.update')
  @Patch('me')
  async updateMe(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput,
  ): Promise<{ profile: UserProfile }> {
    return { profile: await this.profiles.update(principal.userId, body) }
  }

  @AuditAction('profile.avatar.sign')
  @Post('me/avatar/upload-url')
  async signAvatar(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(ImageUploadRequestSchema)) body: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    return this.profiles.signAvatar(principal.userId, body)
  }

  @AuditAction('profile.avatar.upload')
  @Post('me/avatar/complete')
  async completeAvatar(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(AssetCompleteSchema)) body: { key: string },
  ): Promise<{ profile: UserProfile }> {
    const { profile } = await this.profiles.completeAvatar(principal.userId, body.key)
    return { profile }
  }

  /** Falls back to the provider picture rather than leaving the account blank. */
  @AuditAction('profile.avatar.clear')
  @Delete('me/avatar')
  async clearAvatar(@CurrentPrincipal() principal: AuthPrincipal): Promise<{ profile: UserProfile }> {
    return { profile: await this.profiles.clearAvatar(principal.userId) }
  }

  /** Anyone's profile, for the admin user detail page. */
  @RequirePermissions('profile.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: { id: string },
  ): Promise<{ profile: UserProfile }> {
    return { profile: await this.profiles.find(params.id) }
  }

  @RequirePermissions('profile.update')
  @AuditAction('profile.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(UserIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput,
  ): Promise<{ profile: UserProfile }> {
    return { profile: await this.profiles.update(params.id, body) }
  }
}