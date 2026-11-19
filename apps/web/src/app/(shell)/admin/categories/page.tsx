'use client'

import { useState } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@app/contracts'
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CategoriesPage() {
  const { can } = useSession()
  const canWrite = can('packages.write')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const list = usePaginated<Category>({ path: '/api/packages/categories' })

  return (
    <>
      <PageHeader title="Kategori" description="Kelompok paket perjalanan (umroh, haji, wisata, dll).">
        {canWrite && (
          <Tip content="Tambah kategori baru">
            <Button onClick={() => setEditing('new')}>
              <PlusIcon data-icon="inline-start" />
              Tambah kategori
            </Button>
          </Tip>
        )}
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground">{category.slug}</code>
                </TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {category.description ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit kategori"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(category)}
                      />
                      <IconAction
                        label="Hapus kategori"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(category)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Belum ada kategori.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="kategori" />

      {editing !== null && (
        <CategoryFormDialog
          category={editing === 'new' ? null : editing}
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
              Kategori yang masih dipakai paket tidak bisa dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/packages/categories/${deleting.id}`, { method: 'DELETE' })
                  toast.success(`Kategori ${deleting.name} dihapus`)
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

function CategoryFormDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(category))
  const [description, setDescription] = useState(category?.description ?? '')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: CreateCategoryInput | UpdateCategoryInput = {
                name: name.trim(),
                slug: slug.trim(),
                description: description.trim() === '' ? null : description.trim(),
              }
              if (category) {
                await apiFetch(`/api/packages/categories/${category.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                })
                toast.success(`Kategori ${name} diperbarui`)
              } else {
                await apiFetch('/api/packages/categories', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                })
                toast.success(`Kategori ${name} dibuat`)
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
            <DialogTitle>{category ? 'Edit kategori' : 'Tambah kategori'}</DialogTitle>
            <DialogDescription>Slug dipakai di URL publik katalog.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-name">Nama</Label>
              <Input
                id="cat-name"
                required
                maxLength={120}
                value={name}
                onChange={(event) => {
                  const next = event.target.value
                  setName(next)
                  if (!slugTouched) setSlug(slugify(next))
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                required
                maxLength={120}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setSlug(event.target.value)
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-desc">Deskripsi</Label>
              <Textarea
                id="cat-desc"
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
