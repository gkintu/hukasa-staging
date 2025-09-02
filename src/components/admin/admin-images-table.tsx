"use client"

import { useMemo } from "react"
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState
} from "@tanstack/react-table"
import { MoreVertical, Eye, Download, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Type for our image data - matching the API response structure
interface ImageRow {
  id: string
  projectId: string
  projectName: string
  originalImagePath: string
  originalFileName: string
  displayName: string | null
  fileSize: number | null
  roomType: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'dining_room' | 'office'
  stagingStyle: 'modern' | 'luxury' | 'traditional' | 'scandinavian' | 'industrial' | 'bohemian'
  operationType: string
  createdAt: Date | string
  completedAt?: Date | string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  totalVariants: number
  completedVariants: number
  failedVariants: number
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed'
}

interface AdminImagesTableProps {
  data: ImageRow[]
  isLoading: boolean
  pagination: PaginationState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  onPaginationChange: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void
  onColumnFiltersChange: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void
  onDeleteImage: (imageId: string) => void
  onViewImage?: (image: ImageRow) => void
  totalCount: number
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'processing':
      return <Badge variant="secondary">Processing</Badge>
    case 'pending':
      return <Badge variant="outline">Pending</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const formatDate = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  })
}

export function AdminImagesTable({
  data,
  isLoading,
  pagination,
  sorting,
  columnFilters,
  onPaginationChange,
  onSortingChange, 
  onColumnFiltersChange,
  onDeleteImage,
  onViewImage,
  totalCount
}: AdminImagesTableProps) {
  
  // Define columns with proper typing and stable reference
  const columns = useMemo<ColumnDef<ImageRow>[]>(() => [
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-muted overflow-hidden">
            <img
              src={`/api/files/${row.original.originalImagePath.split('/').pop()?.split('.')[0]}`}
              alt={row.original.originalFileName}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></div>'
              }}
            />
          </div>
          <div>
            <div className="font-medium text-sm">{row.original.originalFileName}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.roomType.replace('_', ' ')} • {row.original.stagingStyle}
            </div>
          </div>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    },
    {
      id: "user",
      accessorFn: (row) => row.user.name,
      header: ({ column }) => (
        <Button
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          User
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={row.original.user.image || ""} alt={row.original.user.name || ""} />
            <AvatarFallback className="text-xs">
              {(row.original.user.name || row.original.user.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{row.original.user.name || row.original.user.email}</div>
            <div className="text-xs text-muted-foreground">{row.original.user.email}</div>
          </div>
        </div>
      ),
      enableColumnFilter: true,
      filterFn: "includesString",
    },
    {
      id: "project",
      accessorFn: (row) => row.projectName,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Project
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.projectName}</div>
      ),
      enableColumnFilter: true,
      filterFn: "includesString",
    },
    {
      id: "status",
      accessorKey: "overallStatus",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Status
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => getStatusBadge(row.original.overallStatus),
      enableColumnFilter: true,
      filterFn: "equals",
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Created
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </div>
      ),
      enableColumnFilter: false,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onViewImage && (
              <DropdownMenuItem onClick={() => onViewImage(row.original)}>
                <Eye className="w-4 h-4 mr-2" />
                View Image
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onDeleteImage(row.original.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 40
    }
  ], [onDeleteImage, onViewImage])

  // Create table instance with manual pagination and sorting (server-side)
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Server-side sorting
    manualFiltering: true, // Server-side filtering  
    manualPagination: true, // Server-side pagination
    pageCount: Math.ceil(totalCount / pagination.pageSize), // Calculate total pages
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange,
    onColumnFiltersChange,
    onPaginationChange,
    // Disable auto-reset when data changes (important for server-side)
    autoResetPageIndex: false,
  })

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No images found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && data?.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.pageIndex * pagination.pageSize) + 1} to{' '}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} of{' '}
            {totalCount} results
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <select
                value={pagination.pageSize}
                onChange={(e) => {
                  onPaginationChange({
                    pageIndex: 0,
                    pageSize: Number(e.target.value)
                  })
                }}
                className="h-8 w-[70px] rounded border border-input bg-transparent px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}