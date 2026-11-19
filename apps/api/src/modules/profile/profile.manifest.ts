import type { ModuleManifest } from '@app/core'
import { userProfiles } from './profile.schema'

export const profileManifest: ModuleManifest = {
  name: 'profile',
  title: 'Profiles',
  description: 'Per-user profile details, with self-service and administrative editing.',
  version: '1.0.0',
  permissions: [
    { key: 'profile.read', description: "View any user's profile" },
    { key: 'profile.update', description: "Edit any user's profile" },
  ],
  emits: ['profile.updated'],
  tables: [userProfiles],
}

/**
 * One prefix per user. The key a client sends back is validated against it, so
 * nobody can point their avatar at someone else's object.
 */
export function avatarPrefix(userId: string): string {
  return `avatars/${userId}/`
}