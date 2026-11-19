import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * This module is what makes one web image run in any environment. The failure
 * it exists to prevent is silent: if the browser-facing origin falls back to
 * the build-time default, every request goes to `localhost:3000` and the page
 * simply does not work in the deployed environment.
 *
 * `process.env` is read at call time rather than captured in a module constant,
 * so the module is re-imported for each case with the environment in place.
 */
const BUILD_DEFAULT = 'http://localhost:3000'

async function load(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return import('./runtime-config')
}

const MANAGED = ['API_PUBLIC_URL', 'API_INTERNAL_URL', 'NEXT_PUBLIC_API_URL']

afterEach(() => {
  for (const key of MANAGED) delete process.env[key]
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('apiPublicUrl on the server', () => {
  it('prefers API_PUBLIC_URL over the build-time default', async () => {
    const { apiPublicUrl } = await load({ API_PUBLIC_URL: 'https://api.example.com' })
    expect(apiPublicUrl()).toBe('https://api.example.com')
  })

  it('falls back to the build-time default when nothing is set', async () => {
    const { apiPublicUrl } = await load({ NEXT_PUBLIC_API_URL: BUILD_DEFAULT })
    expect(apiPublicUrl()).toBe(BUILD_DEFAULT)
  })
})

describe('apiPublicUrl in the browser', () => {
  it('prefers the injected runtime config over every build-time value', async () => {
    // The bundle inlined `NEXT_PUBLIC_API_URL` at build time; the injected
    // global is what the operator set at container start and must win.
    const { apiPublicUrl } = await load({ NEXT_PUBLIC_API_URL: BUILD_DEFAULT })
    vi.stubGlobal('window', { __APP_CONFIG__: { apiPublicUrl: 'https://live.example.com' } })

    expect(apiPublicUrl()).toBe('https://live.example.com')
  })

  it('falls back to the build-time default when the script did not run', async () => {
    const { apiPublicUrl } = await load({ NEXT_PUBLIC_API_URL: BUILD_DEFAULT })
    vi.stubGlobal('window', Object.create(null))

    expect(apiPublicUrl()).toBe(BUILD_DEFAULT)
  })

  it('ignores the server-only variable, which never reaches the browser', async () => {
    const { apiPublicUrl } = await load({
      API_PUBLIC_URL: 'https://server-only.example.com',
      NEXT_PUBLIC_API_URL: BUILD_DEFAULT,
    })
    vi.stubGlobal('window', Object.create(null))

    // `API_PUBLIC_URL` is not `NEXT_PUBLIC_*`, so it is undefined in the bundle
    // regardless of what the container was given.
    expect(apiPublicUrl()).toBe(BUILD_DEFAULT)
  })
})

describe('internalApiUrl', () => {
  it('prefers the in-cluster URL for server-side fetches', async () => {
    const { internalApiUrl } = await load({
      API_INTERNAL_URL: 'http://api:3000',
      API_PUBLIC_URL: 'https://api.example.com',
    })
    expect(internalApiUrl()).toBe('http://api:3000')
  })

  it('falls back to the browser-facing origin when no internal URL is set', async () => {
    const { internalApiUrl } = await load({ API_PUBLIC_URL: 'https://api.example.com' })
    expect(internalApiUrl()).toBe('https://api.example.com')
  })
})
