'use client'

import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  MoreHorizontal,
  Trash2,
  Eye,
  RotateCcw,
  FileImage,
  Calendar,
  FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { ManagedFile } from './index'

interface FileManagerProps {
  files: ManagedFile[]
  onDownload?: (file: ManagedFile) => void
  onDelete?: (files: ManagedFile[]) => void
  onPreview?: (file: ManagedFile) => void
  onRegenerate?: (file: ManagedFile) => void
  onBulkDownload?: (files: ManagedFile[]) => void
  className?: string
}

export function FileManager({
  files,
  onDownload,
  onDelete,
  onPreview,
  onRegenerate,
  onBulkDownload,
  className
}: FileManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(f => f.id)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelection = new Set(selectedFiles)
    if (checked) {
      newSelection.add(fileId)
    } else {
      newSelection.delete(fileId)
    }
    setSelectedFiles(newSelection)
  }

  const getSelectedFiles = (): ManagedFile[] => {
    return files.filter(f => selectedFiles.has(f.id))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getStatusBadge = (status: FileStatus) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary">Uploaded</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-primary">Processing</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Ready</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  const canDownload = (file: ManagedFile) => {
    return file.status === 'completed' && file.downloadUrl
  }

  if (files.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No files uploaded</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Upload some images to get started with AI virtual staging. Your processed files will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const selectedCount = selectedFiles.size
  const allSelected = selectedCount === files.length && files.length > 0
  const someSelected = selectedCount > 0 && selectedCount < files.length

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              File Manager
            </CardTitle>
            <CardDescription>
              {files.length} file{files.length === 1 ? '' : 's'} uploaded
              {selectedCount > 0 && `, ${selectedCount} selected`}
            </CardDescription>
          </div>

          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              {onBulkDownload && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onBulkDownload(getSelectedFiles())}
                  disabled={!getSelectedFiles().some(canDownload)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download ({selectedCount})
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(getSelectedFiles())}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedCount})
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected
                    }}
                  />
                </TableHead>
                <TableHead className="w-16"></TableHead>
                <TableHead>File</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Uploaded
                </TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={(checked) => 
                        handleSelectFile(file.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  
                  <TableCell>
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.fileName}
                        className="h-10 w-10 object-cover rounded border"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded border flex items-center justify-center">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-foreground truncate max-w-xs">
                        {file.originalFileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.fileType.split('/')[1]?.toUpperCase()}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(file.status)}
                    {file.status === 'processing' && file.processingProgress && (
                      <div className="mt-1 w-16 bg-muted rounded-full h-1">
                        <div
                          className="bg-primary h-1 rounded-full transition-all"
                          style={{ width: `${file.processingProgress}%` }}
                        />
                      </div>
                    )}
                    {file.status === 'error' && file.error && (
                      <p className="text-xs text-destructive mt-1">
                        {file.error}
                      </p>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(file.uploadedAt)}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onPreview && file.thumbnailUrl && (
                          <DropdownMenuItem onClick={() => onPreview(file)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                        )}
                        
                        {onDownload && canDownload(file) && (
                          <DropdownMenuItem onClick={() => onDownload(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                        )}
                        
                        {onRegenerate && file.status === 'completed' && (
                          <DropdownMenuItem onClick={() => onRegenerate(file)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Regenerate
                          </DropdownMenuItem>
                        )}
                        
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDelete([file])}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}