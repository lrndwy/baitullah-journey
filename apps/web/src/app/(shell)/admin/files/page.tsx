'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CloudUploadIcon,
  DownloadIcon,
  FileIcon,
  Loader2Icon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  BulkDeleteResponse,
  FileVisibility,
  StoredFileWithUrl,
  UploadSignatureResponse,
} from '@app/contracts'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction } from '@/components/admin/icon-action'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { cn } from '@/lib/utils'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FilesPage() {
  const { can } = useSession()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [confirming, setConfirming] = useState<'bulk' | StoredFileWithUrl | null>(null)

  const files = usePaginated<StoredFileWithUrl>({
    path: '/api/storage/files',
    params: { search: search || undefined },
  })

  useEffect(() => {
    setSelected([])
  }, [files.pageIndex, files.limit, search])

  const allSelected = files.items.length > 0 && selected.length === files.items.length

  const confirmTitle =
    confirming === 'bulk'
      ? `Delete ${selected.length} file(s)?`
      : confirming
        ? `Delete ${confirming.filename}?`
        : ''

  return (
    <>
      <PageHeader
        title="Files"
        description="Stored in any S3-compatible bucket. Uploads and downloads are presigned, so bytes never pass through the API."
      >
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-56 pl-8"
            placeholder="Search filename"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </PageHeader>

      {can('storage.file.write') && <UploadPanel onUploaded={() => files.reload()} />}

      {selected.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Clear
          </Button>
          {can('storage.file.delete') && (
            <Button variant="destructive" size="sm" onClick={() => setConfirming('bulk')}>
              <Trash2Icon />
              Delete selected
            </Button>
          )}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {can('storage.file.delete') && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(checked === true ? files.items.map((file) => file.id) : [])
                    }
                  />
                </TableHead>
              )}
              <TableHead>Filename</TableHead>
              <TableHead className="w-[100px]">Size</TableHead>
              <TableHead className="w-[110px]">Visibility</TableHead>
              <TableHead className="w-[130px]">Uploaded</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.loading && files.items.length === 0 &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {files.items.map((file) => (
              <TableRow key={file.id} data-state={selected.includes(file.id) ? 'selected' : undefined}>
                {can('storage.file.delete') && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${file.filename}`}
                      checked={selected.includes(file.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked === true
                            ? [...current, file.id]
                            : current.filter((id) => id !== file.id),
                        )
                      }
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{file.filename}</span>
                      <span className="text-xs text-muted-foreground">{file.contentType}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs tabular-nums">{formatBytes(file.size)}</TableCell>
                <TableCell>
                  <Badge variant={file.visibility === 'public' ? 'secondary' : 'outline'}>
                    {file.visibility}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(file.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <IconAction label="Download" icon={<DownloadIcon />} href={file.url} />
                  {can('storage.file.delete') && (
                    <IconAction
                      label="Delete file"
                      icon={<Trash2Icon />}
                      destructive
                      onClick={() => setConfirming(file)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!files.loading && files.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No files yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {files.error && <p className="text-sm text-destructive">{files.error}</p>}

      <DataPagination state={files} noun="files" />

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              The object is removed from the bucket and its record is deleted. Download links that
              were already issued stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  if (confirming === 'bulk') {
                    const result = await apiFetch<BulkDeleteResponse>(
                      '/api/storage/files/bulk-delete',
                      { method: 'POST', body: JSON.stringify({ ids: selected }) },
                    )
                    toast.success(`Deleted ${result.deleted} file(s)`)
                    setSelected([])
                  } else if (confirming) {
                    await apiFetch(`/api/storage/files/${confirming.id}`, { method: 'DELETE' })
                    toast.success(`Deleted ${confirming.filename}`)
                    setSelected((current) => current.filter((id) => id !== confirming.id))
                  }
                  setConfirming(null)
                  files.reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Delete failed')
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Upload surface: a drop zone, a visibility choice with consequences spelled
 * out, and an explicit action — so nothing is uploaded by merely picking a file.
 */
function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<FileVisibility>('private')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    try {
      const signature = await apiFetch<UploadSignatureResponse>('/api/storage/files', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          visibility,
        }),
      })

      // Straight to the bucket: the API only signs and then verifies.
      const put = await fetch(signature.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!put.ok) throw new Error(`Storage rejected the upload (${put.status})`)

      await apiFetch(`/api/storage/files/${signature.fileId}/complete`, { method: 'POST' })
      toast.success(`Uploaded ${file.name}`)
      setPending(null)
      onUploaded()
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a file</CardTitle>
        <CardDescription>
          Up to 50 MB per file. The bytes go straight to object storage; the API only signs the
          request.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) setPending(file)
          }}
          className={cn(
            'flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/40',
          )}
        >
          {pending ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                <FileIcon className="size-4 text-muted-foreground" />
                <span className="max-w-[220px] truncate text-sm font-medium">{pending.name}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(pending.size)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Clear the selected file"
                  onClick={() => setPending(null)}
                  disabled={uploading}
                >
                  <XIcon />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose the visibility, then upload.
              </p>
            </>
          ) : (
            <>
              <CloudUploadIcon className="size-8 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Drop a file here</p>
                <p className="text-xs text-muted-foreground">
                  or{' '}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => inputRef.current?.click()}
                  >
                    browse your computer
                  </button>
                </p>
              </div>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) setPending(file)
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as FileVisibility)}
              className="gap-2"
            >
              <label
                htmlFor="visibility-private"
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5"
              >
                <RadioGroupItem value="private" id="visibility-private" className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Private</span>
                  <span className="text-xs text-muted-foreground">
                    Only you and file administrators.
                  </span>
                </span>
              </label>
              <label
                htmlFor="visibility-public"
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5"
              >
                <RadioGroupItem value="public" id="visibility-public" className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Public</span>
                  <span className="text-xs text-muted-foreground">
                    Any signed-in user can download it.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          <Button
            className="mt-auto w-full"
            disabled={!pending || uploading}
            onClick={() => pending && void upload(pending)}
          >
            {uploading ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {uploading ? 'Uploading…' : 'Upload file'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}