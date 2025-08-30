"use client"

import { useState } from "react"
import { Search, Shield, Calendar, Trash2, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Mock audit data - will be replaced with API call
const mockAuditLogs = [
  {
    id: "log1",
    action: "DELETE_IMAGE" as const,
    timestamp: "2024-01-21T10:30:00Z",
    admin: {
      id: "admin1",
      name: "Admin User",
      email: "admin@example.com",
      image: null
    },
    targetUser: {
      id: "user1", 
      name: "John Doe",
      email: "john@example.com"
    },
    targetResource: {
      type: "image",
      id: "gen123",
      name: "living-room.jpg"
    },
    details: {
      reason: "TOS violation - inappropriate content",
      ipAddress: "192.168.1.1"
    }
  },
  {
    id: "log2", 
    action: "VIEW_USER_PROFILE" as const,
    timestamp: "2024-01-21T09:15:00Z",
    admin: {
      id: "admin1",
      name: "Admin User", 
      email: "admin@example.com",
      image: null
    },
    targetUser: {
      id: "user2",
      name: "Jane Smith",
      email: "jane@example.com"
    },
    targetResource: {
      type: "user_profile",
      id: "user2", 
      name: "Jane Smith Profile"
    },
    details: {
      reason: "User reported content investigation",
      ipAddress: "192.168.1.1"
    }
  }
]

export default function AdminAuditPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [auditLogs] = useState(mockAuditLogs)

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetUser?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetResource?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.reason.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter
    
    return matchesSearch && matchesAction
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
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
        return <Trash2 className="w-4 h-4 text-red-500" />
      case 'VIEW_USER_PROFILE':
        return <Eye className="w-4 h-4 text-blue-500" />
      case 'SUSPEND_USER':
        return <Shield className="w-4 h-4 text-orange-500" />
      default:
        return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DELETE_IMAGE':
        return <Badge variant="destructive">Delete Image</Badge>
      case 'VIEW_USER_PROFILE':
        return <Badge variant="secondary">View Profile</Badge>
      case 'SUSPEND_USER':
        return <Badge className="bg-orange-100 text-orange-800">Suspend User</Badge>
      default:
        return <Badge variant="outline">{action.replace('_', ' ')}</Badge>
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
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="DELETE_IMAGE">Delete Image</SelectItem>
              <SelectItem value="VIEW_USER_PROFILE">View Profile</SelectItem>
              <SelectItem value="SUSPEND_USER">Suspend User</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
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
            <Shield className="h-5 w-5" />
            Admin Activity Log ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
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
                          <AvatarImage src={log.admin.image || ""} alt={log.admin.name} />
                          <AvatarFallback className="text-xs">
                            {log.admin.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{log.admin.name}</div>
                          <div className="text-xs text-muted-foreground">{log.admin.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{log.targetResource?.name}</div>
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
                        {formatDate(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="text-sm">{log.details?.reason}</div>
                        {log.details?.ipAddress && (
                          <div className="text-xs text-muted-foreground mt-1">
                            IP: {log.details.ipAddress}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery || actionFilter !== "all" ? 
                      "No audit logs found matching your filters." : 
                      "No audit logs found."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}