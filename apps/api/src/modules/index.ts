import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { isModuleEnabled } from '@app/core'
import type { ModuleDescriptor } from '../platform/registry/module-descriptor'
import { AuditModule } from './audit/audit.module'
import { auditManifest } from './audit/audit.manifest'
import { AuthModule } from './auth/auth.module'
import { authManifest } from './auth/auth.manifest'
import { BackupModule } from './backup/backup.module'
import { backupManifest } from './backup/backup.manifest'
import { ContentModule } from './content/content.module'
import { contentManifest } from './content/content.manifest'
import { ProfileModule } from './profile/profile.module'
import { profileManifest } from './profile/profile.manifest'
import { RbacModule } from './rbac/rbac.module'
import { SettingsModule } from './settings/settings.module'
import { settingsManifest } from './settings/settings.manifest'
import { rbacManifest } from './rbac/rbac.manifest'
import { StorageModule } from './storage/storage.module'
import { storageManifest } from './storage/storage.manifest'
import { InquiriesModule } from './inquiries/inquiries.module'
import { inquiriesManifest } from './inquiries/inquiries.manifest'
import { PackagesModule } from './packages/packages.module'
import { packagesManifest } from './packages/packages.manifest'
import { UsersModule } from './users/users.module'
import { usersManifest } from './users/users.manifest'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MODULE LIST — the only file that changes when a module is added.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * To ADD a module:    create `modules/<name>/` and append one entry below.
 * To REMOVE a module: delete the folder and remove its line.
 * To DISABLE one:     set `MODULES_DISABLED=<name>` in the environment.
 *
 * Nothing in `platform/` knows what is in this list, which is what keeps the
 * core untouched as the application grows.
 */
export const moduleDescriptors: ModuleDescriptor[] = [
  // Domain first — sidebar groups Katalog → Konten → Operasi → Sistem.
  { manifest: packagesManifest, implementation: PackagesModule },
  { manifest: contentManifest, implementation: ContentModule },
  { manifest: inquiriesManifest, implementation: InquiriesModule },
  // Platform
  { manifest: authManifest, implementation: AuthModule },
  { manifest: rbacManifest, implementation: RbacModule },
  { manifest: usersManifest, implementation: UsersModule },
  { manifest: profileManifest, implementation: ProfileModule },
  { manifest: storageManifest, implementation: StorageModule },
  { manifest: backupManifest, implementation: BackupModule },
  { manifest: auditManifest, implementation: AuditModule },
  { manifest: settingsManifest, implementation: SettingsModule },
].map((descriptor) => ({ ...descriptor, ...migrationsFor(descriptor) }))

/**
 * A module that owns tables keeps its SQL in `modules/<name>/migrations`.
 * Discovering the folder rather than declaring it means adding a module stays
 * a one-line change even when it brings its own schema.
 */
function migrationsFor(descriptor: ModuleDescriptor): { migrationsDir?: string } {
  const dir = resolve(__dirname, descriptor.manifest.name, 'migrations')
  return existsSync(dir) ? { migrationsDir: dir } : {}
}

/**
 * Only enabled modules are imported by the root module. Filtering here rather
 * than inside `AppModule` keeps one rule in one place: a disabled module is
 * never instantiated, so its controllers are never mounted.
 */
export const moduleImplementations = moduleDescriptors
  .filter((descriptor) => isModuleEnabled(descriptor.manifest.name, descriptor.manifest.core))
  .map((descriptor) => descriptor.implementation)

export type { ModuleDescriptor }