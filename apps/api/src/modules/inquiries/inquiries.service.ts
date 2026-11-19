import { Inject, Injectable } from '@nestjs/common'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  buildPage,
  decodeCursor,
  keysetCondition,
  normalizeLimit,
  type DatabaseHandle,
  type EventBus,
} from '@app/core'
import type {
  CreateInquiryInput,
  Inquiry,
  InquiryListResponse,
  InquiryStatus,
  ListInquiriesQuery,
  UpdateInquiryStatusInput,
} from '@app/contracts'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { DATABASE, EVENT_BUS } from '../../platform/tokens'
import { inquiries } from './inquiries.schema'
import { canTransition, quotaEffectForTransition } from './inquiry-transitions'

type InquiryRow = typeof inquiries.$inferSelect

@Injectable()
export class InquiriesService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
  ) {}

  async createPublic(input: CreateInquiryInput): Promise<Inquiry> {
    const pkgRows = await this.database.db.execute<{ id: string; name: string; status: string }>(sql`
      select id, name, status
      from packages.packages
      where id = ${input.packageId}::uuid
      limit 1
    `)
    const pkg = pkgRows.rows[0]
    if (!pkg || pkg.status !== 'published') {
      throw new BadRequestError('Paket tidak tersedia untuk pemesanan')
    }

    const departureRows = await this.database.db.execute<{
      id: string
      package_id: string
      status: string
      departure_date: string
    }>(sql`
      select id, package_id, status, departure_date
      from packages.departures
      where id = ${input.departureId}::uuid
      limit 1
    `)
    const departure = departureRows.rows[0]
    if (!departure || departure.package_id !== input.packageId) {
      throw new BadRequestError('Jadwal keberangkatan tidak valid')
    }
    if (departure.status !== 'open') {
      throw new BadRequestError('Jadwal keberangkatan tidak terbuka untuk pemesanan')
    }

    const [row] = await this.database.db
      .insert(inquiries)
      .values({
        packageId: input.packageId,
        departureId: input.departureId,
        customerName: input.customerName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        paxCount: input.paxCount,
        notes: input.notes ?? null,
        preferredContact: input.preferredContact,
        status: 'baru',
        quotaApplied: false,
      })
      .returning()

    if (!row) throw new Error('Failed to create inquiry')
    await this.events.emit('inquiries.created', { id: row.id })
    return this.toInquiry(row, pkg.name, departure.departure_date)
  }

  async list(query: ListInquiriesQuery): Promise<InquiryListResponse> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined
    const filters: SQL[] = []
    if (query.status) filters.push(eq(inquiries.status, query.status))
    if (query.packageId) filters.push(eq(inquiries.packageId, query.packageId))
    if (query.q) {
      const term = `%${query.q}%`
      filters.push(
        or(ilike(inquiries.customerName, term), ilike(inquiries.email, term), ilike(inquiries.phone, term))!,
      )
    }
    if (position) {
      const keyset = keysetCondition(inquiries.createdAt, inquiries.id, position)
      if (keyset) filters.push(keyset)
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(inquiries)
        .where(where),
      this.database.db
        .select()
        .from(inquiries)
        .where(where)
        .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(rows, pageSize, countRows[0]?.total ?? 0)
    const items = await Promise.all(page.items.map((row) => this.withNames(row)))
    return { ...page, items }
  }

  async findById(id: string): Promise<Inquiry> {
    const [row] = await this.database.db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1)
    if (!row) throw new NotFoundError('Pemesanan tidak ditemukan')
    return this.withNames(row)
  }

  async updateStatus(id: string, input: UpdateInquiryStatusInput): Promise<Inquiry> {
    await this.database.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(inquiries).where(eq(inquiries.id, id)).limit(1)
      if (!existing) throw new NotFoundError('Pemesanan tidak ditemukan')

      const from = existing.status as InquiryStatus
      const to = input.status
      if (from === to) {
        if (input.adminNotes !== undefined) {
          await tx
            .update(inquiries)
            .set({ adminNotes: input.adminNotes, updatedAt: new Date() })
            .where(eq(inquiries.id, id))
        }
        return
      }

      if (!canTransition(from, to)) {
        throw new BadRequestError(`Status tidak dapat diubah dari ${from} ke ${to}`)
      }

      const effect = quotaEffectForTransition({
        from,
        to,
        paxCount: existing.paxCount,
        quotaApplied: existing.quotaApplied,
      })

      if (effect) {
        const locked = await tx.execute<{
          id: string
          quota: number
          available_quota: number
          status: string
        }>(sql`
          select id, quota, available_quota, status
          from packages.departures
          where id = ${existing.departureId}::uuid
          for update
        `)
        const departure = locked.rows[0]
        if (!departure) throw new NotFoundError('Jadwal keberangkatan tidak ditemukan')

        const nextAvailable = Number(departure.available_quota) + effect.availableQuotaDelta
        if (nextAvailable < 0) {
          throw new ConflictError('Kuota tidak mencukupi untuk konfirmasi ini')
        }
        if (nextAvailable > Number(departure.quota)) {
          throw new ConflictError('Kuota tersedia melebihi total kuota')
        }

        let nextStatus = departure.status
        if (effect.markFullIfZero && nextAvailable === 0 && departure.status === 'open') {
          nextStatus = 'full'
        }
        if (effect.reopenIfSeats && nextAvailable > 0 && departure.status === 'full') {
          nextStatus = 'open'
        }

        await tx.execute(sql`
          update packages.departures
          set available_quota = ${nextAvailable},
              status = ${nextStatus},
              updated_at = now()
          where id = ${departure.id}::uuid
        `)
      }

      await tx
        .update(inquiries)
        .set({
          status: to,
          quotaApplied: effect ? effect.quotaApplied : existing.quotaApplied,
          ...(input.adminNotes === undefined ? {} : { adminNotes: input.adminNotes }),
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id))

      await this.events.emit('inquiries.status_changed', { id, from, to })
    })

    return this.findById(id)
  }

  private async withNames(row: InquiryRow): Promise<Inquiry> {
    const names = await this.database.db.execute<{ package_name: string; departure_date: string }>(sql`
      select p.name as package_name, d.departure_date as departure_date
      from packages.packages p
      join packages.departures d on d.id = ${row.departureId}::uuid
      where p.id = ${row.packageId}::uuid
      limit 1
    `)
    const meta = names.rows[0]
    return this.toInquiry(row, meta?.package_name, meta?.departure_date)
  }

  private toInquiry(row: InquiryRow, packageName?: string, departureDate?: string): Inquiry {
    return {
      id: row.id,
      packageId: row.packageId,
      departureId: row.departureId,
      packageName,
      departureDate,
      customerName: row.customerName,
      email: row.email,
      phone: row.phone,
      paxCount: row.paxCount,
      notes: row.notes,
      preferredContact: row.preferredContact as Inquiry['preferredContact'],
      status: row.status as InquiryStatus,
      adminNotes: row.adminNotes,
      quotaApplied: row.quotaApplied,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
