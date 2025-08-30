"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { SearchCommand } from "@/components/search-command"
import { useScrollHidden } from "@/hooks/use-scroll-effects"
import { cn } from "@/lib/utils"

export function AdminHeader() {
  const pathname = usePathname()
  
  // Generate intelligent breadcrumb from pathname
  const pathSegments = pathname.split("/").filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/")
    const isLast = index === pathSegments.length - 1
    
    // Smart segment formatting
    let label = segment
    switch (segment) {
      case 'admin':
        label = 'Admin Dashboard'
        break
      case 'users':
        label = 'User Management'
        break
      case 'images':
        label = 'Image Management'
        break
      case 'audit':
        label = 'Audit Logs'
        break
      case 'settings':
        label = 'System Settings'
        break
      case 'search':
        label = 'Search'
        break
      default:
        // Capitalize first letter and handle special cases
        label = segment.charAt(0).toUpperCase() + segment.slice(1)
        // Handle UUIDs or complex identifiers
        if (segment.length > 20) {
          label = segment.substring(0, 8) + '...'
        }
        break
    }
    
    return {
      label,
      path,
      isLast
    }
  })

  const { isHidden } = useScrollHidden(80)

  return (
    <header 
      className={cn(
        "flex h-16 shrink-0 items-center gap-2 transition-all duration-300 ease-in-out group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12",
        "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
        isHidden && "transform -translate-y-full"
      )}
    >
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb) => (
              <BreadcrumbItem key={breadcrumb.path} className="hidden md:block">
                {breadcrumb.isLast ? (
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                ) : (
                  <>
                    <BreadcrumbLink href={breadcrumb.path}>
                      {breadcrumb.label}
                    </BreadcrumbLink>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="ml-auto flex items-center gap-2 px-4">
        {/* Global admin search */}
        <div className="relative hidden md:block">
          <SearchCommand variant="admin" />
        </div>
        
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  )
}