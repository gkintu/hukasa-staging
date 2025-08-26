"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit3, Trash2 } from "lucide-react"

interface CardActionsMenuProps {
  onRename?: () => void
  onDelete?: () => void
  renameLabel?: string
  deleteLabel?: string
  disabled?: boolean
  className?: string
}

export function CardActionsMenu({
  onRename,
  onDelete,
  renameLabel = "Rename",
  deleteLabel = "Delete",
  disabled = false,
  className
}: CardActionsMenuProps) {
  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Don't render if no actions are provided
  if (!onRename && !onDelete) {
    return null
  }

  return (
    <div className={className} onClick={handleMenuClick} onMouseDown={handleMenuClick}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 bg-background/90 hover:bg-muted hover:text-foreground cursor-pointer"
            onClick={handleMenuClick}
            disabled={disabled}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onRename && (
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRename()
              }}
              className="cursor-pointer"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {renameLabel}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}