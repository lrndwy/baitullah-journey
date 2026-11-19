/**
 * The contract every feature module implements.
 *
 * A module is *not* a plugin: there is no dynamic loading and no runtime
 * registry mutation. A module is a folder plus one entry in the module list.
 * Removing it is deleting both. Everything the platform needs to know about a
 * module is declared here, statically, where it can be type-checked.
 */

import type { PgTable } from 'drizzle-orm/pg-core'

export interface PermissionDefinition {
  /** Stable namespaced key. Convention: `<module>.<action>`, e.g. `users.read`. */
  key: string
  description: string
}

/** A permission as the API reports it: the definition plus its owning module. */
export interface PermissionMeta extends PermissionDefinition {
  module: string
}

export interface AdminNavItem {
  label: string
  path: string
  icon?: string
  /** Permission required to see this entry. Omit for "any authenticated user". */
  permission?: string
}

export interface ModuleManifest {
  /** Unique, kebab-case. Doubles as the HTTP prefix: `/api/<name>`. */
  name: string
  title: string
  description?: string
  version?: string
  /** Core modules can never be disabled — the platform depends on them. */
  core?: boolean
  /** Permissions this module contributes to RBAC. The kernel enforces them. */
  permissions?: PermissionDefinition[]
  /** Entries this module contributes to the admin dashboard sidebar. */
  adminNav?: AdminNavItem[]
  /** Domain events this module publishes. */
  emits?: string[]
  /** Domain events this module subscribes to. Populated from `@OnEvent` handlers. */
  listens?: string[]
  /**
   * Drizzle tables this module owns, listed in dependency order (parents before
   * children). Declaring them is what lets backup export and import a module's
   * data without the kernel knowing anything about its schema.
   *
   * Tables the module does not declare are never backed up — which is how
   * session tokens, audit records and object metadata stay out of a data export.
   */
  tables?: PgTable[]
}

/** The module descriptor as seen by the registry, after resolution. */
export interface ResolvedModule {
  manifest: ModuleManifest
  enabled: boolean
}
