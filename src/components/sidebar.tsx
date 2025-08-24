"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, FolderOpen, HelpCircle, Palette, Images } from "lucide-react"

interface SidebarProps {
  activeView: string
  onViewChange: (view: "dashboard" | "allImages" | "projects" | "help") => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "allImages",
      label: "All Images",
      icon: Images,
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderOpen,
    },
    {
      id: "help",
      label: "Help",
      icon: HelpCircle,
    },
  ]

  return (
    <aside
      className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border animate-fade-in"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <Palette className="h-8 w-8 text-sidebar-primary" />
          <h1 className="text-xl font-bold">Hukasa</h1>
        </div>

        <nav className="space-y-2" role="list">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-12 text-left font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                onClick={() => onViewChange(item.id as "dashboard" | "allImages" | "projects" | "help")}
                aria-current={isActive ? "page" : undefined}
                role="listitem"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}