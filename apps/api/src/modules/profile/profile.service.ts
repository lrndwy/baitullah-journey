import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import {
  NotFoundError,
  roles,
  userRoles,
  users,
  type DatabaseHandle,
  type EventBus,
} from '@app/core'
import type {
  AssetUploadCompletion,
  AssetUploadSignature,
  ImageUploadRequest,
  UpdateProfileInput,
  UserProfile,
} from '@app/contracts'
import { DATABASE, EVENT_BUS } from '../../platform/tokens'
import { ImageUploadService } from '../../platform/storage/image-upload.service'
import { resolveAvatarUrl } from '../../platform/storage/avatar-url'
import { userProfiles } from './profile.schema'
import { avatarPrefix } from './profile.manifest'

/**
 * Profiles are written lazily: a user without a profile row still has a valid
 * profile (their account data, with the extra fields empty). That means no
 * backfill migration is needed when the module is installed, and installing it
 * on a running system is a no-op until someone edits something.
 */
@Injectable()
export class ProfileService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    private readonly images: ImageUploadService,
  ) {}

  async find(userId: string): Promise<UserProfile> {
    const [account] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        avatarKey: users.avatarKey,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!account) {
      // A profile belongs to an account; a missing one is an error worth
      // surfacing rather than a profile to fabricate.
      throw new NotFoundError('User not found')
    }

    const [profile] = await this.database.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)

    const roleRows = await this.database.db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))

    return {
      userId: account.id,
      email: account.email,
      name: account.name,
      avatarUrl: await resolveAvatarUrl(this.images, account.avatarKey, account.avatarUrl),
      jobTitle: profile?.jobTitle ?? null,
      department: profile?.department ?? null,
      phone: profile?.phone ?? null,
      location: profile?.location ?? null,
      bio: profile?.bio ?? null,
      timezone: profile?.timezone ?? null,
      locale: profile?.locale ?? null,
      roles: roleRows.map((row) => row.key),
      createdAt: account.createdAt.toISOString(),
      updatedAt: (profile?.updatedAt ?? account.createdAt).toISOString(),
    }
  }

  async signAvatar(userId: string, input: ImageUploadRequest): Promise<AssetUploadSignature> {
    return this.images.sign(avatarPrefix(userId), input)
  }

  /**
   * Confirms the uploaded avatar and points the account at it. The previous
   * object is deleted only after the new key is stored, so a failure in between
   * leaves an orphan rather than a missing picture.
   */
  async completeAvatar(
    userId: string,
    key: string,
  ): Promise<{ profile: UserProfile; upload: AssetUploadCompletion }> {
    this.images.assertKeyUnder(key, avatarPrefix(userId))
    const upload = await this.images.verify(key)

    const [account] = await this.database.db
      .select({ avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    await this.database.db
      .update(users)
      .set({ avatarKey: key, updatedAt: new Date() })
      .where(eq(users.id, userId))

    if (account?.avatarKey && account.avatarKey !== key) {
      await this.images.remove(account.avatarKey)
    }

    await this.events.emit('profile.updated', { userId })
    return { profile: await this.find(userId), upload }
  }

  /** Falls back to the provider picture, which is why it is not simply nulled. */
  async clearAvatar(userId: string): Promise<UserProfile> {
    const [account] = await this.database.db
      .select({ avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    await this.database.db
      .update(users)
      .set({ avatarKey: null, updatedAt: new Date() })
      .where(eq(users.id, userId))

    await this.images.remove(account?.avatarKey)
    await this.events.emit('profile.updated', { userId })
    return this.find(userId)
  }

  /**
   * Upserts only the fields the caller sent. `null` clears a field,
   * `undefined` leaves it untouched — so the admin form can put one field back
   * to empty without wiping the rest.
   */
  async update(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    )

    if (Object.keys(patch).length > 0) {
      await this.database.db
        .insert(userProfiles)
        .values({ userId, ...patch, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: { ...patch, updatedAt: new Date() },
        })
    }

    // The display name and avatar live on the account, not the profile, because
    // every other module reads them from `users`.
    if (input.avatarUrl !== undefined) {
      await this.database.db
        .update(users)
        .set({ avatarUrl: input.avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, userId))
    }

    await this.events.emit('profile.updated', { userId })
    return this.find(userId)
  }
}