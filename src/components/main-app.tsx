"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Settings, Upload } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { Projects } from "@/components/projects"
import { SettingsPage } from "@/components/settings-page"
import { Help } from "@/components/help"
import { UploadModal } from "@/components/upload-modal"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface MainAppProps {
  user: User
}

export function MainApp({ user }: MainAppProps) {
  const [activeView, setActiveView] = useState<"dashboard" | "projects" | "settings" | "help">("dashboard")
  const [showUploadModal, setShowUploadModal] = useState(false)

  const handleSidebarNavigation = (view: "dashboard" | "projects" | "help") => {
    setActiveView(view)
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
          {activeView === "dashboard" && <Dashboard user={user} />}
          {activeView === "projects" && <Projects user={user} />}
          {activeView === "settings" && <SettingsPage user={user} />}
          {activeView === "help" && <Help />}
        </div>
      </main>
      
      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        user={user}
      />
    </div>
  )
}