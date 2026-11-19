import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  buildPage,
  decodeCursor,
  keysetCondition,
  normalizeLimit,
  type AuthPrincipal,
  type DatabaseHandle,
  type EventBus,
  type Page,
} from '@app/core'
import type {
  FileVisibility,
  ListFilesQuery,
  StoredFile,
  StoredFileWithUrl,
  UploadSignatureInput,
  UploadSignatureResponse,
} from '@app/contracts'
import { DATABASE, EVENT_BUS } from '../../platform/tokens'
import { ObjectStore } from '../../platform/storage/object-store.service'
import { MAX_UPLOAD_BYTES, buildObjectKey } from './storage.manifest'
import { files } from './storage.schema'

const UPLOAD_TTL_SECONDS = 900
const DOWNLOAD_TTL_SECONDS = 900

@Injectable()
export class StorageService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    private readonly objects: ObjectStore,
  ) {}

  /**
   * Step one of an upload. The bytes never pass through the API: the client
   * PUTs straight to the bucket, which is what keeps a large upload from
   * occupying an API worker.
   */
  async createUploadSignature(
    input: UploadSignatureInput,
    ownerId: string,
  ): Promise<UploadSignatureResponse> {
    this.requireStorage()

    if (input.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestError(`Files larger than ${MAX_UPLOAD_BYTES} bytes are not accepted`)
    }

    const key = buildObjectKey(input.filename)
    const [row] = await this.database.db
      .insert(files)
      .values({
        key,
        filename: input.filename.split(/[\\/]/).pop() ?? input.filename,
        contentType: input.contentType,
        size: input.size,
        visibility: input.visibility,
        status: 'pending',
        ownerId,
      })
      .returning({ id: files.id })

    if (!row) throw new Error('Failed to record the upload')

    return {
      fileId: row.id,
      key,
      uploadUrl: await this.objects.presignPut(key, input.contentType, UPLOAD_TTL_SECONDS),
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
    }
  }

  /**
   * Step two: the client reports the upload finished, and the bucket is asked
   * whether that is true. A record only becomes `ready` once the object is
   * actually there, so a signature that was never used leaves a pending row
   * rather than a phantom file.
   */
  async completeUpload(fileId: string, ownerId: string, canManageAny: boolean): Promise<StoredFile> {
    this.requireStorage()

    const existing = await this.findRow(fileId)
    this.assertCanAccess(existing, ownerId, canManageAny)

    const head = await this.objects.head(existing.key)
    if (!head) throw new BadRequestError('The object was not found in the bucket')

    const [updated] = await this.database.db
      .update(files)
      .set({ status: 'ready', size: head.size, updatedAt: new Date() })
      .where(eq(files.id, fileId))
      .returning()

    if (!updated) throw new NotFoundError('File not found')

    await this.events.emit('storage.file.uploaded', {
      fileId: updated.id,
      key: updated.key,
      ownerId,
    })

    return toStoredFile(updated)
  }

  async list(
    query: ListFilesQuery,
    principal: AuthPrincipal,
    canManageAny: boolean,
  ): Promise<Page<StoredFileWithUrl>> {
    this.requireStorage()

    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined

    const base: SQL[] = [eq(files.status, 'ready')]
    // Without the broad permission a caller only ever sees their own files.
    if (!canManageAny) base.push(eq(files.ownerId, principal.userId))
    if (query.visibility) base.push(eq(files.visibility, query.visibility))
    if (query.search) base.push(ilike(files.filename, `%${query.search}%`))

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(files.createdAt, files.id, position)
      if (keyset) filters.push(keyset)
    }

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(files)
        .where(and(...base)),
      this.database.db
        .select()
        .from(files)
        .where(and(...filters))
        .orderBy(desc(files.createdAt), desc(files.id))
        .limit(pageSize + 1),
    ])

    const total = countRows[0]?.total ?? 0
    const page = buildPage(rows, pageSize, total)
    const items = await Promise.all(page.items.map((row) => this.withUrl(toStoredFile(row))))

    return { ...page, items }
  }

  async findOne(fileId: string, ownerId: string, canManageAny: boolean): Promise<StoredFileWithUrl> {
    this.requireStorage()

    const row = await this.findRow(fileId)
    this.assertCanAccess(row, ownerId, canManageAny)
    return this.withUrl(toStoredFile(row))
  }

  async remove(fileId: string, ownerId: string, canManageAny: boolean): Promise<void> {
    this.requireStorage()

    const row = await this.findRow(fileId)
    this.assertCanAccess(row, ownerId, canManageAny)

    // The object goes first: an orphaned record can be retried, an orphaned
    // object leaks forever.
    await this.objects.remove(row.key)
    await this.database.db.delete(files).where(eq(files.id, fileId))

    await this.events.emit('storage.file.deleted', { fileId, key: row.key })
  }

  /**
   * Deletes many files. Objects are removed one by one before their rows, so a
   * partial failure leaves orphaned records (retryable) rather than orphaned
   * bytes (which leak forever).
   */
  async removeMany(ids: string[], ownerId: string, canManageAny: boolean): Promise<number> {
    this.requireStorage()

    const rows = await this.database.db.select().from(files).where(inArray(files.id, ids))

    let removed = 0
    for (const row of rows) {
      try {
        this.assertCanAccess(row, ownerId, canManageAny)
      } catch {
        // Skipping a file the caller may not touch is preferable to failing the
        // whole batch on someone else's row.
        continue
      }
      await this.objects.remove(row.key)
      removed += 1
    }

    if (removed > 0) {
      const deletable = rows.filter(
        (row) => canManageAny || row.ownerId === ownerId || row.visibility === 'public',
      )
      await this.database.db.delete(files).where(
        inArray(
          files.id,
          deletable.map((row) => row.id),
        ),
      )
    }

    return removed
  }

  private async withUrl(file: StoredFile): Promise<StoredFileWithUrl> {
    return {
      ...file,
      url: await this.objects.presignGet(file.key, DOWNLOAD_TTL_SECONDS),
    }
  }

  private async findRow(fileId: string) {
    const [row] = await this.database.db.select().from(files).where(eq(files.id, fileId)).limit(1)
    if (!row) throw new NotFoundError('File not found')
    return row
  }

  /** Public files are readable by any signed-in caller; private ones are not. */
  private assertCanAccess(
    row: { ownerId: string | null; visibility: string },
    ownerId: string,
    canManageAny: boolean,
  ): void {
    if (canManageAny || row.ownerId === ownerId || row.visibility === 'public') return
    throw new ForbiddenError('This file belongs to another user')
  }

  private requireStorage(): void {
    if (!this.objects.configured) {
      throw new ServiceUnavailableError({
        code: 'storage_not_configured',
        message: 'Object storage is not configured on this deployment',
      })
    }
  }
}

function toStoredFile(row: {
  id: string
  key: string
  filename: string
  contentType: string
  size: number
  visibility: string
  status: string
  ownerId: string | null
  createdAt: Date
}): StoredFile {
  return {
    id: row.id,
    key: row.key,
    filename: row.filename,
    contentType: row.contentType,
    size: row.size,
    visibility: row.visibility as FileVisibility,
    status: row.status as StoredFile['status'],
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
  }
}