import { createServer, type Server } from 'node:http'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { resetEnvCache } from '@app/core'
import { ObjectStore, totalFromContentRange } from './object-store.service'

/**
 * Some CDNs and WAFs in front of an object store refuse `HEAD` while serving
 * `GET` normally. Observed against a Cloudflare-fronted RustFS: the same
 * existing object answered 200 to fourteen HEADs and 403 to the fifteenth, and
 * a GET never failed once in 120 attempts. The upload had already succeeded, so
 * failing the verification on a refused HEAD rejected a file that was sitting
 * in the bucket.
 *
 * These tests run a server that reproduces exactly that: HEAD is always 403,
 * a one-byte ranged GET always answers.
 */

const KEY = 'files/2026/10/probe.pdf'
const SIZE = 142786
const TYPE = 'application/pdf'

let server: Server
let base: string
let headRequests = 0
let rangeRequests = 0
/** Whentrue, every signed request is refused the way a wrong access key is. */
let refuseEverything =false

const ACCESS_DENIED = '<?xml version="1.0"?><Error><Code>InvalidAccessKeyId</Code><Message>The Access Key Id you provided does not exist in our records.</Message></Error>'

beforeAll(async () => {
  server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    // Path-style addressing: the first segment is the bucket.
    const key = path.replace(/^\/[^/]+\//, '')

    if (request.headers.range === 'bytes=0-0') rangeRequests += 1

    if (refuseEverything) {
      // A refused GET carries a readable body; a refused HEAD cannot.
      response.writeHead(403, { 'content-type': 'application/xml' })
      response.end(request.method === 'HEAD' ? '' : ACCESS_DENIED)
      return
    }

    if (key !== KEY) {
      response.writeHead(404, { 'content-type': 'application/xml' })
      response.end('<?xml version="1.0"?><Error><Code>NoSuchKey</Code></Error>')
      return
    }

    if (request.method === 'HEAD') {
      headRequests += 1
      response.writeHead(403, { 'content-type': 'application/xml' })
      response.end('<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>')
      return
    }

    if (request.headers.range === 'bytes=0-0') {
      response.writeHead(206, {
        'content-type': TYPE,
        'content-range': `bytes 0-0/${SIZE}`,
        'content-length': '1',
      })
      response.end('x')
      return
    }

    response.writeHead(200, { 'content-type': TYPE, 'content-length': String(SIZE) })
    response.end(Buffer.alloc(SIZE))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
})

afterAll(() => new Promise<void>((resolve) => void server.close(() => resolve())))

afterEach(() => {
  headRequests = 0
  rangeRequests = 0
  refuseEverything =false
})

function store(): ObjectStore {
  Object.assign(process.env, {
    DATABASE_URL: 'postgres://localhost/app',
    JWT_ACCESS_SECRET: 'access-secret-long-enough',
    JWT_REFRESH_SECRET: 'refresh-secret-long-enough',
    S3_ENDPOINT: base,
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY_ID: 'test-key',
    S3_SECRET_ACCESS_KEY: 'test-secret',
    S3_BUCKET: 'app',
    S3_FORCE_PATH_STYLE: 'true',
  })
  delete process.env.S3_PUBLIC_ENDPOINT
  resetEnvCache()
  return new ObjectStore()
}

describe('totalFromContentRange', () => {
  it('reads the size of the whole object out of a ranged response', () => {
    expect(totalFromContentRange('bytes 0-0/142786')).toBe(142786)
    expect(totalFromContentRange('bytes 0-1023/2048')).toBe(2048)
  })

  it('returns undefined when there is nothing to read', () => {
    for (const value of [undefined, '', 'bytes 0-0/*', 'garbage', 'bytes 0-0/abc']) {
      expect(totalFromContentRange(value)).toBeUndefined()
    }
  })
})

describe('ObjectStore.head when the endpoint refuses HEAD', () => {
  it('still reports the object, by falling back to a ranged GET', async () => {
    const objects = store()

    await expect(objects.head(KEY)).resolves.toEqual({ key: KEY, size: SIZE, contentType: TYPE })
    expect(headRequests).toBe(1)
    expect(rangeRequests).toBe(1)
  })

  it('reports the reason from the ranged GET, not the HEAD\'s unreadable one', async () => {
    const objects = store()
    refuseEverything =true

    // This is the case that used to be reported as a bare `Unknown`: HEAD is
    // refused and cannot explain itself, while the ranged GET returns the same
    // 403 with a body naming the cause.
    await expect(objects.head(KEY)).rejects.toMatchObject({
      code: 'storage_unauthorized',
      message: expect.stringContaining('InvalidAccessKeyId'),
      details: expect.objectContaining({ status: 403, reason: 'InvalidAccessKeyId' }),
    })
    expect(rangeRequests).toBe(1)
  })

  it('still reports absence as absence, without a second request', async () => {
    const objects = store()

    // A missing key answers 404 here, so the fallback must not be reached — the
    // distinction between "refused" and "not there" has to survive.
    await expect(objects.head('files/2026/10/missing.pdf')).resolves.toBeUndefined()
    expect(rangeRequests).toBe(0)
  })
})
