'use client'

import { useEffect, useState } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type {
  Category,
  CategoryListResponse,
  CreatePackageInput,
  Package,
  PackageStatus,
  UpdatePackageInput,
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
import { Checkbox } from '@/components/ui/checkbox'
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

const STATUS_VARIANT: Record<PackageStatus, 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  published: 'secondary',
  archived: 'destructive',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString('id-ID')}`
  }
}

export default function PackagesPage() {
  const { can } = useSession()
  const canWrite = can('packages.write')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES)
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Package | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Package | null>(null)

  const list = usePaginated<Package>({
    path: '/api/packages',
    params: {
      q: search || undefined,
      status: status === ALL_STATUSES ? undefined : status,
    },
  })

  useEffect(() => {
    void apiFetch<CategoryListResponse>('/api/packages/categories?limit=100')
      .then((page) => setCategories(page.items))
      .catch(() => setCategories([]))
  }, [])

  return (
    <>
      <PageHeader title="Paket" description="Katalog paket perjalanan untuk situs publik.">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-52 pl-8"
              placeholder="Cari paket…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Semua status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {canWrite && (
            <Tip content="Buat paket baru">
              <Button onClick={() => setEditing('new')} disabled={categories.length === 0}>
                <PlusIcon data-icon="inline-start" />
                Tambah paket
              </Button>
            </Tip>
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[90px]">Featured</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>
                  <div className="font-medium">{pkg.name}</div>
                  <code className="text-xs text-muted-foreground">{pkg.slug}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {pkg.categoryName ?? '—'}
                </TableCell>
                <TableCell>{formatPrice(pkg.basePrice, pkg.currency)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[pkg.status]}>{pkg.status}</Badge>
                </TableCell>
                <TableCell>{pkg.isFeatured ? 'Ya' : '—'}</TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit paket"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(pkg)}
                      />
                      <IconAction
                        label="Hapus paket"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(pkg)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Belum ada paket.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="paket" />

      {editing !== null && (
        <PackageFormDialog
          pkg={editing === 'new' ? null : editing}
          categories={categories}
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
              Keberangkatan dan data terkait paket ini juga akan terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/packages/${deleting.id}`, { method: 'DELETE' })
                  toast.success(`Paket ${deleting.name} dihapus`)
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

function PackageFormDialog({
  pkg,
  categories,
  onClose,
  onSaved,
}: {
  pkg: Package | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [categoryId, setCategoryId] = useState(pkg?.categoryId ?? categories[0]?.id ?? '')
  const [name, setName] = useState(pkg?.name ?? '')
  const [slug, setSlug] = useState(pkg?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(pkg))
  const [description, setDescription] = useState(pkg?.description ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(pkg?.thumbnailUrl ?? '')
  const [packageType, setPackageType] = useState(pkg?.packageType ?? '')
  const [status, setStatus] = useState<PackageStatus>(pkg?.status ?? 'draft')
  const [isFeatured, setIsFeatured] = useState(pkg?.isFeatured ?? false)
  const [basePrice, setBasePrice] = useState(String(pkg?.basePrice ?? 0))
  const [currency, setCurrency] = useState(pkg?.currency ?? 'IDR')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: CreatePackageInput | UpdatePackageInput = {
                categoryId,
                name: name.trim(),
                slug: slug.trim(),
                description: emptyToNull(description),
                thumbnailUrl: emptyToNull(thumbnailUrl),
                packageType: emptyToNull(packageType),
                status,
                isFeatured,
                basePrice: Number.parseInt(basePrice, 10) || 0,
                currency: currency.trim() || 'IDR',
              }
              if (pkg) {
                await apiFetch(`/api/packages/${pkg.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                })
                toast.success(`Paket ${name} diperbarui`)
              } else {
                await apiFetch('/api/packages', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                })
                toast.success(`Paket ${name} dibuat`)
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
            <DialogTitle>{pkg ? 'Edit paket' : 'Tambah paket'}</DialogTitle>
            <DialogDescription>
              Harga dasar dalam satuan terkecil (mis. rupiah bulat).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pkg-name">Nama</Label>
              <Input
                id="pkg-name"
                required
                maxLength={200}
                value={name}
                onChange={(event) => {
                  const next = event.target.value
                  setName(next)
                  if (!slugTouched) setSlug(slugify(next))
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pkg-slug">Slug</Label>
              <Input
                id="pkg-slug"
                required
                maxLength={200}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setSlug(event.target.value)
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pkg-desc">Deskripsi</Label>
              <Textarea
                id="pkg-desc"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pkg-price">Harga dasar</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min={0}
                  required
                  value={basePrice}
                  onChange={(event) => setBasePrice(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pkg-currency">Mata uang</Label>
                <Input
                  id="pkg-currency"
                  maxLength={8}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as PackageStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pkg-type">Tipe paket</Label>
                <Input
                  id="pkg-type"
                  maxLength={80}
                  placeholder="Opsional"
                  value={packageType}
                  onChange={(event) => setPackageType(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pkg-thumb">URL thumbnail</Label>
              <Input
                id="pkg-thumb"
                maxLength={2000}
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked === true)}
              />
              Tampilkan sebagai featured
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={busy || !categoryId}>
              {busy && <Loader2Icon className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
