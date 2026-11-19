import { Global, Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { moduleDescriptors } from '../modules/index'
import { AllExceptionsFilter } from './http/all-exceptions.filter'
import { HealthController } from './health/health.controller'
import { MetaController } from './meta/meta.controller'
import { platformProviders } from './providers'
import { ModuleRegistry } from './registry/module.registry'
import { AuditInterceptor } from './audit/audit.interceptor'
import { AuditRecorderService } from './audit/audit-recorder.service'
import { AuthGuard } from './security/auth.guard'
import { PermissionResolver } from './security/permission-resolver.service'
import { PermissionsGuard } from './security/permissions.guard'
import { RateLimitGuard } from './security/rate-limit.guard'
import { TokenService } from './security/token.service'
import { APP_ENV, AUDIT_RECORDER, DATABASE, EVENT_BUS, LOGGER, MODULE_DESCRIPTORS, REDIS } from './tokens'
import { Mailer } from '@app/core'
import { ImageUploadService } from './storage/image-upload.service'
import { ObjectStore } from './storage/object-store.service'
import { StorageSetupService } from './storage/storage-setup.service'

/**
 * The kernel. It is global so feature modules can inject `DATABASE`, `REDIS`,
 * `EVENT_BUS`, `LOGGER` and `TokenService` without importing anything, and it
 * owns the three guards and the exception filter that every route goes through.
 *
 * Guard order is significant: rate limiting runs first (cheap, Redis-only),
 * then authentication, then permission checks.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [HealthController, MetaController],
  providers: [
    ...platformProviders,
    { provide: MODULE_DESCRIPTORS, useValue: moduleDescriptors },
    ModuleRegistry,
    TokenService,
    PermissionResolver,
    AuthGuard,
    PermissionsGuard,
    RateLimitGuard,
    AuditRecorderService,
    AuditInterceptor,
    StorageSetupService,
    { provide: AUDIT_RECORDER, useExisting: AuditRecorderService },
    { provide: APP_GUARD, useExisting: RateLimitGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useExisting: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [
    APP_ENV,
    LOGGER,
    DATABASE,
    REDIS,
    EVENT_BUS,
    Mailer,
    ObjectStore,
    ImageUploadService,
    MODULE_DESCRIPTORS,
    ModuleRegistry,
    TokenService,
    PermissionResolver,
    AuthGuard,
    AUDIT_RECORDER,
  ],
})
export class PlatformModule {}