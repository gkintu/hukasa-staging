"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileImage, Upload, Zap, Calendar } from "lucide-react"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface DashboardProps {
  user: User
}

interface FileStats {
  totalFiles: number
  totalStagedImages: number
  activeProjects: number
  monthlyUploads: number
}

interface RecentActivity {
  id: string
  type: 'upload' | 'completion' | 'processing'
  message: string
  subtitle: string
  timestamp: string
  status: 'success' | 'processing'
  relativeTime: string
}

export function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState<FileStats>({
    totalFiles: 0,
    totalStagedImages: 0,
    activeProjects: 0,
    monthlyUploads: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch stats
        const statsResponse = await fetch('/api/files')
        const statsData = await statsResponse.json()
        if (statsData.success) {
          const files = statsData.files || []
          const currentMonth = new Date().getMonth()
          const currentYear = new Date().getFullYear()
          
          const monthlyFiles = files.filter((file: { createdAt: string }) => {
            const fileDate = new Date(file.createdAt)
            return fileDate.getMonth() === currentMonth && fileDate.getFullYear() === currentYear
          })
          
          setStats({
            totalFiles: files.length,
            totalStagedImages: files.filter((f: { status: string }) => f.status === 'completed').length * 3, // Assuming 3 variations per completed file
            activeProjects: files.filter((f: { status: string }) => f.status === 'pending' || f.status === 'processing').length,
            monthlyUploads: monthlyFiles.length
          })
        }
        
        // Fetch recent activities
        const activitiesResponse = await fetch('/api/recent-activity')
        const activitiesData = await activitiesResponse.json()
        if (activitiesData.success) {
          setRecentActivities(activitiesData.activities || [])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
        setActivitiesLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user.name || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your virtual staging activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              Images uploaded to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staged Images</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalStagedImages}</div>
            <p className="text-xs text-muted-foreground">
              AI-generated variations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.monthlyUploads}</div>
            <p className="text-xs text-muted-foreground">
              New uploads
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest virtual staging projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' 
                        ? activity.type === 'upload' 
                          ? 'bg-blue-500' 
                          : 'bg-green-500'
                        : 'bg-orange-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.relativeTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No recent activity</p>
                <p className="text-xs text-muted-foreground">Upload some images to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for your virtual staging workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Upload Images</span>
                </div>
              </Card>
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-2">
                  <FileImage className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">View Projects</span>
                </div>
              </Card>
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Start Staging</span>
                </div>
              </Card>
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Calendar className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">View History</span>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}