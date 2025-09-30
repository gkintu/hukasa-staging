"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { CardActionsMenu } from "@/components/ui/card-actions-menu"
import { RenameModal } from "@/components/ui/rename-modal"
import { getVariantStatusBadge } from "@/lib/shared/utils/status-badge"
import { useImageErrorHandler } from "@/lib/shared/utils/image-error-handler"
import { useState } from "react"
import Link from "next/link"
import { Folder } from "lucide-react"
import { SourceImage, SourceImageWithProject } from "@/lib/shared/types/image-types"

interface SourceImageCardProps {
  image: SourceImageWithProject | SourceImage
  variant?: 'default' | 'selectable' | 'detailed'
  isSelected?: boolean
  showProjectName?: boolean
  showCreationDate?: boolean
  onSelect?: (id: string) => void
  onClick?: (image: SourceImageWithProject | SourceImage) => void
  onRename?: (id: string, newDisplayName: string) => void
  onDelete?: (id: string) => void
  index?: number
  // New bulk selection props
  selectable?: boolean
  selected?: boolean
  onSelectionChange?: (checked: boolean) => void
}

export function SourceImageCard({
  image,
  variant = 'default',
  isSelected = false,
  showProjectName = false,
  onSelect,
  onClick,
  onRename,
  onDelete,
  index = 0,
  selectable = false,
  selected = false,
  onSelectionChange
}: SourceImageCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(image.displayName || image.originalFileName)
  const [isSaving, setIsSaving] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const handleImageError = useImageErrorHandler()
  
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



  const isSelectable = variant === 'selectable' || selectable
  const isDetailed = variant === 'detailed'
  const hasProjectName = showProjectName && 'projectName' in image

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger click if clicking on checkbox
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
      e.stopPropagation()
      return
    }
    
    if (isSelectable && !selectable) {
      // Old selectable variant behavior
      e.preventDefault()
      onSelect?.(image.id)
    } else if (selectable) {
      // When using new selectable prop, card click still works normally
      onClick?.(image)
    } else {
      // Normal click behavior
      onClick?.(image)
    }
  }

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in pt-0 ${
        (selectable ? selected : isSelected) ? 'ring-2 ring-primary border-primary' : ''
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        <div className="relative">
          {/* Selection checkbox for selectable variant or bulk selection */}
          {isSelectable && (
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectable ? selected : isSelected}
                onCheckedChange={selectable ? onSelectionChange : () => onSelect?.(image.id)}
                className="bg-background/90 border-2"
              />
            </div>
          )}
          
          <div className="aspect-video overflow-hidden rounded-t-md bg-muted">
            {image.signedUrl ? (
              <img
                src={image.signedUrl}
                alt={image.displayName || image.originalFileName}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  // Trigger global refresh on image load failure (likely 403 expired URL)
                  handleImageError()
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            )}
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
            {getVariantStatusBadge(image.variants)}
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