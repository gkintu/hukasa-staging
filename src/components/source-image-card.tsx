"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

interface BaseSourceImage {
  id: string
  originalImagePath: string
  originalFileName: string
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

interface SourceImageWithProject extends BaseSourceImage {
  projectId: string
  projectName: string
}

interface SourceImageCardProps {
  image: SourceImageWithProject | BaseSourceImage
  variant?: 'default' | 'selectable' | 'detailed'
  isSelected?: boolean
  showProjectName?: boolean
  showCreationDate?: boolean
  onSelect?: (id: string) => void
  onClick?: (image: SourceImageWithProject | BaseSourceImage) => void
  index?: number
}

export function SourceImageCard({
  image,
  variant = 'default',
  isSelected = false,
  showProjectName = false,
  showCreationDate = false,
  onSelect,
  onClick,
  index = 0
}: SourceImageCardProps) {
  const getStatusBadge = (variants: GeneratedVariant[]) => {
    const completedCount = variants.filter(v => v.status === 'completed').length
    const processingCount = variants.filter(v => v.status === 'processing').length
    const pendingCount = variants.filter(v => v.status === 'pending').length
    const failedCount = variants.filter(v => v.status === 'failed').length

    if (failedCount > 0) {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (processingCount > 0) {
      return <Badge variant="secondary">Processing</Badge>
    }
    if (pendingCount > 0) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Ready to Stage</Badge>
    }
    if (completedCount > 0) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
    }
    return <Badge variant="outline">No variants</Badge>
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isSelectable = variant === 'selectable'
  const isDetailed = variant === 'detailed'
  const hasProjectName = showProjectName && 'projectName' in image

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectable) {
      e.preventDefault()
      onSelect?.(image.id)
    } else {
      onClick?.(image)
    }
  }

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        <div className="relative">
          {/* Selection checkbox for selectable variant */}
          {isSelectable && (
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect?.(image.id)}
                className="bg-background/90 border-2"
              />
            </div>
          )}
          
          <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
            <img
              src={`/api/files/${image.originalImagePath.split('/').pop()?.split('.')[0]}`}
              alt={image.originalFileName}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
          
          <div className="absolute top-2 right-2 flex gap-2">
            {getStatusBadge(image.variants)}
          </div>

        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg truncate flex-1 mr-2" title={image.originalFileName}>
              {image.originalFileName}
            </h3>
          </div>
          
          <div className="space-y-2">
            {/* Project name for detailed view */}
            {isDetailed && hasProjectName && (
              <div className="text-sm font-medium text-primary truncate" title={(image as SourceImageWithProject).projectName}>
                📁 {(image as SourceImageWithProject).projectName}
              </div>
            )}
            
            {/* Creation date for detailed view */}
            {isDetailed && showCreationDate && (
              <div className="text-xs text-muted-foreground">
                {formatDate(image.createdAt)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}