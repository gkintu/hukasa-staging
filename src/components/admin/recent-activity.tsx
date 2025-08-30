"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: 'user_signup' | 'image_upload' | 'admin_action' | 'system_event'
  user: string
  action: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

// Sample activity data - in real app this would come from API
const generateActivityData = (): ActivityItem[] => [
  {
    id: '1',
    type: 'user_signup',
    user: 'John Smith',
    action: 'New user registered',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
  {
    id: '2',
    type: 'image_upload',
    user: 'Sarah Johnson',
    action: 'Uploaded 3 images to "Living Room Project"',
    timestamp: new Date(Date.now() - 1000 * 60 * 12), // 12 minutes ago
  },
  {
    id: '3',
    type: 'admin_action',
    user: 'Admin User',
    action: 'Updated system settings',
    timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
  },
  {
    id: '4',
    type: 'system_event',
    user: 'System',
    action: 'Completed image processing batch (15 images)',
    timestamp: new Date(Date.now() - 1000 * 60 * 35), // 35 minutes ago
  },
  {
    id: '5',
    type: 'user_signup',
    user: 'Mike Chen',
    action: 'New user registered',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
  },
  {
    id: '6',
    type: 'image_upload',
    user: 'Emma Wilson',
    action: 'Uploaded image to "Kitchen Redesign"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
]

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

function getUserInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function RecentActivity() {
  const [activities, setActivities] = React.useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    // Simulate loading
    const loadTimer = setTimeout(() => {
      setActivities(generateActivityData())
      setIsLoading(false)
    }, 1000)

    // Simulate new activity every 30 seconds
    const activityTimer = setInterval(() => {
      const types: ActivityItem['type'][] = ['user_signup', 'image_upload', 'admin_action', 'system_event']
      const users = ['Alice Brown', 'Bob Green', 'Carol White', 'David Black']
      
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: types[Math.floor(Math.random() * types.length)],
        user: users[Math.floor(Math.random() * users.length)],
        action: 'Recent activity occurred',
        timestamp: new Date(),
      }

      setActivities(prev => [newActivity, ...prev.slice(0, 9)]) // Keep only 10 most recent
    }, 30000)

    return () => {
      clearTimeout(loadTimer)
      clearInterval(activityTimer)
    }
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
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
          {activities.map((activity) => {
            const typeInfo = getActivityTypeInfo(activity.type)
            
            return (
              <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`text-white ${typeInfo.color}`}>
                      {getUserInitials(activity.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${typeInfo.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">{activity.user}</p>
                    <Badge variant={typeInfo.variant} className="text-xs">
                      {typeInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}