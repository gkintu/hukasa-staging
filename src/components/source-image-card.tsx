"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { CardActionsMenu } from "@/components/ui/card-actions-menu"
import { RenameModal } from "@/components/ui/rename-modal"
import { useState } from "react"
import Link from "next/link"
import { Folder } from "lucide-react"

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
  displayName: string | null
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
  onRename?: (id: string, newDisplayName: string) => void
  onDelete?: (id: string) => void
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
  onRename,
  onDelete,
  index = 0
}: SourceImageCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(image.displayName || image.originalFileName)
  const [isSaving, setIsSaving] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  
  const handleSaveRename = async () => {
    if (!onRename || !editValue.trim() || editValue === (image.displayName || image.originalFileName)) {
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      await onRename(image.id, editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to rename:', error)
      setEditValue(image.displayName || image.originalFileName)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleCancelEdit = () => {
    setEditValue(image.displayName || image.originalFileName)
    setIsEditing(false)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleMenuRename = () => {
    setShowRenameModal(true)
  }

  const handleModalRename = async (newDisplayName: string) => {
    if (onRename) {
      await onRename(image.id, newDisplayName)
    }
  }

  const handleMenuDelete = () => {
    if (onDelete) {
      onDelete(image.id)
    }
  }

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
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in pt-0 ${
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
              alt={image.displayName || image.originalFileName}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
          
          <div className="absolute top-2 right-2">
            {!isSelectable && (onRename || onDelete) && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <CardActionsMenu
                  onRename={onRename ? handleMenuRename : undefined}
                  onDelete={onDelete ? handleMenuDelete : undefined}
                  renameLabel="Rename Image"
                  deleteLabel="Delete Image"
                />
              </div>
            )}
          </div>

          <div className="absolute bottom-2 left-2">
            {getStatusBadge(image.variants)}
          </div>

        </div>

        <div className="p-4 pb-0.5">
          <div className="flex items-center justify-between mb-2">
            {isEditing && onRename ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                className="font-semibold text-lg flex-1 mr-2"
                disabled={isSaving}
                autoFocus
              />
            ) : (
              <h3 
                className="font-semibold text-lg truncate flex-1 mr-2 cursor-pointer hover:text-primary transition-colors" 
                title={image.displayName || image.originalFileName}
                onClick={(e) => {
                  if (onRename) {
                    e.stopPropagation()
                    setIsEditing(true)
                  }
                }}
              >
                {image.displayName || image.originalFileName}
              </h3>
            )}
          </div>
          
          <div className="space-y-2">
            {/* Project name for detailed view */}
            {isDetailed && hasProjectName && (
               <Link href={`/?project=${(image as SourceImageWithProject).projectId}`} onClick={(e) => e.stopPropagation()}>
               <div className="text-sm font-medium truncate flex items-center hover:text-primary transition-colors" title={(image as SourceImageWithProject).projectName}>
                 <Folder className="w-4 h-4 mr-2" />
                 {(image as SourceImageWithProject).projectName}
               </div>
             </Link>
            )}
            
          </div>
        </div>
      </CardContent>
      
      {/* Rename Modal */}
      <RenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onRename={handleModalRename}
        currentName={image.displayName || image.originalFileName}
        itemType="image"
      />
    </Card>
  )
}