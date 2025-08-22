'use client'

import React, { useState, useMemo } from 'react'
import path from 'path'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
  FolderOpen,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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
  onRename?: (file: ManagedFile, newName: string) => void
  className?: string
}

export function FileManager({
  files,
  onDownload,
  onDelete,
  onPreview,
  onRegenerate,
  onBulkDownload,
  onRename,
  className
}: FileManagerProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

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

  const canDownload = (file: ManagedFile) => {
    return file.status === 'completed' && file.downloadUrl
  }

  const columns = useMemo<ColumnDef<ManagedFile>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'thumbnail',
        header: '',
        cell: ({ row }) => {
          const file = row.original
          return file.thumbnailUrl ? (
            <img
              src={file.thumbnailUrl}
              alt={file.fileName}
              className="h-10 w-10 object-cover rounded border"
            />
          ) : (
            <div className="h-10 w-10 bg-muted rounded border flex items-center justify-center">
              <FileImage className="h-4 w-4 text-muted-foreground" />
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'originalFileName',
        id: 'fileName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-medium"
          >
            File
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const file = row.original
          const parsedPath = path.parse(file.originalFileName)
          return (
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground truncate max-w-xs">
                {parsedPath.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {file.fileType.split('/')[1]?.toUpperCase()}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'fileSize',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-medium"
          >
            Size
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ getValue }) => formatFileSize(getValue() as number),
        sortingFn: 'basic',
      },
      {
        id: 'type',
        accessorFn: (row) => {
          const parsedPath = path.parse(row.originalFileName)
          const extension = parsedPath.ext
          return extension ? extension.slice(1).toUpperCase() : 'Unknown'
        },
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-medium"
          >
            Type
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-muted-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'uploadedAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-medium"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Uploaded
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(getValue() as Date)}
          </span>
        ),
        sortingFn: 'datetime',
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const file = row.original
          return (
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
                
                {onRename && (
                  <DropdownMenuItem onClick={() => {
                    const parsedPath = path.parse(file.originalFileName)
                    const currentNameWithoutExt = parsedPath.name
                    const currentExt = parsedPath.ext
                    
                    const newName = prompt('Enter new filename:', currentNameWithoutExt)
                    if (newName && newName.trim() && newName.trim() !== currentNameWithoutExt) {
                      const finalFileName = newName.trim() + currentExt
                      onRename(file, finalFileName)
                    }
                  }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Rename
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
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [onDelete, onDownload, onPreview, onRegenerate, onRename]
  )

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  })

  const getSelectedFiles = (): ManagedFile[] => {
    return table.getSelectedRowModel().rows.map(row => row.original)
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

  const selectedCount = Object.keys(rowSelection).length

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
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={header.id === 'select' ? 'w-12' : header.id === 'thumbnail' ? 'w-16' : header.id === 'fileSize' ? 'w-24' : header.id === 'type' ? 'w-20' : header.id === 'uploadedAt' ? 'w-32' : header.id === 'actions' ? 'w-16' : undefined}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}