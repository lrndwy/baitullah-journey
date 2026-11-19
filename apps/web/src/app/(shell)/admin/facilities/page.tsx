'use client'

import { useState } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { CreateFacilityInput, Facility, UpdateFacilityInput } from '@app/contracts'
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
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'
import { useSession } from '@/lib/session'

export default function FacilitiesPage() {
  const { can } = useSession()
  const canWrite = can('packages.write')
  const [editing, setEditing] = useState<Facility | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Facility | null>(null)

  const list = usePaginated<Facility>({ path: '/api/packages/facilities' })

  return (
    <>
      <PageHeader title="Fasilitas" description="Fasilitas yang bisa dilampirkan ke paket.">
        {canWrite && (
          <Tip content="Tambah fasilitas">
            <Button onClick={() => setEditing('new')}>
              <PlusIcon data-icon="inline-start" />
              Tambah fasilitas
            </Button>
          </Tip>
        )}
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((facility) => (
              <TableRow key={facility.id}>
                <TableCell className="font-medium">{facility.name}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {facility.description ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit fasilitas"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(facility)}
                      />
                      <IconAction
                        label="Hapus fasilitas"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(facility)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  Belum ada fasilitas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="fasilitas" />

      {editing !== null && (
        <FacilityFormDialog
          facility={editing === 'new' ? null : editing}
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
              Fasilitas akan dilepas dari paket yang menggunakannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/packages/facilities/${deleting.id}`, { method: 'DELETE' })
                  toast.success(`Fasilitas ${deleting.name} dihapus`)
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

function FacilityFormDialog({
  facility,
  onClose,
  onSaved,
}: {
  facility: Facility | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(facility?.name ?? '')
  const [description, setDescription] = useState(facility?.description ?? '')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: CreateFacilityInput | UpdateFacilityInput = {
                name: name.trim(),
                description: description.trim() === '' ? null : description.trim(),
              }
              if (facility) {
                await apiFetch(`/api/packages/facilities/${facility.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                })
                toast.success(`Fasilitas ${name} diperbarui`)
              } else {
                await apiFetch('/api/packages/facilities', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                })
                toast.success(`Fasilitas ${name} dibuat`)
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
            <DialogTitle>{facility ? 'Edit fasilitas' : 'Tambah fasilitas'}</DialogTitle>
            <DialogDescription>Contoh: hotel bintang 5, makan 3x, visa.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fac-name">Nama</Label>
              <Input
                id="fac-name"
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fac-desc">Deskripsi</Label>
              <Textarea
                id="fac-desc"
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
