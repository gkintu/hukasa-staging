"use client"

import { useState, useEffect } from "react"
import { Search, Calendar, Shield, MoreVertical, Users, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// Types
type User = {
  id: string
  name: string
  email: string
  image: string | null
  role: 'user' | 'admin'
  suspended: boolean
  createdAt: string
  updatedAt: string
  lastActiveAt: string | null
  lastLoginAt: string | null
  projectCount: number
  imageCount: number
}

type UserResponse = {
  success: boolean
  data: {
    users: User[]
    pagination: {
      page: number
      pageSize: number
      totalCount: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  }
}

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [suspendReason, setSuspendReason] = useState("")
  // Using sonner for toast notifications

  // Fetch users from API
  const fetchUsers = async (search = "", page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        pageSize: pagination.pageSize.toString()
      })
      
      const response = await fetch(`/api/admin/users?${params}`)
      const data: UserResponse = await response.json()
      
      if (data.success) {
        setUsers(data.data.users)
        setPagination(data.data.pagination)
      } else {
        toast.error("Failed to fetch users")
      }
    } catch (error) {
      toast.error("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery, 1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Initial load
  useEffect(() => {
    fetchUsers()
  }, [])

  // Handle user suspension
  const handleSuspendUser = async (user: User, suspend: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          suspend,
          reason: suspendReason
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        
        // Update user in local state
        setUsers(users.map(u => 
          u.id === user.id ? { ...u, suspended: suspend } : u
        ))
        
        setSuspendDialogOpen(false)
        setSelectedUser(null)
        setSuspendReason("")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update user status")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Search and manage platform users
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              className="w-64 pl-8"
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
            Users ({loading ? '...' : pagination.totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} className={user.suspended ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || ""} alt={user.name} />
                          <AvatarFallback>
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            'User'
                          )}
                        </Badge>
                        {user.suspended && (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Suspended
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="text-sm text-muted-foreground">
                          {user.lastActiveAt ? formatDate(user.lastActiveAt) : 'Never'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.projectCount} projects, {user.imageCount} images
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            // TODO: Implement view profile modal
                            toast.info("Profile view feature coming soon")
                          }}>
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            // TODO: Implement view images modal
                            toast.info("Images view feature coming soon")
                          }}>
                            View Images
                          </DropdownMenuItem>
                          {user.role !== 'admin' && (
                            <DropdownMenuItem 
                              className={user.suspended ? "text-green-600" : "text-red-600"}
                              onClick={() => {
                                setSelectedUser(user)
                                setSuspendDialogOpen(true)
                              }}
                            >
                              {user.suspended ? 'Unsuspend User' : 'Suspend User'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No users found matching your search." : "No users found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {users.length} of {pagination.totalCount} users
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!pagination.hasPrevPage || loading}
              onClick={() => fetchUsers(searchQuery, pagination.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!pagination.hasNextPage || loading}
              onClick={() => fetchUsers(searchQuery, pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.suspended ? 'Unsuspend' : 'Suspend'} User
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.suspended 
                ? `Are you sure you want to unsuspend ${selectedUser?.name || selectedUser?.email}?`
                : `Are you sure you want to suspend ${selectedUser?.name || selectedUser?.email}? They will not be able to access their account.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {!selectedUser?.suspended && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={selectedUser?.suspended ? "default" : "destructive"}
              onClick={() => selectedUser && handleSuspendUser(selectedUser, !selectedUser.suspended)}
            >
              {selectedUser?.suspended ? 'Unsuspend' : 'Suspend'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}