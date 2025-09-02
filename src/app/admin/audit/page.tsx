"use client"

import { useState, useEffect } from "react"
import { Search, Shield, Calendar, Trash2, Eye, Settings, User, AlertTriangle, Activity, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuditLogs } from '@/lib/admin/audit-hooks'
import { useAuditStore, useAuditFilters, useAuditPagination } from '@/lib/admin/audit-store'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Debounce utility
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function AdminAuditPage() {
  // Local state for search input
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500)
  
  // Get store state and actions
  const getQueryParams = useAuditStore((state) => state.getQueryParams)
  const { filters, setFilters } = useAuditFilters()
  const { currentPage, setCurrentPage, itemsPerPage } = useAuditPagination()
  
  // Build query params
  const queryParams = getQueryParams()
  
  // Update query params with debounced search
  const searchQuery = {
    ...queryParams,
    search: debouncedSearch || undefined
  }
  
  // Fetch audit data
  const { data: auditData, isLoading, error, refetch } = useAuditLogs(searchQuery)

  // Update search in store when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch })
    }
  }, [debouncedSearch, filters.search, setFilters])
  
  // Extract data
  const auditLogs = auditData?.logs || []
  const pagination = auditData?.pagination

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'DELETE_IMAGE':
      case 'BULK_DELETE_IMAGES':
        return <Trash2 className="w-4 h-4 text-red-500" />
      case 'VIEW_USER_PROFILE':
      case 'VIEW_ALL_IMAGES':
      case 'VIEW_AUDIT_LOGS':
        return <Eye className="w-4 h-4 text-blue-500" />
      case 'SUSPEND_USER':
      case 'UNSUSPEND_USER':
        return <Shield className="w-4 h-4 text-orange-500" />
      case 'UPDATE_SETTINGS':
        return <Settings className="w-4 h-4 text-purple-500" />
      case 'CREATE_USER':
      case 'DELETE_USER':
        return <User className="w-4 h-4 text-green-500" />
      case 'MODERATE_IMAGE':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DELETE_IMAGE':
        return <Badge variant="destructive">Delete Image</Badge>
      case 'BULK_DELETE_IMAGES':
        return <Badge variant="destructive">Bulk Delete</Badge>
      case 'VIEW_USER_PROFILE':
        return <Badge variant="secondary">View Profile</Badge>
      case 'VIEW_ALL_IMAGES':
        return <Badge variant="secondary">View Images</Badge>
      case 'VIEW_AUDIT_LOGS':
        return <Badge variant="secondary">View Audit</Badge>
      case 'SUSPEND_USER':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Suspend User</Badge>
      case 'UNSUSPEND_USER':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Unsuspend User</Badge>
      case 'UPDATE_SETTINGS':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Update Settings</Badge>
      case 'CREATE_USER':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Create User</Badge>
      case 'DELETE_USER':
        return <Badge variant="destructive">Delete User</Badge>
      case 'MODERATE_IMAGE':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Moderate Image</Badge>
      default:
        return <Badge variant="outline">{action.replace(/_/g, ' ')}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all administrative actions and maintain compliance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            value={filters.action || 'all'} 
            onValueChange={(value) => setFilters({ action: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="DELETE_IMAGE">Delete Image</SelectItem>
              <SelectItem value="BULK_DELETE_IMAGES">Bulk Delete</SelectItem>
              <SelectItem value="VIEW_USER_PROFILE">View Profile</SelectItem>
              <SelectItem value="VIEW_ALL_IMAGES">View Images</SelectItem>
              <SelectItem value="SUSPEND_USER">Suspend User</SelectItem>
              <SelectItem value="UNSUSPEND_USER">Unsuspend User</SelectItem>
              <SelectItem value="UPDATE_SETTINGS">Settings</SelectItem>
              <SelectItem value="MODERATE_IMAGE">Moderate</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="w-64 pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="px-3"
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Activity Log 
            {pagination && (
              <span className="text-sm font-normal text-muted-foreground">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>Failed to load audit logs: {error.message}</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            {getActionBadge(log.action)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={log.admin.image || ""} alt={log.admin.name || 'Admin'} />
                              <AvatarFallback className="text-xs">
                                {(log.admin.name || log.admin.email).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{log.admin.name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{log.admin.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{log.targetResourceName || 'N/A'}</div>
                            {log.targetUser && (
                              <div className="text-xs text-muted-foreground">
                                User: {log.targetUser.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {formatDate(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {log.metadata && (
                              <div className="text-sm mb-1">
                                {JSON.parse(log.metadata).reason || 'System action'}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              IP: {log.ipAddress || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {searchInput || filters.action ? 
                          "No audit logs found matching your filters." : 
                          "No audit logs found."
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-2 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}