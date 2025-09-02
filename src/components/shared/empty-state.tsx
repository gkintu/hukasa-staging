import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  }
  className?: string
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "text-center py-16 px-4",
      className
    )}>
      {icon && (
        <div className="mx-auto mb-6 text-muted-foreground">
          {icon}
        </div>
      )}
      
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {action && (
        <Button 
          onClick={action.onClick}
          variant={action.variant || 'default'}
          size="lg"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}