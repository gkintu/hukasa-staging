import { useQueryClient } from '@tanstack/react-query'

/**
 * Global image error handler for expired signed URLs (Nuclear Approach)
 *
 * When an image fails to load (403 error from expired URL), this handler:
 * 1. Invalidates ALL image queries in TanStack Query cache
 * 2. Triggers automatic refetch to get fresh signed URLs for ALL images
 * 3. Re-renders components with new URLs
 *
 * Why nuclear (invalidate all) instead of surgical (specific image)?
 * - If one URL expired (60+ min), likely ALL URLs expired
 * - Nuclear = 1 API call to refresh all images
 * - Surgical = 20+ API calls (one per broken image)
 * - Better UX: All images fix at once vs popping in one-by-one
 * - Simpler implementation for rare edge case
 *
 * Based on TanStack Query docs pattern for handling expired signed URLs.
 * See: https://github.com/TanStack/query/discussions/2495
 */
export function useImageErrorHandler() {
  const queryClient = useQueryClient()
  let isRefreshing = false

  return () => {
    // Prevent multiple simultaneous refreshes (debounce)
    if (isRefreshing) return

    isRefreshing = true
    console.log('🔄 Image failed to load (likely expired URL), refreshing ALL signed URLs...')

    // Nuclear option: Invalidate ALL image queries
    queryClient.invalidateQueries({
      queryKey: ['images'],
      refetchType: 'all', // Refetch both active and inactive queries
    })

    // Reset debounce flag after 1 second
    setTimeout(() => {
      isRefreshing = false
    }, 1000)
  }
}