import { type Provider } from '@nestjs/common'
import {
  Mailer,
  createDatabase,
  createRedisClient,
  EventBus,
  getEnv,
  rootLogger,
  type Env,
} from '@app/core'
import { APP_ENV, DATABASE, EVENT_BUS, LOGGER, REDIS } from './tokens'
import { LifecycleService } from './lifecycle.service'
import { ImageUploadService } from './storage/image-upload.service'
import { ObjectStore } from './storage/object-store.service'

/**
 * The kernel's shared primitives. Feature modules receive these through Nest's
 * DI and never construct their own pools, clients or loggers.
 */
export const platformProviders: Provider[] = [
  { provide: APP_ENV, useFactory: (): Env => getEnv() },
  { provide: LOGGER, useFactory: () => rootLogger() },
  { provide: EVENT_BUS, useFactory: () => new EventBus() },
  { provide: DATABASE, useFactory: () => createDatabase() },
  { provide: REDIS, useFactory: () => createRedisClient() },
  Mailer,
  ObjectStore,
  ImageUploadService,
  LifecycleService,
]