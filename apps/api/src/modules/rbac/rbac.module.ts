import { Module } from '@nestjs/common'
import { BootstrapAdminService } from './bootstrap-admin.service'
import { RbacController } from './rbac.controller'
import { RbacService } from './rbac.service'
import { RbacSetupService } from './rbac-setup.service'

/**
 * BootstrapAdmin runs after RbacSetup in the same module so the `admin` role
 * exists before the env-seeded account is granted it.
 */
@Module({
  controllers: [RbacController],
  providers: [RbacService, RbacSetupService, BootstrapAdminService],
})
export class RbacModule {}