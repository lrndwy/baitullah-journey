'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArchiveRestoreIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  BackupListResponse,
  BackupSummary,
  BackupUploadSignature,
  CreateBackupInput,
  RestoreMode,
  RestoreReport,
} from '@app/contracts'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction, Tip } from '@/components/admin/icon-action'
import { PageHeader } from '@/components/admin/page-header'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/session'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function BackupsPage() {
  const { can } = useSession()
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<BackupSummary | null>(null)

  const backupList = usePaginated<BackupSummary>({ path: '/api/backup/backups', initialLimit: 10 })
  const backups = backupList.items
  const load = backupList.reload

  return (
    <>
      <PageHeader
        title="Backups"
        description="A backup archives the rows every module declares, plus the stored files. Restore it in replace or merge mode."
      >
        {can('backup.create') && (
          <CreateBackupButton
            busy={creating}
            onRun={async (input) => {
              setCreating(true)
              try {
                const { backup } = await apiFetch<{ backup: BackupSummary }>('/api/backup/backups', {
                  method: 'POST',
                  body: JSON.stringify(input),
                })
                toast.success(
                  `Backup created — ${backup.tables} tables, ${backup.rows} rows, ${backup.files} files`,
                )
                void load()
              } catch (cause) {
                toast.error(cause instanceof ApiError ? cause.message : 'Backup failed')
              } finally {
                setCreating(false)
              }
            }}
          />
        )}
      </PageHeader>

      {can('backup.create') && <UploadBackupPanel onUploaded={load} />}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="w-[110px]">Source</TableHead>
              <TableHead className="w-[110px]">Size</TableHead>
              <TableHead className="w-[200px]">Contents</TableHead>
              <TableHead className="w-[160px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backupList.loading && backups.length === 0 &&
              Array.from({ length: 2 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {backups.map((backup) => (
              <TableRow key={backup.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(backup.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{backup.label ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={backup.source === 'uploaded' ? 'outline' : 'secondary'}>
                    {backup.source}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs tabular-nums">{formatBytes(backup.size)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {backup.tables} tables · {backup.rows} rows · {backup.files} files
                </TableCell>
                <TableCell className="text-right">
                  <IconAction
                    label="Download archive"
                    icon={<DownloadIcon />}
                    onClick={async () => {
                      try {
                        const { url } = await apiFetch<{ url: string }>(
                          `/api/backup/backups/${backup.id}/download`,
                        )
                        window.open(url, '_blank', 'noreferrer')
                      } catch (cause) {
                        toast.error(cause instanceof ApiError ? cause.message : 'Download failed')
                      }
                    }}
                  />

                  {can('backup.restore') && (
                    <IconAction
                      label="Restore from this backup"
                      icon={<ArchiveRestoreIcon />}
                      onClick={() => setRestoring(backup)}
                    />
                  )}

                  {can('backup.delete') && (
                    <IconAction
                      label="Delete backup"
                      icon={<Trash2Icon />}
                      destructive
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/backup/backups/${backup.id}`, { method: 'DELETE' })
                          toast.success('Backup deleted')
                          load()
                        } catch (cause) {
                          toast.error(cause instanceof ApiError ? cause.message : 'Delete failed')
                        }
                      }}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!backupList.loading && backups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No backups yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <DataPagination state={backupList} noun="backups" />

      {restoring && (
        <RestoreDialog
          backup={restoring}
          onClose={() => setRestoring(null)}
          onDone={() => {
            setRestoring(null)
            void load()
          }}
        />
      )}
    </>
  )
}

function CreateBackupButton({
  busy,
  onRun,
}: {
  busy: boolean
  onRun: (input: CreateBackupInput) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [includeFiles, setIncludeFiles] = useState(true)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tip content="Archive every declared table, and optionally the stored files">
        <Button onClick={() => setOpen(true)} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <PlusIcon data-icon="inline-start" />}
          {busy ? 'Creating…' : 'Create backup'}
        </Button>
      </Tip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a backup</DialogTitle>
          <DialogDescription>
            Exports every table the installed modules declare, plus optionally the stored files.
            Sessions and audit records are never included.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="backupLabel">Label</Label>
            <Input
              id="backupLabel"
              placeholder="Before the v2 migration"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="includeFiles"
              checked={includeFiles}
              onCheckedChange={(checked) => setIncludeFiles(checked === true)}
              className="mt-0.5"
            />
            <div className="flex flex-col">
              <Label htmlFor="includeFiles">Include uploaded files</Label>
              <span className="text-xs text-muted-foreground">
                Copies the object bytes into the archive. Untick for a data-only backup.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setOpen(false)
              void onRun({ label: label.trim() || undefined, includeFiles })
            }}
          >
            Create backup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RestoreDialog({
  backup,
  onClose,
  onDone,
}: {
  backup: BackupSummary
  onClose: () => void
  onDone: () => void
}) {
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<RestoreReport | null>(null)

  async function restore() {
    setBusy(true)
    try {
      const { report: result } = await apiFetch<{ report: RestoreReport }>(
        `/api/backup/backups/${backup.id}/restore`,
        { method: 'POST', body: JSON.stringify({ mode }) },
      )
      setReport(result)
      toast.success(`Restore finished in ${result.durationMs} ms`)
      if (mode === 'replace') {
        toast.info('Replace mode cleared every session — reload to sign in again.')
      }
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Restore failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Restore this backup</DialogTitle>
          <DialogDescription>
            {new Date(backup.createdAt).toLocaleString()} · {backup.tables} tables ·{' '}
            {backup.rows} rows · {backup.files} files
          </DialogDescription>
        </DialogHeader>

        {report ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{report.mode}</Badge>
              <span className="text-muted-foreground">finished in {report.durationMs} ms</span>
            </div>

            <ScrollArea className="h-64 rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Table</th>
                    <th className="px-3 py-2">Deleted</th>
                    <th className="px-3 py-2">Inserted</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2">Skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tables.map((table) => (
                    <tr key={table.name} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-mono">{table.name}</td>
                      <td className="px-3 py-1.5 tabular-nums">{table.deleted}</td>
                      <td className="px-3 py-1.5 tabular-nums">{table.inserted}</td>
                      <td className="px-3 py-1.5 tabular-nums">{table.updated}</td>
                      <td className="px-3 py-1.5 tabular-nums">{table.skipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <p className="text-xs text-muted-foreground">
              Files: {report.files.written} written, {report.files.deleted} removed,{' '}
              {report.files.skipped} already present.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as RestoreMode)}>
              <label
                htmlFor="mode-merge"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <RadioGroupItem value="merge" id="mode-merge" className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Merge — touch only what is missing</span>
                  <span className="text-xs text-muted-foreground">
                    Rows are matched on primary key: existing rows are overwritten with the
                    archive&apos;s values, new rows are inserted, nothing is deleted. Files that
                    still exist are skipped. Safe on a live system.
                  </span>
                </span>
              </label>

              <label
                htmlFor="mode-replace"
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-destructive/40 p-3"
              >
                <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-destructive">
                    Replace — the archive becomes the truth
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Empties every declared table, then inserts the archive. Anything created after
                    the backup is lost. Sessions and reset codes are cleared, so everyone is signed
                    out; the audit trail is not declared and therefore survives.
                  </span>
                </span>
              </label>
            </RadioGroup>

            {mode === 'replace' && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <TriangleAlertIcon className="mt-0.5 size-4 text-destructive" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">
                    This cannot be undone with the API. Take a backup of the current state first if
                    you are unsure.
                  </span>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={(checked) => setConfirmed(checked === true)}
                    />
                    <span className="text-xs">I understand this deletes current data</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {report ? (
            <Button onClick={onDone}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onDone}>
                Cancel
              </Button>
              <Button
                variant={mode === 'replace' ? 'destructive' : 'default'}
                disabled={busy || (mode === 'replace' && !confirmed)}
                onClick={() => void restore()}
              >
                {busy && <Loader2Icon className="animate-spin" />}
                Restore ({mode})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Takes an archive produced elsewhere. The server reads it back before it
 * appears in the list, so an upload that is not a real archive is rejected
 * immediately rather than discovered during a restore.
 */
function UploadBackupPanel({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    try {
      const signature = await apiFetch<BackupUploadSignature>('/api/backup/backups/upload-url', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, size: file.size }),
      })

      const put = await fetch(signature.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/gzip' },
        body: file,
      })
      if (!put.ok) throw new Error(`Storage rejected the upload (${put.status})`)

      const { backup } = await apiFetch<{ backup: BackupSummary }>(
        `/api/backup/backups/${signature.backupId}/complete`,
        { method: 'POST' },
      )

      toast.success(
        `Verified archive — ${backup.tables} tables, ${backup.rows} rows, ${backup.files} files`,
      )
      setPending(null)
      onUploaded()
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'Upload failed',
      )
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a backup</CardTitle>
        <CardDescription>
          A <code className="text-xs">.tar.gz</code> produced by this application — from another
          deployment, or an earlier version of this one. It is validated before it can be restored.
        </CardDescription>
      </CardHeader>

      <CardContent>
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
            'flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
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
                  aria-label="Clear the selected archive"
                  disabled={busy}
                  onClick={() => setPending(null)}
                >
                  <XIcon />
                </Button>
              </div>
              <Button disabled={busy} onClick={() => void upload(pending)}>
                {busy ? <Loader2Icon className="animate-spin" /> : <CloudUploadIcon />}
                {busy ? 'Verifying…' : 'Upload and verify'}
              </Button>
            </>
          ) : (
            <>
              <CloudUploadIcon className="size-7 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Drop a backup archive here</p>
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
            accept=".gz,.tgz,application/gzip"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) setPending(file)
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
