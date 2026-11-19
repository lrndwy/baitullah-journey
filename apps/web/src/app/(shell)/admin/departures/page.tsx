'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDaysIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  CreateDepartureInput,
  CreateItineraryInput,
  Departure,
  DepartureStatus,
  Itinerary,
  Package,
  PackageListResponse,
  UpdateDepartureInput,
  UpdateItineraryInput,
} from '@app/contracts'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction, Tip } from '@/components/admin/icon-action'
import { PageHeader } from '@/components/admin/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

const ALL_PACKAGES = 'all'

const STATUS_VARIANT: Record<DepartureStatus, 'secondary' | 'outline' | 'destructive'> = {
  open: 'secondary',
  full: 'outline',
  closed: 'outline',
  cancelled: 'destructive',
}

export default function DeparturesPage() {
  const { can } = useSession()
  const canWrite = can('packages.write')
  const [packageFilter, setPackageFilter] = useState(ALL_PACKAGES)
  const [packages, setPackages] = useState<Package[]>([])
  const [editing, setEditing] = useState<Departure | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Departure | null>(null)
  const [itineraryFor, setItineraryFor] = useState<Departure | null>(null)

  const list = usePaginated<Departure>({
    path: '/api/packages/departures',
    params: {
      packageId: packageFilter === ALL_PACKAGES ? undefined : packageFilter,
    },
  })

  useEffect(() => {
    void apiFetch<PackageListResponse>('/api/packages?limit=100')
      .then((page) => setPackages(page.items))
      .catch(() => setPackages([]))
  }, [])

  const packageName = (id: string) => packages.find((item) => item.id === id)?.name ?? id.slice(0, 8)

  return (
    <>
      <PageHeader
        title="Keberangkatan"
        description="Jadwal keberangkatan per paket, termasuk itinerary hari-per-hari."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select value={packageFilter} onValueChange={setPackageFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter paket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PACKAGES}>Semua paket</SelectItem>
              {packages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canWrite && (
            <Tip content="Tambah keberangkatan">
              <Button onClick={() => setEditing('new')} disabled={packages.length === 0}>
                <PlusIcon data-icon="inline-start" />
                Tambah jadwal
              </Button>
            </Tip>
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paket</TableHead>
              <TableHead>Berangkat</TableHead>
              <TableHead>Pulang</TableHead>
              <TableHead>Kuota</TableHead>
              <TableHead>Maskapai</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[140px] text-right">Aksi</TableHead>
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

            {list.items.map((departure) => (
              <TableRow key={departure.id}>
                <TableCell className="font-medium">{packageName(departure.packageId)}</TableCell>
                <TableCell>{departure.departureDate}</TableCell>
                <TableCell>{departure.returnDate}</TableCell>
                <TableCell>
                  {departure.availableQuota}/{departure.quota}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {departure.airline ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[departure.status]}>{departure.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <IconAction
                    label="Kelola itinerary"
                    icon={<CalendarDaysIcon />}
                    onClick={() => setItineraryFor(departure)}
                  />
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit jadwal"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(departure)}
                      />
                      <IconAction
                        label="Hapus jadwal"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(departure)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Belum ada keberangkatan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="keberangkatan" />

      {editing !== null && (
        <DepartureFormDialog
          departure={editing === 'new' ? null : editing}
          packages={packages}
          defaultPackageId={packageFilter === ALL_PACKAGES ? undefined : packageFilter}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            list.reload()
          }}
        />
      )}

      {itineraryFor && (
        <ItineraryDialog
          departure={itineraryFor}
          canWrite={canWrite}
          onClose={() => setItineraryFor(null)}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus keberangkatan {deleting?.departureDate}?</AlertDialogTitle>
            <AlertDialogDescription>
              Itinerary terkait jadwal ini juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/packages/departures/${deleting.id}`, { method: 'DELETE' })
                  toast.success('Keberangkatan dihapus')
                  setDeleting(null)
                  list.reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal menghapus')
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DepartureFormDialog({
  departure,
  packages,
  defaultPackageId,
  onClose,
  onSaved,
}: {
  departure: Departure | null
  packages: Package[]
  defaultPackageId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [packageId, setPackageId] = useState(
    departure?.packageId ?? defaultPackageId ?? packages[0]?.id ?? '',
  )
  const [departureDate, setDepartureDate] = useState(departure?.departureDate ?? '')
  const [returnDate, setReturnDate] = useState(departure?.returnDate ?? '')
  const [quota, setQuota] = useState(String(departure?.quota ?? 40))
  const [availableQuota, setAvailableQuota] = useState(
    String(departure?.availableQuota ?? departure?.quota ?? 40),
  )
  const [airline, setAirline] = useState(departure?.airline ?? '')
  const [status, setStatus] = useState<DepartureStatus>(departure?.status ?? 'open')
  const [priceOverride, setPriceOverride] = useState(
    departure?.priceOverride != null ? String(departure.priceOverride) : '',
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              if (departure) {
                const payload: UpdateDepartureInput = {
                  departureDate,
                  returnDate,
                  quota: Number.parseInt(quota, 10),
                  availableQuota: Number.parseInt(availableQuota, 10),
                  airline: airline.trim() === '' ? null : airline.trim(),
                  status,
                  priceOverride:
                    priceOverride.trim() === '' ? null : Number.parseInt(priceOverride, 10),
                }
                await apiFetch(`/api/packages/departures/${departure.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                })
                toast.success('Keberangkatan diperbarui')
              } else {
                const payload: CreateDepartureInput = {
                  packageId,
                  departureDate,
                  returnDate,
                  quota: Number.parseInt(quota, 10),
                  availableQuota: Number.parseInt(availableQuota, 10),
                  airline: airline.trim() === '' ? null : airline.trim(),
                  status,
                  priceOverride:
                    priceOverride.trim() === '' ? null : Number.parseInt(priceOverride, 10),
                }
                await apiFetch('/api/packages/departures', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                })
                toast.success('Keberangkatan dibuat')
              }
              onSaved()
            } catch (cause) {
              toast.error(cause instanceof ApiError ? cause.message : 'Gagal menyimpan')
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{departure ? 'Edit keberangkatan' : 'Tambah keberangkatan'}</DialogTitle>
            <DialogDescription>Tanggal dalam format YYYY-MM-DD.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            {!departure && (
              <div className="flex flex-col gap-2">
                <Label>Paket</Label>
                <Select value={packageId} onValueChange={setPackageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dep-date">Tanggal berangkat</Label>
                <Input
                  id="dep-date"
                  type="date"
                  required
                  value={departureDate}
                  onChange={(event) => setDepartureDate(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ret-date">Tanggal pulang</Label>
                <Input
                  id="ret-date"
                  type="date"
                  required
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dep-quota">Kuota</Label>
                <Input
                  id="dep-quota"
                  type="number"
                  min={1}
                  required
                  value={quota}
                  onChange={(event) => setQuota(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dep-avail">Kuota tersedia</Label>
                <Input
                  id="dep-avail"
                  type="number"
                  min={0}
                  required
                  value={availableQuota}
                  onChange={(event) => setAvailableQuota(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dep-airline">Maskapai</Label>
              <Input
                id="dep-airline"
                maxLength={120}
                value={airline}
                onChange={(event) => setAirline(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as DepartureStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dep-price">Override harga</Label>
                <Input
                  id="dep-price"
                  type="number"
                  min={0}
                  placeholder="Kosongkan = harga paket"
                  value={priceOverride}
                  onChange={(event) => setPriceOverride(event.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={busy || (!departure && !packageId)}>
              {busy && <Loader2Icon className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ItineraryDialog({
  departure,
  canWrite,
  onClose,
}: {
  departure: Departure
  canWrite: boolean
  onClose: () => void
}) {
  const [items, setItems] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Itinerary | 'new' | null>(null)
  const [dayNumber, setDayNumber] = useState('1')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')

  async function reload() {
    setLoading(true)
    try {
      const result = await apiFetch<{ items: Itinerary[] }>(
        `/api/packages/itineraries?departureId=${encodeURIComponent(departure.id)}`,
      )
      setItems(result.items)
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Gagal memuat itinerary')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departure.id])

  function startEdit(item: Itinerary | 'new') {
    setEditing(item)
    if (item === 'new') {
      setDayNumber(String((items.at(-1)?.dayNumber ?? 0) + 1))
      setTitle('')
      setDescription('')
      setLocation('')
    } else {
      setDayNumber(String(item.dayNumber))
      setTitle(item.title)
      setDescription(item.description ?? '')
      setLocation(item.location ?? '')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Itinerary · {departure.departureDate}</DialogTitle>
          <DialogDescription>Hari-per-hari untuk keberangkatan ini.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada itinerary.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      Hari {item.dayNumber}: {item.title}
                    </div>
                    {item.location && (
                      <div className="text-xs text-muted-foreground">{item.location}</div>
                    )}
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  {canWrite && (
                    <div className="shrink-0">
                      <IconAction
                        label="Edit"
                        icon={<PencilIcon />}
                        onClick={() => startEdit(item)}
                      />
                      <IconAction
                        label="Hapus"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={async () => {
                          try {
                            await apiFetch(`/api/packages/itineraries/${item.id}`, {
                              method: 'DELETE',
                            })
                            toast.success('Itinerary dihapus')
                            void reload()
                          } catch (cause) {
                            toast.error(
                              cause instanceof ApiError ? cause.message : 'Gagal menghapus',
                            )
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {canWrite && editing === null && (
            <Button type="button" variant="outline" onClick={() => startEdit('new')}>
              <PlusIcon data-icon="inline-start" />
              Tambah hari
            </Button>
          )}

          {canWrite && editing !== null && (
            <form
              className="flex flex-col gap-3 rounded-md border p-3"
              onSubmit={async (event) => {
                event.preventDefault()
                setBusy(true)
                try {
                  if (editing === 'new') {
                    const payload: CreateItineraryInput = {
                      departureId: departure.id,
                      dayNumber: Number.parseInt(dayNumber, 10),
                      title: title.trim(),
                      description: description.trim() === '' ? null : description.trim(),
                      location: location.trim() === '' ? null : location.trim(),
                    }
                    await apiFetch('/api/packages/itineraries', {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    })
                    toast.success('Itinerary ditambahkan')
                  } else {
                    const payload: UpdateItineraryInput = {
                      dayNumber: Number.parseInt(dayNumber, 10),
                      title: title.trim(),
                      description: description.trim() === '' ? null : description.trim(),
                      location: location.trim() === '' ? null : location.trim(),
                    }
                    await apiFetch(`/api/packages/itineraries/${editing.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify(payload),
                    })
                    toast.success('Itinerary diperbarui')
                  }
                  setEditing(null)
                  void reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal menyimpan')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="it-day">Hari ke</Label>
                  <Input
                    id="it-day"
                    type="number"
                    min={1}
                    required
                    value={dayNumber}
                    onChange={(event) => setDayNumber(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="it-title">Judul</Label>
                  <Input
                    id="it-title"
                    required
                    maxLength={200}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="it-loc">Lokasi</Label>
                <Input
                  id="it-loc"
                  maxLength={200}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="it-desc">Deskripsi</Label>
                <Textarea
                  id="it-desc"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2Icon className="animate-spin" />}
                  Simpan
                </Button>
              </div>
            </form>
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
