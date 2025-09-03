"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Search, FolderOpen, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProjectList, useDeleteProject } from "@/lib/admin/project-hooks"
import { useProjectFilters } from "@/lib/admin/project-store"
import { AdminProjectsTable } from "@/components/admin/admin-projects-table"
import { toast } from "sonner"
import type { SortingState, ColumnFiltersState, PaginationState } from "@tanstack/react-table"
import type { ProjectListQuery } from "@/lib/admin/project-schemas"
import type { AdvancedDelete } from "@/lib/shared/schemas/delete-schemas"

export default function AdminProjectsPage() {
  const queryClient = useQueryClient()
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [viewProject, setViewProject] = useState<{
    id: string
    name: string
    description: string | null
    createdAt: Date | string
    updatedAt: Date | string
    user: {
      name: string | null
      email: string
    }
    imageCount: number
    completedImages: number
    pendingImages: number
    processingImages: number
    failedImages: number
  } | null>(null)
  
  // Use our new stores and hooks for basic filtering
  const { 
    searchQuery, 
    setSearchQuery, 
  } = useProjectFilters()

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
  const buildQuery = (): ProjectListQuery => {
    const query: ProjectListQuery = {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy: (sorting[0]?.id as 'createdAt' | 'updatedAt' | 'name' | 'userName' | 'imageCount') || 'createdAt',
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
        if (filter.id === 'user') {
          query.userId = filter.value as string
        }
      }
    })

    return query
  }

  // Fetch real project data with table state
  const { 
    data: projectData, 
    isLoading, 
    error,
    refetch 
  } = useProjectList(buildQuery())

  // Delete mutation
  const deleteMutation = useDeleteProject({
    onSuccess: (data, variables) => {
      const options = variables.options
      let message = 'Project deleted successfully'
      
      if (options.deleteVariants && options.deleteSourceFile) {
        message += ' - All images and files removed'
      } else if (options.deleteVariants) {
        message += ' - Images deleted, source files preserved'
      } else if (options.deleteSourceFile) {
        message += ' - Images moved to unassigned, files deleted'
      } else {
        message += ' - Images moved to unassigned, files preserved'
      }
      
      toast.success(message)
      setDeleteProjectId(null)
      refetch()
      // Invalidate main app queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`)
    }
  })

  // Update search with debouncing - reset to first page when searching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Get projects from API response
  const projects = projectData?.projects || []
  const totalCount = projectData?.pagination?.total || 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage user projects
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects, users..."
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
            <FolderOpen className="h-5 w-5" />
            All Projects {isLoading ? '(Loading...)' : `(${totalCount})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 p-4 bg-red-50 rounded-md mb-4">
              Error loading projects: {error.message}
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
          
          <AdminProjectsTable
            data={projects}
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
            onDeleteProject={setDeleteProjectId}
            onViewProject={setViewProject}
            totalCount={totalCount}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deleteProjectId}
        onClose={() => setDeleteProjectId(null)}
        onConfirm={(options) => {
          if (deleteProjectId) {
            // Type guard ensures we have AdvancedDelete for admin context
            const adminOptions: AdvancedDelete = 'deleteVariants' in options 
              ? options // Already AdvancedDelete from admin context
              : { 
                  // Transform SimpleDelete to AdvancedDelete with sensible defaults
                  deleteVariants: true, 
                  deleteSourceFile: false, // Default to NOT deleting files
                  reason: options.reason 
                }
            
            deleteMutation.mutate({ 
              id: deleteProjectId, 
              options: adminOptions 
            })
          }
        }}
        context="admin"
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone and will remove the project and all its associated images."
        itemName="this project"
        isLoading={deleteMutation.isPending}
      />

      {/* Project View Dialog */}
      <Dialog open={!!viewProject} onOpenChange={() => setViewProject(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {viewProject?.name}
            </DialogTitle>
          </DialogHeader>
          {viewProject && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Project Details</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Name:</span>
                        <span className="text-sm">{viewProject.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Created:</span>
                        <span className="text-sm">{new Date(viewProject.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Updated:</span>
                        <span className="text-sm">{new Date(viewProject.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Owner</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Name:</span>
                        <span className="text-sm">{viewProject.user.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{viewProject.user.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Statistics</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total Images:</span>
                        <span className="text-sm">{viewProject.imageCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Completed:</span>
                        <span className="text-sm text-green-600">{viewProject.completedImages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Processing:</span>
                        <span className="text-sm text-blue-600">{viewProject.processingImages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Pending:</span>
                        <span className="text-sm text-yellow-600">{viewProject.pendingImages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Failed:</span>
                        <span className="text-sm text-red-600">{viewProject.failedImages}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}