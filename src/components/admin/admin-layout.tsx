"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
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
import { LayoutProvider } from "@/lib/layout-provider"

interface AdminLayoutProps {
  children: React.ReactNode
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const defaultOpen = getCookie("sidebar_state") !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <LayoutProvider>
        <AdminSidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-sm font-semibold">A</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Admin Panel</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  Virtual Staging Platform
                </span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            {/* Admin navigation will be rendered by AdminSidebar */}
          </SidebarContent>
          
          <SidebarFooter>
            <AdminNavUser />
          </SidebarFooter>
          
          <SidebarRail />
        </AdminSidebar>
        
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
      </LayoutProvider>
    </SidebarProvider>
  )
}