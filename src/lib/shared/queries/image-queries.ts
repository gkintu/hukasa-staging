import type { 
  MainImageListQuery, 
  MainImageListResponse,
  BasicImage,
  BasicProject
} from '../schemas/image-schemas';

/**
 * Main App API Functions (extracted from admin pattern)
 * Uses the same fetch pattern but hits main app endpoints
 */

// Main app image list fetch (equivalent to admin's fetchImageList)
export async function fetchMainImageList(query: MainImageListQuery = {}): Promise<BasicImage[]> {
  const response = await fetch('/api/images');
  const data: MainImageListResponse = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch images');
  }
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch images');
  }

  let images = data.sourceImages || [];
  
  // Apply filters (same logic as current main app)
  if (query.unassignedOnly) {
    images = images.filter(img => img.projectName === "📥 Unassigned Images");
  }
  
  if (query.projectId) {
    images = images.filter(img => img.projectId === query.projectId);
  }
  
  return images;
}

// Single image detail fetch (for future use)
export async function fetchMainImageDetail(id: string): Promise<BasicImage> {
  const response = await fetch(`/api/images/${id}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch image details');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.image;
}

// Project list fetch (extracted from main app pattern)
export async function fetchProjectList(): Promise<BasicProject[]> {
  const response = await fetch('/api/projects');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch projects');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.projects || [];
}

// Project detail fetch (extracted from main app pattern)
export async function fetchProjectDetail(projectId: string): Promise<{ project: BasicProject; images: BasicImage[] }> {
  const response = await fetch(`/api/projects/${projectId}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch project details');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return {
    project: data.project,
    images: data.sourceImages || []
  };
}

// Image rename function (extracted from main app)
export async function renameImage(imageId: string, newDisplayName: string): Promise<void> {
  const response = await fetch(`/api/images/${imageId}/rename`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ displayName: newDisplayName })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to rename image');
  }
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to rename image');
  }
}