"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: 'user_signup' | 'image_upload' | 'admin_action' | 'system_event'
  title: string
  description: string
  user?: {
    name: string
    email: string
    role?: string
  }
  admin?: {
    name: string
  }
  metadata?: Record<string, unknown>
  timestamp: string | Date
}


function getActivityTypeInfo(type: ActivityItem['type']) {
  switch (type) {
    case 'user_signup':
      return { label: 'User', variant: 'secondary' as const, color: 'bg-blue-500' }
    case 'image_upload':
      return { label: 'Upload', variant: 'default' as const, color: 'bg-green-500' }
    case 'admin_action':
      return { label: 'Admin', variant: 'destructive' as const, color: 'bg-red-500' }
    case 'system_event':
      return { label: 'System', variant: 'outline' as const, color: 'bg-gray-500' }
    default:
      return { label: 'Event', variant: 'secondary' as const, color: 'bg-gray-400' }
  }
}

function getUserInitials(name?: string) {
  if (!name) return 'SY'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function RecentActivity() {
  const [activities, setActivities] = React.useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchActivity() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/recent-activity')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch activity')
        }
        
        if (result.success) {
          setActivities(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch activity')
        }
      } catch (error) {
        console.error('Failed to fetch recent activity:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivity()
    
    // Refresh activity every 30 seconds
    const refreshTimer = setInterval(fetchActivity, 30000)

    return () => {
      clearInterval(refreshTimer)
    }
  }, [])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load recent activity</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
            </div>
          ) : (
            activities.map((activity) => {
              const typeInfo = getActivityTypeInfo(activity.type)
              const displayName = activity.user?.name || activity.admin?.name || 'System'
              const timestamp = new Date(activity.timestamp)
              
              return (
                <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={`text-white ${typeInfo.color}`}>
                        {getUserInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${typeInfo.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <Badge variant={typeInfo.variant} className="text-xs">
                        {typeInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}