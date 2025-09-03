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
import { MoreVertical, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FolderOpen } from "lucide-react"
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

// Type for our project data - matching the API response structure
interface ProjectRow {
  id: string
  name: string
  description: string | null
  createdAt: Date | string
  updatedAt: Date | string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  imageCount: number
  completedImages: number
  pendingImages: number
  processingImages: number
  failedImages: number
}

interface AdminProjectsTableProps {
  data: ProjectRow[]
  isLoading: boolean
  pagination: PaginationState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  onPaginationChange: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void
  onColumnFiltersChange: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void
  onDeleteProject: (projectId: string) => void
  onViewProject?: (project: ProjectRow) => void
  totalCount: number
}

const formatDate = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  })
}

const getStatusBadge = (project: ProjectRow) => {
  const { imageCount, completedImages, pendingImages, processingImages, failedImages } = project
  
  if (imageCount === 0) {
    return <Badge variant="secondary">Empty</Badge>
  }
  
  if (failedImages > 0) {
    return <Badge variant="destructive">{failedImages} Failed</Badge>
  }
  
  if (processingImages > 0) {
    return <Badge variant="default">{processingImages} Processing</Badge>
  }
  
  if (pendingImages > 0) {
    return <Badge variant="outline">{pendingImages} Pending</Badge>
  }
  
  if (completedImages === imageCount) {
    return <Badge variant="secondary">All Complete</Badge>
  }
  
  return <Badge variant="outline">Mixed</Badge>
}

export function AdminProjectsTable({
  data,
  isLoading,
  pagination,
  sorting,
  columnFilters,
  onPaginationChange,
  onSortingChange, 
  onColumnFiltersChange,
  onDeleteProject,
  onViewProject,
  totalCount
}: AdminProjectsTableProps) {
  
  // Define columns with proper typing and stable reference
  const columns = useMemo<ColumnDef<ProjectRow>[]>(() => [
    {
      id: "project",
      header: "Project",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium text-sm">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.imageCount} images
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
      id: "imageCount",
      accessorFn: (row) => row.imageCount,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Images
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
        <div className="text-sm">{row.original.imageCount}</div>
      ),
      enableColumnFilter: false,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original),
      enableSorting: false,
      enableColumnFilter: false,
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
            {onViewProject && (
              <DropdownMenuItem onClick={() => onViewProject(row.original)}>
                <Eye className="w-4 h-4 mr-2" />
                View Project
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onDeleteProject(row.original.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 40
    }
  ], [onDeleteProject, onViewProject])

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
                  No projects found.
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