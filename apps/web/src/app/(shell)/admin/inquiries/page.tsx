'use client'

import { useState } from 'react'
import { EyeIcon, Loader2Icon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  INQUIRY_TRANSITIONS,
  type Inquiry,
  type InquiryStatus,
  type UpdateInquiryStatusInput,
} from '@app/contracts'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction } from '@/components/admin/icon-action'
import { PageHeader } from '@/components/admin/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'
import { useSession } from '@/lib/session'

const ALL_STATUSES = 'all'

const STATUS_LABEL: Record<InquiryStatus, string> = {
  baru: 'Baru',
  dihubungi: 'Dihubungi',
  dikonfirmasi: 'Dikonfirmasi',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
}

const STATUS_VARIANT: Record<
  InquiryStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  baru: 'default',
  dihubungi: 'secondary',
  dikonfirmasi: 'secondary',
  selesai: 'outline',
  ditolak: 'destructive',
}

export default function InquiriesPage() {
  const { can } = useSession()
  const canWrite = can('inquiries.write')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES)
  const [selected, setSelected] = useState<Inquiry | null>(null)

  const list = usePaginated<Inquiry>({
    path: '/api/inquiries',
    params: {
      q: search || undefined,
      status: status === ALL_STATUSES ? undefined : status,
    },
  })

  return (
    <>
      <PageHeader
        title="Pemesanan"
        description="Inquiry dari calon jamaah — follow-up manual via WhatsApp / telepon / email."
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-8"
              placeholder="Cari nama / email / telepon…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Semua status</SelectItem>
              {(Object.keys(STATUS_LABEL) as InquiryStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Paket</TableHead>
              <TableHead className="w-[70px]">Pax</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[140px]">Dibuat</TableHead>
              <TableHead className="w-[70px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((inquiry) => (
              <TableRow key={inquiry.id}>
                <TableCell className="font-medium">{inquiry.customerName}</TableCell>
                <TableCell>
                  <div className="text-sm">{inquiry.phone}</div>
                  <div className="text-xs text-muted-foreground">{inquiry.email}</div>
                </TableCell>
                <TableCell>
                  <div>{inquiry.packageName ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {inquiry.departureDate ?? '—'}
                  </div>
                </TableCell>
                <TableCell>{inquiry.paxCount}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[inquiry.status]}>
                    {STATUS_LABEL[inquiry.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(inquiry.createdAt).toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-right">
                  <IconAction
                    label="Lihat detail"
                    icon={<EyeIcon />}
                    onClick={() => setSelected(inquiry)}
                  />
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Belum ada pemesanan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="pemesanan" />

      {selected && (
        <InquiryDetailDialog
          inquiry={selected}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onUpdated={(next) => {
            setSelected(next)
            list.reload()
          }}
        />
      )}
    </>
  )
}

function InquiryDetailDialog({
  inquiry,
  canWrite,
  onClose,
  onUpdated,
}: {
  inquiry: Inquiry
  canWrite: boolean
  onClose: () => void
  onUpdated: (inquiry: Inquiry) => void
}) {
  const [busy, setBusy] = useState(false)
  const transitions = INQUIRY_TRANSITIONS[inquiry.status]
  const [nextStatus, setNextStatus] = useState<InquiryStatus | ''>(transitions[0] ?? '')
  const [adminNotes, setAdminNotes] = useState(inquiry.adminNotes ?? '')

  const whatsappHref = `https://wa.me/${inquiry.phone.replace(/\D/g, '')}`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pemesanan · {inquiry.customerName}</DialogTitle>
          <DialogDescription>
            Status: {STATUS_LABEL[inquiry.status]}
            {inquiry.quotaApplied ? ' · kuota sudah diterapkan' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kontak pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Telepon / WA: </span>
                <a className="font-medium underline" href={whatsappHref} target="_blank" rel="noreferrer">
                  {inquiry.phone}
                </a>
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                <a className="font-medium underline" href={`mailto:${inquiry.email}`}>
                  {inquiry.email}
                </a>
              </div>
              <div>
                <span className="text-muted-foreground">Preferensi: </span>
                {inquiry.preferredContact}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Paket</div>
              <div className="font-medium">{inquiry.packageName ?? inquiry.packageId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Keberangkatan</div>
              <div className="font-medium">{inquiry.departureDate ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Jumlah pax</div>
              <div className="font-medium">{inquiry.paxCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Dibuat</div>
              <div className="font-medium">
                {new Date(inquiry.createdAt).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {inquiry.notes && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="mb-1 text-muted-foreground">Catatan pelanggan</div>
              {inquiry.notes}
            </div>
          )}

          {canWrite && transitions.length > 0 && (
            <form
              className="flex flex-col gap-3 rounded-md border p-3"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!nextStatus) return
                setBusy(true)
                try {
                  const payload: UpdateInquiryStatusInput = {
                    status: nextStatus,
                    adminNotes: adminNotes.trim() === '' ? null : adminNotes.trim(),
                  }
                  const result = await apiFetch<{ inquiry: Inquiry }>(
                    `/api/inquiries/${inquiry.id}/status`,
                    { method: 'PATCH', body: JSON.stringify(payload) },
                  )
                  toast.success(`Status → ${STATUS_LABEL[result.inquiry.status]}`)
                  onUpdated(result.inquiry)
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal mengubah status')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <div className="flex flex-col gap-2">
                <Label>Ubah status</Label>
                <Select
                  value={nextStatus}
                  onValueChange={(value) => setNextStatus(value as InquiryStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status berikutnya" />
                  </SelectTrigger>
                  <SelectContent>
                    {transitions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {STATUS_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="inq-notes">Catatan admin</Label>
                <Textarea
                  id="inq-notes"
                  rows={3}
                  maxLength={5000}
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy || !nextStatus}>
                {busy && <Loader2Icon className="animate-spin" />}
                Simpan status
              </Button>
            </form>
          )}

          {canWrite && transitions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Status terminal — tidak ada transisi lebih lanjut.
            </p>
          )}

          {inquiry.adminNotes && transitions.length === 0 && (
            <div className="rounded-md border p-3 text-sm">
              <div className="mb-1 text-muted-foreground">Catatan admin</div>
              {inquiry.adminNotes}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
