import { Controller, Get, Inject } from '@nestjs/common'
import type { AdminNavItem, AuthPrincipal, Env, PermissionMeta } from '@app/core'
import { CurrentPrincipal, Public } from '../security/decorators'
import { ModuleRegistry } from '../registry/module.registry'
import { activePasswordPolicySummary } from '../security/password-policy'
import { APP_ENV } from '../tokens'

/**
 * The kernel's introspection surface. The admin dashboard reads this once per
 * session to discover which modules are installed and which navigation entries
 * the current user is allowed to see — so installing or removing a module never
 * requires a frontend change.
 */
@Controller('_meta')
export class MetaController {
  constructor(
    private readonly registry: ModuleRegistry,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  @Public()
  @Get('modules')
  modules(): {
    modules: { name: string; title: string; description?: string; version?: string; core: boolean }[]
  } {
    return {
      modules: this.registry.enabled().map(({ manifest }) => ({
        name: manifest.name,
        title: manifest.title,
        description: manifest.description,
        version: manifest.version,
        core: manifest.core ?? false,
      })),
    }
  }

  @Get('navigation')
  navigation(@CurrentPrincipal() principal: AuthPrincipal): {
    items: (AdminNavItem & { module: string })[]
  } {
    const items = this.registry
      .adminNavigation()
      .filter((item) => !item.permission || principal.permissions.includes(item.permission))

    return { items }
  }

  @Get('permissions')
  permissions(): { permissions: PermissionMeta[] } {
    return {
      permissions: this.registry.permissionCatalog().map(({ key, description, module }) => ({
        key,
        description,
        module,
      })),
    }
  }

  /**
   * The active password policy. Public on purpose: the sign-up and reset forms
   * render these rules before the user types, and a policy that can only be
   * discovered by failing a submit is a policy nobody reads.
   */
  @Public()
  @Get('password-policy')
  passwordPolicy(): ReturnType<typeof activePasswordPolicySummary> {
    return activePasswordPolicySummary(this.env)
  }
}