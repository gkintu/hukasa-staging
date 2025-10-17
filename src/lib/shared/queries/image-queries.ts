import type {
  MainImageListQuery,
  MainImageListResponse,
  BasicImage,
  BasicProject
} from '../schemas/image-schemas';
import { UNASSIGNED_PROJECT_NAME } from '@/lib/constants/project-constants';

/**
 * Main App API Functions with separated metadata and URL endpoints
 * Metadata: Long-lived cached data from /api/images/metadata
 * URLs: Short-lived signed URLs from /api/images/refresh-urls
 */

// Fetch metadata only (cached, no URLs)
export async function fetchImageMetadata(query: MainImageListQuery = {}): Promise<BasicImage[]> {
  const response = await fetch('/api/images/metadata');
  const data: MainImageListResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch image metadata');
  }

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch image metadata');
  }

  let images = data.sourceImages || [];

  // Apply filters (same logic as current main app)
  if (query.unassignedOnly) {
    images = images.filter(img => img.projectName === UNASSIGNED_PROJECT_NAME);
  }

  if (query.projectId) {
    images = images.filter(img => img.projectId === query.projectId);
  }

  return images;
}

// Refresh signed URLs for images and variants
export async function refreshImageUrls(images: BasicImage[]): Promise<{ images: Record<string, string>; variants: Record<string, string | null> }> {
  const imageData = images.map(img => ({
    id: img.id,
    path: img.originalImagePath
  }));

  const variantData = images.flatMap(img =>
    img.variants.map(variant => ({
      id: variant.id,
      path: variant.stagedImagePath
    }))
  );

  const response = await fetch('/api/images/refresh-urls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: imageData,
      variants: variantData
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to refresh URLs');
  }

  if (!data.success) {
    throw new Error(data.message || 'Failed to refresh URLs');
  }

  return data.urls;
}

// Combined function that merges metadata with fresh URLs
export async function fetchMainImageList(query: MainImageListQuery = {}): Promise<BasicImage[]> {
  // 1. Fetch metadata (cached)
  const images = await fetchImageMetadata(query);

  // 2. Skip URL refresh if no images
  if (images.length === 0) {
    return images;
  }

  // 3. Refresh URLs
  const urls = await refreshImageUrls(images);

  // 4. Merge URLs into metadata
  return images.map(image => ({
    ...image,
    signedUrl: urls.images[image.id] || null,
    variants: image.variants.map(variant => ({
      ...variant,
      signedUrl: urls.variants[variant.id] || null
    }))
  }));
}

// Single image detail fetch with separated metadata and URL endpoints
export async function fetchMainImageDetail(id: string): Promise<BasicImage> {
  // Note: For now, we'll use the combined list approach and filter
  // In the future, we could create a specific detail metadata endpoint
  const images = await fetchImageMetadata();
  const image = images.find(img => img.id === id);

  if (!image) {
    throw new Error('Image not found');
  }

  // Refresh URLs for this specific image
  const urls = await refreshImageUrls([image]);

  return {
    ...image,
    signedUrl: urls.images[image.id] || null,
    variants: image.variants.map(variant => ({
      ...variant,
      signedUrl: urls.variants[variant.id] || null
    }))
  };
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