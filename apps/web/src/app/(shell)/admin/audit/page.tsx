'use client'

import { useEffect, useState } from 'react'
import { EyeIcon, ShieldAlertIcon } from 'lucide-react'
import type { AuditLog, AuditStatus, ListAuditQuery, ModulesResponse } from '@app/contracts'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction } from '@/components/admin/icon-action'
import { PageHeader } from '@/components/admin/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
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
import { apiFetch } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'

/** Radix Select forbids an empty item value, so "all" is the sentinel. */
const ALL = 'all'

const STATUS_VARIANT: Record<string, 'secondary' | 'destructive'> = {
  success: 'secondary',
  failure: 'destructive',
}

export default function AuditPage() {
  const [modules, setModules] = useState<string[]>([])
  const [moduleFilter, setModuleFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState<AuditStatus | typeof ALL>(ALL)
  const [detail, setDetail] = useState<AuditLog | null>(null)

  useEffect(() => {
    void apiFetch<ModulesResponse>('/api/_meta/modules')
      .then((result) => setModules(result.modules.map((module) => module.name)))
      .catch(() => setModules([]))
  }, [])

  const logs = usePaginated<AuditLog>({
    path: '/api/audit/logs',
    params: {
      module: moduleFilter === ALL ? undefined : moduleFilter,
      status: statusFilter === ALL ? undefined : statusFilter,
    } satisfies Partial<ListAuditQuery>,
  })

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only. Every state-changing request is recorded by the kernel interceptor, including failures and why they failed."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All modules</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module} value={module}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as AuditStatus | typeof ALL)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[190px]">When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="w-[200px]">Actor</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[80px] text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.loading && logs.items.length === 0 &&
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {logs.items.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer"
                onClick={() => setDetail(log)}
              >
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {new Date(log.occurredAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <code className="text-xs">{log.action}</code>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {log.actorId ?? <Badge variant="outline">{log.actorType}</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[log.status] ?? 'outline'}>{log.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <IconAction
                    label="View record"
                    icon={<EyeIcon />}
                    onClick={() => setDetail(log)}
                  />
                </TableCell>
              </TableRow>
            ))}

            {!logs.loading && logs.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nothing recorded for these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {logs.error && <p className="text-sm text-destructive">{logs.error}</p>}

      <DataPagination state={logs} noun="records" />

      {detail && <AuditDetailDialog entry={detail} onClose={() => setDetail(null)} />}
    </>
  )
}

function AuditDetailDialog({ entry, onClose }: { entry: AuditLog; onClose: () => void }) {
  const metadata = entry.metadata ?? {}
  const error = readError(metadata.error)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <code className="text-sm">{entry.action}</code>
            <Badge variant={STATUS_VARIANT[entry.status] ?? 'outline'}>{entry.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            {new Date(entry.occurredAt).toLocaleString()} · module <strong>{entry.module}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/*
            A failed request is the one an operator actually opens this dialog
            for, so the reason leads rather than being buried in metadata.
          */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium text-destructive">
                  {error.code ?? error.name}
                  {error.status ? ` (HTTP ${error.status})` : ''}
                </span>
                <span className="text-sm break-words text-muted-foreground">{error.message}</span>
              </div>
            </div>
          )}

          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Record id" value={entry.id} mono />
            <Field label="Request id" value={entry.requestId ?? undefined} mono />
            <Field label="Actor" value={entry.actorId ?? `(${entry.actorType})`} mono />
            <Field label="Actor type" value={entry.actorType} />
            <Field label="Target" value={entry.targetType ? `${entry.targetType} ${entry.targetId ?? ''}` : undefined} mono />
            <Field label="IP" value={entry.ip ?? undefined} />
            <Field label="User agent" value={entry.userAgent ?? undefined} />
            <Field
              label="Request"
              value={
                typeof metadata.method === 'string' && typeof metadata.path === 'string'
                  ? `${metadata.method} ${metadata.path}`
                  : undefined
              }
              mono
            />
          </dl>

          {hasExtraMetadata(metadata) && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Additional context
                </span>
                <pre className="max-h-56 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
                  <code>{JSON.stringify(stripKnown(metadata), null, 2)}</code>
                </pre>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'truncate font-mono text-xs' : 'truncate'}>
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

interface FailureReason {
  name: string
  code?: string
  message: string
  status?: number
}

function readError(value: unknown): FailureReason | null {
  if (typeof value !== 'object' || value === null) return null
  // The audit metadata is JSON this application wrote, so the shape is known;
  // the assertion names it, and every field below is still checked before use.
  const record = value as Record<string, unknown>
  if (typeof record.message !== 'string') return null

  return {
    name: typeof record.name === 'string' ? record.name : 'Error',
    code: typeof record.code === 'string' ? record.code : undefined,
    message: record.message,
    status: typeof record.status === 'number' ? record.status : undefined,
  }
}

/** `method`, `path` and `error` are already rendered as their own fields. */
function stripKnown(metadata: Record<string, unknown>): Record<string, unknown> {
  const { method: _method, path: _path, error: _error, ...rest } = metadata
  return rest
}

function hasExtraMetadata(metadata: Record<string, unknown>): boolean {
  return Object.keys(stripKnown(metadata)).length > 0
}