import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from '@nestjs/common'
import {
  AssetCompleteSchema,
  AssetSlotSchema,
  ImageUploadRequestSchema,
  UpdateSettingsSchema,
  type AssetSlot,
  type AssetUploadSignature,
  type ImageUploadRequest,
  type SiteSettings,
  type UpdateSettingsInput,
} from '@app/contracts'
import type { AuthPrincipal } from '@app/core'
import type { Response } from 'express'
import { z } from 'zod'
import { AuditAction, CurrentPrincipal, Public, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { SettingsService } from './settings.service'

/**
 * Route order matters: `assets/:slot` must be declared before any bare `:id`
 * route, or Express would match `assets` as an id.
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /**
   * Public on purpose: the login page carries the site name and logo, and it
   * renders before anyone has a session.
   */
  @Public()
  @Get()
  async read(): Promise<{ settings: SiteSettings }> {
    return { settings: await this.settings.get() }
  }

  /**
   * The value in `logoUrl` / `faviconUrl` points here. Redirecting rather than
   * returning the object keeps the URL in the HTML stable while the underlying
   * presigned link stays short-lived.
   *
   * `Cross-Origin-Resource-Policy: cross-origin` is required: helmet sends
   * `same-origin` by default, which tells the browser to refuse this response
   * when it is embedded by the web app on a different origin — so the logo and
   * favicon would silently not render. These two responses are the only
   * embeddable things the API serves, so the relaxation is scoped to them
   * rather than applied to the whole API.
   */
  @Public()
  @Get('assets/:slot')
  async asset(
    @Param('slot', new ZodValidationPipe(AssetSlotSchema)) slot: AssetSlot,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.settings.assetUrl(slot)
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    response.redirect(302, url)
  }

  @RequirePermissions('settings.write')
  @AuditAction('settings.update')
  @Patch()
  async update(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(UpdateSettingsSchema)) body: UpdateSettingsInput,
  ): Promise<{ settings: SiteSettings }> {
    return { settings: await this.settings.update(body, principal.userId) }
  }

  @RequirePermissions('settings.write')
  @AuditAction('settings.asset.sign')
  @Post('assets/:slot/upload-url')
  async signAsset(
    @Param('slot', new ZodValidationPipe(AssetSlotSchema)) slot: AssetSlot,
    @Body(new ZodValidationPipe(ImageUploadRequestSchema)) body: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    return this.settings.signAsset(slot, body)
  }

  @RequirePermissions('settings.write')
  @AuditAction('settings.asset.upload')
  @Post('assets/:slot/complete')
  async completeAsset(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('slot', new ZodValidationPipe(AssetSlotSchema)) slot: AssetSlot,
    @Body(new ZodValidationPipe(AssetCompleteSchema)) body: z.infer<typeof AssetCompleteSchema>,
  ): Promise<{ settings: SiteSettings }> {
    const { settings } = await this.settings.completeAsset(slot, body.key, principal.userId)
    return { settings }
  }

  @RequirePermissions('settings.write')
  @AuditAction('settings.asset.clear')
  @Delete('assets/:slot')
  async clearAsset(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('slot', new ZodValidationPipe(AssetSlotSchema)) slot: AssetSlot,
  ): Promise<{ settings: SiteSettings }> {
    return { settings: await this.settings.clearAsset(slot, principal.userId) }
  }
}