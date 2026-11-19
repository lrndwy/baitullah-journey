import { Inject, Injectable } from '@nestjs/common'
import type { PgTable } from 'drizzle-orm/pg-core'
import {
  isModuleEnabled,
  type AdminNavItem,
  type ModuleManifest,
  type PermissionDefinition,
  type ResolvedModule,
} from '@app/core'
import { MODULE_DESCRIPTORS } from '../tokens'
import type { ModuleDescriptor } from './module-descriptor'

/**
 * The single source of truth for "which modules exist and which are on".
 *
 * A module is *not* a plugin: there is no dynamic loading and no runtime
 * mutation. The registry is built once, from a static list filtered by
 * environment configuration, and is read-only thereafter.
 */
@Injectable()
export class ModuleRegistry {
  private readonly modules: ResolvedModule[]

  constructor(@Inject(MODULE_DESCRIPTORS) descriptors: ModuleDescriptor[]) {
    this.modules = descriptors.map(({ manifest }) => ({
      manifest,
      enabled: isModuleEnabled(manifest.name, manifest.core),
    }))

    const duplicates = this.findDuplicateNames()
    if (duplicates.length > 0) {
      throw new Error(`Duplicate module names registered: ${duplicates.join(', ')}`)
    }
  }

  all(): ResolvedModule[] {
    return this.modules
  }

  enabled(): ResolvedModule[] {
    return this.modules.filter((entry) => entry.enabled)
  }

  manifests(): ModuleManifest[] {
    return this.enabled().map((entry) => entry.manifest)
  }

  /** Every permission contributed by an enabled module, de-duplicated by key. */
  permissionCatalog(): Required<PermissionDefinition & { module: string }>[] {
    const byKey = new Map<string, Required<PermissionDefinition & { module: string }>>()
    for (const { manifest } of this.enabled()) {
      for (const permission of manifest.permissions ?? []) {
        byKey.set(permission.key, {
          key: permission.key,
          description: permission.description,
          module: manifest.name,
        })
      }
    }
    return [...byKey.values()]
  }

  /** Sidebar entries contributed by enabled modules. */
  adminNavigation(): (AdminNavItem & { module: string })[] {
    return this.enabled().flatMap(({ manifest }) =>
      (manifest.adminNav ?? []).map((item) => ({ ...item, module: manifest.name }),
      ),
    )
  }

  /**
   * Every table the enabled modules declared, in registration order — which the
   * module list defines as parents before children, so a restore can insert in
   * this order and a truncate can run in reverse.
   *
   * Tables that are not declared are invisible to backup, which is how live
   * credentials stay out of an archive.
   */
  declaredTables(): { module: string; table: PgTable }[] {
    return this.enabled().flatMap(({ manifest }) =>
      (manifest.tables ?? []).map((table) => ({ module: manifest.name, table })),
    )
  }

  /**
   * Attributes a request path to the module that serves it. Modules own the
   * `/api/<name>` prefix, so this needs no route introspection.
   */
  moduleForPath(path: string): string {
    const [, api, segment] = path.split('/')
    if (api !== 'api' || !segment) return 'platform'
    return segment.startsWith('_') ? 'platform' : segment
  }

  private findDuplicateNames(): string[] {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const { manifest } of this.modules) {
      if (seen.has(manifest.name)) duplicates.add(manifest.name)
      seen.add(manifest.name)
    }
    return [...duplicates]
  }
}