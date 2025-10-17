"use client"

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { DeleteContext, SimpleDelete, AdvancedDelete } from '@/lib/shared/schemas/delete-schemas'

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: SimpleDelete | AdvancedDelete) => void
  context: DeleteContext
  title?: string
  description?: string
  itemName?: string
  isLoading?: boolean
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  context,
  title = "Delete Item",
  description,
  itemName = "this item",
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const [reason, setReason] = useState('')
  const [deleteVariants, setDeleteVariants] = useState(false)
  const [deleteSourceImage, setDeleteSourceImage] = useState(false)
  const [deleteSourceFile, setDeleteSourceFile] = useState(false)

  const handleConfirm = () => {
    if (context === 'main') {
      const options: SimpleDelete = {
        confirm: true,
        reason: reason.trim() || undefined,
      }
      onConfirm(options)
    } else {
      const options: AdvancedDelete = {
        reason: reason.trim() || undefined,
        deleteVariants,
        deleteSourceImage,
        deleteSourceFile,
      }
      onConfirm(options)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setReason('')
      setDeleteVariants(false)
      setDeleteSourceImage(false)
      setDeleteSourceFile(false)
      onClose()
    }
  }

  const defaultDescription = `Are you sure you want to delete ${itemName}? This action cannot be undone.`

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Admin-only fields */}
        {context === 'admin' && (
          <div className="space-y-4 py-4">
            {/* Optional reason field for admin */}
            <div className="space-y-2">
              <Label htmlFor="delete-reason">
                Reason (Optional)
              </Label>
              <Textarea
                id="delete-reason"
                placeholder="Enter reason for deletion..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
                maxLength={500}
                className="min-h-[80px]"
              />
              {reason.length > 450 && (
                <p className="text-xs text-muted-foreground">
                  {500 - reason.length} characters remaining
                </p>
              )}
            </div>

            {/* 3-Tier logical admin options */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete-variants"
                  checked={deleteVariants}
                  onCheckedChange={(checked) => setDeleteVariants(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="delete-variants" className="text-sm">
                  Delete variants from database
                </Label>
              </div>
              <div className="text-xs text-muted-foreground ml-6 -mt-1">
                Clean up failed generations, keep source for reprocessing
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete-source-image"
                  checked={deleteSourceImage}
                  onCheckedChange={(checked) => setDeleteSourceImage(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="delete-source-image" className="text-sm">
                  Delete source image from database
                </Label>
              </div>
              <div className="text-xs text-muted-foreground ml-6 -mt-1">
                Removes from app, cascades to delete variants, keeps source file
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete-source-file"
                  checked={deleteSourceFile}
                  onCheckedChange={(checked) => setDeleteSourceFile(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="delete-source-file" className="text-sm font-medium">
                  Delete source file from storage (irreversible)
                </Label>
              </div>
              <div className="text-xs text-muted-foreground ml-6 -mt-1">
                Nuclear option: deletes everything (file + database records)
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}