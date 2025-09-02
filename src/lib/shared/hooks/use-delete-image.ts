import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import type { DeleteContext, DeleteResponse, SimpleDelete, AdvancedDelete } from '@/lib/shared/schemas/delete-schemas'
import { invalidateImageQueries } from '@/lib/shared/utils/query-keys'
import { toast } from './use-toast'

interface DeleteImageParams {
  id: string
  context: DeleteContext
  options: SimpleDelete | AdvancedDelete
}

/**
 * Unified delete image function that handles both admin and main app contexts
 */
async function deleteImage({ id, context, options }: DeleteImageParams): Promise<DeleteResponse> {
  const endpoint = context === 'admin' ? `/api/admin/images/${id}` : `/api/images/${id}/delete`
  
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete image')
  }

  return data
}

/**
 * Hook for deleting images with context-aware behavior
 * 
 * @param context - 'main' for main app, 'admin' for admin panel
 * @param options - Additional mutation options
 */
export function useDeleteImage(
  context: DeleteContext = 'main',
  options?: UseMutationOptions<DeleteResponse, Error, DeleteImageParams>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteImage,
    onSuccess: (data, variables) => {
      // Show success message
      const message = context === 'admin' 
        ? `Successfully deleted ${data.data.deletedVariants || 1} variant(s)`
        : 'Image deleted successfully'
      toast.success(message)

      // Invalidate relevant queries based on context
      if (context === 'admin') {
        // Admin context - invalidate admin queries
        queryClient.invalidateQueries({ queryKey: invalidateImageQueries.adminAll() })
        queryClient.invalidateQueries({ queryKey: invalidateImageQueries.adminLists() })
        queryClient.removeQueries({ queryKey: invalidateImageQueries.adminDetail(variables.id) })
      } else {
        // Main app context - invalidate main app queries
        queryClient.invalidateQueries({ queryKey: invalidateImageQueries.all() })
        queryClient.invalidateQueries({ queryKey: invalidateImageQueries.lists() })
        queryClient.removeQueries({ queryKey: invalidateImageQueries.detail(variables.id) })
      }

      // Always invalidate project queries as images belong to projects
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      console.error('Delete image error:', error)
      const errorMessage = error.message || 'Failed to delete image. Please try again.'
      toast.error(errorMessage)
    },
    ...options,
  })
}

/**
 * Convenience hooks for specific contexts
 */
export const useDeleteImageMain = (options?: UseMutationOptions<DeleteResponse, Error, DeleteImageParams>) => 
  useDeleteImage('main', options)

export const useDeleteImageAdmin = (options?: UseMutationOptions<DeleteResponse, Error, DeleteImageParams>) => 
  useDeleteImage('admin', options)

/**
 * Legacy compatibility - simple delete function for basic main app usage
 */
export function useSimpleDeleteImage(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  const deleteImageMutation = useDeleteImageMain()

  return {
    deleteImage: (id: string, reason?: string) => {
      const deleteOptions: SimpleDelete = {
        confirm: true,
        reason,
      }

      deleteImageMutation.mutate(
        { id, context: 'main', options: deleteOptions },
        {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }
      )
    },
    isLoading: deleteImageMutation.isPending,
    error: deleteImageMutation.error,
  }
}