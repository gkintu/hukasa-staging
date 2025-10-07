"use client"

import * as React from "react"
import Image from "next/image"
import { LayoutDashboard, FolderOpen, HelpCircle, Images } from "lucide-react"
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
        <button
          onClick={() => onViewChange("dashboard")}
          className="flex items-center justify-center px-2 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-0 group-data-[collapsible=icon]:pb-4 cursor-pointer hover:opacity-80 transition-opacity w-full"
        >
          <div className="relative w-24 h-12 flex items-center justify-center group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12">
            <Image
              src="/logo.png"
              alt="Hukasa Logo"
              fill
              className="object-contain"
            />
          </div>
        </button>
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