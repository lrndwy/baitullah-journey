import type { Type } from '@nestjs/common'
import type { ModuleManifest } from '@app/core'

/**
 * One entry per feature module. Keeping the manifest and the Nest module in a
 * single object means the registry (used for permissions, navigation and audit
 * attribution) can never drift from the wiring (used for dependency injection).
 */
export interface ModuleDescriptor {
  manifest: ModuleManifest
  implementation: Type<unknown>
  /**
   * Absolute path to this module's own `.sql` migrations. Modules own their
   * schema, so a module is added or removed together with its tables.
   */
  migrationsDir?: string
}