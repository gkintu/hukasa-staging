"use client"

import * as React from "react"
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { useRouter } from "next/navigation"

interface ErrorFallbackProps extends FallbackProps {
  title?: string
  subtitle?: string
  showHomeButton?: boolean
}

function ErrorFallback({ 
  error, 
  resetErrorBoundary, 
  title = "Something went wrong", 
  subtitle = "An unexpected error occurred while loading this content.",
  showHomeButton = true 
}: ErrorFallbackProps) {
  const router = useRouter()
  
  const handleGoHome = () => {
    router.push('/')
    resetErrorBoundary()
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {subtitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground mb-2">
                Error Details (Development)
              </summary>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                {error?.message}
                {error?.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={resetErrorBoundary}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            {showHomeButton && (
              <Button 
                variant="outline"
                onClick={handleGoHome}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface AppErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<FallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  title?: string
  subtitle?: string
  showHomeButton?: boolean
}

export function AppErrorBoundary({ 
  children, 
  fallback,
  onError,
  title,
  subtitle,
  showHomeButton = true 
}: AppErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }
    
    // Call custom error handler if provided
    onError?.(error, errorInfo)
    
    // TODO: In production, send error to logging service
    // Example: logErrorToService(error, errorInfo)
  }

  const FallbackComponent = fallback || ((props: FallbackProps) => (
    <ErrorFallback 
      {...props} 
      title={title}
      subtitle={subtitle}
      showHomeButton={showHomeButton}
    />
  ))

  return (
    <ReactErrorBoundary 
      FallbackComponent={FallbackComponent}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  )
}

// Specialized error boundaries for different contexts

export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary
      title="Page Failed to Load"
      subtitle="There was an error loading this page. Please try refreshing or navigate to another page."
      showHomeButton={true}
    >
      {children}
    </AppErrorBoundary>
  )
}

export function ComponentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary
      title="Component Error"
      subtitle="A component on this page encountered an error."
      showHomeButton={false}
    >
      {children}
    </AppErrorBoundary>
  )
}

export function DataErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary
      title="Data Loading Error"
      subtitle="There was an error loading the required data for this section."
      showHomeButton={false}
    >
      {children}
    </AppErrorBoundary>
  )
}

// Hook for programmatic error handling
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Programmatic error:', error, errorInfo)
    }
    
    // TODO: Log to error service
    throw error
  }, [])
}