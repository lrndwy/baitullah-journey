'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { HomeIcon } from 'lucide-react'
import { AppSidebar } from '@/components/admin/app-sidebar'
import { BreadcrumbProvider, useBreadcrumbContext } from '@/components/admin/breadcrumb-context'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { breadcrumbs } from '@/lib/breadcrumbs'
import { useSession } from '@/lib/session'

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <BreadcrumbProvider>
      <AppShell>{children}</AppShell>
    </BreadcrumbProvider>
  )
}

function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status, navigation } = useSession()
  const override = useBreadcrumbContext()

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login')
  }, [router, status])

  const crumbs = breadcrumbs(pathname, navigation)
  // A detail page names itself once its record loads.
  if (override?.label && crumbs.length > 0) {
    const last = crumbs[crumbs.length - 1]
    if (last) crumbs[crumbs.length - 1] = { ...last, label: override.label }
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading your workspace…
      </div>
    )
  }

  return (
    // One provider for the whole shell: every tooltip below inherits it.
    <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="-ml-1" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle navigation</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mr-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/">
                      <HomeIcon className="size-3.5" />
                      <span className="sr-only">Home</span>
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {crumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}