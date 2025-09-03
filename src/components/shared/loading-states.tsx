'use client'

import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingSpinnerStateProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export function LoadingSpinnerState({ 
  size = 'md', 
  text, 
  className 
}: LoadingSpinnerStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 space-y-4", className)}>
      <LoadingSpinner size={size} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}

interface LoadingButtonProps {
  isLoading: boolean
  loadingText?: string
  children: React.ReactNode
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  onClick?: () => void
}

export function LoadingButton({
  isLoading,
  loadingText,
  children,
  disabled,
  variant,
  size,
  className,
  onClick
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={isLoading || disabled}
      className={className}
      onClick={onClick}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>{loadingText || 'Loading...'}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  className?: string
  context?: 'main' | 'admin'
}

export function LoadingCard({ 
  title = 'Loading...', 
  description,
  className,
  context = 'main'
}: LoadingCardProps) {
  return (
    <Card className={cn(
      "animate-pulse",
      context === 'admin' && 'border-admin-border',
      className
    )}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <LoadingSpinner size="sm" />
            <div className="space-y-2 flex-1">
              <h3 className="text-lg font-medium">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface LoadingGridProps {
  count?: number
  itemClassName?: string
  className?: string
  context?: 'main' | 'admin'
}

export function LoadingGrid({ 
  count = 6, 
  itemClassName,
  className,
  context = 'main'
}: LoadingGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
      className
    )}>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className={cn(
          "animate-pulse",
          context === 'admin' && 'border-admin-border',
          itemClassName
        )}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="aspect-video w-full rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface LoadingListProps {
  count?: number
  showAvatar?: boolean
  className?: string
  context?: 'main' | 'admin'
}

export function LoadingList({ 
  count = 5, 
  showAvatar = false,
  className,
  context = 'main'
}: LoadingListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className={cn(
          "animate-pulse",
          context === 'admin' && 'border-admin-border'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {showAvatar && (
                <Skeleton className="h-12 w-12 rounded-full" />
              )}
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface LoadingPageProps {
  title?: string
  showBackButton?: boolean
  onBack?: () => void
  className?: string
  context?: 'main' | 'admin'
}

export function LoadingPage({ 
  showBackButton = true,
  onBack,
  className,
}: LoadingPageProps) {
  return (
    <div className={cn("p-8 animate-fade-in", className)}>
      <div className="flex items-center mb-8">
        {showBackButton && (
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mr-4"
            disabled={!onBack}
          >
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <span>Back</span>
            </div>
          </Button>
        )}
        <Skeleton className="h-8 w-48" />
      </div>
      
      <LoadingGrid context="main" />
    </div>
  )
}

interface InlineLoadingProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function InlineLoading({ 
  text = 'Loading...', 
  size = 'sm',
  className 
}: InlineLoadingProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground animate-pulse">
        {text}
      </span>
    </div>
  )
}