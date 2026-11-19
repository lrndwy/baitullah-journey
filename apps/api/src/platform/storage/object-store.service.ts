import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  ServiceUnavailableError,
  createLogger,
  getEnv,
  objectStorageConfigured,
  type Logger,
} from '@app/core'

/**
 * Created on first use, for the same reason `rootLogger` is: importing this
 * module must not require a populated environment, or every unit test that
 * touches the object store pays for configuration it never uses.
 */
let logger: Logger | undefined
function log(): Logger {
  logger ??= createLogger('object-store')
  return logger
}

export interface ObjectInfo {
  key: string
  size: number
  contentType: string | undefined
}

/**
 * Reads the HTTP status off an SDK error. The value's shape is not part of the
 * SDK's public types, so this narrows rather than casts.
 */
function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if (!('$metadata' in error)) return undefined
  const metadata = error.$metadata
  if (typeof metadata !== 'object' || metadata === null) return undefined
  if (!('httpStatusCode' in metadata)) return undefined
  const status = metadata.httpStatusCode
  return typeof status === 'number' ? status : undefined
}

/** For a bucket, 403 can also mean "no such bucket" on a gateway that refuses. */
function isMissingBucket(error: unknown): boolean {
  const status = httpStatus(error)
  return status === 404 || status === 403
}

/** The store's request id, so its admin can find the request in its own log. */
function requestIdOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if (!('$metadata' in error)) return undefined
  const metadata = error.$metadata
  if (typeof metadata !== 'object' || metadata === null) return undefined
  if (!('requestId' in metadata)) return undefined
  const requestId = metadata.requestId
  return typeof requestId === 'string' ? requestId : undefined
}

/**
 * The content type of whatever answered. This is the cheapest way to tell the
 * object store from a reverse proxy in front of it: S3 speaks XML, a proxy
 * answering a refusal usually speaks HTML.
 */
function responseContentType(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if (!('$response' in error)) return undefined
  const response = error.$response
  if (typeof response !== 'object' || response === null) return undefined
  if (!('headers' in response)) return undefined
  const headers = response.headers
  if (typeof headers !== 'object' || headers === null) return undefined
  if (!('content-type' in headers)) return undefined
  const contentType = headers['content-type']
  return typeof contentType === 'string' ? contentType : undefined
}

function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if (!('name' in error)) return undefined
  const name = error.name
  return typeof name === 'string' ? name : undefined
}

/**
 * Whether a failed request means "this key does not exist" — the only outcome
 * callers are allowed to read as an empty bucket.
 *
 * A 404 is the unambiguous answer. 403 is deliberately *not* treated as
 * absence: some gateways return it for a missing key when the caller also lacks
 * `s3:ListBucket`, which makes a permission problem look like an empty bucket.
 * The credentials here are the same ones that signed the upload, so a 403 is
 * far more likely to be a real authorisation or configuration fault than a
 * legitimate "not uploaded yet".
 */
/**
 * The size of the whole object, read from a ranged response's
 * `Content-Range: bytes 0-0/142786`. Returns `undefined` when the header is
 * absent or unparseable, which is the signal to fall back to `Content-Length`.
 */
export function totalFromContentRange(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = /bytes \d+-\d+\/(\d+)/.exec(value)
  if (!match?.[1]) return undefined
  const total = Number(match[1])
  return Number.isFinite(total) ? total : undefined
}

export function isMissingObject(error: unknown): boolean {
  if (httpStatus(error) === 404) return true
  const name = errorName(error)
  return name === 'NotFound' || name === 'NoSuchKey'
}

/**
 * The kernel's S3-compatible object store.
 *
 * RustFS, MinIO and MaxIO all speak the S3 API, so the only differences are the
 * endpoint and whether path-style addressing is required — both of which are
 * configuration, not code. Living in the kernel (rather than inside the storage
 * module) lets the backup module read and write the same bucket without the two
 * modules importing each other.
 */
export class ObjectStore {
  private readonly client: S3Client | undefined
  /** Same client unless `S3_PUBLIC_ENDPOINT` names a differently reachable host. */
  private readonly signer: S3Client | undefined
  private readonly bucket: string
  /** Where the API itself reaches the bucket. Reported when a request fails. */
  private readonly endpoint: string | undefined

  constructor() {
    const env = getEnv()
    this.bucket = env.S3_BUCKET
    this.endpoint = env.S3_ENDPOINT

    if (!objectStorageConfigured()) {
      this.client = undefined
      this.signer = undefined
      return
    }

    const credentials = {
      accessKeyId: env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
    }

    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials,
    })

    this.signer = env.S3_PUBLIC_ENDPOINT
      ? new S3Client({
          endpoint: env.S3_PUBLIC_ENDPOINT,
          region: env.S3_REGION,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
          credentials,
        })
      : this.client
  }

  get configured(): boolean {
    return this.client !== undefined
  }

  private require(): S3Client {
    if (!this.client) {
      throw new Error(
        'Object storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.',
      )
    }
    return this.client
  }

  private requireSigner(): S3Client {
    if (!this.signer) throw new Error('Object storage is not configured.')
    return this.signer
  }

  async presignPut(key: string, contentType: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.requireSigner(),
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn },
    )
  }

  async presignGet(key: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.requireSigner(),
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    )
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.require().send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    )
  }

  /**
   * ponytail: buffers the whole object in memory. Fine for documents and
   * backups of modest size; stream through `@aws-sdk/lib-storage` if you need
   * to move multi-gigabyte objects without holding them in RAM.
   */
  async get(key: string): Promise<Buffer> {
    const result = await this.require().send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    const bytes = await result.Body?.transformToByteArray()
    if (!bytes) throw new Error(`Object ${key} has no body`)
    return Buffer.from(bytes)
  }

  /**
   * `undefined` when the key does not exist — the expected "not uploaded" case.
   *
   * Every *other* failure is rethrown rather than folded into `undefined`. An
   * unreachable endpoint, a rejected signature, a wrong bucket and a genuinely
   * absent object are indistinguishable to a bare `catch`, and collapsing them
   * is how a broken `S3_ENDPOINT` gets reported to the operator as "the object
   * was not found in the bucket" — which points at the bucket when the problem
   * is the network.
   */
  async head(key: string): Promise<ObjectInfo | undefined> {
    try {
      const result = await this.require().send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return { key, size: result.ContentLength ?? 0, contentType: result.ContentType }
    } catch (error) {
      if (isMissingObject(error)) return undefined

      if (httpStatus(error) === 403) {
        // A CDN or WAF in front of the object store can refuse HEAD requests
        // while serving GET normally — observed against a Cloudflare-fronted
        // RustFS, where the same existing object answered 200 to fourteen HEADs
        // and 403 to the fifteenth, and a GET never failed once in 120 attempts.
        // A one-byte ranged GET returns the same three facts this method owes
        // its callers (existence, size, content type), so try it before giving
        // up on a verification the upload itself has already proven possible.
        const probe = await this.probeByRange(key).then(
          (info) => ({ reached:true as const, info }),
          (rangeError: unknown) => ({ reached:false as const, rangeError }),
        )

        if (probe.reached) {
          if (probe.info) {
            log().warn(
              { key, endpoint: this.endpoint, status: 403 },
              'HEAD was refused; the object was verified with a ranged GET instead. Something between this container and the object store is blocking HEAD requests.',
            )
            return probe.info
          }
          // The ranged GET says the key genuinely is not there, so the refused
          // HEAD was not hiding anything. Report absence as absence.
          return undefined
        }

        /*
         * Both requests were refused. Report the ranged GET's failure, not the
         * HEAD's: a HEAD response has no body, so the SDK cannot read the error
         * XML and reports the useless `Unknown` — while the ranged GET returns
         * the same 403 *with* a body, which is where `InvalidAccessKeyId`,
         * `SignatureDoesNotMatch` and `AccessDenied` actually live. Preferring
         * the opaque error here is what hides the cause of a misconfigured
         * endpoint behind a generic message.
         */
        const refused = probe.rangeError

        throw new ServiceUnavailableError({
          code: 'storage_unauthorized',
          message: `Object storage refused the credentials used to read "${key}" from bucket "${this.bucket}" at ${this.endpoint ?? '(unset)'}: ${errorName(refused) ?? 'unknown error'}`,
          details: {
            endpoint: this.endpoint,
            bucket: this.bucket,
            status: httpStatus(refused) ?? 403,
            // The reason from the request that could explain itself.
            reason: errorName(refused),
            requestId: requestIdOf(refused),
            respondedWith: responseContentType(refused),
            hint: 'The access key is rejected, not the object missing. Confirm S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY belong to the store at S3_ENDPOINT — S3_ENDPOINT and S3_PUBLIC_ENDPOINT must reach the same one, or the browser uploads to a store the API cannot read. Run node apps/api/scripts/diagnose-storage.mjs to compare.',
          },
          cause: refused,
        })
      }

      throw new ServiceUnavailableError({
        code: 'storage_unavailable',
        message: `Could not read "${key}" from bucket "${this.bucket}" at ${this.endpoint ?? '(unset)'}`,
        details: {
          endpoint: this.endpoint,
          bucket: this.bucket,
          status: httpStatus(error),
          reason: errorName(error),
          // The store's own id for this request — what its admin needs to find it.
          requestId: requestIdOf(error),
          // `text/html` here means a proxy answered, not the object store.
          respondedWith: responseContentType(error),
        },
        cause: error,
      })
    }
  }

  /**
   * Reads existence, size and content type with a one-byte ranged GET.
   *
   * Used only when HEAD is refused, and never for an object that does not exist:
   * a missing key answers 404 here exactly as it does to HEAD.
   */
  private async probeByRange(key: string): Promise<ObjectInfo | undefined> {
    try {
      const result = await this.require().send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: 'bytes=0-0' }),
      )
      // The one byte has to be consumed, or the connection is left dangling.
      await result.Body?.transformToByteArray().catch(() => undefined)

      return {
        key,
        size: totalFromContentRange(result.ContentRange) ?? result.ContentLength ?? 0,
        contentType: result.ContentType,
      }
    } catch (error) {
      if (isMissingObject(error)) return undefined
      throw error
    }
  }

  /** For the boot log, so a mismatch with the browser-facing endpoint is visible. */
  get location(): { endpoint: string | undefined; bucket: string } {
    return { endpoint: this.endpoint, bucket: this.bucket }
  }

  /**
   * Creates the bucket if it is missing, so the platform works against a
   * freshly started RustFS, MinIO or MaxIO without a manual console step — and
   * without depending on any one vendor's CLI. Called once at boot; a bucket
   * that already exists costs one HEAD request.
   */
  async ensureBucket(): Promise<{ created: boolean }> {
    const client = this.require()

    try {
      await client.send(new HeadBucketCommand({ Bucket: this.bucket }))
      return { created: false }
    } catch (error) {
      // 404 is "no such bucket". 403 can also mean that on some gateways, so a
      // create attempt is the honest next step; a genuinely forbidden bucket
      // fails the create and surfaces the real error instead.
      if (!isMissingBucket(error)) throw error

      await client.send(new CreateBucketCommand({ Bucket: this.bucket }))
      return { created: true }
    }
  }

  async remove(key: string): Promise<void> {
    await this.require().send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: [{ Key: key }] },
      }),
    )
  }

  /**
   * Installs the bucket CORS policy required for browser uploads.
   *
   * The browser PUTs directly to object storage, which is a cross-origin
   * request — without an `Access-Control-Allow-Origin` header the preflight
   * fails and the upload never starts. Server-side callers never notice, which
   * is exactly why this has to be provisioned rather than assumed.
   *
   * Returns the origins that were allowed, so boot can log them.
   */
  async ensureCorsPolicy(origins: string[]): Promise<string[]> {
    if (origins.length === 0) return []

    await this.require().send(
      new PutBucketCorsCommand({
        Bucket: this.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: origins,
              AllowedMethods: ['PUT', 'GET', 'HEAD'],
              // Presigned PUTs carry a content type, and browsers send preflight
              // headers that must be echoed back as allowed.
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    )

    return origins
  }

  /** Returns how many objects were deleted. Used by backup restore. */
  async removePrefix(prefix: string): Promise<number> {
    const client = this.require()
    let removed = 0
    let token: string | undefined

    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      )
      const keys = (page.Contents ?? []).flatMap((entry) => (entry.Key ? [{ Key: entry.Key }] : []))
      if (keys.length > 0) {
        await client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }))
        removed += keys.length
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)

    return removed
  }

  /** Every key under a prefix, for backup export. */
  async listPrefix(prefix: string): Promise<ObjectInfo[]> {
    const client = this.require()
    const found: ObjectInfo[] = []
    let token: string | undefined

    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      )
      for (const entry of page.Contents ?? []) {
        if (entry.Key) found.push({ key: entry.Key, size: entry.Size ?? 0, contentType: undefined })
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)

    return found
  }
}
