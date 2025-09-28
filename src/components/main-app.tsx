"use client"

import { useState, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { MainAppSidebar } from "@/components/main-app-sidebar"
import { MainAppHeader } from "@/components/main-app-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Dashboard } from "@/components/dashboard"
import { Projects } from "@/components/projects"
import { AllImages, AllImagesRef } from "@/components/all-images"
import { ProjectDetail, ProjectDetailRef } from "@/components/project-detail"
import { SettingsPage } from "@/components/settings-page"
import { Help } from "@/components/help"
import { UploadModal } from "@/components/upload-modal"
import { AnnouncementBanner } from "@/components/announcement-banner"

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
import { type ImageSelectHandler } from '@/lib/shared/types/image-types'

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
  
  // Refs for refreshing components
  const allImagesRef = useRef<AllImagesRef>(null)
  const unassignedImagesRef = useRef<AllImagesRef>(null)
  const projectDetailRef = useRef<ProjectDetailRef>(null)
  
  // Get URL parameters
  const projectParam = searchParams.get('project')
  const allImagesParam = searchParams.get('allImages')
  const unassignedParam = searchParams.get('unassigned')

  const handleSidebarNavigation = (view: "dashboard" | "allImages" | "projects" | "help") => {
    setActiveView(view)
    // Clear any URL parameters when navigating via sidebar
    if (view === "allImages") {
      router.push('/?allImages=true')
    } else {
      router.push('/')
    }
  }
  
  const handleHeaderNavigation = (view: string) => {
    // Handle navigation from header (string type to match MainAppHeader interface)
    if (view === "dashboard" || view === "allImages" || view === "projects" || view === "help") {
      handleSidebarNavigation(view)
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

  const handleImageSelect: ImageSelectHandler = (imageId: string) => {
    // Navigate to dedicated image page
    const currentProject = searchParams.get('project')
    const currentAllImages = searchParams.get('allImages')
    const currentUnassigned = searchParams.get('unassigned')

    let imageUrl = `/image/${imageId}`

    // Preserve context in URL parameters for proper back navigation
    if (currentProject) {
      imageUrl += `?project=${currentProject}`
    } else if (currentAllImages) {
      imageUrl += `?allImages=true`
    } else if (currentUnassigned) {
      imageUrl += `?unassigned=true`
    }

    router.push(imageUrl)
  }


  const handleUploadClick = () => {
    setShowUploadModal(true)
  }

  const queryClient = useQueryClient()

  const handleUploadSuccess = useCallback(() => {
    // ✅ NEW: Unified cache invalidation - all views update automatically!
    // This invalidates ALL image list caches (dashboard, all images, project detail, unassigned)
    queryClient.invalidateQueries({
      queryKey: ['images', 'list'],
      exact: false // ✅ Catches ALL image list queries regardless of filters!
    })

    // Also invalidate project lists since image counts may have changed
    queryClient.invalidateQueries({
      queryKey: ['projects'],
      exact: false // ✅ Catches ALL project queries!
    })
  }, [queryClient])

  const defaultOpen = getCookie("sidebar_state") !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <MainAppSidebar 
        activeView={activeView} 
        onViewChange={handleSidebarNavigation} 
      />
      
      <SidebarInset>
          <MainAppHeader
          activeView={
            projectParam ? "project" :
            unassignedParam ? "unassigned" :
            allImagesParam ? "allImages" :
            activeView
          }
          projectName={projectParam ? `Project ${projectParam}` : undefined}
          onNavigate={handleHeaderNavigation}
          onSettingsClick={() => setActiveView("settings")}
        />

          <main className="flex-1 overflow-auto p-4" role="main">
            <AnnouncementBanner />
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
          ) : allImagesParam ? (
            <AllImages
              ref={allImagesRef}
              onImageSelect={handleImageSelect}
              onUploadClick={handleUploadClick}
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
    </SidebarProvider>
  )
}