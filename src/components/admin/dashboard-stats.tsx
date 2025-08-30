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

export function DashboardStats() {
  const [stats, setStats] = React.useState({
    totalUsers: 1247,
    totalImages: 8934,
    activeAdmins: 3,
    weeklyActivity: 156
  })
  
  const [changes] = React.useState({
    totalUsers: 12.5,
    totalImages: 8.2,
    activeAdmins: 0,
    weeklyActivity: -2.1
  })

  const [isLoading, setIsLoading] = React.useState(true)

  // Simulate real-time data updates
  React.useEffect(() => {
    const initialLoadTimer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    const updateTimer = setInterval(() => {
      setStats(prev => ({
        totalUsers: prev.totalUsers + Math.floor(Math.random() * 3),
        totalImages: prev.totalImages + Math.floor(Math.random() * 5),
        activeAdmins: Math.max(1, prev.activeAdmins + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0)),
        weeklyActivity: prev.weeklyActivity + Math.floor(Math.random() * 3) - 1
      }))
    }, 10000) // Update every 10 seconds

    return () => {
      clearTimeout(initialLoadTimer)
      clearInterval(updateTimer)
    }
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        change={changes.totalUsers}
        changeLabel="from last month"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      
      <StatCard
        title="Total Images"
        value={stats.totalImages}
        change={changes.totalImages}
        changeLabel="from last month"
        icon={<Images className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      
      <StatCard
        title="Active Admins"
        value={stats.activeAdmins}
        change={changes.activeAdmins}
        changeLabel="currently online"
        icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      
      <StatCard
        title="Weekly Activity" 
        value={stats.weeklyActivity}
        change={changes.weeklyActivity}
        changeLabel="actions this week"
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </div>
  )
}