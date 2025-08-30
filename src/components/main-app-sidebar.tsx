"use client"

import * as React from "react"
import { LayoutDashboard, FolderOpen, HelpCircle, Palette, Images } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useLayout } from "@/lib/layout-provider"

// Main app navigation data
const mainNavItems = [
  {
    title: "Dashboard",
    id: "dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "All Images",
    id: "allImages", 
    icon: Images,
  },
  {
    title: "Projects",
    id: "projects",
    icon: FolderOpen,
  },
  {
    title: "Help",
    id: "help",
    icon: HelpCircle,
  },
]

interface MainAppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeView: string
  onViewChange: (view: "dashboard" | "allImages" | "projects" | "help") => void
}

export function MainAppSidebar({ activeView, onViewChange, ...props }: MainAppSidebarProps) {
  const { collapsible, variant } = useLayout()

  return (
    <Sidebar collapsible={collapsible} variant={variant} {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:justify-center">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Palette className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:sr-only">
            <span className="truncate font-semibold">Hukasa</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              Virtual Staging Platform
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = activeView === item.id
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      tooltip={item.title}
                      isActive={isActive}
                      size="lg"
                      onClick={() => onViewChange(item.id as "dashboard" | "allImages" | "projects" | "help")}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}