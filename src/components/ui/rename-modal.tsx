"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RenameModalProps {
  isOpen: boolean
  onClose: () => void
  onRename: (newName: string) => Promise<void>
  currentName: string
  itemType: string // "project" or "image"
  title?: string
}

export function RenameModal({
  isOpen,
  onClose,
  onRename,
  currentName,
  itemType,
  title
}: RenameModalProps) {
  const [newName, setNewName] = useState(currentName)
  const [isRenaming, setIsRenaming] = useState(false)

  // Reset name when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewName(currentName)
    }
  }, [isOpen, currentName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newName.trim() || newName.trim() === currentName || isRenaming) {
      return
    }

    setIsRenaming(true)
    try {
      await onRename(newName.trim())
      onClose()
    } catch (error) {
      console.error('Error renaming:', error)
      // Error is handled by the parent component
    } finally {
      setIsRenaming(false)
    }
  }

  const handleClose = () => {
    if (!isRenaming) {
      setNewName(currentName) // Reset to original name
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isRenaming) {
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {title || `Rename ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                {itemType === 'project' ? 'Project name' : 'Image name'}
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Enter ${itemType} name`}
                disabled={isRenaming}
                className="mt-1"
                autoFocus
                maxLength={255}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newName.trim() || newName.trim() === currentName || isRenaming}
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}