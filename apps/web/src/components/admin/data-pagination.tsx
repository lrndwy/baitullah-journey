'use client'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  Loader2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PAGE_SIZE_OPTIONS, type Paginated } from '@/lib/pagination'

/**
 * The one paginator every table uses: rows-per-page, the visible range, the
 * page number and first/previous/next navigation.
 *
 * Navigation is bounded by what the cursor stack has already visited, so the
 * buttons reflect what the API can actually serve rather than a guess.
 */
export function DataPagination<T>({
  state,
  noun,
}: {
  state: Paginated<T>
  /** Plural noun for the range line, e.g. "users". */
  noun: string
}) {
  const from = state.total === 0 ? 0 : state.pageIndex * state.limit + 1
  const to = state.pageIndex * state.limit + state.items.length
  const lastPage = state.pageCount

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="page-size" className="text-xs text-muted-foreground">
            Rows per page
          </Label>
          <Select
            value={String(state.limit)}
            onValueChange={(value) => state.setLimit(Number(value))}
          >
            <SelectTrigger id="page-size" size="sm" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground tabular-nums">
          {state.loading ? 'Loading…' : `${from}–${to} of ${state.total} ${noun}`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          Page {state.pageIndex + 1} of {state.loading ? '…' : lastPage}
        </span>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="First page"
                disabled={!state.canPrev || state.loading}
                onClick={state.first}
              >
                <ChevronsLeftIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>First page</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={!state.canPrev || state.loading}
                onClick={state.prev}
              >
                <ChevronLeftIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous page</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={!state.canNext || state.loading}
                onClick={state.next}
              >
                {state.loading ? <Loader2Icon className="animate-spin" /> : <ChevronRightIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next page</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}