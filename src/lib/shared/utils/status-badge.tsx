import { Badge } from "@/components/ui/badge"
import { GeneratedVariant } from "@/lib/shared/types/image-types"
import { Loader2 } from "lucide-react"

/**
 * Shared status badge utilities to eliminate duplication across components
 * Centralized logic for consistent badge styling and behavior
 */

// Upload status variants
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed'

// Progress status variants  
export type ProgressStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

// Generation variant status badge with optimistic updates support
export function getVariantStatusBadge(variants: GeneratedVariant[]) {
  const completedCount = variants.filter(v => v.status === 'completed').length
  const processingCount = variants.filter(v => v.status === 'processing').length
  const pendingCount = variants.filter(v => v.status === 'pending').length
  const failedCount = variants.filter(v => v.status === 'failed').length
  
  // Check for optimistic variants (created during generation)
  const optimisticCount = variants.filter(v => v.id.startsWith('optimistic-')).length
  const totalProcessingCount = processingCount + optimisticCount

  // Priority order: Failed -> Processing (including optimistic) -> Pending -> Completed -> None
  if (failedCount > 0) {
    // If we have failures but also processing, show both states
    if (totalProcessingCount > 0) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Generating... ({failedCount} failed)
        </Badge>
      )
    }
    return <Badge variant="destructive">Failed</Badge>
  }
  
  if (totalProcessingCount > 0) {
    // Show processing state with spinner for better UX
    const displayText = optimisticCount > 0 ? 'Generating...' : 'Processing'
    return (
      <Badge variant="secondary" className="animate-pulse bg-blue-100 text-blue-800 border-blue-200">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        {displayText}
      </Badge>
    )
  }
  
  if (pendingCount > 0) {
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Ready to Stage</Badge>
  }
  
  if (completedCount > 0) {
    return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{completedCount} variant{completedCount !== 1 ? 's' : ''}</Badge>
  }
  
  return <Badge variant="secondary" className="bg-muted text-foreground border-border">No variants</Badge>
}

// Upload status badge
export function getUploadStatusBadge(status: UploadStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>
    case 'uploading':
      return <Badge variant="secondary">Uploading</Badge>
    case 'completed':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// Progress status badge
export function getProgressStatusBadge(status: ProgressStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>
    case 'in_progress':
      return <Badge variant="secondary">In Progress</Badge>
    case 'completed':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// Generic status badge (for admin tables and other contexts)
export function getGenericStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
    case 'processing':
    case 'in_progress':
      return <Badge variant="secondary">Processing</Badge>
    case 'pending':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>
    case 'failed':
    case 'error':
      return <Badge variant="destructive">Failed</Badge>
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}