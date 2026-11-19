import { Injectable, type OnApplicationBootstrap } from '@nestjs/common'
import { corsOrigins, createLogger } from '@app/core'
import { ObjectStore } from '../storage/object-store.service'

const logger = createLogger('storage')

/**
 * Prepares the bucket on boot when object storage is configured.
 *
 * Doing this in the application rather than in a `mc`/`aws` sidecar keeps the
 * platform portable across S3-compatible servers: RustFS, MinIO and MaxIO do
 * not share a CLI, but they all implement the same bucket API.
 */
@Injectable()
export class StorageSetupService implements OnApplicationBootstrap {
  constructor(private readonly objects: ObjectStore) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.objects.configured) {
      logger.info('object storage not configured — file and backup endpoints are disabled')
      return
    }

    try {
      const { created } = await this.objects.ensureBucket()
      logger.info(
        { created, ...this.objects.location },
        created ? 'bucket created' : 'bucket present',
      )
    } catch (error) {
      // A missing bucket must not stop the API from serving everything else.
      logger.error(
        { err: error, ...this.objects.location },
        'could not reach object storage at boot — uploads will fail, and every completion will report the object as missing',
      )
      return
    }

    try {
      // Without this, browsers cannot PUT to a presigned URL: the request is
      // cross-origin and the preflight is refused.
      const origins = await this.objects.ensureCorsPolicy(corsOrigins())
      logger.info({ origins }, 'bucket CORS policy applied')
    } catch (error) {
      // Some S3-compatible servers do not implement PutBucketCors. Uploads from
      // a server-side client still work; say so instead of failing the boot.
      logger.warn(
        { err: error },
        'could not apply the bucket CORS policy — browser uploads will fail unless the bucket is configured externally',
      )
    }
  }
}