import { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  context?: 'main' | 'admin' // Context for different behaviors
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  context = 'main'
}: BaseModalProps) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl w-[95vw] h-[95vh]'
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          sizeClasses[size],
          size === 'full' && 'max-h-[95vh] overflow-hidden flex flex-col',
          // Context-specific styling if needed
          context === 'admin' && 'border-admin-border',
          className
        )}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        
        {size === 'full' ? (
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  )
}