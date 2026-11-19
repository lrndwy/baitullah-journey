'use client'

import { useState } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type {
  Accommodation,
  CreateAccommodationInput,
  UpdateAccommodationInput,
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiFetch, ApiError } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'
import { useSession } from '@/lib/session'

export default function AccommodationsPage() {
  const { can } = useSession()
  const canWrite = can('packages.write')
  const [editing, setEditing] = useState<Accommodation | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Accommodation | null>(null)

  const list = usePaginated<Accommodation>({ path: '/api/packages/accommodations' })

  return (
    <>
      <PageHeader title="Akomodasi" description="Hotel / penginapan untuk paket perjalanan.">
        {canWrite && (
          <Tip content="Tambah akomodasi">
            <Button onClick={() => setEditing('new')}>
              <PlusIcon data-icon="inline-start" />
              Tambah akomodasi
            </Button>
          </Tip>
        )}
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Negara</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.city ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{item.country ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.accommodationType ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit akomodasi"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(item)}
                      />
                      <IconAction
                        label="Hapus akomodasi"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(item)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada akomodasi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="akomodasi" />

      {editing !== null && (
        <AccommodationFormDialog
          accommodation={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            list.reload()
          }}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akomodasi akan dilepas dari paket yang menggunakannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/packages/accommodations/${deleting.id}`, {
                    method: 'DELETE',
                  })
                  toast.success(`Akomodasi ${deleting.name} dihapus`)
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

function emptyToNull(value: string) {
  return value.trim() === '' ? null : value.trim()
}

function AccommodationFormDialog({
  accommodation,
  onClose,
  onSaved,
}: {
  accommodation: Accommodation | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(accommodation?.name ?? '')
  const [city, setCity] = useState(accommodation?.city ?? '')
  const [country, setCountry] = useState(accommodation?.country ?? '')
  const [accommodationType, setAccommodationType] = useState(
    accommodation?.accommodationType ?? '',
  )
  const [address, setAddress] = useState(accommodation?.address ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(accommodation?.websiteUrl ?? '')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: CreateAccommodationInput | UpdateAccommodationInput = {
                name: name.trim(),
                city: emptyToNull(city),
                country: emptyToNull(country),
                accommodationType: emptyToNull(accommodationType),
                address: emptyToNull(address),
                websiteUrl: emptyToNull(websiteUrl),
              }
              if (accommodation) {
                await apiFetch(`/api/packages/accommodations/${accommodation.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                })
                toast.success(`Akomodasi ${name} diperbarui`)
              } else {
                await apiFetch('/api/packages/accommodations', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                })
                toast.success(`Akomodasi ${name} dibuat`)
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
            <DialogTitle>{accommodation ? 'Edit akomodasi' : 'Tambah akomodasi'}</DialogTitle>
            <DialogDescription>Data hotel untuk dilampirkan ke paket.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-name">Nama</Label>
              <Input
                id="acc-name"
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="acc-city">Kota</Label>
                <Input
                  id="acc-city"
                  maxLength={120}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="acc-country">Negara</Label>
                <Input
                  id="acc-country"
                  maxLength={120}
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-type">Tipe</Label>
              <Input
                id="acc-type"
                maxLength={80}
                placeholder="Hotel, apartemen, …"
                value={accommodationType}
                onChange={(event) => setAccommodationType(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-address">Alamat</Label>
              <Input
                id="acc-address"
                maxLength={500}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-web">Website</Label>
              <Input
                id="acc-web"
                maxLength={500}
                placeholder="https://…"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
