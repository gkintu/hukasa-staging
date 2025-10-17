"use client"

import { useState, useEffect } from "react"
import { Search, Users, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserProjectList } from "@/lib/admin/user-project-hooks"
import { useUserProjectFilters } from "@/lib/admin/user-project-store"
import { AdminUsersProjectsTable } from "@/components/admin/admin-users-projects-table"
import { UserProjectsModal } from "@/components/admin/user-projects-modal"
import type { SortingState, ColumnFiltersState, PaginationState } from "@tanstack/react-table"
import type { UserProjectListQuery, UserWithProjects } from "@/lib/admin/user-project-schemas"

export default function AdminProjectsPage() {
  const [viewUser, setViewUser] = useState<UserWithProjects | null>(null)
  
  // Use our new stores and hooks for basic filtering
  const { 
    searchQuery, 
    setSearchQuery, 
  } = useUserProjectFilters()

  // TanStack Table state - controlled externally for server-side operations
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true } // Default sort by creation date
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  // Build query from table state
  const buildQuery = (): UserProjectListQuery => {
    const query: UserProjectListQuery = {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy: (sorting[0]?.id as 'createdAt' | 'updatedAt' | 'name' | 'email' | 'projectCount' | 'lastActiveAt') || 'createdAt',
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc'
    }

    // Add global search
    if (searchQuery?.trim()) {
      query.search = searchQuery.trim()
    }

    // Add column filters
    columnFilters.forEach(filter => {
      if (filter.value) {
        // Handle specific filter types
        if (filter.id === 'role') {
          query.role = filter.value as 'user' | 'admin'
        }
        if (filter.id === 'suspended') {
          query.suspended = filter.value as boolean
        }
      }
    })

    return query
  }

  // Fetch real user project data with table state
  const { 
    data: userProjectData, 
    isLoading, 
    error,
    refetch 
  } = useUserProjectList(buildQuery())

  // Handler for viewing user projects
  const handleViewUserProjects = (user: UserWithProjects) => {
    setViewUser(user)
  }

  // Update search with debouncing - reset to first page when searching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Get users from API response
  const users = userProjectData?.users || []
  const totalCount = userProjectData?.pagination?.total || 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Projects</h1>
          <p className="text-muted-foreground">
            View users and their project activity
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="w-80 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users {isLoading ? '(Loading...)' : `(${totalCount})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 p-4 bg-red-50 rounded-md mb-4">
              Error loading users: {error.message}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          )}
          
          <AdminUsersProjectsTable
            data={users}
            isLoading={isLoading}
            pagination={pagination}
            sorting={sorting}
            columnFilters={columnFilters}
            onPaginationChange={(updater) => {
              const newPagination = typeof updater === 'function' ? updater(pagination) : updater
              setPagination(newPagination)
            }}
            onSortingChange={(updater) => {
              const newSorting = typeof updater === 'function' ? updater(sorting) : updater
              setSorting(newSorting)
            }}
            onColumnFiltersChange={(updater) => {
              const newColumnFilters = typeof updater === 'function' ? updater(columnFilters) : updater
              setColumnFilters(newColumnFilters)
            }}
            onViewUserProjects={handleViewUserProjects}
            totalCount={totalCount}
          />
        </CardContent>
      </Card>

      {/* User Projects Modal */}
      <UserProjectsModal
        user={viewUser}
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
      />
    </div>
  )
}