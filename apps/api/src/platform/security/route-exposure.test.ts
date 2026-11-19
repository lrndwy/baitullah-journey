import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RequestMethod, type Type } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { resetEnvCache } from '@app/core'
import type { ModuleDescriptor } from '../registry/module-descriptor'
import type { ModuleRegistry } from '../registry/module.registry'
import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY } from './decorators'

/**
 * The guards are global, so a route is protected unless somebody wrote
 * `@Public()` on it. That is exactly the kind of decision that rots silently:
 * one decorator added during a hurried afternoon exposes the user directory.
 *
 * This test reads the decorator metadata off every controller and pins the two
 * sets allowed to exist without a permission check. A new route fails the build
 * until it is either given a permission or added to one of the lists below,
 * which is a deliberate act reviewed in a diff.
 *
 * The module graph is imported lazily: `modules/index.ts` reads the
 * environment at import time, so the required variables have to be in place
 * before that import happens.
 */

/** Reachable with no session at all. */
const PUBLIC_ROUTES = [
  'GET /_meta/modules',
  'GET /_meta/password-policy',
  'GET /health',
  'GET /public/articles',
  'GET /public/articles/:slug',
  'GET /public/categories',
  'GET /public/departures/:id/itineraries',
  'GET /public/galleries',
  'GET /public/galleries/:slug',
  'GET /public/packages',
  'GET /public/packages/:slug',
  'GET /public/testimonials',
  'POST /public/inquiries',
  'GET /ready',
  'GET /settings',
  'GET /settings/assets/:slot',
  'GET /content/articles/:id/thumbnail',
  'GET /content/galleries/:id/images/:imageId/file',
  'GET /content/testimonials/:id/photo',
  'POST /auth/login',
  'POST /auth/password/forgot',
  'POST /auth/password/reset',
  'POST /auth/refresh',
]

/**
 * Requires a session but no permission: self-service. Each one scopes to the
 * caller's own record inside its service, which is why a permission would be
 * the wrong tool — nobody needs a grant to read their own profile.
 */
const SESSION_ONLY_ROUTES = [
  'DELETE /profile/me/avatar',
  'GET /_meta/navigation',
  'GET /_meta/permissions',
  'GET /auth/me',
  'GET /auth/sessions',
  'GET /profile/me',
  'GET /storage/files/:id',
  'PATCH /profile/me',
  'POST /auth/logout',
  'POST /auth/password/change',
  'POST /profile/me/avatar/complete',
  'POST /profile/me/avatar/upload-url',
]

interface Route {
  /** `GET /users/:id` */
  route: string
  isPublic: boolean
  permissions: string[]
}

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://localhost/app',
  JWT_ACCESS_SECRET: 'access-secret-long-enough',
  JWT_REFRESH_SECRET: 'refresh-secret-long-enough',
}

function controllerClasses(
  descriptors: ModuleDescriptor[],
  platform: Type<unknown>,
): Type<unknown>[] {
  const declared = (target: Type<unknown>): Type<unknown>[] =>
    (Reflect.getMetadata('controllers', target) as Type<unknown>[] | undefined) ?? []

  return [
    ...declared(platform),
    ...descriptors.flatMap((descriptor) => declared(descriptor.implementation)),
  ]
}

function collectRoutes(descriptors: ModuleDescriptor[], platform: Type<unknown>): Route[] {
  const routes: Route[] = []

  for (const controller of controllerClasses(descriptors, platform)) {
    const base = Reflect.getMetadata(PATH_METADATA, controller) as string | undefined

    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      if (name === 'constructor') continue
      const handler = controller.prototype[name as keyof typeof controller.prototype] as unknown
      if (typeof handler !== 'function') continue

      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined
      if (path === undefined || method === undefined) continue

      // The guards resolve with getAllAndOverride([handler, class]): method wins.
      const from = <T>(key: string): T | undefined =>
        (Reflect.getMetadata(key, handler) as T | undefined) ??
        (Reflect.getMetadata(key, controller) as T | undefined)

      // `@Controller()` and `@Get()` both leave a bare `/` in the metadata, so
      // the join has to drop empty segments rather than concatenate blindly.
      const segments = [base, path].flatMap((segment) => (segment ?? '').split('/')).filter(Boolean)
      routes.push({
        route: `${RequestMethod[method]} /${segments.join('/')}`,
        isPublic: Boolean(from<boolean>(IS_PUBLIC_KEY)),
        permissions: from<string[]>(REQUIRED_PERMISSIONS_KEY) ?? [],
      })
    }
  }

  return routes.sort((a, b) => a.route.localeCompare(b.route))
}

/**
 * Reported as a diff rather than a bare `toEqual`, so a failure names the route
 * that changed instead of printing two long arrays.
 */
function difference(actual: string[], expected: string[]): { added: string[]; removed: string[] } {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return {
    added: actual.filter((route) => !expectedSet.has(route)),
    removed: expected.filter((route) => !actualSet.has(route)),
  }
}

describe('route exposure', () => {
  let routes: Route[]
  let registry: ModuleRegistry

  beforeAll(async () => {
    Object.assign(process.env, REQUIRED_ENV)
    resetEnvCache()

    const [{ PlatformModule }, { moduleDescriptors }, { ModuleRegistry: Registry }] =
      await Promise.all([
        import('../platform.module'),
        import('../../modules/index'),
        import('../registry/module.registry'),
      ])

    routes = collectRoutes(moduleDescriptors, PlatformModule)
    registry = new Registry(moduleDescriptors)
  })

  afterAll(() => resetEnvCache())

  it('finds every controller, so an empty sweep cannot pass this suite', () => {
    expect(routes.length).toBeGreaterThan(30)
  })

  it('exposes exactly the intended anonymous routes', () => {
    const actual = routes.filter((entry) => entry.isPublic).map((entry) => entry.route)
    expect(difference(actual, PUBLIC_ROUTES)).toEqual({ added: [], removed: [] })
  })

  it('leaves exactly the intended routes without a permission check', () => {
    const actual = routes
      .filter((entry) => !entry.isPublic && entry.permissions.length === 0)
      .map((entry) => entry.route)
    expect(difference(actual, SESSION_ONLY_ROUTES)).toEqual({ added: [], removed: [] })
  })

  it('never marks a route public and permission-protected at the same time', () => {
    const contradictory = routes
      .filter((entry) => entry.isPublic && entry.permissions.length > 0)
      .map((entry) => entry.route)
    expect(contradictory).toEqual([])
  })

  it('only requires permissions the catalogue actually defines', () => {
    const known = new Set(registry.permissionCatalog().map((entry) => entry.key))
    const unknown = routes
      .flatMap((entry) => entry.permissions.map((permission) => `${entry.route} -> ${permission}`))
      .filter((entry) => !known.has(entry.split(' -> ')[1] ?? ''))
    expect(unknown).toEqual([])
  })
})
