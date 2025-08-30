"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Settings, Upload } from "lucide-react"
import { MainAppSidebar } from "@/components/main-app-sidebar"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { LayoutProvider } from "@/lib/layout-provider"
import { Separator } from "@/components/ui/separator"
import { Dashboard } from "@/components/dashboard"
import { Projects } from "@/components/projects"
import { AllImages, AllImagesRef } from "@/components/all-images"
import { ProjectDetail, ProjectDetailRef } from "@/components/project-detail"
import { SettingsPage } from "@/components/settings-page"
import { Help } from "@/components/help"
import { UploadModal } from "@/components/upload-modal"
import { ImageDetailModal } from "@/components/image-detail-modal"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface MainAppProps {
  user: User
}

// Define types for the image detail modal
interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

interface SourceImage {
  id: string
  originalImagePath: string
  originalFileName: string
  displayName: string | null
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

interface SourceImageWithProject extends SourceImage {
  projectId: string
  projectName: string
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

export function MainApp({ user }: MainAppProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [activeView, setActiveView] = useState<"dashboard" | "allImages" | "projects" | "settings" | "help">("dashboard")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedImageForModal, setSelectedImageForModal] = useState<SourceImage | SourceImageWithProject | null>(null)
  
  // Refs for refreshing components
  const allImagesRef = useRef<AllImagesRef>(null)
  const unassignedImagesRef = useRef<AllImagesRef>(null)
  const projectDetailRef = useRef<ProjectDetailRef>(null)
  
  // Get URL parameters
  const projectParam = searchParams.get('project')
  const imageParam = searchParams.get('image')
  const allImagesParam = searchParams.get('allImages')
  const unassignedParam = searchParams.get('unassigned')
  
  useEffect(() => {
    // If there's an image parameter, we should be showing the modal
    if (imageParam && !selectedImageForModal) {
      const fetchImageData = async () => {
        try {
          if (projectParam) {
            // Fetch from specific project
            const response = await fetch(`/api/projects/${projectParam}`)
            const data = await response.json()
            if (data.success) {
              const sourceImage = data.sourceImages.find((img: SourceImage) => img.id === imageParam)
              if (sourceImage) {
                setSelectedImageForModal(sourceImage)
              }
            }
          } else if (allImagesParam || unassignedParam) {
            // Fetch from all images
            const response = await fetch('/api/images')
            const data = await response.json()
            if (data.success) {
              const sourceImage = data.sourceImages.find((img: SourceImageWithProject) => img.id === imageParam)
              if (sourceImage) {
                setSelectedImageForModal(sourceImage)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching image data:', error)
        }
      }
      fetchImageData()
    } else if (!imageParam && selectedImageForModal) {
      // Close modal if no image parameter
      setSelectedImageForModal(null)
    }
  }, [imageParam, selectedImageForModal, projectParam, allImagesParam, unassignedParam])

  const handleSidebarNavigation = (view: "dashboard" | "allImages" | "projects" | "help") => {
    setActiveView(view)
    // Clear any URL parameters when navigating via sidebar
    if (view === "allImages") {
      router.push('/?allImages=true')
    } else {
      router.push('/')
    }
  }

  const handleProjectSelect = (projectId: string, isUnassigned?: boolean) => {
    // Navigate to unassigned view or project detail view
    if (isUnassigned) {
      router.push('/?unassigned=true')
    } else {
      router.push(`/?project=${projectId}`)
    }
  }

  const handleBackToProjects = () => {
    // Navigate back to projects list
    setActiveView("projects")
    router.push('/')
  }

  const handleImageSelect = (imageId: string, sourceImage: SourceImage | SourceImageWithProject) => {
    // Open image detail modal
    setSelectedImageForModal(sourceImage)
    const currentProject = searchParams.get('project')
    const currentAllImages = searchParams.get('allImages')
    const currentUnassigned = searchParams.get('unassigned')
    
    if (currentProject) {
      router.push(`/?project=${currentProject}&image=${imageId}`)
    } else if (currentAllImages) {
      router.push(`/?allImages=true&image=${imageId}`)
    } else if (currentUnassigned) {
      router.push(`/?unassigned=true&image=${imageId}`)
    }
  }

  const handleCloseImageModal = () => {
    setSelectedImageForModal(null)
    const currentProject = searchParams.get('project')
    const currentAllImages = searchParams.get('allImages')
    const currentUnassigned = searchParams.get('unassigned')
    
    if (currentProject) {
      router.push(`/?project=${currentProject}`)
    } else if (currentAllImages) {
      router.push('/?allImages=true')
    } else if (currentUnassigned) {
      router.push('/?unassigned=true')
    } else {
      router.push('/')
    }
  }

  const handleUploadClick = () => {
    setShowUploadModal(true)
  }

  const handleUploadSuccess = useCallback(() => {
    // Refresh the appropriate view based on current state
    if (projectParam) {
      projectDetailRef.current?.refreshProject()
    } else if (unassignedParam) {
      unassignedImagesRef.current?.refreshImages()
    } else if (allImagesParam || activeView === "allImages") {
      allImagesRef.current?.refreshImages()
    }
  }, [projectParam, unassignedParam, allImagesParam, activeView])

  const defaultOpen = getCookie("sidebar_state") !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <LayoutProvider>
        <MainAppSidebar 
          activeView={activeView} 
          onViewChange={handleSidebarNavigation} 
        />
        
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </div>
            
            <div className="ml-auto flex items-center gap-2 px-4">
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveView("settings")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4" role="main">
          {/* Show specific views based on URL parameters, otherwise show view based on activeView */}
          {projectParam ? (
            <ProjectDetail 
              ref={projectDetailRef}
              projectId={projectParam}
              onBack={handleBackToProjects}
              onImageSelect={handleImageSelect}
              onUploadMore={handleUploadClick}
            />
          ) : unassignedParam ? (
            <AllImages 
              ref={unassignedImagesRef}
              onImageSelect={handleImageSelect}
              unassignedOnly={true}
            />
          ) : (
            <>
              {activeView === "dashboard" && <Dashboard user={user} />}
              {activeView === "allImages" && (
                <AllImages 
                  ref={allImagesRef}
                  onImageSelect={handleImageSelect}
                  onUploadClick={handleUploadClick}
                />
              )}
              {activeView === "projects" && (
                <Projects 
                  user={user} 
                  onProjectSelect={handleProjectSelect}
                />
              )}
              {activeView === "settings" && <SettingsPage user={user} />}
              {activeView === "help" && <Help />}
            </>
          )}
          </main>
        </SidebarInset>

        <UploadModal 
          isOpen={showUploadModal} 
          onClose={() => setShowUploadModal(false)}
          projectId={searchParams.get('project') || undefined}
          onUploadSuccess={handleUploadSuccess}
        />
        
        <ImageDetailModal
          isOpen={!!selectedImageForModal}
          onClose={handleCloseImageModal}
          sourceImage={selectedImageForModal}
        />
      </LayoutProvider>
    </SidebarProvider>
  )
}