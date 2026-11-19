import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError, type DatabaseHandle, type EventBus } from '@app/core'
import type {
  AssetSlot,
  AssetUploadCompletion,
  AssetUploadSignature,
  ImageUploadRequest,
  SiteSettings,
  UpdateSettingsInput,
} from '@app/contracts'
import { DATABASE, EVENT_BUS } from '../../platform/tokens'
import { ImageUploadService } from '../../platform/storage/image-upload.service'
import { SETTINGS_ROW_ID, appSettings } from './settings.schema'
import { DEFAULT_SITE_NAME, assetPath, assetPrefix } from './settings.manifest'
import { eq } from 'drizzle-orm'

type SettingsRow = typeof appSettings.$inferSelect

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    private readonly images: ImageUploadService,
  ) {}

  /** Never throws: an installation with no row yet is a valid, branded default. */
  async get(): Promise<SiteSettings> {
    const [row] = await this.database.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, SETTINGS_ROW_ID))
      .limit(1)

    return toSettings(row)
  }

  async update(input: UpdateSettingsInput, actorId: string): Promise<SiteSettings> {
    const patch = {
      ...(input.siteName === undefined ? {} : { siteName: input.siteName }),
      ...(input.tagline === undefined ? {} : { tagline: input.tagline }),
      ...(input.whatsapp === undefined ? {} : { whatsapp: input.whatsapp }),
      ...(input.phone === undefined ? {} : { phone: input.phone }),
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.address === undefined ? {} : { address: input.address }),
      ...(input.license === undefined ? {} : { license: input.license }),
      ...(input.aboutHtml === undefined ? {} : { aboutHtml: input.aboutHtml }),
    }

    const [row] = await this.database.db
      .insert(appSettings)
      .values({
        id: SETTINGS_ROW_ID,
        siteName: input.siteName ?? DEFAULT_SITE_NAME,
        ...patch,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: {
          ...patch,
          updatedAt: new Date(),
          updatedBy: actorId,
        },
      })
      .returning()

    await this.events.emit('settings.updated', { changed: Object.keys(input) })
    return toSettings(row)
  }

  async signAsset(slot: AssetSlot, input: ImageUploadRequest): Promise<AssetUploadSignature> {
    return this.images.sign(assetPrefix(slot), input)
  }

  /**
   * Confirms an uploaded asset and swaps it in. The previous object is removed
   * only after the new key is persisted — a failure in between leaves an orphan
   * (recoverable) rather than a broken logo (visible).
   */
  async completeAsset(
    slot: AssetSlot,
    key: string,
    actorId: string,
  ): Promise<{ settings: SiteSettings; upload: AssetUploadCompletion }> {
    this.images.assertKeyUnder(key, assetPrefix(slot))
    const upload = await this.images.verify(key)

    const previous = await this.currentKey(slot)

    await this.database.db
      .insert(appSettings)
      .values({
        id: SETTINGS_ROW_ID,
        siteName: DEFAULT_SITE_NAME,
        [columnFor(slot)]: key,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { [columnFor(slot)]: key, updatedAt: new Date(), updatedBy: actorId },
      })

    if (previous && previous !== key) await this.images.remove(previous)

    await this.events.emit('settings.updated', { changed: [slot] })
    return { settings: await this.get(), upload }
  }

  async clearAsset(slot: AssetSlot, actorId: string): Promise<SiteSettings> {
    const previous = await this.currentKey(slot)

    await this.database.db
      .insert(appSettings)
      .values({ id: SETTINGS_ROW_ID, siteName: DEFAULT_SITE_NAME, updatedAt: new Date(), updatedBy: actorId })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { [columnFor(slot)]: null, updatedAt: new Date(), updatedBy: actorId },
      })

    await this.images.remove(previous)
    await this.events.emit('settings.updated', { changed: [slot] })
    return this.get()
  }

  /** Resolves a slot to a fresh download URL, for the redirect endpoint. */
  async assetUrl(slot: AssetSlot): Promise<string> {
    const key = await this.currentKey(slot)
    if (!key) throw new NotFoundError(`No ${slot} has been uploaded`)

    return this.images.presign(key)
  }

  private async currentKey(slot: AssetSlot): Promise<string | null> {
    const [row] = await this.database.db
      .select({ logoKey: appSettings.logoKey, faviconKey: appSettings.faviconKey })
      .from(appSettings)
      .where(eq(appSettings.id, SETTINGS_ROW_ID))
      .limit(1)

    if (!row) return null
    return slot === 'logo' ? row.logoKey : row.faviconKey
  }
}

function columnFor(slot: AssetSlot): 'logoKey' | 'faviconKey' {
  return slot === 'logo' ? 'logoKey' : 'faviconKey'
}

function toSettings(row: SettingsRow | undefined): SiteSettings {
  return {
    siteName: row?.siteName ?? DEFAULT_SITE_NAME,
    tagline: row?.tagline ?? null,
    whatsapp: row?.whatsapp ?? null,
    phone: row?.phone ?? null,
    email: row?.email ?? null,
    address: row?.address ?? null,
    license: row?.license ?? null,
    aboutHtml: row?.aboutHtml ?? null,
    logoUrl: row?.logoKey ? assetPath('logo') : null,
    faviconUrl: row?.faviconKey ? assetPath('favicon') : null,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  }
}