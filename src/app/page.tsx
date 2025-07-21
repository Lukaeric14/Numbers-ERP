"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { ContentProvider, useContent } from "@/contexts/content-context"
import { ContentRenderer } from "@/components/content-renderer"

function DashboardHeader() {
  const { breadcrumb } = useContent()
  
  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                  {index === breadcrumb.length - 1 ? (
                    <BreadcrumbPage>{item}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href="#">{item}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <ContentProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <DashboardHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              <ContentRenderer />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ContentProvider>
    </ProtectedRoute>
  )
}
