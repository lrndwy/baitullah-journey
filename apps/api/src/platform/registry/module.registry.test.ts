import { afterEach, describe, expect, it } from 'vitest'
import { resetEnvCache, type ModuleManifest } from '@app/core'
import { ModuleRegistry } from './module.registry'
import type { ModuleDescriptor } from './module-descriptor'

class Noop {}

function descriptor(manifest: ModuleManifest): ModuleDescriptor {
  return { manifest, implementation: Noop }
}

function withModules(disabled = ''): void {
  process.env.DATABASE_URL = 'postgres://localhost/app'
  process.env.JWT_ACCESS_SECRET = 'access-secret-long-enough'
  process.env.JWT_REFRESH_SECRET = 'refresh-secret-long-enough'
  process.env.MODULES_DISABLED = disabled
  resetEnvCache()
}

afterEach(() => {
  delete process.env.MODULES_DISABLED
  resetEnvCache()
})

const billing = descriptor({
  name: 'billing',
  title: 'Billing',
  core: false,
  permissions: [
    { key: 'billing.invoice.read', description: 'Read invoices' },
    { key: 'shared.thing.read', description: 'Duplicated key' },
  ],
  adminNav: [{ label: 'Invoices', path: '/admin/invoices', permission: 'billing.invoice.read' }],
})

const reports = descriptor({
  name: 'reports',
  title: 'Reports',
  core: false,
  permissions: [{ key: 'shared.thing.read', description: 'Duplicated key' }],
})

describe('ModuleRegistry', () => {
  it('refuses two modules with the same name', () => {
    withModules()
    expect(() => new ModuleRegistry([billing, billing])).toThrowError(/Duplicate module names/)
  })

  it('reports only enabled modules', () => {
    withModules('billing')
    const registry = new ModuleRegistry([billing, reports])

    expect(registry.all()).toHaveLength(2)
    expect(registry.enabled().map((entry) => entry.manifest.name)).toEqual(['reports'])
    expect(registry.manifests().map((manifest) => manifest.name)).toEqual(['reports'])
  })

  it('de-duplicates a permission key contributed by more than one module', () => {
    withModules()
    const registry = new ModuleRegistry([billing, reports])

    const keys = registry.permissionCatalog().map((entry) => entry.key)
    expect(keys).toEqual(['billing.invoice.read', 'shared.thing.read'])
  })

  it('drops the permissions of a disabled module', () => {
    withModules('billing')
    const registry = new ModuleRegistry([billing, reports])

    expect(registry.permissionCatalog().map((entry) => entry.key)).toEqual(['shared.thing.read'])
  })

  it('attributes navigation entries to their owning module', () => {
    withModules()
    const registry = new ModuleRegistry([billing, reports])

    expect(registry.adminNavigation()).toEqual([
      {
        label: 'Invoices',
        path: '/admin/invoices',
        permission: 'billing.invoice.read',
        module: 'billing',
      },
    ])
  })

  it('attributes a request path to its module, and everything else to the platform', () => {
    withModules()
    const registry = new ModuleRegistry([billing, reports])

    expect(registry.moduleForPath('/api/billing/invoices')).toBe('billing')
    expect(registry.moduleForPath('/api/_meta/modules')).toBe('platform')
    expect(registry.moduleForPath('/api/auth/login')).toBe('auth')
    expect(registry.moduleForPath('/health')).toBe('platform')
  })
})