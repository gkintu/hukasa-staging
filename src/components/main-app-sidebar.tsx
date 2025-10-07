"use client"

import * as React from "react"
import Image from "next/image"
import { LayoutDashboard, FolderOpen, HelpCircle, Images } from "lucide-react"
import { useTheme } from "next-themes"
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
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Wait until mounted to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Sidebar collapsible={collapsible} variant={variant} {...props}>
      <SidebarHeader>
        <button
          onClick={() => onViewChange("dashboard")}
          className="flex items-center justify-center px-2 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-0 group-data-[collapsible=icon]:pb-4 cursor-pointer hover:opacity-80 transition-opacity w-full"
        >
          <div className="relative w-24 h-12 flex items-center justify-center group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12">
            {!mounted ? (
              // Show default logo during SSR to prevent hydration mismatch
              <Image
                src="/logo.png"
                alt="Hukasa Logo"
                fill
                className="object-contain"
                priority
              />
            ) : (
              // Switch logo based on theme after mount
              <Image
                src={resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo.png'}
                alt="Hukasa Logo"
                fill
                className="object-contain"
                priority
              />
            )}
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