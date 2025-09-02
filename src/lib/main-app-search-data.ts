interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: 'user' | 'project' | 'image' | 'audit'
  url: string
  metadata?: Record<string, unknown>
}

export function getMainAppSearchData(): SearchResult[] {
  return [
    // Navigation items
    { 
      id: 'dashboard', 
      title: 'Dashboard', 
      subtitle: 'Overview of your projects and recent activity', 
      type: 'project', 
      url: '/?page=dashboard' 
    },
    { 
      id: 'projects', 
      title: 'Projects', 
      subtitle: 'Manage your staging projects', 
      type: 'project', 
      url: '/?page=projects' 
    },
    { 
      id: 'all-images', 
      title: 'All Images', 
      subtitle: 'View all your uploaded images', 
      type: 'image', 
      url: '/?allImages=true' 
    },
    { 
      id: 'unassigned-images', 
      title: 'Unassigned Images', 
      subtitle: 'Images not organized into projects', 
      type: 'image', 
      url: '/?unassigned=true' 
    },
    { 
      id: 'settings', 
      title: 'Settings', 
      subtitle: 'Account and preferences', 
      type: 'user', 
      url: '/?page=settings' 
    },
    { 
      id: 'help', 
      title: 'Help & Support', 
      subtitle: 'Get help using the platform', 
      type: 'user', 
      url: '/?page=help' 
    },
    
    // Feature search terms
    { 
      id: 'upload', 
      title: 'Upload Images', 
      subtitle: 'Add new images to your projects', 
      type: 'image', 
      url: '/?page=projects',
      metadata: { action: 'upload' }
    },
    { 
      id: 'create-project', 
      title: 'Create New Project', 
      subtitle: 'Start organizing your images', 
      type: 'project', 
      url: '/?page=projects',
      metadata: { action: 'create' }
    },
    { 
      id: 'virtual-staging', 
      title: 'Virtual Staging', 
      subtitle: 'AI-powered staging for your images', 
      type: 'image', 
      url: '/?allImages=true',
      metadata: { feature: 'staging' }
    },
    { 
      id: 'image-processing', 
      title: 'Image Processing', 
      subtitle: 'View processing status and results', 
      type: 'image', 
      url: '/?allImages=true',
      metadata: { feature: 'processing' }
    },
    { 
      id: 'batch-operations', 
      title: 'Batch Operations', 
      subtitle: 'Move multiple images between projects', 
      type: 'image', 
      url: '/?allImages=true',
      metadata: { feature: 'batch' }
    },
    
    // Search aliases for common user intents
    { 
      id: 'organize', 
      title: 'Organize Images', 
      subtitle: 'Move images into projects', 
      type: 'image', 
      url: '/?unassigned=true',
      metadata: { intent: 'organize' }
    },
    { 
      id: 'gallery', 
      title: 'Image Gallery', 
      subtitle: 'Browse all your images', 
      type: 'image', 
      url: '/?allImages=true',
      metadata: { intent: 'browse' }
    },
    { 
      id: 'recent', 
      title: 'Recent Activity', 
      subtitle: 'Latest uploads and processing', 
      type: 'project', 
      url: '/?page=dashboard',
      metadata: { intent: 'recent' }
    }
  ]
}

// Dynamic search data that can be populated from API calls
export function getDynamicMainAppSearchData(
  projects?: Array<{ id: string; name: string; sourceImageCount: number }>,
  recentImages?: Array<{ id: string; originalFileName: string; projectName?: string }>
): SearchResult[] {
  const dynamicResults: SearchResult[] = []

  // Add user projects
  if (projects) {
    projects.forEach(project => {
      dynamicResults.push({
        id: `project-${project.id}`,
        title: project.name,
        subtitle: `${project.sourceImageCount} images`,
        type: 'project',
        url: `/?project=${project.id}`,
        metadata: { projectId: project.id }
      })
    })
  }

  // Add recent images
  if (recentImages) {
    recentImages.forEach(image => {
      dynamicResults.push({
        id: `image-${image.id}`,
        title: image.originalFileName,
        subtitle: image.projectName ? `In ${image.projectName}` : 'Unassigned',
        type: 'image',
        url: `/?image=${image.id}`,
        metadata: { imageId: image.id }
      })
    })
  }

  return dynamicResults
}