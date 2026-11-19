import 'reflect-metadata'
import './bootstrap-env'
import { NestFactory } from '@nestjs/core'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import {
  CORE_MIGRATIONS_DIR,
  corsOrigins,
  createLogger,
  getEnv,
  isModuleEnabled,
  runMigrations,
  type DatabaseHandle,
  type MigrationSource,
} from '@app/core'
import { AppModule } from './app.module'
import { requestContext } from './platform/http/request-context.middleware'
import { moduleDescriptors } from './modules/index'
import { DATABASE } from './platform/tokens'

async function bootstrap(): Promise<void> {
  const env = getEnv()
  const logger = createLogger('bootstrap')

  const app = await NestFactory.create(AppModule, {
    logger: env.LOG_LEVEL === 'silent' ? false : ['error', 'warn', 'log'],
  })

  app.use(requestContext)
  app.use(helmet())
  app.use(compression())
  app.use(cookieParser())
  app.enableCors({ origin: corsOrigins(), credentials: true })
  app.enableShutdownHooks()
  app.setGlobalPrefix('api', { exclude: ['health', 'ready'] })

  // Every module brings its own migrations; core owns the kernel schema.
  const sources: MigrationSource[] = [{ name: 'core', dir: CORE_MIGRATIONS_DIR }]
  for (const descriptor of moduleDescriptors) {
    if (!isModuleEnabled(descriptor.manifest.name, descriptor.manifest.core)) continue
    if (descriptor.migrationsDir) {
      sources.push({ name: descriptor.manifest.name, dir: descriptor.migrationsDir })
    }
  }
  const database = app.get<DatabaseHandle>(DATABASE)
  const applied = await runMigrations(database.pool, sources)
  logger.info({ applied: applied.length }, 'migrations up to date')

  await app.listen(env.PORT)

  const enabled = moduleDescriptors
    .filter((d) => isModuleEnabled(d.manifest.name, d.manifest.core))
    .map((d) => d.manifest.name)
  logger.info({ port: env.PORT, environment: env.NODE_ENV, modules: enabled }, 'api listening')
}

void bootstrap().catch((error: unknown) => {
  // Config and migration failures happen before the logger is configured, so
  // this is intentionally console: the process is about to die.
  console.error('API failed to start:', error)
  process.exit(1)
})
