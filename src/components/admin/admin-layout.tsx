import * as React from "react"
import { Shield } from "lucide-react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AdminSidebar } from "./admin-sidebar"
import { AdminHeader } from "./admin-header"
import { AdminNavUser } from "./admin-nav-user"
import { SearchProvider } from "@/lib/search-provider"
import { ConfigProvider } from "@/lib/config-provider"
import { RouteErrorBoundary } from "@/components/error-boundary"
import { AdminQueryProvider } from "./admin-query-provider"

interface AdminLayoutProps {
  children: React.ReactNode
}

export async function AdminLayout({ children }: AdminLayoutProps) {
  // Get admin emails from environment variable
  const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
  
  // Full session validation - this is the actual security check
  const session = await auth.api.getSession({ 
    headers: await headers() 
  })
  
  // Block unauthorized access
  if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
    redirect('/')
  }
  // Always start with false for SSR consistency
  // The SidebarProvider will handle cookie-based state after hydration
  const defaultOpen = false

  // Sample searchable data for admin - in real app this would come from API
  const adminSearchData = [
    { id: '1', title: 'User Management', subtitle: 'Manage all users', type: 'user' as const, url: '/admin/users' },
    { id: '2', title: 'Image Gallery', subtitle: 'View all uploaded images', type: 'image' as const, url: '/admin/images' },
    { id: '3', title: 'Audit Logs', subtitle: 'System activity logs', type: 'audit' as const, url: '/admin/audit' },
    { id: '4', title: 'System Settings', subtitle: 'Configure platform', type: 'project' as const, url: '/admin/settings' },
  ]

  return (
    <AdminQueryProvider>
      <RouteErrorBoundary>
        <ConfigProvider>
          <SearchProvider searchableData={adminSearchData}>
            <SidebarProvider defaultOpen={defaultOpen}>
            <Sidebar collapsible="icon" variant="inset">
              <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:justify-center">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:sr-only">
                    <span className="truncate font-semibold">Admin Panel</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      Virtual Staging Platform
                    </span>
                  </div>
                </div>
              </SidebarHeader>
              
              <SidebarContent>
                <AdminSidebar />
              </SidebarContent>
              
              <SidebarFooter>
                <AdminNavUser />
              </SidebarFooter>
              
              <SidebarRail />
            </Sidebar>
              
              <SidebarInset
                className={cn(
                  // If layout is fixed, set the height
                  // to 100svh to prevent overflow
                  "has-[[data-layout=fixed]]:h-svh",

                  // If layout is fixed and sidebar is inset,
                  // set the height to 100svh - 1rem (total margins) to prevent overflow
                  "peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]",

                  // Set content container, so we can use container queries
                  "@container/content"
                )}
              >
                <AdminHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                  {children}
                </div>
              </SidebarInset>
          </SidebarProvider>
        </SearchProvider>
      </ConfigProvider>
    </RouteErrorBoundary>
    </AdminQueryProvider>
  )
}