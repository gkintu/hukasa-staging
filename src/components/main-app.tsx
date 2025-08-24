"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Settings, Upload } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { Projects } from "@/components/projects"
import { AllImages } from "@/components/all-images"
import { ProjectDetail } from "@/components/project-detail"
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

export function MainApp({ user }: MainAppProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [activeView, setActiveView] = useState<"dashboard" | "allImages" | "projects" | "settings" | "help">("dashboard")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedImageForModal, setSelectedImageForModal] = useState<SourceImage | SourceImageWithProject | null>(null)
  
  // Get URL parameters
  const projectParam = searchParams.get('project')
  const imageParam = searchParams.get('image')
  const allImagesParam = searchParams.get('allImages')
  
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
          } else if (allImagesParam) {
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
  }, [imageParam, selectedImageForModal, projectParam, allImagesParam])

  const handleSidebarNavigation = (view: "dashboard" | "allImages" | "projects" | "help") => {
    setActiveView(view)
    // Clear any URL parameters when navigating via sidebar
    if (view === "allImages") {
      router.push('/?allImages=true')
    } else {
      router.push('/')
    }
  }

  const handleProjectSelect = (projectId: string) => {
    // Navigate to project detail view
    router.push(`/?project=${projectId}`)
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
    
    if (currentProject) {
      router.push(`/?project=${currentProject}&image=${imageId}`)
    } else if (currentAllImages) {
      router.push(`/?allImages=true&image=${imageId}`)
    }
  }

  const handleCloseImageModal = () => {
    setSelectedImageForModal(null)
    const currentProject = searchParams.get('project')
    const currentAllImages = searchParams.get('allImages')
    
    if (currentProject) {
      router.push(`/?project=${currentProject}`)
    } else if (currentAllImages) {
      router.push('/?allImages=true')
    } else {
      router.push('/')
    }
  }

  const handleUploadClick = () => {
    setShowUploadModal(true)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={handleSidebarNavigation} />
      <main className="flex-1 overflow-auto" role="main">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView("settings")}
            className="gap-2"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        <div className="p-6">
          {/* Show ProjectDetail if there's a project parameter, otherwise show view based on activeView */}
          {projectParam ? (
            <ProjectDetail 
              projectId={projectParam}
              onBack={handleBackToProjects}
              onImageSelect={handleImageSelect}
              onUploadMore={handleUploadClick}
            />
          ) : (
            <>
              {activeView === "dashboard" && <Dashboard user={user} />}
              {activeView === "allImages" && (
                <AllImages 
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
        </div>
      </main>
      
      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        projectId={searchParams.get('project') || undefined}
      />
      
      <ImageDetailModal
        isOpen={!!selectedImageForModal}
        onClose={handleCloseImageModal}
        sourceImage={selectedImageForModal}
      />
    </div>
  )
}