import { Injectable, type OnApplicationBootstrap } from '@nestjs/common'
import { createLogger } from '@app/core'
import { ModuleRegistry } from '../../platform/registry/module.registry'
import { RbacService } from './rbac.service'

const logger = createLogger('rbac')

/**
 * Reconciles the permission catalogue and the built-in roles with the set of
 * installed modules, once the application has wired everything up. This runs
 * after `onApplicationBootstrap` rather than in the constructor so that a
 * failed reconciliation is a startup failure, not a half-built container.
 */
@Injectable()
export class RbacSetupService implements OnApplicationBootstrap {
  constructor(
    private readonly registry: ModuleRegistry,
    private readonly rbac: RbacService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const catalog = this.registry.permissionCatalog()
    const removed = await this.rbac.syncPermissions(catalog)
    await this.rbac.ensureSystemRoles(catalog.map((entry) => entry.key))

    logger.info(
      { permissions: catalog.length, removed, modules: this.registry.enabled().length },
      'permission catalogue synchronised',
    )
  }
}