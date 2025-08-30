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
import { ThemeToggle } from "@/components/theme-toggle"
import { SearchCommand } from "@/components/search-command"
import { useScrollHidden } from "@/hooks/use-scroll-effects"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Upload, Settings } from "lucide-react"

interface MainAppHeaderProps {
  activeView: string
  projectName?: string
  imageName?: string
  onNavigate: (view: string) => void
  showSearch?: boolean
  onUploadClick?: () => void
  onSettingsClick?: () => void
}

export function MainAppHeader({ 
  activeView, 
  projectName, 
  imageName, 
  onNavigate,
  showSearch = false,
  onUploadClick,
  onSettingsClick
}: MainAppHeaderProps) {
  // Generate dynamic breadcrumbs based on current view and context
  const generateBreadcrumbs = () => {
    const breadcrumbs = [
      { label: 'Dashboard', path: 'dashboard', isLast: false }
    ]

    switch (activeView) {
      case 'allImages':
        breadcrumbs.push({ label: 'All Images', path: 'allImages', isLast: !imageName })
        if (imageName) {
          breadcrumbs.push({ label: imageName, path: '', isLast: true })
        }
        break
      
      case 'projects':
        breadcrumbs.push({ label: 'Projects', path: 'projects', isLast: !projectName })
        if (projectName) {
          breadcrumbs.push({ label: projectName, path: '', isLast: !imageName })
          if (imageName) {
            breadcrumbs.push({ label: imageName, path: '', isLast: true })
          }
        }
        break
      
      case 'unassigned':
        breadcrumbs.push({ label: 'Unassigned Images', path: 'unassigned', isLast: !imageName })
        if (imageName) {
          breadcrumbs.push({ label: imageName, path: '', isLast: true })
        }
        break
        
      case 'help':
        breadcrumbs.push({ label: 'Help', path: 'help', isLast: true })
        break
        
      default:
        breadcrumbs[0].isLast = true
        break
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()
  const { isHidden } = useScrollHidden(80)

  const handleBreadcrumbClick = (path: string) => {
    if (path) {
      onNavigate(path)
    }
  }

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
            {breadcrumbs.map((breadcrumb, index) => (
              <BreadcrumbItem key={`${breadcrumb.path}-${index}`} className="hidden md:block">
                {breadcrumb.isLast ? (
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                ) : (
                  <>
                    <BreadcrumbLink 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handleBreadcrumbClick(breadcrumb.path)
                      }}
                      className="cursor-pointer hover:text-foreground"
                    >
                      {breadcrumb.label}
                    </BreadcrumbLink>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                  </>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="ml-auto flex items-center gap-2 px-4">
        {/* Global search */}
        {showSearch && (
          <div className="relative hidden md:block">
            <SearchCommand variant="main" />
          </div>
        )}
        
        {/* Action buttons */}
        {onUploadClick && (
          <Button
            onClick={onUploadClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
        )}
        
        {onSettingsClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  )
}