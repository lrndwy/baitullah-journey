import type { ModuleManifest } from '@app/core'
import { appSettings } from './settings.schema'

export const settingsManifest: ModuleManifest = {
  name: 'settings',
  title: 'Settings',
  description: 'Site name, logo and favicon for this installation.',
  version: '1.0.0',
  permissions: [
    { key: 'settings.read', description: 'Read the site settings' },
    { key: 'settings.write', description: 'Change the site name, logo and favicon' },
  ],
  adminNav: [
    {
      label: 'Pengaturan',
      path: '/admin/settings',
      icon: 'settings',
      permission: 'settings.read',
    },
  ],
  emits: ['settings.updated'],
  tables: [appSettings],
}

/** Object prefix per asset slot, so one feature cannot claim another's keys. */
export function assetPrefix(slot: string): string {
  return `settings/${slot}/`
}

/**
 * The path the browser can hold onto. It redirects to a freshly presigned URL,
 * which is what makes it safe to put in HTML and cache.
 */
export function assetPath(slot: string): string {
  return `/api/settings/assets/${slot}`
}

export const DEFAULT_SITE_NAME = 'Baitullah Journey'