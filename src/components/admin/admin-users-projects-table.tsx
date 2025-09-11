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
import { MoreVertical, Eye, User, ArrowUpDown, ArrowUp, ArrowDown, FolderOpen, Image as ImageIcon } from "lucide-react"
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
import type { UserWithProjects } from "@/lib/admin/user-project-schemas"

interface AdminUsersProjectsTableProps {
  data: UserWithProjects[]
  isLoading: boolean
  pagination: PaginationState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  onPaginationChange: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void
  onColumnFiltersChange: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void
  onViewUserProjects: (user: UserWithProjects) => void
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

const getActivityBadge = (user: UserWithProjects) => {
  const { totalImages, completedImages, processingImages, failedImages } = user
  
  if (totalImages === 0) {
    return <Badge variant="secondary">No Images</Badge>
  }
  
  if (failedImages > 0) {
    return <Badge variant="destructive">{failedImages} Failed</Badge>
  }
  
  if (processingImages > 0) {
    return <Badge variant="default">{processingImages} Processing</Badge>
  }
  
  if (completedImages === totalImages) {
    return <Badge variant="secondary">{completedImages} Complete</Badge>
  }
  
  return <Badge variant="outline">Mixed Status</Badge>
}

export function AdminUsersProjectsTable({
  data,
  isLoading,
  pagination,
  sorting,
  columnFilters,
  onPaginationChange,
  onSortingChange, 
  onColumnFiltersChange,
  onViewUserProjects,
  totalCount
}: AdminUsersProjectsTableProps) {
  
  // Define columns with proper typing and stable reference
  const columns = useMemo<ColumnDef<UserWithProjects>[]>(() => [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={row.original.image || undefined} alt={row.original.name || row.original.email} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">
              {row.original.name || row.original.email}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.email}
            </div>
          </div>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    },
    {
      id: "role",
      accessorFn: (row) => row.role,
      header: "Role",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.original.role === 'admin' ? 'default' : 'secondary'}>
            {row.original.role}
          </Badge>
          {row.original.suspended && (
            <Badge variant="destructive" className="text-xs">
              Suspended
            </Badge>
          )}
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    },
    {
      id: "projects",
      accessorFn: (row) => row.projectCount,
      header: ({ column }) => (
        <Button
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Projects
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
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.projectCount}</span>
        </div>
      ),
      sortingFn: "basic"
    },
    {
      id: "images", 
      accessorFn: (row) => row.totalImages,
      header: "Images",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.totalImages}</span>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => getActivityBadge(row.original),
      enableSorting: false,
      enableColumnFilter: false
    },
    {
      id: "lastActive",
      accessorFn: (row) => row.lastActiveAt,
      header: ({ column }) => (
        <Button
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Last Active
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
          {row.original.lastActiveAt 
            ? formatDate(row.original.lastActiveAt)
            : 'Never'
          }
        </div>
      ),
      sortingFn: "datetime"
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onViewUserProjects(row.original)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Projects
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    },
  ], [onViewUserProjects])

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      pagination,
      sorting,
      columnFilters,
    },
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Images</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 w-[150px] bg-muted animate-pulse rounded" />
                        <div className="h-3 w-[100px] bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-[60px] bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-[40px] bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-[40px] bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-[80px] bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-[80px] bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewUserProjects(row.original)}
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
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            totalCount
          )}{" "}
          of {totalCount} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}