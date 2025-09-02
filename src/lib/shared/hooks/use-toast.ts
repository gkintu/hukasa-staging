import { toast as sonnerToast } from 'sonner'

/**
 * Unified toast hook for both admin and main app
 * Provides consistent toast notifications throughout the application
 */
export const useToast = () => {
  return {
    success: (message: string) => sonnerToast.success(message),
    error: (message: string) => sonnerToast.error(message),
    info: (message: string) => sonnerToast.info(message),
    warning: (message: string) => sonnerToast.warning(message),
    loading: (message: string) => sonnerToast.loading(message),
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
  }
}

/**
 * Direct toast utilities for non-hook contexts
 */
export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message), 
  info: (message: string) => sonnerToast.info(message),
  warning: (message: string) => sonnerToast.warning(message),
  loading: (message: string) => sonnerToast.loading(message),
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
}