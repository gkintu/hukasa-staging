"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Images, ShieldCheck, Activity, TrendingUp, TrendingDown } from "lucide-react"

interface StatCardProps {
  title: string
  value: number
  change: number
  changeLabel: string
  icon: React.ReactNode
  isLoading?: boolean
}

function StatCard({ title, value, change, changeLabel, icon, isLoading = false }: StatCardProps) {
  const isPositive = change > 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold animate-pulse">Loading...</div>
          <p className="text-xs text-muted-foreground animate-pulse">
            Updating...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="flex items-center space-x-1 text-xs">
          <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : ''}{change}%
          </span>
          <span className="text-muted-foreground">{changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatsData {
  totalUsers: number
  totalImages: number
  activeAdmins: number
  weeklyActivity: number
}

export function DashboardStats() {
  const [stats, setStats] = React.useState<StatsData>({
    totalUsers: 0,
    totalImages: 0,
    activeAdmins: 0,
    weeklyActivity: 0
  })
  
  const [changes] = React.useState({
    totalUsers: 0,
    totalImages: 0,
    activeAdmins: 0,
    weeklyActivity: 0
  })

  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch real stats data
  React.useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/stats')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch stats')
        }
        
        if (result.success) {
          setStats(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch stats')
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    
    // Refresh stats every 30 seconds
    const refreshTimer = setInterval(fetchStats, 30000)

    return () => {
      clearInterval(refreshTimer)
    }
  }, [])

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-red-200">
            <CardContent className="p-6">
              <div className="text-sm text-red-600">Failed to load stats</div>
              <div className="text-xs text-muted-foreground mt-1">{error}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        change={changes.totalUsers}
        changeLabel="registered users"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      
      <StatCard
        title="Total Images"
        value={stats.totalImages}
        change={changes.totalImages}
        changeLabel="processed images"
        icon={<Images className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      
      <StatCard
        title="Active Admins"
        value={stats.activeAdmins}
        change={changes.activeAdmins}
        changeLabel="admin accounts"
        icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      
      <StatCard
        title="Weekly Activity" 
        value={stats.weeklyActivity}
        change={changes.weeklyActivity}
        changeLabel="uploads this week"
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </div>
  )
}